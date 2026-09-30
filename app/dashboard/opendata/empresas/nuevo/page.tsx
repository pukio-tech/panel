"use client";

import { PageHeader } from "@/components/ui";
import { CompanyForm } from "@/components/forms/CompanyForm";

export default function NuevaEmpresaPage() {
  return (
    <>
      <PageHeader
        title="Nueva empresa"
        subtitle="Registra un contribuyente que no está en el padrón importado."
        back={{ href: "/dashboard/opendata/empresas", label: "Empresas" }}
      />
      <CompanyForm />
    </>
  );
}
