"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateText, Output } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { recipeSchema } from "./recipeSchema";
import { SYSTEM_PROMPT } from "./prompt";
import { combinationSchema, COMBINATION_PROMPT } from "./combinationPrompt";
import { Mistral } from "@mistralai/mistralai";
import {
  VICTORY_CARD_SYSTEM_PROMPT,
  buildVictoryCardUserPrompt,
} from "./victoryCardPrompt";

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
      maxRetries: 2,
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

export const generateCombination = action({
  args: {
    processor: v.string(),
    ingredients: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ name: string; emoji: string; assetId: string }> => {
    const inputKey = args.ingredients
      .map((name) => name.toLowerCase().trim())
      .sort()
      .join("+");
    const processor = args.processor.toLowerCase().trim();

    // Cache check
    const cached: { resultName: string; resultEmoji: string; resultAssetId: string } | null = await ctx.runQuery(
      internal.combinations.getCombination,
      { processor, inputKey },
    );
    if (cached) {
      console.log(`[Convex] Combination cache hit: ${processor} + ${inputKey}`);
      return {
        name: cached.resultName,
        emoji: cached.resultEmoji,
        assetId: cached.resultAssetId,
      };
    }

    // Generate via Mistral Small
    console.log(`[Convex] Generating combination: ${processor} + ${inputKey}`);
    const { output } = await generateText({
      model: mistral("mistral-small-latest"),
      maxRetries: 2,
      output: Output.object({ schema: combinationSchema }),
      system: COMBINATION_PROMPT,
      prompt: `${processor} + ${args.ingredients.join(" + ")}`,
    });

    if (!output) throw new Error("Model returned no valid output");

    // Persist
    await ctx.runMutation(internal.combinations.saveCombination, {
      processor,
      inputKey,
      resultName: output.name,
      resultEmoji: output.emoji,
      resultAssetId: output.assetId,
    });

    return output;
  },
});

export const generateVictoryCard = action({
  args: {
    dishName: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    ingredients: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const normalizedName = args.dishName.toLowerCase().trim();

    // Cache check
    const cached = await ctx.runQuery(
      internal.victoryCards.getVictoryCard,
      { dishName: normalizedName, difficulty: args.difficulty },
    );
    if (cached) {
      console.log(`[Convex] Victory card cache hit: "${normalizedName}" (${args.difficulty})`);
      const url = await ctx.storage.getUrl(cached.storageId);
      return url;
    }

    // Generate via Mistral Agents API (image generation)
    console.log(`[Convex] Generating victory card: "${args.dishName}" (${args.difficulty})`);
    try {
      const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

      // Create agent with image_generation tool
      const agent = await client.beta.agents.create({
        model: "mistral-medium-2505",
        name: "foodstack-trophy-designer",
        tools: [{ type: "image_generation" }],
        instructions: VICTORY_CARD_SYSTEM_PROMPT,
      });

      // Start conversation with the user prompt
      const userPrompt = buildVictoryCardUserPrompt(
        args.dishName,
        args.difficulty,
        args.ingredients,
      );
      const response = await client.beta.conversations.start({
        agentId: agent.id,
        inputs: userPrompt,
      });

      // Extract fileId from ToolFileChunk in outputs
      let fileId: string | null = null;
      for (const output of response.outputs) {
        if (output.type === "message.output" && Array.isArray(output.content)) {
          for (const chunk of output.content) {
            if ("fileId" in chunk && chunk.type === "tool_file") {
              fileId = chunk.fileId;
              break;
            }
          }
        }
        if (fileId) break;
      }

      if (!fileId) {
        console.error("[Convex] No image file in victory card response");
        return null;
      }

      // Download the image
      const stream = await client.files.download({ fileId });
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Store in Convex storage
      const storageId = await ctx.storage.store(
        new Blob([buffer], { type: "image/png" }),
      );
      const url = await ctx.storage.getUrl(storageId);

      // Cache
      await ctx.runMutation(internal.victoryCards.saveVictoryCard, {
        dishName: normalizedName,
        difficulty: args.difficulty,
        storageId,
      });

      // Clean up the Mistral agent
      await client.beta.agents.delete({ agentId: agent.id }).catch(() => {});

      console.log(`[Convex] Victory card generated and stored for "${normalizedName}"`);
      return url;
    } catch (err) {
      console.error("[Convex] Victory card generation failed:", err);
      return null;
    }
  },
});
