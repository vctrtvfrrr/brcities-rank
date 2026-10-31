"""The validar report: the Coleta against reference sources and the expected counts.

It only warns: nothing here changes a source, an extracted file or the record. A divergence is either a bug,
fixed in the code, or an error of the source, which becomes a Correção later.
"""

import csv
import json
import re
import statistics
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import openpyxl

from coleta import EXTRACTED_DIR, PIPELINE_DIR, SOURCES_DIR, extraidos
from coleta.extraidos import CODE
from coleta.fontes import aneel_tensoes, br_dwgd, sim
from coleta.fontes.base import RemoteFile, download_files
from coleta.geografia import Gazetteer, great_circle_km

RECORD = PIPELINE_DIR / "dados" / "municipios.csv"
REPORT = SOURCES_DIR / "validacao.md"

EXPECTED_MUNICIPALITIES = 5570
# Empty by design: a Candidata has no cutting Restrição.
EMPTY_BY_DESIGN = ("cortada_por", "a_conferir")

INMET_DIR = SOURCES_DIR / "inmet-normais"
INMET_URL = "https://portal.inmet.gov.br/uploads/normais"
STATIONS = RemoteFile("Normal-Climatologica-ESTACOES.xlsx", f"{INMET_URL}/Normal-Climatologica-ESTA%C3%87%C3%95ES.xlsx")
HUMIDITY = RemoteFile("Normal-Climatologica-UR.xlsx", f"{INMET_URL}/Normal-Climatologica-UR.xlsx")
DEW_POINT = RemoteFile("Normal-Climatologica-TORV.xlsx", f"{INMET_URL}/Normal-Climatologica-TORV.xlsx")
RAIN_DAYS = RemoteFile("Normal-Climatologica-PRENDIAS1.xlsx", f"{INMET_URL}/Normal-Climatologica-PRENDIAS1.xlsx")
TEMPERATURE = RemoteFile("Normal-Climatologica-TMEDSECA.xlsx", f"{INMET_URL}/Normal-Climatologica-TMEDSECA.xlsx")
INMET_FILES = (STATIONS, HUMIDITY, DEW_POINT, RAIN_DAYS, TEMPERATURE)

ATLAS_DIR = SOURCES_DIR / "atlas-violencia"
RECORDED_HOMICIDES = RemoteFile(
    "homicidios-registrados-municipios.json", "https://www.ipea.gov.br/dados-api/series-values/328/4"
)

HUMIDITY_TOLERANCE = 5.0
DEW_POINT_TOLERANCE = 1.5
RAIN_DAYS_TOLERANCE = 25.0
TEMPERATURE_TOLERANCE = 2.0
STATION_DISTANCE_KM = 25.0
WORST = 10

MONTHS = ("Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro",
          "Novembro", "Dezembro")
SUMMER = ("Dezembro", "Janeiro", "Fevereiro")
YEAR = "Ano"


@dataclass(frozen=True)
class Station:
    code: str
    name: str
    state: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class Pair:
    code: str
    label: str
    ours: float
    reference: float

    @property
    def difference(self) -> float:
        return self.ours - self.reference

    @property
    def ratio(self) -> float:
        return self.ours / self.reference


@dataclass(frozen=True)
class Comparison:
    title: str
    unit: str
    pairs: list[Pair]
    tolerance: float
    relative: bool = False

    def deviation(self, pair: Pair) -> float:
        return abs(pair.ratio - 1) if self.relative else abs(pair.difference)

    @property
    def divergent(self) -> list[Pair]:
        return sorted((pair for pair in self.pairs if self.deviation(pair) > self.tolerance), key=self.deviation,
                      reverse=True)


def download() -> None:
    for folder, files in ((INMET_DIR, INMET_FILES), (ATLAS_DIR, (RECORDED_HOMICIDES,))):
        download_files(folder, files)


def run() -> Path:
    download()
    with RECORD.open(encoding="utf-8", newline="") as source:
        municipalities = {row[CODE]: row for row in csv.DictReader(source)}
    stations = read_stations(_sheet_rows(INMET_DIR / STATIONS.name))
    matched = match_stations(stations, Gazetteer(municipalities))
    sections = [
        render_counts(municipalities),
        render_missing(municipalities),
        render_voltage(municipalities),
        *(render_comparison(comparison) for comparison in climate_comparisons(municipalities, stations, matched)),
        render_homicides(municipalities, atlas_homicides(json.loads((ATLAS_DIR / RECORDED_HOMICIDES.name).read_text(
            encoding="utf-8")))),
    ]
    REPORT.write_text("# Validação da Coleta\n\n" + "\n".join(sections), encoding="utf-8", newline="\n")
    return REPORT


def read_stations(rows: Iterable[tuple]) -> dict[str, Station]:
    table = _table(rows, "Código")
    return {
        str(row["Código"]): Station(str(row["Código"]), row["Nome da Estação"], row["UF"], float(row["Latitude"]),
                                    float(row["Longitude"]))
        for row in table if str(row["Código"]).isdigit()
    }


def read_normals(rows: Iterable[tuple]) -> dict[str, dict[str, float | None]]:
    """Monthly and annual normals by station code; the "-" of the INMET (incomplete series) becomes None."""
    return {
        str(row["Código"]): {column: _number(row[column]) for column in (*MONTHS, YEAR)}
        for row in _table(rows, "Código") if str(row["Código"]).isdigit()
    }


def summer_mean(normals: Mapping[str, float | None]) -> float | None:
    values = [normals[month] for month in SUMMER]
    return None if None in values else sum(values) / len(values)


def hottest_month(normals: Mapping[str, float | None]) -> float | None:
    values = [normals[month] for month in MONTHS]
    return None if None in values else max(values)


def annual_total(normals: Mapping[str, float | None]) -> float | None:
    """The annual column, or the sum of the twelve months when the INMET leaves the year blank but not the months."""
    if normals[YEAR] is not None:
        return normals[YEAR]
    values = [normals[month] for month in MONTHS]
    return None if None in values else sum(values)


def match_stations(stations: Mapping[str, Station], gazetteer: Gazetteer) -> dict[str, str]:
    """The municipality named by each station, without the parenthesized place: "SAO PAULO (MIRANTE)" is São Paulo."""
    matched = {}
    for station in stations.values():
        if code := gazetteer.find(re.sub(r"\(.*?\)", " ", station.name), station.state):
            matched[station.code] = code
    return matched


def climate_comparisons(
    municipalities: Mapping[str, Mapping[str, str]],
    stations: Mapping[str, Station],
    matched: Mapping[str, str],
) -> list[Comparison]:
    def pairs(file: RemoteFile, column: str, reference: Callable[[Mapping[str, float | None]], float | None]):
        normals = read_normals(_sheet_rows(INMET_DIR / file.name))
        return station_pairs(municipalities, stations, matched, normals, column, reference)

    period = f"{br_dwgd.HUMIDITY_PERIOD[0]}–{br_dwgd.HUMIDITY_PERIOD[1]}"
    return [
        Comparison(f"Umidade relativa média anual × INMET 1991–2020 (BR-DWGD {period})", "%",
                   pairs(HUMIDITY, br_dwgd.HUMIDITY_COLUMN, lambda normals: normals[YEAR]), HUMIDITY_TOLERANCE),
        Comparison(f"Ponto de orvalho de dezembro a fevereiro × INMET 1991–2020 (BR-DWGD {period})", "°C",
                   pairs(DEW_POINT, br_dwgd.DEW_POINT_COLUMN, summer_mean), DEW_POINT_TOLERANCE),
        Comparison(f"Dias com chuva de 1 mm ou mais por ano × INMET 1991–2020 (BR-DWGD {br_dwgd.RAIN_PERIOD[0]}–"
                   f"{br_dwgd.RAIN_PERIOD[1]})", "dias",
                   pairs(RAIN_DAYS, br_dwgd.RAIN_DAYS_COLUMN, annual_total), RAIN_DAYS_TOLERANCE),
        Comparison(f"Temperatura do mês mais quente × INMET 1991–2020 (BR-DWGD {period})", "°C",
                   pairs(TEMPERATURE, br_dwgd.TEMPERATURE_COLUMN, hottest_month), TEMPERATURE_TOLERANCE),
    ]


def station_pairs(
    municipalities: Mapping[str, Mapping[str, str]],
    stations: Mapping[str, Station],
    matched: Mapping[str, str],
    normals: Mapping[str, Mapping[str, float | None]],
    column: str,
    reference: Callable[[Mapping[str, float | None]], float | None],
) -> list[Pair]:
    """One pair per station with a normal, named after a municipality and close to its seat."""
    pairs = []
    for station_code, values in normals.items():
        code = matched.get(station_code)
        expected = reference(values)
        if code is None or expected is None or not municipalities[code][column]:
            continue
        station, row = stations[station_code], municipalities[code]
        distance = great_circle_km((station.latitude, station.longitude),
                                   (float(row["latitude"]), float(row["longitude"])))
        if distance <= STATION_DISTANCE_KM:
            label = f"{row['nome']} ({row['uf']}), estação {station_code} a {distance:.0f} km da sede"
            pairs.append(Pair(code, label, float(row[column]), expected))
    return pairs


def atlas_homicides(values: Iterable[Mapping]) -> dict[tuple[str, str], int]:
    """The recorded homicides of the Atlas by 6-digit municipality code and year."""
    return {(str(value["regiao_id"]), value["periodo"][:4]): int(value["valor"]) for value in values}


def homicide_divergences(
    municipalities: Mapping[str, Mapping[str, str]], atlas: Mapping[tuple[str, str], int]
) -> list[tuple[str, int, int, int]]:
    """(code, year, ours, Atlas) wherever the counts differ; a municipality absent from the Atlas counts zero."""
    divergences = []
    for year in sim.YEARS:
        for code, row in municipalities.items():
            ours = int(row[sim.deaths_column(year)] or 0)
            reference = atlas.get((code[:6], str(year)), 0)
            if ours != reference:
                divergences.append((code, year, ours, reference))
    return divergences


def missing_by_column(municipalities: Mapping[str, Mapping[str, str]], columns: Sequence[str]) -> dict[str, int]:
    return {column: sum(not row[column] for row in municipalities.values()) for column in columns}


def render_counts(municipalities: Mapping[str, Mapping[str, str]]) -> str:
    lines = [
        "## Contagens",
        "",
        "| Contagem | Esperado | Na Coleta |",
        "| --- | ---: | ---: |",
        f"| Municípios | {_integer(EXPECTED_MUNICIPALITIES)} | {_integer(len(municipalities))} |",
    ]
    return "\n".join(lines) + "\n"


def render_missing(municipalities: Mapping[str, Mapping[str, str]]) -> str:
    columns = [column for column in next(iter(municipalities.values())) if column not in (CODE, *EMPTY_BY_DESIGN)]
    candidates = {code: row for code, row in municipalities.items() if not row["cortada_por"]}
    everywhere = missing_by_column(municipalities, columns)
    among_candidates = missing_by_column(candidates, columns)
    lines = [
        "## Linhas sem dado por coluna",
        "",
        f"Só as colunas com algum vazio, nos {_integer(len(municipalities))} municípios e nas "
        f"{_integer(len(candidates))} Candidatas.",
        "",
        "| Coluna | Municípios | Candidatas |",
        "| --- | ---: | ---: |",
        *(
            f"| `{column}` | {_integer(everywhere[column])} | {_integer(among_candidates[column])} |"
            for column in columns if everywhere[column]
        ),
    ]
    return "\n".join(lines) + "\n"


def render_voltage(municipalities: Mapping[str, Mapping[str, str]]) -> str:
    if not any("tensao" in row for row in municipalities.values()):
        return ""
    values = [row.get("tensao", "") for row in municipalities.values()]
    missing = sum(not value for value in values)
    multiple = sum(len({aneel_tensoes.outlet_voltage(pair) for pair in value.split(";")}) > 1 for value in values if value)
    return (
        "## Tensão\n\n"
        f"- Sem tensão conhecida: {_integer(missing)}.\n"
        f"- Com 127 V e 220 V: {_integer(multiple)}.\n"
    )


def render_comparison(comparison: Comparison) -> str:
    pairs = comparison.pairs
    tolerance = (f"{comparison.tolerance:.0%}" if comparison.relative
                 else f"{_decimal(comparison.tolerance)} {comparison.unit}")
    lines = [f"## {comparison.title}", ""]
    if not pairs:
        return "\n".join([*lines, "Nenhum par para comparar.", ""])
    differences = [pair.difference for pair in pairs]
    lines += [
        f"- Pares: {len(pairs)}.",
        f"- Diferença média (Coleta − referência): {_decimal(statistics.mean(differences))} {comparison.unit}; "
        f"mediana {_decimal(statistics.median(differences))}; média absoluta "
        f"{_decimal(statistics.mean(map(abs, differences)))}.",
    ]
    if comparison.relative:
        lines.append(f"- Razão Coleta ÷ referência: mediana {_decimal(statistics.median(p.ratio for p in pairs), 2)}.")
    divergent = comparison.divergent
    lines += [f"- Acima da tolerância de {tolerance}: {len(divergent)}.", ""]
    shown = divergent[:WORST] or sorted(pairs, key=comparison.deviation, reverse=True)[:WORST]
    heading = "As maiores divergências" if divergent else "Os maiores desvios, todos dentro da tolerância"
    lines += [
        f"{heading}:",
        "",
        "| Município | Coleta | Referência | Diferença |",
        "| --- | ---: | ---: | ---: |",
        *(
            f"| {pair.label} | {_decimal(pair.ours)} | {_decimal(pair.reference)} | "
            f"{_decimal(pair.difference)}{f' ({pair.ratio - 1:+.0%})' if comparison.relative else ''} |"
            for pair in shown
        ),
    ]
    return "\n".join(lines) + "\n"


def render_homicides(municipalities: Mapping[str, Mapping[str, str]], atlas: Mapping[tuple[str, str], int]) -> str:
    divergences = homicide_divergences(municipalities, atlas)
    lines = ["## Homicídios × Atlas da Violência (série 328, homicídios registrados)", ""]
    for year in sim.YEARS:
        ours = sum(int(row[sim.deaths_column(year)] or 0) for row in municipalities.values())
        reference = sum(count for (_, period), count in atlas.items() if period == str(year))
        lines.append(f"- {year}: {_integer(ours)} na Coleta, {_integer(reference)} no Atlas.")
    lines += [f"- Município e ano com contagem diferente: {len(divergences)}.", ""]
    if divergences:
        lines += [
            "| Município | Ano | Coleta | Atlas |",
            "| --- | --- | ---: | ---: |",
            *(
                f"| {municipalities[code]['nome']} ({municipalities[code]['uf']}) | {year} | {ours} | {reference} |"
                for code, year, ours, reference in divergences[:WORST]
            ),
        ]
    return "\n".join(lines) + "\n"


def _sheet_rows(path: Path) -> list[tuple]:
    workbook = openpyxl.load_workbook(path, read_only=True)
    try:
        return list(workbook.worksheets[0].iter_rows(values_only=True))
    finally:
        workbook.close()


def _table(rows: Iterable[tuple], first_header: str) -> list[dict]:
    """The rows below the header line that contains first_header, which the INMET places after a title."""
    rows = iter(rows)
    for row in rows:
        header = [str(cell).strip() if cell is not None else "" for cell in row]
        if first_header in header:
            break
    else:
        raise ValueError(f"cabeçalho {first_header!r} não encontrado")
    table = (dict(zip(header, row)) for row in rows)
    return [row for row in table if row.get(first_header) is not None]


def _number(value) -> float | None:
    return None if value in (None, "-", "") else float(value)


def _decimal(value: float, places: int = 1) -> str:
    return f"{value:.{places}f}".replace(".", ",").replace("-", "−")


def _integer(value: int) -> str:
    return f"{value:,}".replace(",", ".")
