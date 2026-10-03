"use client";

import { useState, type FormEvent } from "react";
import type { GymPlanInput, GymPlanPlataforma } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatInt, formatPEN, PLAN_CODIGO_RE } from "@/lib/gym-utils";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  Menu,
  Modal,
  PageHeader,
  Switch,
  Textarea,
  useToast,
  type Column,
} from "@/components/ui";
import { LayersIcon, PlusIcon } from "@/components/icons";
import { errorMessage, PlanBadge, useGymPlanes } from "@/components/gym/shared";

interface Values {
  codigo: string;
  nombre: string;
  descripcion: string;
  precioMensual: string;
  maxSocios: string;
  maxUsuarios: string;
  activo: boolean;
}

const VACIO: Values = {
  codigo: "",
  nombre: "",
  descripcion: "",
  precioMensual: "0",
  maxSocios: "",
  maxUsuarios: "",
  activo: true,
};

function toValues(p: GymPlanPlataforma): Values {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    precioMensual: String(p.precioMensual),
    maxSocios: p.maxSocios == null ? "" : String(p.maxSocios),
    maxUsuarios: p.maxUsuarios == null ? "" : String(p.maxUsuarios),
    activo: p.activo,
  };
}

const limiteError = (v: string) => (v && !/^[1-9]\d*$/.test(v) ? "Número entero mayor a cero, o vacío para ilimitado." : undefined);

function validate(v: Values, nuevo: boolean) {
  const precio = Number(v.precioMensual);
  const errors = {
    codigo: nuevo && !PLAN_CODIGO_RE.test(v.codigo) ? "2 a 30 caracteres: mayúsculas, números y guion bajo." : undefined,
    nombre: v.nombre.trim().length < 2 ? "Ingresa el nombre del plan." : undefined,
    precioMensual:
      v.precioMensual.trim() === "" || !Number.isFinite(precio) || precio < 0 || precio > 100000
        ? "Precio entre 0 y 100 000."
        : undefined,
    maxSocios: limiteError(v.maxSocios),
    maxUsuarios: limiteError(v.maxUsuarios),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e)) as Partial<Record<keyof Values, string>>;
}

const limite = (v: string) => (v ? Number(v) : null);
const textoLimite = (n: number | null) => (n == null ? <span className="text-muted">Ilimitado</span> : formatInt(n));

export default function GymPlanesPage() {
  const toast = useToast();
  const { planes, error, initialLoading, loading, reload } = useGymPlanes();
  // null = cerrado; plan = editar; "nuevo" = crear
  const [editando, setEditando] = useState<GymPlanPlataforma | "nuevo" | null>(null);
  const [values, setValues] = useState<Values>(VACIO);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const nuevo = editando === "nuevo";
  const errors = submitted ? validate(values, nuevo) : {};
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((prev) => ({ ...prev, [k]: v }));

  function abrir(plan: GymPlanPlataforma | "nuevo") {
    setValues(plan === "nuevo" ? VACIO : toValues(plan));
    setSubmitted(false);
    setServerError(null);
    setEditando(plan);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSubmitted(true);
    if (Object.keys(validate(values, nuevo)).length > 0) return;
    const body: GymPlanInput = {
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || null,
      precioMensual: Number(values.precioMensual),
      maxSocios: limite(values.maxSocios),
      maxUsuarios: limite(values.maxUsuarios),
      activo: values.activo,
    };
    setServerError(null);
    setSaving(true);
    try {
      if (editando === "nuevo") {
        await gymApi.post("planes", { ...body, codigo: values.codigo });
        toast(`Plan «${body.nombre}» creado.`);
      } else {
        await gymApi.patch(`planes/${editando.id}`, body);
        toast(`Plan «${body.nombre}» actualizado.`);
      }
      setEditando(null);
      reload();
    } catch (err) {
      setServerError(errorMessage(err, "No se pudo guardar el plan."));
    } finally {
      setSaving(false);
    }
  }

  async function cambiarActivo(p: GymPlanPlataforma) {
    setToggling(p.id);
    try {
      await gymApi.patch(`planes/${p.id}`, { activo: !p.activo });
      toast(p.activo ? `Plan «${p.nombre}» desactivado.` : `Plan «${p.nombre}» activado.`);
      reload();
    } catch (err) {
      toast(errorMessage(err, "No se pudo cambiar el estado del plan."), "error");
    } finally {
      setToggling(null);
    }
  }

  const columns: Column<GymPlanPlataforma>[] = [
    {
      key: "plan",
      header: "Plan",
      cell: (p) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PlanBadge plan={p.codigo} nombre={p.nombre} />
            <span className="font-mono text-xs text-muted">{p.codigo}</span>
          </div>
          {p.descripcion && <p className="mt-1 max-w-md truncate text-xs text-muted">{p.descripcion}</p>}
        </div>
      ),
    },
    {
      key: "precio",
      header: "Precio mensual",
      align: "right",
      className: "whitespace-nowrap tabular-nums",
      cell: (p) => formatPEN(p.precioMensual),
    },
    { key: "socios", header: "Máx. socios", align: "right", className: "tabular-nums", cell: (p) => textoLimite(p.maxSocios) },
    {
      key: "usuarios",
      header: "Máx. usuarios",
      align: "right",
      hideOnMobile: true,
      className: "tabular-nums",
      cell: (p) => textoLimite(p.maxUsuarios),
    },
    {
      key: "empresas",
      header: "Empresas",
      align: "right",
      hideOnMobile: true,
      className: "tabular-nums",
      cell: (p) => formatInt(p.empresas),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (p) =>
        p.activo ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Inactivo
          </Badge>
        ),
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (p) => (
        <Menu
          label={`Acciones del plan ${p.nombre}`}
          items={[
            { label: "Editar", onSelect: () => abrir(p) },
            {
              label: p.activo ? "Desactivar" : "Activar",
              danger: p.activo,
              disabled: toggling === p.id,
              hint: p.activo && p.empresas > 0 ? "Las empresas que lo usan lo conservan" : undefined,
              onSelect: () => cambiarActivo(p),
            },
          ]}
        />
      ),
    },
  ];

  const botonNuevo = (
    <Button onClick={() => abrir("nuevo")}>
      <PlusIcon width={16} height={16} /> Nuevo plan
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Planes"
        subtitle="Catálogo de planes de Gym Manager: precio y límites de socios y usuarios activos por empresa."
        actions={botonNuevo}
      />

      {error && (
        <div className="mb-4">
          <Alert
            action={
              <Button variant="secondary" size="sm" onClick={reload} loading={loading}>
                Reintentar
              </Button>
            }
          >
            {error.message}
          </Alert>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={planes}
        rowKey={(p) => p.id}
        loading={initialLoading}
        onRowClick={(p) => abrir(p)}
        empty={
          <EmptyState
            icon={<LayersIcon />}
            title="Aún no hay planes"
            description="Crea un plan para asignarlo a las empresas."
            action={botonNuevo}
          />
        }
      />

      <p className="mt-4 text-[13px] text-muted">
        Desactivar un plan solo impide asignarlo a nuevas empresas. Bajar un límite no elimina datos: la empresa no podrá
        crear ni reactivar socios o usuarios hasta estar por debajo del máximo.
      </p>

      <Modal
        open={editando !== null}
        onClose={() => !saving && setEditando(null)}
        size="lg"
        title={nuevo ? "Nuevo plan" : `Editar plan · ${editando ? editando.nombre : ""}`}
        description={
          !nuevo && editando && editando.empresas > 0
            ? `Lo usan ${formatInt(editando.empresas)} empresa${editando.empresas === 1 ? "" : "s"}: los cambios de límites aplican de inmediato.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditando(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="gym-plan-form" loading={saving}>
              {nuevo ? "Crear plan" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form id="gym-plan-form" onSubmit={guardar} noValidate className="space-y-5">
          {serverError && <Alert>{serverError}</Alert>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Código"
              htmlFor="p-codigo"
              required={nuevo}
              error={errors.codigo}
              hint={nuevo ? "Identificador fijo (ej. PRO_ANUAL). No se puede cambiar después." : "El código no se puede cambiar."}
            >
              <Input
                id="p-codigo"
                className="font-mono"
                maxLength={30}
                value={values.codigo}
                disabled={!nuevo}
                aria-invalid={Boolean(errors.codigo) || undefined}
                onChange={(e) => set("codigo", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              />
            </Field>
            <Field label="Nombre" htmlFor="p-nombre" required error={errors.nombre}>
              <Input
                id="p-nombre"
                maxLength={100}
                value={values.nombre}
                aria-invalid={Boolean(errors.nombre) || undefined}
                placeholder="Ej. Pro anual"
                onChange={(e) => set("nombre", e.target.value)}
              />
            </Field>
            <Field label="Descripción" htmlFor="p-descripcion" className="sm:col-span-2">
              <Textarea
                id="p-descripcion"
                rows={2}
                maxLength={255}
                value={values.descripcion}
                onChange={(e) => set("descripcion", e.target.value)}
              />
            </Field>
            <Field label="Precio mensual (S/)" htmlFor="p-precio" required error={errors.precioMensual}>
              <Input
                id="p-precio"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                className="tabular-nums"
                value={values.precioMensual}
                aria-invalid={Boolean(errors.precioMensual) || undefined}
                onChange={(e) => set("precioMensual", e.target.value)}
              />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Máximo de socios activos" htmlFor="p-socios" error={errors.maxSocios} hint="Vacío = ilimitado.">
              <Input
                id="p-socios"
                inputMode="numeric"
                className="tabular-nums"
                value={values.maxSocios}
                placeholder="Ilimitado"
                aria-invalid={Boolean(errors.maxSocios) || undefined}
                onChange={(e) => set("maxSocios", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field label="Máximo de usuarios activos" htmlFor="p-usuarios" error={errors.maxUsuarios} hint="Vacío = ilimitado.">
              <Input
                id="p-usuarios"
                inputMode="numeric"
                className="tabular-nums"
                value={values.maxUsuarios}
                placeholder="Ilimitado"
                aria-invalid={Boolean(errors.maxUsuarios) || undefined}
                onChange={(e) => set("maxUsuarios", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Switch
                id="p-activo"
                checked={values.activo}
                onChange={(v) => set("activo", v)}
                label="Plan activo"
                description="Solo los planes activos se pueden asignar a empresas."
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
