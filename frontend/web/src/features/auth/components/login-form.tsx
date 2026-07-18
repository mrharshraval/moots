"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/providers/auth-provider";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { User, Lock, AlertCircle } from "lucide-react";
import { AuthFormContainer } from "./auth-form-container";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, update } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const verifiedParam = searchParams.get("verified");
    const error = searchParams.get("error");

    const storedEmail = typeof window !== "undefined" ? sessionStorage.getItem("login_email") : null;
    const storedVerified = typeof window !== "undefined" ? sessionStorage.getItem("verified_success") : null;
    
    const finalEmail = emailParam || storedEmail;
    if (finalEmail) {
      setIdentifier(finalEmail);
      if (typeof window !== "undefined") sessionStorage.removeItem("login_email");
    }

    if (verifiedParam === "true" || storedVerified === "true") {
      sessionStorage.removeItem("verified_success");
    }

    // Clean up URL if they happened to arrive with query params
    if ((emailParam || verifiedParam) && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("email");
      url.searchParams.delete("verified");
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    if (error) {
      if (error === "CredentialsSignin") {
        setPasswordError("Invalid username/email or password.");
      } else {
        setPasswordError("Authentication failed. Please try again.");
      }
    }
  }, [searchParams]);

  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;

    if (!identifier) {
      setIdentifierError("Please enter your email or username.");
      valid = false;
    } else {
      setIdentifierError("");
    }

    if (!password) {
      setPasswordError("Please enter your password.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) {
      return;
    }

    setLoading(true);

    try {
      await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });
      await update();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setPasswordError("Invalid username/email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title="Log in to Moots"
      footerText="Don't have an account?"
      footerLinkText="Signup"
      footerLinkHref="/signup"
    >
      <form onSubmit={handleLogin} className="w-full space-y-4">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <Label htmlFor="identifier" className="text-sm font-bold text-foreground">
            Email or username
          </Label>
          <Input
            id="identifier"
            type="text"
            placeholder="Email or username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (identifierError) setIdentifierError("");
            }}
            aria-invalid={!!identifierError}
            className={`w-full bg-transparent rounded-md h-12 px-3 text-base transition-all placeholder:text-muted-foreground ${
              identifierError
                ? "border-destructive text-destructive focus:border-destructive hover:border-destructive"
                : "border-border text-foreground hover:border-foreground focus:border-foreground"
            }`}
            disabled={loading}
          />
          {identifierError && (
            <div className="flex items-start gap-1.5 mt-1 text-destructive">
              <AlertCircle className="w-[18px] h-[18px] mt-[1.5px] shrink-0" />
              <p className="text-[14px] leading-tight font-medium">
                {identifierError}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5 flex flex-col items-start w-full">
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="password" className="text-sm font-bold text-foreground">
              Password
            </Label>
            <Link 
              href="/password/reset" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
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
          Login
        </Button>
      </form>
    </AuthFormContainer>
  );
}
