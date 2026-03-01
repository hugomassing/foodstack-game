import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveResult = mutation({
  args: {
    dishName: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
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
      stepCount: args.stepCount,
      totalSteps: args.totalSteps,
      errorCount: args.errorCount,
      completedAt: Date.now(),
      victoryCardStorageId: victoryCard?.storageId,
    });
  },
});

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db.query("gameResults").collect();

    // Aggregate count per user
    const counts = new Map<string, number>();
    for (const r of results) {
      const uid = r.userId as string;
      counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }

    // Sort descending by count, take top 20
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    // Join with users table for display name
    const entries = await Promise.all(
      sorted.map(async ([userId, dishCount], index) => {
        const user = await ctx.db.get(userId as never);
        const displayName =
          (user as { displayName?: string; name?: string } | null)
            ?.displayName ??
          (user as { displayName?: string; name?: string } | null)?.name ??
          "Anonymous Chef";
        return { rank: index + 1, displayName, dishCount };
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
