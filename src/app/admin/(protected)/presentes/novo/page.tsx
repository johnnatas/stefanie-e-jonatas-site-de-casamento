import type { Metadata } from "next";
import { GiftForm } from "@/components/admin/GiftForm";

export const metadata: Metadata = {
  title: "Novo Presente | Painel Administrativo",
};

export default function NewGiftPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Novo presente</h1>
      <div className="mt-6">
        <GiftForm />
      </div>
    </div>
  );
}
