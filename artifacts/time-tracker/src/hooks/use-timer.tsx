import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Simple stopwatch for logging time. The running timer lives in localStorage, so it
 * survives reloads and navigation on the same device. Stopping it hands the elapsed
 * time to the "Log Time" form (rounded to quarter hours).
 */

const LS_KEY = "timetracker.timer";

interface TimerState {
  startedAt: number; // epoch ms
  note?: string;
}

interface TimerContextValue {
  running: boolean;
  startedAt: number | null;
  /** elapsed seconds (updates once per second while running) */
  elapsedSeconds: number;
  start: () => void;
  /** stops the timer and returns the elapsed seconds */
  stop: () => number;
  discard: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

function readState(): TimerState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;
    return typeof parsed.startedAt === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeState(state: TimerState | null) {
  try {
    if (state) localStorage.setItem(LS_KEY, JSON.stringify(state));
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* storage unavailable – timer only lives in memory then */
  }
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState | null>(() => readState());
  const [now, setNow] = useState(() => Date.now());

  // tick while running
  useEffect(() => {
    if (!state) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  // keep multiple tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setState(readState());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const start = useCallback(() => {
    const s = { startedAt: Date.now() };
    writeState(s);
    setState(s);
  }, []);

  const stop = useCallback((): number => {
    const current = state ?? readState();
    const elapsed = current ? Math.max(0, Math.round((Date.now() - current.startedAt) / 1000)) : 0;
    writeState(null);
    setState(null);
    return elapsed;
  }, [state]);

  const discard = useCallback(() => {
    writeState(null);
    setState(null);
  }, []);

  const value = useMemo<TimerContextValue>(() => ({
    running: !!state,
    startedAt: state?.startedAt ?? null,
    elapsedSeconds: state ? Math.max(0, Math.floor((now - state.startedAt) / 1000)) : 0,
    start,
    stop,
    discard,
  }), [state, now, start, stop, discard]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Rounds elapsed seconds to the nearest quarter hour, minimum 0.25 h */
export function secondsToQuarterHours(seconds: number): number {
  const hours = seconds / 3600;
  return Math.max(0.25, Math.round(hours * 4) / 4);
}
