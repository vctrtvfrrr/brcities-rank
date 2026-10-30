import type { Dataset } from "../domain/dataset";
import type { Constraint } from "../domain/session";

const value = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatValue = (n: number, unit = "") => (unit ? `${value.format(n)} ${unit}` : value.format(n));
export const formatNote = (note: number) => integer.format(note);
export const formatGrade = (grade: number) => oneDecimal.format(grade);
export const formatScore = (score: number) => oneDecimal.format(score);
export const formatCount = (n: number) => integer.format(n);
export const formatDate = (iso: string) => iso.split("-").reverse().join("/");

export function describeConstraint(dataset: Dataset, constraint: Constraint): string {
  if ("voltages" in constraint) {
    return `Tensão ${constraint.voltages.length ? constraint.voltages.map((v) => `${v} V`).join(" ou ") : "(nenhuma tensão aceita)"}`;
  }
  if ("states" in constraint) {
    return `Localização ${constraint.states.length > 0 ? constraint.states.join(", ") : "(nenhum estado aceito)"}`;
  }
  if ("accepted" in constraint) {
    const label = constraint.criterion === "classe_relevo" ? "Classe de relevo" : "Köppen";
    return `${label} ${constraint.accepted.length > 0 ? constraint.accepted.join(", ") : "(nenhuma classe aceita)"}`;
  }
  if ("atLeast" in constraint) {
    return constraint.atLeast === null
      ? "Pontuação mínima (sem mínimo)"
      : `Pontuação ≥ ${formatValue(constraint.atLeast)}`;
  }
  const entry = dataset.catalogo.find((e) => e.chave === constraint.criterion)!;
  if ("value" in constraint) return `${entry.rotulo}: ${constraint.value ? "sim" : "não"}`;
  const limits = [
    constraint.min !== null && `≥ ${formatValue(constraint.min)}`,
    constraint.max !== null && `≤ ${formatValue(constraint.max)}`,
  ].filter(Boolean);
  if (limits.length === 0) return `${entry.rotulo} (sem limite)`;
  return `${entry.rotulo} ${limits.join(" e ")}${entry.unidade ? ` ${entry.unidade}` : ""}`;
}
