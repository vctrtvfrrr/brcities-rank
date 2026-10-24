export type Region = { name: string; states: string[] };

export const REGIONS: Region[] = [
  { name: "Norte", states: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
  { name: "Nordeste", states: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  { name: "Centro-Oeste", states: ["DF", "GO", "MS", "MT"] },
  { name: "Sudeste", states: ["ES", "MG", "RJ", "SP"] },
  { name: "Sul", states: ["PR", "RS", "SC"] },
];

export const STATES = REGIONS.flatMap((region) => region.states);

export type RegionSelection = "all" | "some" | "none";

export const inStateOrder = (states: string[]) => STATES.filter((state) => states.includes(state));

export function regionSelection(states: string[], region: Region): RegionSelection {
  const count = region.states.filter((state) => states.includes(state)).length;
  if (count === region.states.length) return "all";
  return count > 0 ? "some" : "none";
}

export function toggleRegion(states: string[], region: Region): string[] {
  const others = states.filter((state) => !region.states.includes(state));
  return regionSelection(states, region) === "all" ? others : [...others, ...region.states];
}
