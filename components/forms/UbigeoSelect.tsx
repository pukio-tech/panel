"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Option } from "@/lib/types";
import { titleCase } from "@/lib/utils";
import { Field, Select } from "@/components/ui";

const UBIGEO_ENDPOINT = "/api/admin/places/ubigeo";

async function fetchChildren(parent: string): Promise<Option[]> {
  const res = await api.get<{ data: Option[] }>(UBIGEO_ENDPOINT, { query: { parent } });
  return res.data;
}

/**
 * Selector en cascada Región → Provincia → Distrito que entrega el ubigeo
 * (6 dígitos) del distrito. Acepta un ubigeo inicial (modo edición) y
 * precarga provincias y distritos a partir de él.
 */
export function UbigeoSelect({
  departments,
  value,
  onChange,
  required,
  idPrefix = "ubigeo",
}: {
  departments: Option[];
  value: string;
  onChange: (ubigeo: string) => void;
  required?: boolean;
  idPrefix?: string;
}) {
  const [departmentId, setDepartmentId] = useState(value ? value.slice(0, 2) : "");
  const [provinceId, setProvinceId] = useState(value ? value.slice(0, 4) : "");
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);

  // Precarga para edición (solo con el ubigeo inicial).
  const [initialUbigeo] = useState(value);
  useEffect(() => {
    if (!initialUbigeo || initialUbigeo.length !== 6) return;
    let cancelled = false;
    Promise.all([
      fetchChildren(initialUbigeo.slice(0, 2)),
      fetchChildren(initialUbigeo.slice(0, 4)),
    ])
      .then(([p, d]) => {
        if (cancelled) return;
        setProvinces(p);
        setDistricts(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialUbigeo]);

  async function changeDepartment(id: string) {
    setDepartmentId(id);
    setProvinceId("");
    setProvinces([]);
    setDistricts([]);
    onChange("");
    if (id) setProvinces(await fetchChildren(id).catch(() => []));
  }

  async function changeProvince(id: string) {
    setProvinceId(id);
    setDistricts([]);
    onChange("");
    if (id) setDistricts(await fetchChildren(id).catch(() => []));
  }

  return (
    <>
      <Field label="Región" htmlFor={`${idPrefix}-dep`} required={required}>
        <Select
          id={`${idPrefix}-dep`}
          required={required}
          value={departmentId}
          onChange={(e) => changeDepartment(e.target.value)}
          disabled={!departments.length}
        >
          <option value="">Selecciona…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {titleCase(d.name)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Provincia" htmlFor={`${idPrefix}-prov`} required={required}>
        <Select
          id={`${idPrefix}-prov`}
          required={required}
          value={provinceId}
          onChange={(e) => changeProvince(e.target.value)}
          disabled={!provinces.length}
        >
          <option value="">Selecciona…</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {titleCase(p.name)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Distrito" htmlFor={`${idPrefix}-dist`} required={required}>
        <Select
          id={`${idPrefix}-dist`}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!districts.length}
        >
          <option value="">Selecciona…</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {titleCase(d.name)}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
