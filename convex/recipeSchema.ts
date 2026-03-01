import { z } from 'zod';

const i18nMap = z.record(z.string(), z.string()).optional();

const stepSchema = z.object({
  stepId: z.string().describe('Branch steps use "b{branch}_s{step}" format (e.g. "b1_s1"), final uses "final"'),
  processor: z.string().min(1).describe('A cooking action (dynamically chosen to fit the dish)'),
  processorEmoji: z.string().optional().describe('Fixed emoji for the processor'),
  questTitle: z.string().optional().describe('A short, evocative quest-style title (2-4 words) for this step. Should hint at the theme without revealing the processor or exact output. E.g. "Fiery Foundation", "The Golden Coat", "Ribbon Work". MUST be provided.'),
  questTitleI18n: i18nMap,
  hint: z.string().optional().describe('A short, playful clue (4-8 words) hinting at the cooking action without naming it. Should be a fun riddle or metaphor that makes the player think. MUST be provided.'),
  hintI18n: i18nMap,
  inputs: z.array(z.string()).describe('Ingredient names or previous stepIds'),
  output: z.string().describe('Short descriptive label of what this step produces'),
  outputI18n: i18nMap,
  outputAssetId: z.string().optional().describe('Asset ID from the ASSET_CATALOG that best represents this step output. Approximate: e.g. pork → ham, noodle soup → ramen, diced vegetables → salad'),
});

export const recipeSchema = z.object({
  dishName: z.string(),
  dishNameI18n: i18nMap,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  branches: z.array(z.object({
    name: z.string(),
    nameI18n: i18nMap,
    steps: z.array(stepSchema),
  })),
  finalStep: stepSchema,
  processors: z.array(z.object({
    name: z.string(),
    displayNameI18n: i18nMap,
    emoji: z.string(),
    assetId: z.string().optional().describe('Utensil asset ID from the catalog (e.g. knife, frying_pan, cooking_pot). MUST be unique per processor — no two processors may share the same assetId.'),
  })).refine(
    (processors) => {
      const ids = processors.map(p => p.assetId).filter(Boolean);
      return new Set(ids).size === ids.length;
    },
    { message: 'Every processor must have a unique assetId — no duplicate utensil icons allowed' },
  ),
  ingredients: z.array(z.object({
    name: z.string(),
    nameI18n: i18nMap,
    emoji: z.string(),
    assetId: z.string().describe('Asset ID from the ASSET_CATALOG that best represents this ingredient. Approximate if needed: e.g. pork → ham, bell pepper → pepper'),
  })),
  decoys: z.array(z.object({
    name: z.string(),
    nameI18n: i18nMap,
    emoji: z.string(),
    assetId: z.string().describe('Asset ID from the ASSET_CATALOG that best represents this decoy ingredient'),
  })),
});
