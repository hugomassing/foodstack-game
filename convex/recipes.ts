import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getRecipe = internalQuery({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    locale: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_dish_difficulty_locale", (q) =>
        q.eq("dishName", args.dishName).eq("difficulty", args.difficulty).eq("locale", args.locale)
      )
      .first();
  },
});

export const saveRecipe = internalMutation({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    locale: v.string(),
    recipe: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("recipes", {
      dishName: args.dishName,
      difficulty: args.difficulty,
      locale: args.locale,
      recipe: args.recipe,
      createdAt: Date.now(),
    });
  },
});
