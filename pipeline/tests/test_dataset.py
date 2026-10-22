import json
from datetime import date

import pytest

from coleta import registro
from coleta.corte import RESTRICTIONS, run_cut
from coleta.criterios import CRITERIA, freeze
from coleta.extraidos import ExtractedSource
from coleta.fontes import SOURCES

SCORING = (
    "homicidios_por_100_mil", "anos_desastre", "danos_chuva_por_mil", "pediatras_por_mil_criancas", "esgoto_pct",
    "ideb_anos_iniciais", "ideb_anos_finais", "ideb_ensino_medio", "umidade_relativa", "orvalho_dez_fev",
    "dias_de_chuva", "temp_mes_mais_quente", "populacao_2026",
)
FILTERING = ("koppen_beck", "koppen_alvares", "hospital_geral", "fibra")
COLUMNS = ("codigo_ibge", "nome", "uf", "latitude", "longitude", *SCORING, *FILTERING)
COLLECTED_ON = date(2026, 10, 22)

FULL = {
    "homicidios_por_100_mil": "12.5", "anos_desastre": "2", "danos_chuva_por_mil": "0.31",
    "pediatras_por_mil_criancas": "0.2161", "esgoto_pct": "18.28", "ideb_anos_iniciais": "5.7",
    "ideb_anos_finais": "4.9", "ideb_ensino_medio": "4.1", "umidade_relativa": "76.4", "orvalho_dez_fev": "17.2",
    "dias_de_chuva": "130.5", "temp_mes_mais_quente": "27.8", "populacao_2026": "1832183",
    "koppen_beck": "Cfb", "koppen_alvares": "Cfa", "hospital_geral": "sim", "fibra": "não",
}
MUNICIPALITIES = {
    "4106902": {"nome": "Curitiba", "uf": "PR", "latitude": "-25.4133", "longitude": "-49.2679", **FULL},
    "1100015": {
        "nome": "Alta Floresta D'Oeste", "uf": "RO", "latitude": "-11.9330", "longitude": "-62.0037",
        **{column: "" for column in FULL}, "populacao_2026": "21000", "hospital_geral": "não", "fibra": "sim",
    },
}


def sources():
    return [
        ExtractedSource(
            name, module.TITLE, f"Edição de {name}",
            [{"arquivo": remote.name, "endereco": remote.url, "baixado_em": "2026-10-21"} for remote in module.FILES],
            (), {},
        )
        for name, module in SOURCES.items()
    ]


def write(project_dir, municipalities=MUNICIPALITIES):
    result = run_cut(municipalities, RESTRICTIONS)
    candidates = [municipalities[code] for code in result.candidates]
    bounds = {criterion.column: freeze(criterion, candidates) for criterion in CRITERIA}
    registro.write(project_dir, municipalities, RESTRICTIONS, result, CRITERIA, bounds, sources(), COLLECTED_ON)
    return project_dir / "dados" / "dataset.json"


def read(project_dir):
    return json.loads(write(project_dir).read_text(encoding="utf-8"))


def test_dataset_is_deterministic(tmp_path):
    first = write(tmp_path).read_bytes()

    assert write(tmp_path).read_bytes() == first


def test_dataset_has_exactly_the_22_columns_sorted_by_code(tmp_path):
    columns = read(tmp_path)["colunas"]

    assert tuple(columns) == COLUMNS
    assert columns["codigo_ibge"] == ["1100015", "4106902"]
    assert columns["nome"] == ["Alta Floresta D'Oeste", "Curitiba"]
    assert all(len(values) == 2 for values in columns.values())


def test_dataset_keeps_absent_as_null_and_yes_no_as_booleans(tmp_path):
    columns = read(tmp_path)["colunas"]

    assert columns["homicidios_por_100_mil"] == [None, 12.5]
    assert columns["koppen_beck"] == [None, "Cfb"]
    assert columns["populacao_2026"] == [21000, 1832183]
    assert columns["latitude"] == [-11.933, -25.4133]
    assert columns["hospital_geral"] == [False, True]
    assert columns["fibra"] == [True, False]


def test_dataset_leaves_the_cut_and_the_components_out(tmp_path):
    text = write(tmp_path).read_text(encoding="utf-8")

    for left_out in ("cortada_por", "a_conferir", "homicidios_2022", "danos_chuva\"", "p5", "p95"):
        assert left_out not in text


def test_catalog_lists_the_13_scoring_and_the_4_filtering_criteria(tmp_path):
    catalog = read(tmp_path)["catalogo"]

    assert [entry["chave"] for entry in catalog] == [*SCORING, *FILTERING]
    assert [entry["pontua"] for entry in catalog] == [True] * 13 + [False] * 4
    assert all(
        set(entry) == {"chave", "categoria", "rotulo", "unidade", "direcao", "transformacao", "pontua", "fontes"}
        for entry in catalog
    )
    by_key = {entry["chave"]: entry for entry in catalog}
    assert by_key["populacao_2026"] | {"fontes": None} == {
        "chave": "populacao_2026", "categoria": "Porte", "rotulo": "População", "unidade": "habitantes",
        "direcao": "maior", "transformacao": "logaritmo", "pontua": True, "fontes": None,
    }
    assert by_key["homicidios_por_100_mil"]["direcao"] == "menor"
    assert by_key["homicidios_por_100_mil"]["transformacao"] == "nenhuma"
    assert by_key["homicidios_por_100_mil"]["fontes"] == ["sim"]
    assert by_key["fibra"]["direcao"] is None
    assert by_key["fibra"]["fontes"] == ["anatel"]


def test_metadata_has_contract_version_collection_date_and_credited_sources(tmp_path):
    dataset = read(tmp_path)

    assert dataset["versao"] == 1
    assert dataset["coleta"] == "2026-10-22"
    assert [source["chave"] for source in dataset["fontes"]] == list(SOURCES)
    by_key = {source["chave"]: source for source in dataset["fontes"]}
    assert set(by_key["beck"]) == {"chave", "nome", "edicao", "ano", "endereco", "credito"}
    assert by_key["beck"]["edicao"] == "Edição de beck"
    assert all(source["credito"] and source["endereco"].startswith("https://") and source["ano"] for source in dataset["fontes"])
    assert "CC BY 4.0" in by_key["beck"]["credito"]
    assert "CC BY 4.0" in by_key["br-dwgd"]["credito"]
    assert "Alvares" in by_key["alvares"]["credito"]


@pytest.mark.parametrize("column", ("hospital_geral", "fibra"))
@pytest.mark.parametrize("value", ("ausente", "talvez", "True"))
def test_record_fails_when_hospital_or_fibra_is_not_yes_no_or_empty(tmp_path, column, value):
    municipalities = {"4106902": {**MUNICIPALITIES["4106902"], column: value}}

    with pytest.raises(SystemExit) as failure:
        write(tmp_path, municipalities)

    assert column in str(failure.value) and "4106902" in str(failure.value) and repr(value) in str(failure.value)
    assert list(tmp_path.rglob("*")) == []
