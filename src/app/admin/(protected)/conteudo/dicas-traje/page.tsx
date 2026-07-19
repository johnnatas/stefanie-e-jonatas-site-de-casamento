import type { Metadata } from "next";
import Link from "next/link";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsTrajeAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Traje | Painel Administrativo",
};

export default async function TipsTrajeContentPage() {
  const content = await getSiteContentOrDefault("tips-traje");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Dicas — Traje</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsTrajeAction} photoLabel="Inspiração de traje" />
      </div>
    </div>
  );
}
