"use client";

import { Moon, Sun } from "lucide-react";
import { cx } from "@/lib/cx";
import { ICON } from "@/lib/icon";

export type Theme = "claro" | "escuro";

export interface ThemeToggleProps {
  theme?: Theme;
  onChange?: (next: Theme) => void;
  className?: string;
}

export function ThemeToggle({ theme = "claro", onChange, className }: ThemeToggleProps) {
  const next: Theme = theme === "claro" ? "escuro" : "claro";
  return (
    <button
      type="button"
      className={cx("ap-icon-btn", className)}
      onClick={() => onChange?.(next)}
      aria-label={theme === "claro" ? "Ativar tema escuro" : "Ativar tema claro"}
    >
      {theme === "claro" ? <Moon {...ICON} /> : <Sun {...ICON} />}
    </button>
  );
}
