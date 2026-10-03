"use client";

import { useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { MANAGED_APPS } from "@/lib/apps";
import type { PanelAppInfo, PanelRole, PanelUser } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/gym-utils";
import { useApiData } from "@/lib/hooks/useApiData";
import { useSessionUser } from "@/lib/hooks/useSessionUser";
import { cn } from "@/lib/utils";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterPills,
  Input,
  Menu,
  Modal,
  PageHeader,
  Toolbar,
  useToast,
  type Column,
} from "@/components/ui";
import { PlusIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { PasswordInput } from "@/components/gym/shared";

/* Mismas reglas que bk_opendata (PASSWORD_REGEX) */
const PASSWORD_HINT = "Mínimo 8 caracteres, con mayúscula, minúscula y número.";
function validarPassword(p: string) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(p)) return PASSWORD_HINT;
}

const ROLES: { value: PanelRole; label: string; descripcion: string }[] = [
  { value: "EDITOR", label: "Editor", descripcion: "Solo entra a las aplicaciones que le asignes." },
  { value: "ADMIN", label: "Administrador", descripcion: "Acceso total: todas las aplicaciones y la gestión de usuarios." },
];

const colorApp = (id: string) => MANAGED_APPS.find((a) => a.id === id)?.color ?? "#a1a1aa";
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; user: PanelUser }
  | { tipo: "password"; user: PanelUser }
  | { tipo: "estado"; user: PanelUser }
  | null;

type Filtro = "todos" | "activos" | "inactivos";

export default function UsuariosPanelPage() {
  const toast = useToast();
  const yo = useSessionUser();
  const [version, setVersion] = useState(0);
  const usuarios = useApiData<PanelUser[]>(`/api/admin/users?v=${version}`);
  const appsRes = useApiData<PanelAppInfo[]>("/api/admin/users/apps");
  const apps = useMemo(() => (appsRes.data ?? []).filter((a) => a.active), [appsRes.data]);
  const nombreApp = (id: string) => appsRes.data?.find((a) => a.id === id)?.name ?? id;

  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [busqueda, setBusqueda] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  // Formulario (nuevo / editar / contraseña)
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<PanelRole>("EDITOR");
  const [appsSel, setAppsSel] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const lista = useMemo(() => usuarios.data ?? [], [usuarios.data]);
  const conteo = {
    todos: lista.length,
    activos: lista.filter((u) => u.active).length,
    inactivos: lista.filter((u) => !u.active).length,
  };
  const filas = useMemo(() => {
    const q = normalize(busqueda.trim());
    return lista.filter((u) => {
      if (filtro === "activos" && !u.active) return false;
      if (filtro === "inactivos" && u.active) return false;
      return !q || normalize(`${u.name ?? ""} ${u.email}`).includes(q);
    });
  }, [lista, filtro, busqueda]);

  function abrir(d: Exclude<Dialogo, null>) {
    const u = d.tipo === "nuevo" ? null : d.user;
    setEmail(u?.email ?? "");
    setNombre(u?.name ?? "");
    setRol(u?.role === "ADMIN" ? "ADMIN" : "EDITOR");
    setAppsSel(u?.apps ?? []);
    setPassword("");
    setEnviado(false);
    setErrorServidor(null);
    setDialogo(d);
  }

  const cerrar = () => !guardando && setDialogo(null);
  const recargar = () => setVersion((v) => v + 1);

  const errores = enviado
    ? {
        email: dialogo?.tipo === "nuevo" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Correo electrónico no válido." : undefined,
        password: dialogo?.tipo === "nuevo" || dialogo?.tipo === "password" ? validarPassword(password) : undefined,
        apps: (dialogo?.tipo === "nuevo" || dialogo?.tipo === "editar") && rol === "EDITOR" && appsSel.length === 0 ? "Asigna al menos una aplicación." : undefined,
      }
    : {};

  async function ejecutar(accion: () => Promise<unknown>, exito: string) {
    setErrorServidor(null);
    setGuardando(true);
    try {
      await accion();
      toast(exito);
      setDialogo(null);
      recargar();
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : "No se pudo completar la acción.");
    } finally {
      setGuardando(false);
    }
  }

  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!dialogo || dialogo.tipo === "estado") return;
    setEnviado(true);
    const appsBody = rol === "ADMIN" ? [] : appsSel;
    if (dialogo.tipo === "nuevo") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || validarPassword(password) || (rol === "EDITOR" && !appsSel.length)) return;
      ejecutar(
        () => api.post("/api/admin/users", { email: email.trim(), name: nombre.trim() || undefined, password, role: rol, apps: appsBody }),
        `Usuario ${email.trim()} creado.`,
      );
    } else if (dialogo.tipo === "editar") {
      if (rol === "EDITOR" && !appsSel.length) return;
      ejecutar(
        () => api.patch(`/api/admin/users/${dialogo.user.id}`, { name: nombre.trim() || null, role: rol, apps: appsBody }),
        `Usuario ${dialogo.user.email} actualizado.`,
      );
    } else {
      if (validarPassword(password)) return;
      ejecutar(
        () => api.patch(`/api/admin/users/${dialogo.user.id}`, { password }),
        `Contraseña de ${dialogo.user.email} restablecida.`,
      );
    }
  }

  const columnas: Column<PanelUser>[] = [
    {
      key: "usuario",
      header: "Usuario",
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={u.name || u.email} />
          <div className="min-w-0">
            <p className="max-w-[16rem] truncate font-medium text-ink">
              {u.name || u.email.split("@")[0]}
              {u.id === yo?.id && <span className="ml-1.5 text-xs font-normal text-muted">(tú)</span>}
            </p>
            <p className="max-w-[16rem] truncate text-xs text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (u) => (u.role === "ADMIN" ? <Badge tone="violet">Administrador</Badge> : <Badge tone="outline">Editor</Badge>),
    },
    {
      key: "apps",
      header: "Aplicaciones",
      hideOnMobile: true,
      cell: (u) =>
        u.role === "ADMIN" ? (
          <span className="text-[13px] text-muted">Todas</span>
        ) : u.apps.length === 0 ? (
          <span className="text-[13px] text-red-600">Sin acceso</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {u.apps.map((id) => (
              <Badge key={id} tone="neutral">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorApp(id) }} />
                {nombreApp(id)}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (u) =>
        u.active ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Inactivo
          </Badge>
        ),
    },
    {
      key: "acceso",
      header: "Último acceso",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (u) => <span title={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : undefined}>{u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Nunca"}</span>,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (u) => (
        <Menu
          label={`Acciones de ${u.email}`}
          items={[
            { label: "Editar accesos", onSelect: () => abrir({ tipo: "editar", user: u }) },
            { label: "Restablecer contraseña", onSelect: () => abrir({ tipo: "password", user: u }) },
            {
              label: u.active ? "Desactivar" : "Activar",
              danger: u.active,
              disabled: u.id === yo?.id,
              hint: u.id === yo?.id ? "No puedes desactivarte" : undefined,
              onSelect: () => abrir({ tipo: "estado", user: u }),
            },
          ]}
        />
      ),
    },
  ];

  const formDialogo = dialogo && dialogo.tipo !== "estado" ? dialogo : null;
  const editandoMiUsuario = formDialogo?.tipo === "editar" && formDialogo.user.id === yo?.id;
  const botonNuevo = (
    <Button onClick={() => abrir({ tipo: "nuevo" })}>
      <PlusIcon width={16} height={16} /> Nuevo usuario
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Personas con acceso al Control Center y las aplicaciones que pueden gestionar."
        actions={botonNuevo}
      />

      <Toolbar>
        <FilterPills<Filtro>
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "activos", label: "Activos", count: usuarios.data ? conteo.activos : null },
            { value: "inactivos", label: "Inactivos", count: usuarios.data ? conteo.inactivos : null },
            { value: "todos", label: "Todos", count: usuarios.data ? conteo.todos : null },
          ]}
        />
        <Input
          type="search"
          className="lg:ml-auto lg:w-80"
          leading={<SearchIcon width={16} height={16} />}
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar usuarios"
        />
      </Toolbar>

      {usuarios.error && (
        <div className="mb-4">
          <Alert title="No se pudo cargar la lista">{usuarios.error}</Alert>
        </div>
      )}

      <DataTable
        columns={columnas}
        rows={filas}
        rowKey={(u) => u.id}
        loading={usuarios.loading && !usuarios.data}
        onRowClick={(u) => abrir({ tipo: "editar", user: u })}
        empty={
          <EmptyState
            icon={<UsersIcon />}
            title={lista.length ? "No hay usuarios en esta vista" : "Aún no hay usuarios"}
            description={busqueda ? "Prueba con otro nombre o correo." : undefined}
            action={lista.length ? undefined : botonNuevo}
          />
        }
      />

      <Modal
        open={formDialogo !== null}
        onClose={cerrar}
        size={formDialogo?.tipo === "password" ? "md" : "lg"}
        title={
          formDialogo?.tipo === "nuevo"
            ? "Nuevo usuario"
            : formDialogo?.tipo === "editar"
              ? `Editar · ${formDialogo.user.email}`
              : `Restablecer contraseña · ${formDialogo?.user.email ?? ""}`
        }
        description={
          formDialogo?.tipo === "password"
            ? "Comunica la nueva contraseña de forma segura: no se volverá a mostrar."
            : formDialogo?.tipo === "nuevo"
              ? "Comparte el correo y la contraseña con la persona de forma segura."
              : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={cerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form="panel-user-form" loading={guardando}>
              {formDialogo?.tipo === "nuevo" ? "Crear usuario" : "Guardar"}
            </Button>
          </>
        }
      >
        {formDialogo && (
          <form id="panel-user-form" onSubmit={guardar} noValidate className="space-y-5">
            {errorServidor && <Alert>{errorServidor}</Alert>}

            {formDialogo.tipo !== "password" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Correo electrónico" htmlFor="pu-email" required={formDialogo.tipo === "nuevo"} error={errores.email}>
                  <Input
                    id="pu-email"
                    type="email"
                    autoComplete="off"
                    value={email}
                    disabled={formDialogo.tipo !== "nuevo"}
                    aria-invalid={Boolean(errores.email) || undefined}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Nombre" htmlFor="pu-nombre">
                  <Input id="pu-nombre" maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </Field>
              </div>
            )}

            {formDialogo.tipo !== "password" && (
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-muted">Rol</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                        rol === r.value ? "border-ink bg-surface-muted" : "border-line hover:border-line-strong",
                        editandoMiUsuario && r.value !== "ADMIN" && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="pu-rol"
                        className="mt-0.5"
                        value={r.value}
                        checked={rol === r.value}
                        disabled={editandoMiUsuario && r.value !== "ADMIN"}
                        onChange={() => setRol(r.value)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-ink">{r.label}</span>
                        <span className="mt-0.5 block text-xs text-muted">{r.descripcion}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {formDialogo.tipo !== "password" && rol === "EDITOR" && (
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-muted">
                  Aplicaciones <span className="text-[#e5484d]">*</span>
                </legend>
                {appsRes.loading && !appsRes.data ? (
                  <p className="text-sm text-muted">Cargando aplicaciones…</p>
                ) : apps.length === 0 ? (
                  <Alert>No hay aplicaciones registradas. Ejecuta el seed de bk_opendata.</Alert>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {apps.map((a) => {
                      const marcada = appsSel.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                            marcada ? "border-ink bg-surface-muted" : "border-line hover:border-line-strong",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={marcada}
                            onChange={(e) =>
                              setAppsSel((sel) => (e.target.checked ? [...sel, a.id] : sel.filter((x) => x !== a.id)))
                            }
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium text-ink">
                              <span className="h-2 w-2 rounded-full" style={{ background: colorApp(a.id) }} />
                              {a.name}
                            </span>
                            {a.description && <span className="mt-0.5 block text-xs text-muted">{a.description}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {errores.apps && <p className="mt-1.5 text-xs text-red-600">{errores.apps}</p>}
              </fieldset>
            )}

            {(formDialogo.tipo === "nuevo" || formDialogo.tipo === "password") && (
              <Field
                label={formDialogo.tipo === "nuevo" ? "Contraseña" : "Nueva contraseña"}
                htmlFor="pu-password"
                required
                error={errores.password}
                hint={PASSWORD_HINT}
              >
                <PasswordInput
                  id="pu-password"
                  value={password}
                  onChange={setPassword}
                  invalid={Boolean(errores.password)}
                  generate
                  copy
                />
              </Field>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={dialogo?.tipo === "estado"}
        onCancel={cerrar}
        loading={guardando}
        danger={dialogo?.tipo === "estado" && dialogo.user.active}
        title={dialogo?.tipo === "estado" ? `${dialogo.user.active ? "Desactivar" : "Activar"} a ${dialogo.user.email}` : ""}
        description={
          dialogo?.tipo === "estado" ? (
            <>
              {dialogo.user.active
                ? "Perderá el acceso al panel de inmediato, incluso si tiene la sesión abierta."
                : "Podrá volver a iniciar sesión con su contraseña actual."}
              {errorServidor && <span className="mt-3 block text-red-600">{errorServidor}</span>}
            </>
          ) : undefined
        }
        confirmLabel={dialogo?.tipo === "estado" && dialogo.user.active ? "Desactivar" : "Activar"}
        onConfirm={() => {
          if (dialogo?.tipo !== "estado") return;
          const { user } = dialogo;
          ejecutar(
            () => api.patch(`/api/admin/users/${user.id}`, { active: !user.active }),
            `${user.email} ${user.active ? "desactivado" : "activado"}.`,
          );
        }}
      />
    </>
  );
}
