import { z } from "zod";
import { InitiateCallSchema, AnswerCallSchema, EndCallSchema } from "@moots/contracts";

export type InitiateCallInput = z.infer<typeof InitiateCallSchema>["body"];
export type AnswerCallInput = z.infer<typeof AnswerCallSchema>["body"];
