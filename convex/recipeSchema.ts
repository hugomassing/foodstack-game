import { z } from 'zod';

export const ALLOWED_PROCESSORS = ['mix', 'chop', 'boil', 'fry', 'bake', 'grill', 'roast', 'knead', 'shape', 'mash', 'steam', 'toast', 'melt', 'assemble'];

const stepSchema = z.object({
  stepId: z.string().describe('Branch steps use "b{branch}_s{step}" format (e.g. "b1_s1"), final uses "final"'),
  processor: z.enum(['mix', 'chop', 'boil', 'fry', 'bake', 'grill', 'roast', 'knead', 'shape', 'mash', 'steam', 'toast', 'melt', 'assemble']).describe('A cooking action from the allowed list'),
  processorEmoji: z.string().describe('Fixed emoji for the processor'),
  questTitle: z.string().optional().describe('A short, evocative quest-style title (2-4 words) for this step. Should hint at the theme without revealing the processor or exact output. E.g. "Fiery Foundation", "The Golden Coat", "Ribbon Work". MUST be provided.'),
  hint: z.string().optional().describe('A short, playful clue (4-8 words) hinting at the cooking action without naming it. Should be a fun riddle or metaphor that makes the player think. MUST be provided.'),
  inputs: z.array(z.string()).describe('Ingredient names or previous stepIds'),
  output: z.string().describe('Short descriptive label of what this step produces'),
  outputAssetId: z.string().describe('Asset ID from the ASSET_CATALOG that best represents this step output. Approximate: e.g. pork → ham, noodle soup → ramen, diced vegetables → salad'),
});

export const recipeSchema = z.object({
  dishName: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  branches: z.array(z.object({
    name: z.string(),
    steps: z.array(stepSchema),
  })),
  finalStep: stepSchema,
  processors: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
  })),
  ingredients: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    assetId: z.string().describe('Asset ID from the ASSET_CATALOG that best represents this ingredient. Approximate if needed: e.g. pork → ham, bell pepper → pepper'),
  })),
  decoys: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    assetId: z.string().describe('Asset ID from the ASSET_CATALOG that best represents this decoy ingredient'),
  })),
});
