import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getCombination = internalQuery({
  args: {
    processor: v.string(),
    inputKey: v.string(),
    locale: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("combinations")
      .withIndex("by_processor_inputs_locale", (q) =>
        q.eq("processor", args.processor).eq("inputKey", args.inputKey).eq("locale", args.locale)
      )
      .first();
  },
});

export const saveCombination = internalMutation({
  args: {
    processor: v.string(),
    inputKey: v.string(),
    locale: v.string(),
    resultName: v.string(),
    resultEmoji: v.string(),
    resultAssetId: v.string(),
    resultNameI18n: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("combinations", {
      processor: args.processor,
      inputKey: args.inputKey,
      locale: args.locale,
      resultName: args.resultName,
      resultEmoji: args.resultEmoji,
      resultAssetId: args.resultAssetId,
      resultNameI18n: args.resultNameI18n,
      createdAt: Date.now(),
    });
  },
});
