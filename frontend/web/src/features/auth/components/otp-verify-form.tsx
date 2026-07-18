import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import { Button } from "@/shared/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { AuthFormContainer } from "./auth-form-container";

interface OTPVerifyFormProps {
  title: string;
  email: string;
  otp: string;
  setOtp: (val: string) => void;
  otpError: string;
  setOtpError: (val: string) => void;
  loading: boolean;
  onVerify: (e: React.FormEvent) => void;
  onResend: () => void;
  countdown: number;
}

const maskEmail = (email: string) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 1) return email;
  return `${local[0]}${"*".repeat(local.length - 1)}@${domain}`;
};

export function OTPVerifyForm({
  title,
  email,
  otp,
  setOtp,
  otpError,
  setOtpError,
  loading,
  onVerify,
  onResend,
  countdown
}: OTPVerifyFormProps) {
  return (
    <AuthFormContainer title={title}>
      <div className="text-center mb-8 space-y-2">
        <p className="text-base text-muted-foreground">
          Enter the verification code sent to
        </p>
        <p className="text-base font-medium text-foreground">
          {maskEmail(email)}
        </p>
      </div>

      <form onSubmit={onVerify} className="w-full space-y-4">
        <div className="space-y-1.5 flex flex-col items-start w-full">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (otpError) setOtpError("");
            }}
            disabled={loading}
            containerClassName="w-full flex justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-12 w-[47px] text-lg font-bold" aria-invalid={!!otpError} />
              <InputOTPSlot index={1} className="h-12 w-[47px] text-lg font-bold" aria-invalid={!!otpError} />
              <InputOTPSlot index={2} className="h-12 w-[47px] text-lg font-bold" aria-invalid={!!otpError} />
              <InputOTPSlot index={3} className="h-12 w-[47px] text-lg font-bold" aria-invalid={!!otpError} />
              <InputOTPSlot index={4} className="h-12 w-[47px] text-lg font-bold" aria-invalid={!!otpError} />
              <InputOTPSlot index={5} className="h-12 w-[47px] text-lg font-bold" aria-invalid={!!otpError} />
            </InputOTPGroup>
          </InputOTP>
          {otpError && (
            <div className="flex items-start gap-1.5 mt-1 text-destructive w-full justify-center">
              <AlertCircle className="w-[18px] h-[18px] mt-[1.5px] shrink-0" />
              <p className="text-[14px] leading-tight font-medium">
                {otpError}
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-full font-bold text-base mt-6 bg-primary text-primary-foreground "
          disabled={loading}
        >
          Verify
        </Button>
      </form>

      <div className="w-full mt-6 text-center space-y-5">
        <div className="text-muted-foreground text-[15px] font-medium tracking-wide flex items-center justify-center gap-1.5">
          {countdown > 0 ? (
            <span>Resend code in 00:{countdown.toString().padStart(2, '0')}</span>
          ) : (
            <button 
              type="button"
              onClick={onResend}
              className="font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Resend code
            </button>
          )}
        </div>
        <Link
          href="/login"
          className="block w-full text-foreground text-[15px] font-medium transition-colors hover:opacity-80"
        >
          Return to Log In
        </Link>
      </div>
    </AuthFormContainer>
  );
}
