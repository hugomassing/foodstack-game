import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getRecipe = internalQuery({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_dish_and_difficulty", (q) =>
        q.eq("dishName", args.dishName).eq("difficulty", args.difficulty)
      )
      .first();
  },
});

export const saveRecipe = internalMutation({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    recipe: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("recipes", {
      dishName: args.dishName,
      difficulty: args.difficulty,
      recipe: args.recipe,
      createdAt: Date.now(),
    });
  },
});
