import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conteúdo do Site | Painel Administrativo",
};

const CONTENT_SECTIONS = [
  { label: "Configurações (data do casamento)", href: "/admin/conteudo/configuracoes" },
  { label: "Hero da Home", href: "/admin/conteudo/hero" },
  { label: "Fotos dos Marcos (Save the Date)", href: "/admin/conteudo/marcos" },
  { label: "Carrossel da Home", href: "/admin/conteudo/carrossel" },
  { label: "Dicas — Cerimônia", href: "/admin/conteudo/dicas-cerimonia" },
  { label: "Dicas — Traje", href: "/admin/conteudo/dicas-traje" },
  { label: "Dicas — Hospedagem", href: "/admin/conteudo/dicas-hospedagem" },
];

export default function ContentIndexPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Conteúdo do Site</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {CONTENT_SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
