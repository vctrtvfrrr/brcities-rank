import { useId, useState } from "react";
import { searchCities } from "../domain/city-search";
import type { Dataset } from "../domain/dataset";

type Props = { dataset: Dataset; cutCodes: Set<string>; onSelect: (code: string) => void };

export function CitySearch({ dataset, cutCodes, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const matches = searchCities(dataset, query);
  return (
    <>
      <input
        type="search"
        value={query}
        placeholder="Nome da cidade"
        aria-label="Buscar cidade, inclusive as cortadas"
        aria-controls={listId}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul id={listId} className="city-matches" aria-label="Cidades encontradas">
        {matches.map((city) => (
          <li key={city.code}>
            <button type="button" className="link" onClick={() => onSelect(city.code)}>
              {city.name} {city.uf}
            </button>
            {cutCodes.has(city.code) && <span className="muted small"> · Fora do Corte</span>}
          </li>
        ))}
      </ul>
      {query.trim() !== "" && matches.length === 0 && (
        <p role="status" className="muted small">
          Nenhuma cidade encontrada.
        </p>
      )}
    </>
  );
}
