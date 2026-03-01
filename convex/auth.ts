import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";
import { generateDishName } from "./nameGenerator";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous({
      profile() {
        return {
          displayName: generateDishName(),
          isAnonymous: true,
        };
      },
    }),
    Password({
      profile(params) {
        return {
          email: params.email as string,
          displayName: params.email as string,
          isAnonymous: false,
        };
      },
    }),
    ResendOTP,
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user) return;

      const updates: Record<string, string | boolean> = {};

      // Auto-generate a displayName only for anonymous users.
      // Non-anonymous users will be prompted to pick their own name.
      if (!user.displayName && user.isAnonymous) {
        updates.displayName = generateDishName();
      }

      // Clear anonymous flag when a real identity is attached
      // (Password sets email, Email OTP sets emailVerificationTime)
      if (user.isAnonymous && (user.email || user.emailVerificationTime)) {
        updates.isAnonymous = false;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(userId, updates);
      }
    },
  },
});
