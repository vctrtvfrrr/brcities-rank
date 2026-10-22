"""The fontes/extraidos/ folder: one CSV and one provenance JSON per source."""

import csv
import json
from dataclasses import dataclass
from pathlib import Path

from coleta.fontes.base import Extraction

CODE = "codigo_ibge"
IDENTITY = ("nome", "uf", "latitude", "longitude")


@dataclass(frozen=True)
class ExtractedSource:
    name: str
    title: str
    edition: str
    files: list[dict[str, str | None]]
    columns: tuple[str, ...]
    rows: dict[str, dict[str, str]]


def write(folder: Path, name: str, title: str, extraction: Extraction, files: list[dict[str, str | None]]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    with (folder / f"{name}.csv").open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow((CODE, *extraction.columns))
        for code in sorted(extraction.rows):
            row = extraction.rows[code]
            writer.writerow((code, *(row.get(column, "") for column in extraction.columns)))
    metadata = {"titulo": title, "edicao": extraction.edition, "arquivos": files}
    (folder / f"{name}.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


def exists(folder: Path, name: str) -> bool:
    return (folder / f"{name}.csv").exists() and (folder / f"{name}.json").exists()


def read(folder: Path, name: str) -> ExtractedSource:
    metadata = json.loads((folder / f"{name}.json").read_text(encoding="utf-8"))
    with (folder / f"{name}.csv").open(encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        columns = tuple(column for column in reader.fieldnames if column != CODE)
        rows = {row[CODE]: {column: row[column] for column in columns} for row in reader}
    return ExtractedSource(name, metadata["titulo"], metadata["edicao"], metadata["arquivos"], columns, rows)


def merge(base: ExtractedSource, others: list[ExtractedSource]) -> dict[str, dict[str, str]]:
    """Joins every source onto the municipalities of the base; codes outside the base are dropped."""
    merged = {code: dict(row) for code, row in base.rows.items()}
    for source in others:
        for code, row in merged.items():
            extra = source.rows.get(code, {})
            row.update({column: extra.get(column, "") for column in source.columns})
    return merged
