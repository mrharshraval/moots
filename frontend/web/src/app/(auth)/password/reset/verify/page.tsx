import { Metadata } from "next";
import { ResetPasswordVerifyForm } from "@/features/auth/components/reset-password-verify-form";

export const metadata: Metadata = {
  title: "Verify Reset Code - Moots",
  description: "Verify your password reset code",
};

export default function PasswordResetVerifyPage() {
  return <ResetPasswordVerifyForm />;
}
