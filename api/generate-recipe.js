import { generateText, Output } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { recipeSchema } from './schema.js';
import { SYSTEM_PROMPT } from './prompt.js';

export async function generateRecipe(dishName, difficulty = 'medium') {
  if (!dishName) {
    throw Object.assign(new Error('Missing dishName parameter'), { status: 400 });
  }

  if (!process.env.MISTRAL_API_KEY) {
    throw Object.assign(new Error('MISTRAL_API_KEY is not configured on the server'), { status: 500 });
  }

  console.log(`[API] Generating recipe: "${dishName}" (${difficulty})`);
  console.log(`[API] Calling Mistral (mistral-large-latest)...`);

  const start = Date.now();
  const { output, usage } = await generateText({
    model: mistral('mistral-large-latest'),
    output: Output.object({ schema: recipeSchema }),
    system: SYSTEM_PROMPT,
    prompt: `Generate a ${difficulty} recipe puzzle for: ${dishName}`,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`[API] Response received in ${elapsed}s`);
  if (usage) {
    console.log(`[API] Tokens — input: ${usage.inputTokens}, output: ${usage.outputTokens}`);
  }

  if (!output) {
    throw new Error('Model returned no valid output');
  }

  console.log(`[API] Recipe parsed — ${output.branches?.length} branches, ${output.ingredients?.length} ingredients`);
  return output;
}

// Vercel serverless handler
export default async function handler(req, res) {
  console.log(`[API] ${req.method} /api/generate-recipe`);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dishName, difficulty } = req.body || {};
    console.log(`[API] Body:`, JSON.stringify({ dishName, difficulty }));
    const recipe = await generateRecipe(dishName, difficulty);
    console.log(`[API] Success — returning recipe`);
    return res.status(200).json(recipe);
  } catch (err) {
    const status = err.status || 500;
    const message = status < 500 ? err.message : 'Failed to generate recipe. Please try again.';
    console.error(`[API] Error (${status}):`, err.message);
    return res.status(status).json({ error: message });
  }
}
