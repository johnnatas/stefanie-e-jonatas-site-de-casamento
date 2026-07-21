"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { logoutAction } from "@/app/admin/actions";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/shared/utils/cn";

interface AdminNavItem {
  label: string;
  href: string;
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

interface AdminMobileNavProps {
  groups: AdminNavGroup[];
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileNav({ groups, isOpen, onClose }: AdminMobileNavProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu do painel administrativo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-mist px-6 py-5 md:hidden"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">
              Painel Administrativo
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="text-3xl leading-none text-forest"
            >
              &times;
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">{group.label}</span>
                <div className="flex flex-col gap-3">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "font-sans text-base uppercase tracking-widest transition-colors",
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

          <form action={logoutAction} className="mt-8">
            <button
              type="submit"
              className="font-sans text-sm uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              Sair
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
