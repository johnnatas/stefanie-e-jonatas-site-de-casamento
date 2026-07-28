export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/" },
  { label: "Confirme Presença", href: "/confirmar-presenca" },
  { label: "Presentes", href: "/presentes" },
  { label: "Dicas e Instruções", href: "/dicas-e-instrucoes?tema=cerimonia" },
  { label: "Nossa História", href: "/nossa-historia" },
];

export const COUPLE_NAMES = "Stéfanie & Jonatas";
