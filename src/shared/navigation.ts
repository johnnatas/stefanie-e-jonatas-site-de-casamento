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

/**
 * A nav item's href may carry a query string (e.g. the Dicas e Instruções
 * link defaults to `?tema=cerimonia`), but `usePathname()` never includes
 * one — comparing them directly would never mark that item active. Strip
 * the href's query string before comparing.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const hrefPath = href.split("?")[0];
  return pathname === hrefPath;
}
