"use client";

import { useState, type FormEvent } from "react";
import type { GymEmpresaDetalle, GymUsuario } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import {
  formatDate,
  generatePassword,
  PASSWORD_HINT,
  validatePassword,
  validatePin,
  validateUsername,
} from "@/lib/gym-utils";
import { titleCase } from "@/lib/utils";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  Input,
  Menu,
  Modal,
  StatusBadge,
  useToast,
  type Column,
} from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { errorMessage, PasswordInput, SectionCard } from "./shared";

type Dialog =
  | { type: "add" }
  | { type: "password"; user: GymUsuario }
  | { type: "pin"; user: GymUsuario }
  | { type: "toggle"; user: GymUsuario }
  | null;

export function UsuariosCard({ empresa, onChanged }: { empresa: GymEmpresaDetalle; onChanged: () => void }) {
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function open(next: Exclude<Dialog, null>) {
    setUsername(next.type === "add" ? "" : next.user.username);
    setPassword(next.type === "add" || next.type === "password" ? generatePassword() : "");
    setPin("");
    setSubmitted(false);
    setDialogError(null);
    setDialog(next);
  }

  function close() {
    if (!saving) setDialog(null);
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setDialogError(null);
    setSaving(true);
    try {
      await action();
      toast(success);
      setDialog(null);
      onChanged();
    } catch (err) {
      const msg = errorMessage(err, "No se pudo completar la acción.");
      setDialogError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  const base = `empresas/${empresa.id}/usuarios`;

  const errors = submitted
    ? {
        username: dialog?.type === "add" ? validateUsername(username) : undefined,
        password: dialog?.type === "add" || dialog?.type === "password" ? validatePassword(password) : undefined,
        pin: dialog?.type === "pin" ? (pin ? validatePin(pin) : "Ingresa un PIN de 4 a 6 dígitos.") : validatePin(pin),
      }
    : {};

  function submitDialog(e: FormEvent) {
    e.preventDefault();
    if (!dialog || dialog.type === "toggle") return;
    setSubmitted(true);
    if (dialog.type === "add") {
      if (validateUsername(username) || validatePassword(password) || validatePin(pin)) return;
      run(
        () => gymApi.post(base, { username, password, pin: pin || undefined }),
        `Administrador «${username}» creado.`,
      );
    } else if (dialog.type === "password") {
      if (validatePassword(password)) return;
      run(
        () => gymApi.patch(`${base}/${dialog.user.id}`, { password }),
        `Contraseña de «${dialog.user.username}» restablecida.`,
      );
    } else if (dialog.type === "pin") {
      if (!pin || validatePin(pin)) return;
      run(() => gymApi.patch(`${base}/${dialog.user.id}`, { pin }), `PIN de «${dialog.user.username}» actualizado.`);
    }
  }

  const columns: Column<GymUsuario>[] = [
    {
      key: "username",
      header: "Usuario",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.username} />
          <span className="font-mono text-[13px] font-medium text-ink">
            {u.username}
            {/* Usuario completo con el que inicia sesión */}
            <span className="font-normal text-muted">@{empresa.slug}</span>
          </span>
        </div>
      ),
    },
    { key: "rol", header: "Rol", cell: (u) => <Badge tone="outline">{titleCase(u.rol)}</Badge> },
    { key: "estado", header: "Estado", cell: (u) => <StatusBadge active={u.activo} /> },
    {
      key: "pin",
      header: "PIN",
      hideOnMobile: true,
      cell: (u) => (u.tienePin ? <Badge tone="success">Con PIN</Badge> : <Badge tone="neutral">Sin PIN</Badge>),
    },
    {
      key: "creado",
      header: "Creado",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (u) => formatDate(u.fechaCreacion),
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (u) => (
        <Menu
          label={`Acciones de ${u.username}`}
          items={[
            { label: "Restablecer contraseña", onSelect: () => open({ type: "password", user: u }) },
            { label: u.tienePin ? "Cambiar PIN" : "Asignar PIN", onSelect: () => open({ type: "pin", user: u }) },
            {
              label: u.activo ? "Desactivar" : "Activar",
              danger: u.activo,
              onSelect: () => open({ type: "toggle", user: u }),
            },
          ]}
        />
      ),
    },
  ];

  const formDialog = dialog && dialog.type !== "toggle" ? dialog : null;
  const titles = {
    add: "Agregar administrador",
    password: `Restablecer contraseña · ${formDialog && formDialog.type !== "add" ? formDialog.user.username : ""}`,
    pin: `${formDialog?.type === "pin" && formDialog.user.tienePin ? "Cambiar" : "Asignar"} PIN · ${formDialog && formDialog.type !== "add" ? formDialog.user.username : ""}`,
  };
  const descriptions = {
    add: `Crea un usuario con rol ADMINISTRADOR. Ingresará como usuario@${empresa.slug}.`,
    password: "Comparte la nueva contraseña de forma segura: no se volverá a mostrar.",
    pin: "El PIN (4 a 6 dígitos) permite autorizar acciones rápidas en el gimnasio.",
  };

  return (
    <>
      <SectionCard
        title="Usuarios administradores"
        description="Cuentas con acceso de administración al panel del gimnasio."
        flush
        actions={
          <Button variant="secondary" size="sm" onClick={() => open({ type: "add" })}>
            <PlusIcon width={14} height={14} />
            Agregar administrador
          </Button>
        }
      >
        <div className="[&>div]:rounded-none [&>div]:rounded-b-xl [&>div]:border-0">
          <DataTable
            columns={columns}
            rows={empresa.usuarios}
            rowKey={(u) => u.id}
            empty={<EmptyState title="Sin administradores" description="Agrega un administrador para que el gimnasio pueda ingresar." />}
          />
        </div>
      </SectionCard>

      <Modal
        open={formDialog !== null}
        onClose={close}
        title={formDialog ? titles[formDialog.type] : ""}
        description={formDialog ? descriptions[formDialog.type] : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="gym-user-form" loading={saving}>
              {formDialog?.type === "add" ? "Crear administrador" : "Guardar"}
            </Button>
          </>
        }
      >
        {formDialog && (
          <form id="gym-user-form" onSubmit={submitDialog} noValidate className="space-y-4">
            {dialogError && <Alert>{dialogError}</Alert>}
            {formDialog.type === "add" && (
              <Field label="Usuario" htmlFor="u-username" required error={errors.username}>
                <Input
                  id="u-username"
                  autoComplete="off"
                  value={username}
                  aria-invalid={Boolean(errors.username) || undefined}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
            )}
            {(formDialog.type === "add" || formDialog.type === "password") && (
              <Field
                label={formDialog.type === "add" ? "Contraseña" : "Nueva contraseña"}
                htmlFor="u-password"
                required
                error={errors.password}
                hint={PASSWORD_HINT}
              >
                <PasswordInput
                  id="u-password"
                  value={password}
                  onChange={setPassword}
                  invalid={Boolean(errors.password)}
                  generate
                  copy
                />
              </Field>
            )}
            {(formDialog.type === "add" || formDialog.type === "pin") && (
              <Field
                label="PIN"
                htmlFor="u-pin"
                required={formDialog.type === "pin"}
                error={errors.pin}
                hint={formDialog.type === "add" ? "Opcional. 4 a 6 dígitos." : "4 a 6 dígitos."}
              >
                <Input
                  id="u-pin"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  className="font-mono"
                  value={pin}
                  aria-invalid={Boolean(errors.pin) || undefined}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.type === "toggle"}
        onCancel={close}
        loading={saving}
        danger={dialog?.type === "toggle" && dialog.user.activo}
        title={
          dialog?.type === "toggle"
            ? `${dialog.user.activo ? "Desactivar" : "Activar"} a «${dialog.user.username}»`
            : ""
        }
        description={
          dialog?.type === "toggle" ? (
            <>
              {dialog.user.activo
                ? "El usuario no podrá iniciar sesión en el panel del gimnasio hasta que lo reactives."
                : "El usuario podrá volver a iniciar sesión con su contraseña actual."}
              {dialogError && <span className="mt-3 block text-red-600">{dialogError}</span>}
            </>
          ) : undefined
        }
        confirmLabel={dialog?.type === "toggle" && dialog.user.activo ? "Desactivar" : "Activar"}
        onConfirm={() => {
          if (dialog?.type !== "toggle") return;
          const { user } = dialog;
          run(
            () => gymApi.patch(`${base}/${user.id}`, { activo: !user.activo }),
            `Usuario «${user.username}» ${user.activo ? "desactivado" : "activado"}.`,
          );
        }}
      />
    </>
  );
}
