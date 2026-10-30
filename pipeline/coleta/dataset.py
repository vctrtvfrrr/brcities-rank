"""The app dataset: one columnar JSON with the catalog and the source metadata, next to the CSV."""

import json
from collections.abc import Mapping, Sequence
from datetime import date

from coleta.criterios import FILTERS, Criterion
from coleta.extraidos import CODE, IDENTITY, ExtractedSource
from coleta.fontes import SOURCES, anatel, cnes

CONTRACT_VERSION = 1
TEXT_COLUMNS = ("nome", "uf", "koppen_beck", "koppen_alvares", "classe_relevo")
YES_NO_COLUMNS = (cnes.HOSPITAL_COLUMN, anatel.COLUMN)
YES = "sim"
NO = "não"
NO_TRANSFORMATION = "nenhuma"
LOGARITHM = "logaritmo"


def render(
    municipalities: Mapping[str, Mapping[str, str]],
    criteria: Sequence[Criterion],
    sources: Sequence[ExtractedSource],
    collected_on: date,
) -> str:
    columns = [column for column in _column_names(criteria) if column != CODE]
    dataset = {
        "versao": CONTRACT_VERSION,
        "coleta": collected_on.isoformat(),
        "fontes": [_source(source) for source in sources],
        "catalogo": _catalog(criteria),
        "colunas": {
            CODE: sorted(municipalities),
            **{column: [_value(code, column, municipalities[code].get(column, "")) for code in sorted(municipalities)] for column in columns},
        },
    }
    return json.dumps(dataset, ensure_ascii=False, separators=(",", ":")) + "\n"


def _column_names(criteria: Sequence[Criterion]) -> list[str]:
    return [CODE, *IDENTITY, *(criterion.column for criterion in criteria), *(entry.column for entry in FILTERS)]


def _value(code: str, column: str, text: str):
    if text == "":
        return None
    if column in YES_NO_COLUMNS:
        if text not in (YES, NO):
            raise SystemExit(
                f"{column}: valor {text!r} em {code} não é sim, não nem vazio; o dataset do app só aceita esses três"
            )
        return text == YES
    if column in TEXT_COLUMNS:
        return text
    return int(text) if text.lstrip("-").isdigit() else float(text)


def _catalog(criteria: Sequence[Criterion]) -> list[dict]:
    scoring = [
        {
            "chave": criterion.column,
            "categoria": criterion.category,
            "rotulo": criterion.name,
            "unidade": criterion.unit,
            "direcao": criterion.direction.value,
            "transformacao": LOGARITHM if criterion.logarithmic else NO_TRANSFORMATION,
            "pontua": True,
            "fontes": list(dict.fromkeys((criterion.source, *(name for name, _ in criterion.other_sources)))),
        }
        for criterion in criteria
    ]
    filtering = [
        {
            "chave": entry.column,
            "categoria": entry.category,
            "rotulo": entry.name,
            "unidade": entry.unit,
            "direcao": None,
            "transformacao": NO_TRANSFORMATION,
            "pontua": False,
            "fontes": [entry.source, *entry.other_sources],
        }
        for entry in FILTERS
    ]
    return scoring + filtering


def _source(source: ExtractedSource) -> dict:
    module = SOURCES[source.name]
    return {
        "chave": source.name,
        "nome": source.title,
        "edicao": source.edition,
        "ano": module.YEAR_LABEL,
        "endereco": module.LANDING_URL,
        "credito": module.CREDIT,
    }
