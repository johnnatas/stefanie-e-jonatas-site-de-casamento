"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { findBestGuestMatch, GuestNameCandidate } from "@/shared/utils/matchGuestName";
import { confirmRsvpAction } from "@/app/confirmar-presenca/actions";

interface RsvpSearchProps {
  guests: GuestNameCandidate[];
}

type Step = "searching" | "confirming" | "done";

function shuffleWord(word: string, seed: number): string {
  const letters = word.split("");
  let state = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}

export function RsvpSearch({ guests }: RsvpSearchProps) {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("searching");
  const [companionsCount, setCompanionsCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decorativeText = useMemo(
    () =>
      guests
        .map((guest, index) =>
          guest.fullName
            .split(" ")
            .map((word) => shuffleWord(word, index + word.length + 1))
            .join(" ")
        )
        .join("   "),
    [guests]
  );

  const trimmedQuery = query.trim();
  const match = useMemo(() => findBestGuestMatch(trimmedQuery, guests), [trimmedQuery, guests]);
  const displayName = match ? match.nickname ?? match.fullName.split(" ")[0] : "";

  async function handleDecline() {
    if (!match) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({ guestId: match.id, attendanceStatus: "declined" });
    setIsSubmitting(false);
    setFeedback(result.message);
    setStep("done");
  }

  async function handleConfirmSubmit() {
    if (!match) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({
      guestId: match.id,
      attendanceStatus: "confirmed",
      companionsCount,
      message: message.trim() || undefined,
    });
    setIsSubmitting(false);
    setFeedback(result.message);
    setStep("done");
  }

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden px-6 font-serif text-3xl leading-loose text-line"
      >
        {decorativeText}
      </p>

      <div className="relative flex w-full max-w-lg flex-col items-center gap-6">
        {step === "done" ? (
          <div className="flex flex-col items-center gap-6">
            <p role="status" className="font-serif text-2xl text-forest">
              {feedback}
            </p>
            <PillButton href="/presentes">Ver lista de presentes</PillButton>
            <Link href="/" className="font-sans text-sm uppercase tracking-widest text-forest/70 hover:text-moss">
              Voltar ao início
            </Link>
          </div>
        ) : (
          <>
            <div className="w-full">
              <label htmlFor="guest-search" className="block font-sans text-xs uppercase tracking-widest text-forest/70">
                Digite seu nome
              </label>
              <input
                id="guest-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full border-b border-line bg-transparent py-2 text-center font-serif text-4xl text-forest focus:border-moss focus:outline-none"
              />
              <p className="mt-3 font-script text-xl italic text-forest/70">
                Pedimos que confirme o mais rápido que puder, assim que tiver certeza!
              </p>
            </div>

            {trimmedQuery.length >= 2 && match && step === "searching" && (
              <div className="flex flex-col items-center gap-4">
                <p className="font-script text-2xl italic text-moss">
                  {match.nickname ?? match.fullName}
                </p>
                <p className="font-serif text-xl text-forest">{displayName}? Que bom que você apareceu! :)</p>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <PillButton onClick={() => setStep("confirming")} disabled={isSubmitting}>
                    Confirmar presença
                  </PillButton>
                  <PillButton variant="secondary" onClick={handleDecline} disabled={isSubmitting}>
                    Não poderei ir
                  </PillButton>
                </div>
              </div>
            )}

            {trimmedQuery.length >= 2 && !match && (
              <p className="font-sans text-sm text-forest/70">
                Não encontramos esse nome — tente digitar como está no convite, com nome e sobrenome.
              </p>
            )}

            {step === "confirming" && match && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleConfirmSubmit();
                }}
                className="flex w-full flex-col gap-4 text-left"
              >
                <div>
                  <label htmlFor="companionsCount" className="block font-sans text-sm text-forest">
                    Número de acompanhantes
                  </label>
                  <input
                    id="companionsCount"
                    type="number"
                    min={0}
                    max={10}
                    value={companionsCount}
                    onChange={(event) => setCompanionsCount(Number(event.target.value))}
                    className="mt-1 w-full border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block font-sans text-sm text-forest">
                    Mensagem para o casal (opcional)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="mt-1 w-full border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
                  />
                </div>
                <PillButton type="submit" disabled={isSubmitting} className="self-center">
                  {isSubmitting ? "Enviando..." : "Confirmar presença"}
                </PillButton>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
