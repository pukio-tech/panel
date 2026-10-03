"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getUserSnapshot, subscribeSession, type SessionUser } from "@/lib/api";

/** Usuario de la sesión actual (se actualiza al iniciar sesión o al refrescar /api/auth/me). */
export function useSessionUser(): SessionUser | null {
  const raw = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }, [raw]);
}
