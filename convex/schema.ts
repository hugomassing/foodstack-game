import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // @convex-dev/auth managed fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    displayName: v.optional(v.string()),
    locale: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  recipes: defineTable({
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    locale: v.optional(v.string()),
    recipe: v.any(),
    createdAt: v.number(),
  }).index("by_dish_difficulty_locale", ["dishName", "difficulty", "locale"]),

  victoryCards: defineTable({
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_dish_and_difficulty", ["dishName", "difficulty"]),

  gameResults: defineTable({
    userId: v.id("users"),
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    stepCount: v.number(),
    totalSteps: v.number(),
    errorCount: v.number(),
    completedAt: v.number(),
    victoryCardStorageId: v.optional(v.id("_storage")),
  })
    .index("by_user", ["userId", "completedAt"])
    .index("by_completed", ["completedAt"]),

  combinations: defineTable({
    processor: v.string(),
    inputKey: v.string(),
    locale: v.optional(v.string()),
    resultName: v.string(),
    resultEmoji: v.string(),
    resultAssetId: v.string(),
    resultNameI18n: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_processor_inputs_locale", ["processor", "inputKey", "locale"]),
});
