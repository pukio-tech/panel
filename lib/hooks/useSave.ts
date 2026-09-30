"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { MutationResponse } from "@/lib/types";
import { useToast } from "@/components/ui";

/**
 * Envía un POST (crear) o PATCH (editar), muestra toasts (incluidas las
 * advertencias del backend) y redirige al listado.
 */
export function useSave<T>({ endpoint, listPath }: { endpoint: string; listPath: string }) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(body: Record<string, unknown>, id?: string | number) {
    setError(null);
    setSaving(true);
    try {
      const res = id
        ? await api.patch<MutationResponse<T>>(`${endpoint}/${id}`, body)
        : await api.post<MutationResponse<T>>(endpoint, body);
      toast(res.message ?? "Guardado correctamente.");
      res.warnings?.forEach((w) => toast(w, "warning"));
      router.push(listPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return { save, saving, error, setError };
}
