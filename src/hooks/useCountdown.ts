"use client";

import { useEffect, useState } from "react";

export interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ZERO: CountdownValue = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function calculate(targetDate: Date): CountdownValue {
  const diffMs = Math.max(0, targetDate.getTime() - Date.now());
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Starts from a static zero value so server and first client render match,
 * then ticks every second once mounted in the browser.
 */
export function useCountdown(targetDateIso: string): CountdownValue {
  const [value, setValue] = useState<CountdownValue>(ZERO);

  useEffect(() => {
    const targetDate = new Date(targetDateIso);
    const tick = () => setValue(calculate(targetDate));

    const timeoutId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [targetDateIso]);

  return value;
}
