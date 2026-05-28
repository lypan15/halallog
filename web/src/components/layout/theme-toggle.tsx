"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  const savedTheme = window.localStorage.getItem("halallog-theme");
  return savedTheme === "dark" ? "dark" : "light";
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("halallog-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface] text-lg shadow-sm transition-colors hover:border-primary-600"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
