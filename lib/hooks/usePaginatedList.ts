"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ListResponse, Pagination } from "@/lib/types";

type Filters = Record<string, string | number | boolean | undefined>;

/**
 * Listado paginado genérico con búsqueda (debounce) y filtros.
 * Todos los estados de carga se cambian en handlers/callbacks (no en el
 * cuerpo de los efectos) para cumplir las reglas de React Compiler.
 */
export function usePaginatedList<T>(
  endpoint: string,
  { pageSize = 20, initialFilters = {} as Filters } = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFiltersState] = useState<Filters>(initialFilters);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ListResponse<T>>(endpoint, {
        query: { page, limit: pageSize, search: query, ...JSON.parse(filtersKey) },
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setPagination(res.pagination);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista.");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [endpoint, page, pageSize, query, filtersKey, reloadKey]);

  // Debounce de la búsqueda
  useEffect(() => {
    const next = search.trim();
    if (next === query) return;
    const t = setTimeout(() => {
      setLoading(true);
      setPage(1);
      setQuery(next);
    }, 350);
    return () => clearTimeout(t);
  }, [search, query]);

  return {
    items,
    pagination,
    loading,
    error,
    page,
    search,
    filters,
    /** Cambia tras cada reload() (útil para refrescar contadores). */
    version: reloadKey,
    setSearch,
    goToPage: (p: number) => {
      setLoading(true);
      setPage(p);
    },
    setFilter: (key: string, value: Filters[string]) => {
      setLoading(true);
      setPage(1);
      setFiltersState((f) => ({ ...f, [key]: value }));
    },
    reload: () => {
      setLoading(true);
      setReloadKey((k) => k + 1);
    },
  };
}
