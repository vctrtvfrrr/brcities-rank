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
  if ("accepted" in constraint) {
    return `Köppen ${constraint.accepted.length > 0 ? constraint.accepted.join(", ") : "(nenhuma classe aceita)"}`;
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
