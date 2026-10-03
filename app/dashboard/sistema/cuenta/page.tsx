"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { appsDelUsuario, esSuperadmin } from "@/lib/apps";
import { useSessionUser } from "@/lib/hooks/useSessionUser";
import { Alert, Badge, Button, Card, DescriptionList, Field, PageHeader, useToast } from "@/components/ui";
import { PasswordInput } from "@/components/gym/shared";

const PASSWORD_HINT = "Mínimo 8 caracteres, con mayúscula, minúscula y número.";
const passwordValida = (p: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(p);

export default function MiCuentaPage() {
  const toast = useToast();
  const user = useSessionUser();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apps = appsDelUsuario(user).filter((a) => !a.system);
  const errores = enviado
    ? {
        actual: actual ? undefined : "Ingresa tu contraseña actual.",
        nueva: passwordValida(nueva) ? undefined : PASSWORD_HINT,
        confirmacion: confirmacion === nueva ? undefined : "Las contraseñas no coinciden.",
      }
    : {};

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setEnviado(true);
    if (!actual || !passwordValida(nueva) || confirmacion !== nueva) return;
    setError(null);
    setGuardando(true);
    try {
      await api.patch("/api/auth/me/password", { currentPassword: actual, newPassword: nueva });
      toast("Contraseña actualizada.");
      setActual("");
      setNueva("");
      setConfirmacion("");
      setEnviado(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <PageHeader title="Mi cuenta" subtitle="Tus datos de acceso al Control Center." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-[15px] font-semibold text-ink">Perfil</h2>
          <DescriptionList
            items={[
              { label: "Nombre", value: user?.name || "—" },
              { label: "Correo", value: user?.email },
              {
                label: "Rol",
                value: esSuperadmin(user) ? <Badge tone="violet">Administrador</Badge> : <Badge tone="outline">Editor</Badge>,
              },
              {
                label: "Aplicaciones",
                value: esSuperadmin(user) ? (
                  "Todas"
                ) : apps.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {apps.map((a) => (
                      <Badge key={a.id} tone="neutral">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                        {a.name}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  "Ninguna. Pide acceso a un administrador."
                ),
              },
            ]}
          />
        </Card>

        <Card>
          <form onSubmit={guardar} noValidate className="space-y-5">
            <h2 className="text-[15px] font-semibold text-ink">Cambiar contraseña</h2>
            {error && <Alert>{error}</Alert>}
            <Field label="Contraseña actual" htmlFor="c-actual" required error={errores.actual}>
              <PasswordInput id="c-actual" value={actual} onChange={setActual} autoComplete="current-password" invalid={Boolean(errores.actual)} />
            </Field>
            <Field label="Nueva contraseña" htmlFor="c-nueva" required error={errores.nueva} hint={PASSWORD_HINT}>
              <PasswordInput id="c-nueva" value={nueva} onChange={setNueva} invalid={Boolean(errores.nueva)} />
            </Field>
            <Field label="Confirmar nueva contraseña" htmlFor="c-confirmacion" required error={errores.confirmacion}>
              <PasswordInput id="c-confirmacion" value={confirmacion} onChange={setConfirmacion} invalid={Boolean(errores.confirmacion)} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={guardando}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
