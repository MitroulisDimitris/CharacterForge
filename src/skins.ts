// Skins: how the app looks. A skin is a colour/texture set (CSS tokens under
// :root[data-theme="<id>"] in styles.css) plus a layout:
//   "classic" — top bar + content + summary column (the original layout)
//   "hero"    — left hero sidebar with the character (see the UI rules in CLAUDE.md)
// To add a skin: add an entry here and its tokens in styles.css.

export type SkinId = "dark" | "parchment" | "hero";
export type SkinLayout = "classic" | "hero";

export interface Skin {
  id: SkinId;
  name: string;
  description: string;
  layout: SkinLayout;
}

export const SKINS: Skin[] = [
  { id: "hero", name: "Hero", description: "Character sidebar, textured dark, glowing choices", layout: "hero" },
  { id: "dark", name: "Dark", description: "The original dark look", layout: "classic" },
  { id: "parchment", name: "Parchment", description: "Light, like a paper sheet", layout: "classic" },
];

export const DEFAULT_SKIN: SkinId = "dark";
export const skinOf = (id: string | null | undefined): Skin => SKINS.find((s) => s.id === id) ?? SKINS.find((s) => s.id === DEFAULT_SKIN)!;
