"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface MessageItem {
  id: string;
  fullName: string;
  nickname?: string;
  companionsCount: number;
  message: string;
  date: Date;
}

interface MessagesListProps {
  messages: MessageItem[];
}

export function MessagesList({ messages }: MessagesListProps) {
  const [newestFirst, setNewestFirst] = useState(true);

  const sorted = useMemo(() => {
    const direction = newestFirst ? -1 : 1;
    return [...messages].sort((a, b) => (a.date.getTime() - b.date.getTime()) * direction);
  }, [messages, newestFirst]);

  return (
    <div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setNewestFirst((current) => !current)}
          className="font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
        >
          {newestFirst ? "Mostrar mais antigas primeiro" : "Mostrar mais novas primeiro"}
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-4">
        {sorted.map((item) => (
          <li key={item.id} className="rounded-md border border-line p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/admin/convidados/${item.id}`} className="font-serif text-lg text-forest hover:text-moss">
                {item.fullName}
                {item.nickname && <span className="text-forest/70"> ({item.nickname})</span>}
              </Link>
              {item.companionsCount > 0 && (
                <span className="font-sans text-xs uppercase tracking-widest text-forest/60">
                  +{item.companionsCount} acompanhante{item.companionsCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="mt-2 font-sans text-sm italic text-forest/80">&ldquo;{item.message}&rdquo;</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
