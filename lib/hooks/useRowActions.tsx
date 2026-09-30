"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { MutationResponse } from "@/lib/types";
import { ConfirmDialog, useToast } from "@/components/ui";

/**
 * Acciones comunes de fila para listados CRUD: activar/desactivar y eliminar
 * (con confirmación y toasts). Devuelve el diálogo para renderizarlo una vez.
 */
export function useRowActions<T extends { id: string | number }>({
  endpoint,
  activeField,
  getName,
  onDone,
}: {
  endpoint: string;
  /** Campo booleano que controla la visibilidad (isActive / isPublished). */
  activeField: "isActive" | "isPublished";
  getName: (row: T) => string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function toggleActive(row: T, next: boolean) {
    try {
      const res = await api.patch<MutationResponse<T>>(`${endpoint}/${row.id}`, {
        [activeField]: next,
      });
      toast(`${getName(row)} ${next ? "activado" : "desactivado"}.`);
      res.warnings?.forEach((w) => toast(w, "warning"));
      onDone();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoint}/${pendingDelete.id}`);
      toast(`${getName(pendingDelete)} eliminado.`);
      setPendingDelete(null);
      onDone();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const dialog = (
    <ConfirmDialog
      open={pendingDelete !== null}
      onCancel={() => setPendingDelete(null)}
      onConfirm={confirmDelete}
      loading={deleting}
      danger
      title="¿Eliminar registro?"
      description={
        pendingDelete && (
          <>
            Se eliminará <strong className="text-ink">{getName(pendingDelete)}</strong> de forma
            permanente. Esta acción no se puede deshacer.
          </>
        )
      }
      confirmLabel="Eliminar"
    />
  );

  return { toggleActive, askDelete: setPendingDelete, dialog };
}
