import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  recipes: defineTable({
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    recipe: v.any(),
    createdAt: v.number(),
  }).index("by_dish_and_difficulty", ["dishName", "difficulty"]),
});
