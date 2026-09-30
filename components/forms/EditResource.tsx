"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useApiData } from "@/lib/hooks/useApiData";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { FormLoading } from "./FormShell";

/** Carga `${endpoint}/:id` y entrega el registro al formulario de edición. */
export function EditResource<T>({
  endpoint,
  listPath,
  listLabel,
  title,
  subtitle,
  children,
}: {
  endpoint: string;
  listPath: string;
  listLabel: string;
  title: (item: T) => string;
  subtitle?: (item: T) => ReactNode;
  children: (item: T) => ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading } = useApiData<T>(id ? `${endpoint}/${id}` : null);

  return (
    <>
      <PageHeader
        title={data ? title(data) : "Editar"}
        subtitle={data && subtitle?.(data)}
        back={{ href: listPath, label: listLabel }}
      />
      {loading ? (
        <FormLoading />
      ) : error || !data ? (
        <Alert action={<ButtonLink href={listPath} variant="secondary" size="sm">Volver</ButtonLink>}>
          {error ?? "Registro no encontrado."}
        </Alert>
      ) : (
        children(data)
      )}
    </>
  );
}
