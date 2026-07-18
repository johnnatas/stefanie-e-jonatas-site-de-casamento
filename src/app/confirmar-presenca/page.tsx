import type { Metadata } from "next";
import { RsvpForm } from "@/components/rsvp/RsvpForm";

export const metadata: Metadata = {
  title: "Confirme sua Presença | Stéfanie & Jonatas",
};

export default function RsvpPage() {
  return (
    <div className="pb-20">
      <section className="mx-auto max-w-2xl px-6 pt-20 text-center">
        <span className="font-sans text-xs uppercase tracking-widest text-rose">RSVP</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Confirme sua presença</h1>
        <p className="mt-6 font-sans text-ink-soft">
          Sua presença é muito importante para nós. Preencha o formulário abaixo o quanto antes.
        </p>
      </section>

      <div className="mx-auto mt-12 max-w-2xl px-6">
        <RsvpForm />
      </div>
    </div>
  );
}
