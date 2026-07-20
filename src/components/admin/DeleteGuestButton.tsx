"use client";

import { useState, useTransition } from "react";
import { deleteGuestAction } from "@/app/admin/(protected)/convidados/deleteAction";

interface DeleteGuestButtonProps {
  guestId: string;
  guestName: string;
}

export function DeleteGuestButton({ guestId, guestName }: DeleteGuestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Excluir o convidado "${guestName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteGuestAction(guestId);
      if (result.status === "error") {
        setErrorMessage(result.message ?? "Não foi possível excluir o convidado agora.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="font-sans text-sm text-danger hover:text-danger/80 disabled:opacity-60"
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </button>
      {errorMessage && <p className="mt-1 font-sans text-xs text-danger">{errorMessage}</p>}
    </div>
  );
}
