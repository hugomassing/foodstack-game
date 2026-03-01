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
import { z } from "zod";

const TRANSLATION_LOCALES = ["de", "es", "fr", "it", "ja", "ko", "pt", "zh"];

const TRANSLATE_RECIPE_PROMPT = `You are a professional translator for a cooking puzzle game.

Given a JSON object mapping string keys to English text values, translate ALL values into these 8 locales: ${TRANSLATION_LOCALES.join(", ")}.

Return a JSON object where each key from the input maps to an object of { locale: translatedText }.

Rules:
- Translate naturally for each language — adapt culinary terms appropriately
- Keep translations concise (similar length to English)
- Do NOT translate the keys, only the values
- Every key in the input MUST appear in the output with all 8 locale translations`;

const TRANSLATE_TEXT_PROMPT = `You are a professional translator for a cooking game.

Given a short English text, translate it into these 8 locales: ${TRANSLATION_LOCALES.join(", ")}.

Return a JSON object mapping each locale code to the translated text. Keep translations concise and natural.`;

type RecipeOutput = z.infer<typeof recipeSchema>;

function extractTranslatableStrings(recipe: RecipeOutput): Record<string, string> {
  const strings: Record<string, string> = {};

  strings["dishName"] = recipe.dishName;

  for (let bi = 0; bi < recipe.branches.length; bi++) {
    const branch = recipe.branches[bi];
    strings[`branch_${bi}_name`] = branch.name;

    for (let si = 0; si < branch.steps.length; si++) {
      const step = branch.steps[si];
      if (step.questTitle) strings[`step_b${bi}_s${si}_questTitle`] = step.questTitle;
      if (step.hint) strings[`step_b${bi}_s${si}_hint`] = step.hint;
      strings[`step_b${bi}_s${si}_output`] = step.output;
    }
  }

  // Final step
  if (recipe.finalStep.questTitle) strings["step_final_questTitle"] = recipe.finalStep.questTitle;
  if (recipe.finalStep.hint) strings["step_final_hint"] = recipe.finalStep.hint;
  strings["step_final_output"] = recipe.finalStep.output;

  // Processors
  for (let i = 0; i < recipe.processors.length; i++) {
    strings[`processor_${i}_displayName`] = recipe.processors[i].name;
  }

  // Ingredients
  for (let i = 0; i < recipe.ingredients.length; i++) {
    strings[`ingredient_${i}_name`] = recipe.ingredients[i].name;
  }

  // Decoys
  for (let i = 0; i < recipe.decoys.length; i++) {
    strings[`decoy_${i}_name`] = recipe.decoys[i].name;
  }

  return strings;
}

function mergeTranslations(
  recipe: RecipeOutput,
  translations: Record<string, Record<string, string>>,
): RecipeOutput {
  const result = structuredClone(recipe);

  result.dishNameI18n = translations["dishName"];

  for (let bi = 0; bi < result.branches.length; bi++) {
    result.branches[bi].nameI18n = translations[`branch_${bi}_name`];

    for (let si = 0; si < result.branches[bi].steps.length; si++) {
      const key = `step_b${bi}_s${si}`;
      if (translations[`${key}_questTitle`]) result.branches[bi].steps[si].questTitleI18n = translations[`${key}_questTitle`];
      if (translations[`${key}_hint`]) result.branches[bi].steps[si].hintI18n = translations[`${key}_hint`];
      if (translations[`${key}_output`]) result.branches[bi].steps[si].outputI18n = translations[`${key}_output`];
    }
  }

  // Final step
  if (translations["step_final_questTitle"]) result.finalStep.questTitleI18n = translations["step_final_questTitle"];
  if (translations["step_final_hint"]) result.finalStep.hintI18n = translations["step_final_hint"];
  if (translations["step_final_output"]) result.finalStep.outputI18n = translations["step_final_output"];

  // Processors
  for (let i = 0; i < result.processors.length; i++) {
    result.processors[i].displayNameI18n = translations[`processor_${i}_displayName`];
  }

  // Ingredients
  for (let i = 0; i < result.ingredients.length; i++) {
    result.ingredients[i].nameI18n = translations[`ingredient_${i}_name`];
  }

  // Decoys
  for (let i = 0; i < result.decoys.length; i++) {
    result.decoys[i].nameI18n = translations[`decoy_${i}_name`];
  }

  return result;
}

async function translateRecipe(recipe: RecipeOutput): Promise<RecipeOutput> {
  const strings = extractTranslatableStrings(recipe);
  const translationSchema = z.record(z.string(), z.record(z.string(), z.string()));

  const { output } = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: translationSchema }),
    system: TRANSLATE_RECIPE_PROMPT,
    prompt: JSON.stringify(strings),
  });

  if (!output) {
    console.warn("[Convex] Translation failed, returning English-only recipe");
    return recipe;
  }

  return mergeTranslations(recipe, output as Record<string, Record<string, string>>);
}

async function translateText(text: string): Promise<Record<string, string>> {
  const translationSchema = z.record(z.string(), z.string());

  const { output } = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: translationSchema }),
    system: TRANSLATE_TEXT_PROMPT,
    prompt: text,
  });

  if (!output) {
    console.warn("[Convex] Single text translation failed, returning empty map");
    return {};
  }

  return output as Record<string, string>;
}

const PROCESSOR_LIMITS: Record<string, { min: number; max: number }> = {
  easy: { min: 4, max: 4 },
  medium: { min: 5, max: 6 },
  hard: { min: 6, max: 7 },
};

function validateProcessorCount(recipe: RecipeOutput, difficulty: string): string | null {
  const limits = PROCESSOR_LIMITS[difficulty];
  if (!limits) return null;
  const count = recipe.processors.length;
  if (count < limits.min || count > limits.max) {
    return `Expected ${limits.min}-${limits.max} processors for ${difficulty}, got ${count}`;
  }
  return null;
}

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

    // Phase 1: Generate English-only recipe via Mistral Large (with retry on processor count violation)
    const limits = PROCESSOR_LIMITS[args.difficulty];
    let output: RecipeOutput | undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      const retryHint = attempt > 0
        ? ` IMPORTANT: Your previous attempt had too many processors. You MUST use exactly ${limits.min}-${limits.max} DISTINCT processors (including assemble). Reuse processors across steps.`
        : "";

      console.log(`[Convex] Phase 1 — Generating English recipe: "${args.dishName}" (${args.difficulty})${attempt > 0 ? " [retry]" : ""}`);
      const result = await generateText({
        model: mistral("mistral-large-latest"),
        maxRetries: 2,
        output: Output.object({ schema: recipeSchema }),
        system: SYSTEM_PROMPT,
        prompt: `Generate a ${args.difficulty} recipe puzzle for: ${args.dishName}${retryHint}`,
      });

      if (!result.output) throw new Error("Model returned no valid output");

      const violation = validateProcessorCount(result.output, args.difficulty);
      if (!violation) {
        output = result.output;
        break;
      }

      console.warn(`[Convex] Processor count violation (attempt ${attempt + 1}): ${violation}`);
      if (attempt === 0) continue;

      // On final attempt, accept what we got but log the warning
      console.warn(`[Convex] Accepting recipe despite processor count mismatch after ${attempt + 1} attempts`);
      output = result.output;
    }

    if (!output) throw new Error("Model returned no valid output");

    // Phase 2: Translate all user-facing strings to 8 locales via Mistral Small
    console.log(`[Convex] Phase 2 — Translating recipe to ${TRANSLATION_LOCALES.length} locales`);
    const translated = await translateRecipe(output);

    // Persist the fully translated recipe
    await ctx.runMutation(internal.recipes.saveRecipe, {
      dishName: normalizedName,
      difficulty: args.difficulty,
      recipe: translated,
    });

    return translated;
  },
});

export const generateCombination = action({
  args: {
    processor: v.string(),
    ingredients: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ name: string; nameI18n: Record<string, string>; emoji: string; assetId: string }> => {
    const inputKey = args.ingredients
      .map((name) => name.toLowerCase().trim())
      .sort()
      .join("+");
    const processor = args.processor.toLowerCase().trim();

    // Cache check
    const cached: { resultName: string; resultEmoji: string; resultAssetId: string; resultNameI18n?: Record<string, string> } | null = await ctx.runQuery(
      internal.combinations.getCombination,
      { processor, inputKey },
    );
    if (cached) {
      console.log(`[Convex] Combination cache hit: ${processor} + ${inputKey}`);
      return {
        name: cached.resultName,
        nameI18n: cached.resultNameI18n ?? {},
        emoji: cached.resultEmoji,
        assetId: cached.resultAssetId,
      };
    }

    // Generate English-only combination via Mistral Small
    console.log(`[Convex] Generating combination: ${processor} + ${inputKey}`);
    const { output } = await generateText({
      model: mistral("mistral-small-latest"),
      maxRetries: 2,
      output: Output.object({ schema: combinationSchema }),
      system: COMBINATION_PROMPT,
      prompt: `${processor} + ${args.ingredients.join(" + ")}`,
    });

    if (!output) throw new Error("Model returned no valid output");

    // Translate the combination name
    const nameI18n = await translateText(output.name);

    // Persist
    await ctx.runMutation(internal.combinations.saveCombination, {
      processor,
      inputKey,
      resultName: output.name,
      resultEmoji: output.emoji,
      resultAssetId: output.assetId,
      resultNameI18n: nameI18n,
    });

    return { name: output.name, nameI18n, emoji: output.emoji, assetId: output.assetId };
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
