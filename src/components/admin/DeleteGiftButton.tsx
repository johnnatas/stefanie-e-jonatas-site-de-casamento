"use client";

import { useState, useTransition } from "react";
import { deleteGiftAction } from "@/app/admin/(protected)/presentes/deleteAction";

interface DeleteGiftButtonProps {
  giftId: string;
  giftName: string;
}

export function DeleteGiftButton({ giftId, giftName }: DeleteGiftButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Excluir o presente "${giftName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteGiftAction(giftId);
      if (result.status === "error") {
        setErrorMessage(result.message ?? "Não foi possível excluir o presente agora.");
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
