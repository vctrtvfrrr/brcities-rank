import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "casa-civil"
TITLE = "Casa Civil, municípios mais suscetíveis a deslizamentos, enxurradas e inundações"
PAGE = "https://www.gov.br/casacivil/pt-br/assuntos/cadastro-de-municipios-suscetiveis-a-eventos-de-enxurradas-e-inundacoes"
COLUMN = "suscetivel_casa_civil"
YES = "sim"
NO = "não"

ANNEX_LABEL = re.compile(r"\bANEXO\s+(I+)\s*(?:-|da\b)", re.IGNORECASE)
MUNICIPALITY = re.compile(r"(?<!\d)(\d{7})\s+[A-Z]{2}\b")


@dataclass(frozen=True)
class TechnicalNote:
    label: str
    file: RemoteFile
    municipalities: int


NOTES = (
    TechnicalNote(
        "NT 1/2023",
        RemoteFile("nota-tecnica-1-2023.pdf", f"{PAGE}/copy10_of_NotaTcnica01_2023_SAM_CC_PR_eAnexosIeII.pdf"),
        1942,
    ),
    TechnicalNote(
        "NT 1/2025",
        RemoteFile("nota-tecnica-1-2025.pdf", f"{PAGE}/NotaTecnica1.2025_SADJVISEPACCCeAnexoI.pdf"),
        153,
    ),
)
FILES = tuple(note.file for note in NOTES)


def download(folder: Path) -> list[RemoteFile]:
    return download_files(folder, FILES)


def extract(folder: Path) -> Extraction:
    listed: set[str] = set()
    for note in NOTES:
        codes = annex_one_codes(page.extract_text() for page in PdfReader(folder / note.file.name).pages)
        if len(codes) != note.municipalities:
            raise SystemExit(
                f"{NAME}: o Anexo I da {note.label} deveria listar {note.municipalities} municípios, "
                f"mas a leitura do PDF achou {len(codes)}"
            )
        listed |= codes
    editions = " e ".join(f"{note.label} ({note.municipalities:,} municípios)".replace(",", ".") for note in NOTES)
    return Extraction((COLUMN,), {code: {COLUMN: YES} for code in listed}, edition=f"Anexo I da {editions}")


def annex_one_codes(pages: Iterable[str]) -> set[str]:
    """IBGE codes in the tables of Annex I; Annex II of NT 1/2023 is a preliminary list that NT 1/2025 replaced."""
    codes = set()
    for text in pages:
        label = ANNEX_LABEL.search(text)
        if label and label.group(1).upper() == "I":
            codes |= set(MUNICIPALITY.findall(text))
    return codes


def derive(row: Mapping[str, str]) -> dict[str, str]:
    return {COLUMN: row.get(COLUMN) or NO}
