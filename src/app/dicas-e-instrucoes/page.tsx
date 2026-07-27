import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TipsThemeMenu, type TipsTheme } from "@/components/tips/TipsThemeMenu";
import { CeremonyTheme } from "@/components/tips/CeremonyTheme";
import { DressCodeTheme } from "@/components/tips/DressCodeTheme";
import { LodgingTheme } from "@/components/tips/LodgingTheme";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Dicas e Instruções | Stéfanie & Jonatas",
};

const VALID_THEMES: TipsTheme[] = ["cerimonia", "vestimenta", "hospedagem"];

export default async function TipsPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const { tema } = await searchParams;

  if (!tema || !VALID_THEMES.includes(tema as TipsTheme)) {
    redirect("/dicas-e-instrucoes?tema=cerimonia");
  }
  const active = tema as TipsTheme;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
      <TipsThemeMenu active={active} />
      <div className="mt-12 lg:mt-0">
        {active === "cerimonia" && <CeremonyTheme content={await getSiteContentOrDefault("tips-cerimonia")} />}
        {active === "vestimenta" && <DressCodeTheme content={await getSiteContentOrDefault("tips-traje")} />}
        {active === "hospedagem" && <LodgingTheme content={await getSiteContentOrDefault("tips-hospedagem")} />}
      </div>
    </div>
  );
}
