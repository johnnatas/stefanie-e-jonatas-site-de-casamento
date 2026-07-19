import type { Metadata } from "next";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsHospedagemAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Hospedagem | Painel Administrativo",
};

export default async function TipsHospedagemContentPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Dicas — Hospedagem</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsHospedagemAction} photoLabel="Hospedagem" />
      </div>
    </div>
  );
}
