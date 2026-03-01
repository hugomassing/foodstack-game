import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getRealRecipe = internalQuery({
  args: {
    dishName: v.string(),
    locale: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("realRecipes")
      .withIndex("by_dish_locale", (q) =>
        q.eq("dishName", args.dishName).eq("locale", args.locale)
      )
      .first();
  },
});

export const clearAllRealRecipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("realRecipes").collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: all.length };
  },
});

export const saveRealRecipe = internalMutation({
  args: {
    dishName: v.string(),
    locale: v.string(),
    recipe: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("realRecipes", {
      dishName: args.dishName,
      locale: args.locale,
      recipe: args.recipe,
      createdAt: Date.now(),
    });
  },
});
