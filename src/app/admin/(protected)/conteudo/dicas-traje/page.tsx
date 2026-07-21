import type { Metadata } from "next";
import Link from "next/link";
import { TipsTrajeForm } from "@/components/admin/TipsTrajeForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

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
        <TipsTrajeForm defaultValues={content} />
      </div>
    </div>
  );
}
