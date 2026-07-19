import { HomeHero } from "@/components/home/HomeHero";
import { SaveTheDateSection } from "@/components/home/SaveTheDateSection";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <SaveTheDateSection />
      <TopicsCarousel />
    </>
  );
}
