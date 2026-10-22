from coleta.corte import CUT, PASS, Reason, Verdict, judge_hospital
from coleta.fontes.cnes import (
    HOSPITAL_COLUMN,
    PEDIATRICIANS_COLUMN,
    RATIO_COLUMN,
    Hospital,
    build_rows,
    count_pediatricians,
    municipalities_with_general_hospital,
)
from coleta.fontes.ibge_censo_criancas import sum_age_groups


def bed(municipality: str, unit: str = "05", bed_type: str = "2", existing: int = 10) -> dict:
    return {"CODUFMUN": municipality, "TP_UNID": unit, "TP_LEITO": bed_type, "QT_EXIST": existing}


def bond(municipality: str, cpf: str, cbo: str = "225124") -> dict:
    return {"CODUFMUN": municipality, "CPF_PROF": cpf, "CBO": cbo}


def test_general_hospital_needs_an_existing_inpatient_bed():
    beds = [
        bed("410690"),
        bed("410010", unit="07"),
        bed("410020", bed_type="3"),
        bed("410030", bed_type="7"),
        bed("410040", existing=0),
        bed("410050", bed_type="5"),
    ]

    assert municipalities_with_general_hospital(beds) == {"410690", "410050"}


def test_repeated_cpf_in_the_same_municipality_counts_once():
    bonds = [bond("410690", "a"), bond("410690", "a"), bond("410690", "b")]

    assert count_pediatricians(bonds) == {"410690": 2}


def test_cpf_in_different_municipalities_counts_in_each():
    bonds = [bond("410690", "a"), bond("411520", "a")]

    assert count_pediatricians(bonds) == {"410690": 1, "411520": 1}


def test_only_the_pediatrician_cbo_counts():
    assert count_pediatricians([bond("410690", "a", cbo="225125")]) == {}


def test_municipality_absent_from_the_base_has_no_values():
    rows = build_rows({"4106902": 1000}, present=set(), hospitals=set(), pediatricians={})

    assert rows == {"4106902": {HOSPITAL_COLUMN: Hospital.ABSENT}}


def test_municipality_in_the_base_without_hospital_or_pediatrician():
    rows = build_rows({"4106902": 1000}, present={"410690"}, hospitals=set(), pediatricians={})

    assert rows["4106902"] == {HOSPITAL_COLUMN: Hospital.NO, PEDIATRICIANS_COLUMN: "0", RATIO_COLUMN: "0.0000"}


def test_pediatricians_per_thousand_children():
    rows = build_rows({"4106902": 3000}, present={"410690"}, hospitals={"410690"}, pediatricians={"410690": 2})

    assert rows["4106902"] == {HOSPITAL_COLUMN: Hospital.YES, PEDIATRICIANS_COLUMN: "2", RATIO_COLUMN: "0.6667"}


def test_hospital_restriction():
    assert judge_hospital({HOSPITAL_COLUMN: Hospital.YES}) == PASS
    assert judge_hospital({HOSPITAL_COLUMN: Hospital.NO}) == CUT


def test_absence_from_the_base_passes_to_check():
    outcome = judge_hospital({HOSPITAL_COLUMN: Hospital.ABSENT})

    assert outcome.verdict is Verdict.CHECK
    assert outcome.reason == Reason.ABSENT


def test_hospital_without_data_passes_to_check():
    outcome = judge_hospital({HOSPITAL_COLUMN: ""})

    assert outcome.verdict is Verdict.CHECK
    assert outcome.reason == Reason.MISSING


def censo_group(values: dict[str, str]) -> dict:
    return {"series": [{"localidade": {"id": code}, "serie": {"2022": value}} for code, value in values.items()]}


def test_children_add_the_three_age_groups():
    response = [{"resultados": [
        censo_group({"4106902": "100", "4115200": "10"}),
        censo_group({"4106902": "200", "4115200": "-"}),
        censo_group({"4106902": "300", "4115200": "30"}),
    ]}]

    assert sum_age_groups(response) == {"4106902": 600}
