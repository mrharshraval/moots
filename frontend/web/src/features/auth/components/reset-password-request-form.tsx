"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AlertCircle } from "lucide-react";
import { apiRequest } from "@/infrastructure/http/api-client";
import { env } from "@/env";
import { AuthFormContainer } from "./auth-form-container";

export function ResetPasswordRequestForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setEmailError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        actionName: "ResetPassword Request",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Failed to request password reset";
        setEmailError(errorMsg);
        return;
      }

      // Store email in session to avoid passing in URL
      sessionStorage.setItem("reset_password_email", email);
      router.push("/password/reset/verify");
    } catch (err) {
      console.error(err);
      setEmailError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title="Reset Password"
      subtitle="Enter your email to receive a password reset code."
      footerText="Remembered your password?"
      footerLinkText="Login"
      footerLinkHref="/login"
    >
      <form onSubmit={handleRequest} className="w-full space-y-4">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <Label htmlFor="email" className="text-sm font-bold text-foreground">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@domain.com"
            value={email}
            onChange={handleEmailChange}
            aria-invalid={!!emailError}
            className={`w-full bg-transparent rounded-md h-12 px-3 text-base transition-all placeholder:text-muted-foreground ${
              emailError
                ? "border-destructive text-destructive focus:border-destructive hover:border-destructive"
                : "border-border text-foreground hover:border-foreground focus:border-foreground"
            }`}
            disabled={loading}
          />
          {emailError && (
            <div className="flex items-start gap-1.5 mt-1 text-destructive">
              <AlertCircle className="w-[18px] h-[18px] mt-[1.5px] shrink-0" />
              <p className="text-[14px] leading-tight font-medium">
                {emailError}
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-full font-bold text-base mt-6 bg-primary text-primary-foreground "
          disabled={loading}
        >
          Send Code
        </Button>
      </form>
    </AuthFormContainer>
  );
}
