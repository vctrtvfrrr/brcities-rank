import csv

import pytest

from coleta.fontes import aneel_tensoes


HEADER = ("codigo_ibge", "uf", "distribuidora", "tensao", "status", "consultado_em", "erro")


@pytest.fixture
def source_dir(tmp_path):
    folder = tmp_path / aneel_tensoes.NAME
    folder.mkdir()
    return folder


def complete_rows():
    return [
        ("1200401", "AC", "A", "220/127", "ok", "2026-10-29", ""),
        ("4106902", "PR", "B", "380/220", "ok", "2026-10-30", ""),
        ("1100015", "RO", "", "", "sem_tensao", "2026-10-30", ""),
    ]


def write_csv(folder, rows, header=HEADER):
    with (folder / "tensoes.csv").open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(header)
        writer.writerows(rows)


def test_extract_preserves_distinct_pairs_and_confirmed_absence(source_dir):
    write_csv(source_dir, [
        ("1200401", "AC", "Distribuidora A", "220/127", "ok", "2026-10-30", ""),
        ("1200401", "AC", "Distribuidora A", "230/115", "ok", "2026-10-30", ""),
        ("1200401", "AC", "Distribuidora B", "220/127", "ok", "2026-10-30", ""),
        ("4106902", "PR", "Distribuidora C", "380/220", "ok", "2026-10-30", ""),
        ("1100015", "RO", "", "", "sem_tensao", "2026-10-30", ""),
    ])

    result = aneel_tensoes.extract(source_dir)

    assert result.columns == ("tensao",)
    assert result.rows == {
        "1200401": {"tensao": "220/127;230/115"},
        "4106902": {"tensao": "380/220"},
        "1100015": {"tensao": ""},
    }
    assert result.edition == "2026-10-30"


@pytest.mark.parametrize("row, reason", [
    (("120040", "AC", "A", "220/127", "ok", "2026-10-30", ""), "código IBGE ou UF inválido"),
    (("1200401", "PR", "A", "220/127", "ok", "2026-10-30", ""), "código IBGE ou UF inválido"),
    (("1200401", "XX", "A", "220/127", "ok", "2026-10-30", ""), "código IBGE ou UF inválido"),
    (("1200401", "AC", "A", "127", "ok", "2026-10-30", ""), "par de tensão ou distribuidora inválido"),
    (("1200401", "AC", "A", "220/0", "ok", "2026-10-30", ""), "par de tensão ou distribuidora inválido"),
    (("1200401", "AC", "", "220/127", "ok", "2026-10-30", ""), "par de tensão ou distribuidora inválido"),
    (("1200401", "AC", "", "", "falha", "2026-10-30", ""), "falha de consulta"),
    (("1200401", "AC", "", "", "sem_tensao", "invalid", ""), "consultado_em deve usar AAAA-MM-DD"),
    (("1200401", "AC", "", "", "unknown", "2026-10-30", ""), "status inválido"),
])
def test_extract_refuses_malformed_rows(source_dir, row, reason):
    write_csv(source_dir, [row, *complete_rows()[1:]])
    with pytest.raises(SystemExit, match=reason):
        aneel_tensoes.extract(source_dir)


@pytest.mark.parametrize("header, rows, reason", [
    (("codigo_ibge", "tensao"), [("1200401", "220/127")], "cabeçalho esperado"),
    (HEADER, [], "não tem municípios"),
    (HEADER, [(*complete_rows()[0], "extra"), *complete_rows()[1:]], "quantidade de campos inválida"),
    (HEADER, [*complete_rows(), ("1200401", "AC", "", "", "sem_tensao", "2026-10-29", "")], "status ou datas de consulta conflitantes"),
    (HEADER, [*complete_rows(), ("1200401", "AC", "B", "230/115", "ok", "2026-10-30", "")], "status ou datas de consulta conflitantes"),
])
def test_extract_refuses_invalid_structure_or_inconsistent_metadata(source_dir, header, rows, reason):
    write_csv(source_dir, rows, header)
    with pytest.raises(SystemExit, match=reason):
        aneel_tensoes.extract(source_dir)


def test_download_lists_manual_file_and_instructions(source_dir, capsys):
    assert aneel_tensoes.download(source_dir) == [aneel_tensoes.TABLE]
    assert "scripts/aneel-tensoes.js" in capsys.readouterr().out
    write_csv(source_dir, [])
    assert aneel_tensoes.download(source_dir) == []


def test_extract_skips_aneel_entries_that_are_not_ibge_municipalities(source_dir):
    write_csv(source_dir, [*complete_rows(), ("9900002", "PA", "", "", "falha", "2026-10-30", "Resposta fora do formato")])
    assert "9900002" not in aneel_tensoes.extract(source_dir).rows


def test_extract_refuses_failed_queries(source_dir):
    rows = complete_rows()
    rows[1] = ("4106902", "PR", "", "", "falha", "2026-10-30", "HTTP 503")
    write_csv(source_dir, rows)
    with pytest.raises(SystemExit, match="falha de consulta"):
        aneel_tensoes.extract(source_dir)


def test_edition_uses_query_dates_across_days(source_dir):
    write_csv(source_dir, complete_rows())
    assert aneel_tensoes.extract(source_dir).edition == "2026-10-29 a 2026-10-30"


@pytest.mark.parametrize("pair, voltage", [
    ("220/127", 127), ("230/115", 127), ("240/120", 127), ("380/220", 220), ("440/254", 220),
    ("347/173,5", 220), ("347/173.49", 127), ("347/173.51", 220),
])
def test_outlet_voltage_groups_like_the_app(pair, voltage):
    assert aneel_tensoes.outlet_voltage(pair) == voltage
