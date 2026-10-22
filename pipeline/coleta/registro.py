"""Writes the versioned record: dados/municipios.csv, corte.md and criterios.md."""

import csv
import math
from collections.abc import Mapping, Sequence
from pathlib import Path

from coleta.corte import CutResult, Restriction
from coleta.criterios import Bounds, Criterion
from coleta.extraidos import CODE, ExtractedSource

IDENTITY = ("nome", "uf", "latitude", "longitude")
GENERATED = "> Gerado pela Coleta (`uv run python -m coleta montar`, em `pipeline/`). Não edite: rode a Coleta de novo."


def write(
    pipeline_dir: Path,
    municipalities: Mapping[str, Mapping[str, str]],
    restrictions: Sequence[Restriction],
    result: CutResult,
    criteria: Sequence[Criterion],
    bounds: Mapping[str, Bounds | None],
    sources: Sequence[ExtractedSource],
) -> None:
    (pipeline_dir / "dados").mkdir(exist_ok=True)
    _write_csv(pipeline_dir / "dados" / "municipios.csv", municipalities, restrictions, result, criteria)
    _write_text(pipeline_dir / "corte.md", render_cut(municipalities, result))
    _write_text(pipeline_dir / "criterios.md", render_criteria(criteria, bounds, sources, len(result.candidates)))


def data_columns(restrictions: Sequence[Restriction], criteria: Sequence[Criterion]) -> list[str]:
    columns = [column for restriction in restrictions for column in restriction.columns]
    columns += [column for criterion in criteria for column in (criterion.column, *criterion.extra_columns)]
    return list(dict.fromkeys(columns))


def _write_csv(path, municipalities, restrictions, result, criteria) -> None:
    columns = data_columns(restrictions, criteria)
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow((CODE, *IDENTITY, "cortada_por", "a_conferir", *columns))
        for code in sorted(municipalities):
            row = municipalities[code]
            fate = result.fates[code]
            marks = "; ".join(f"{mark.restriction} ({mark.reason})" for mark in fate.marks)
            writer.writerow((
                code,
                *(row[column] for column in IDENTITY),
                fate.cut_by or "",
                marks,
                *(row.get(column, "") for column in columns),
            ))


def _write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def render_cut(municipalities: Mapping[str, Mapping[str, str]], result: CutResult) -> str:
    candidates = result.candidates
    marked = [code for code in candidates if result.fates[code].marks]
    names = {tally.restriction.key: tally.restriction.name for tally in result.tallies}
    lines = [
        "# Corte",
        "",
        GENERATED,
        "",
        f"Das {_integer(len(municipalities))} cidades, {_integer(len(candidates))} são Candidatas ao fim do Corte, "
        f"{_integer(len(marked))} delas com marca A conferir.",
        "",
        "| Ordem | Restrição | Passa quando | Fonte | Entraram | Cortadas | A conferir | Seguiram |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for order, tally in enumerate(result.tallies, start=1):
        restriction = tally.restriction
        lines.append(
            f"| {order} | {restriction.name} | {restriction.rule} | {restriction.source} | "
            f"{_integer(tally.entered)} | {_integer(tally.cut)} | {_integer(tally.to_check)} | {_integer(tally.passed)} |"
        )
    lines += ["", "## Candidatas com marca", ""]
    if marked:
        lines += [
            "| Código | Município | UF | Restrição | Motivo | Detalhe |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for code in marked:
            row = municipalities[code]
            for mark in result.fates[code].marks:
                lines.append(
                    f"| {code} | {row['nome']} | {row['uf']} | {names[mark.restriction]} | {mark.reason} | {mark.detail} |"
                )
    else:
        lines.append("Nenhuma.")
    lines += [
        "",
        "## Fontes de clima divergentes",
        "",
        "Nestas Candidatas, Beck e Alvares divergem sobre o Clima. O calor do verão pesa no critério Temperatura do "
        "mês mais quente.",
        "",
    ]
    tied = [code for code in candidates if result.fates[code].ties]
    if tied:
        lines += ["| Código | Município | UF | Detalhe |", "| --- | --- | --- | --- |"]
        for code in tied:
            row = municipalities[code]
            for tie in result.fates[code].ties:
                lines.append(f"| {code} | {row['nome']} | {row['uf']} | {tie.detail} |")
    else:
        lines.append("Nenhuma.")
    return "\n".join(lines) + "\n"


def render_criteria(
    criteria: Sequence[Criterion],
    bounds: Mapping[str, Bounds | None],
    sources: Sequence[ExtractedSource],
    candidates: int,
) -> str:
    by_name = {source.name: source for source in sources}
    lines = [
        "# Critérios",
        "",
        GENERATED,
        "",
        f"P5 e P95 foram calculados sobre as {_integer(candidates)} Candidatas ao fim do Corte.",
    ]
    for criterion in criteria:
        origins = [(criterion.source, criterion.source_file), *criterion.other_sources]
        cited = [by_name[name] for name in dict.fromkeys(name for name, _ in origins)]
        files = [next(entry for entry in by_name[name].files if entry["arquivo"] == file) for name, file in origins]
        lines += [
            "",
            f"## {criterion.category}: {criterion.name}",
            "",
            "| Campo | Valor |",
            "| --- | --- |",
            f"| Categoria | {criterion.category} |",
            f"| Fonte | {'<br>'.join(source.title for source in cited)} |",
            f"| Recorte | {criterion.scope} |",
            f"| Edição | {'<br>'.join(source.edition for source in cited)} |",
            f"| Ano | {criterion.year} |",
            f"| Endereço | {'<br>'.join(f'<{file['endereco']}>' for file in files)} |",
            f"| Baixado em | {'<br>'.join(file['baixado_em'] for file in files)} |",
            f"| Coluna no CSV | `{criterion.column}` |",
            f"| Direção | {criterion.direction.value.capitalize()} |",
            f"| Transformação | {'Logaritmo natural antes do min-max' if criterion.logarithmic else 'Nenhuma'} |",
            *_bounds_rows(criterion, bounds[criterion.column]),
        ]
    lines += [
        "",
        "## Fontes",
        "",
        "Todos os arquivos baixados nesta Coleta, com a edição de cada fonte.",
        "",
        "| Fonte | Edição | Arquivo | Endereço | Baixado em |",
        "| --- | --- | --- | --- | --- |",
    ]
    for source in sources:
        for file in source.files:
            lines.append(
                f"| {source.title} | {source.edition} | `{file['arquivo']}` | <{file['endereco']}> | {file['baixado_em']} |"
            )
    return "\n".join(lines) + "\n"


def _bounds_rows(criterion: Criterion, bounds: Bounds | None) -> list[str]:
    if criterion.binary:
        return ["| Nota | Sim vale 100 e não vale 0, sem aparar |"]
    if bounds is None:
        return ["| P5 e P95 | Sem dado nas Candidatas |"]
    return [
        f"| P5 | {_bound(criterion, bounds.p5)} |",
        f"| P95 | {_bound(criterion, bounds.p95)} |",
        f"| Candidatas com dado | {_integer(bounds.count)} |",
    ]


def _bound(criterion: Criterion, value: float) -> str:
    if criterion.logarithmic:
        return f"`{value:.6f}` (logaritmo de {_integer(round(math.exp(value)))})"
    return f"`{value:.6f}`"


def _integer(value: int) -> str:
    return f"{value:,}".replace(",", ".")
