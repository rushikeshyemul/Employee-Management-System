export const THEMES = [
  { id: "navy", label: "Navy", swatch: "#12315a" },
  { id: "ocean", label: "Ocean", swatch: "#0c6e8a" },
  { id: "forest", label: "Forest", swatch: "#1f6b45" },
  { id: "copper", label: "Copper", swatch: "#9a4d1c" },
  { id: "violet", label: "Violet", swatch: "#5b3cc4" },
  { id: "ink", label: "Dark", swatch: "#5eead4" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id);

export const DEFAULT_THEME: ThemeId = "navy";

export function isThemeId(value: string | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
