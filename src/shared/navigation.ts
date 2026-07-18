export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/" },
  { label: "Nossa História", href: "/nossa-historia" },
  { label: "Confirme Presença", href: "/confirmar-presenca" },
  { label: "Presentes", href: "/presentes" },
  { label: "Dicas e Instruções", href: "/dicas-e-instrucoes/cerimonia" },
];

export const COUPLE_NAMES = "Stéfanie & Jonatas";
export const WEDDING_DATE_ISO = "2027-06-19T16:00:00-03:00";
export const WEDDING_DATE_LABEL = "19 de junho de 2027";
export const WEDDING_LOCATION_LABEL = "Minas Gerais, Brasil";
