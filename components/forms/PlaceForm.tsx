"use client";

import { useState } from "react";
import type { PlaceOptions, TouristPlace } from "@/lib/types";
import { compact, slugify, titleCase } from "@/lib/utils";
import { useApiData } from "@/lib/hooks/useApiData";
import { changedFields, useForm } from "@/lib/hooks/useForm";
import { useSave } from "@/lib/hooks/useSave";
import {
  CharCount,
  Field,
  FormSection,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { FormShell, ImportedNotice } from "./FormShell";
import { UbigeoSelect } from "./UbigeoSelect";

const ENDPOINT = "/api/admin/places";
const LIST_PATH = "/dashboard/opendata/lugares";

function toForm(p?: TouristPlace) {
  return {
    name: p?.name ?? "",
    categoryId: p?.categoryId ? String(p.categoryId) : "",
    ubigeo: p?.ubigeo ?? "",
    description: p?.description ?? "",
    imageUrl: p?.imageUrl ?? "",
    latitude: p?.latitude != null ? String(p.latitude) : "",
    longitude: p?.longitude != null ? String(p.longitude) : "",
    slug: p?.slug ?? "",
    metaTitle: p?.metaTitle ?? "",
    metaDescription: p?.metaDescription ?? "",
    keywords: p?.keywords ?? "",
    isPublished: p?.isPublished ?? true,
  };
}

type PlaceFormValues = ReturnType<typeof toForm>;

/** Convierte los valores del form al payload del backend. */
function toPayload(v: Partial<PlaceFormValues>) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "categoryId") out.categoryId = val ? Number(val) : undefined;
    else if (k === "latitude" || k === "longitude") out[k] = val === "" ? undefined : Number(val);
    else if (k === "slug") out.slug = slugify(String(val));
    else out[k] = typeof val === "string" ? val.trim() : val;
  }
  return out;
}

export function PlaceForm({ place }: { place?: TouristPlace }) {
  const editing = Boolean(place);
  const initial = toForm(place);
  const { values, setValue, setValues, bind } = useForm(initial);
  const [slugTouched, setSlugTouched] = useState(editing);
  const { data: options } = useApiData<PlaceOptions>(`${ENDPOINT}/options`);
  const { save, saving, error, setError } = useSave<TouristPlace>({
    endpoint: ENDPOINT,
    listPath: LIST_PATH,
  });

  function submit() {
    if (!values.ubigeo && !editing) return setError("Selecciona región, provincia y distrito.");
    const lat = Number(values.latitude);
    const lng = Number(values.longitude);
    if (!editing || values.latitude || values.longitude) {
      if (values.latitude === "" || Number.isNaN(lat) || lat < -90 || lat > 90)
        return setError("La latitud debe ser un número entre -90 y 90.");
      if (values.longitude === "" || Number.isNaN(lng) || lng < -180 || lng > 180)
        return setError("La longitud debe ser un número entre -180 y 180.");
    }

    if (editing) {
      const diff = changedFields(initial, values);
      if (!diff.ubigeo) delete diff.ubigeo;
      save(toPayload(diff), place!.id);
    } else {
      save(compact(toPayload(values)));
    }
  }

  return (
    <FormShell
      onSubmit={submit}
      error={error}
      saving={saving}
      submitLabel={editing ? "Guardar cambios" : "Crear lugar"}
      cancelHref={LIST_PATH}
      notice={
        place?.source === "mincetur" && (
          <ImportedNotice source="MINCETUR" fields="Nombre, ubicación y categoría" />
        )
      }
    >
      <FormSection title="Datos generales" description="Información principal del atractivo.">
        <Field label="Nombre" htmlFor="name" required className="sm:col-span-2">
          <Input
            id="name"
            required
            maxLength={255}
            placeholder="Ej. Mirador de las Líneas de Nasca"
            value={values.name}
            onChange={(e) => {
              const name = e.target.value;
              setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
            }}
          />
        </Field>
        <Field label="Categoría" htmlFor="categoryId">
          <Select id="categoryId" value={values.categoryId} onChange={bind("categoryId")} disabled={!options}>
            <option value="">Selecciona una categoría</option>
            {options?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {titleCase(c.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Imagen principal (URL)" htmlFor="imageUrl">
          <Input id="imageUrl" type="url" placeholder="https://…/foto.jpg" value={values.imageUrl} onChange={bind("imageUrl")} />
        </Field>
        <Field label="Descripción" htmlFor="description" className="sm:col-span-2">
          <Textarea
            id="description"
            rows={6}
            placeholder="Historia, atractivos, cómo llegar, horarios…"
            value={values.description}
            onChange={bind("description")}
          />
        </Field>
        <div className="sm:col-span-2">
          <Switch
            id="isPublished"
            label="Activo"
            description="Si lo desactivas deja de mostrarse en la web pública."
            checked={values.isPublished}
            onChange={(v) => setValue("isPublished", v)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Ubicación"
        description={
          editing && place?.department
            ? `Actual: ${titleCase(place.department)} / ${titleCase(place.province)} / ${titleCase(place.district)}. Cambia la región solo si quieres reubicarlo.`
            : "Región, provincia y distrito según el ubigeo del INEI, y coordenadas en grados decimales."
        }
      >
        <div className="grid gap-5 sm:col-span-2 sm:grid-cols-3">
          <UbigeoSelect
            departments={options?.departments ?? []}
            value={values.ubigeo}
            onChange={(u) => setValue("ubigeo", u)}
            required={!editing}
          />
        </div>
        <Field label="Latitud" htmlFor="latitude" required={!editing} hint="Ej. -14.739028">
          <Input id="latitude" type="number" step="any" min={-90} max={90} inputMode="decimal" value={values.latitude} onChange={bind("latitude")} />
        </Field>
        <Field label="Longitud" htmlFor="longitude" required={!editing} hint="Ej. -75.130000">
          <Input id="longitude" type="number" step="any" min={-180} max={180} inputMode="decimal" value={values.longitude} onChange={bind("longitude")} />
        </Field>
        {values.latitude && values.longitude && (
          <a
            href={`https://www.google.com/maps?q=${values.latitude},${values.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-ink underline-offset-4 hover:underline sm:col-span-2"
          >
            Verificar en Google Maps ↗
          </a>
        )}
      </FormSection>

      <SeoSection
        values={values}
        prefix="/turismo/"
        slugTouched={slugTouched}
        onSlug={(slug) => {
          setSlugTouched(true);
          setValue("slug", slug);
        }}
        onRegenerate={() => {
          setSlugTouched(false);
          setValue("slug", slugify(values.name));
        }}
        bind={bind}
      />
    </FormShell>
  );
}

/* Sección SEO reutilizable por lugares (y extensible a otros recursos). */
export function SeoSection({
  values,
  prefix,
  slugTouched,
  onSlug,
  onRegenerate,
  bind,
}: {
  values: { name: string; slug: string; metaTitle: string; metaDescription: string; keywords: string };
  prefix: string;
  slugTouched: boolean;
  onSlug: (slug: string) => void;
  onRegenerate: () => void;
  bind: (key: "metaTitle" | "metaDescription" | "keywords") => React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}) {
  return (
    <FormSection title="SEO" description="Cómo se mostrará en buscadores.">
      <Field
        label="Slug"
        htmlFor="slug"
        className="sm:col-span-2"
        hint={
          slugTouched ? (
            <button type="button" className="font-medium text-ink hover:underline" onClick={onRegenerate}>
              Regenerar desde el nombre
            </button>
          ) : (
            "Se genera automáticamente a partir del nombre."
          )
        }
      >
        <Input id="slug" addon={prefix} value={values.slug} onChange={(e) => onSlug(slugify(e.target.value, true))} />
      </Field>
      <Field label="Meta title" htmlFor="metaTitle" className="sm:col-span-2" hint={<CharCount value={values.metaTitle || values.name} max={60} />}>
        <Input id="metaTitle" maxLength={255} placeholder={values.name || "Si se deja vacío se usa el nombre"} value={values.metaTitle} onChange={bind("metaTitle")} />
      </Field>
      <Field label="Meta description" htmlFor="metaDescription" className="sm:col-span-2" hint={<CharCount value={values.metaDescription} max={160} />}>
        <Textarea id="metaDescription" rows={3} placeholder="Si se deja vacío se usan los primeros 160 caracteres de la descripción" value={values.metaDescription} onChange={bind("metaDescription")} />
      </Field>
      <Field label="Palabras clave" htmlFor="keywords" className="sm:col-span-2" hint="Separadas por comas.">
        <Input id="keywords" value={values.keywords} onChange={bind("keywords")} />
      </Field>
    </FormSection>
  );
}
