import { Response } from "express";

export const sendSuccess = (res: Response, data: any = {}, meta: any = {}, statusCode: number = 200) => {
  const requestId = (res.req as any).requestId || "";
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
    requestId,
  });
};

export const sendError = (res: Response, errorCode: string, message: string, details: any[] = [], statusCode: number = 500) => {
  const requestId = (res.req as any).requestId || "";
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details,
    },
    requestId,
  });
};
