import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference and stored preference
    const stored = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const shouldBeDark = stored === "dark" || (!stored && systemPrefersDark);
    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-out",
        "bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "apple-button haptic-light",
        isDark && "bg-primary hover:bg-primary/90",
      )}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-300 ease-out",
          "flex items-center justify-center",
          isDark ? "translate-x-6" : "translate-x-1",
        )}
      >
        {isDark ? (
          <Moon className="h-2.5 w-2.5 text-primary" />
        ) : (
          <Sun className="h-2.5 w-2.5 text-warning" />
        )}
      </span>
    </button>
  );
}
