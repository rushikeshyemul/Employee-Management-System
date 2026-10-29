"use client";

import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_THEME, THEMES, isThemeId } from "@/lib/themes";
import { cn } from "cn";

export function ThemePicker({ variant = "menu" }: { variant?: "menu" | "panel" }) {
  const { theme, setTheme } = useTheme();
  const active = isThemeId(theme) ? theme : DEFAULT_THEME;

  if (variant === "panel") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEMES.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(item.id)}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                selected && "border-primary ring-2 ring-primary/30",
              )}
            >
              <span
                className="size-4 shrink-0 rounded-full ring-1 ring-foreground/15"
                style={{ backgroundColor: item.swatch }}
              />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Choose a theme"
      >
        <Palette />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Theme</p>
        <DropdownMenuRadioGroup
          value={active}
          onValueChange={(value) => {
            if (isThemeId(value)) setTheme(value);
          }}
        >
          {THEMES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id} closeOnClick aria-label={item.label}>
              <span
                className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
                style={{ backgroundColor: item.swatch }}
              />
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
