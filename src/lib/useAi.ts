'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

export interface AiStatus {
  configured: boolean;
  loading: boolean;
  providers?: {
    google: { configured: boolean; model: string };
    groq: { configured: boolean; model: string };
  };
}

let cached: AiStatus | null = null;
let inflight: Promise<AiStatus> | null = null;

/**
 * Whether AI features are available on this deployment.
 *
 * Every AI-backed surface checks this first so it can render its self-grading
 * path immediately, rather than offering a button that fails. The result is
 * cached for the session — the answer cannot change without a redeploy.
 */
export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>(cached ?? { configured: false, loading: true });

  useEffect(() => {
    if (cached) {
      setStatus(cached);
      return;
    }
    let alive = true;
    const request: Promise<AiStatus> =
      inflight ??
      (inflight = fetch('/api/ai/status')
        .then((r) => (r.ok ? r.json() : { configured: false }))
        .then((j): AiStatus => {
          const next: AiStatus = { ...j, loading: false };
          cached = next;
          return next;
        })
        .catch((): AiStatus => {
          const next: AiStatus = { configured: false, loading: false };
          cached = next;
          return next;
        }));

    request.then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return status;
}

export interface AiCallState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** True when the failure is a degradation the UI should explain calmly. */
  degraded: boolean;
}

/**
 * POST to one of our own AI routes and record the call against the usage meter.
 * Never throws: failures come back as `error` so the caller can fall through
 * to self-grading.
 */
export function useAiCall<T>() {
  const [state, setState] = useState<AiCallState<T>>({
    data: null,
    error: null,
    loading: false,
    degraded: false,
  });
  const recordAiCall = useStore((s) => s.recordAiCall);

  async function call(route: string, body: unknown): Promise<T | null> {
    setState({ data: null, error: null, loading: true, degraded: false });
    try {
      const res = await fetch(`/api/ai/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState({
          data: null,
          error: json?.error ?? `Request failed (${res.status}).`,
          loading: false,
          degraded: Boolean(json?.degraded),
        });
        return null;
      }

      // Only count calls that actually reached a provider.
      if (!json?._meta?.cached) recordAiCall(route);

      setState({ data: json as T, error: null, loading: false, degraded: false });
      return json as T;
    } catch {
      setState({
        data: null,
        error: 'Could not reach the grader. Check your connection — self-grading still works.',
        loading: false,
        degraded: true,
      });
      return null;
    }
  }

  function reset() {
    setState({ data: null, error: null, loading: false, degraded: false });
  }

  return { ...state, call, reset };
}
