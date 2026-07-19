import type { Metadata } from "next";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Novo Convidado | Painel Administrativo",
};

export default function NewGuestPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Novo convidado</h1>
      <div className="mt-6">
        <GuestForm />
      </div>
    </div>
  );
}
