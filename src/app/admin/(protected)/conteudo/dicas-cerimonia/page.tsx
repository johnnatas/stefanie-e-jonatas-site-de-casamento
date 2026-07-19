import type { Metadata } from "next";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsCerimoniaAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Cerimônia | Painel Administrativo",
};

export default async function TipsCerimoniaContentPage() {
  const content = await getSiteContentOrDefault("tips-cerimonia");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Dicas — Cerimônia</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsCerimoniaAction} photoLabel="Local da cerimônia" />
      </div>
    </div>
  );
}
