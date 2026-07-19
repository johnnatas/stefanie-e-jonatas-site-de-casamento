"use client";

import { useCountdown } from "@/hooks/useCountdown";

const UNITS = [
  { key: "days", label: "Dias" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Minutos" },
  { key: "seconds", label: "Segundos" },
] as const;

interface CountdownTimerProps {
  weddingDateIso: string;
}

export function CountdownTimer({ weddingDateIso }: CountdownTimerProps) {
  const countdown = useCountdown(weddingDateIso);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-4 sm:gap-10">
        {UNITS.map((unit) => (
          <div key={unit.key} className="flex flex-col items-center">
            <span className="font-serif text-4xl text-paper sm:text-5xl" aria-live="polite">
              {String(countdown[unit.key]).padStart(2, "0")}
            </span>
            <span className="mt-1 font-serif text-[10px] uppercase tracking-widest text-paper/80 sm:text-xs">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      <p className="font-script text-3xl text-moss">mal podemos esperar</p>
    </div>
  );
}
