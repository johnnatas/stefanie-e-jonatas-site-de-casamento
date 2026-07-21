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
      <img
        src="/images/torn-paper.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none relative -mt-[10.573vw] aspect-[4920/963] w-full"
      />
      <SaveTheDateSection milestonePhotos={milestonePhotos} />
      <TopicsCarousel content={topicsContent} />
    </>
  );
}
