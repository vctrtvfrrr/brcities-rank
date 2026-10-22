import zipfile

from coleta.corte import INTERNET, RESTRICTIONS, Reason, Verdict, judge_internet, run_cut
from coleta.fontes import anatel

HEADER = "CNPJ;Município;UF;Tecnologia;Empresa;Código IBGE Município;Meio de Acesso"


def table(months: list[str], rows: list[tuple[str, str, str, list[str]]]) -> str:
    lines = [";".join((HEADER, *months))]
    for code, technology, medium, accesses in rows:
        lines.append(";".join(("1", "Cidade", "PR", technology, "Empresa", code, medium, *accesses)))
    return "﻿" + "\n".join(lines) + "\n"


def months(year: int, last: int) -> list[str]:
    return [f"{year}-{month:02d}" for month in range(1, last + 1)]


def accesses_in(month: str, all_months: list[str]) -> list[str]:
    return ["5" if current == month else "" for current in all_months]


def write_archive(folder, tables: dict[str, str]) -> None:
    folder.mkdir(exist_ok=True)
    with zipfile.ZipFile(folder / anatel.ARCHIVE.name, "w") as archive:
        for name, content in tables.items():
            archive.writestr(name, content.encode("utf-8"))


def extract_sample(tmp_path, rows_2025, rows_2026):
    """The window of the sample is 2025-04 to 2026-03, split between two yearly tables."""
    write_archive(tmp_path, {
        "Acessos_Banda_Larga_Fixa_2025.csv": "Ano;Mês;Acessos\n",
        "Acessos_Banda_Larga_Fixa_2025_Colunas.csv": table(months(2025, 12), rows_2025),
        "Acessos_Banda_Larga_Fixa_2026_Colunas.csv": table(months(2026, 3), rows_2026),
    })
    return anatel.extract(tmp_path)


def test_fiber_only_in_the_oldest_month_of_the_window_counts(tmp_path):
    extraction = extract_sample(
        tmp_path,
        [("4100001", "FTTH", "Fibra", accesses_in("2025-04", months(2025, 12)))],
        [],
    )

    assert extraction.rows["4100001"] == {anatel.COLUMN: anatel.YES}


def test_fiber_only_before_the_window_does_not_count(tmp_path):
    extraction = extract_sample(
        tmp_path,
        [
            ("4100002", "FTTH", "Fibra", accesses_in("2025-03", months(2025, 12))),
            ("4100002", "xDSL", "Cabo Metálico", accesses_in("2025-11", months(2025, 12))),
        ],
        [],
    )

    assert extraction.rows["4100002"] == {anatel.COLUMN: anatel.NO}


def test_fiber_row_without_accesses_in_the_window_does_not_count(tmp_path):
    extraction = extract_sample(
        tmp_path,
        [],
        [
            ("4100003", "FTTH", "Fibra", ["0", "", "0"]),
            ("4100003", "VSAT", "Satélite", ["1", "1", "1"]),
        ],
    )

    assert extraction.rows["4100003"] == {anatel.COLUMN: anatel.NO}


def test_fiber_is_read_from_the_access_medium(tmp_path):
    extraction = extract_sample(
        tmp_path,
        [],
        [
            ("4100004", "ETHERNET", "Fibra", ["1", "", ""]),
            ("4100005", "FTTH", "Rádio", ["1", "", ""]),
        ],
    )

    assert extraction.rows["4100004"] == {anatel.COLUMN: anatel.YES}
    assert extraction.rows["4100005"] == {anatel.COLUMN: anatel.NO}


def test_municipality_without_accesses_in_the_window_is_absent(tmp_path):
    extraction = extract_sample(
        tmp_path,
        [("4100006", "FTTH", "Fibra", accesses_in("2025-02", months(2025, 12)))],
        [("4100007", "FTTH", "Fibra", ["1", "", ""])],
    )

    assert "4100006" not in extraction.rows
    assert extraction.columns == (anatel.COLUMN,)


def test_edition_records_the_window(tmp_path):
    extraction = extract_sample(tmp_path, [], [("4100007", "FTTH", "Fibra", ["1", "", ""])])

    assert "2025-04 a 2026-03" in extraction.edition


def test_internet_restriction():
    assert judge_internet({anatel.COLUMN: anatel.YES}).verdict is Verdict.PASS
    assert judge_internet({anatel.COLUMN: anatel.NO}).verdict is Verdict.CUT

    absent = judge_internet({anatel.COLUMN: ""})
    assert absent.verdict is Verdict.CHECK
    assert absent.reason == Reason.ABSENT


def test_internet_is_the_last_restriction():
    assert RESTRICTIONS[-1] is INTERNET


def test_internet_restriction_in_the_cut():
    municipalities = {
        "1": {anatel.COLUMN: anatel.YES},
        "2": {anatel.COLUMN: anatel.NO},
        "3": {anatel.COLUMN: ""},
    }

    result = run_cut(municipalities, [INTERNET])

    assert result.candidates == ["1", "3"]
    assert result.fates["2"].cut_by == "internet"
    assert result.fates["3"].marks[0].reason == Reason.ABSENT
