import { useEffect, useMemo, useRef, useState } from "react";
import {
  addConstraint,
  constraintOptions,
  editConstraint,
  koppenClasses,
  MAX_SCORE,
  numericRange,
  removeConstraint,
  toggleConstraint,
  type ConstraintEdit,
} from "../domain/constraints";
import type { CatalogEntry, Dataset } from "../domain/dataset";
import { REGIONS, regionSelection, toggleRegion } from "../domain/regions";
import type { Constraint, Session } from "../domain/session";
import { TERRAIN_CLASSES, TERRAIN_CRITERION } from "../domain/terrain";
import { VOLTAGES, type Voltage } from "../domain/voltage";
import { Tooltip } from "./Tooltip";
import { explainConstraint } from "../domain/explanations";

type Props = {
  dataset: Dataset;
  session: Session;
  cutCounts: Record<string, number>;
  onChange: (update: (session: Session) => Session) => void;
};

const COMMIT_DELAY_MS = 200;
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function Filters({ dataset, session, cutCounts, onChange }: Props) {
  const options = constraintOptions(dataset, session);
  const labels = useMemo(() => constraintLabels(dataset), [dataset]);
  const groups = useMemo(() => [...new Set(options.map((o) => o.group))], [options]);
  return (
    <>
      <select
        className="add-constraint"
        aria-label="Acrescentar restrição"
        value=""
        onChange={(event) => event.target.value && onChange((s) => addConstraint(dataset, s, event.target.value))}
      >
        <option value="">+ Acrescentar restrição…</option>
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {options
              .filter((o) => o.group === group)
              .map((o) => (
                <option key={o.criterion} value={o.criterion}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {session.constraints.length === 0 ? (
        <p className="muted small">Nenhuma restrição: todas as cidades são Candidatas.</p>
      ) : (
        session.constraints.map((constraint) => (
          <ConstraintCard
            key={constraint.criterion}
            dataset={dataset}
            constraint={constraint}
            label={labels[constraint.criterion]}
            cuts={cutCounts[constraint.criterion] ?? 0}
            onChange={onChange}
          />
        ))
      )}
    </>
  );
}

function constraintLabels(dataset: Dataset): Record<string, string> {
  const labels: Record<string, string> = Object.fromEntries(dataset.catalogo.map((c) => [c.chave, c.rotulo]));
  labels.koppen = "Clima Köppen";
  labels.location = "Localização";
  labels.score = "Pontuação mínima";
  return labels;
}

function ConstraintCard({
  dataset,
  constraint,
  label,
  cuts,
  onChange,
}: {
  dataset: Dataset;
  constraint: Constraint;
  label: string;
  cuts: number;
  onChange: Props["onChange"];
}) {
  const { criterion, on } = constraint;
  const explanation = explainConstraint(criterion);
  const edit = (change: ConstraintEdit) => onChange((s) => editConstraint(s, criterion, change));
  return (
    <div className={on ? "restr" : "restr off"}>
      <div className="restr-head">
        <button
          type="button"
          className={on ? "toggle on" : "toggle"}
          role="switch"
          aria-checked={on}
          aria-label={`Ligar ou desligar a restrição ${label}`}
          onClick={() => onChange((s) => toggleConstraint(s, criterion))}
        />
        <b className="grow">{explanation ? <Tooltip label={label}>{explanation}</Tooltip> : label}</b>
        <span className={cuts > 0 ? "tag warn" : "tag"} title="Cidades que esta restrição corta sozinha, ligada ou não">
          corta {cuts.toLocaleString("pt-BR")}
        </span>
        <button
          type="button"
          className="ghost"
          aria-label={`Retirar a restrição ${label}`}
          onClick={() => onChange((s) => removeConstraint(s, criterion))}
        >
          ✕
        </button>
      </div>
      {"voltages" in constraint ? (
        <VoltageEditor voltages={constraint.voltages} onChange={(voltages) => edit({ voltages })} />
      ) : "states" in constraint ? (
        <StatesEditor states={constraint.states} onChange={(states) => edit({ states })} />
      ) : "accepted" in constraint ? (
        criterion === TERRAIN_CRITERION ? (
          <TerrainEditor accepted={constraint.accepted} onChange={(accepted) => edit({ accepted })} />
        ) : (
          <KoppenEditor
            classes={koppenClasses(dataset)}
            accepted={constraint.accepted}
            onChange={(accepted) => edit({ accepted })}
          />
        )
      ) : "atLeast" in constraint ? (
        <ScoreEditor atLeast={constraint.atLeast} onChange={(atLeast) => edit({ atLeast })} />
      ) : "value" in constraint ? (
        <BooleanEditor value={constraint.value} onChange={(value) => edit({ value })} />
      ) : (
        <NumericEditor
          dataset={dataset}
          entry={dataset.catalogo.find((c) => c.chave === criterion)!}
          constraint={constraint}
          onEdit={edit}
        />
      )}
    </div>
  );
}

function VoltageEditor({ voltages, onChange }: { voltages: Voltage[]; onChange: (voltages: Voltage[]) => void }) {
  return (
    <div className="kchips" role="group" aria-label="Tensões aceitas">
      {VOLTAGES.map((voltage) => (
        <button
          type="button"
          key={voltage}
          className={voltages.includes(voltage) ? "kchip on" : "kchip"}
          aria-pressed={voltages.includes(voltage)}
          onClick={() =>
            onChange(voltages.includes(voltage) ? voltages.filter((v) => v !== voltage) : [...voltages, voltage])
          }
        >
          {voltage} V
        </button>
      ))}
    </div>
  );
}

function TerrainEditor({ accepted, onChange }: { accepted: string[]; onChange: (accepted: string[]) => void }) {
  return (
    <>
      <p className="muted small">Classe que cobre a maior área do município, da mais plana à mais acidentada.</p>
      <div className="kchips">
        {TERRAIN_CLASSES.map((name) => (
          <button
            type="button"
            key={name}
            className={accepted.includes(name) ? "kchip on" : "kchip"}
            aria-pressed={accepted.includes(name)}
            onClick={() => onChange(accepted.includes(name) ? accepted.filter((c) => c !== name) : [...accepted, name])}
          >
            {name}
          </button>
        ))}
      </div>
    </>
  );
}

function KoppenEditor({
  classes,
  accepted,
  onChange,
}: {
  classes: string[];
  accepted: string[];
  onChange: (accepted: string[]) => void;
}) {
  const letters = [...new Set(classes.map((c) => c[0]))];
  const toggle = (name: string) =>
    onChange(accepted.includes(name) ? accepted.filter((a) => a !== name) : [...accepted, name]);
  return (
    <>
      <p className="muted small">
        Passa se a classe de Beck <b>ou</b> a de Alvares estiver marcada.
      </p>
      {letters.map((letter) => (
        <div className="kchips" key={letter}>
          {classes
            .filter((c) => c[0] === letter)
            .map((name) => (
              <button
                type="button"
                key={name}
                className={accepted.includes(name) ? "kchip on" : "kchip"}
                aria-pressed={accepted.includes(name)}
                onClick={() => toggle(name)}
              >
                {name}
              </button>
            ))}
        </div>
      ))}
    </>
  );
}

function StatesEditor({ states, onChange }: { states: string[]; onChange: (states: string[]) => void }) {
  const toggle = (state: string) =>
    onChange(states.includes(state) ? states.filter((s) => s !== state) : [...states, state]);
  return (
    <>
      <p className="muted small">Passa a cidade do estado marcado. A região marca ou desmarca todos os estados dela.</p>
      {REGIONS.map((region) => {
        const selection = regionSelection(states, region);
        return (
          <div className="kchips" key={region.name}>
            <button
              type="button"
              className={`kchip region ${selection}`}
              aria-pressed={selection === "all" ? true : selection === "some" ? "mixed" : false}
              onClick={() => onChange(toggleRegion(states, region))}
            >
              {region.name}
            </button>
            {region.states.map((state) => (
              <button
                type="button"
                key={state}
                className={states.includes(state) ? "kchip on" : "kchip"}
                aria-pressed={states.includes(state)}
                onClick={() => toggle(state)}
              >
                {state}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function BooleanEditor({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="lims">
      <span className="muted">Exigir</span>
      <span className="seg" role="group" aria-label="Exigir">
        <button type="button" className={value ? "on" : undefined} aria-pressed={value} onClick={() => onChange(true)}>
          sim
        </button>
        <button
          type="button"
          className={value ? undefined : "on"}
          aria-pressed={!value}
          onClick={() => onChange(false)}
        >
          não
        </button>
      </span>
    </div>
  );
}

function ScoreEditor({ atLeast, onChange }: { atLeast: number | null; onChange: (atLeast: number | null) => void }) {
  return (
    <>
      <div className="lims">
        <LimitInput
          label="mín"
          value={atLeast}
          placeholder="sem mínimo"
          onCommit={(value) => onChange(value === null ? null : Math.min(Math.max(value, 0), MAX_SCORE))}
        />
      </div>
      <p className="muted small">De 0 a {MAX_SCORE} · a cidade sem Pontuação passa</p>
    </>
  );
}

function NumericEditor({
  dataset,
  entry,
  constraint,
  onEdit,
}: {
  dataset: Dataset;
  entry: CatalogEntry;
  constraint: Extract<Constraint, { min: number | null }>;
  onEdit: (change: ConstraintEdit) => void;
}) {
  const range = useMemo(() => numericRange(dataset, entry.chave), [dataset, entry.chave]);
  const direction =
    entry.direcao === null
      ? "Só restringe; não entra na Pontuação"
      : entry.direcao === "menor"
        ? "menor é melhor"
        : "maior é melhor";
  return (
    <>
      <div className="lims">
        <LimitInput
          label="mín"
          value={constraint.min}
          max={entry.pontua ? null : constraint.max}
          placeholder={range && number.format(range[0])}
          onCommit={(min) => onEdit({ min })}
        />
        <LimitInput
          label="máx"
          value={constraint.max}
          min={entry.pontua ? null : constraint.min}
          placeholder={range && number.format(range[1])}
          onCommit={(max) => onEdit({ max })}
        />
        <span className="muted small">{entry.unidade}</span>
      </div>
      <p className="muted small">
        {range && `Brasil: ${number.format(range[0])} a ${number.format(range[1])} · `}
        {direction}
      </p>
    </>
  );
}

function parseLimit(text: string): number | null | undefined {
  if (text.trim() === "") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const textOf = (value: number | null) => (value === null ? "" : String(value));

function LimitInput({
  label,
  value,
  placeholder,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number | null;
  placeholder: string | null;
  min?: number | null;
  max?: number | null;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(textOf(value));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setText((current) => (parseLimit(current) === value ? current : textOf(value)));
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (next: string) => {
    const parsed = parseLimit(next);
    if (parsed !== undefined && parsed !== value) onCommit(parsed);
  };

  return (
    <label>
      {label}{" "}
      <input
        type="number"
        step="any"
        value={text}
        min={min ?? undefined}
        max={max ?? undefined}
        placeholder={placeholder ?? undefined}
        onChange={(event) => {
          setText(event.target.value);
          clearTimeout(timer.current);
          if (!event.target.validity.valid) return;
          timer.current = setTimeout(() => {
            if (event.target.validity.valid) commit(event.target.value);
          }, COMMIT_DELAY_MS);
        }}
        onBlur={(event) => {
          clearTimeout(timer.current);
          if (event.target.reportValidity()) commit(text);
        }}
      />
    </label>
  );
}
