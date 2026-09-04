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
    let seen = 0;

    for (const el of blocks) {
      if (el.getBoundingClientRect().top < fold) {
        // Capped, or a long above-the-fold page ends with a visible wave
        // rolling down it rather than an entrance.
        el.style.setProperty('--enter-delay', `${Math.min(seen, 5) * 55}ms`);
        el.setAttribute('data-enter', '');
        seen += 1;
      } else {
        el.setAttribute('data-reveal', 'pending');
        waiting.push(el);
      }
    }

    if (waiting.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-reveal', 'in');
          // Once revealed, always revealed. Re-hiding on the way back up
          // would make scrolling a page you have already read flicker.
          io.unobserve(entry.target);
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
    return () => io.disconnect();
  }, [root, pathname]);

  return ref;
}
