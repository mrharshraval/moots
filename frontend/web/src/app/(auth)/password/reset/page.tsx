import { Metadata } from "next";
import { ResetPasswordRequestForm } from "@/features/auth/components/reset-password-request-form";

export const metadata: Metadata = {
  title: "Reset Password - Moots",
  description: "Reset your Moots password",
};

export default function PasswordResetPage() {
  return <ResetPasswordRequestForm />;
}
