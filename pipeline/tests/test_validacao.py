import pytest

from coleta.validacao import (
    MONTHS,
    Comparison,
    Gazetteer,
    Pair,
    Station,
    annual_total,
    atlas_homicides,
    homicide_divergences,
    hottest_month,
    match_stations,
    missing_by_column,
    read_normals,
    read_stations,
    render_comparison,
    station_pairs,
    summer_mean,
)

NORMALS_SHEET = [
    ("Normal Climatológica do Brasil 1991-2020", None),
    ("Umidade Relativa do Ar Compensada Mensal e Anual (%)", None),
    ("Código ", "Nome da Estação", "UF", *MONTHS, "Ano"),
    (83842, "CURITIBA", "PR", *range(1, 13), 80.5),
    (82353, "ALTAMIRA", "PA", 1, 2, 3, 4, 5, 6, "-", 8, 9, 10, 11, 12, "-"),
    ("Fonte: INMET", None),
]

STATIONS_SHEET = [
    ("Normal Climatológica do Brasil 1991-2020", None),
    ("Nº", "Código", "Nome da Estação", "UF", "Latitude", "Longitude"),
    (1, 83842, "CURITIBA", "PR", -25.43, -49.27),
    (2, 83781, "SAO PAULO (MIRANTE)", "SP", -23.50, -46.62),
    (3, 99999, "PICO DO JABRE", "PB", -7.25, -37.38),
]

MUNICIPALITIES = {
    "4106902": {"nome": "Curitiba", "uf": "PR", "latitude": "-25.43", "longitude": "-49.27", "umidade_relativa": "81.7"},
    "3550308": {"nome": "São Paulo", "uf": "SP", "latitude": "-23.55", "longitude": "-46.63", "umidade_relativa": ""},
}


def test_normals_skip_the_title_and_turn_the_inmet_dash_into_none():
    normals = read_normals(NORMALS_SHEET)

    assert set(normals) == {"83842", "82353"}
    assert normals["83842"]["Ano"] == 80.5
    assert normals["82353"]["Julho"] is None


def test_summer_mean_is_december_to_february_and_needs_the_three_months():
    normals = read_normals(NORMALS_SHEET)

    assert summer_mean(normals["83842"]) == pytest.approx((12 + 1 + 2) / 3)
    assert summer_mean({**normals["83842"], "Fevereiro": None}) is None


def test_hottest_month_is_the_largest_monthly_normal():
    normals = dict(zip(MONTHS, [20, 21, 22, 25, 28, 31, 30, 27, 24, 23, 22, 21]))

    assert hottest_month(normals) == 31
    assert hottest_month({**normals, "Março": None}) is None


def test_annual_total_sums_the_months_when_the_year_is_blank():
    normals = read_normals(NORMALS_SHEET)

    assert annual_total(normals["83842"]) == 80.5
    assert annual_total({**normals["83842"], "Ano": None}) == sum(range(1, 13))
    assert annual_total(normals["82353"]) is None


def test_stations_match_the_municipality_they_are_named_after_without_the_parenthesized_place():
    stations = read_stations(STATIONS_SHEET)

    assert match_stations(stations, Gazetteer(MUNICIPALITIES)) == {"83842": "4106902", "83781": "3550308"}


def test_station_pairs_skip_missing_values_and_far_stations():
    stations = {
        "83842": Station("83842", "CURITIBA", "PR", -25.43, -49.27),
        "83781": Station("83781", "SAO PAULO", "SP", -23.50, -46.62),
        "83000": Station("83000", "CURITIBA", "PR", -26.0, -49.27),
    }
    normals = {code: {"Ano": 80.0} for code in stations}
    matched = {"83842": "4106902", "83781": "3550308", "83000": "4106902"}

    pairs = station_pairs(MUNICIPALITIES, stations, matched, normals, "umidade_relativa", lambda values: values["Ano"])

    assert [(pair.code, pair.ours, pair.reference) for pair in pairs] == [("4106902", 81.7, 80.0)]


def test_relative_comparison_flags_the_ratio_beyond_the_tolerance():
    comparison = Comparison("t", "h", [Pair("a", "A", 1.3, 1.0), Pair("b", "B", 2.4, 2.0)], 0.25, relative=True)

    assert [pair.code for pair in comparison.divergent] == ["a"]


def test_absolute_comparison_lists_the_largest_divergence_first():
    pairs = [Pair("a", "A", 70.0, 76.0), Pair("b", "B", 80.0, 70.0), Pair("c", "C", 75.0, 74.0)]

    assert [pair.code for pair in Comparison("t", "%", pairs, 5.0).divergent] == ["b", "a"]


def test_comparison_report_shows_the_counts_and_the_divergences():
    pairs = [Pair("a", "Curitiba (PR)", 81.7, 80.0), Pair("b", "Manaus (AM)", 90.0, 80.0)]

    report = render_comparison(Comparison("Umidade", "%", pairs, 5.0))

    assert "- Pares: 2." in report
    assert "- Acima da tolerância de 5,0 %: 1." in report
    assert "| Manaus (AM) | 90,0 | 80,0 | 10,0 |" in report


def test_homicides_compare_every_year_by_the_six_digit_code_and_absence_counts_zero():
    atlas = atlas_homicides([
        {"regiao_id": 410690, "periodo": "2022-01-15T00:00:00.000Z", "valor": 10},
        {"regiao_id": 410690, "periodo": "2023-01-15T00:00:00.000Z", "valor": 11},
    ])
    municipalities = {
        "4106902": {"homicidios_2022": "10", "homicidios_2023": "12", "homicidios_2024": "0"},
        "3550308": {"homicidios_2022": "0", "homicidios_2023": "0", "homicidios_2024": ""},
    }

    assert homicide_divergences(municipalities, atlas) == [("4106902", 2023, 12, 11)]


def test_missing_counts_empty_cells_by_column():
    rows = {"1": {"a": "", "b": "1"}, "2": {"a": "", "b": ""}}

    assert missing_by_column(rows, ["a", "b"]) == {"a": 2, "b": 1}
