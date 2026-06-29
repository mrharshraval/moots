import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { RegisterInput, VerifyOtpInput, LoginInput } from "../dto/auth.dto.js";
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

  guestLogin = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const data = await this.service.guestLogin(ipAddress, userAgent);
    return sendSuccess(res, data, { message: "Guest login successful" });
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

  verifyOtp = asyncHandler(async (req: Request<{}, {}, VerifyOtpInput>, res: Response) => {
    const { email, otp } = req.body;

    await this.service.verifyOtp({ email, otp });
    return sendSuccess(res, undefined, { message: "Email verified successfully" });
  });

  login = asyncHandler(async (req: Request<{}, {}, LoginInput>, res: Response) => {
    const { identifier, password } = req.body;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const data = await this.service.login({ identifier, password }, ipAddress, userAgent);
    
    // Set HTTP-only cookie
    res.cookie("refreshToken", data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return sendSuccess(res, { accessToken: data.accessToken, user: data.user });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError("No refresh token provided");
    }

    const data = await this.service.refreshAccessToken(refreshToken);

    // Set new HTTP-only cookie
    res.cookie("refreshToken", data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return sendSuccess(res, { accessToken: data.accessToken });
  });
}
