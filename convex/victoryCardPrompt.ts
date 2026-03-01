export const VICTORY_CARD_SYSTEM_PROMPT = `You are a trophy designer for a cooking puzzle game called Foodstack.

When asked, generate a single image of a cartoon food trophy using the FLUX image generation tool.

## STYLE RULES
- Bright, bold cartoon illustration style — thick outlines, flat cel shading, exaggerated proportions
- The trophy shape is a classic golden cup/chalice, but built entirely from the dish's key ingredients
- Ingredients are playful and expressive: oversized, stackable, with big highlight dots and chunky shadows
- Each ingredient has a happy face or is bursting with energy (steam puffs, sparkles, little stars)
- Warm saturated color palette — punchy yellows, deep oranges, vibrant greens — no muddy tones
- Clean solid-color background (provided in the prompt)
- No text, no watermarks, no borders, no UI elements in the image
- Portrait orientation (3:4 aspect ratio)`;

const DIFFICULTY_CONFIG = {
  easy: {
    trophySize: "small and round",
    mood: "super cute and bubbly",
    extras: "tiny sparkles and little hearts floating around",
    bgColor: "#a8d5ba",
  },
  medium: {
    trophySize: "medium with a wide base",
    mood: "cheerful and proud",
    extras: "confetti and a glowing shine streak across the cup",
    bgColor: "#f5c869",
  },
  hard: {
    trophySize: "tall and dramatic with flame accents",
    mood: "epic and triumphant",
    extras: "dramatic sparkles, fire bursts, and a golden glow radiating outward",
    bgColor: "#e07a5f",
  },
} as const;

export function buildVictoryCardUserPrompt(
  dishName: string,
  difficulty: "easy" | "medium" | "hard",
  ingredients: string[],
): string {
  const config = DIFFICULTY_CONFIG[difficulty];
  // Highlight the first 3 as the "hero" ingredients for visual clarity
  const heroIngredients = ingredients.slice(0, 3).join(", ");
  const remainingIngredients = ingredients.slice(3).join(", ");
  const ingredientDescription = remainingIngredients
    ? `Hero ingredients (make these prominent and recognizable): ${heroIngredients}. Also include: ${remainingIngredients}.`
    : `Ingredients (make these prominent and recognizable): ${heroIngredients}.`;

  return `Generate a cartoon trophy image for the dish "${dishName}".

Trophy shape: ${config.trophySize} golden cartoon chalice.
${ingredientDescription}
The cup is constructed from stacked cartoon versions of these ingredients — each ingredient is chunky, rounded, and expressive with thick outlines.
Mood: ${config.mood}.
Decorative extras: ${config.extras}.
Background: solid ${config.bgColor}.
Aspect ratio: 3:4 portrait.
Style: bold cartoon illustration, thick black outlines, cel shading, bright flat colors, no photo-realism.`;
}
