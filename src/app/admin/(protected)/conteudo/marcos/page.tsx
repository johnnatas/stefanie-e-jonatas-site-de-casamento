import type { Metadata } from "next";
import Link from "next/link";
import { HomeMilestonePhotosForm } from "@/components/admin/HomeMilestonePhotosForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Fotos dos Marcos | Painel Administrativo",
};

export default async function MilestonePhotosContentPage() {
  const content = await getSiteContentOrDefault("home-milestone-photos");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Fotos dos Marcos (Save the Date)</h1>
      <div className="mt-6">
        <HomeMilestonePhotosForm defaultValues={content} />
      </div>
    </div>
  );
}
