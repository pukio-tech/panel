"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { gymApi } from "@/lib/gym-api";

/**
 * GET a la API de Gym Manager (vía el proxy del panel) con recarga manual.
 * Devuelve la respuesta completa (sin desempaquetar `data`) y el status del error.
 */
export function useGymData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    gymApi
      .get<T>(path)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? { message: err.message, status: err.status }
            : { message: "No se pudo cargar la información.", status: 0 },
        );
      })
      .finally(() => !cancelled && setLoadedKey(key));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data,
    setData,
    error,
    /** true mientras se carga (incluida una recarga). */
    loading: key !== null && loadedKey !== key,
    /** true solo en la primera carga (sin datos todavía). */
    initialLoading: key !== null && loadedKey === null,
    reload,
  };
}
