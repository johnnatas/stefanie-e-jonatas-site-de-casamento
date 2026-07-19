"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_ITEMS } from "@/shared/navigation";
import { Monogram } from "@/components/ui/Monogram";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-paper md:hidden"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <Monogram className="h-12 w-10" />
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
            {NAV_ITEMS.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.25 }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`font-serif text-2xl uppercase tracking-wide ${
                    pathname === item.href ? "text-moss" : "text-forest"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
