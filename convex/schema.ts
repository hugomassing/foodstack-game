import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  recipes: defineTable({
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    recipe: v.any(),
    createdAt: v.number(),
  }).index("by_dish_and_difficulty", ["dishName", "difficulty"]),

  victoryCards: defineTable({
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_dish_and_difficulty", ["dishName", "difficulty"]),

  combinations: defineTable({
    processor: v.string(),
    inputKey: v.string(),
    resultName: v.string(),
    resultEmoji: v.string(),
    resultAssetId: v.string(),
    createdAt: v.number(),
  }).index("by_processor_and_inputs", ["processor", "inputKey"]),
});
