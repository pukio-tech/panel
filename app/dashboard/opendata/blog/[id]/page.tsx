"use client";

import type { BlogPost } from "@/lib/types";
import { StatusBadge } from "@/components/ui";
import { EditResource } from "@/components/forms/EditResource";
import { BlogForm } from "@/components/forms/BlogForm";

export default function EditarPostPage() {
  return (
    <EditResource<BlogPost>
      endpoint="/api/admin/posts"
      listPath="/dashboard/opendata/blog"
      listLabel="Blog / Artículos"
      title={(p) => p.title}
      subtitle={(p) => <StatusBadge active={p.isPublished} activeLabel="Publicado" inactiveLabel="Borrador" />}
    >
      {(post) => <BlogForm post={post} />}
    </EditResource>
  );
}
