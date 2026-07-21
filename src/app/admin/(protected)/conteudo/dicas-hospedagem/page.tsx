import type { Metadata } from "next";
import Link from "next/link";
import { TipsHospedagemForm } from "@/components/admin/TipsHospedagemForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Dicas — Hospedagem | Painel Administrativo",
};

export default async function TipsHospedagemContentPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Dicas — Hospedagem</h1>
      <div className="mt-6">
        <TipsHospedagemForm defaultValues={content} />
      </div>
    </div>
  );
}
