"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/types";

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Obtiene totales para varios filtros de un mismo endpoint (limit=1),
 * útil para los contadores de <FilterPills />.
 * `variants` debe ser estable (defínelo fuera del componente o con useMemo).
 */
export function useCounts<K extends string>(
  endpoint: string,
  variants: Record<K, Query>,
  refreshKey: unknown = 0,
) {
  const [counts, setCounts] = useState<Partial<Record<K, number>>>({});

  useEffect(() => {
    let cancelled = false;
    (Object.entries(variants) as [K, Query][]).forEach(([key, query]) => {
      api
        .get<ListResponse<unknown>>(endpoint, { query: { ...query, limit: 1 } })
        .then((res) => {
          if (!cancelled) setCounts((c) => ({ ...c, [key]: res.pagination.total }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [endpoint, variants, refreshKey]);

  return counts;
}
