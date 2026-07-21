"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { cn } from "@/shared/utils/cn";

interface AdminNavItem {
  label: string;
  href: string;
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: "Visão geral", items: [{ label: "Dashboard", href: "/admin/dashboard" }] },
  { label: "Convidados", items: [{ label: "Convidados", href: "/admin/convidados" }] },
  {
    label: "Presentes",
    items: [
      { label: "Presentes", href: "/admin/presentes" },
      { label: "Pagamentos", href: "/admin/pagamentos" },
    ],
  },
  { label: "Conteúdo", items: [{ label: "Conteúdo do site", href: "/admin/conteudo" }] },
  { label: "Configurações", items: [{ label: "Integrações", href: "/admin/integracoes" }] },
];

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 md:flex-row">
      <aside className="flex flex-col gap-6 md:w-48">
        <nav className="flex flex-col gap-6">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/40">
                {group.label}
              </span>
              <div className="flex flex-col gap-2">
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

      <div className="flex-1">{children}</div>
    </div>
  );
}
