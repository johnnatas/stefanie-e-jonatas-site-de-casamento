import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conteúdo do Site | Painel Administrativo",
};

interface ContentSection {
  label: string;
  description: string;
  href: string;
}

interface ContentGroup {
  label: string;
  sections: ContentSection[];
}

const CONTENT_GROUPS: ContentGroup[] = [
  {
    label: "Configurações gerais",
    sections: [
      {
        label: "Data do casamento",
        description: "Data e horário exibidos no contador da Home.",
        href: "/admin/conteudo/configuracoes",
      },
      {
        label: "Identidade Visual",
        description: "Logo do site (versões clara e escura).",
        href: "/admin/conteudo/identidade-visual",
      },
    ],
  },
  {
    label: "Presentes",
    sections: [
      {
        label: "Imagem de fundo",
        description: "Imagem de fundo exibida atrás da lista de presentes.",
        href: "/admin/conteudo/presentes",
      },
    ],
  },
  {
    label: "Home",
    sections: [
      {
        label: "Hero da Home",
        description: "Texto e fotos do topo da página inicial.",
        href: "/admin/conteudo/hero",
      },
      {
        label: "Fotos e Vídeos",
        description: "Galeria de polaroids do Save the Date e da Nossa História.",
        href: "/admin/conteudo/marcos",
      },
      {
        label: "Carrossel da Home",
        description: "Tópicos em destaque na página inicial.",
        href: "/admin/conteudo/carrossel",
      },
    ],
  },
  {
    label: "Dicas e Instruções",
    sections: [
      {
        label: "Cerimônia",
        description: "Informações sobre local e horário da cerimônia.",
        href: "/admin/conteudo/dicas-cerimonia",
      },
      {
        label: "Traje",
        description: "Orientações de traje para os convidados.",
        href: "/admin/conteudo/dicas-traje",
      },
      {
        label: "Hospedagem",
        description: "Sugestões de hospedagem para quem vem de fora.",
        href: "/admin/conteudo/dicas-hospedagem",
      },
    ],
  },
];

export default function ContentIndexPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Conteúdo do Site</h1>

      <div className="mt-8 flex flex-col gap-8">
        {CONTENT_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">{group.label}</span>
            <div className="flex flex-col gap-1">
              {group.sections.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group flex flex-col gap-0.5 border-b border-line py-3 transition-colors"
                >
                  <span className="font-serif text-lg text-forest group-hover:text-moss">{section.label}</span>
                  <span className="font-sans text-sm text-forest/60">{section.description}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
