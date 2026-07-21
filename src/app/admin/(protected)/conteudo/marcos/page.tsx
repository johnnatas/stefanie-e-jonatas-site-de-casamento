import type { Metadata } from "next";
import Link from "next/link";
import { HomeGalleryForm } from "@/components/admin/HomeGalleryForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Fotos e Vídeos | Painel Administrativo",
};

export default async function HomeGalleryContentPage() {
  const content = await getSiteContentOrDefault("home-gallery");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Fotos e Vídeos (Save the Date)</h1>
      <p className="mt-2 font-sans text-sm text-forest/70">
        Aparecem no Save the Date da Home e na página Nossa História.
      </p>
      <div className="mt-6">
        <HomeGalleryForm defaultValues={content} />
      </div>
    </div>
  );
}
