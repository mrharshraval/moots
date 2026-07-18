"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AlertCircle } from "lucide-react";
import { apiRequest } from "@/infrastructure/http/api-client";
import { env } from "@/env";
import { AuthFormContainer } from "./auth-form-container";

export function ResetPasswordNewForm() {
  const router = useRouter();
  
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("reset_password_token") : null;
    if (token) {
      setResetToken(token);
    } else {
      router.push("/password/reset");
    }
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/password/reset/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password }),
        actionName: "ResetPassword Complete",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Failed to reset password. Please try again.";
        setPasswordError(errorMsg);
        return;
      }

      // Cleanup session state
      sessionStorage.removeItem("reset_password_email");
      sessionStorage.removeItem("reset_password_token");
      
      router.push("/login");
    } catch (err) {
      console.error(err);
      setPasswordError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title="Create new password"
      subtitle="Your new password must be unique from those previously used."
    >
      <form onSubmit={handleReset} className="w-full space-y-4">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <Label htmlFor="password" className="text-sm font-bold text-foreground">
            New Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            aria-invalid={!!passwordError}
            className={`w-full bg-transparent rounded-md h-12 px-3 text-base transition-all placeholder:text-muted-foreground ${
              passwordError
                ? "border-destructive text-destructive focus:border-destructive hover:border-destructive"
                : "border-border text-foreground hover:border-foreground focus:border-foreground"
            }`}
            disabled={loading}
          />
          {passwordError && (
            <div className="flex items-start gap-1.5 mt-1 text-destructive">
              <AlertCircle className="w-[18px] h-[18px] mt-[1.5px] shrink-0" />
              <p className="text-[14px] leading-tight font-medium">
                {passwordError}
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-full font-bold text-base mt-6 bg-primary text-primary-foreground "
          disabled={loading}
        >
          Reset Password
        </Button>
      </form>
    </AuthFormContainer>
  );
}
