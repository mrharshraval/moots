"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/infrastructure/http/api-client";
import { env } from "@/env";
import { OTPVerifyForm } from "./otp-verify-form";

export function ResetPasswordVerifyForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const storedEmail = typeof window !== "undefined" ? sessionStorage.getItem("reset_password_email") : null;
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      router.push("/password/reset");
    }
  }, [router]);

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
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/password/reset/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        actionName: "ResetPassword Verify OTP",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "string" 
          ? data.error 
          : data.error?.message || data.message || "Verification failed. Please check the code and try again.";
        setOtpError(errorMsg);
        return;
      }

      // Store the resetToken to allow user to set new password
      sessionStorage.setItem("reset_password_token", data.data.resetToken);
      router.push("/password/reset/new");
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
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        actionName: "ResetPassword Resend OTP",
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
