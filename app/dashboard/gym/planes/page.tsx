"use client";

import { useState, type FormEvent } from "react";
import type { GymModuloCodigo, GymPlanInput, GymPlanPlataforma } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatInt, formatPEN, GYM_MODULOS, PLAN_CODIGO_RE } from "@/lib/gym-utils";
import { cn } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Menu,
  Modal,
  PageHeader,
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { CheckIcon, LayersIcon, PlusIcon } from "@/components/icons";
import { errorMessage, useGymPlanes } from "@/components/gym/shared";

interface Values {
  codigo: string;
  nombre: string;
  descripcion: string;
  precioMensual: string;
  precioImplementacion: string;
  maxSocios: string;
  maxUsuarios: string;
  consultasMes: string;
  soporte: string;
  orden: string;
  destacado: boolean;
  activo: boolean;
  modulos: GymModuloCodigo[];
  /** Una característica por línea */
  caracteristicas: string;
}

const VACIO: Values = {
  codigo: "",
  nombre: "",
  descripcion: "",
  precioMensual: "0",
  precioImplementacion: "0",
  maxSocios: "",
  maxUsuarios: "",
  consultasMes: "",
  soporte: "",
  orden: "0",
  destacado: false,
  activo: true,
  modulos: [],
  caracteristicas: "",
};

const numeroOVacio = (n: number | null) => (n == null ? "" : String(n));

function toValues(p: GymPlanPlataforma): Values {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    precioMensual: String(p.precioMensual),
    precioImplementacion: String(p.precioImplementacion ?? 0),
    maxSocios: numeroOVacio(p.maxSocios),
    maxUsuarios: numeroOVacio(p.maxUsuarios),
    consultasMes: numeroOVacio(p.consultasMes),
    soporte: p.soporte ?? "",
    orden: String(p.orden ?? 0),
    destacado: p.destacado,
    activo: p.activo,
    modulos: p.modulos ?? [],
    caracteristicas: (p.caracteristicas ?? []).join("\n"),
  };
}

const limiteError = (v: string) => (v && !/^[1-9]\d*$/.test(v) ? "Entero mayor a cero, o vacío para ilimitado." : undefined);
const precioError = (v: string) => {
  const n = Number(v);
  return v.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100000 ? "Precio entre 0 y 100 000." : undefined;
};

function validate(v: Values, nuevo: boolean) {
  const errors = {
    codigo: nuevo && !PLAN_CODIGO_RE.test(v.codigo) ? "2 a 30 caracteres: mayúsculas, números y guion bajo." : undefined,
    nombre: v.nombre.trim().length < 2 ? "Ingresa el nombre del plan." : undefined,
    precioMensual: precioError(v.precioMensual),
    precioImplementacion: precioError(v.precioImplementacion),
    maxSocios: limiteError(v.maxSocios),
    maxUsuarios: limiteError(v.maxUsuarios),
    consultasMes: limiteError(v.consultasMes),
    orden: /^\d{1,4}$/.test(v.orden) ? undefined : "Número de 0 a 1000.",
  };
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e)) as Partial<Record<keyof Values, string>>;
}

const limite = (v: string) => (v ? Number(v) : null);
const lineas = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/* ------------------------------------------------------------------ */
/* Tarjeta de plan                                                     */
/* ------------------------------------------------------------------ */

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}

const ilimitado = (n: number | null) => (n == null ? "Ilimitados" : formatInt(n));

function PlanCard({
  plan,
  onEditar,
  onCambiarActivo,
  cambiando,
}: {
  plan: GymPlanPlataforma;
  onEditar: () => void;
  onCambiarActivo: () => void;
  cambiando: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border bg-surface",
        plan.destacado ? "border-ink shadow-[0_8px_24px_rgba(0,0,0,0.06)]" : "border-line",
        !plan.activo && "opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">{plan.nombre}</h2>
            {plan.destacado && <Badge tone="info">Recomendado</Badge>}
            {!plan.activo && <Badge tone="neutral">Inactivo</Badge>}
          </div>
          <p className="mt-0.5 font-mono text-xs text-subtle">{plan.codigo}</p>
        </div>
        <Menu
          label={`Acciones del plan ${plan.nombre}`}
          items={[
            { label: "Editar", onSelect: onEditar },
            {
              label: plan.activo ? "Desactivar" : "Activar",
              danger: plan.activo,
              disabled: cambiando,
              hint: plan.activo && plan.empresas > 0 ? "Las empresas que lo usan lo conservan" : undefined,
              onSelect: onCambiarActivo,
            },
          ]}
        />
      </header>

      <div className="px-5 pt-4">
        <p className="flex items-baseline gap-1">
          <span className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">
            {formatPEN(plan.precioMensual)}
          </span>
          <span className="text-sm text-muted">/mes</span>
        </p>
        <p className="mt-1.5 text-[13px] text-muted">
          {plan.precioImplementacion > 0 ? `+ ${formatPEN(plan.precioImplementacion)} de implementación` : "Sin costo de implementación"}
          {" · sin IGV"}
        </p>
        {plan.descripcion && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{plan.descripcion}</p>}
      </div>

      <dl className="mx-5 mt-4 grid grid-cols-3 gap-3 rounded-lg bg-canvas px-3 py-3">
        <Dato label="Socios" value={ilimitado(plan.maxSocios)} />
        <Dato label="Usuarios" value={ilimitado(plan.maxUsuarios)} />
        <Dato label="Consultas/mes" value={plan.consultasMes == null ? "—" : formatInt(plan.consultasMes)} />
      </dl>

      <div className="px-5 pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Módulos</h3>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {GYM_MODULOS.map((m) => {
            const incluido = plan.modulos.includes(m.codigo);
            return (
              <li key={m.codigo} className={cn("flex items-center gap-1.5 text-[13px]", incluido ? "text-ink" : "text-subtle line-through")}>
                {incluido ? (
                  <CheckIcon width={14} height={14} className="shrink-0 text-emerald-600" />
                ) : (
                  <span aria-hidden="true" className="inline-block h-px w-3.5 shrink-0 bg-line-strong" />
                )}
                <span className="truncate">{m.corto}</span>
                <span className="sr-only">{incluido ? "incluido" : "no incluido"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {plan.caracteristicas.length > 0 && (
        <div className="px-5 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Incluye</h3>
          <ul className="mt-2 space-y-1.5">
            {plan.caracteristicas.map((c) => (
              <li key={c} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                <CheckIcon width={14} height={14} className="mt-0.5 shrink-0 text-muted" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empuja el pie al fondo para alinear tarjetas de distinta altura */}
      <div className="min-h-5 flex-1" />
      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <div className="min-w-0 text-[13px] text-muted">
          <p className="truncate">{plan.soporte ?? "Soporte estándar"}</p>
          <p className="tabular-nums">
            {formatInt(plan.empresas)} empresa{plan.empresas === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onEditar}>
          Editar
        </Button>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

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
      precioImplementacion: Number(values.precioImplementacion),
      maxSocios: limite(values.maxSocios),
      maxUsuarios: limite(values.maxUsuarios),
      consultasMes: limite(values.consultasMes),
      soporte: values.soporte.trim() || null,
      orden: Number(values.orden),
      destacado: values.destacado,
      activo: values.activo,
      modulos: values.modulos,
      caracteristicas: lineas(values.caracteristicas),
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

  const botonNuevo = (
    <Button onClick={() => abrir("nuevo")}>
      <PlusIcon width={16} height={16} /> Nuevo plan
    </Button>
  );

  const editandoPlan = editando && editando !== "nuevo" ? editando : null;

  return (
    <>
      <PageHeader
        title="Planes"
        subtitle="Qué incluye cada plan: precio, implementación, límites, módulos y soporte."
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

      {initialLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[520px] w-full rounded-xl" />
          ))}
        </div>
      ) : planes.length === 0 ? (
        <EmptyState
          icon={<LayersIcon />}
          title="Aún no hay planes"
          description="Crea un plan para asignarlo a las empresas."
          action={botonNuevo}
        />
      ) : (
        <div className="ui-stagger grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {planes.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onEditar={() => abrir(p)}
              onCambiarActivo={() => cambiarActivo(p)}
              cambiando={toggling === p.id}
            />
          ))}
        </div>
      )}

      <p className="mt-5 text-[13px] leading-relaxed text-muted">
        Precios sin IGV. Desactivar un plan solo impide asignarlo a nuevas empresas. Quitar un módulo o bajar un límite
        afecta de inmediato a las empresas del plan (sin borrar datos); a una empresa concreta se le puede activar o
        desactivar un módulo desde su pestaña Módulos.
      </p>

      <Modal
        open={editando !== null}
        onClose={() => !saving && setEditando(null)}
        size="lg"
        title={nuevo ? "Nuevo plan" : `Editar plan · ${editandoPlan?.nombre ?? ""}`}
        description={
          editandoPlan && editandoPlan.empresas > 0
            ? `Lo usan ${formatInt(editandoPlan.empresas)} empresa${editandoPlan.empresas === 1 ? "" : "s"}: los cambios de límites y módulos aplican de inmediato.`
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
        <form id="gym-plan-form" onSubmit={guardar} noValidate className="max-h-[65vh] space-y-6 overflow-y-auto pr-1 scroll-thin">
          {serverError && <Alert>{serverError}</Alert>}

          <section className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Código"
              htmlFor="p-codigo"
              required={nuevo}
              error={errors.codigo}
              hint={nuevo ? "Fijo (ej. PRO_ANUAL). No se puede cambiar después." : "El código no se puede cambiar."}
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
                placeholder="Ej. Pro"
                onChange={(e) => set("nombre", e.target.value)}
              />
            </Field>
            <Field label="Descripción" htmlFor="p-descripcion" className="sm:col-span-2">
              <Input
                id="p-descripcion"
                maxLength={255}
                value={values.descripcion}
                placeholder="Una línea que resuma el plan"
                onChange={(e) => set("descripcion", e.target.value)}
              />
            </Field>
          </section>

          <section>
            <h3 className="mb-3 text-[13px] font-semibold text-ink">Precios (sin IGV)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mensualidad (S/)" htmlFor="p-precio" required error={errors.precioMensual}>
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
              <Field label="Implementación, pago único (S/)" htmlFor="p-setup" error={errors.precioImplementacion}>
                <Input
                  id="p-setup"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="tabular-nums"
                  value={values.precioImplementacion}
                  aria-invalid={Boolean(errors.precioImplementacion) || undefined}
                  onChange={(e) => set("precioImplementacion", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[13px] font-semibold text-ink">Límites</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["maxSocios", "Socios activos", "p-socios"],
                  ["maxUsuarios", "Usuarios activos", "p-usuarios"],
                  ["consultasMes", "Consultas DNI/RUC por mes", "p-consultas"],
                ] as const
              ).map(([campo, label, id]) => (
                <Field key={campo} label={label} htmlFor={id} error={errors[campo]} hint="Vacío = ilimitado.">
                  <Input
                    id={id}
                    inputMode="numeric"
                    className="tabular-nums"
                    value={values[campo]}
                    placeholder="Ilimitado"
                    aria-invalid={Boolean(errors[campo]) || undefined}
                    onChange={(e) => set(campo, e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-semibold text-ink">Módulos incluidos</h3>
            <p className="mb-3 mt-0.5 text-xs text-muted">El núcleo (socios, acceso, suscripciones, POS, inventario y caja) está en todos los planes.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GYM_MODULOS.map((m) => {
                const marcado = values.modulos.includes(m.codigo);
                return (
                  <label
                    key={m.codigo}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 transition-[border-color,background-color] duration-150",
                      marcado ? "border-ink bg-surface-muted" : "border-line hover:border-line-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={marcado}
                      onChange={(e) =>
                        set(
                          "modulos",
                          e.target.checked ? [...values.modulos, m.codigo] : values.modulos.filter((x) => x !== m.codigo),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{m.nombre}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">{m.descripcion}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4">
            <Field label="Soporte" htmlFor="p-soporte" hint="Ej. Prioritario por WhatsApp / ticket.">
              <Input id="p-soporte" maxLength={150} value={values.soporte} onChange={(e) => set("soporte", e.target.value)} />
            </Field>
            <Field
              label="Qué incluye"
              htmlFor="p-caracteristicas"
              hint={`Una característica por línea (${lineas(values.caracteristicas).length}/30). Se muestran en la tarjeta del plan.`}
            >
              <Textarea
                id="p-caracteristicas"
                rows={5}
                value={values.caracteristicas}
                placeholder={"Hasta 500 socios y 10 usuarios\nFacturación electrónica SUNAT\nTienda online y catálogo"}
                onChange={(e) => set("caracteristicas", e.target.value)}
              />
            </Field>
          </section>

          <section className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-4">
              <Switch
                id="p-destacado"
                checked={values.destacado}
                onChange={(v) => set("destacado", v)}
                label="Plan recomendado"
                description="Se resalta en el catálogo de planes."
              />
              <Switch
                id="p-activo"
                checked={values.activo}
                onChange={(v) => set("activo", v)}
                label="Plan activo"
                description="Solo los planes activos se pueden asignar a empresas."
              />
            </div>
            <Field label="Orden" htmlFor="p-orden" error={errors.orden} hint="Menor primero.">
              <Input
                id="p-orden"
                inputMode="numeric"
                className="tabular-nums"
                value={values.orden}
                onChange={(e) => set("orden", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </section>
        </form>
      </Modal>
    </>
  );
}
