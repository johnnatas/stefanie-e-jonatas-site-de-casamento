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

interface CompanionNameFieldProps {
  index: number;
  guests: GuestNameCandidate[];
  excludeIds: string[];
  value: GuestNameCandidate | null;
  onSelect: (guest: GuestNameCandidate | null) => void;
}

function CompanionNameField({ index, guests, excludeIds, value, onSelect }: CompanionNameFieldProps) {
  const [query, setQuery] = useState(value ? displayNameFor(value) : "");
  const trimmedQuery = query.trim();

  const availableGuests = useMemo(
    () => guests.filter((guest) => !excludeIds.includes(guest.id)),
    [guests, excludeIds]
  );
  const matches = useMemo(
    () => (trimmedQuery.length >= 2 ? findGuestMatches(trimmedQuery, availableGuests) : []),
    [trimmedQuery, availableGuests]
  );

  function handleChange(nextValue: string) {
    setQuery(nextValue);
    if (value && nextValue !== displayNameFor(value)) {
      onSelect(null);
    }
  }

  function handleSelect(guest: GuestNameCandidate) {
    setQuery(displayNameFor(guest));
    onSelect(guest);
  }

  const fieldId = `companion-${index}`;

  return (
    <div>
      <label htmlFor={fieldId} className="block font-sans text-sm text-forest">
        Nome do acompanhante {index + 1}
      </label>
      <input
        id={fieldId}
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        autoComplete="off"
        className="mt-1 w-full border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
      />
      {trimmedQuery.length >= 2 && !value && matches.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1" aria-label={`Sugestões para o acompanhante ${index + 1}`}>
          {matches.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => handleSelect(guest)}
                className="w-full rounded-md border border-line px-3 py-2 text-left font-sans text-sm text-forest transition-colors hover:border-moss hover:text-moss"
              >
                {displayNameFor(guest)}
                {guest.nickname && guest.fullName !== guest.nickname && (
                  <span className="ml-2 font-sans text-xs text-forest/60">({guest.fullName})</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {trimmedQuery.length >= 2 && !value && matches.length === 0 && (
        <p className="mt-1 font-sans text-xs text-danger">Não encontramos esse nome na lista de convidados.</p>
      )}
      {value && (
        <p className="mt-1 font-sans text-xs text-moss">✓ {displayNameFor(value)} está na lista de convidados.</p>
      )}
    </div>
  );
}

export function RsvpSearch({ guests }: RsvpSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestNameCandidate | null>(null);
  const [step, setStep] = useState<Step>("searching");
  const [companionsCount, setCompanionsCount] = useState(0);
  const [previousCompanionsCount, setPreviousCompanionsCount] = useState(0);
  const [companionGuests, setCompanionGuests] = useState<Array<GuestNameCandidate | null>>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const matches = useMemo(() => findGuestMatches(trimmedQuery, guests), [trimmedQuery, guests]);
  const displayName = selectedGuest ? selectedGuest.nickname ?? selectedGuest.fullName.split(" ")[0] : "";

  if (previousCompanionsCount !== companionsCount) {
    setPreviousCompanionsCount(companionsCount);
    setCompanionGuests((current) => {
      const next = current.slice(0, companionsCount);
      while (next.length < companionsCount) next.push(null);
      return next;
    });
  }

  const excludedIds = useMemo(
    () => [selectedGuest?.id, ...companionGuests.map((guest) => guest?.id)].filter((id): id is string => Boolean(id)),
    [selectedGuest, companionGuests]
  );

  const allCompanionsIdentified = companionGuests.length === companionsCount && companionGuests.every(Boolean);

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

  function handleSelectCompanion(index: number, guest: GuestNameCandidate | null) {
    setCompanionGuests((current) => {
      const next = [...current];
      next[index] = guest;
      return next;
    });
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
    if (!selectedGuest || !allCompanionsIdentified) return;
    setIsSubmitting(true);
    const result = await confirmRsvpAction({
      guestId: selectedGuest.id,
      attendanceStatus: "confirmed",
      companionsCount,
      companionGuestIds: companionGuests.map((guest) => guest!.id),
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
                    onChange={(event) => setCompanionsCount(Math.max(0, Number(event.target.value)))}
                    className="mt-1 w-full border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
                  />
                </div>

                {companionGuests.map((companion, index) => (
                  <CompanionNameField
                    key={index}
                    index={index}
                    guests={guests}
                    excludeIds={excludedIds.filter((id) => id !== companion?.id)}
                    value={companion}
                    onSelect={(guest) => handleSelectCompanion(index, guest)}
                  />
                ))}

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
                <PillButton
                  type="submit"
                  disabled={isSubmitting || !allCompanionsIdentified}
                  className="self-center"
                >
                  {isSubmitting ? "Enviando..." : "Confirmar presença"}
                </PillButton>
                {companionsCount > 0 && !allCompanionsIdentified && (
                  <p className="text-center font-sans text-xs text-forest/60">
                    Selecione cada acompanhante na lista de sugestões para continuar.
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
