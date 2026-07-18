import { z } from "zod";

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});

export const VerifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().min(1, "OTP is required"),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, "Identifier is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const ResendOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const PasswordResetRequestSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const PasswordResetVerifySchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().min(1, "OTP is required"),
  }),
});

export const PasswordResetCompleteSchema = z.object({
  body: z.object({
    resetToken: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});
