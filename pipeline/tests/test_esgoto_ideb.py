import zipfile

import openpyxl

from coleta.criterios import CRITERIA, Direction
from coleta.fontes import ibge_censo_esgoto, inep_ideb
from coleta.fontes.ibge_censo_esgoto import NETWORK, SEPTIC_TANK, TOTAL, sewage_shares
from coleta.fontes.inep_ideb import public_scores


def sidra_response(values_by_category: dict[str, dict[str, str]]) -> list[dict]:
    return [{
        "resultados": [
            {
                "classificacoes": [
                    {"id": "11558", "categoria": {category: "..."}},
                    {"id": "58", "categoria": {"95253": "Total"}},
                ],
                "series": [{"localidade": {"id": code}, "serie": {"2022": value}} for code, value in values.items()],
            }
            for category, values in values_by_category.items()
        ]
    }]


def test_sewage_share_adds_network_and_standalone_septic_tank():
    response = sidra_response({
        TOTAL: {"4106902": "1000"},
        NETWORK: {"4106902": "700"},
        SEPTIC_TANK: {"4106902": "123"},
    })

    assert sewage_shares(response) == {"4106902": {"esgoto_pct": "82.30"}}


def test_sewage_dash_is_zero_and_suppressed_values_are_missing():
    response = sidra_response({
        TOTAL: {"1": "200", "2": "50", "3": "-"},
        NETWORK: {"1": "-", "2": "X", "3": "-"},
        SEPTIC_TANK: {"1": "50", "2": "10", "3": "-"},
    })

    assert sewage_shares(response) == {"1": {"esgoto_pct": "25.00"}}


HEADER = ("SG_UF", "CO_MUNICIPIO", "NO_MUNICIPIO", "REDE", "VL_OBSERVADO_2023", "VL_OBSERVADO_2025")


def sheet(*rows: tuple) -> list[tuple]:
    return [("Ministério da Educação",), (None,), ("Sigla da UF", "Código do Município"), HEADER, *rows, ("Fonte: MEC/Inep",)]


def test_ideb_keeps_only_the_public_network_of_2025():
    scores = public_scores(sheet(
        ("PR", 4106902, "Curitiba", "Estadual", 5.0, 5.1),
        ("PR", 4106902, "Curitiba", "Pública", 5.5, 5.2),
        ("PR", 4106902, "Curitiba", "Municipal", 6.0, 6.3),
    ))

    assert scores == {"4106902": "5.2"}


def test_ideb_without_score_is_left_out_and_integers_keep_one_decimal():
    scores = public_scores(sheet(
        ("CE", 2304103, "Coreaú", "Pública", 9.5, 10),
        ("RO", 1100023, "Ariquemes", "Pública", 4.0, "-"),
    ))

    assert scores == {"2304103": "10.0"}


def write_stage(folder, stage: inep_ideb.Stage, rows: list[tuple]) -> None:
    workbook = openpyxl.Workbook()
    for row in sheet(*rows):
        workbook.active.append(row)
    inner = folder / "planilha.xlsx"
    workbook.save(inner)
    with zipfile.ZipFile(folder / stage.file.name, "w") as archive:
        archive.write(inner, f"divulgacao_{stage.slug}/divulgacao_{stage.slug}.xlsx")


def test_ideb_extract_joins_the_three_stages_by_municipality(tmp_path):
    write_stage(tmp_path, inep_ideb.EARLY_YEARS, [("PR", 4106902, "Curitiba", "Pública", 6.5, 6.9)])
    write_stage(tmp_path, inep_ideb.LATE_YEARS, [("PR", 4106902, "Curitiba", "Pública", 5.5, 5.7)])
    write_stage(tmp_path, inep_ideb.HIGH_SCHOOL, [("PR", 4106902, "Curitiba", "Pública", 4.9, "-")])

    extraction = inep_ideb.extract(tmp_path)

    assert extraction.columns == ("ideb_anos_iniciais", "ideb_anos_finais", "ideb_ensino_medio")
    assert extraction.rows == {"4106902": {"ideb_anos_iniciais": "6.9", "ideb_anos_finais": "5.7"}}


def test_sewage_and_ideb_criteria_point_to_their_files():
    by_column = {criterion.column: criterion for criterion in CRITERIA}
    expected = {
        "esgoto_pct": (ibge_censo_esgoto.NAME, ibge_censo_esgoto.SEWAGE.name, 2022),
        "ideb_anos_iniciais": (inep_ideb.NAME, inep_ideb.EARLY_YEARS.file.name, 2025),
        "ideb_anos_finais": (inep_ideb.NAME, inep_ideb.LATE_YEARS.file.name, 2025),
        "ideb_ensino_medio": (inep_ideb.NAME, inep_ideb.HIGH_SCHOOL.file.name, 2025),
    }

    for column, (source, source_file, year) in expected.items():
        criterion = by_column[column]
        assert (criterion.source, criterion.source_file, criterion.year) == (source, source_file, year)
        assert criterion.direction is Direction.HIGHER
