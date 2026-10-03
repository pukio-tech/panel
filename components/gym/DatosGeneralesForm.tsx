"use client";

import { useState, type FormEvent } from "react";
import type { GymEmpresaDetalle, GymEmpresaInput } from "@/lib/gym-types";
import { gymApi, GYM_APP_URL } from "@/lib/gym-api";
import {
  validateEmail,
  validateRuc,
  validateSlug,
  validateTelefono,
} from "@/lib/gym-utils";
import { slugify } from "@/lib/utils";
import { changedFields, useForm } from "@/lib/hooks/useForm";
import { Alert, Button, Field, Input, useToast } from "@/components/ui";
import { errorMessage, PlanSelect, SectionCard } from "./shared";

function toForm(e: GymEmpresaDetalle) {
  return {
    nombre: e.nombre,
    slug: e.slug,
    razonSocial: e.razonSocial ?? "",
    ruc: e.ruc ?? "",
    direccion: e.direccion ?? "",
    telefono: e.telefono ?? "",
    email: e.email ?? "",
    plan: String(e.plan),
    mailFromName: e.mailFromName ?? "",
  };
}

type Values = ReturnType<typeof toForm>;
type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const errors: Errors = {
    nombre: v.nombre.trim() ? undefined : "El nombre es obligatorio.",
    slug: validateSlug(v.slug),
    ruc: validateRuc(v.ruc),
    telefono: validateTelefono(v.telefono),
    email: validateEmail(v.email.trim()),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e)) as Errors;
}

/**
 * Datos generales editables. Envía solo los campos modificados (PATCH).
 * El padre debe remontarlo (cambiando `key`) tras guardar para tomar los nuevos valores iniciales.
 */
export function DatosGeneralesForm({
  empresa,
  onSaved,
}: {
  empresa: GymEmpresaDetalle;
  onSaved: (empresa: GymEmpresaDetalle) => void;
}) {
  const toast = useToast();
  const [initial] = useState(() => toForm(empresa));
  const { values, setValue, setValues, bind } = useForm(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const diff = changedFields(initial, values);
  const dirty = Object.keys(diff).length > 0;
  const errors = submitted ? validate(values) : {};
  const slugChanged = values.slug !== initial.slug;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (!dirty) return;
    if (Object.keys(validate(values)).length > 0) {
      toast("Revisa los campos marcados.", "error");
      return;
    }
    const body: GymEmpresaInput = {};
    for (const [k, v] of Object.entries(diff) as [keyof Values, string][]) {
      const trimmed = v.trim();
      if (k === "nombre" || k === "slug") body[k] = trimmed;
      else if (k === "plan") body.plan = trimmed;
      else body[k] = trimmed === "" ? null : trimmed;
    }
    setSaving(true);
    try {
      const res = await gymApi.patch<{ data: GymEmpresaDetalle }>(`empresas/${empresa.id}`, body);
      toast("Datos generales actualizados.");
      onSaved(res.data);
    } catch (err) {
      setServerError(errorMessage(err, "No se pudieron guardar los cambios."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard title="Datos generales" description="Información de la empresa visible en su panel y catálogo.">
        <div className="space-y-5">
          {serverError && <Alert title="No se pudo guardar">{serverError}</Alert>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="g-nombre" required error={errors.nombre} className="sm:col-span-2">
              <Input
                id="g-nombre"
                value={values.nombre}
                aria-invalid={Boolean(errors.nombre) || undefined}
                onChange={bind("nombre")}
              />
            </Field>
            <Field
              label="Código"
              htmlFor="g-slug"
              required
              error={errors.slug}
              className="sm:col-span-2"
              hint={
                slugChanged ? (
                  <span className="text-amber-700">
                    Cambiar el código modifica las URLs de login y catálogo:{" "}
                    <span className="font-mono">{GYM_APP_URL}/catalogo/{values.slug || "…"}</span>
                  </span>
                ) : (
                  "Identificador en las URLs de login y catálogo."
                )
              }
            >
              <Input
                id="g-slug"
                className="font-mono"
                maxLength={40}
                value={values.slug}
                aria-invalid={Boolean(errors.slug) || undefined}
                onChange={(e) => setValue("slug", slugify(e.target.value, true))}
                onBlur={() => setValues((v) => ({ ...v, slug: v.slug.replace(/-+$/, "") }))}
              />
            </Field>
            <Field label="Razón social" htmlFor="g-razon" className="sm:col-span-2">
              <Input id="g-razon" value={values.razonSocial} onChange={bind("razonSocial")} />
            </Field>
            <Field label="RUC" htmlFor="g-ruc" error={errors.ruc}>
              <Input
                id="g-ruc"
                inputMode="numeric"
                maxLength={11}
                className="font-mono"
                value={values.ruc}
                aria-invalid={Boolean(errors.ruc) || undefined}
                onChange={(e) => setValue("ruc", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field
              label="Plan"
              htmlFor="g-plan"
              hint={
                values.plan !== initial.plan
                  ? "Los nuevos límites aplican de inmediato. Bajar de plan no elimina datos: solo impide agregar más."
                  : "Define el máximo de socios y usuarios activos."
              }
            >
              <PlanSelect id="g-plan" value={values.plan} onChange={(plan) => setValue("plan", plan)} disabled={saving} />
            </Field>
            <Field label="Dirección" htmlFor="g-direccion" className="sm:col-span-2">
              <Input id="g-direccion" value={values.direccion} onChange={bind("direccion")} />
            </Field>
            <Field label="Teléfono" htmlFor="g-telefono" error={errors.telefono}>
              <Input
                id="g-telefono"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                value={values.telefono}
                aria-invalid={Boolean(errors.telefono) || undefined}
                onChange={(e) => setValue("telefono", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field label="Correo electrónico" htmlFor="g-email" error={errors.email}>
              <Input
                id="g-email"
                type="email"
                value={values.email}
                aria-invalid={Boolean(errors.email) || undefined}
                onChange={bind("email")}
              />
            </Field>
            <Field
              label="Remitente de correos"
              htmlFor="g-mailfrom"
              className="sm:col-span-2"
              hint="Nombre que verán los socios en los correos enviados por el gimnasio."
            >
              <Input id="g-mailfrom" value={values.mailFromName} onChange={bind("mailFromName")} placeholder={values.nombre} />
            </Field>
          </div>
        </div>
      </SectionCard>
      <div className="sticky bottom-0 z-10 -mx-4 mt-3 flex items-center justify-end gap-2 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <span className="mr-auto text-[13px] text-muted">{dirty ? "Tienes cambios sin guardar." : "Sin cambios."}</span>
        <Button
          variant="secondary"
          disabled={!dirty || saving}
          onClick={() => {
            setValues(initial);
            setSubmitted(false);
            setServerError(null);
          }}
        >
          Descartar
        </Button>
        <Button type="submit" loading={saving} disabled={!dirty}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
