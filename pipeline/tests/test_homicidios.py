import pytest

from coleta.corte import CUT, HOMICIDES, PASS, Reason, Verdict, judge_homicides, run_cut
from coleta.criterios import SAFETY, Direction
from coleta.fontes import sim


def municipality(deaths: tuple[str, str, str] = ("", "", ""), census: str = "10000", estimate: str = "10000", uf: str = "SP"):
    row = dict(zip(sim.DEATH_COLUMNS, deaths)) | {"uf": uf, "populacao_2022": census, "populacao_2024": estimate}
    return row | sim.derive(row)


def smoothed(*rows: dict) -> list[str]:
    municipalities = {str(code): row for code, row in enumerate(rows)}
    sim.derive_all(municipalities)
    return [row[sim.RATE_COLUMN] for row in municipalities.values()]


def test_rate_interpolates_2023_between_census_and_estimate():
    assert sim.homicide_rate(30, 100_000, 110_000) == pytest.approx(30 * 100_000 / (100_000 + 105_000 + 110_000))


def test_raw_rate_sums_the_three_years():
    row = municipality(("1", "2", "3"), census="20000", estimate="40000")

    assert row[sim.RAW_RATE_COLUMN] == "6.6667"


def test_municipality_absent_from_the_sim_has_zero_raw_rate():
    row = municipality()

    assert [row[column] for column in sim.DEATH_COLUMNS] == ["0", "0", "0"]
    assert row[sim.RAW_RATE_COLUMN] == "0.0000"


def test_smoothing_follows_marshall_within_the_state():
    big = municipality(("10", "10", "10"), census="100000", estimate="100000")
    small = municipality(("4", "4", "4"), census="10000", estimate="10000")
    deaths, person_years = 42, 330_000
    mean = deaths / person_years
    variance = (300_000 * (1e-4 - mean) ** 2 + 30_000 * (4e-4 - mean) ** 2) / person_years
    between = variance - mean / (person_years / 2)
    weight = between / (between + mean / 30_000)

    assert float(smoothed(big, small)[1]) == pytest.approx((mean + weight * (4e-4 - mean)) * 100_000, abs=1e-4)


def test_smoothing_pulls_the_small_city_further_toward_the_state_mean():
    rows = [
        municipality(("10", "10", "10"), census="100000", estimate="100000"),
        municipality(("1", "1", "1"), census="10000", estimate="10000"),
        municipality(("100", "100", "100"), census="200000", estimate="200000"),
        municipality(("1", "1", "1"), census="10000", estimate="10000"),
    ]
    raw = [float(row[sim.RAW_RATE_COLUMN]) for row in rows]

    rates = list(map(float, smoothed(*rows)))

    assert raw[0] == raw[1] == 10
    assert rates[0] < rates[1]
    assert rates[0] == pytest.approx(10, abs=1)


def test_state_without_extra_variation_takes_the_state_mean():
    rows = [municipality(("1", "1", "1"), census="10000", estimate="10000"), municipality(("2", "1", "0"))]

    assert smoothed(*rows) == ["10.0000", "10.0000"]


def test_each_state_is_smoothed_toward_its_own_mean():
    rows = [
        municipality(("1", "1", "1"), uf="SP"),
        municipality(("1", "1", "1"), uf="SP"),
        municipality(("5", "5", "5"), uf="ES"),
        municipality(("5", "5", "5"), uf="ES"),
    ]

    assert smoothed(*rows) == ["10.0000", "10.0000", "50.0000", "50.0000"]


def test_state_without_homicides_keeps_zero():
    assert smoothed(municipality(), municipality(census="50000", estimate="50000")) == ["0.0000", "0.0000"]


def test_municipality_without_population_stays_out_of_the_state_mean():
    rows = [municipality(("1", "1", "1")), municipality(("9", "9", "9"), estimate="")]

    assert smoothed(*rows) == ["10.0000", ""]


def test_rate_limit_is_inclusive():
    assert judge_homicides({sim.RATE_COLUMN: "20.0000"}) == PASS
    assert judge_homicides({sim.RATE_COLUMN: "20.0001"}) == CUT


def test_rate_without_population_passes_to_check():
    outcome = judge_homicides({sim.RATE_COLUMN: ""})

    assert outcome.verdict is Verdict.CHECK
    assert outcome.reason == Reason.MISSING


def test_homicide_restriction_reads_the_smoothed_rate():
    municipalities = {"1": {sim.RATE_COLUMN: "25.0"}, "2": {sim.RATE_COLUMN: "0.0"}, "3": {sim.RATE_COLUMN: ""}}

    result = run_cut(municipalities, [HOMICIDES])

    assert result.candidates == ["2", "3"]
    assert result.fates["1"].cut_by == "homicidios"
    assert result.fates["3"].marks[0].reason == Reason.MISSING
    assert sim.RAW_RATE_COLUMN in HOMICIDES.columns


def test_safety_criterion_reads_the_rate_and_lower_is_better():
    assert SAFETY.column == sim.RATE_COLUMN
    assert SAFETY.direction is Direction.LOWER
    assert not SAFETY.logarithmic


@pytest.mark.parametrize("cause", ["X85", "X850", "X999", "Y00", "Y099", "Y35", "Y352", "Y369"])
def test_assault_and_legal_intervention_are_homicides(cause):
    assert sim.is_homicide(cause)


@pytest.mark.parametrize("cause", ["X84", "X849", "Y10", "Y34", "Y370", "I10", ""])
def test_other_causes_are_not_homicides(cause):
    assert not sim.is_homicide(cause)


def dbf(fields: list[tuple[str, int]], records: list[tuple[bytes, ...]], deleted: set[int] = frozenset()) -> bytes:
    header_length = 32 + 32 * len(fields) + 1
    record_length = 1 + sum(length for _, length in fields)
    header = bytes([3, 0, 0, 0]) + len(records).to_bytes(4, "little")
    header += header_length.to_bytes(2, "little") + record_length.to_bytes(2, "little") + bytes(20)
    for name, length in fields:
        header += name.encode().ljust(11, b"\0") + b"C" + bytes(4) + bytes([length]) + bytes(15)
    body = b"".join(
        (b"*" if index in deleted else b" ") + b"".join(value.ljust(length) for value, (_, length) in zip(record, fields))
        for index, record in enumerate(records)
    )
    return header + b"\r" + body + b"\x1a"


def test_read_dbf_picks_fields_and_skips_deleted_records():
    data = dbf(
        [("TIPOBITO", 1), ("CODMUNRES", 6), ("CAUSABAS", 4)],
        [(b"2", b"410690", b"X954"), (b"2", b"530010", b"I10"), (b"2", b"999999", b"X954")],
        deleted={2},
    )

    assert list(sim.read_dbf(data, ("CODMUNRES", "CAUSABAS"))) == [("410690", "X954"), ("530010", "I10")]
