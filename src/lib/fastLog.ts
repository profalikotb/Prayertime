'use client';
/** Fasting log (Ramadan days fasted) + make-up (qada) counter — this device only. */
import { useCallback, useEffect, useState } from 'react';

export interface FastLog {
  v: 1;
  /** Gregorian day key → 1 fasted · 0 not fasted */
  days: Record<string, 0 | 1>;
  qada: number;
}
const KEY = 'pakpt.fast.v1';
const EVT = 'pakpt-fast';
const empty = (): FastLog => ({ v: 1, days: {}, qada: 0 });

function load(): FastLog {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return o?.v === 1 ? o : empty();
  } catch {
    return empty();
  }
}

export function useFastLog(): [FastLog, (fn: (l: FastLog) => FastLog) => void] {
  const [log, setLog] = useState<FastLog>(empty());
  useEffect(() => {
    setLog(load());
    const on = () => setLog(load());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const update = useCallback((fn: (l: FastLog) => FastLog) => {
    const next = fn(load());
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setLog(next);
    window.dispatchEvent(new Event(EVT));
  }, []);
  return [log, update];
}
