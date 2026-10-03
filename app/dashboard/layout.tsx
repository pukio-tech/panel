"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  api,
  clearSession,
  getToken,
  getUser,
  isTokenExpired,
  setSession,
  subscribeSession,
  type SessionUser,
} from "@/lib/api";
import { appsDelUsuario, esSuperadmin, getActiveItem, getAppByPath, puedeAccederApp } from "@/lib/apps";
import { useSessionUser } from "@/lib/hooks/useSessionUser";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { Spinner, ToastProvider } from "@/components/ui";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // `undefined` en servidor/hidratación → aún no sabemos si hay sesión.
  const token = useSyncExternalStore(subscribeSession, getToken, () => undefined);
  const user = useSessionUser();
  const pathname = usePathname();

  const authenticated = typeof token === "string" && !isTokenExpired(token);

  // Acceso por app: el usuario solo entra a las apps asignadas (el backend también lo valida).
  const app = getAppByPath(pathname);
  const item = getActiveItem(app, pathname);
  const acceso = puedeAccederApp(app, user);
  const denegado = acceso === false || Boolean(item?.adminOnly && user && !esSuperadmin(user));

  useEffect(() => {
    if (!authenticated || !denegado) return;
    const destino = appsDelUsuario(user).find((a) => !a.system);
    router.replace(destino ? destino.basePath : "/dashboard/sistema/cuenta");
  }, [authenticated, denegado, user, router]);

  // Guard de autenticación: sin token válido → /login
  useEffect(() => {
    if (token === undefined) return;
    if (!authenticated) {
      clearSession();
      router.replace("/login");
    }
  }, [token, authenticated, router]);

  // Refresca los datos del usuario desde el backend (valida el token en servidor).
  useEffect(() => {
    if (!authenticated) return;
    api
      .get<{ user: SessionUser }>("/api/auth/me")
      .then((res) => {
        const current = getToken();
        if (res?.user && current) setSession(current, { ...getUser(), ...res.user });
      })
      .catch(() => {
        /* 401 ya es manejado por apiFetch */
      });
  }, [authenticated]);

  // Atajo global Ctrl/⌘ + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!authenticated || denegado) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen w-full min-w-0">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          onSearch={() => setPaletteOpen(true)}
          user={user}
        />
        {/* min-w-0 + overflow-x-clip: el contenido nunca ensancha la página (las tablas
            anchas hacen scroll dentro de su propia tarjeta). `clip` no rompe el header sticky. */}
        <div className="min-w-0 overflow-x-clip lg:pl-[256px]">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            onSearchClick={() => setPaletteOpen(true)}
          />
          <main className="mx-auto w-full min-w-0 max-w-[1400px] px-4 py-8 sm:px-8">{children}</main>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </ToastProvider>
  );
}
