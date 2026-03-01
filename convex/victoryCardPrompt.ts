export const VICTORY_CARD_SYSTEM_PROMPT = `You are a trophy designer for a cooking puzzle game called Foodstack.

When asked, generate a single image of a decorative food trophy using the FLUX image generation tool.

## STYLE RULES
- The trophy is a golden cup/chalice made ENTIRELY of the dish's real food ingredients
- Hyper-detailed food photography style, studio lighting, shallow depth of field
- The food ingredients should be sculpted into or overflowing from the trophy shape
- Warm, appetizing color palette — golden highlights, rich shadows
- Clean solid-color background (provided in the prompt)
- No text, no watermarks, no borders, no UI elements in the image
- Portrait orientation (3:4 aspect ratio)`;

const DIFFICULTY_CONFIG = {
  easy: {
    trophySize: "small",
    mood: "cheerful and cute",
    bgColor: "#a8d5ba",
  },
  medium: {
    trophySize: "medium",
    mood: "elegant and appetizing",
    bgColor: "#f5c869",
  },
  hard: {
    trophySize: "grand and ornate",
    mood: "dramatic and epic",
    bgColor: "#e07a5f",
  },
} as const;

export function buildVictoryCardUserPrompt(
  dishName: string,
  difficulty: "easy" | "medium" | "hard",
  ingredients: string[],
): string {
  const config = DIFFICULTY_CONFIG[difficulty];
  const ingredientList = ingredients.join(", ");

  return `Generate an image of a ${config.trophySize} golden food trophy for the dish "${dishName}".

The trophy is made of and overflowing with these ingredients: ${ingredientList}.

Mood: ${config.mood}.
Background: solid ${config.bgColor}.
Aspect ratio: 3:4 portrait.
Style: hyper-detailed food photography, studio lighting, shallow depth of field.`;
}
