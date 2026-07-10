"use client";

import { Suspense } from "react";
import { Card } from "@/shared/ui/card";
import { VerifyOtpForm } from "@/features/auth";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark-first">
      <Suspense fallback={
        <Card className="w-full max-w-md border-border bg-card shadow-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading verification screen</p>
        </Card>
      }>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}
