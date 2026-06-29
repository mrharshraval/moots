import { AsyncLocalStorage } from "async_hooks";

export interface RequestContextStore {
  requestId: string;
  actorId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestId(): string | null {
  const store = requestContext.getStore();
  return store?.requestId || null;
}

export const getActorId = () => {
  const store = requestContext.getStore();
  return store?.actorId || null;
};
