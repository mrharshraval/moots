"use client";

import { useSession } from "@/providers/auth-provider";
import { getOrInitializeNickname } from "@/shared/utils/nickname";
import { useEffect, useState } from "react";

// decodeJwt removed

export function useActorSession() {
  const { data: session, status } = useSession();
  const [guestNickname, setGuestNickname] = useState<string>("Guest User");

  useEffect(() => {
    setGuestNickname(getOrInitializeNickname());
  }, []);

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
    const isGuest = session.user.name === "Guest" && !session.user.username;
    return {
      actorId: session.user.id,
      isGuest,
      displayName: isGuest ? guestNickname : (session.user.name || session.user.username || "User"),
      username: session.user.username || null,
      image: session.user.image || null,
      isLoading: false
    };
  }

  return {
    actorId: "guest-pending",
    isGuest: true,
    displayName: guestNickname,
    username: null,
    image: null,
    isLoading: false
  };
}
