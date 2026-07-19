"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

interface Topic {
  title: string;
  description: string;
  href: string;
}

const TOPICS: Topic[] = [
  {
    title: "Cerimônia",
    description: "Horário, local e tudo sobre a celebração.",
    href: "/dicas-e-instrucoes/cerimonia",
  },
  {
    title: "Lista de presentes",
    description: "Ajude a construir o começo da nossa nova casa.",
    href: "/presentes",
  },
  {
    title: "Traje",
    description: "Código de vestimenta para o grande dia.",
    href: "/dicas-e-instrucoes/codigo-de-vestimenta",
  },
  {
    title: "Hospedagem",
    description: "Sugestões de hotéis e pousadas próximas.",
    href: "/dicas-e-instrucoes/hospedagem",
  },
  {
    title: "Nossa história",
    description: "Como tudo começou até chegarmos aqui.",
    href: "/nossa-historia",
  },
];

function TopicPanel({ topic, className }: { topic: Topic; className?: string }) {
  return (
    <Link href={topic.href} className={`group relative block h-full overflow-hidden ${className ?? ""}`}>
      <PlaceholderImage label={`Foto — ${topic.title}`} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-forest/40 transition-colors group-hover:bg-forest/55" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-8 text-paper">
        <h3 className="font-serif text-3xl">{topic.title}</h3>
        <p className="font-sans text-sm text-paper/80">{topic.description}</p>
      </div>
    </Link>
  );
}

function useScrollDrivenTranslate(sectionRef: RefObject<HTMLElement | null>, maxTranslateVw: number) {
  const [translateVw, setTranslateVw] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const section = sectionRef.current;
      if (!section) return;

      const scrollableDistance = section.offsetHeight - window.innerHeight;
      if (scrollableDistance <= 0) return;

      const rect = section.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollableDistance);
      setTranslateVw((scrolled / scrollableDistance) * maxTranslateVw);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

function DesktopScrollCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const rowWidthVw = TOPICS.length * 50;
  const maxTranslateVw = Math.max(rowWidthVw - 100, 0);
  const translateVw = useScrollDrivenTranslate(sectionRef, maxTranslateVw);

  return (
    <section ref={sectionRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${translateVw}vw)`, width: `${rowWidthVw}vw` }}
        >
          {TOPICS.map((topic) => (
            <TopicPanel key={topic.href} topic={topic} className="w-[50vw] flex-shrink-0" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SwipeCarousel() {
  const [emblaRef] = useEmblaCarousel({ loop: false, align: "start" });

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex h-[70vh]">
        {TOPICS.map((topic) => (
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
 * Last section of the Home page. Desktop: scroll-jacked horizontal
 * carousel (vertical scroll drives horizontal panel movement). Mobile
 * and prefers-reduced-motion: a standard swipe/drag carousel instead —
 * see references/images/carrossel-de-scroll-horizontal.png for the
 * full-height photo treatment this mirrors (local design reference, not
 * in the repo).
 */
export function TopicsCarousel() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <div className="hidden md:block">
        {prefersReducedMotion ? <SwipeCarousel /> : <DesktopScrollCarousel />}
      </div>
      <div className="md:hidden">
        <SwipeCarousel />
      </div>
    </>
  );
}
