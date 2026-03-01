/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as combinationPrompt from "../combinationPrompt.js";
import type * as combinations from "../combinations.js";
import type * as gameResults from "../gameResults.js";
import type * as generator from "../generator.js";
import type * as http from "../http.js";
import type * as nameGenerator from "../nameGenerator.js";
import type * as prompt from "../prompt.js";
import type * as recipeSchema from "../recipeSchema.js";
import type * as recipes from "../recipes.js";
import type * as users from "../users.js";
import type * as victoryCardPrompt from "../victoryCardPrompt.js";
import type * as victoryCards from "../victoryCards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  combinationPrompt: typeof combinationPrompt;
  combinations: typeof combinations;
  gameResults: typeof gameResults;
  generator: typeof generator;
  http: typeof http;
  nameGenerator: typeof nameGenerator;
  prompt: typeof prompt;
  recipeSchema: typeof recipeSchema;
  recipes: typeof recipes;
  users: typeof users;
  victoryCardPrompt: typeof victoryCardPrompt;
  victoryCards: typeof victoryCards;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
