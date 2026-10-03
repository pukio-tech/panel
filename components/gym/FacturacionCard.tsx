"use client";

import { useState, type FormEvent } from "react";
import type { GymEmpresaDetalle, GymEmpresaInput } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { validateRuc } from "@/lib/gym-utils";
import { Alert, Badge, Button, Field, Input, useToast } from "@/components/ui";
import { errorMessage, PasswordInput, SectionCard } from "./shared";

/** Estado de una credencial secreta: nunca se recibe; se puede reemplazar, quitar o mantener. */
interface SecretState {
  value: string;
  clear: boolean;
}

function SecretField({
  id,
  label,
  configured,
  state,
  onChange,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  configured: boolean;
  state: SecretState;
  onChange: (s: SecretState) => void;
  hint: string;
  disabled?: boolean;
}) {
  const status = state.clear ? (
    <Badge tone="warning">Se quitará al guardar</Badge>
  ) : configured ? (
    <Badge tone="success" dot>
      Configurada
    </Badge>
  ) : (
    <Badge tone="outline">Usa la clave global</Badge>
  );

  return (
    <Field
      label={label}
      htmlFor={id}
      className="sm:col-span-2"
      hint={
        <span className="flex flex-wrap items-center gap-2">
          {status}
          <span>{hint}</span>
        </span>
      }
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <PasswordInput
            id={id}
            value={state.value}
            disabled={disabled || state.clear}
            autoComplete="off"
            placeholder={
              state.clear
                ? "Se quitará la credencial propia"
                : configured
                  ? "Configurada — deja vacío para mantener"
                  : "No configurada"
            }
            onChange={(value) => onChange({ value, clear: false })}
          />
        </div>
        {configured &&
          (state.clear ? (
            <Button variant="secondary" disabled={disabled} onClick={() => onChange({ value: "", clear: false })}>
              Deshacer
            </Button>
          ) : (
            <Button variant="secondary" disabled={disabled} onClick={() => onChange({ value: "", clear: true })}>
              Quitar
            </Button>
          ))}
      </div>
    </Field>
  );
}

const EMPTY: SecretState = { value: "", clear: false };

export function FacturacionCard({
  empresa,
  onSaved,
}: {
  empresa: GymEmpresaDetalle;
  onSaved: (empresa: GymEmpresaDetalle) => void;
}) {
  const toast = useToast();
  const [ruc, setRuc] = useState(empresa.facturacionRuc ?? "");
  const [apiKey, setApiKey] = useState<SecretState>(EMPTY);
  const [token, setToken] = useState<SecretState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const rucError = validateRuc(ruc);
  const rucChanged = ruc !== (empresa.facturacionRuc ?? "");
  const dirty = rucChanged || apiKey.clear || apiKey.value !== "" || token.clear || token.value !== "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    if (rucError) return toast(`RUC emisor: ${rucError}`, "error");
    const body: GymEmpresaInput = {};
    if (rucChanged) body.facturacionRuc = ruc || null;
    if (apiKey.clear) body.facturacionApiKey = "";
    else if (apiKey.value.trim()) body.facturacionApiKey = apiKey.value.trim();
    if (token.clear) body.consultaApiToken = "";
    else if (token.value.trim()) body.consultaApiToken = token.value.trim();

    setServerError(null);
    setSaving(true);
    try {
      const res = await gymApi.patch<{ data: GymEmpresaDetalle }>(`empresas/${empresa.id}`, body);
      setApiKey(EMPTY);
      setToken(EMPTY);
      setRuc(res.data.facturacionRuc ?? "");
      toast("Configuración de facturación actualizada.");
      onSaved(res.data);
    } catch (err) {
      setServerError(errorMessage(err, "No se pudo guardar la configuración."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard
        title="Facturación electrónica (SUNAT)"
        description="Credenciales propias de la empresa para emitir comprobantes y consultar DNI/RUC. Si se dejan vacías, Gym Manager usa las claves globales del servidor."
        footer={
          <>
            {dirty && (
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setRuc(empresa.facturacionRuc ?? "");
                  setApiKey(EMPTY);
                  setToken(EMPTY);
                  setServerError(null);
                }}
              >
                Descartar
              </Button>
            )}
            <Button type="submit" loading={saving} disabled={!dirty}>
              Guardar facturación
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {serverError && <Alert title="No se pudo guardar">{serverError}</Alert>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="RUC emisor"
              htmlFor="f-ruc"
              error={ruc && rucError ? rucError : undefined}
              hint="RUC con el que se emiten los comprobantes. Vacío = el RUC de la empresa."
            >
              <Input
                id="f-ruc"
                inputMode="numeric"
                maxLength={11}
                className="font-mono"
                value={ruc}
                placeholder={empresa.ruc ?? ""}
                aria-invalid={Boolean(ruc && rucError) || undefined}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <SecretField
              id="f-apikey"
              label="API key de facturación"
              configured={empresa.facturacionApiKeyConfigurada}
              state={apiKey}
              onChange={setApiKey}
              disabled={saving}
              hint="Por seguridad nunca se muestra la clave guardada."
            />
            <SecretField
              id="f-token"
              label="Token de consultas DNI/RUC"
              configured={empresa.consultaApiTokenConfigurado}
              state={token}
              onChange={setToken}
              disabled={saving}
              hint="Para autocompletar datos de socios y clientes."
            />
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
