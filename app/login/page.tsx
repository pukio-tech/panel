"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, getToken, isTokenExpired, setSession } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";
import { Alert, Button, Field, Input } from "@/components/ui";
import { LayersIcon } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expired = params.get("expired") === "1";

  // Si ya hay una sesión válida, saltar directo al dashboard.
  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>(
        "/api/auth/login",
        { email: email.trim(), password },
        { auth: false },
      );
      setSession(res.accessToken, res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ocurrió un error inesperado.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {expired && !error && <Alert tone="info">Tu sesión expiró. Vuelve a iniciar sesión.</Alert>}
      {error && <Alert>{error}</Alert>}

      <Field label="Correo electrónico" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@empresa.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Ingresando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
            <LayersIcon />
          </span>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-ink">Control Center</h1>
          <p className="mt-1 text-sm text-muted">Ingresa para administrar tus aplicaciones</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
