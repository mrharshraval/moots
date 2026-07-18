import { Metadata } from "next";
import { ResetPasswordNewForm } from "@/features/auth/components/reset-password-new-form";

export const metadata: Metadata = {
  title: "Create New Password - Moots",
  description: "Create your new Moots password",
};

export default function PasswordResetNewPage() {
  return <ResetPasswordNewForm />;
}
