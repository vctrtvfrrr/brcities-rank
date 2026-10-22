import math

import pytest

from coleta.criterios import CRITERIA, HOTTEST_MONTH, SIZE, Bounds, Criterion, Direction, freeze, percentile, score


def criterion(direction: Direction = Direction.HIGHER) -> Criterion:
    return Criterion("Teste", "Teste", "", 2026, "fonte", "arquivo", "valor", direction)


def rows(*values: str) -> list[dict[str, str]]:
    return [{"valor": value} for value in values]


def test_percentile_interpolates_between_ranks():
    values = range(1, 102)

    assert percentile(values, 0.05) == 6
    assert percentile(values, 0.95) == 96
    assert percentile([10, 20], 0.05) == pytest.approx(10.5)


def test_freeze_ignores_candidates_without_data():
    bounds = freeze(criterion(), rows("1", "", "3"))

    assert bounds == Bounds(percentile([1, 3], 0.05), percentile([1, 3], 0.95), 2)


def test_freeze_without_any_data():
    assert freeze(criterion(), rows("", "")) is None


def test_size_bounds_are_on_the_logarithm():
    bounds = freeze(SIZE, [{"populacao_2026": "100000"}] * 3)

    assert bounds.p5 == pytest.approx(math.log(100_000))


def test_score_trims_at_the_bounds():
    bounds = Bounds(10, 20, 100)

    assert score(5, bounds, Direction.HIGHER) == 0
    assert score(15, bounds, Direction.HIGHER) == 50
    assert score(25, bounds, Direction.HIGHER) == 100


def test_score_inverts_when_lower_is_better():
    bounds = Bounds(0.5, 6, 100)

    assert score(0.5, bounds, Direction.LOWER) == 100
    assert score(1, bounds, Direction.LOWER) == pytest.approx(90.9, abs=0.1)
    assert score(12, bounds, Direction.LOWER) == 0


def test_score_without_variation_is_100():
    bounds = freeze(criterion(Direction.LOWER), rows("7", "7", "7"))

    assert bounds.p5 == bounds.p95
    assert score(7, bounds, Direction.LOWER) == 100


def test_hottest_month_is_a_lower_is_better_clima_criterion():
    assert HOTTEST_MONTH.category == "Clima"
    assert HOTTEST_MONTH.name == "Temperatura do mês mais quente"
    assert HOTTEST_MONTH.column == "temp_mes_mais_quente"
    assert HOTTEST_MONTH.direction is Direction.LOWER
    assert HOTTEST_MONTH.source_file == "pr_Tmax_Tmin_NetCDF_Files.zip"


def test_there_are_thirteen_criteria_and_four_in_clima():
    clima = [criterion for criterion in CRITERIA if criterion.category == "Clima"]

    assert len(CRITERIA) == 13
    assert len(clima) == 4
    assert len({criterion.column for criterion in CRITERIA}) == 13
