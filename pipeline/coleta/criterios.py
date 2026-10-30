import math
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from enum import Enum

from coleta.fontes import alvares, anatel, atlas_desastres, beck, casa_civil, cnes, ibge_censo_esgoto, ibge_estimativas, inep_ideb, sgb, sim
from coleta.fontes import br_dwgd, anadem, ibge_setores


class Direction(Enum):
    HIGHER = "maior"
    LOWER = "menor"


@dataclass(frozen=True)
class Criterion:
    category: str
    name: str
    scope: str
    year: int | str
    source: str
    source_file: str
    column: str
    direction: Direction
    logarithmic: bool = False
    extra_columns: tuple[str, ...] = ()
    binary: bool = False
    other_sources: tuple[tuple[str, str], ...] = ()
    unit: str = ""

    def transform(self, value: float) -> float:
        return math.log(value) if self.logarithmic else value


@dataclass(frozen=True)
class Bounds:
    p5: float
    p95: float
    count: int


def percentile(values: Iterable[float], fraction: float) -> float:
    """Linear interpolation between the closest ranks (numpy's default)."""
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def freeze(criterion: Criterion, candidates: Iterable[Mapping[str, str]]) -> Bounds | None:
    if criterion.binary:
        return None
    values = [criterion.transform(float(row[criterion.column])) for row in candidates if row.get(criterion.column)]
    if not values:
        return None
    return Bounds(percentile(values, 0.05), percentile(values, 0.95), len(values))


def score(value: float, bounds: Bounds, direction: Direction) -> float:
    """Trimmed min-max from 0 to 100 on an already transformed value."""
    if bounds.p5 == bounds.p95:
        return 100.0
    trimmed = min(max(value, bounds.p5), bounds.p95)
    stretched = (trimmed - bounds.p5) / (bounds.p95 - bounds.p5) * 100
    return stretched if direction is Direction.HIGHER else 100 - stretched


SIZE = Criterion(
    category="Porte",
    name="População",
    scope="População residente estimada em 1º de julho, por município",
    year=2026,
    source=ibge_estimativas.NAME,
    source_file=ibge_estimativas.population_file(2026).name,
    column=ibge_estimativas.population_column(2026),
    direction=Direction.HIGHER,
    logarithmic=True,
    unit="habitantes",
)

SAFETY = Criterion(
    category="Segurança",
    name="Homicídios por 100 mil habitantes",
    scope="Óbitos por agressão (CID-10 X85–Y09) e intervenção legal (Y35–Y36), por município de residência, "
    "somados de 2022 a 2024 e divididos pela soma das populações dos três anos: o Censo 2022, a média do Censo "
    "2022 e da Estimativa 2024 para 2023, e a Estimativa 2024; sem óbito registrado, a taxa é zero",
    year=f"{sim.YEARS[0]} a {sim.YEARS[-1]}",
    source=sim.NAME,
    source_file=sim.LISTING.name,
    column=sim.RATE_COLUMN,
    direction=Direction.LOWER,
    unit="por 100 mil habitantes",
)

DISASTER_YEARS = Criterion(
    category="Desastres",
    name="Anos com registro de desastre",
    scope="Anos com ao menos um registro da família chuva (COBRADE 12100, 12200, 12300, 113xx e 13214) mais metade "
    "dos anos com registro de vento ou granizo (13111, 13112, 13211, 13212, 13213 e 13215), de 0 a 15, pela data do "
    "evento e com todos os status; 13214 conta só na chuva. `suscetivel` marca a cidade da lista da Casa Civil ou com "
    "setor de risco alto ou muito alto do SGB, que a pontuação conta como 1 ano quando ela não tem registro",
    year=f"{atlas_desastres.FIRST_YEAR} a {atlas_desastres.LAST_YEAR}",
    source=atlas_desastres.NAME,
    source_file=atlas_desastres.DATABASE.name,
    column=atlas_desastres.YEARS_COLUMN,
    direction=Direction.LOWER,
    extra_columns=(
        atlas_desastres.RAIN_YEARS_COLUMN,
        atlas_desastres.WIND_YEARS_COLUMN,
        atlas_desastres.SUSCEPTIBLE_COLUMN,
        casa_civil.COLUMN,
        sgb.COLUMN,
    ),
    other_sources=(
        *((casa_civil.NAME, note.file.name) for note in casa_civil.NOTES),
        (sgb.NAME, sgb.SECTORS.name),
    ),
    unit="anos",
)

DISASTER_DAMAGE = Criterion(
    category="Desastres",
    name="Danos humanos da família chuva por mil habitantes",
    scope="Óbitos, desabrigados e desalojados dos registros da família chuva, pela data do evento e com todos os "
    "status, somados de 2016 a 2025 e divididos pela Estimativa da População 2026, por mil habitantes; sem registro, "
    "zero",
    year=f"{atlas_desastres.FIRST_YEAR} a {atlas_desastres.LAST_YEAR}",
    source=atlas_desastres.NAME,
    source_file=atlas_desastres.DATABASE.name,
    column=atlas_desastres.DAMAGE_RATE_COLUMN,
    direction=Direction.LOWER,
    extra_columns=(atlas_desastres.DAMAGE_COLUMN,),
    unit="por mil habitantes",
)

PEDIATRICIANS = Criterion(
    category="Saúde",
    name="Pediatras por mil crianças",
    scope=f"Médicos pediatras (CBO {cnes.PEDIATRICIAN}) com vínculo no município na competência "
    f"{cnes.competence_label()}, contados por CPF único dentro do município, por mil crianças de 0 a 14 anos "
    "do Censo 2022; um médico com vínculos em vários municípios conta em cada um",
    year=cnes.YEAR,
    source=cnes.NAME,
    source_file=cnes.dbc_file(cnes.PROFESSIONALS, cnes.STATES[0]).name,
    column=cnes.RATIO_COLUMN,
    direction=Direction.HIGHER,
    unit="por mil crianças",
)

SEWAGE = Criterion(
    category="Saúde",
    name="Esgoto por rede geral ou fossa séptica",
    scope="Percentual de moradores em domicílios particulares permanentes ocupados com esgotamento por rede geral, "
    "rede pluvial ou fossa ligada à rede, ou por fossa séptica ou fossa filtro não ligada à rede",
    year=ibge_censo_esgoto.YEAR,
    source=ibge_censo_esgoto.NAME,
    source_file=ibge_censo_esgoto.SEWAGE.name,
    column=ibge_censo_esgoto.COLUMN,
    direction=Direction.HIGHER,
    unit="%",
)


def _ideb(stage: inep_ideb.Stage, name: str) -> Criterion:
    return Criterion(
        category="Escola",
        name=f"IDEB {name}",
        scope=f"IDEB observado em {inep_ideb.YEAR} da rede pública do município, {name}; vazio sem nota divulgada",
        year=inep_ideb.YEAR,
        source=inep_ideb.NAME,
        source_file=stage.file.name,
        column=stage.column,
        direction=Direction.HIGHER,
        unit="pontos",
    )


IDEB_EARLY_YEARS = _ideb(inep_ideb.EARLY_YEARS, "dos anos iniciais do fundamental")
IDEB_LATE_YEARS = _ideb(inep_ideb.LATE_YEARS, "dos anos finais do fundamental")
IDEB_HIGH_SCHOOL = _ideb(inep_ideb.HIGH_SCHOOL, "do ensino médio")


def _decimal_comma(value: float) -> str:
    return f"{value:g}".replace(".", ",")


SEAT_PIXEL = (
    "no pixel de 0,1° que contém a sede, sem interpolação; a sede sobre pixel sem dado usa o pixel válido mais próximo"
)

HUMIDITY = Criterion(
    category="Clima",
    name="Umidade relativa média anual",
    scope=f"Média da umidade relativa diária de {br_dwgd.HUMIDITY_PERIOD[0]} a {br_dwgd.HUMIDITY_PERIOD[1]}, "
    f"{SEAT_PIXEL}",
    year=f"{br_dwgd.HUMIDITY_PERIOD[0]} a {br_dwgd.HUMIDITY_PERIOD[1]}",
    source=br_dwgd.NAME,
    source_file=br_dwgd.HUMIDITY_ARCHIVE.name,
    column=br_dwgd.HUMIDITY_COLUMN,
    direction=Direction.LOWER,
    unit="%",
)

SUMMER_DEW_POINT = Criterion(
    category="Clima",
    name="Ponto de orvalho médio de dezembro a fevereiro",
    scope=f"Média, nos dias de dezembro a fevereiro de {br_dwgd.HUMIDITY_PERIOD[0]} a {br_dwgd.HUMIDITY_PERIOD[1]}, "
    "do ponto de orvalho diário pela fórmula de Magnus, Td = b·γ / (a − γ) com γ = ln(UR / 100) + a·T / (b + T), "
    f"a = {_decimal_comma(br_dwgd.MAGNUS_A)} e b = {_decimal_comma(br_dwgd.MAGNUS_B)} °C (Alduchov e Eskridge 1996), "
    "T = (Tmax + Tmin) / 2 e UR a umidade relativa do dia, em °C, "
    f"{SEAT_PIXEL}",
    year=f"{br_dwgd.HUMIDITY_PERIOD[0]} a {br_dwgd.HUMIDITY_PERIOD[1]}",
    source=br_dwgd.NAME,
    source_file=br_dwgd.HUMIDITY_ARCHIVE.name,
    column=br_dwgd.DEW_POINT_COLUMN,
    direction=Direction.LOWER,
    other_sources=((br_dwgd.NAME, br_dwgd.RAIN_ARCHIVE.name),),
    unit="°C",
)

RAIN_DAYS = Criterion(
    category="Clima",
    name="Dias com chuva de 1 mm ou mais por ano",
    scope=f"Dias com precipitação de {_decimal_comma(br_dwgd.RAIN_DAY_MM)} mm ou mais, de "
    f"{br_dwgd.RAIN_PERIOD[0]} a {br_dwgd.RAIN_PERIOD[1]}, divididos pelo número de anos, {SEAT_PIXEL}; "
    "a grade interpolada conta mais dias que as estações, porque espalha a garoa entre as células (na validação, "
    "39 dias por ano acima das Normais 1991–2020 do INMET, em média), e o critério compara as cidades na mesma grade",
    year=f"{br_dwgd.RAIN_PERIOD[0]} a {br_dwgd.RAIN_PERIOD[1]}",
    source=br_dwgd.NAME,
    source_file=br_dwgd.RAIN_ARCHIVE.name,
    column=br_dwgd.RAIN_DAYS_COLUMN,
    direction=Direction.LOWER,
    unit="dias por ano",
)

HOTTEST_MONTH = Criterion(
    category="Clima",
    name="Temperatura do mês mais quente",
    scope="Maior das 12 médias mensais da temperatura média diária, (Tmax + Tmin) / 2, de "
    f"{br_dwgd.HUMIDITY_PERIOD[0]} a {br_dwgd.HUMIDITY_PERIOD[1]}, em °C, {SEAT_PIXEL}",
    year=f"{br_dwgd.HUMIDITY_PERIOD[0]} a {br_dwgd.HUMIDITY_PERIOD[1]}",
    source=br_dwgd.NAME,
    source_file=br_dwgd.RAIN_ARCHIVE.name,
    column=br_dwgd.TEMPERATURE_COLUMN,
    direction=Direction.LOWER,
    unit="°C",
)

CRITERIA = (SAFETY, DISASTER_YEARS, DISASTER_DAMAGE, PEDIATRICIANS, SEWAGE, IDEB_EARLY_YEARS, IDEB_LATE_YEARS, IDEB_HIGH_SCHOOL, HUMIDITY, SUMMER_DEW_POINT, RAIN_DAYS, HOTTEST_MONTH, SIZE)


@dataclass(frozen=True)
class Filter:
    """A column the app only filters by, so it has no direction, transformation or P5/P95."""

    category: str
    name: str
    source: str
    column: str
    unit: str | None = None
    other_sources: tuple[str, ...] = ()
    scope: str = ""


FILTERS = (
    Filter("Clima", "Köppen de Beck", beck.NAME, beck.COLUMN),
    Filter("Clima", "Köppen de Alvares", alvares.NAME, alvares.COLUMN),
    Filter("Saúde", "Hospital geral com leito de internação", cnes.NAME, cnes.HOSPITAL_COLUMN),
    Filter("Internet", "Acesso de fibra", anatel.NAME, anatel.COLUMN),
    Filter("Relevo", "Altitude", anadem.NAME, anadem.ALTITUDE_COLUMN, "m", scope="Altitude do pixel ANADEM de 30 m que contém a sede; sem dado, usa o pixel válido mais próximo, sem interpolação"),
    Filter("Relevo", "Declividade urbana", anadem.NAME, anadem.SLOPE_COLUMN, "%", (ibge_setores.NAME,), "Média da declividade dos pixels nos setores urbanos (CD_SIT 1, 2 ou 3) do distrito que contém a sede, Censo 2022"),
    Filter("Relevo", "Classe de relevo", anadem.NAME, anadem.CLASS_COLUMN, None, (ibge_setores.NAME,), "Classe Embrapa de maior área na parte terrestre do município, excluídos os setores de massa d’água (CD_SIT 9): 0–3%, 3–8%, 8–20%, 20–45%, 45–75%, acima de 75%; empate pela mais plana"),
)
