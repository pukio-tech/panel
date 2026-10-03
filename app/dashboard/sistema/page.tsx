import { redirect } from "next/navigation";

/** /dashboard/sistema no tiene contenido propio: abre «Mi cuenta» (visible para todos). */
export default function SistemaPage() {
  redirect("/dashboard/sistema/cuenta");
}
