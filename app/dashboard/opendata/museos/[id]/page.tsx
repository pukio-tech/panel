"use client";

import type { Museum } from "@/lib/types";
import { SourceBadge } from "@/components/ui";
import { EditResource } from "@/components/forms/EditResource";
import { MuseumForm } from "@/components/forms/MuseumForm";

export default function EditarMuseoPage() {
  return (
    <EditResource<Museum>
      endpoint="/api/admin/museums"
      listPath="/dashboard/opendata/museos"
      listLabel="Museos"
      title={(m) => m.name}
      subtitle={(m) => (
        <>
          <SourceBadge source={m.source} />
          {m.sourceUrl?.startsWith("http") && (
            <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
              Ver en museos.cultura.pe ↗
            </a>
          )}
        </>
      )}
    >
      {(museum) => <MuseumForm museum={museum} />}
    </EditResource>
  );
}
