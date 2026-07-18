import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Convidados", href: "/admin/convidados" },
  { label: "Presentes", href: "/admin/presentes" },
];

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 md:flex-row">
      <aside className="flex flex-row flex-wrap gap-4 md:w-48 md:flex-col">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="font-sans text-sm uppercase tracking-widest text-ink-soft hover:text-rose"
          >
            {item.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button
            type="submit"
            className="font-sans text-sm uppercase tracking-widest text-ink-soft hover:text-rose"
          >
            Sair
          </button>
        </form>
      </aside>

      <div className="flex-1">{children}</div>
    </div>
  );
}
