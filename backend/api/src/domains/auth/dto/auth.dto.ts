import { z } from "zod";
import { 
  RegisterSchema, 
  VerifyOtpSchema, 
  LoginSchema, 
  ResendOtpSchema,
  PasswordResetRequestSchema,
  PasswordResetVerifySchema,
  PasswordResetCompleteSchema
} from "@moots/contracts";

export type RegisterInput = z.infer<typeof RegisterSchema>["body"];
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>["body"];
export type LoginInput = z.infer<typeof LoginSchema>["body"];
export type ResendOtpInput = z.infer<typeof ResendOtpSchema>["body"];
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>["body"];
export type PasswordResetVerifyInput = z.infer<typeof PasswordResetVerifySchema>["body"];
export type PasswordResetCompleteInput = z.infer<typeof PasswordResetCompleteSchema>["body"];
