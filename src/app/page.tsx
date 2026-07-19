import { HomeHero } from "@/components/home/HomeHero";
import { SaveTheDateSection } from "@/components/home/SaveTheDateSection";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function HomePage() {
  const [settings, heroContent, milestonePhotos, topicsContent] = await Promise.all([
    getSiteContentOrDefault("settings"),
    getSiteContentOrDefault("home-hero"),
    getSiteContentOrDefault("home-milestone-photos"),
    getSiteContentOrDefault("home-topics"),
  ]);

  return (
    <>
      <HomeHero heroContent={heroContent} settings={settings} />
      <SaveTheDateSection milestonePhotos={milestonePhotos} />
      <TopicsCarousel content={topicsContent} />
    </>
  );
}
