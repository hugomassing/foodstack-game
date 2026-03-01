import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getVictoryCard = internalQuery({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("victoryCards")
      .withIndex("by_dish_and_difficulty", (q) =>
        q.eq("dishName", args.dishName).eq("difficulty", args.difficulty)
      )
      .first();
  },
});

export const saveVictoryCard = internalMutation({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("victoryCards", {
      dishName: args.dishName,
      difficulty: args.difficulty,
      storageId: args.storageId,
      createdAt: Date.now(),
    });
  },
});
