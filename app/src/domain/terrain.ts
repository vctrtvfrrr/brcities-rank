export const TERRAIN_CRITERION = "classe_relevo";

export const TERRAIN_CLASSES = ["plano", "suave ondulado", "ondulado", "forte ondulado", "montanhoso", "escarpado"];

export function inTerrainOrder(classes: string[]): string[] {
  return TERRAIN_CLASSES.filter((name) => classes.includes(name));
}
