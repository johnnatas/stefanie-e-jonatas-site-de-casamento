"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { HomeIcon, UsersIcon, GiftIcon, DocumentIcon, PlugIcon } from "@/components/admin/icons";
import type { AdminNavGroup } from "@/components/admin/adminNav";
import { cn } from "@/shared/utils/cn";

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: "Visão geral", icon: HomeIcon, items: [{ label: "Dashboard", href: "/admin/dashboard" }] },
  {
    label: "Convidados",
    icon: UsersIcon,
    items: [
      { label: "Convidados", href: "/admin/convidados" },
      { label: "Mensagens", href: "/admin/mensagens" },
    ],
  },
  {
    label: "Presentes",
    icon: GiftIcon,
    items: [
      { label: "Presentes", href: "/admin/presentes" },
      { label: "Pagamentos", href: "/admin/pagamentos" },
    ],
  },
  { label: "Conteúdo", icon: DocumentIcon, items: [{ label: "Conteúdo do site", href: "/admin/conteudo" }] },
  { label: "Configurações", icon: PlugIcon, items: [{ label: "Integrações", href: "/admin/integracoes" }] },
];

function findCurrentSectionLabel(pathname: string): string {
  for (const group of ADMIN_NAV_GROUPS) {
    const hasMatch = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    if (hasMatch) return group.label;
  }
  return "Painel Administrativo";
}

interface AdminShellProps {
  userEmail: string | null;
  children: React.ReactNode;
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const currentSectionLabel = findCurrentSectionLabel(pathname);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 md:py-12">
      <div className="flex items-center justify-between md:hidden">
        <span data-testid="admin-mobile-section-label" className="font-serif text-lg text-forest">
          {currentSectionLabel}
        </span>
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Abrir menu"
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5"
        >
          <span className="block h-px w-6 bg-forest" />
          <span className="block h-px w-6 bg-forest" />
          <span className="block h-px w-4 bg-forest" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-8 md:mt-0 md:flex-row">
        <aside className="hidden flex-col gap-6 md:flex md:w-52">
          <nav className="flex flex-col gap-6">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <group.icon className="h-4 w-4 text-forest/70" />
                  <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">
                    {group.label}
                  </span>
                </div>
                <div className="flex flex-col gap-2 pl-6">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "font-sans text-sm uppercase tracking-widest transition-colors",
                          isActive ? "font-medium text-moss" : "text-forest/70 hover:text-moss"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="font-sans text-sm uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              Sair
            </button>
          </form>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center justify-between border-b border-line pb-4 md:flex">
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">
              Início / {currentSectionLabel}
            </span>
            {userEmail && <span className="font-sans text-xs text-forest/70">{userEmail}</span>}
          </div>

          <div className="mt-6 rounded-lg border border-line bg-paper p-6 md:mt-8">{children}</div>
        </div>
      </div>

      <AdminMobileNav
        groups={ADMIN_NAV_GROUPS}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </div>
  );
}
