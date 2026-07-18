"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/infrastructure/http/api-client";
import { env } from "@/env";
import { AuthFormContainer } from "./auth-form-container";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError(true);
      setEmailErrorMsg("You need to enter your email.");
      return false;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!isValid) {
      setEmailError(true);
      setEmailErrorMsg("This email is invalid. Make sure it's written like example@email.com");
      return false;
    }
    setEmailError(false);
    setEmailErrorMsg("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
      if (isValid || e.target.value === "") {
        setEmailError(false);
        setEmailErrorMsg("");
      } else {
        setEmailError(true);
        setEmailErrorMsg("This email is invalid. Make sure it's written like example@email.com");
      }
    }
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let valid = true;
    
    if (!validateEmail(email)) {
      valid = false;
    }

    if (!password) {
      setPasswordError("You need to enter a password.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) {
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        actionName: "SignupPage Register Account",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Something went wrong";
        if (errorMsg.toLowerCase().includes("email")) {
          setEmailError(true);
          setEmailErrorMsg(errorMsg);
        } else {
          setPasswordError(errorMsg);
        }
        return;
      }

      sessionStorage.setItem("verify_email", email);
      router.push("/verify");
    } catch (err) {
      console.error(err);
      setPasswordError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title="Create an account"
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkHref="/login"
    >
      <form onSubmit={handleSignup} className="w-full space-y-4">
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
            onBlur={handleEmailBlur}
            aria-invalid={emailError}
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
                {emailErrorMsg}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5 flex flex-col items-start w-full">
          <Label htmlFor="password" className="text-sm font-bold text-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
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
          Signup
        </Button>
      </form>
    </AuthFormContainer>
  );
}
