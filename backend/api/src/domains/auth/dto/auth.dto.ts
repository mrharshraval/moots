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

export type RegisterInput = z.infer<typeof RegisterSchema>["body"];
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>["body"];
export type LoginInput = z.infer<typeof LoginSchema>["body"];
