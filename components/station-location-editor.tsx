"use client";

import { useState } from "react";
import { LocationSelect } from "./location-select";

export function StationLocationEditor({ initialPrefecture = "", initialMunicipality = "" }: { initialPrefecture?: string; initialMunicipality?: string }) {
  const [prefecture, setPrefecture] = useState(initialPrefecture);
  const [municipality, setMunicipality] = useState(initialMunicipality);
  return <LocationSelect
    prefecture={prefecture}
    municipality={municipality}
    onPrefectureChange={setPrefecture}
    onMunicipalityChange={setMunicipality}
    selectionMode
    prefectureName="prefecture"
    municipalityName="municipality"
  />;
}
