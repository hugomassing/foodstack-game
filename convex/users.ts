import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      displayName: user.displayName ?? user.name ?? "Anonymous Chef",
      isAnonymous: user.isAnonymous ?? false,
      email: user.email ?? null,
      needsUsername: !user.displayName && !user.isAnonymous,
      locale: user.locale ?? null,
    };
  },
});

export const setLocale = mutation({
  args: { locale: v.string() },
  handler: async (ctx, { locale }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { locale });
  },
});

export const setDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, { displayName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Also clear isAnonymous — if a user is picking a display name,
    // they've authenticated via email or password.
    await ctx.db.patch(userId, { displayName, isAnonymous: false });
  },
});
