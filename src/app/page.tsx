import { HomeHero } from "@/components/home/HomeHero";
import { SaveTheDateSection } from "@/components/home/SaveTheDateSection";
import { InfoCards } from "@/components/home/InfoCards";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <SaveTheDateSection />
      <InfoCards />
    </>
  );
}
