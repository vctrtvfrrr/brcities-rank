from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from enum import Enum

from coleta.fontes import alvares, anatel, beck, cnes, ibge_estimativas, sim

Row = Mapping[str, str]


class Verdict(Enum):
    PASS = "passa"
    CUT = "corta"
    CHECK = "a conferir"
    TIE = "empate"


class Reason:
    MISSING = "falta o dado"
    ABSENT = "ausente na base"
    DIVERGENT = "fontes divergentes"


@dataclass(frozen=True)
class Outcome:
    verdict: Verdict
    reason: str = ""
    detail: str = ""


PASS = Outcome(Verdict.PASS)
CUT = Outcome(Verdict.CUT)


def to_check(reason: str, detail: str = "") -> Outcome:
    return Outcome(Verdict.CHECK, reason, detail)


def tie(reason: str, detail: str = "") -> Outcome:
    return Outcome(Verdict.TIE, reason, detail)


@dataclass(frozen=True)
class Restriction:
    key: str
    name: str
    rule: str
    source: str
    columns: tuple[str, ...]
    judge: Callable[[Row], Outcome]


@dataclass(frozen=True)
class Mark:
    restriction: str
    reason: str
    detail: str


@dataclass
class Fate:
    cut_by: str | None = None
    marks: list[Mark] = field(default_factory=list)
    ties: list[Mark] = field(default_factory=list)


@dataclass(frozen=True)
class Tally:
    restriction: Restriction
    entered: int
    cut: int
    to_check: int

    @property
    def passed(self) -> int:
        return self.entered - self.cut


@dataclass(frozen=True)
class CutResult:
    fates: dict[str, Fate]
    tallies: list[Tally]

    @property
    def candidates(self) -> list[str]:
        return [code for code, fate in self.fates.items() if fate.cut_by is None]


def run_cut(municipalities: Mapping[str, Row], restrictions: Sequence[Restriction]) -> CutResult:
    """Applies the restrictions in order; each one only sees the cities that survived the previous ones."""
    fates = {code: Fate() for code in sorted(municipalities)}
    tallies = []
    for restriction in restrictions:
        entering = [code for code, fate in fates.items() if fate.cut_by is None]
        cut = checked = 0
        for code in entering:
            outcome = restriction.judge(municipalities[code])
            if outcome.verdict is Verdict.CUT:
                fates[code].cut_by = restriction.key
                cut += 1
            elif outcome.verdict is Verdict.CHECK:
                fates[code].marks.append(Mark(restriction.key, outcome.reason, outcome.detail))
                checked += 1
            elif outcome.verdict is Verdict.TIE:
                fates[code].ties.append(Mark(restriction.key, outcome.reason, outcome.detail))
        tallies.append(Tally(restriction, len(entering), cut, checked))
    return CutResult(fates, tallies)


POPULATION_COLUMN = ibge_estimativas.population_column(2026)
MINIMUM_POPULATION = 35_000


def judge_population(row: Row) -> Outcome:
    value = row.get(POPULATION_COLUMN, "")
    if not value:
        return to_check(Reason.MISSING, "sem Estimativa 2026")
    return PASS if int(value) >= MINIMUM_POPULATION else CUT


POPULATION = Restriction(
    key="populacao",
    name="População",
    rule="Tem 35 mil habitantes ou mais.",
    source="IBGE, Estimativas da População 2026",
    columns=(POPULATION_COLUMN,),
    judge=judge_population,
)


MILD_SUMMER_CLIMATES = frozenset({"Cwb", "Cwc", "Cfb", "Cfc", "Csb", "Csc"})


def judge_climate(row: Row) -> Outcome:
    """Cuts only when both sources cut; a city absent from one source is decided by the other alone."""
    classes = {"Beck": row.get(beck.COLUMN, ""), "Alvares": row.get(alvares.COLUMN, "")}
    present = {source: climate for source, climate in classes.items() if climate}
    if not present:
        return to_check(Reason.MISSING, "sem classe Köppen em Beck nem em Alvares")
    verdicts = {climate in MILD_SUMMER_CLIMATES for climate in present.values()}
    if len(verdicts) > 1:
        return tie(Reason.DIVERGENT, ", ".join(f"{source} {climate}" for source, climate in present.items()))
    return PASS if verdicts.pop() else CUT


CLIMATE = Restriction(
    key="clima",
    name="Clima",
    rule="A classe Köppen no ponto da sede é Cwb, Cwc, Cfb, Cfc, Csb ou Csc.",
    source="Beck et al. 2023 (1991–2020) e Alvares et al. 2013",
    columns=(beck.COLUMN, alvares.COLUMN),
    judge=judge_climate,
)


MAXIMUM_HOMICIDE_RATE = 20


def judge_homicides(row: Row) -> Outcome:
    value = row.get(sim.RATE_COLUMN, "")
    if not value:
        return to_check(Reason.MISSING, "sem Censo 2022 ou sem Estimativa 2024 para o denominador")
    return PASS if float(value) <= MAXIMUM_HOMICIDE_RATE else CUT


HOMICIDES = Restriction(
    key="homicidios",
    name="Homicídios",
    rule="Tem taxa de até 20 por 100 mil habitantes, na média de 2022 a 2024, "
    "com os óbitos atribuídos ao município de residência da vítima.",
    source="SIM/DataSUS, com o Censo 2022 e a Estimativa 2024 do IBGE",
    columns=(*sim.DEATH_COLUMNS, *sim.POPULATION_COLUMNS, sim.RATE_COLUMN),
    judge=judge_homicides,
)


def judge_hospital(row: Row) -> Outcome:
    match row.get(cnes.HOSPITAL_COLUMN, ""):
        case cnes.Hospital.YES:
            return PASS
        case cnes.Hospital.NO:
            return CUT
        case cnes.Hospital.ABSENT:
            return to_check(Reason.ABSENT, f"sem estabelecimento no CNES {cnes.competence_label()}")
        case _:
            return to_check(Reason.MISSING, "sem dado do CNES para o código")


HOSPITAL = Restriction(
    key="hospital",
    name="Hospital",
    rule="Tem ao menos um hospital geral com leito de internação no próprio município.",
    source=f"CNES/DataSUS, competência {cnes.competence_label()}",
    columns=(cnes.HOSPITAL_COLUMN,),
    judge=judge_hospital,
)


def judge_internet(row: Row) -> Outcome:
    value = row.get(anatel.COLUMN, "")
    if not value:
        return to_check(Reason.ABSENT, "sem acesso declarado à Anatel nos 12 meses mais recentes")
    return PASS if value == anatel.YES else CUT


INTERNET = Restriction(
    key="internet",
    name="Internet",
    rule="Tem ao menos uma empresa com acesso de fibra declarado no município, em qualquer um dos 12 meses mais recentes.",
    source="Anatel, acessos de banda larga fixa",
    columns=(anatel.COLUMN,),
    judge=judge_internet,
)

RESTRICTIONS = (POPULATION, CLIMATE, HOMICIDES, HOSPITAL, INTERNET)
