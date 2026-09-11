'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Runs before paint on the client, and is a no-op during server rendering.
 *
 * The scan below has to happen before the browser draws: it decides which
 * blocks start hidden, and doing that after a paint would show them and then
 * take them away again — a flicker on every page load.
 */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Blocks that bring their own entrance, or opt out. `.animate-in` sets the
 * same two properties from a keyframe, and an element running both would be
 * fighting itself.
 */
const SKIP = '.animate-in, [data-no-reveal]';

/** How much of the viewport counts as "the reader can already see this". */
const ABOVE_FOLD = 0.92;

/**
 * Animates a page in, and reveals the rest of it as the reader scrolls.
 *
 * Attach the returned ref to a container and every direct child becomes a
 * block: the ones already on screen play a short staggered entrance, and the
 * ones below the fold wait until they are nearly in view. Splitting on that
 * is the whole point — hiding what is already visible and then fading it back
 * in is exactly the "loading shimmer" that makes an app feel slower than it
 * is, and revealing what is off screen costs the reader nothing.
 *
 * Nothing here runs unless the boot script in the document head set
 * `data-motion` (JS alive, reduced motion not requested), so a reader who
 * never gets the script, or who has asked for less movement, sees an
 * ordinary, fully visible page.
 */
export function useRevealChildren<T extends HTMLElement>() {
  /**
   * A callback ref rather than an object ref, because the container is not
   * always in the tree on first commit — Scansion Lab, for one, renders a
   * loading branch until its corpus arrives. An object ref is still null when
   * the effect runs in that case, and nothing would re-run it once the real
   * content mounted, so the page silently never animated.
   */
  const [root, setRoot] = useState<T | null>(null);
  const ref = useCallback((el: T | null) => setRoot(el), []);
  // Client-side navigation can reuse the same container rather than
  // remounting it, so the scan is keyed on the path as well: a new page's
  // blocks would otherwise never be picked up.
  const pathname = usePathname();

  useBeforePaint(() => {
    if (!root) return;
    if (document.documentElement.dataset.motion !== 'on') return;

    const blocks = Array.from(root.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !el.matches(SKIP),
    );

    const fold = window.innerHeight * ABOVE_FOLD;
    const waiting: HTMLElement[] = [];
    const cleanups: Array<() => void> = [];
    let seen = 0;

    for (const el of blocks) {
      if (el.getBoundingClientRect().top < fold) {
        // Capped, or a long above-the-fold page ends with a visible wave
        // rolling down it rather than an entrance.
        el.style.setProperty('--enter-delay', `${Math.min(seen, 5) * 55}ms`);
        el.setAttribute('data-enter', '');
        cleanups.push(settleAfter(el, 'animationend', 'data-enter'));
        seen += 1;
      } else {
        el.setAttribute('data-reveal', 'pending');
        waiting.push(el);
      }
    }

    if (waiting.length === 0) {
      return () => {
        for (const off of cleanups) off();
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.setAttribute('data-reveal', 'in');
          cleanups.push(settleAfter(el, 'transitionend', 'data-reveal'));
          // Once revealed, always revealed. Re-hiding on the way back up
          // would make scrolling a page you have already read flicker.
          io.unobserve(el);
        }
      },
      /*
       * A POSITIVE bottom margin, which extends the observed box *below* the
       * viewport so a block starts arriving before it scrolls into view and
       * is settled by the time it is properly on screen.
       *
       * This was a negative margin first, which does the opposite: it shrinks
       * the box, so a block had to be 4% inside the viewport before it even
       * began a 620ms fade. Measured, that meant scrolling past headings that
       * were still invisible — the reader outrunning the animation, which is
       * the whole failure this is meant to avoid. Threshold 0 for the same
       * reason: the first pixel is enough.
       */
      { rootMargin: '0px 0px 26% 0px', threshold: 0 },
    );

    for (const el of waiting) io.observe(el);
    return () => {
      io.disconnect();
      for (const off of cleanups) off();
    };
  }, [root, pathname]);

  return ref;
}

/**
 * Takes the entrance marker back off once it has finished playing, and
 * returns a function that stops waiting for that.
 *
 * This is not tidiness. A block whose entrance has run keeps a *resolved*
 * transform — Chromium reports `matrix(1, 0, 0, 1, 0, 0)` rather than
 * `none`, because the value came from a filled animation — and an identity
 * matrix creates a containing block for `position: fixed` descendants just
 * as readily as a real one does. Anything fixed inside such a block is then
 * positioned against the block instead of the viewport.
 *
 * That is not hypothetical: it put the Scansion Lab's quantity chooser —
 * which docks to the bottom edge of the screen on a phone — 86px below the
 * fold, where it could not be reached at all. Tapping a syllable on a phone
 * appeared to do nothing, because the two buttons for answering were off
 * the bottom of the screen.
 *
 * Removing the attribute leaves the element matching no rule here, which is
 * the fully-visible resting state, with no transform of any kind. If the
 * event never arrives the attribute simply stays, which is exactly the old
 * behaviour — so this can only improve matters.
 */
function settleAfter(
  el: HTMLElement,
  event: 'animationend' | 'transitionend',
  attr: 'data-enter' | 'data-reveal',
): () => void {
  const onEnd = (e: Event) => {
    // Descendants animate too — `.stagger` children, for one — and those
    // events bubble. Only this block's own is the one to act on.
    if (e.target !== el) return;
    el.removeAttribute(attr);
    el.style.removeProperty('--enter-delay');
    el.removeEventListener(event, onEnd);
  };
  el.addEventListener(event, onEnd);
  return () => el.removeEventListener(event, onEnd);
}
