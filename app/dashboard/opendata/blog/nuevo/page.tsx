"use client";

import { PageHeader } from "@/components/ui";
import { BlogForm } from "@/components/forms/BlogForm";

export default function NuevoPostPage() {
  return (
    <>
      <PageHeader
        title="Nuevo artículo"
        subtitle="Redacta una publicación para el blog de OpenData Perú."
        back={{ href: "/dashboard/opendata/blog", label: "Blog / Artículos" }}
      />
      <BlogForm />
    </>
  );
}
