"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { apiRequest } from "@/infrastructure/http/api-client";
import { env } from "@/env";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!agreeAge || !agreeTerms) {
      toast.error("Please agree to the terms and age requirements to continue");
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
        toast.error(data.error || "Something went wrong");
        return;
      }

      toast.success("Verification OTP sent to your email");
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Create an Account
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Enter your email to sign up and verify your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <form onSubmit={handleSignup} className="space-y-4">
           <div className="relative border border-border rounded-xl px-3 py-1.5 bg-muted/20 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
             <Label htmlFor="email" className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
               Email Address
             </Label>
             <div className="relative flex items-center mt-0.5">
               <Mail className="absolute left-0 size-4 text-muted-foreground" />
               <Input
                 id="email"
                 type="email"
                 placeholder="name@example.com"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-transparent border-none p-0 pl-6 h-6 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden"
                 disabled={loading}
               />
             </div>
           </div>
           <div className="relative border border-border rounded-xl px-3 py-1.5 bg-muted/20 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
             <Label htmlFor="password" className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
               Password
             </Label>
             <div className="relative flex items-center mt-0.5">
               <Lock className="absolute left-0 size-4 text-muted-foreground" />
               <Input
                 id="password"
                 type="password"
                 placeholder="••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-transparent border-none p-0 pl-6 h-6 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden"
                 disabled={loading}
               />
             </div>
            </div>
            <div className="space-y-3 py-1">
              <div className="flex items-start gap-2.5">
                <input
                  id="agree-age"
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => setAgreeAge(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary size-4 shrink-0 cursor-pointer"
                  required
                />
                <Label htmlFor="agree-age" className="text-xs text-muted-foreground font-normal leading-normal cursor-pointer select-none">
                  I confirm that I meet the minimum age requirement of 13 years (or local age of consent).
                </Label>
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary size-4 shrink-0 cursor-pointer"
                  required
                />
                <Label htmlFor="agree-terms" className="text-xs text-muted-foreground font-normal leading-normal cursor-pointer select-none">
                  I agree to the{" "}
                  <Link href="/policies/terms" className="text-primary hover:underline font-semibold" target="_blank">
                    Terms of Use
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/policies/privacy" className="text-primary hover:underline font-semibold" target="_blank">
                    Privacy Policy
                  </Link>
                  , consenting to the processing of my data.
                </Label>
              </div>
            </div>
            <Button type="submit" className="w-full h-10 text-xs font-semibold" disabled={loading || !agreeAge || !agreeTerms}>
              {loading ? "Sending OTP" : "Sign Up"}
            </Button>
          </form>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-center gap-1 border-t border-border/40 p-4 text-center">
        <span className="text-[11px] text-muted-foreground">Already have an account?</span>
        <Link href="/login" className="text-[11px] font-semibold text-primary hover:underline">
          Login
        </Link>
      </CardFooter>
    </Card>
  );
}
