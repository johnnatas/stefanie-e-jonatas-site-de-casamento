"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { findGuestMatches, GuestNameCandidate } from "@/shared/utils/matchGuestName";
import { confirmRsvpAction } from "@/app/confirmar-presenca/actions";

interface RsvpSearchProps {
  guests: GuestNameCandidate[];
}

type Step = "searching" | "confirming" | "done";

function displayNameFor(guest: GuestNameCandidate): string {
  return guest.nickname ?? guest.fullName;
}

export function RsvpSearch({ guests }: RsvpSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestNameCandidate | null>(null);
  const [step, setStep] = useState<Step>("searching");
  const [companionsCount, setCompanionsCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const matches = useMemo(() => findGuestMatches(trimmedQuery, guests), [trimmedQuery, guests]);
  const displayName = selectedGuest ? selectedGuest.nickname ?? selectedGuest.fullName.split(" ")[0] : "";

  function handleQueryChange(value: string) {
    setQuery(value);
    if (selectedGuest && value !== displayNameFor(selectedGuest)) {
      setSelectedGuest(null);
    }
  }

  function handleSelectGuest(guest: GuestNameCandidate) {
    setQuery(displayNameFor(guest));
    setSelectedGuest(guest);
  }

  async function handleDecline() {
    if (!selectedGuest) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({ guestId: selectedGuest.id, attendanceStatus: "declined" });
    setIsSubmitting(false);
    setFeedback(result.message);
    setStep("done");
  }

  async function handleConfirmSubmit() {
    if (!selectedGuest) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({
      guestId: selectedGuest.id,
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
                onChange={(event) => handleQueryChange(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full border-b border-line bg-transparent py-2 text-center font-serif text-4xl text-forest focus:border-moss focus:outline-none"
              />
              <p className="mt-3 font-script text-xl italic text-forest/70">
                Pedimos que confirme o mais rápido que puder, assim que tiver certeza!
              </p>
            </div>

            {trimmedQuery.length >= 2 && !selectedGuest && matches.length > 0 && (
              <ul className="flex w-full flex-col gap-2" aria-label="Sugestões de nome">
                {matches.map((guest) => (
                  <li key={guest.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectGuest(guest)}
                      className="w-full rounded-md border border-line px-4 py-3 text-center font-serif text-lg text-forest transition-colors hover:border-moss hover:text-moss"
                    >
                      {displayNameFor(guest)}
                      {guest.nickname && guest.fullName !== guest.nickname && (
                        <span className="ml-2 font-sans text-sm text-forest/60">({guest.fullName})</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {trimmedQuery.length >= 2 && !selectedGuest && matches.length === 0 && (
              <p className="font-sans text-sm text-forest/70">
                Não encontramos esse nome — tente digitar como está no convite, com nome e sobrenome.
              </p>
            )}

            {selectedGuest && step === "searching" && (
              <div className="flex flex-col items-center gap-4">
                <p className="font-script text-2xl italic text-moss">{displayNameFor(selectedGuest)}</p>
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

            {step === "confirming" && selectedGuest && (
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
