import type { Metadata } from "next";
import { HomeHeroForm } from "@/components/admin/HomeHeroForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Hero da Home | Painel Administrativo",
};

export default async function HomeHeroContentPage() {
  const content = await getSiteContentOrDefault("home-hero");

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Hero da Home</h1>
      <div className="mt-6">
        <HomeHeroForm defaultValues={content} />
      </div>
    </div>
  );
}
