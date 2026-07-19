import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Configurações | Painel Administrativo",
};

export default async function SettingsContentPage() {
  const content = await getSiteContentOrDefault("settings");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Configurações</h1>
      <div className="mt-6">
        <SettingsForm defaultValues={content} />
      </div>
    </div>
  );
}
