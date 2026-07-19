import type { Metadata } from "next";
import { HomeTopicsForm } from "@/components/admin/HomeTopicsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Carrossel da Home | Painel Administrativo",
};

export default async function TopicsContentPage() {
  const content = await getSiteContentOrDefault("home-topics");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Carrossel da Home</h1>
      <div className="mt-6">
        <HomeTopicsForm defaultValues={content} />
      </div>
    </div>
  );
}
