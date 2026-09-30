"use client";

import { useState } from "react";
import type { BlogPost } from "@/lib/types";
import { compact, slugify } from "@/lib/utils";
import { changedFields, useForm } from "@/lib/hooks/useForm";
import { useSave } from "@/lib/hooks/useSave";
import { CharCount, Field, FormSection, Input, Switch, Textarea } from "@/components/ui";
import { FormShell } from "./FormShell";

const ENDPOINT = "/api/admin/posts";
const LIST_PATH = "/dashboard/opendata/blog";

function toForm(p?: BlogPost) {
  return {
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    summary: p?.summary ?? "",
    content: p?.content ?? "",
    coverImage: p?.coverImage ?? "",
    metaTitle: p?.metaTitle ?? "",
    metaDescription: p?.metaDescription ?? "",
    isPublished: p?.isPublished ?? false,
  };
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function BlogForm({ post }: { post?: BlogPost }) {
  const editing = Boolean(post);
  const initial = toForm(post);
  const { values, setValue, setValues, bind } = useForm(initial);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [imgError, setImgError] = useState(false);
  const { save, saving, error, setError } = useSave<BlogPost>({ endpoint: ENDPOINT, listPath: LIST_PATH });

  function submit() {
    if (!values.content.trim()) return setError("El contenido principal es requerido.");
    if (values.coverImage && !isValidUrl(values.coverImage))
      return setError("La imagen destacada debe ser una URL válida (http/https).");

    const source = editing ? changedFields(initial, values) : values;
    const body: Record<string, unknown> = Object.fromEntries(
      Object.entries(source).map(([k, v]) => [k, k === "slug" ? slugify(String(v)) : typeof v === "string" && k !== "content" ? v.trim() : v]),
    );
    // Primera publicación: fija la fecha.
    if (values.isPublished && !post?.publishedAt) body.publishedAt = new Date().toISOString();

    if (editing) save(body, post!.id);
    else save({ ...compact(body), isPublished: values.isPublished });
  }

  return (
    <FormShell
      onSubmit={submit}
      error={error}
      saving={saving}
      submitLabel={editing ? "Guardar cambios" : values.isPublished ? "Publicar artículo" : "Guardar borrador"}
      cancelHref={LIST_PATH}
    >
      <FormSection title="Contenido" description="Admite Markdown: **negrita**, _cursiva_, ## títulos, listas y enlaces.">
        <Field label="Título" htmlFor="title" required className="sm:col-span-2">
          <Input
            id="title"
            required
            placeholder="Ej. 10 lugares imperdibles en Cusco"
            value={values.title}
            onChange={(e) => {
              const title = e.target.value;
              setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
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
                  setValue("slug", slugify(values.title));
                }}
              >
                Regenerar desde el título
              </button>
            ) : (
              "Se genera automáticamente a partir del título."
            )
          }
        >
          <Input
            id="slug"
            addon="/blog/"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", slugify(e.target.value, true));
            }}
          />
        </Field>
        <Field label="Extracto" htmlFor="summary" className="sm:col-span-2" hint={<CharCount value={values.summary} max={300} />}>
          <Textarea id="summary" rows={3} placeholder="Resumen breve para listados y tarjetas." value={values.summary} onChange={bind("summary")} />
        </Field>
        <Field label="Contenido principal" htmlFor="content" required className="sm:col-span-2">
          <Textarea
            id="content"
            rows={18}
            required
            className="font-mono text-[13px]"
            placeholder={"## Introducción\n\nEscribe aquí el contenido del artículo…"}
            value={values.content}
            onChange={bind("content")}
          />
        </Field>
        <div className="sm:col-span-2">
          <Switch
            id="isPublished"
            label="Publicado"
            description="Si no está publicado se guarda como borrador."
            checked={values.isPublished}
            onChange={(v) => setValue("isPublished", v)}
          />
        </div>
      </FormSection>

      <FormSection title="Imagen destacada">
        <Field label="URL de la imagen" htmlFor="coverImage" className="sm:col-span-2">
          <Input
            id="coverImage"
            type="url"
            placeholder="https://…/imagen.jpg"
            value={values.coverImage}
            onChange={(e) => {
              setImgError(false);
              setValue("coverImage", e.target.value);
            }}
          />
        </Field>
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-surface-muted sm:col-span-2 sm:max-w-md">
          {values.coverImage && isValidUrl(values.coverImage) && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={values.coverImage} alt="Vista previa" className="h-full w-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <span className="px-4 text-center text-xs text-subtle">
              {imgError ? "No se pudo cargar la imagen" : "Vista previa de la imagen"}
            </span>
          )}
        </div>
      </FormSection>

      <FormSection title="SEO" description="Cómo se mostrará el artículo en buscadores.">
        <Field label="Meta title" htmlFor="metaTitle" className="sm:col-span-2" hint={<CharCount value={values.metaTitle || values.title} max={60} />}>
          <Input id="metaTitle" placeholder={values.title || "Si se deja vacío se usa el título"} value={values.metaTitle} onChange={bind("metaTitle")} />
        </Field>
        <Field label="Meta description" htmlFor="metaDescription" className="sm:col-span-2" hint={<CharCount value={values.metaDescription} max={160} />}>
          <Textarea id="metaDescription" rows={3} placeholder="Si se deja vacío se usa el extracto" value={values.metaDescription} onChange={bind("metaDescription")} />
        </Field>
        <div className="rounded-lg border border-line bg-canvas p-4 sm:col-span-2">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">Vista previa en Google</p>
          <p className="truncate text-xs text-muted">opendata.pe › blog › {values.slug || "slug-del-articulo"}</p>
          <p className="truncate text-lg leading-snug text-[#1a0dab]">{values.metaTitle || values.title || "Título del artículo"}</p>
          <p className="line-clamp-2 text-sm text-ink-soft">
            {values.metaDescription || values.summary || "La meta descripción aparecerá aquí."}
          </p>
        </div>
      </FormSection>
    </FormShell>
  );
}
