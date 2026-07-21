"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { PillButton } from "@/components/ui/PillButton";
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
  cerimonia: "/dicas-e-instrucoes/cerimonia",
  presentes: "/presentes",
  traje: "/dicas-e-instrucoes/codigo-de-vestimenta",
  hospedagem: "/dicas-e-instrucoes/hospedagem",
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

function useScrollDrivenTranslate(sectionRef: RefObject<HTMLElement | null>, maxTranslateVw: number) {
  const [translateVw, setTranslateVw] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;

    function measure() {
      rafId = null;
      const section = sectionRef.current;
      if (!section) return;

      const scrollableDistance = section.offsetHeight - window.innerHeight;
      if (scrollableDistance <= 0) return;

      const rect = section.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollableDistance);
      setTranslateVw((scrolled / scrollableDistance) * maxTranslateVw);
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
  }, [sectionRef, maxTranslateVw]);

  return translateVw;
}

function getPrefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(getPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}

function ScrollCarousel({ topics, panelWidthVw }: { topics: Topic[]; panelWidthVw: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const rowWidthVw = topics.length * panelWidthVw;
  const maxTranslateVw = Math.max(rowWidthVw - 100, 0);
  const translateVw = useScrollDrivenTranslate(sectionRef, maxTranslateVw);

  return (
    <section ref={sectionRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${translateVw}vw)`, width: `${rowWidthVw}vw` }}
        >
          {topics.map((topic) => (
            <TopicPanel key={topic.href} topic={topic} className="flex-shrink-0" style={{ width: `${panelWidthVw}vw` }} />
          ))}
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
 * matches the smaller viewport. prefers-reduced-motion gets a standard
 * swipe/drag carousel instead, on every breakpoint — see
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
