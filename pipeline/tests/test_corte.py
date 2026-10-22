from coleta.corte import (
    CUT,
    PASS,
    POPULATION,
    Reason,
    Mark,
    Restriction,
    Verdict,
    judge_population,
    run_cut,
    tie,
    to_check,
)


def population(value: str) -> dict[str, str]:
    return {"populacao_2026": value}


def test_population_limit_is_inclusive():
    assert judge_population(population("35000")) == PASS
    assert judge_population(population("34999")) == CUT


def test_population_without_data_passes_to_check():
    outcome = judge_population(population(""))

    assert outcome.verdict is Verdict.CHECK
    assert outcome.reason == Reason.MISSING


def test_population_without_column_passes_to_check():
    assert judge_population({}).verdict is Verdict.CHECK


def restriction(key: str, outcomes: dict[str, object]) -> Restriction:
    return Restriction(key, key, "", "", (), lambda row: outcomes.get(row["nome"], PASS))


def test_restrictions_apply_in_order_and_only_to_survivors():
    seen = []
    first = restriction("primeira", {"b": CUT, "c": to_check(Reason.ABSENT, "fora do CNES")})
    second = Restriction("segunda", "segunda", "", "", (), lambda row: seen.append(row["nome"]) or (
        CUT if row["nome"] == "c" else PASS
    ))
    municipalities = {"3": {"nome": "c"}, "1": {"nome": "a"}, "2": {"nome": "b"}}

    result = run_cut(municipalities, [first, second])

    assert seen == ["a", "c"]
    assert result.fates["2"].cut_by == "primeira"
    assert result.fates["3"].cut_by == "segunda"
    assert result.candidates == ["1"]
    assert [(t.entered, t.cut, t.to_check, t.passed) for t in result.tallies] == [(3, 1, 1, 2), (2, 1, 0, 1)]


def test_marks_accumulate_across_restrictions():
    first = restriction("primeira", {"a": to_check(Reason.MISSING)})
    second = restriction("segunda", {"a": to_check(Reason.DIVERGENT, "Beck e Alvares")})

    result = run_cut({"1": {"nome": "a"}}, [first, second])

    assert result.candidates == ["1"]
    assert [(m.restriction, m.reason, m.detail) for m in result.fates["1"].marks] == [
        ("primeira", Reason.MISSING, ""),
        ("segunda", Reason.DIVERGENT, "Beck e Alvares"),
    ]


def test_population_restriction_in_the_cut():
    municipalities = {
        "1": population("35000"),
        "2": population("1000"),
        "3": population(""),
    }

    result = run_cut(municipalities, [POPULATION])

    assert result.candidates == ["1", "3"]
    assert result.fates["2"].cut_by == "populacao"
    assert result.fates["3"].marks[0].reason == Reason.MISSING


def test_tie_passes_without_a_mark_and_is_recorded_apart():
    divergent = tie(Reason.DIVERGENT, "Beck Cfa, Alvares Cfb")
    result = run_cut({"1": {"nome": "a"}}, [restriction("r", {"a": divergent})])

    assert result.candidates == ["1"]
    assert result.fates["1"].marks == []
    assert result.fates["1"].ties == [Mark("r", Reason.DIVERGENT, "Beck Cfa, Alvares Cfb")]
    tally = result.tallies[0]
    assert (tally.entered, tally.cut, tally.to_check) == (1, 0, 0)
