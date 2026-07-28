"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { isNavItemActive, NAV_ITEMS } from "@/shared/navigation";
import { Monogram } from "@/components/ui/Monogram";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
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
          aria-label="Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-mist md:hidden"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <Monogram className="h-12 w-auto" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="text-forest text-3xl leading-none"
            >
              &times;
            </button>
          </div>
          <nav className="flex flex-col items-center gap-8 pt-12">
            {NAV_ITEMS.map((item, index) => {
              const isActive = isNavItemActive(pathname, item.href);
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.25 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "font-script text-2xl italic text-moss"
                        : "font-serif text-xl uppercase tracking-[0.2em] text-forest/80 hover:text-moss"
                    }
                  >
                    {isActive ? item.label.toLowerCase() : item.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
