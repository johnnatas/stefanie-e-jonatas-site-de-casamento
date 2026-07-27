export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/" },
  { label: "Nossa História", href: "/nossa-historia" },
  { label: "Confirme Presença", href: "/confirmar-presenca" },
  { label: "Presentes", href: "/presentes" },
  { label: "Dicas e Instruções", href: "/dicas-e-instrucoes?tema=cerimonia" },
];

export const COUPLE_NAMES = "Stéfanie & Jonatas";
