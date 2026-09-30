"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MANAGED_APPS } from "@/lib/apps";
import { cn } from "@/lib/utils";
import { SearchIcon } from "@/components/icons";
import { Kbd } from "@/components/ui";
import { NAV_ICONS } from "./nav-icons";

interface Command {
  id: string;
  label: string;
  group: string;
  href: string;
  icon: keyof typeof NAV_ICONS;
  keywords: string;
}

/** Acciones rápidas adicionales a los ítems del menú. */
const EXTRA: Omit<Command, "id">[] = [
  { label: "Crear lugar turístico", group: "Acciones", href: "/dashboard/opendata/lugares/nuevo", icon: "map", keywords: "nuevo" },
  { label: "Crear museo", group: "Acciones", href: "/dashboard/opendata/museos/nuevo", icon: "landmark", keywords: "nuevo" },
  { label: "Crear empresa", group: "Acciones", href: "/dashboard/opendata/empresas/nuevo", icon: "building", keywords: "nuevo ruc" },
  { label: "Escribir artículo", group: "Acciones", href: "/dashboard/opendata/blog/nuevo", icon: "file", keywords: "nuevo post" },
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const nav = MANAGED_APPS.flatMap((app) =>
      app.sections.flatMap((s) =>
        s.items.map((i) => ({
          id: i.href,
          label: i.label,
          group: `${app.name} · ${s.title}`,
          href: i.href,
          icon: i.icon,
          keywords: i.keywords ?? "",
        })),
      ),
    );
    return [...nav, ...EXTRA.map((e) => ({ ...e, id: e.href }))];
  }, []);

  const results = useMemo(() => {
    const q = normalize(term.trim());
    if (!q) return commands;
    return commands.filter((c) => normalize(`${c.label} ${c.group} ${c.keywords}`).includes(q));
  }, [commands, term]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function go(cmd: Command | undefined) {
    if (!cmd) return;
    onClose();
    router.push(cmd.href);
  }

  function handleClose() {
    setTerm("");
    setIndex(0);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <SearchIcon className="text-subtle" />
        <input
          autoFocus
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[index]);
            }
          }}
          placeholder="Buscar o ir a…"
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          aria-label="Buscar o ir a"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul className="scroll-thin max-h-80 overflow-y-auto p-1.5" role="listbox">
        {results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted">Sin coincidencias</li>
        )}
        {results.map((cmd, i) => {
          const Icon = NAV_ICONS[cmd.icon];
          return (
            <li key={cmd.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(cmd)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                  i === index ? "bg-hover text-ink" : "text-ink-soft",
                )}
              >
                <Icon width={16} height={16} className="text-muted" />
                <span className="flex-1">{cmd.label}</span>
                <span className="text-xs text-subtle">{cmd.group}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
