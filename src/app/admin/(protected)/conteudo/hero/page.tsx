import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroForm } from "@/components/admin/HomeHeroForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Hero da Home | Painel Administrativo",
};

export default async function HomeHeroContentPage() {
  const content = await getSiteContentOrDefault("home-hero");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Hero da Home</h1>
      <div className="mt-6">
        <HomeHeroForm defaultValues={content} />
      </div>
    </div>
  );
}
