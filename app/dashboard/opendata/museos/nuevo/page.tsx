"use client";

import { PageHeader } from "@/components/ui";
import { MuseumForm } from "@/components/forms/MuseumForm";

export default function NuevoMuseoPage() {
  return (
    <>
      <PageHeader
        title="Nuevo museo"
        subtitle="Agrega un museo que no figura en museos.cultura.pe."
        back={{ href: "/dashboard/opendata/museos", label: "Museos" }}
      />
      <MuseumForm />
    </>
  );
}
