import type { ComponentType } from "react";

export interface AdminNavItem {
  label: string;
  href: string;
}

export interface AdminNavGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: AdminNavItem[];
}
