"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/providers/auth-provider";
import { apiRequest } from "@/infrastructure/http/api-client";
import { env } from "@/env";
import { OTPVerifyForm } from "./otp-verify-form";

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    // Read from sessionStorage (FAANG standard to avoid PII in URLs)
    const storedEmail = typeof window !== "undefined" ? sessionStorage.getItem("verify_email") : null;
    const finalEmail = emailParam || storedEmail;

    if (finalEmail) {
      setEmail(finalEmail);
      // Clean up URL if they happened to arrive with the query param
      if (emailParam && typeof window !== "undefined") {
        window.history.replaceState({}, '', '/verify');
      }
    } else {
      // No email found in session or URL, redirect back to signup
      router.push("/signup");
    }
  }, [emailParam, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let valid = true;

    if (!otp) {
      setOtpError("Please enter the OTP.");
      valid = false;
    } else if (otp.length < 6) {
      setOtpError("OTP must be 6 digits.");
      valid = false;
    } else {
      setOtpError("");
    }

    if (!valid) {
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        actionName: "VerifyPage Verify OTP",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "string" 
          ? data.error 
          : data.error?.message || data.message || "Verification failed. Please check the code and try again.";
        setOtpError(errorMsg);
        return;
      }

      setSuccess(true);
      await update();
      router.push("/chat");
    } catch (err) {
      console.error(err);
      setOtpError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        actionName: "VerifyPage Resend OTP",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Failed to resend code. Please try again.";
        setOtpError(errorMsg);
        return;
      }
      
      setCountdown(30);
    } catch (err) {
      console.error(err);
      setOtpError("An unexpected error occurred");
    }
  };

  return (
    <OTPVerifyForm
      title="Verify your email"
      email={email}
      otp={otp}
      setOtp={setOtp}
      otpError={otpError}
      setOtpError={setOtpError}
      loading={loading}
      onVerify={handleVerify}
      onResend={handleResend}
      countdown={countdown}
    />
  );
}
