"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GymEmpresaDetalle, GymNuevaEmpresa } from "@/lib/gym-types";
import { gymApi, GYM_APP_URL } from "@/lib/gym-api";
import {
  PASSWORD_HINT,
  validateEmail,
  validatePassword,
  validatePin,
  validateRuc,
  validateSlug,
  validateTelefono,
  validateUsername,
} from "@/lib/gym-utils";
import { slugify } from "@/lib/utils";
import { useForm } from "@/lib/hooks/useForm";
import { Field, FormSection, Input, PageHeader, useToast } from "@/components/ui";
import { FormShell } from "@/components/forms/FormShell";
import { errorMessage, GYM_EMPRESAS, LogoUpload, PasswordInput, PlanSelect } from "@/components/gym/shared";

const slugFrom = (nombre: string) => slugify(nombre).slice(0, 40).replace(/-+$/, "");
/** Usuario sugerido: único en toda la plataforma (el login solo pide usuario y contraseña). */
const usuarioFrom = (nombre: string) => {
  const base = slugFrom(nombre).replace(/-/g, "").slice(0, 30);
  return base ? `admin.${base}` : "";
};

const INITIAL = {
  nombre: "",
  slug: "",
  razonSocial: "",
  ruc: "",
  direccion: "",
  telefono: "",
  email: "",
  plan: "BASICO",
  username: "",
  password: "",
  pin: "",
};

type Values = typeof INITIAL;
type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const errors: Errors = {
    nombre: v.nombre.trim() ? undefined : "El nombre es obligatorio.",
    slug: validateSlug(v.slug),
    ruc: validateRuc(v.ruc),
    telefono: validateTelefono(v.telefono),
    email: validateEmail(v.email.trim()),
    username: validateUsername(v.username),
    password: validatePassword(v.password),
    pin: validatePin(v.pin),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e)) as Errors;
}

export default function NuevaGymEmpresaPage() {
  const router = useRouter();
  const toast = useToast();
  const { values, setValue, setValues, bind } = useForm(INITIAL);
  const [slugEdited, setSlugEdited] = useState(false);
  const [usuarioEditado, setUsuarioEditado] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = submitted ? validate(values) : {};
  const slugPreview = values.slug.replace(/-+$/, "") || "codigo";

  async function submit() {
    setSubmitted(true);
    setServerError(null);
    const slug = values.slug.replace(/-+$/, "");
    const current = { ...values, slug };
    if (slug !== values.slug) setValue("slug", slug);
    const found = validate(current);
    if (Object.keys(found).length > 0) {
      toast("Revisa los campos marcados.", "error");
      return;
    }

    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    const body: GymNuevaEmpresa = {
      nombre: values.nombre.trim(),
      slug,
      razonSocial: opt(values.razonSocial),
      ruc: opt(values.ruc),
      direccion: opt(values.direccion),
      telefono: opt(values.telefono),
      email: opt(values.email),
      plan: values.plan,
      logoUrl: logoUrl ?? undefined,
      admin: { username: values.username, password: values.password, pin: values.pin || undefined },
    };

    setSaving(true);
    try {
      const res = await gymApi.post<{ data: GymEmpresaDetalle }>("empresas", body);
      toast(`Empresa «${res.data.nombre}» creada con su administrador.`);
      router.push(`${GYM_EMPRESAS}/${res.data.id}`);
    } catch (err) {
      setServerError(errorMessage(err, "No se pudo crear la empresa."));
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <>
      <PageHeader
        title="Nueva empresa"
        subtitle="Registra un gimnasio en Gym Manager junto con su usuario administrador inicial."
        back={{ href: GYM_EMPRESAS, label: "Empresas" }}
      />
      <FormShell
        onSubmit={submit}
        error={serverError}
        saving={saving}
        submitLabel="Crear empresa"
        cancelHref={GYM_EMPRESAS}
      >
        <FormSection
          title="Datos de la empresa"
          description="El código identifica a la empresa en el login y en su catálogo público."
        >
          <Field label="Nombre" htmlFor="nombre" required error={errors.nombre} className="sm:col-span-2">
            <Input
              id="nombre"
              value={values.nombre}
              autoFocus
              aria-invalid={Boolean(errors.nombre) || undefined}
              placeholder="Ej. Titan Gym Miraflores"
              onChange={(e) => {
                const nombre = e.target.value;
                setValues((v) => ({
                  ...v,
                  nombre,
                  slug: slugEdited ? v.slug : slugFrom(nombre),
                  username: usuarioEditado ? v.username : usuarioFrom(nombre),
                }));
              }}
            />
          </Field>
          <Field
            label="Código"
            htmlFor="slug"
            required
            error={errors.slug}
            className="sm:col-span-2"
            hint={
              <div className="space-y-0.5">
                <p>
                  Login:{" "}
                  <span className="break-all font-mono text-ink-soft">
                    {GYM_APP_URL}/login?empresa={slugPreview}
                  </span>
                </p>
                <p>
                  Catálogo:{" "}
                  <span className="break-all font-mono text-ink-soft">
                    {GYM_APP_URL}/catalogo/{slugPreview}
                  </span>
                </p>
              </div>
            }
          >
            <Input
              id="slug"
              className="font-mono"
              maxLength={40}
              value={values.slug}
              aria-invalid={Boolean(errors.slug) || undefined}
              placeholder="titan-gym"
              onChange={(e) => {
                setSlugEdited(true);
                setValue("slug", slugify(e.target.value, true));
              }}
              trailing={
                slugEdited ? (
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-hover hover:text-ink"
                    onClick={() => {
                      setSlugEdited(false);
                      setValue("slug", slugFrom(values.nombre));
                    }}
                  >
                    Auto
                  </button>
                ) : (
                  <span />
                )
              }
            />
          </Field>
          <Field label="Razón social" htmlFor="razonSocial" className="sm:col-span-2">
            <Input id="razonSocial" value={values.razonSocial} onChange={bind("razonSocial")} />
          </Field>
          <Field label="RUC" htmlFor="ruc" error={errors.ruc} hint="11 dígitos. Empieza con 10 o 20.">
            <Input
              id="ruc"
              inputMode="numeric"
              maxLength={11}
              className="font-mono"
              value={values.ruc}
              aria-invalid={Boolean(errors.ruc) || undefined}
              onChange={(e) => setValue("ruc", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Plan" htmlFor="plan" hint="Define el máximo de socios y usuarios activos.">
            <PlanSelect id="plan" value={values.plan} onChange={(plan) => setValue("plan", plan)} disabled={saving} />
          </Field>
          <Field label="Dirección" htmlFor="direccion" className="sm:col-span-2">
            <Input id="direccion" value={values.direccion} onChange={bind("direccion")} />
          </Field>
          <Field label="Teléfono" htmlFor="telefono" error={errors.telefono} hint="9 dígitos.">
            <Input
              id="telefono"
              type="tel"
              inputMode="numeric"
              maxLength={9}
              value={values.telefono}
              aria-invalid={Boolean(errors.telefono) || undefined}
              onChange={(e) => setValue("telefono", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="email" error={errors.email}>
            <Input
              id="email"
              type="email"
              value={values.email}
              aria-invalid={Boolean(errors.email) || undefined}
              onChange={bind("email")}
            />
          </Field>
        </FormSection>

        <FormSection title="Logo" description="Se muestra en el panel del gimnasio, en su catálogo y en comprobantes.">
          <div className="sm:col-span-2">
            <LogoUpload value={logoUrl} nombre={values.nombre} onChange={setLogoUrl} disabled={saving} />
          </div>
        </FormSection>

        <FormSection
          title="Administrador inicial"
          description="Usuario con rol ADMINISTRADOR para que el gimnasio gestione su cuenta. Comparte las credenciales de forma segura."
        >
          <Field
            label="Usuario"
            htmlFor="username"
            required
            error={errors.username}
            hint="Único en toda la plataforma: con él y la contraseña se ingresa (sin código de gimnasio)."
          >
            <Input
              id="username"
              autoComplete="off"
              value={values.username}
              placeholder="admin.titangym"
              aria-invalid={Boolean(errors.username) || undefined}
              onChange={(e) => {
                setUsuarioEditado(true);
                setValue("username", e.target.value);
              }}
            />
          </Field>
          <Field label="PIN" htmlFor="pin" error={errors.pin} hint="Opcional. 4 a 6 dígitos para acciones rápidas.">
            <Input
              id="pin"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              className="font-mono"
              value={values.pin}
              aria-invalid={Boolean(errors.pin) || undefined}
              onChange={(e) => setValue("pin", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field
            label="Contraseña"
            htmlFor="password"
            required
            error={errors.password}
            hint={PASSWORD_HINT}
            className="sm:col-span-2"
          >
            <PasswordInput
              id="password"
              value={values.password}
              onChange={(p) => setValue("password", p)}
              invalid={Boolean(errors.password)}
              generate
              copy
            />
          </Field>
        </FormSection>
      </FormShell>
    </>
  );
}
