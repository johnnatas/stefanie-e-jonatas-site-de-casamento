import type { Metadata } from "next";
import Link from "next/link";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Novo Convidado | Painel Administrativo",
};

export default function NewGuestPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/convidados" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Novo convidado</h1>
      <div className="mt-6">
        <GuestForm />
      </div>
    </div>
  );
}
