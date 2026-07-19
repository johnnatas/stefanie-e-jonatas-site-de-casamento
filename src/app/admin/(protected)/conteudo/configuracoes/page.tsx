import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Configurações | Painel Administrativo",
};

export default async function SettingsContentPage() {
  const content = await getSiteContentOrDefault("settings");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Configurações</h1>
      <div className="mt-6">
        <SettingsForm defaultValues={content} />
      </div>
    </div>
  );
}
