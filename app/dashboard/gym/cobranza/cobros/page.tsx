"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { CobrosTabla, NuevoCobroBoton } from "@/components/gym/cobranza";

export default function CobrosPage() {
  const [version, setVersion] = useState(0);
  return (
    <>
      <PageHeader
        title="Cobros y pagos"
        subtitle="Mensualidades, implementaciones y servicios cobrados a cada gimnasio. Abre un cobro para ver sus pagos y su trazabilidad."
        actions={<NuevoCobroBoton onCreated={() => setVersion((v) => v + 1)} />}
      />
      <CobrosTabla version={version} />
    </>
  );
}
