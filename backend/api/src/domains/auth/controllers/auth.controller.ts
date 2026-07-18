import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { 
  RegisterInput, 
  VerifyOtpInput, 
  LoginInput, 
  ResendOtpInput,
  PasswordResetRequestInput,
  PasswordResetVerifyInput,
  PasswordResetCompleteInput
} from "../dto/auth.dto.js";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";

export class AuthController {
  private service: AuthService;

  constructor(deps: { authService: AuthService }) {
    this.service = deps.authService;
  }

  private getClientIp(req: Request): string {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    return Array.isArray(ip) ? ip[0] : ip;
  }
  private setSessionCookie(res: Response, token: string) {
    res.cookie("moots_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });
  }

  guestLogin = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const data = await this.service.guestLogin(ipAddress, userAgent);
    if (data.actorSessionToken) {
      this.setSessionCookie(res, data.actorSessionToken);
    }
    
    // Don't send actorSessionToken in body payload, only cookie
    const { actorSessionToken, ...safeData } = data as any;
    return sendSuccess(res, safeData, { message: "Guest login successful" });
  });

  register = asyncHandler(async (req: Request<{}, {}, RegisterInput>, res: Response) => {
    const { email, password } = req.body;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const authHeader = req.headers.authorization;
    let guestActorId: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const { jwtService } = await import("../../../lib/auth/jwt.service.js");
        const payload = jwtService.verify(token);
        guestActorId = payload.actorId;
      } catch (e) {
      }
    }

    await this.service.register({ email, password }, ipAddress, userAgent, guestActorId);
    return sendSuccess(res, undefined, { message: "Registration successful. OTP sent." });
  });

  resendOtp = asyncHandler(async (req: Request<{}, {}, ResendOtpInput>, res: Response) => {
    const { email } = req.body;
    await this.service.resendOtp(email);
    return sendSuccess(res, undefined, { message: "OTP resent successfully." });
  });

  verifyOtp = asyncHandler(async (req: Request<{}, {}, VerifyOtpInput>, res: Response) => {
    const { email, otp } = req.body;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const data = await this.service.verifyOtp({ email, otp }, ipAddress, userAgent);
    
    if (data.actorSessionToken) {
      this.setSessionCookie(res, data.actorSessionToken);
    }

    return sendSuccess(res, { 
      accessToken: data.accessToken, 
      user: data.user,
      unreadNotificationCount: data.unreadNotificationCount 
    }, { message: "Email verified successfully" });
  });

  login = asyncHandler(async (req: Request<{}, {}, LoginInput>, res: Response) => {
    const { identifier, password } = req.body;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const data = await this.service.login({ identifier, password }, ipAddress, userAgent);
    
    if (data.actorSessionToken) {
      this.setSessionCookie(res, data.actorSessionToken);
    }

    return sendSuccess(res, { 
      accessToken: data.accessToken, 
      user: data.user,
      unreadNotificationCount: data.unreadNotificationCount 
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    // Get session token from cookie
    const sessionToken = req.cookies?.moots_session;
    if (!sessionToken) {
      throw new UnauthorizedError("No session token provided");
    }

    const data = await this.service.refreshSessionToken(sessionToken);

    // Set new HTTP-only cookie
    this.setSessionCookie(res, data.actorSessionToken);

    return sendSuccess(res, { 
      accessToken: data.accessToken,
      unreadNotificationCount: data.unreadNotificationCount 
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    // Clear the cookie
    res.clearCookie("moots_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    return sendSuccess(res, undefined, { message: "Logged out successfully" });
  });

  requestPasswordReset = asyncHandler(async (req: Request<{}, {}, PasswordResetRequestInput>, res: Response) => {
    const { email } = req.body;
    await this.service.requestPasswordReset(email);
    // Don't leak if the account exists
    return sendSuccess(res, undefined, { message: "If an account with that email exists, we sent a password reset link." });
  });

  verifyPasswordResetOtp = asyncHandler(async (req: Request<{}, {}, PasswordResetVerifyInput>, res: Response) => {
    const { email, otp } = req.body;
    const data = await this.service.verifyPasswordResetOtp(email, otp);
    return sendSuccess(res, data, { message: "OTP verified successfully." });
  });

  completePasswordReset = asyncHandler(async (req: Request<{}, {}, PasswordResetCompleteInput>, res: Response) => {
    const { resetToken, password } = req.body;
    await this.service.completePasswordReset(resetToken, password);
    return sendSuccess(res, undefined, { message: "Password reset completely successfully." });
  });
}
