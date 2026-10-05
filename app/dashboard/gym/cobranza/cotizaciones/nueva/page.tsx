"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { CotizacionForm } from "@/components/gym/CotizacionForm";
import { COTIZACIONES } from "@/components/gym/cobranza";

export default function NuevaCotizacionPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Nueva cotización"
        subtitle="Mismo cálculo que el cotizador: pago inicial, mensualidad, IGV y total del primer año."
        back={{ href: COTIZACIONES, label: "Cotizaciones" }}
      />
      <CotizacionForm onSaved={(c) => router.push(`${COTIZACIONES}/${c.id}`)} />
    </>
  );
}
