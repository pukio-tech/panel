"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import type { CiiuActivity, Company, CompanyOptions } from "@/lib/types";
import { compact, titleCase } from "@/lib/utils";
import { useApiData } from "@/lib/hooks/useApiData";
import { changedFields, useForm } from "@/lib/hooks/useForm";
import { useSave } from "@/lib/hooks/useSave";
import { Combobox, Field, FormSection, Input, Select, Switch, Textarea, type ComboboxOption } from "@/components/ui";
import { FormShell, ImportedNotice } from "./FormShell";
import { UbigeoSelect } from "./UbigeoSelect";

const ENDPOINT = "/api/admin/companies";
const LIST_PATH = "/dashboard/opendata/empresas";

/** Estados del padrón RUC de SUNAT. */
const TAXPAYER_STATUSES = [
  "ACTIVO",
  "SUSPENSION TEMPORAL",
  "BAJA PROVISIONAL",
  "BAJA DEFINITIVA",
  "BAJA DE OFICIO",
];

function toForm(c?: Company) {
  return {
    ruc: c?.ruc ?? "",
    businessName: c?.businessName ?? "",
    tradeName: c?.tradeName && c.tradeName !== "-" ? c.tradeName : "",
    taxpayerStatus: c?.taxpayerStatus ?? "ACTIVO",
    domicileCondition: c?.domicileCondition ?? "HABIDO",
    taxpayerType: c?.taxpayerType ?? "",
    ciiuCode: c?.ciiuCode ?? "",
    activityStartDate: c?.activityStartDate ?? "",
    address: c?.address ?? "",
    ubigeo: c?.ubigeo ?? "",
    representativeDni: c?.representativeDni ?? "",
    representativeFirstName: c?.representativeFirstName ?? "",
    representativeLastName1: c?.representativeLastName1 ?? "",
    representativeLastName2: c?.representativeLastName2 ?? "",
    phone: c?.phone ?? "",
    email: c?.email ?? "",
    website: c?.website ?? "",
    isActive: c?.isActive ?? true,
  };
}

const trimAll = (v: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "string" ? x.trim() : x]));

export function CompanyForm({ company }: { company?: Company }) {
  const editing = Boolean(company);
  const initial = toForm(company);
  const { values, setValue, bind } = useForm(initial);
  const [ciiuLabel, setCiiuLabel] = useState(
    company?.ciiuCode ? `${company.ciiuCode} · ${company.economicActivity ?? ""}` : "",
  );
  const { data: options } = useApiData<CompanyOptions>(`${ENDPOINT}/options`);
  const { save, saving, error, setError } = useSave<Company>({ endpoint: ENDPOINT, listPath: LIST_PATH });

  const searchCiiu = useCallback(async (term: string): Promise<ComboboxOption[]> => {
    const res = await api.get<{ data: CiiuActivity[] }>(`${ENDPOINT}/ciiu`, { query: { search: term } });
    return res.data.map((a) => ({ value: a.code, label: a.code, description: titleCase(a.description) }));
  }, []);

  function submit() {
    if (!/^\d{11}$/.test(values.ruc)) return setError("El RUC debe tener exactamente 11 dígitos.");
    if (values.representativeDni && !/^\d{8}$/.test(values.representativeDni))
      return setError("El DNI del representante debe tener 8 dígitos.");

    if (editing) {
      const diff = changedFields(initial, values);
      if (diff.ubigeo === "") delete diff.ubigeo; // región reiniciada sin completar
      save(trimAll(diff), company!.id);
    } else {
      save(compact(trimAll(values)));
    }
  }

  return (
    <FormShell
      onSubmit={submit}
      error={error}
      saving={saving}
      submitLabel={editing ? "Guardar cambios" : "Crear empresa"}
      cancelHref={LIST_PATH}
      notice={
        company?.source === "importado" && (
          <ImportedNotice source="el padrón de empresas" fields="Razón social, estado, condición, actividad económica y dirección" />
        )
      }
    >
      <FormSection title="Identificación" description="Datos del contribuyente según SUNAT.">
        <Field label="RUC" htmlFor="ruc" required hint="11 dígitos. Empieza con 10 (persona natural) o 20 (persona jurídica).">
          <Input
            id="ruc"
            required
            inputMode="numeric"
            maxLength={11}
            pattern="\d{11}"
            className="font-mono"
            value={values.ruc}
            onChange={(e) => setValue("ruc", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Tipo de contribuyente" htmlFor="taxpayerType">
          <Select id="taxpayerType" value={values.taxpayerType} onChange={bind("taxpayerType")} disabled={!options}>
            <option value="">Selecciona…</option>
            {options?.taxpayerTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {titleCase(t.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Razón social" htmlFor="businessName" required className="sm:col-span-2">
          <Input id="businessName" required value={values.businessName} onChange={bind("businessName")} />
        </Field>
        <Field label="Nombre comercial" htmlFor="tradeName" className="sm:col-span-2">
          <Input id="tradeName" value={values.tradeName} onChange={bind("tradeName")} />
        </Field>
        <Field label="Estado" htmlFor="taxpayerStatus">
          <Select id="taxpayerStatus" value={values.taxpayerStatus} onChange={bind("taxpayerStatus")}>
            {TAXPAYER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condición del domicilio" htmlFor="domicileCondition">
          <Select id="domicileCondition" value={values.domicileCondition} onChange={bind("domicileCondition")}>
            {(options?.domicileConditions ?? ["HABIDO"]).map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Switch
            id="isActive"
            label="Activo"
            description="Si lo desactivas deja de mostrarse en la web pública."
            checked={values.isActive}
            onChange={(v) => setValue("isActive", v)}
          />
        </div>
      </FormSection>

      <FormSection title="Actividad económica" description="Clasificación CIIU y fecha de inicio.">
        <Field label="Actividad (CIIU)" htmlFor="ciiuCode" className="sm:col-span-2" hint="Busca por código o descripción, ej. «turismo» o «5510».">
          <Combobox
            id="ciiuCode"
            value={values.ciiuCode}
            selectedLabel={ciiuLabel}
            placeholder="Buscar actividad…"
            search={searchCiiu}
            onChange={(opt) => {
              setValue("ciiuCode", opt?.value ?? "");
              setCiiuLabel(opt ? `${opt.label} · ${opt.description ?? ""}` : "");
            }}
          />
        </Field>
        <Field label="Inicio de actividades" htmlFor="activityStartDate">
          <Input id="activityStartDate" type="date" value={values.activityStartDate} onChange={bind("activityStartDate")} />
        </Field>
      </FormSection>

      <FormSection
        title="Domicilio fiscal"
        description={
          editing && company?.department
            ? `Actual: ${titleCase(company.department)} / ${titleCase(company.province)} / ${titleCase(company.district)}.`
            : "Dirección y ubicación del domicilio fiscal."
        }
      >
        <Field label="Dirección" htmlFor="address" className="sm:col-span-2">
          <Textarea id="address" rows={2} value={values.address} onChange={bind("address")} />
        </Field>
        <div className="grid gap-5 sm:col-span-2 sm:grid-cols-3">
          <UbigeoSelect departments={options?.departments ?? []} value={values.ubigeo} onChange={(u) => setValue("ubigeo", u)} />
        </div>
      </FormSection>

      <FormSection title="Contacto" description="Estos datos no los sobrescribe la carga automática.">
        <Field label="Teléfono" htmlFor="phone">
          <Input id="phone" type="tel" value={values.phone} onChange={bind("phone")} />
        </Field>
        <Field label="Correo electrónico" htmlFor="email">
          <Input id="email" type="email" value={values.email} onChange={bind("email")} />
        </Field>
        <Field label="Sitio web" htmlFor="website" className="sm:col-span-2">
          <Input id="website" type="url" placeholder="https://" value={values.website} onChange={bind("website")} />
        </Field>
      </FormSection>

      <FormSection title="Representante legal">
        <Field label="DNI" htmlFor="representativeDni">
          <Input
            id="representativeDni"
            inputMode="numeric"
            maxLength={8}
            className="font-mono"
            value={values.representativeDni}
            onChange={(e) => setValue("representativeDni", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Nombres" htmlFor="representativeFirstName">
          <Input id="representativeFirstName" value={values.representativeFirstName} onChange={bind("representativeFirstName")} />
        </Field>
        <Field label="Apellido paterno" htmlFor="representativeLastName1">
          <Input id="representativeLastName1" value={values.representativeLastName1} onChange={bind("representativeLastName1")} />
        </Field>
        <Field label="Apellido materno" htmlFor="representativeLastName2">
          <Input id="representativeLastName2" value={values.representativeLastName2} onChange={bind("representativeLastName2")} />
        </Field>
      </FormSection>
    </FormShell>
  );
}
