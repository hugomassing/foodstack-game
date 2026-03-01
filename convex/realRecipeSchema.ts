import { z } from "zod";

export const realRecipeSchema = z.object({
  title: z.string().describe("Recipe title (a plausible real-world name for the dish)"),
  disclaimer: z.string().describe("Warning that this recipe is AI-generated for a game, untested, and may not be safe to eat"),
  servings: z.string().describe("Number of servings (e.g. '4 servings', '2-3 portions')"),
  prepTime: z.string().describe("Preparation time (e.g. '15 minutes')"),
  cookTime: z.string().describe("Cooking time (e.g. '30 minutes')"),
  description: z.string().describe("A short, enticing description of the dish (1-2 sentences)"),
  ingredients: z.array(
    z.object({
      item: z.string().describe("Ingredient name"),
      amount: z.string().describe("Measurement amount (e.g. '2 cups', '1 tbsp', '200g')"),
    })
  ).describe("List of ingredients with amounts (4-12 items)"),
  steps: z.array(
    z.object({
      instruction: z.string().describe("Clear cooking instruction"),
      duration: z.string().optional().describe("Optional time for this step (e.g. '5 minutes')"),
    })
  ).describe("Ordered cooking steps (4-8 steps)"),
  tips: z.string().optional().describe("Optional chef's tip or serving suggestion"),
});

export type RealRecipe = z.infer<typeof realRecipeSchema>;
