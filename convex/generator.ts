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
import { realRecipeSchema } from "./realRecipeSchema";
import { REAL_RECIPE_SYSTEM_PROMPT } from "./realRecipePrompt";

const LOCALE_NAMES: Record<string, string> = {
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  zh: "Chinese",
};

function buildRewriteRecipePrompt(locale: string): string {
  const localeName = LOCALE_NAMES[locale] ?? locale;
  return `You are a professional translator for a cooking puzzle game.

Given a JSON object mapping string keys to English text values, translate ALL values into ${localeName} (locale code: ${locale}).

Return a JSON object where each key from the input maps to an object with a single key "${locale}" containing the translated text.
For example, if the input is {"dishName": "Pasta"}, return {"dishName": {"${locale}": "translated text"}}.

Rules:
- Translate naturally for ${localeName} — adapt culinary terms appropriately
- Keep translations concise (similar length to English)
- Do NOT translate the keys, only the values
- Every key in the input MUST appear in the output`;
}

function buildRewriteTextPrompt(locale: string): string {
  const localeName = LOCALE_NAMES[locale] ?? locale;
  return `You are a professional translator for a cooking game.

Given a short English text, translate it into ${localeName} (locale code: ${locale}).

Return a JSON object with a single key "${locale}" containing the translated text. Keep the translation concise and natural.`;
}

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

async function rewriteRecipe(recipe: RecipeOutput, locale: string): Promise<RecipeOutput> {
  const strings = extractTranslatableStrings(recipe);
  const translationSchema = z.record(z.string(), z.record(z.string(), z.string()));

  const { output } = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: translationSchema }),
    system: buildRewriteRecipePrompt(locale),
    prompt: JSON.stringify(strings),
  });

  if (!output) {
    console.warn(`[Convex] Rewrite to ${locale} failed, returning English-only recipe`);
    return recipe;
  }

  return mergeTranslations(recipe, output as Record<string, Record<string, string>>);
}

async function rewriteText(text: string, locale: string): Promise<Record<string, string>> {
  const translationSchema = z.record(z.string(), z.string());

  const { output } = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: translationSchema }),
    system: buildRewriteTextPrompt(locale),
    prompt: text,
  });

  if (!output) {
    console.warn(`[Convex] Text rewrite to ${locale} failed, returning empty map`);
    return {};
  }

  return output as Record<string, string>;
}

const DIFFICULTY_CONSTRAINTS: Record<string, string> = {
  easy: "Exactly 4 distinct processors (3 + assemble). 4-6 ingredients, 1-2 decoys, 2 branches.",
  medium: "Exactly 5 or 6 distinct processors (4-5 + assemble). 6-9 ingredients, 2-3 decoys, 2-3 branches.",
  hard: "Exactly 6 or 7 distinct processors (5-6 + assemble). 9-12 ingredients, 3-4 decoys, 3 branches.",
};

async function generateEnglishRecipe(
  ctx: { runQuery: (...args: any[]) => Promise<any>; runMutation: (...args: any[]) => Promise<any> },
  dishName: string,
  normalizedName: string,
  difficulty: "easy" | "medium" | "hard",
): Promise<RecipeOutput> {
  // Check English cache first
  const cached: { recipe: RecipeOutput } | null = await ctx.runQuery(
    internal.recipes.getRecipe,
    { dishName: normalizedName, difficulty, locale: "en" },
  );
  if (cached) {
    console.log(`[Convex] English cache hit: "${normalizedName}" (${difficulty})`);
    return cached.recipe;
  }

  const constraints = DIFFICULTY_CONSTRAINTS[difficulty];
  console.log(`[Convex] Generating English recipe: "${dishName}" (${difficulty})`);

  const result = await generateText({
    model: mistral("mistral-large-latest"),
    maxRetries: 2,
    output: Output.object({ schema: recipeSchema }),
    system: SYSTEM_PROMPT,
    prompt: `Generate a ${difficulty} recipe puzzle for: ${dishName}\n\nDifficulty constraints: ${constraints}\nPlan your processor palette FIRST, then build steps using only those processors.`,
  });

  if (!result.output) throw new Error("Model returned no valid output");

  // Persist English recipe
  await ctx.runMutation(internal.recipes.saveRecipe, {
    dishName: normalizedName,
    difficulty,
    locale: "en",
    recipe: result.output,
  });

  return result.output;
}

export const generateOrGetRecipe = action({
  args: {
    dishName: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    locale: v.string(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const normalizedName = args.dishName.toLowerCase().trim();
    const locale = args.locale || "en";

    // Cache check for requested locale
    const cached: { recipe: unknown } | null = await ctx.runQuery(
      internal.recipes.getRecipe,
      { dishName: normalizedName, difficulty: args.difficulty, locale },
    );
    if (cached) {
      console.log(`[Convex] Cache hit: "${normalizedName}" (${args.difficulty}, ${locale})`);
      return cached.recipe;
    }

    if (locale === "en") {
      // Generate and cache English recipe
      return await generateEnglishRecipe(ctx, args.dishName, normalizedName, args.difficulty);
    }

    // Non-English: get English base, then rewrite to target locale
    const englishRecipe = await generateEnglishRecipe(ctx, args.dishName, normalizedName, args.difficulty);

    console.log(`[Convex] Rewriting recipe to ${locale}`);
    const rewritten = await rewriteRecipe(englishRecipe, locale);

    // Persist the locale-specific recipe
    await ctx.runMutation(internal.recipes.saveRecipe, {
      dishName: normalizedName,
      difficulty: args.difficulty,
      locale,
      recipe: rewritten,
    });

    return rewritten;
  },
});

async function generateEnglishCombination(
  ctx: { runQuery: (...args: any[]) => Promise<any>; runMutation: (...args: any[]) => Promise<any> },
  processor: string,
  inputKey: string,
  ingredientNames: string[],
): Promise<{ name: string; emoji: string; assetId: string }> {
  // Check English cache
  const cached: { resultName: string; resultEmoji: string; resultAssetId: string } | null = await ctx.runQuery(
    internal.combinations.getCombination,
    { processor, inputKey, locale: "en" },
  );
  if (cached) {
    console.log(`[Convex] English combination cache hit: ${processor} + ${inputKey}`);
    return { name: cached.resultName, emoji: cached.resultEmoji, assetId: cached.resultAssetId };
  }

  // Generate English-only combination via Mistral Small
  console.log(`[Convex] Generating combination: ${processor} + ${inputKey}`);
  const { output } = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: combinationSchema }),
    system: COMBINATION_PROMPT,
    prompt: `${processor} + ${ingredientNames.join(" + ")}`,
  });

  if (!output) throw new Error("Model returned no valid output");

  // Persist English combination
  await ctx.runMutation(internal.combinations.saveCombination, {
    processor,
    inputKey,
    locale: "en",
    resultName: output.name,
    resultEmoji: output.emoji,
    resultAssetId: output.assetId,
  });

  return { name: output.name, emoji: output.emoji, assetId: output.assetId };
}

export const generateCombination = action({
  args: {
    processor: v.string(),
    ingredients: v.array(v.string()),
    locale: v.string(),
  },
  handler: async (ctx, args): Promise<{ name: string; nameI18n: Record<string, string>; emoji: string; assetId: string }> => {
    const inputKey = args.ingredients
      .map((name) => name.toLowerCase().trim())
      .sort()
      .join("+");
    const processor = args.processor.toLowerCase().trim();
    const locale = args.locale || "en";

    // Cache check for requested locale
    const cached: { resultName: string; resultEmoji: string; resultAssetId: string; resultNameI18n?: Record<string, string> } | null = await ctx.runQuery(
      internal.combinations.getCombination,
      { processor, inputKey, locale },
    );
    if (cached) {
      console.log(`[Convex] Combination cache hit: ${processor} + ${inputKey} (${locale})`);
      return {
        name: cached.resultName,
        nameI18n: cached.resultNameI18n ?? {},
        emoji: cached.resultEmoji,
        assetId: cached.resultAssetId,
      };
    }

    if (locale === "en") {
      const result = await generateEnglishCombination(ctx, processor, inputKey, args.ingredients);
      return { ...result, nameI18n: {} };
    }

    // Non-English: get English base, then rewrite name
    const english = await generateEnglishCombination(ctx, processor, inputKey, args.ingredients);

    console.log(`[Convex] Rewriting combination name to ${locale}`);
    const nameI18n = await rewriteText(english.name, locale);

    // Persist locale-specific combination
    await ctx.runMutation(internal.combinations.saveCombination, {
      processor,
      inputKey,
      locale,
      resultName: english.name,
      resultEmoji: english.emoji,
      resultAssetId: english.assetId,
      resultNameI18n: nameI18n,
    });

    return { name: english.name, nameI18n, emoji: english.emoji, assetId: english.assetId };
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

type RealRecipeOutput = z.infer<typeof realRecipeSchema>;

function extractRealRecipeStrings(recipe: RealRecipeOutput): Record<string, string> {
  const strings: Record<string, string> = {};
  strings["title"] = recipe.title;
  strings["disclaimer"] = recipe.disclaimer;
  strings["servings"] = recipe.servings;
  strings["prepTime"] = recipe.prepTime;
  strings["cookTime"] = recipe.cookTime;
  strings["description"] = recipe.description;
  for (let i = 0; i < recipe.ingredients.length; i++) {
    strings[`ingredient_${i}_item`] = recipe.ingredients[i].item;
    strings[`ingredient_${i}_amount`] = recipe.ingredients[i].amount;
  }
  for (let i = 0; i < recipe.steps.length; i++) {
    strings[`step_${i}_instruction`] = recipe.steps[i].instruction;
    if (recipe.steps[i].duration) strings[`step_${i}_duration`] = recipe.steps[i].duration!;
  }
  if (recipe.tips) strings["tips"] = recipe.tips;
  return strings;
}

function mergeRealRecipeTranslations(
  recipe: RealRecipeOutput,
  translations: Record<string, Record<string, string>>,
  locale: string,
): RealRecipeOutput {
  const get = (key: string, fallback: string) => translations[key]?.[locale] ?? fallback;
  return {
    title: get("title", recipe.title),
    disclaimer: get("disclaimer", recipe.disclaimer),
    servings: get("servings", recipe.servings),
    prepTime: get("prepTime", recipe.prepTime),
    cookTime: get("cookTime", recipe.cookTime),
    description: get("description", recipe.description),
    ingredients: recipe.ingredients.map((ing, i) => ({
      item: get(`ingredient_${i}_item`, ing.item),
      amount: get(`ingredient_${i}_amount`, ing.amount),
    })),
    steps: recipe.steps.map((step, i) => ({
      instruction: get(`step_${i}_instruction`, step.instruction),
      duration: step.duration ? get(`step_${i}_duration`, step.duration) : step.duration,
    })),
    tips: recipe.tips ? get("tips", recipe.tips) : recipe.tips,
  };
}

async function rewriteRealRecipe(recipe: RealRecipeOutput, locale: string): Promise<RealRecipeOutput> {
  const strings = extractRealRecipeStrings(recipe);
  const translationSchema = z.record(z.string(), z.record(z.string(), z.string()));

  const { output } = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: translationSchema }),
    system: buildRewriteRecipePrompt(locale),
    prompt: JSON.stringify(strings),
  });

  if (!output) {
    console.warn(`[Convex] Real recipe rewrite to ${locale} failed, returning English-only`);
    return recipe;
  }

  return mergeRealRecipeTranslations(recipe, output as Record<string, Record<string, string>>, locale);
}

export const generateRealRecipe = action({
  args: {
    dishName: v.string(),
    locale: v.string(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const normalizedName = args.dishName.toLowerCase().trim();
    const locale = args.locale || "en";

    // Cache check for requested locale
    const cached: { recipe: unknown } | null = await ctx.runQuery(
      internal.realRecipes.getRealRecipe,
      { dishName: normalizedName, locale },
    );
    if (cached) {
      console.log(`[Convex] Real recipe cache hit: "${normalizedName}" (${locale})`);
      return cached.recipe;
    }

    // Check English cache or generate
    let englishRecipe: RealRecipeOutput;
    if (locale !== "en") {
      const cachedEn: { recipe: RealRecipeOutput } | null = await ctx.runQuery(
        internal.realRecipes.getRealRecipe,
        { dishName: normalizedName, locale: "en" },
      );
      if (cachedEn) {
        englishRecipe = cachedEn.recipe;
      } else {
        englishRecipe = await generateEnglishRealRecipe(ctx, args.dishName, normalizedName);
      }

      // Translate to target locale
      console.log(`[Convex] Rewriting real recipe to ${locale}`);
      const translated = await rewriteRealRecipe(englishRecipe, locale);

      await ctx.runMutation(internal.realRecipes.saveRealRecipe, {
        dishName: normalizedName,
        locale,
        recipe: translated,
      });

      return translated;
    }

    // English generation
    englishRecipe = await generateEnglishRealRecipe(ctx, args.dishName, normalizedName);
    return englishRecipe;
  },
});

async function generateEnglishRealRecipe(
  ctx: { runQuery: (...args: any[]) => Promise<any>; runMutation: (...args: any[]) => Promise<any> },
  dishName: string,
  normalizedName: string,
): Promise<RealRecipeOutput> {
  const cached: { recipe: RealRecipeOutput } | null = await ctx.runQuery(
    internal.realRecipes.getRealRecipe,
    { dishName: normalizedName, locale: "en" },
  );
  if (cached) {
    console.log(`[Convex] English real recipe cache hit: "${normalizedName}"`);
    return cached.recipe;
  }

  console.log(`[Convex] Generating English real recipe: "${dishName}"`);
  const result = await generateText({
    model: mistral("mistral-small-latest"),
    maxRetries: 2,
    output: Output.object({ schema: realRecipeSchema }),
    system: REAL_RECIPE_SYSTEM_PROMPT,
    prompt: `Generate a real cooking recipe for the game dish: "${dishName}"`,
  });

  if (!result.output) throw new Error("Model returned no valid output");

  await ctx.runMutation(internal.realRecipes.saveRealRecipe, {
    dishName: normalizedName,
    locale: "en",
    recipe: result.output,
  });

  return result.output;
}
