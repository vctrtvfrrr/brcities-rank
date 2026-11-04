import type { Session } from "./session";

export const TERRAIN_CRITERION = "classe_relevo";
const RELIEF_CRITERIA = ["altitude", "declividade_urbana", TERRAIN_CRITERION];

export const TERRAIN_CLASSES = ["plano", "suave ondulado", "ondulado", "forte ondulado", "montanhoso", "escarpado"];

export function inTerrainOrder(classes: string[]): string[] {
  return TERRAIN_CLASSES.filter((name) => classes.includes(name));
}

export function showsRelief(session: Session): boolean {
  return session.constraints.some((c) => c.on && RELIEF_CRITERIA.includes(c.criterion));
}
