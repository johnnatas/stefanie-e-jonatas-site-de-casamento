import type { Metadata } from "next";
import Link from "next/link";
import { IdentidadeVisualForm } from "@/components/admin/IdentidadeVisualForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Identidade Visual | Painel Administrativo",
};

export default async function IdentidadeVisualContentPage() {
  const content = await getSiteContentOrDefault("identidade-visual");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Identidade Visual</h1>
      <div className="mt-6">
        <IdentidadeVisualForm defaultValues={content} />
      </div>
    </div>
  );
}
