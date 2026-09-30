"use client";

import type { Company } from "@/lib/types";
import { SourceBadge } from "@/components/ui";
import { EditResource } from "@/components/forms/EditResource";
import { CompanyForm } from "@/components/forms/CompanyForm";

export default function EditarEmpresaPage() {
  return (
    <EditResource<Company>
      endpoint="/api/admin/companies"
      listPath="/dashboard/opendata/empresas"
      listLabel="Empresas"
      title={(c) => c.businessName}
      subtitle={(c) => (
        <>
          <SourceBadge source={c.source} />
          <span className="font-mono">RUC {c.ruc}</span>
        </>
      )}
    >
      {(company) => <CompanyForm company={company} />}
    </EditResource>
  );
}
