"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./form";
import { Spinner } from "./feedback";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Combobox con búsqueda asíncrona. `search(term)` devuelve las opciones;
 * `value` es el valor seleccionado y `selectedLabel` su texto visible.
 */
export function Combobox({
  id,
  value,
  selectedLabel,
  onChange,
  search,
  placeholder,
  minChars = 1,
}: {
  id: string;
  value: string;
  selectedLabel?: string;
  onChange: (option: ComboboxOption | null) => void;
  search: (term: string) => Promise<ComboboxOption[]>;
  placeholder?: string;
  minChars?: number;
}) {
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const open = editing && term.trim().length >= minChars;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      search(term.trim())
        .then((res) => {
          if (!cancelled) {
            setOptions(res);
            setActive(0);
          }
        })
        .catch(() => !cancelled && setOptions([]))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, term, search]);

  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setEditing(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editing]);

  function pick(opt: ComboboxOption) {
    onChange(opt);
    setEditing(false);
    setTerm("");
  }

  const display = editing ? term : value ? (selectedLabel ?? value) : "";

  return (
    <div ref={ref} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onFocus={() => {
          setEditing(true);
          setTerm("");
        }}
        onChange={(e) => {
          setEditing(true);
          setTerm(e.target.value);
          if (!e.target.value) onChange(null);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        // `trailing` siempre definido: si alterna con undefined, <Input> cambia de
        // estructura y el <input> se remonta perdiendo el foco al escribir.
        trailing={<span className="flex w-4 justify-center">{loading && <Spinner className="h-3.5 w-3.5 text-subtle" />}</span>}
      />
      {open && (
        <ul
          role="listbox"
          className="scroll-thin absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {!loading && options.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">Sin coincidencias</li>
          )}
          {options.map((opt, i) => (
            <li key={opt.value} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(opt)}
                className={cn(
                  "flex w-full flex-col rounded-md px-3 py-2 text-left text-sm",
                  i === active ? "bg-hover text-ink" : "text-ink-soft",
                )}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.description && <span className="text-xs text-muted">{opt.description}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
