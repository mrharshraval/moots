import { logger } from "@/shared/utils/logger"
import { env } from "@/env"
import { tokenManager } from "@/infrastructure/auth/token-manager"

interface RequestOptions extends RequestInit {
  actionName?: string
  userId?: string
  guestId?: string
  _retry?: boolean
}

export async function apiRequest(url: string, options: RequestOptions = {}): Promise<Response> {
  const { actionName, userId, guestId, ...fetchOptions } = options
  
  // Generate or inherit Request ID
  let requestId: string
  const headersObj = new Headers(fetchOptions.headers || {})
  const incomingRequestId = headersObj.get("X-Request-ID")
  
  if (incomingRequestId) {
    requestId = incomingRequestId
  } else if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    requestId = window.crypto.randomUUID()
  } else {
    requestId = `req-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`
  }
  
  // Setup Headers
  const headers = new Headers(fetchOptions.headers || {})
  headers.set("X-Request-ID", requestId)

  // Try to attach token from tokenManager if we have it
  const token = tokenManager.getToken()
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  // #region agent log
  fetch('http://127.0.0.1:7419/ingest/d8e17749-7978-4108-99b8-55f9d5899bec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2900a9'},body:JSON.stringify({sessionId:'2900a9',location:'api-client.ts:pre-request',message:'apiRequest auth state before fetch',data:{url,method,hasToken:!!token,authHeaderAttached:headers.has('Authorization'),isRetry:!!fetchOptions._retry},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  fetchOptions.headers = headers

  const method = fetchOptions.method || "GET"
  const timestamp = new Date().toISOString()
  const payload = {
    requestId,
    action: actionName || `${method} ${url}`,
    userId,
    guestId,
    httpMethod: method,
    endpointUrl: url,
    timestamp
  }

  // Ensure credentials are included to send HttpOnly session cookie
  fetchOptions.credentials = fetchOptions.credentials || "include"

  logger.info(`Sending request: ${method} ${url}`, payload)
  const startTime = performance.now()

  try {
    const res = await fetch(url, fetchOptions)
    const duration = Math.round(performance.now() - startTime)
    const success = res.ok

    const postPayload = {
      ...payload,
      duration,
      status: res.status,
      success
    }

    if (success) {
      logger.info(`Response received: ${method} ${url} - Status ${res.status}`, postPayload)
    } else {
      if (res.status === 401 && !fetchOptions._retry) {
        // Attempt to refresh
        try {
          const refreshRes = await fetch(`/api/auth/token`, {
            method: "GET",
          })
          // #region agent log
          let backendRefreshStatus: number | null = null
          try {
            const backendRefreshRes = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
            backendRefreshStatus = backendRefreshRes.status
          } catch { backendRefreshStatus = -1 }
          fetch('http://127.0.0.1:7419/ingest/d8e17749-7978-4108-99b8-55f9d5899bec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2900a9'},body:JSON.stringify({sessionId:'2900a9',location:'api-client.ts:401-refresh',message:'401 refresh attempt results',data:{originalUrl:url,nextAuthTokenRouteStatus:refreshRes.status,backendRefreshRouteStatus:backendRefreshStatus},timestamp:Date.now(),hypothesisId:'B,C,D'})}).catch(()=>{});
          // #endregion

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            const newAccessToken = refreshData.accessToken
            
            if (newAccessToken) {
              tokenManager.setToken(newAccessToken)
              // Update headers with new token
              const retryHeaders = new Headers(fetchOptions.headers)
              retryHeaders.set("Authorization", `Bearer ${newAccessToken}`)
              
              const retryOptions = {
                ...fetchOptions,
                headers: retryHeaders,
                _retry: true
              } as RequestOptions

              // Retry original request
              return fetch(url, retryOptions)
            }
          }
        } catch (refreshErr) {
          logger.error("Failed to refresh token", { error: String(refreshErr) })
        }
      }

      let errorDetails = ""
      try {
        const clonedRes = res.clone()
        errorDetails = await clonedRes.text()
      } catch {
        errorDetails = "Failed to parse error response body"
      }
      logger.error(`Request failed: ${method} ${url} - Status ${res.status}`, {
        ...postPayload,
        errorCode: `HTTP_${res.status}`,
        errorMessage: errorDetails || res.statusText
      })
    }
    return res
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime)
    
    let errorCode = "NETWORK_ERROR"
    const errorMessage = error?.message || String(error)

    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch failed")) {
      errorCode = "CORS_OR_NETWORK_UNREACHABLE"
    } else if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      errorCode = "TIMEOUT"
    }

    logger.error(`Network failure: ${method} ${url}`, {
      ...payload,
      duration,
      status: "FAILED",
      success: false,
      errorCode,
      errorMessage
    })
    throw error
  }
}
