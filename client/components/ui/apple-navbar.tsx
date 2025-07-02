import { useState, useEffect } from "react";
import { Bell, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

interface AppleNavbarProps {
  title?: string;
  subtitle?: string;
}

export function AppleNavbar({
  title = "Good morning! 👋",
  subtitle,
}: AppleNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
        scrolled ? "glass-thick navbar-scroll" : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex-1">
            <h1
              className={cn(
                "font-display font-semibold text-foreground transition-all duration-300",
                scrolled ? "text-2xl" : "text-4xl",
              )}
            >
              {title}
            </h1>
            {subtitle && !scrolled && (
              <p className="text-lg text-muted-foreground mt-1 animate-fade-in">
                {subtitle}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            <button
              className={cn(
                "w-10 h-10 rounded-full glass-thin flex items-center justify-center",
                "apple-button haptic-light transition-all duration-200",
              )}
            >
              <Bell className="w-5 h-5 text-foreground" />
            </button>

            <Link
              to="/settings"
              className={cn(
                "w-10 h-10 rounded-full glass-thin flex items-center justify-center",
                "apple-button haptic-light transition-all duration-200",
              )}
            >
              <Settings className="w-5 h-5 text-foreground" />
            </Link>

            <div
              className={cn(
                "w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent",
                "flex items-center justify-center apple-button haptic-light",
                "shadow-lg",
              )}
            >
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
