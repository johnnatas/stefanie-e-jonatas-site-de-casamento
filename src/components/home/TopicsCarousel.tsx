"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { PillButton } from "@/components/ui/PillButton";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { HomeTopicsContent } from "@/application/content/schemas";

interface Topic {
  title: string;
  description: string;
  photo: string | null;
  address: string | null;
  href: string;
}

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;

const TOPIC_HREFS: Record<(typeof TOPIC_KEYS)[number], string> = {
  cerimonia: "/dicas-e-instrucoes?tema=cerimonia",
  presentes: "/presentes",
  traje: "/dicas-e-instrucoes?tema=vestimenta",
  hospedagem: "/dicas-e-instrucoes?tema=hospedagem",
  nossaHistoria: "/nossa-historia",
};

function buildTopics(content: HomeTopicsContent): Topic[] {
  return TOPIC_KEYS.map((key) => ({
    title: content[key].title,
    description: content[key].description,
    photo: content[key].photo,
    address: content[key].address,
    href: TOPIC_HREFS[key],
  }));
}

function TopicPanel({
  topic,
  className,
  style,
}: {
  topic: Topic;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`group relative block h-full overflow-hidden ${className ?? ""}`} style={style}>
      <PhotoOrPlaceholder
        src={topic.photo}
        label={`Foto — ${topic.title}`}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-forest/40 transition-colors group-hover:bg-forest/55" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center text-paper">
        {topic.address && (
          <p className="whitespace-pre-line font-serif text-sm text-paper/80">{topic.address}</p>
        )}
        <h3 className="font-serif text-4xl uppercase tracking-wide sm:text-5xl">{topic.title}</h3>
        <PillButton href={topic.href} className="border-paper text-paper hover:bg-paper hover:text-forest">
          {topic.description}
        </PillButton>
      </div>
    </div>
  );
}

/**
 * Drives the track's real scrollLeft from vertical page scroll, so the
 * panels advance as the user scrolls down — but since it's a genuine
 * horizontally-scrollable element (not a transform), the user can also
 * swipe/drag it left-right directly at any point. The two inputs don't
 * conflict: a horizontal touch gesture on the track scrolls only the
 * track (no window 'scroll' event fires), while vertical page scroll
 * keeps syncing scrollLeft to the formula whenever it does fire.
 */
function useScrollSyncedHorizontalScroll(
  sectionRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    let rafId: number | null = null;

    function measure() {
      rafId = null;
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      const scrollableDistance = section.offsetHeight - window.innerHeight;
      if (scrollableDistance <= 0) return;

      const rect = section.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollableDistance);
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      track.scrollLeft = (scrolled / scrollableDistance) * maxScrollLeft;
    }

    function handleScroll() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [sectionRef, trackRef]);
}

function ScrollCarousel({ topics, panelWidthVw }: { topics: Topic[]; panelWidthVw: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowWidthVw = topics.length * panelWidthVw;
  useScrollSyncedHorizontalScroll(sectionRef, trackRef);

  return (
    <section ref={sectionRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          ref={trackRef}
          className="h-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex h-full" style={{ width: `${rowWidthVw}vw` }}>
            {topics.map((topic) => (
              <TopicPanel
                key={topic.href}
                topic={topic}
                className="flex-shrink-0"
                style={{ width: `${panelWidthVw}vw` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SwipeCarousel({ topics }: { topics: Topic[] }) {
  const [emblaRef] = useEmblaCarousel({ loop: false, align: "start" });

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex h-[70vh]">
        {topics.map((topic) => (
          <TopicPanel
            key={topic.href}
            topic={topic}
            className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%]"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Last section of the Home page: scroll-jacked horizontal carousel
 * (vertical scroll drives horizontal panel movement) on both desktop
 * and mobile, with narrower panels on mobile (85vw vs. 50vw) so pacing
 * matches the smaller viewport. The track is a real horizontally
 * scrollable element, so users can also swipe/drag it directly at any
 * point, not just via vertical scroll. prefers-reduced-motion gets a
 * standard swipe/drag carousel instead, on every breakpoint — see
 * references/images/carrossel-de-scroll-horizontal.png for the
 * full-height photo treatment this mirrors (local design reference, not
 * in the repo).
 */
interface TopicsCarouselProps {
  content: HomeTopicsContent;
}

export function TopicsCarousel({ content }: TopicsCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const topics = buildTopics(content);

  if (prefersReducedMotion) {
    return <SwipeCarousel topics={topics} />;
  }

  return (
    <>
      <div className="hidden md:block">
        <ScrollCarousel topics={topics} panelWidthVw={50} />
      </div>
      <div className="md:hidden">
        <ScrollCarousel topics={topics} panelWidthVw={85} />
      </div>
    </>
  );
}
