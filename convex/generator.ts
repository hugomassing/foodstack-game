"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateText, Output } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { recipeSchema } from "./recipeSchema";
import { SYSTEM_PROMPT } from "./prompt";

export const generateOrGetRecipe = action({
  args: {
    dishName: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const normalizedName = args.dishName.toLowerCase().trim();

    // Cache check
    const cached: { recipe: unknown } | null = await ctx.runQuery(
      internal.recipes.getRecipe,
      {
        dishName: normalizedName,
        difficulty: args.difficulty,
      },
    );
    if (cached) {
      console.log(
        `[Convex] Cache hit: "${normalizedName}" (${args.difficulty})`,
      );
      return cached.recipe;
    }

    // Generate via Mistral
    console.log(`[Convex] Generating: "${args.dishName}" (${args.difficulty})`);
    const { output } = await generateText({
      model: mistral("mistral-large-latest"),
      output: Output.object({ schema: recipeSchema }),
      system: SYSTEM_PROMPT,
      prompt: `Generate a ${args.difficulty} recipe puzzle for: ${args.dishName}`,
    });

    if (!output) throw new Error("Model returned no valid output");

    // Persist
    await ctx.runMutation(internal.recipes.saveRecipe, {
      dishName: normalizedName,
      difficulty: args.difficulty,
      recipe: output,
    });

    return output;
  },
});
