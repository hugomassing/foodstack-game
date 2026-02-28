/**
 * Food Assets Loader & Registry for Phaser.js
 *
 * Usage:
 *   // In your preload scene:
 *   FoodAssets.preload(this);
 *
 *   // Later, access items:
 *   const apple = FoodAssets.get("apple");
 *   console.log(apple.label, apple.color);
 *   this.add.image(100, 100, apple.textureKey);
 *
 *   // Filter by category:
 *   const fruits = FoodAssets.byCategory("fruit");
 */

import Phaser from "phaser";
import manifest from "./food-manifest.json";

// ── Types ─────────────────────────────────────────────────────────────

export type FoodCategory =
  | "condiment"
  | "dairy"
  | "drink"
  | "fruit"
  | "grain"
  | "ingredient"
  | "prepared"
  | "protein"
  | "seafood"
  | "snack"
  | "sweet"
  | "utensil"
  | "vegetable";

export interface FoodItem {
  /** Unique key, e.g. "apple", "bun_top" */
  id: string;
  /** Human-readable name, e.g. "Apple", "Bun Top" */
  label: string;
  /** Category grouping */
  category: FoodCategory;
  /** Relative path from assets/sprites/, e.g. "food/fruit/apple.png" */
  filename: string;
  /** Dominant color as hex, e.g. "#e02040" */
  color: string;
  /** Short description of the ingredient for LLM context */
  description: string;
  /** Semantic tags (taste, texture, cuisine, use…) for LLM search & matching */
  tags: string[];
  /** Phaser texture key used after preload */
  textureKey: string;
}

// ── Constants ─────────────────────────────────────────────────────────

const SPRITES_BASE = "assets/sprites";

// ── Build registry ────────────────────────────────────────────────────

const itemsById = new Map<string, FoodItem>();
const itemsByCategory = new Map<FoodCategory, FoodItem[]>();
const itemsByTag = new Map<string, FoodItem[]>();

const items: FoodItem[] = (manifest as Omit<FoodItem, "textureKey">[]).map(
  (raw) => {
    const item: FoodItem = {
      ...raw,
      category: raw.category as FoodCategory,
      textureKey: `food_${raw.id}`,
    };
    itemsById.set(item.id, item);

    const catList = itemsByCategory.get(item.category) ?? [];
    catList.push(item);
    itemsByCategory.set(item.category, catList);

    for (const tag of item.tags) {
      const tagList = itemsByTag.get(tag) ?? [];
      tagList.push(item);
      itemsByTag.set(tag, tagList);
    }

    return item;
  }
);

// ── Public API ────────────────────────────────────────────────────────

export const FoodAssets = {
  /** All food items */
  all: items,

  /** Total count */
  count: items.length,

  /** All available categories */
  categories: [...itemsByCategory.keys()] as FoodCategory[],

  /**
   * Preload every food sprite into the Phaser texture cache.
   * Call this in your Scene's `preload()` method.
   */
  preload(scene: Phaser.Scene): void {
    for (const item of items) {
      scene.load.image(
        item.textureKey,
        `${SPRITES_BASE}/${item.filename}`
      );
    }
  },

  /**
   * Get a single food item by its id.
   * @throws if id is unknown
   */
  get(id: string): FoodItem {
    const item = itemsById.get(id);
    if (!item) throw new Error(`Unknown food item: "${id}"`);
    return item;
  },

  /** Get a food item or undefined if not found */
  find(id: string): FoodItem | undefined {
    return itemsById.get(id);
  },

  /** Get all items in a category */
  byCategory(category: FoodCategory): FoodItem[] {
    return itemsByCategory.get(category) ?? [];
  },

  /** Get all items that have a specific tag, e.g. "spicy", "sweet", "japanese" */
  byTag(tag: string): FoodItem[] {
    return itemsByTag.get(tag) ?? [];
  },

  /** Get all unique tags across all items */
  allTags(): string[] {
    return [...itemsByTag.keys()].sort();
  },

  /** Get a random food item */
  random(): FoodItem {
    return items[Math.floor(Math.random() * items.length)];
  },

  /** Get N random unique food items */
  randomSet(count: number): FoodItem[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, items.length));
  },

  /**
   * Parse a hex color string to a Phaser-friendly numeric color.
   * Useful for tint, setTint(), graphics fills, etc.
   */
  colorToNumber(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  },
} as const;

export default FoodAssets;
