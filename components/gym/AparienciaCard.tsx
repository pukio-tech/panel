"use client";

import { useState } from "react";
import type { GymEmpresaDetalle, GymEmpresaInput } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { COLOR_HEX_RE, GYM_COLOR_DEFECTO, GYM_TIPOGRAFIAS } from "@/lib/gym-utils";
import { Alert, Button, Field, Input, Select, useToast } from "@/components/ui";
import { errorMessage, LogoUpload, SectionCard } from "./shared";

/** Texto legible sobre el color (misma regla que TemaEmpresa en gym-app). */
function textoSobre(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.45 ? "#18181b" : "#ffffff";
}

/** URL de Google Fonts para previsualizar la tipografía elegida (el panel no la carga por defecto). */
const fuenteGoogle = (label: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(label)}:wght@400;600&display=swap`;

/**
 * Marca del gimnasio en Gym Manager: logo, color principal y tipografía.
 * Se aplica a su panel, su login y su catálogo público.
 */
export function AparienciaCard({
  empresa,
  onSaved,
}: {
  empresa: GymEmpresaDetalle;
  onSaved: (empresa: GymEmpresaDetalle) => void;
}) {
  const toast = useToast();
  const inicial = {
    logoUrl: empresa.logoUrl ?? null,
    color: empresa.apariencia?.colorPrimario ?? "",
    tipografia: empresa.apariencia?.tipografia ?? "",
  };
  const [logoUrl, setLogoUrl] = useState<string | null>(inicial.logoUrl);
  const [color, setColor] = useState(inicial.color);
  const [tipografia, setTipografia] = useState(inicial.tipografia);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const colorValido = color === "" || COLOR_HEX_RE.test(color);
  const colorPreview = COLOR_HEX_RE.test(color) ? color : GYM_COLOR_DEFECTO;
  const fuente = GYM_TIPOGRAFIAS.find((t) => t.value === tipografia);
  const dirty = logoUrl !== inicial.logoUrl || color !== inicial.color || tipografia !== inicial.tipografia;

  async function guardar() {
    if (!colorValido) return toast("El color debe tener el formato #RRGGBB.", "error");
    const body: GymEmpresaInput = {};
    if (logoUrl !== inicial.logoUrl) body.logoUrl = logoUrl;
    if (color !== inicial.color) body.colorPrimario = color || null;
    if (tipografia !== inicial.tipografia) body.tipografia = tipografia || null;
    setServerError(null);
    setSaving(true);
    try {
      const res = await gymApi.patch<{ data: GymEmpresaDetalle }>(`empresas/${empresa.id}`, body);
      toast("Apariencia actualizada. Se verá al recargar el panel del gimnasio.");
      onSaved(res.data);
    } catch (err) {
      setServerError(errorMessage(err, "No se pudo guardar la apariencia."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Apariencia"
      description="Logo, color y tipografía del gimnasio en su panel, su login y su catálogo público."
      footer={
        <>
          {dirty && (
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setLogoUrl(inicial.logoUrl);
                setColor(inicial.color);
                setTipografia(inicial.tipografia);
                setServerError(null);
              }}
            >
              Descartar
            </Button>
          )}
          <Button onClick={guardar} loading={saving} disabled={!dirty}>
            Guardar apariencia
          </Button>
        </>
      }
    >
      {fuente && <link rel="stylesheet" href={fuenteGoogle(fuente.label)} />}
      <div className="space-y-5">
        {serverError && <Alert title="No se pudo guardar">{serverError}</Alert>}

        <LogoUpload value={logoUrl} nombre={empresa.nombre} onChange={setLogoUrl} disabled={saving} empresaId={empresa.id} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Color principal"
            htmlFor="ap-color"
            error={colorValido ? undefined : "Formato #RRGGBB"}
            hint={color ? "Botones, enlaces y menú lateral." : "Vacío = verde de Gym Manager."}
          >
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Elegir color"
                value={colorPreview}
                disabled={saving}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-surface p-1"
              />
              <Input
                id="ap-color"
                className="min-w-0 flex-1 font-mono"
                maxLength={7}
                placeholder={GYM_COLOR_DEFECTO}
                value={color}
                disabled={saving}
                aria-invalid={!colorValido || undefined}
                onChange={(e) => setColor(e.target.value.trim())}
              />
              {color && (
                <Button variant="ghost" disabled={saving} onClick={() => setColor("")}>
                  Quitar
                </Button>
              )}
            </div>
          </Field>
          <Field label="Tipografía" htmlFor="ap-fuente" hint={tipografia ? undefined : "Por defecto: Inter."}>
            <Select id="ap-fuente" value={tipografia} disabled={saving} onChange={(e) => setTipografia(e.target.value)}>
              <option value="">Predeterminada (Inter)</option>
              {GYM_TIPOGRAFIAS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Vista previa */}
        <div
          className="overflow-hidden rounded-lg border border-line"
          style={{ fontFamily: fuente?.css }}
          aria-label="Vista previa de la apariencia"
        >
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-white" style={{ background: `color-mix(in oklch, ${colorPreview} 18%, #17181c)` }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: `color-mix(in oklch, ${colorPreview} 80%, white)` }} />
            <span className="font-semibold">{empresa.nombre}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-surface px-4 py-4">
            <span className="text-sm text-ink">Así se verán los botones y textos.</span>
            <span
              className="rounded-md px-3 py-1.5 text-sm font-semibold"
              style={{ background: colorPreview, color: textoSobre(colorPreview) }}
            >
              Registrar venta
            </span>
            <span className="text-sm font-semibold" style={{ color: colorPreview }}>
              Ver socios
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
