"use client";

import { useState } from "react";
import { gymApi } from "@/lib/gym-api";
import { Alert, Button, Field, Input, Modal, useToast } from "@/components/ui";
import { errorMessage, SectionCard } from "./shared";

interface EmpresaBasica {
  id: number;
  nombre: string;
  slug: string;
}

/**
 * Confirmación para eliminar una empresa con todos sus datos. Exige escribir su código (slug),
 * igual que lo valida la API.
 */
export function EliminarEmpresaDialog({
  empresa,
  onClose,
  onDeleted,
}: {
  empresa: EmpresaBasica | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coincide = !!empresa && texto.trim() === empresa.slug;

  function cerrar() {
    if (eliminando) return;
    setTexto("");
    setError(null);
    onClose();
  }

  async function eliminar() {
    if (!empresa || !coincide) return;
    setError(null);
    setEliminando(true);
    try {
      await gymApi.delete(`empresas/${empresa.id}`, { confirmacion: texto.trim() });
      toast(`Empresa «${empresa.nombre}» eliminada.`);
      setTexto("");
      onDeleted();
    } catch (err) {
      setError(errorMessage(err, "No se pudo eliminar la empresa."));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Modal
      open={empresa !== null}
      onClose={cerrar}
      title={empresa ? `Eliminar «${empresa.nombre}»` : ""}
      description="Se borrarán definitivamente sus socios, membresías, ventas, caja, productos, usuarios, configuración e imágenes. No se puede deshacer."
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={eliminar} loading={eliminando} disabled={!coincide}>
            Eliminar definitivamente
          </Button>
        </>
      }
    >
      {empresa && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            eliminar();
          }}
        >
          {error && <Alert>{error}</Alert>}
          <Field
            label="Escribe el código de la empresa para confirmar"
            htmlFor="eliminar-confirmacion"
            hint={
              <>
                Código: <span className="font-mono text-ink">{empresa.slug}</span>
              </>
            }
          >
            <Input
              id="eliminar-confirmacion"
              className="font-mono"
              autoComplete="off"
              autoFocus
              value={texto}
              disabled={eliminando}
              onChange={(e) => setTexto(e.target.value)}
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}

/** Zona de peligro del detalle de la empresa. */
export function EliminarEmpresaCard({ empresa, onDeleted }: { empresa: EmpresaBasica; onDeleted: () => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <SectionCard
        title="Eliminar empresa"
        danger
        description="Para corregir altas por error. Borra la empresa con todos sus datos e imágenes. Si solo quieres bloquear el acceso, suspéndela."
        actions={
          <Button variant="danger" size="sm" onClick={() => setAbierto(true)}>
            Eliminar
          </Button>
        }
      >
        <p className="text-[13px] text-muted">Esta acción no se puede deshacer.</p>
      </SectionCard>
      <EliminarEmpresaDialog empresa={abierto ? empresa : null} onClose={() => setAbierto(false)} onDeleted={onDeleted} />
    </>
  );
}
