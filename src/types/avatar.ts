/** Avatar slots, in paint order. Mirrors `AvatarItem::SLOTS` on the API. */
export const AVATAR_SLOTS = [
  "torso",
  "legs",
  "eyes",
  "mouth",
  "face",
  "head",
  "neck",
  "hands",
  "held",
] as const;

export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

export const AVATAR_SLOT_LABELS: Record<AvatarSlot, string> = {
  torso: "Tělo",
  legs: "Nohy",
  eyes: "Oči",
  mouth: "Pusa",
  face: "Obličej",
  head: "Hlava",
  neck: "Krk",
  hands: "Ruce",
  held: "Předmět v ruce",
};

export const AVATAR_RARITIES = ["common", "rare", "epic"] as const;

export type AvatarRarity = (typeof AVATAR_RARITIES)[number];

export const AVATAR_RARITY_LABELS: Record<AvatarRarity, string> = {
  common: "Běžný",
  rare: "Vzácný",
  epic: "Epický",
};

export interface AvatarItem {
  id: number;
  code: string;
  name: string;
  slot: AvatarSlot;
  /** Paint order — lower renders behind higher. */
  layer: number;
  r2_path: string;
  url: string;
  rarity: AvatarRarity;
  /** Always 0 during the free period; the column exists for future credits. */
  price: number;
  /** Part of the free starting outfit — implicitly owned, never sold. */
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AvatarItemsResponse {
  data: AvatarItem[];
  meta: {
    total: number;
    slots: AvatarSlot[];
    rarities: AvatarRarity[];
  };
}

/** Fields the upload form sends alongside the SVG. */
export interface AvatarItemInput {
  code: string;
  name: string;
  slot: AvatarSlot;
  layer: number;
  rarity: AvatarRarity;
  price: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}
