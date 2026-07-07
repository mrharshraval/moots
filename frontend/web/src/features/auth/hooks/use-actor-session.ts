"use client";

import { useSession } from "next-auth/react";
import { getOrInitializeNickname } from "@/shared/utils/nickname";
import { useEffect, useState } from "react";

function decodeJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

export function useActorSession() {
  const { data: session, status } = useSession();
  const [guestActorId, setGuestActorId] = useState<string | null>(null);
  const [guestNickname, setGuestNickname] = useState<string>("Guest User");

  useEffect(() => {
    setGuestNickname(getOrInitializeNickname());
    
    if (status === "unauthenticated") {
      const token = localStorage.getItem("moots_guest_token");
      if (token) {
        const payload = decodeJwt(token);
        if (payload) {
          if (payload.actorId) {
            setGuestActorId(payload.actorId);
          } else if (payload.sub) {
            setGuestActorId(payload.sub);
          }
        }
      }
    }
  }, [status]);

  if (status === "loading") {
    return {
      actorId: null,
      isGuest: true,
      displayName: "Loading...",
      username: null,
      image: null,
      isLoading: true
    };
  }

  if (session?.user) {
    return {
      actorId: session.user.id,
      isGuest: false,
      displayName: session.user.name || (session.user as any).username || "User",
      username: (session.user as any).username,
      image: session.user.image,
      isLoading: false
    };
  }

  return {
    actorId: guestActorId || "guest-pending",
    isGuest: true,
    displayName: guestNickname,
    username: null,
    image: null,
    isLoading: false
  };
}
