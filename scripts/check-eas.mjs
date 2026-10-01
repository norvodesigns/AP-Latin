// Keeps the EAS Build wrapper (ios/app.json, ios/eas.json, ios/.eas) in step
// with the Xcode project spec (ios/project.yml). EAS signs the app, widgets,
// watch app and complications from app.json's list, so a bundle ID, target
// name or app group that drifts from project.yml fails in the cloud, after a
// queue and a build, instead of here in a second.
//
//   node scripts/check-eas.mjs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const errors = [];
const need = (ok, msg) => { if (!ok) errors.push(msg); };

// project.yml, read line by line (no YAML dependency): the targets, their
// bundle IDs and app groups, the schemes, and the build-number line.
const spec = read("ios/project.yml");
const targets = {};
const schemes = [];
let top = "";
let target = null;
let inGroups = false;
for (const line of spec.split("\n")) {
  if (/^\S/.test(line)) { top = line.replace(/:.*/, ""); target = null; inGroups = false; continue; }
  const sub = line.match(/^ {2}([A-Za-z][\w-]*):\s*$/);
  if (sub && top === "targets") { target = targets[sub[1]] = { bundle: null, groups: [] }; inGroups = false; continue; }
  if (sub && top === "schemes") { schemes.push(sub[1]); continue; }
  if (!target) continue;
  const id = line.match(/PRODUCT_BUNDLE_IDENTIFIER:\s*(\S+)/);
  if (id) target.bundle = id[1];
  if (/com\.apple\.security\.application-groups:/.test(line)) { inGroups = true; continue; }
  const grp = line.match(/^\s+-\s+(group\.\S+)/);
  if (inGroups && grp) target.groups.push(grp[1]);
  else if (inGroups && !/^\s+-/.test(line)) inGroups = false;
}
const team = spec.match(/DEVELOPMENT_TEAM:\s*(\S+)/)?.[1];

need(/CURRENT_PROJECT_VERSION: "\d+"/.test(spec),
  'project.yml: CURRENT_PROJECT_VERSION must look like `CURRENT_PROJECT_VERSION: "1"`; the EAS build recipe rewrites that line to stamp each build, and a build whose number never changes is rejected by App Store Connect');

const app = JSON.parse(read("ios/app.json")).expo;
const eas = JSON.parse(read("ios/eas.json"));
const profile = eas.build?.production?.ios ?? {};

// The main app.
const main = profile.scheme;
need(main && targets[main], `eas.json: ios.scheme "${main}" is not a target in project.yml`);
need(schemes.includes(main), `eas.json: ios.scheme "${main}" is not a scheme in project.yml`);
need(app.name === main, `app.json: name "${app.name}" must equal the main target "${main}" (EAS uses it to find the target)`);
need(targets[main]?.bundle === app.ios?.bundleIdentifier,
  `app.json: ios.bundleIdentifier ${app.ios?.bundleIdentifier} != project.yml ${targets[main]?.bundle}`);
need(app.ios?.appleTeamId === team, `app.json: ios.appleTeamId ${app.ios?.appleTeamId} != project.yml DEVELOPMENT_TEAM ${team}`);
const sameGroups = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
need(sameGroups(app.ios?.entitlements?.["com.apple.security.application-groups"], targets[main]?.groups),
  `app.json: the app's application groups differ from project.yml (${targets[main]?.groups})`);

// Every extension EAS signs: the same four targets as the project has.
const listed = app.extra?.eas?.build?.experimental?.ios?.appExtensions ?? [];
// `eas init` rewrites app.json and has once doubled this list; EAS would then
// try to create each target's credentials twice.
const names = listed.map((e) => e.targetName);
need(new Set(names).size === names.length,
  `app.json: appExtensions lists a target more than once (${names.filter((n, i) => names.indexOf(n) !== i)})`);
need(/^[0-9a-f-]{36}$/.test(app.extra?.eas?.projectId ?? ""),
  "app.json: extra.eas.projectId is missing; run `npx eas-cli init` in ios/ and commit it");
for (const name of Object.keys(targets).filter((n) => n !== main)) {
  need(listed.some((e) => e.targetName === name),
    `app.json: target ${name} is in project.yml but not in extra.eas.build.experimental.ios.appExtensions, so EAS would not sign it`);
}
for (const ext of listed) {
  const t = targets[ext.targetName];
  need(t, `app.json: appExtensions lists ${ext.targetName}, which is not a target in project.yml`);
  if (!t) continue;
  need(t.bundle === ext.bundleIdentifier, `app.json: ${ext.targetName} bundle ${ext.bundleIdentifier} != project.yml ${t.bundle}`);
  need(sameGroups(ext.entitlements?.["com.apple.security.application-groups"], t.groups),
    `app.json: ${ext.targetName}'s application groups differ from project.yml (${t.groups})`);
  // A complication's parent is the watch app; everything else sits in the app.
  const parent = ext.parentBundleIdentifier ?? app.ios?.bundleIdentifier;
  const expected = t.bundle.replace(/\.[^.]+$/, "");
  need(parent === expected || t.bundle.startsWith(`${parent}.`),
    `app.json: ${ext.targetName}'s parentBundleIdentifier ${parent} doesn't fit its bundle ${t.bundle}`);
}

// The build recipe the profile points at must exist.
need(existsSync(new URL(`../ios/.eas/build/${profile.config}`, import.meta.url)),
  `eas.json: ios.config ${profile.config} is not in ios/.eas/build/`);
// EAS uploads what git tracks, so a file the ignore rules swallow (ios/.gitignore
// ignores build/, which once swallowed .eas/build/) never reaches the builder.
for (const f of [`ios/.eas/build/${profile.config}`, "ios/package-lock.json", "ios/app.json", "ios/eas.json"]) {
  let ignored = false;
  try { execFileSync("git", ["check-ignore", "-q", f], { cwd: new URL("..", import.meta.url) }); ignored = true; } catch { /* exit 1: not ignored, or no git here */ }
  need(!ignored, `${f} is git-ignored, so EAS would not receive it`);
}
need(existsSync(new URL("../ios/package-lock.json", import.meta.url)),
  "ios/package-lock.json is missing; `npm ci` on the EAS builder needs it (run `npm install --package-lock-only` in ios/)");

if (errors.length) {
  console.error(`check-eas: ${errors.length} problem${errors.length > 1 ? "s" : ""}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-eas: ok (${Object.keys(targets).length} targets, ${listed.length} extensions, team ${team})`);
