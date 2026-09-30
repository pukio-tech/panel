"use client";

import { useState } from "react";
import type { Museum, MuseumOptions } from "@/lib/types";
import { compact, slugify, titleCase } from "@/lib/utils";
import { useApiData } from "@/lib/hooks/useApiData";
import { changedFields, useForm } from "@/lib/hooks/useForm";
import { useSave } from "@/lib/hooks/useSave";
import { Field, FormSection, Input, Select, Switch, Textarea } from "@/components/ui";
import { FormShell, ImportedNotice } from "./FormShell";
import { UbigeoSelect } from "./UbigeoSelect";

const ENDPOINT = "/api/admin/museums";
const LIST_PATH = "/dashboard/opendata/museos";

const LINK_FIELDS = [
  ["websiteUrl", "Sitio web"],
  ["virtualTourUrl", "Recorrido virtual"],
  ["virtualCollectionUrl", "Colección virtual"],
  ["facebookUrl", "Facebook"],
  ["instagramUrl", "Instagram"],
  ["twitterUrl", "X / Twitter"],
  ["youtubeUrl", "YouTube"],
  ["tiktokUrl", "TikTok"],
] as const;

function toForm(m?: Museum) {
  return {
    name: m?.name ?? "",
    slug: m?.slug ?? "",
    category: m?.category ?? "",
    museumType: m?.museumType ?? "",
    administration: m?.administration ?? "",
    status: m?.status ?? "Abierto",
    ubigeo: m?.ubigeo ?? "",
    address: m?.address ?? "",
    latitude: m?.latitude != null ? String(m.latitude) : "",
    longitude: m?.longitude != null ? String(m.longitude) : "",
    openingHours: m?.openingHours ?? "",
    feesDescription: m?.feesDescription ?? "",
    phone: m?.phone ?? "",
    email: m?.email ?? "",
    websiteUrl: m?.websiteUrl ?? "",
    virtualTourUrl: m?.virtualTourUrl ?? "",
    virtualCollectionUrl: m?.virtualCollectionUrl ?? "",
    facebookUrl: m?.facebookUrl ?? "",
    instagramUrl: m?.instagramUrl ?? "",
    twitterUrl: m?.twitterUrl ?? "",
    youtubeUrl: m?.youtubeUrl ?? "",
    tiktokUrl: m?.tiktokUrl ?? "",
    coverImage: m?.coverImage ?? "",
    cardImage: m?.cardImage ?? "",
    description: m?.description ?? "",
    isActive: m?.isActive ?? true,
  };
}

type MuseumFormValues = ReturnType<typeof toForm>;

function toPayload(v: Partial<MuseumFormValues>) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "latitude" || k === "longitude") out[k] = val === "" ? null : Number(val);
    else if (k === "slug") out.slug = slugify(String(val));
    else out[k] = typeof val === "string" ? val.trim() : val;
  }
  return out;
}

/** Select con opciones existentes + opción de escribir un valor nuevo. */
function SuggestSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const listId = `${id}-options`;
  return (
    <>
      <Input id={id} list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Escribe o elige…" />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

export function MuseumForm({ museum }: { museum?: Museum }) {
  const editing = Boolean(museum);
  const initial = toForm(museum);
  const { values, setValue, setValues, bind } = useForm(initial);
  const [slugTouched, setSlugTouched] = useState(editing);
  const { data: options } = useApiData<MuseumOptions>(`${ENDPOINT}/options`);
  const { save, saving, error, setError } = useSave<Museum>({ endpoint: ENDPOINT, listPath: LIST_PATH });

  function submit() {
    const hasLat = values.latitude !== "";
    const hasLng = values.longitude !== "";
    if (hasLat !== hasLng) return setError("Ingresa latitud y longitud juntas (o deja ambas vacías).");
    if (hasLat && (Number.isNaN(Number(values.latitude)) || Math.abs(Number(values.latitude)) > 90))
      return setError("La latitud debe estar entre -90 y 90.");
    if (hasLng && (Number.isNaN(Number(values.longitude)) || Math.abs(Number(values.longitude)) > 180))
      return setError("La longitud debe estar entre -180 y 180.");

    if (editing) {
      const diff = changedFields(initial, values);
      if (diff.ubigeo === "") delete diff.ubigeo;
      save(toPayload(diff), museum!.id);
    } else {
      save(compact(toPayload(values)));
    }
  }

  const statuses = options?.statuses ?? ["Abierto", "Cerrado"];

  return (
    <FormShell
      onSubmit={submit}
      error={error}
      saving={saving}
      submitLabel={editing ? "Guardar cambios" : "Crear museo"}
      cancelHref={LIST_PATH}
      notice={
        museum?.source === "importado" && (
          <ImportedNotice source="museos.cultura.pe" fields="Todos los campos de contenido" />
        )
      }
    >
      <FormSection title="Datos generales">
        <Field label="Nombre" htmlFor="name" required className="sm:col-span-2">
          <Input
            id="name"
            required
            value={values.name}
            onChange={(e) => {
              const name = e.target.value;
              setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
            }}
          />
        </Field>
        <Field
          label="Slug"
          htmlFor="slug"
          className="sm:col-span-2"
          hint={
            slugTouched ? (
              <button
                type="button"
                className="font-medium text-ink hover:underline"
                onClick={() => {
                  setSlugTouched(false);
                  setValue("slug", slugify(values.name));
                }}
              >
                Regenerar desde el nombre
              </button>
            ) : (
              "Se genera automáticamente a partir del nombre."
            )
          }
        >
          <Input
            id="slug"
            addon="/museos/"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", slugify(e.target.value, true));
            }}
          />
        </Field>
        <Field label="Categoría" htmlFor="category">
          <SuggestSelect id="category" value={values.category} onChange={(v) => setValue("category", v)} options={options?.categories ?? []} />
        </Field>
        <Field label="Tipo de museo" htmlFor="museumType">
          <SuggestSelect id="museumType" value={values.museumType} onChange={(v) => setValue("museumType", v)} options={options?.museumTypes ?? []} />
        </Field>
        <Field label="Administración" htmlFor="administration" className="sm:col-span-2">
          <SuggestSelect id="administration" value={values.administration} onChange={(v) => setValue("administration", v)} options={options?.administrations ?? []} />
        </Field>
        <Field label="Estado" htmlFor="status">
          <Select id="status" value={values.status} onChange={bind("status")}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Switch
            id="isActive"
            label="Activo"
            description="Si lo desactivas deja de mostrarse en la web pública."
            checked={values.isActive}
            onChange={(v) => setValue("isActive", v)}
          />
        </div>
        <Field label="Descripción" htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" rows={6} value={values.description} onChange={bind("description")} />
        </Field>
      </FormSection>

      <FormSection
        title="Ubicación"
        description={
          editing && museum?.department
            ? `Actual: ${titleCase(museum.department)} / ${titleCase(museum.province)} / ${titleCase(museum.district)}.`
            : "Dirección, ubigeo y coordenadas (opcionales)."
        }
      >
        <Field label="Dirección" htmlFor="address" className="sm:col-span-2">
          <Input id="address" value={values.address} onChange={bind("address")} />
        </Field>
        <div className="grid gap-5 sm:col-span-2 sm:grid-cols-3">
          <UbigeoSelect departments={options?.departments ?? []} value={values.ubigeo} onChange={(u) => setValue("ubigeo", u)} />
        </div>
        <Field label="Latitud" htmlFor="latitude">
          <Input id="latitude" type="number" step="any" inputMode="decimal" value={values.latitude} onChange={bind("latitude")} />
        </Field>
        <Field label="Longitud" htmlFor="longitude">
          <Input id="longitude" type="number" step="any" inputMode="decimal" value={values.longitude} onChange={bind("longitude")} />
        </Field>
      </FormSection>

      <FormSection title="Visita" description="Horarios, tarifas y contacto.">
        <Field label="Horario de atención" htmlFor="openingHours" className="sm:col-span-2">
          <Textarea id="openingHours" rows={3} placeholder="Martes a domingo de 9:00 a 17:00" value={values.openingHours} onChange={bind("openingHours")} />
        </Field>
        <Field label="Tarifas" htmlFor="feesDescription" className="sm:col-span-2">
          <Textarea id="feesDescription" rows={3} placeholder="Adultos S/ 10 · Estudiantes S/ 5…" value={values.feesDescription} onChange={bind("feesDescription")} />
        </Field>
        <Field label="Teléfono" htmlFor="phone">
          <Input id="phone" type="tel" value={values.phone} onChange={bind("phone")} />
        </Field>
        <Field label="Correo" htmlFor="email">
          <Input id="email" type="email" value={values.email} onChange={bind("email")} />
        </Field>
      </FormSection>

      <FormSection title="Imágenes">
        <Field label="Portada (URL)" htmlFor="coverImage">
          <Input id="coverImage" type="url" value={values.coverImage} onChange={bind("coverImage")} />
        </Field>
        <Field label="Tarjeta (URL)" htmlFor="cardImage">
          <Input id="cardImage" type="url" value={values.cardImage} onChange={bind("cardImage")} />
        </Field>
        {(values.coverImage || values.cardImage) && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            {[values.coverImage, values.cardImage].map((src, i) =>
              src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-video w-full rounded-lg border border-line object-cover" />
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Enlaces" description="Web, recorridos virtuales y redes sociales.">
        {LINK_FIELDS.map(([key, label]) => (
          <Field key={key} label={label} htmlFor={key}>
            <Input id={key} type="url" placeholder="https://" value={values[key]} onChange={bind(key)} />
          </Field>
        ))}
      </FormSection>
    </FormShell>
  );
}
