"use client";

import { Suspense } from "react";
import { Card } from "@/shared/ui/card";
import { LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark-first">
      <Suspense fallback={
        <Card className="w-full max-w-md border-border bg-card shadow-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading login screen</p>
        </Card>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
