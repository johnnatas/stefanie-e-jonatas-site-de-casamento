"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export type PillButtonVariant = "primary" | "secondary";

interface PillButtonProps {
  variant?: PillButtonVariant;
  className?: string;
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: MouseEventHandler;
}

const VARIANT_CLASSES: Record<PillButtonVariant, string> = {
  primary: "border-moss text-moss hover:bg-moss hover:text-paper",
  secondary: "border-forest/20 text-forest/70 hover:border-forest/70 hover:text-forest",
};

export function PillButton({
  variant = "primary",
  className,
  children,
  href,
  type = "button",
  disabled,
  onClick,
}: PillButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full border px-8 py-3 font-serif text-base italic transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT_CLASSES[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
