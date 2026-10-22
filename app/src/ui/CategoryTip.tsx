import type { Dataset } from "../domain/dataset";
import { explainCategory } from "../domain/explanations";
import { Tooltip } from "./Tooltip";

export function CategoryLabel({ dataset, id, name }: { dataset: Dataset; id: string; name: string }) {
  const explanation = explainCategory(dataset, id);
  if (!explanation) return <>{name}</>;
  return (
    <Tooltip label={name}>
      <strong>{name}</strong>
      <span className="tip-block">{explanation.measures}</span>
      <span className="tip-block">{explanation.details}</span>
      <span className="tip-block tip-title">Critérios</span>
      <ul>
        {explanation.criteria.map((criterion) => (
          <li key={criterion.label}>
            {criterion.label}
            {criterion.unit && ` (${criterion.unit})`}: {criterion.direction === "menor" ? "menor" : "maior"} é melhor
          </li>
        ))}
      </ul>
      <span className="tip-block tip-title">Como se calcula a nota</span>
      <span className="tip-block">{explanation.scoring}</span>
    </Tooltip>
  );
}
