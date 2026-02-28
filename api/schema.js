import { z } from 'zod';

export const ALLOWED_PROCESSORS = ['mix', 'chop', 'boil', 'fry', 'bake', 'grill', 'roast', 'knead', 'shape', 'mash', 'steam', 'toast', 'melt', 'assemble'];

const stepSchema = z.object({
  stepId: z.string().describe('Branch steps use "b{branch}_s{step}" format (e.g. "b1_s1"), final uses "final"'),
  processor: z.enum(ALLOWED_PROCESSORS).describe('A cooking action from the allowed list'),
  processorEmoji: z.string().describe('Fixed emoji for the processor'),
  inputs: z.array(z.string()).describe('Ingredient names or previous stepIds'),
  output: z.string().describe('Short descriptive label of what this step produces'),
  outputAssetId: z.string().nullable().describe('Best matching sprite asset ID for the step output, or null'),
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
    assetId: z.string().nullable(),
  })),
  ingredients: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    assetId: z.string().nullable(),
  })),
  decoys: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    assetId: z.string().nullable(),
  })),
});
