import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { RegisterSchema, VerifyOtpSchema, LoginSchema } from "../dto/auth.dto.js";
import { resolve } from "../../../config/container.js";

export const authRouter = Router();

// Lazily resolve controller after DI container is populated
const getController = () => resolve("authController");

authRouter.post("/guest", (req, res, next) => getController().guestLogin(req, res, next));
authRouter.post("/register", validateRequest(RegisterSchema), (req, res, next) => getController().register(req, res, next));
authRouter.post("/verify-otp", validateRequest(VerifyOtpSchema), (req, res, next) => getController().verifyOtp(req, res, next));
authRouter.post("/login", validateRequest(LoginSchema), (req, res, next) => getController().login(req, res, next));
authRouter.post("/refresh", (req, res, next) => getController().refresh(req, res, next));
