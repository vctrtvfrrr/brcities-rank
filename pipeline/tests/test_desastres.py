import pytest

from coleta.fontes import atlas_desastres, casa_civil, sgb
from coleta.fontes.atlas_desastres import Family, family, tally


def record(code: str, cobrade: str, date: str, deaths: int = 0, homeless: int = 0, displaced: int = 0) -> dict[str, str]:
    return {
        "Cod_IBGE_Mun": code,
        "Cod_Cobrade": cobrade,
        "Data_Evento": date,
        "DH_MORTOS": str(deaths),
        "DH_DESABRIGADOS": str(homeless),
        "DH_DESALOJADOS": str(displaced),
    }


@pytest.mark.parametrize("cobrade", ["12100", "12200", "12300", "11321", "11340", "13214"])
def test_rain_family(cobrade):
    assert family(cobrade) is Family.RAIN


@pytest.mark.parametrize("cobrade", ["13111", "13112", "13211", "13212", "13213", "13215"])
def test_wind_and_hail_family(cobrade):
    assert family(cobrade) is Family.WIND


@pytest.mark.parametrize("cobrade", ["14110", "14132", "11410", "13120", "15110", "24200"])
def test_codes_outside_the_families(cobrade):
    assert family(cobrade) is None


def test_a_year_with_several_records_counts_once():
    tallies = tally([
        record("4106902", "12100", "10/01/2020", deaths=1),
        record("4106902", "12200", "15/03/2020", homeless=10),
        record("4106902", "13214", "02/11/2020", displaced=100),
    ])

    assert tallies["4106902"].years == 1
    assert tallies["4106902"].rain_damage == 111


def test_wind_is_worth_half_a_year():
    tallies = tally([
        record("4106902", "12100", "10/01/2018"),
        record("4106902", "13215", "10/01/2018"),
        record("4106902", "13213", "05/09/2019"),
        record("4106902", "13213", "06/09/2019"),
    ])

    assert tallies["4106902"].years == 2
    assert tallies["4106902"].rain_years == {2018}
    assert tallies["4106902"].wind_years == {2018, 2019}


def test_heavy_rain_counts_only_in_the_rain_family():
    tallies = tally([record("4106902", "13214", "10/01/2021")])

    assert tallies["4106902"].years == 1


def test_wind_damage_does_not_count():
    tallies = tally([record("4106902", "13215", "10/01/2021", deaths=3, homeless=40)])

    assert tallies["4106902"].rain_damage == 0


def test_records_outside_the_families_or_the_period_are_ignored():
    tallies = tally([
        record("4106902", "14110", "10/01/2021", homeless=500),
        record("4106902", "12100", "31/12/2015", deaths=2),
        record("4106902", "12100", "01/01/2026", deaths=2),
    ])

    assert tallies == {}


def test_maximum_is_fifteen():
    tallies = tally(
        [record("4106902", "12100", f"01/01/{year}") for year in range(2016, 2026)]
        + [record("4106902", "13213", f"01/01/{year}") for year in range(2016, 2026)]
    )

    assert tallies["4106902"].years == 15


def row(**values: str) -> dict[str, str]:
    return {"populacao_2026": "50000"} | values


def test_derive_damage_per_thousand_inhabitants():
    derived = atlas_desastres.derive(row(anos_desastre="3.5", danos_chuva="125"))

    assert derived["danos_chuva_por_mil"] == "2.5000"
    assert derived["anos_desastre"] == "3.5"


def test_derive_fills_zero_for_municipalities_absent_from_the_atlas():
    derived = atlas_desastres.derive(row())

    assert derived["anos_desastre"] == "0"
    assert derived["danos_chuva"] == "0"
    assert derived["danos_chuva_por_mil"] == "0.0000"


def test_derive_without_population_leaves_the_rate_empty():
    assert atlas_desastres.derive({"danos_chuva": "10"})["danos_chuva_por_mil"] == ""


@pytest.mark.parametrize(
    ("listed", "sectors", "expected"),
    [("sim", "0", "sim"), ("não", "4", "sim"), ("", "", "não"), ("não", "0", "não")],
)
def test_susceptible_by_casa_civil_or_sgb(listed, sectors, expected):
    derived = atlas_desastres.derive(row(suscetivel_casa_civil=listed, setores_risco_sgb=sectors))

    assert derived["suscetivel"] == expected


def test_casa_civil_reads_only_annex_one():
    pages = [
        "Os municípios constam no Anexo I. Referência 1234567 RS no texto não é tabela.",
        "ANEXO I - Nota Técnica nº 1/2023\n1 1100015 RO Alta Floresta D'Oeste\n2 \n1100023 RO Ariquemes",
        "3 1100031 RO Cabixi\nAnexo I da Nota Técnica nº 1/2023 (4605083) SEI / pg. 13",
        "ANEXO II - Nota Técnica nº 1/2023\n1 1100049 RO Cacoal",
    ]

    assert casa_civil.annex_one_codes(pages) == {"1100015", "1100023", "1100031"}


def test_casa_civil_derive_marks_the_unlisted():
    assert casa_civil.derive({}) == {"suscetivel_casa_civil": "não"}
    assert casa_civil.derive({"suscetivel_casa_civil": "sim"}) == {"suscetivel_casa_civil": "sim"}


def test_sgb_counts_sectors_and_keeps_the_latest_date():
    response = {"features": [
        {"attributes": {"cd_geocmu": "4106902", "setores": 12, "ultima_setorizacao": 1787011200000}},
    ]}

    sectors, latest = sgb.sectors_by_municipality(response)["4106902"]

    assert sectors == 12
    assert latest.isoformat() == "2026-08-18"


def test_sgb_refuses_an_incomplete_response():
    with pytest.raises(SystemExit):
        sgb.sectors_by_municipality({"features": [], "exceededTransferLimit": True})
