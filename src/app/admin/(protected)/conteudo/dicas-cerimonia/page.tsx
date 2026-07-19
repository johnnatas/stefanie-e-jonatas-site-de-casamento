import type { Metadata } from "next";
import Link from "next/link";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsCerimoniaAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Cerimônia | Painel Administrativo",
};

export default async function TipsCerimoniaContentPage() {
  const content = await getSiteContentOrDefault("tips-cerimonia");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Dicas — Cerimônia</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsCerimoniaAction} photoLabel="Local da cerimônia" />
      </div>
    </div>
  );
}
