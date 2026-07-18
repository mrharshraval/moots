import React from "react";
import Link from "next/link";

interface AuthFormContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
}

export function AuthFormContainer({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthFormContainerProps) {
  return (
    <div className="w-full max-w-[324px] mx-auto flex flex-col items-center">
      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <img
          src="/brand/brand-marks/monochrome/White%20Filled.svg"
          alt="Moots"
          className="h-[72px] w-[72px] opacity-90 hidden dark:block object-contain"
        />
        <img
          src="/brand/brand-marks/monochrome/Balck%20Filled.svg"
          alt="Moots"
          className="h-[72px] w-[72px] opacity-90 dark:hidden object-contain"
        />
      </div>

      {/* Title */}
      <h1 className="text-[32px] leading-tight font-bold tracking-tight text-foreground text-center mb-2">
        {title}
      </h1>
      
      {/* Subtitle */}
      {subtitle && (
        <p className="text-base text-muted-foreground text-center mb-8 font-medium">
          {subtitle}
        </p>
      )}

      {/* Spacing adjustments for when subtitle is missing */}
      {!subtitle && <div className="mb-6" />}

      {children}

      {footerText && footerLinkText && footerLinkHref && (
        <div className="w-full mt-8 flex items-center justify-center gap-1.5 text-[15px]">
          <span className="text-muted-foreground font-medium tracking-wide">
            {footerText}
          </span>
          <Link
            href={footerLinkHref}
            className="text-foreground font-bold transition-colors hover:opacity-80"
          >
            {footerLinkText}
          </Link>
        </div>
      )}

      <div className="w-full mt-12 text-center">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          By continuing, you agree to the{" "}
          <Link href="/policies/terms" className="text-[12px] font-bold hover:text-foreground transition-colors" target="_blank">
            Terms of Use
          </Link>
          {" "}and{" "}
          <Link href="/policies/privacy" className="text-[12px] font-bold hover:text-foreground transition-colors" target="_blank">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}
