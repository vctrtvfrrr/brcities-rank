import csv
import re
from datetime import date
from pathlib import Path

from coleta.fontes.base import Extraction, RemoteFile, download_files

NAME = "aneel-tensoes"
TITLE = "ANEEL, tensões nominais secundárias por município"
YEAR_LABEL = "Datas das consultas"
LANDING_URL = "https://www2.aneel.gov.br/aplicacoes/srd/frmConcessionaria.cfm"
CREDIT = "ANEEL. Tensões nominais secundárias declaradas pelas distribuidoras; podem estar desatualizadas."
TABLE = RemoteFile("tensoes.csv", LANDING_URL, manual=True)
FILES = (TABLE,)
COLUMN = "tensao"
HEADER = ("codigo_ibge", "uf", "distribuidora", "tensao", "status", "consultado_em", "erro")
STATE_CODES = dict(zip(
    "RO AC AM RR PA AP TO MA PI CE RN PB PE AL SE BA MG ES RJ SP PR SC RS MS MT GO DF".split(),
    "11 12 13 14 15 16 17 21 22 23 24 25 26 27 28 29 31 32 33 35 41 42 43 50 51 52 53".split(),
))
PAIR = re.compile(r"[1-9][0-9]*(?:[.,][0-9]+)?/[1-9][0-9]*(?:[.,][0-9]+)?")


def download(folder: Path) -> list[RemoteFile]:
    missing = download_files(folder, FILES)
    if missing:
        print("  Gere tensoes.csv pelo console da ANEEL com scripts/aneel-tensoes.js; veja README.md (Tensão).")
    return missing


def extract(folder: Path) -> Extraction:
    path = folder / TABLE.name
    pairs: dict[str, list[str]] = {}
    observations: dict[str, tuple[str, str]] = {}
    try:
        with path.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source, strict=True)
            if reader.fieldnames != list(HEADER):
                raise ValueError(f"cabeçalho esperado: {','.join(HEADER)}")
            for row in reader:
                _validate_row(row, reader.line_num)
                code, pair = row["codigo_ibge"], row["tensao"]
                observation = row["status"], row["consultado_em"]
                if code in observations and observations[code] != observation:
                    raise ValueError(f"{code}: status ou datas de consulta conflitantes")
                observations[code] = observation
                values = pairs.setdefault(code, [])
                if pair and pair not in values:
                    values.append(pair)
        _validate_coverage(folder, set(pairs))
    except (ValueError, csv.Error, UnicodeError) as error:
        raise SystemExit(f"{path}: CSV de Tensão inválido: {error}") from error
    dates = sorted({queried_on for _, queried_on in observations.values()})
    edition = dates[0] if len(dates) == 1 else f"{dates[0]} a {dates[-1]}"
    return Extraction((COLUMN,), {code: {COLUMN: ";".join(values)} for code, values in pairs.items()}, edition)


def _validate_row(row: dict[str, str], line: int) -> None:
    if None in row or None in row.values():
        raise ValueError(f"linha {line}: quantidade de campos inválida")
    code, status, pair = row["codigo_ibge"], row["status"], row["tensao"]
    if not re.fullmatch(r"[0-9]{7}", code) or STATE_CODES.get(row["uf"]) != code[:2]:
        raise ValueError(f"linha {line}: código IBGE ou UF inválido")
    if status == "falha":
        raise ValueError(f"linha {line}: falha de consulta em {code}; repita a coleta antes de extrair")
    try:
        valid_date = date.fromisoformat(row["consultado_em"]).isoformat() == row["consultado_em"]
    except ValueError:
        valid_date = False
    if not valid_date:
        raise ValueError(f"linha {line}: consultado_em deve usar AAAA-MM-DD")
    if status == "ok":
        if not PAIR.fullmatch(pair) or not row["distribuidora"].strip() or row["erro"]:
            raise ValueError(f"linha {line}: par de tensão ou distribuidora inválido")
    elif status == "sem_tensao":
        if pair or row["distribuidora"] or row["erro"]:
            raise ValueError(f"linha {line}: campos incompatíveis com {status}")
    else:
        raise ValueError(f"linha {line}: status inválido")


def _validate_coverage(folder: Path, codes: set[str]) -> None:
    base = folder.parent / "extraidos" / "ibge-localidades.csv"
    if not base.exists():
        raise ValueError("falta a base do IBGE; rode extrair ibge-localidades antes")
    with base.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames or "codigo_ibge" not in reader.fieldnames:
            raise ValueError("base do IBGE inválida: falta codigo_ibge")
        expected = {row["codigo_ibge"] for row in reader}
    if not expected:
        raise ValueError("base do IBGE vazia")
    if missing := expected - codes:
        raise ValueError(f"{len(missing)} município(s) ausente(s) da cobertura: {', '.join(sorted(missing)[:10])}")
    if unexpected := codes - expected:
        raise ValueError(f"{len(unexpected)} código(s) fora da base do IBGE: {', '.join(sorted(unexpected)[:10])}")
