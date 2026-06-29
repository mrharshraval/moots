import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { env } from "../../../config/env.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { RegisterInput, VerifyOtpInput, LoginInput } from "../dto/auth.dto.js";
import { ConflictError, InternalServerError, UnauthorizedError } from "../../../shared/errors/AppError.js";
import { jwtService } from "../../../lib/auth/jwt.service.js";
import { prisma } from "../../../database/index.js";

import { EmailService } from "../../../lib/email.service.js";

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
      }
    });

    return {
      accessToken,
      guestSession: {
        id: guestSession.id,
        createdAt: guestSession.createdAt,
      }
    };
  }

  async register(data: RegisterInput, ipAddress: string, userAgent: string, guestActorId?: string) {
    const { email, password } = data;
    
    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser && existingUser.emailVerified) {
      throw new ConflictError("Email is already registered and verified");
    }

    const hashedPassword = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : undefined;

    // CSPRNG-backed OTP generation (replaces Math.random())
    const otp = crypto.randomInt(100_000, 999_999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
        // Security: do NOT overwrite credentials of an unverified account.
        // Only resend the OTP so the original registrant can verify.
      } else {
        const user = await this.repository.createUser({
          email,
          password: hashedPassword,
          lastIp: ipAddress,
          userAgent,
        }, tx);
        userId = user.id;

        // If registering from a guest session, promote the actor.
        if (guestActorId) {
          const guestActor = await this.repository.findActorById(guestActorId, tx);
          if (guestActor && guestActor.type === "GUEST" && guestActor.guestSessionId) {
            await this.repository.promoteGuestSession(guestActor.guestSessionId, userId, tx);
          }
        }
      }

      await this.repository.deleteVerificationTokens(email, tx);
      await this.repository.createVerificationToken({
        identifier: email,
        token: otp,
        expires,
      }, tx);
    });

    try {
      await this.emailService.sendOTP(email, otp);
    } catch (emailError) {
      throw new InternalServerError("Could not send verification email.");
    }
  }

  async verifyOtp(data: VerifyOtpInput) {
    const { email, otp } = data;
    
    const token = await this.repository.findVerificationToken(email, otp);
    if (!token) {
      throw new UnauthorizedError("Invalid OTP code");
    }

    if (new Date() > token.expires) {
      await this.repository.deleteVerificationToken(otp);
      throw new UnauthorizedError("OTP has expired");
    }

    await prisma.$transaction(async (tx) => {
      await this.repository.updateUser(email, { emailVerified: new Date() }, tx);
      await this.repository.deleteVerificationToken(otp, tx);
    });
  }

  async login(data: LoginInput, ipAddress: string, userAgent: string) {
    const { identifier, password } = data;
    
    const user = await this.repository.findUserByIdentifier(identifier);
    if (!user || !user.password) {
      await prisma.auditLog.create({
        data: {
          actorId: null,
          event: "AUTH_FAILURE",
          metadata: { identifier, userAgent, reason: "User not found or no password" },
          ip: ipAddress,
        }
      });
      throw new UnauthorizedError("Invalid credentials");
    }

    if (password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        await prisma.auditLog.create({
          data: {
            actorId: null,
            event: "AUTH_FAILURE",
            metadata: { identifier, userAgent, reason: "Password mismatch" },
            ip: ipAddress,
          }
        });
        throw new UnauthorizedError("Invalid credentials");
      }
    }

    await this.repository.updateUserById(user.id, {
      lastIp: ipAddress,
      userAgent,
      lastLoginAt: new Date(),
    });

    // Issue a short-lived JWT access token using actorId.
    const actor = await this.repository.getOrCreateActorForUser(user.id);
    const accessToken = jwtService.sign({ actorId: actor.id });

    // Generate refresh token and save to Session table
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        sessionToken: hashedToken,
        userId: user.id,
        expires,
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        event: "AUTH_SUCCESS",
        metadata: { identifier, email: user.email, userAgent },
        ip: ipAddress,
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        image:     user.image,
        username:  user.username,
        bio:       user.bio,
        createdAt: user.createdAt,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await prisma.session.findUnique({
      where: { sessionToken: hashedToken },
      include: { user: true }
    });

    if (!session || new Date() > session.expires) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const actor = await this.repository.getOrCreateActorForUser(session.userId);
    const accessToken = jwtService.sign({ actorId: actor.id });

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newHashedToken = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.update({
      where: { id: session.id },
      data: {
        sessionToken: newHashedToken,
        expires: newExpires
      }
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
