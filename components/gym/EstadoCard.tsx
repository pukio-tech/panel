"use client";

import { useState } from "react";
import type { GymEmpresaDetalle } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatDateTime } from "@/lib/gym-utils";
import { Alert, Badge, Button, Field, Modal, Textarea, useToast } from "@/components/ui";
import { errorMessage, SectionCard } from "./shared";

const MAX_MOTIVO = 255;

/** Suspender / reactivar la empresa (con motivo) y su historial de estados. */
export function EstadoCard({
  empresa,
  onSaved,
}: {
  empresa: GymEmpresaDetalle;
  onSaved: (empresa: GymEmpresaDetalle) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const suspender = empresa.activo;
  const motivoError = submitted && suspender && !motivo.trim() ? "Indica el motivo de la suspensión." : undefined;

  function abrir() {
    setMotivo("");
    setSubmitted(false);
    setServerError(null);
    setOpen(true);
  }

  async function confirmar() {
    setSubmitted(true);
    if (suspender && !motivo.trim()) return;
    setServerError(null);
    setSaving(true);
    try {
      const res = await gymApi.patch<{ data: GymEmpresaDetalle }>(`empresas/${empresa.id}`, {
        activo: !suspender,
        motivoSuspension: motivo.trim() || null,
      });
      toast(suspender ? `«${empresa.nombre}» fue suspendida.` : `«${empresa.nombre}» fue reactivada.`);
      setOpen(false);
      onSaved(res.data);
    } catch (err) {
      setServerError(errorMessage(err, "No se pudo cambiar el estado."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionCard
        title="Estado de la cuenta"
        danger={suspender}
        description={
          suspender
            ? "Suspender bloquea el ingreso de todos sus usuarios y oculta su catálogo público. Los datos se conservan."
            : "La empresa está suspendida: nadie puede ingresar y su catálogo no es visible."
        }
        actions={
          <Button variant={suspender ? "danger" : "primary"} size="sm" onClick={abrir}>
            {suspender ? "Suspender" : "Reactivar"}
          </Button>
        }
      >
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Historial</h3>
        {empresa.historialEstado.length === 0 ? (
          <p className="text-sm text-muted">Sin cambios de estado registrados.</p>
        ) : (
          <ol className="space-y-3">
            {empresa.historialEstado.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${h.activo ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge tone={h.activo ? "success" : "danger"}>{h.activo ? "Activa" : "Suspendida"}</Badge>
                    <span className="text-xs text-muted">{formatDateTime(h.fecha)}</span>
                  </p>
                  {h.motivo && <p className="mt-1 break-words text-ink">{h.motivo}</p>}
                  <p className="mt-0.5 truncate text-xs text-subtle">por {h.usuario}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={suspender ? `Suspender «${empresa.nombre}»` : `Reactivar «${empresa.nombre}»`}
        description={
          suspender
            ? "Sus usuarios no podrán iniciar sesión y el catálogo público quedará oculto hasta que la reactives."
            : "Sus usuarios podrán volver a ingresar y el catálogo público volverá a estar visible."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant={suspender ? "danger" : "primary"} onClick={confirmar} loading={saving}>
              {suspender ? "Suspender empresa" : "Reactivar empresa"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {serverError && <Alert>{serverError}</Alert>}
          <Field
            label={suspender ? "Motivo de la suspensión" : "Comentario"}
            htmlFor="estado-motivo"
            required={suspender}
            error={motivoError}
            hint={suspender ? "Se mostrará a los usuarios del gimnasio al intentar ingresar." : "Opcional. Queda en el historial."}
          >
            <Textarea
              id="estado-motivo"
              rows={3}
              maxLength={MAX_MOTIVO}
              value={motivo}
              aria-invalid={Boolean(motivoError) || undefined}
              placeholder={suspender ? "Ej. Falta de pago del mes de octubre" : "Ej. Pago regularizado"}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
