import { logger } from "@/shared/utils/logger";
import { getAccessToken, triggerRefresh } from "@/providers/auth-provider";

interface RequestOptions extends RequestInit {
  actionName?: string;
  userId?: string;
  guestId?: string;
  token?: string; // Optional token if caller already has it
}

export async function apiRequest(url: string, options: RequestOptions = {}): Promise<Response> {
  const { actionName, userId, guestId, ...fetchOptions } = options;
  
  let requestId: string;
  const headersObj = new Headers(fetchOptions.headers || {});
  const incomingRequestId = headersObj.get("X-Request-ID");
  
  if (incomingRequestId) {
    requestId = incomingRequestId;
  } else if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    requestId = window.crypto.randomUUID();
  } else {
    requestId = `req-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
  }
  
  const headers = new Headers(fetchOptions.headers || {});
  headers.set("X-Request-ID", requestId);

  // Try to attach token
  let tokenToUse = options.token;
  if (!tokenToUse && !headers.has("Authorization")) {
    tokenToUse = getAccessToken() || undefined;
  }

  if (tokenToUse) {
    headers.set("Authorization", `Bearer ${tokenToUse}`);
  }
  
  fetchOptions.headers = headers;

  const method = fetchOptions.method || "GET";
  const timestamp = new Date().toISOString();
  const payload = {
    requestId,
    action: actionName || `${method} ${url}`,
    userId,
    guestId,
    httpMethod: method,
    endpointUrl: url,
    timestamp
  };

  logger.info(`Sending request: ${method} ${url}`, payload);
  const startTime = performance.now();

  try {
    const res = await fetch(url, fetchOptions);
    const duration = Math.round(performance.now() - startTime);
    const success = res.ok;

    const postPayload = {
      ...payload,
      duration,
      status: res.status,
      success
    };

    if (success) {
      logger.info(`Response received: ${method} ${url} - Status ${res.status}`, postPayload);
    } else {
      if (res.status === 401) {
        logger.warn(`Unauthorized request: ${method} ${url}. Attempting to refresh token.`, postPayload);
        const newSession = await triggerRefresh();
        
        if (newSession?.accessToken) {
           // Retry request with new token
           headers.set("Authorization", `Bearer ${newSession.accessToken}`);
           fetchOptions.headers = headers;
           return fetch(url, fetchOptions); // Note: Simple retry, ignoring logging for retry right now
        } else {
           logger.error(`Refresh failed for 401 request: ${method} ${url}. Redirecting to login.`, postPayload);
           if (typeof window !== "undefined") {
             window.location.href = "/login";
             // Return a never-resolving promise to pause execution while the browser navigates
             return new Promise<Response>(() => {});
           }
        }
      }

      let errorDetails = "";
      try {
        const clonedRes = res.clone();
        errorDetails = await clonedRes.text();
      } catch {
        errorDetails = "Failed to parse error response body";
      }
      logger.error(`Request failed: ${method} ${url} - Status ${res.status}`, {
        ...postPayload,
        errorCode: `HTTP_${res.status}`,
        errorMessage: errorDetails || res.statusText
      });
    }
    return res;
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    
    let errorCode = "NETWORK_ERROR";
    const errorMessage = error?.message || String(error);

    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch failed")) {
      errorCode = "CORS_OR_NETWORK_UNREACHABLE";
    } else if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      errorCode = "TIMEOUT";
    }

    logger.error(`Network failure: ${method} ${url}`, {
      ...payload,
      duration,
      status: "FAILED",
      success: false,
      errorCode,
      errorMessage
    });
    throw error;
  }
}
