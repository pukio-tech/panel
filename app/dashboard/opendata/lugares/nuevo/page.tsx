"use client";

import { PageHeader } from "@/components/ui";
import { PlaceForm } from "@/components/forms/PlaceForm";

export default function NuevoLugarPage() {
  return (
    <>
      <PageHeader
        title="Nuevo lugar turístico"
        subtitle="Se guardará en el inventario turístico con código propio (900001+)."
        back={{ href: "/dashboard/opendata/lugares", label: "Turismo" }}
      />
      <PlaceForm />
    </>
  );
}
