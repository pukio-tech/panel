"use client";

import type { TouristPlace } from "@/lib/types";
import { SourceBadge } from "@/components/ui";
import { EditResource } from "@/components/forms/EditResource";
import { PlaceForm } from "@/components/forms/PlaceForm";

export default function EditarLugarPage() {
  return (
    <EditResource<TouristPlace>
      endpoint="/api/admin/places"
      listPath="/dashboard/opendata/lugares"
      listLabel="Turismo"
      title={(p) => p.name}
      subtitle={(p) => (
        <>
          <SourceBadge source={p.source} importedLabel="MINCETUR" />
          <span>Código #{p.id}</span>
          {p.sourceUrl && (
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
              Ver ficha oficial ↗
            </a>
          )}
        </>
      )}
    >
      {(place) => <PlaceForm place={place} />}
    </EditResource>
  );
}
