"use node";

import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import type { RandomReader } from "@oslojs/crypto/random";
import { generateRandomString } from "@oslojs/crypto/random";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, "0123456789", 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    console.log(`[OTP] Code for ${email}: ${token}`);

    // Skip sending real emails in dev (set SKIP_OTP_EMAIL=true in Convex env)
    if (process.env.SKIP_OTP_EMAIL === "true" || !provider.apiKey) {
      console.log("[OTP] Skipping email send (dev mode)");
      return;
    }

    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Foodstack <onboarding@resend.dev>",
      to: [email],
      subject: "Your Foodstack sign-in code",
      text: `Your verification code is: ${token}`,
    });
    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
