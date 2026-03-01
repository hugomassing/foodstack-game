import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveResult = mutation({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    gameMode: v.optional(v.union(v.literal("daily"), v.literal("survival"), v.literal("normal"), v.literal("seeded"))),
    stepCount: v.number(),
    totalSteps: v.number(),
    errorCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Look up cached victory card for this dish+difficulty
    const normalizedName = args.dishName.toLowerCase().trim();
    const victoryCard = await ctx.db
      .query("victoryCards")
      .withIndex("by_dish_and_difficulty", (q) =>
        q.eq("dishName", normalizedName).eq("difficulty", args.difficulty)
      )
      .first();

    await ctx.db.insert("gameResults", {
      userId,
      dishName: args.dishName,
      difficulty: args.difficulty,
      gameMode: args.gameMode,
      stepCount: args.stepCount,
      totalSteps: args.totalSteps,
      errorCount: args.errorCount,
      completedAt: Date.now(),
      victoryCardStorageId: victoryCard?.storageId,
    });
  },
});

export const saveSurvivalSession = mutation({
  args: {
    roundsCompleted: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("survivalSessions", {
      userId,
      roundsCompleted: args.roundsCompleted,
      completedAt: Date.now(),
    });
  },
});

export const trophyLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db.query("gameResults").collect();

    // Count unique dish names per user
    const userDishes = new Map<string, Set<string>>();
    for (const r of results) {
      const uid = r.userId as string;
      const key = r.dishName.toLowerCase().trim();
      if (!userDishes.has(uid)) userDishes.set(uid, new Set());
      userDishes.get(uid)!.add(key);
    }

    // Sort descending by unique count, take top 20
    const sorted = [...userDishes.entries()]
      .map(([uid, dishes]) => [uid, dishes.size] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const entries = await Promise.all(
      sorted.map(async ([userId, trophyCount], index) => {
        const user = await ctx.db.get(userId as never);
        const displayName =
          (user as { displayName?: string; name?: string } | null)
            ?.displayName ??
          (user as { displayName?: string; name?: string } | null)?.name ??
          "Anonymous Chef";
        return { rank: index + 1, displayName, trophyCount };
      }),
    );

    return entries;
  },
});

export const survivalLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("survivalSessions").collect();

    // Get max roundsCompleted per user
    const bestRounds = new Map<string, number>();
    for (const s of sessions) {
      const uid = s.userId as string;
      const current = bestRounds.get(uid) ?? 0;
      if (s.roundsCompleted > current) {
        bestRounds.set(uid, s.roundsCompleted);
      }
    }

    // Sort descending by best rounds, take top 20
    const sorted = [...bestRounds.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const entries = await Promise.all(
      sorted.map(async ([userId, rounds], index) => {
        const user = await ctx.db.get(userId as never);
        const displayName =
          (user as { displayName?: string; name?: string } | null)
            ?.displayName ??
          (user as { displayName?: string; name?: string } | null)?.name ??
          "Anonymous Chef";
        return { rank: index + 1, displayName, rounds };
      }),
    );

    return entries;
  },
});

export const history = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const results = await ctx.db
      .query("gameResults")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return Promise.all(
      results.map(async (r) => ({
        _id: r._id,
        dishName: r.dishName,
        difficulty: r.difficulty,
        stepCount: r.stepCount,
        totalSteps: r.totalSteps,
        errorCount: r.errorCount,
        completedAt: r.completedAt,
        victoryCardUrl: r.victoryCardStorageId
          ? await ctx.storage.getUrl(r.victoryCardStorageId)
          : null,
      })),
    );
  },
});

export const trophyDex = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const results = await ctx.db.query("gameResults").collect();

    // Group by normalized dish name
    const dishMap = new Map<
      string,
      {
        dishName: string;
        totalCompletions: number;
        userModes: Set<string>;
        userDifficulties: Set<string>;
        acquired: boolean;
        bestResult?: {
          stepCount: number;
          totalSteps: number;
          errorCount: number;
          difficulty: 'easy' | 'medium' | 'hard';
          gameMode?: 'daily' | 'survival' | 'normal' | 'seeded';
        };
      }
    >();

    for (const r of results) {
      const key = r.dishName.toLowerCase().trim();
      let entry = dishMap.get(key);
      if (!entry) {
        entry = {
          dishName: r.dishName,
          totalCompletions: 0,
          userModes: new Set(),
          userDifficulties: new Set(),
          acquired: false,
        };
        dishMap.set(key, entry);
      }
      entry.totalCompletions++;
      if (userId && r.userId === userId) {
        entry.acquired = true;
        if (r.gameMode) entry.userModes.add(r.gameMode);
        entry.userDifficulties.add(r.difficulty);
        // Track best run: fewest errors, tie-break by most steps completed
        if (
          !entry.bestResult ||
          r.errorCount < entry.bestResult.errorCount ||
          (r.errorCount === entry.bestResult.errorCount &&
            r.stepCount > entry.bestResult.stepCount)
        ) {
          entry.bestResult = {
            stepCount: r.stepCount,
            totalSteps: r.totalSteps,
            errorCount: r.errorCount,
            difficulty: r.difficulty,
            gameMode: r.gameMode,
          };
        }
      }
    }

    // Build output — resolve victory card URLs directly from victoryCards table.
    // We cannot use gameResults.victoryCardStorageId because saveResult fires before
    // the async image generation completes, so that field is always null.
    const DIFF_ORDER = ["easy", "medium", "hard"] as const;
    const entries = await Promise.all(
      [...dishMap.entries()].map(async ([normalizedName, e]) => {
        // Try each difficulty (user's first, then all) until we find a stored card
        const diffOrder = [
          ...e.userDifficulties,
          ...DIFF_ORDER.filter((d) => !e.userDifficulties.has(d)),
        ] as Array<"easy" | "medium" | "hard">;

        let victoryCardUrl: string | null = null;
        for (const diff of diffOrder) {
          const card = await ctx.db
            .query("victoryCards")
            .withIndex("by_dish_and_difficulty", (q) =>
              q.eq("dishName", normalizedName).eq("difficulty", diff)
            )
            .first();
          if (card) {
            victoryCardUrl = await ctx.storage.getUrl(card.storageId);
            break;
          }
        }

        return {
          dishName: e.dishName,
          totalCompletions: e.totalCompletions,
          acquired: e.acquired,
          modes: [...e.userModes],
          difficulties: [...e.userDifficulties],
          bestResult: e.bestResult ?? null,
          victoryCardUrl,
        };
      }),
    );

    // Sort: acquired first (alphabetical), then unacquired (alphabetical)
    return entries.sort((a, b) => {
      if (a.acquired !== b.acquired) return a.acquired ? -1 : 1;
      return a.dishName.localeCompare(b.dishName);
    });
  },
});
