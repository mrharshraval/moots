import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { SearchController } from "../controllers/search.controller.js";

export const searchRouter = Router();
const controller = new SearchController();

searchRouter.get("/", authenticate, controller.search);
