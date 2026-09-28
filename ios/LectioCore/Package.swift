// swift-tools-version: 6.2
//
// LectioCore: everything the Lectio apps share that isn't UI.
//
// Content models and loading, the student's progress document, the SM-2
// scheduler and streak maths, and the cross-device merge — each a port of
// the web app's own logic (src/store/useStore.ts, src/lib/mergeProgress.ts),
// held to it by parity fixtures the TypeScript generates
// (scripts/export-merge-fixtures.ts). Pure Swift and Foundation, so it builds
// and tests on Linux as well as on Apple platforms, and so a watchOS target
// can depend on it unchanged.

import PackageDescription

let package = Package(
    name: "LectioCore",
    platforms: [.iOS(.v26), .macOS(.v15), .watchOS(.v26)],
    products: [
        .library(name: "LectioCore", targets: ["LectioCore"]),
    ],
    targets: [
        .target(name: "LectioCore"),
        .testTarget(
            name: "LectioCoreTests",
            dependencies: ["LectioCore"],
            exclude: ["Fixtures"]
        ),
    ]
)
