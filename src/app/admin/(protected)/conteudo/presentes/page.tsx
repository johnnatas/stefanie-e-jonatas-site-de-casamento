import type { Metadata } from "next";
import Link from "next/link";
import { PresentesForm } from "@/components/admin/PresentesForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Presentes — Imagem de fundo | Painel Administrativo",
};

export default async function PresentesContentPage() {
  const content = await getSiteContentOrDefault("presentes");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Presentes — Imagem de fundo</h1>
      <div className="mt-6">
        <PresentesForm defaultValues={content} />
      </div>
    </div>
  );
}
