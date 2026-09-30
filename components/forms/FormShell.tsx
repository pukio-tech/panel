"use client";

import type { FormEvent, ReactNode } from "react";
import { Alert, Button, ButtonLink, Card, Spinner } from "@/components/ui";

/**
 * Contenedor estándar de formularios CRUD: errores, aviso de origen,
 * secciones y barra de acciones fija al pie.
 */
export function FormShell({
  onSubmit,
  error,
  notice,
  saving,
  submitLabel,
  cancelHref,
  children,
}: {
  onSubmit: () => void;
  error?: string | null;
  notice?: ReactNode;
  saving?: boolean;
  submitLabel: string;
  cancelHref: string;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {error && <Alert title="No se pudo guardar">{error}</Alert>}
      {notice}
      <Card className="px-6 py-8 sm:px-8">{children}</Card>
      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <ButtonLink href={cancelHref} variant="secondary">
          Cancelar
        </ButtonLink>
        <Button type="submit" loading={saving}>
          {saving ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Aviso para registros que vienen de un proceso de importación/scraping. */
export function ImportedNotice({ source, fields }: { source: string; fields: string }) {
  return (
    <Alert tone="warning" title={`Registro importado desde ${source}`}>
      {fields} se sobrescriben en cada actualización automática. Los cambios en el resto de
      campos (y la activación) se conservan.
    </Alert>
  );
}

export function FormLoading() {
  return (
    <Card className="flex items-center justify-center py-24 text-muted">
      <Spinner className="h-5 w-5" />
    </Card>
  );
}
