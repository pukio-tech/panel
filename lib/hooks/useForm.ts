"use client";

import { useState, type ChangeEvent } from "react";

type FormValues = Record<string, string | boolean>;

/**
 * Estado de formulario simple. Todos los valores son string/boolean (lo que
 * entregan los inputs); la conversión a números/fechas se hace al enviar.
 */
export function useForm<T extends FormValues>(initial: T) {
  const [values, setValues] = useState<T>(initial);

  const setValue = <K extends keyof T>(key: K, value: T[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  /** Handler para onChange de Input/Textarea/Select. */
  const bind =
    (key: keyof T) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  return { values, setValues, setValue, bind };
}

/**
 * Devuelve solo los campos que cambiaron respecto al valor inicial.
 * Se usa en los PATCH para no reenviar (ni sobrescribir) campos intactos.
 */
export function changedFields<T extends Record<string, unknown>>(
  initial: T,
  current: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(current).filter(([k, v]) => v !== initial[k]),
  ) as Partial<T>;
}
