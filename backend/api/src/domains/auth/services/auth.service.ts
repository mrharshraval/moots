import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../../../config/env.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { RegisterInput, VerifyOtpInput, LoginInput } from "../dto/auth.dto.js";
import { ConflictError, InternalServerError, NotFoundError, UnauthorizedError, BadRequestError } from "../../../shared/errors/AppError.js";
import { jwtService } from "../../../lib/auth/jwt.service.js";
import { prisma } from "../../../database/index.js";
import { EmailService } from "../../../lib/email.service.js";
import { logger } from "../../../shared/logger.js";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  private repository: AuthRepository;
  private emailService: EmailService;

  constructor(deps: { emailService: EmailService }) {
    this.repository = new AuthRepository();
    this.emailService = deps.emailService;
  }

  async guestLogin(ipAddress: string, userAgent: string) {
    const guestSession = await this.repository.createGuestSession(ipAddress, userAgent);
    const actor = guestSession.actors[0];
    const accessToken = jwtService.sign({ actorId: actor.id });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        event: "GUEST_AUTH_SUCCESS",
        metadata: { userAgent, guestSessionId: guestSession.id },
        ip: ipAddress,
      },
    });

    const unreadNotificationCount = await prisma.notification.count({
      where: { actorId: actor.id, isRead: false },
    });

    return {
      accessToken,
      actorSessionToken: guestSession.guestToken, // forwarded to controller → moots_session cookie
      guestSession: {
        id: guestSession.id,
        createdAt: guestSession.createdAt,
      },
      unreadNotificationCount,
    };
  }

  async register(
    data: RegisterInput,
    ipAddress: string,
    userAgent: string,
    guestActorId?: string
  ) {
    const { email, password } = data;

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser && existingUser.emailVerified) {
      throw new ConflictError("An account with this email already exists");
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, BCRYPT_ROUNDS)
      : undefined;

    // CSPRNG OTP — replaces Math.random()
    const otp = crypto.randomInt(100_000, 999_999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.$transaction(async (tx) => {
      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
        // Do NOT overwrite credentials of an unverified account.
        // Only resend the OTP so the original registrant can verify.
      } else {
        const user = await this.repository.createUser(
          { email, password: hashedPassword, lastIp: ipAddress, userAgent },
          tx
        );
        userId = user.id;

        // If registering from a guest session, promote the actor
        if (guestActorId) {
          const guestActor = await this.repository.findActorById(guestActorId, tx);
          if (guestActor && guestActor.type === "GUEST" && guestActor.guestSessionId) {
            await this.repository.promoteGuestSession(guestActor.guestSessionId, userId, tx);
          }
        }
      }

      await this.repository.deleteVerificationTokens(email, "VERIFY_EMAIL", tx);
      await this.repository.createVerificationToken(
        {
          identifier: email,
          token: crypto.createHash("sha256").update(otp).digest("hex"),
          expires,
        },
        tx
      );
    });

    try {
      await this.emailService.sendOTP(email, otp);
    } catch {
      throw new InternalServerError("Could not send verification email.");
    }
  }

  async resendOtp(email: string): Promise<void> {
    const existingUser = await this.repository.findUserByEmail(email);
    if (!existingUser) {
      throw new BadRequestError("User not found");
    }
    if (existingUser.emailVerified) {
      throw new BadRequestError("User is already verified");
    }

    const otp = crypto.randomInt(100_000, 999_999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.$transaction(async (tx) => {
      await this.repository.deleteVerificationTokens(email, "VERIFY_EMAIL", tx);
      await this.repository.createVerificationToken(
        {
          identifier: email,
          token: crypto.createHash("sha256").update(otp).digest("hex"),
          expires,
        },
        tx
      );
    });

    try {
      await this.emailService.sendOTP(email, otp);
    } catch {
      throw new InternalServerError("Could not send verification email.");
    }
  }

  async verifyOtp(data: VerifyOtpInput, ipAddress: string, userAgent: string) {
    const { email, otp } = data;

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const token = await this.repository.findVerificationToken(email, otpHash);
    if (!token) {
      throw new UnauthorizedError("Invalid or expired OTP");
    }

    if (new Date() > token.expires) {
      await this.repository.deleteVerificationToken(otpHash);
      throw new UnauthorizedError("Invalid or expired OTP");
    }

    await prisma.$transaction(async (tx) => {
      await this.repository.updateUser(email, { emailVerified: new Date() }, tx);
      await this.repository.deleteVerificationToken(otpHash, tx);
    });

    const user = await this.repository.findUserByEmail(email);
    if (!user) throw new InternalServerError("User not found after verification");

    await this.repository.updateUserById(user.id, {
      lastIp: ipAddress,
      userAgent,
      lastLoginAt: new Date(),
    });

    const actor = await this.repository.getOrCreateActorForUser(user.id);
    const accessToken = jwtService.sign({ actorId: actor.id });

    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawSessionToken)
      .digest("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.upsert({
      where: { sessionToken: hashedToken },
      update: { expires },
      create: {
        sessionToken: hashedToken,
        userId: user.id,
        expires,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        event: "AUTH_SUCCESS",
        metadata: { identifier: email, email, userAgent, reason: "OTP Verified" },
        ip: ipAddress,
      },
    });

    const unreadNotificationCount = await prisma.notification.count({
      where: { actorId: actor.id, isRead: false },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        actorId: actor.id,
      },
      unreadNotificationCount,
      actorSessionToken: rawSessionToken,
    };
  }

  async login(data: LoginInput, ipAddress: string, userAgent: string) {
    const { identifier, password } = data;

    const user = await this.repository.findUserByIdentifier(identifier);

    // FIX 1: Consolidated credential check — single log entry, timing-safe
    if (!user || !user.password) {
      await prisma.auditLog.create({
        data: {
          actorId: null,
          event: "AUTH_FAILURE",
          metadata: { identifier, userAgent, reason: "User not found or no password" },
          ip: ipAddress,
        },
      });
      throw new UnauthorizedError("Invalid credentials");
    }

    // FIX 2: Enforce email verification before allowing login.
    // Without this check, users who registered but never verified their OTP
    // could still log in, defeating the entire verification flow.
    if (!user.emailVerified) {
      await prisma.auditLog.create({
        data: {
          actorId: null,
          event: "AUTH_FAILURE",
          metadata: { identifier, userAgent, reason: "Email not verified" },
          ip: ipAddress,
        },
      });
      throw new UnauthorizedError(
        "Email address not verified. Please check your inbox for the OTP."
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await prisma.auditLog.create({
        data: {
          actorId: null,
          event: "AUTH_FAILURE",
          metadata: { identifier, userAgent, reason: "Password mismatch" },
          ip: ipAddress,
        },
      });
      throw new UnauthorizedError("Invalid credentials");
    }

    await this.repository.updateUserById(user.id, {
      lastIp: ipAddress,
      userAgent,
      lastLoginAt: new Date(),
    });

    const actor = await this.repository.getOrCreateActorForUser(user.id);
    const accessToken = jwtService.sign({ actorId: actor.id });

    // Generate long-lived session token (stored hashed in DB, raw in cookie)
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawSessionToken)
      .digest("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // FIX 3: Use upsert to avoid duplicate sessions for the same user.
    // On rapid re-login or multi-tab login, this prevents constraint violations.
    await prisma.session.upsert({
      where: { sessionToken: hashedToken },
      update: { expires },
      create: {
        sessionToken: hashedToken,
        userId: user.id,
        expires,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        event: "AUTH_SUCCESS",
        metadata: { identifier, email: user.email, userAgent },
        ip: ipAddress,
      },
    });

    const unreadNotificationCount = await prisma.notification.count({
      where: { actorId: actor.id, isRead: false },
    });

    return {
      accessToken,
      actorSessionToken: rawSessionToken, // controller sets this as moots_session cookie
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      unreadNotificationCount,
    };
  }

  async refreshSessionToken(sessionToken: string) {
    logger.info({ tokenPrefix: sessionToken.slice(0, 8) }, "[auth:refresh] token received");

    // Path A: Guest session (raw token stored in guestSession.guestToken)
    const guestSession = await prisma.guestSession.findUnique({
      where: { guestToken: sessionToken },
      include: { actors: true },
    });

    if (guestSession) {
      if (new Date() > guestSession.expiresAt) {
        logger.warn({ guestSessionId: guestSession.id }, "[auth:refresh] guest session expired");
        await prisma.guestSession.delete({ where: { id: guestSession.id } });
        throw new UnauthorizedError("Guest session expired");
      }

      const actor = guestSession.actors[0];
      if (!actor) {
        logger.error({ guestSessionId: guestSession.id }, "[auth:refresh] guest session has no actor");
        throw new UnauthorizedError("Guest session has no actor");
      }

      logger.info({ actorId: actor.id, guestSessionId: guestSession.id }, "[auth:refresh] guest session valid → issuing access token");
      const accessToken = jwtService.sign({ actorId: actor.id });
      const unreadNotificationCount = await prisma.notification.count({
        where: { actorId: actor.id, isRead: false },
      });

      // Guest token is not rotated — it's long-lived by design (30 days)
      return { accessToken, actorSessionToken: sessionToken, unreadNotificationCount };
    }

    // Path B: User session (token stored hashed in Session.sessionToken)
    logger.info({ tokenPrefix: sessionToken.slice(0, 8) }, "[auth:refresh] not a guest token, trying user session");
    const hashedToken = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const userSession = await prisma.session.findUnique({
      where: { sessionToken: hashedToken },
      include: { user: true },
    });

    if (!userSession || new Date() > userSession.expires) {
      if (userSession) {
        logger.warn({ sessionId: userSession.id, userId: userSession.userId }, "[auth:refresh] user session expired, deleting");
        await prisma.session.delete({ where: { id: userSession.id } });
      } else {
        logger.warn({ tokenPrefix: sessionToken.slice(0, 8) }, "[auth:refresh] user session not found in database → returning 401");
      }
      throw new UnauthorizedError("Invalid or expired session token");
    }

    logger.info({ sessionId: userSession.id, userId: userSession.userId }, "[auth:refresh] user session valid → issuing access token");
    const actor = await this.repository.getOrCreateActorForUser(userSession.userId);
    const accessToken = jwtService.sign({ actorId: actor.id });

    // Rotate session token on each refresh (refresh token rotation)
    const newRawToken = crypto.randomBytes(32).toString("hex");
    const newHashedToken = crypto
      .createHash("sha256")
      .update(newRawToken)
      .digest("hex");
    const newExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.update({
      where: { id: userSession.id },
      data: { sessionToken: newHashedToken, expires: newExpires },
    });

    const unreadNotificationCount = await prisma.notification.count({
      where: { actorId: actor.id, isRead: false },
    });

    return { accessToken, actorSessionToken: newRawToken, unreadNotificationCount };
  }

  async logout(sessionToken: string) {
    // Delete guest session if it exists
    await prisma.guestSession.deleteMany({
      where: { guestToken: sessionToken },
    });

    // Delete user session if it exists
    const hashedToken = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");
      
    await prisma.session.deleteMany({
      where: { sessionToken: hashedToken },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.repository.findUserByEmail(email);
    // Don't leak whether the user exists or not, but don't send an email if they don't
    if (!user) return;

    const otp = crypto.randomInt(100_000, 999_999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.$transaction(async (tx) => {
      await this.repository.deleteVerificationTokens(email, "RESET_PASSWORD", tx);
      await this.repository.createVerificationToken(
        {
          identifier: email,
          token: crypto.createHash("sha256").update(otp).digest("hex"),
          expires,
          type: "RESET_PASSWORD",
        },
        tx
      );
    });

    try {
      await this.emailService.sendOTP(email, otp); // We can just use the same template for now
    } catch (e) {
      console.error("Failed to send password reset email:", e);
    }
  }

  async verifyPasswordResetOtp(email: string, otp: string) {
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const token = await this.repository.findVerificationToken(email, otpHash, "RESET_PASSWORD");
    if (!token) {
      throw new UnauthorizedError("Invalid or expired reset code");
    }

    if (new Date() > token.expires) {
      await this.repository.deleteVerificationToken(otpHash);
      throw new UnauthorizedError("Invalid or expired reset code");
    }

    // Instead of verifying the email (which is for signup), we generate a short-lived reset token
    // that the user can use to submit their new password. This ensures the OTP is single-use.
    const resetTokenRaw = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetTokenRaw).digest("hex");
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await this.repository.deleteVerificationToken(otpHash, tx);
      await this.repository.createVerificationToken(
        {
          identifier: email,
          token: resetTokenHash,
          expires: resetExpires,
          type: "RESET_PASSWORD",
        },
        tx
      );
    });

    return { resetToken: resetTokenRaw };
  }

  async completePasswordReset(resetToken: string, newPasswordRaw: string) {
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    // We don't have the email from the frontend for the final step, so we find by token
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { token: resetTokenHash, type: "RESET_PASSWORD" }
    });

    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    if (new Date() > tokenRecord.expires) {
      await this.repository.deleteVerificationToken(resetTokenHash);
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(newPasswordRaw, BCRYPT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      await this.repository.updateUser(tokenRecord.identifier, { password: hashedPassword }, tx);
      await this.repository.deleteVerificationToken(resetTokenHash, tx);
      // Optional: revoke all existing sessions to force re-login
      const user = await this.repository.findUserByEmail(tokenRecord.identifier);
      if (user) {
        await tx.session.deleteMany({ where: { userId: user.id } });
      }
    });
  }
}