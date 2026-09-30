"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

/** GET simple que devuelve `res.data` (opciones, detalle de un registro…). */
export function useApiData<T>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    api
      .get<{ data: T }>(endpoint)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No se pudo cargar.");
      })
      .finally(() => !cancelled && setLoadedFor(endpoint));
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { data, error, loading: loadedFor !== endpoint };
}
