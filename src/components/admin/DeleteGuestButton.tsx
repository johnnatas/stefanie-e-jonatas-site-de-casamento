"use client";

import { useTransition } from "react";
import { deleteGuestAction } from "@/app/admin/(protected)/convidados/deleteAction";

interface DeleteGuestButtonProps {
  guestId: string;
  guestName: string;
}

export function DeleteGuestButton({ guestId, guestName }: DeleteGuestButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Excluir o convidado "${guestName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(() => {
      deleteGuestAction(guestId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="font-sans text-sm text-danger hover:text-danger/80 disabled:opacity-60"
    >
      {isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
