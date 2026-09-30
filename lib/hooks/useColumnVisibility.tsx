"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Column } from "@/components/ui";
import { ColumnPicker } from "@/components/ui";

/*
 * Preferencia de columnas visibles por tabla, guardada en localStorage
 * (por navegador). Se guarda la lista de columnas OCULTAS para que las
 * columnas nuevas que se agreguen en el futuro aparezcan visibles.
 */

const EVENT = "cc-columns-change";
const PREFIX = "cc_columns:";

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, hidden: string[] | null) {
  try {
    if (hidden === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(hidden));
  } catch {
    /* localStorage no disponible: la preferencia no se persiste */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Devuelve las columnas visibles y el control <ColumnPicker /> para la toolbar.
 * - `defaultHidden` en la columna: oculta por defecto (hasta que el usuario la active).
 * - `alwaysVisible` en la columna: no se puede ocultar (ej. nombre, acciones).
 */
export function useColumnVisibility<T>(storageKey: string, columns: Column<T>[]) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null,
  );

  // Clave estable de los defaults (columns es un array nuevo en cada render).
  const defaultsKey = columns
    .filter((c) => c.defaultHidden)
    .map((c) => c.key)
    .join("|");

  const hidden = useMemo<Set<string>>(() => {
    if (raw) {
      try {
        return new Set(JSON.parse(raw) as string[]);
      } catch {
        /* valor corrupto: usar defaults */
      }
    }
    return new Set(defaultsKey ? defaultsKey.split("|") : []);
  }, [raw, defaultsKey]);

  const visibleColumns = columns.filter((c) => c.alwaysVisible || !hidden.has(c.key));

  const toggle = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    write(storageKey, [...next]);
  };

  const control = (
    <ColumnPicker
      columns={columns
        .filter((c) => !c.alwaysVisible)
        .map((c) => ({ key: c.key, label: c.label ?? (typeof c.header === "string" ? c.header : c.key) }))}
      hidden={hidden}
      onToggle={toggle}
      onReset={() => write(storageKey, null)}
    />
  );

  return { visibleColumns, control };
}
