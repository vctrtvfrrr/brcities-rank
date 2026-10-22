from datetime import date

from coleta import registro
from coleta.corte import CLIMATE, CUT, PASS, POPULATION, Restriction, run_cut
from coleta.criterios import SIZE, freeze
from coleta.extraidos import ExtractedSource

COLLECTED_ON = date(2026, 10, 22)
RESTRICTIONS = (POPULATION,)
CRITERIA = (SIZE,)
FILES = [
    {"arquivo": "populacao-2026.json", "endereco": "https://example.org/2026", "baixado_em": "2026-10-21"},
]
SOURCES = [ExtractedSource("ibge-estimativas", "IBGE, Estimativas", "Tabela 6579", FILES, (), {})]
MUNICIPALITIES = {
    "4106902": {"nome": "Curitiba", "uf": "PR", "latitude": "-25.4133", "longitude": "-49.2679", "populacao_2026": "1832183"},
    "1100015": {"nome": "Alta Floresta D'Oeste", "uf": "RO", "latitude": "-11.9330", "longitude": "-62.0037", "populacao_2026": "21000"},
    "2800308": {"nome": "Aracaju", "uf": "SE", "latitude": "-10.9091", "longitude": "-37.0677", "populacao_2026": ""},
}


def write(project_dir):
    result = run_cut(MUNICIPALITIES, RESTRICTIONS)
    candidates = [MUNICIPALITIES[code] for code in result.candidates]
    bounds = {criterion.column: freeze(criterion, candidates) for criterion in CRITERIA}
    registro.write(project_dir, MUNICIPALITIES, RESTRICTIONS, result, CRITERIA, bounds, SOURCES, COLLECTED_ON)


def snapshot(project_dir):
    return {path.name: path.read_bytes() for path in project_dir.rglob("*") if path.is_file()}


def test_record_is_deterministic(tmp_path):
    write(tmp_path)
    first = snapshot(tmp_path)
    write(tmp_path)

    assert snapshot(tmp_path) == first
    assert set(first) == {"municipios.csv", "corte.md", "criterios.md", "dataset.json"}


def test_csv_is_sorted_by_code_with_cut_and_marks(tmp_path):
    write(tmp_path)

    lines = (tmp_path / "dados" / "municipios.csv").read_text(encoding="utf-8").splitlines()

    assert lines[0] == "codigo_ibge,nome,uf,latitude,longitude,cortada_por,a_conferir,populacao_2026"
    assert [line.split(",")[0] for line in lines[1:]] == ["1100015", "2800308", "4106902"]
    assert lines[1].endswith(",populacao,,21000")
    assert "populacao (falta o dado)" in lines[2]


def test_cut_report_lists_only_candidates_with_divergent_climate(tmp_path):
    def city(name, population, beck, alvares):
        return {
            "nome": name, "uf": "XX", "latitude": "0", "longitude": "0",
            "populacao_2026": population, "koppen_beck": beck, "koppen_alvares": alvares,
        }

    municipalities = {
        "1": city("Divergente Grande", "100000", "Cfa", "Cfb"),
        "2": city("Divergente Pequena", "1000", "Cfa", "Cfb"),
        "3": city("Concordante", "100000", "Cfb", "Cfb"),
    }
    restrictions = (POPULATION, CLIMATE)
    result = run_cut(municipalities, restrictions)
    candidates = [municipalities[code] for code in result.candidates]
    bounds = {criterion.column: freeze(criterion, candidates) for criterion in CRITERIA}
    registro.write(tmp_path, municipalities, restrictions, result, CRITERIA, bounds, SOURCES, COLLECTED_ON)

    text = (tmp_path / "corte.md").read_text(encoding="utf-8")
    section = text.split("## Fontes de clima divergentes")[1]
    marked = text.split("## Candidatas com marca")[1].split("## Fontes de clima divergentes")[0]

    assert "| 1 | Divergente Grande | XX | Beck Cfa, Alvares Cfb |" in section
    assert "Divergente Pequena" not in text
    assert "Concordante" not in section
    assert "Nenhuma." in marked
    csv_line = next(
        line for line in (tmp_path / "dados" / "municipios.csv").read_text(encoding="utf-8").splitlines()
        if line.startswith("1,")
    )
    assert csv_line.split(",")[6] == ""


def test_cut_report_omits_divergent_climate_city_cut_by_a_later_restriction(tmp_path):
    def city(name):
        return {
            "nome": name, "uf": "XX", "latitude": "0", "longitude": "0",
            "populacao_2026": "100000", "koppen_beck": "Cfa", "koppen_alvares": "Cfb",
        }

    later = Restriction("depois", "Depois", "", "", (), lambda row: CUT if row["nome"] == "Cortada Depois" else PASS)
    municipalities = {"1": city("Segue"), "2": city("Cortada Depois")}
    restrictions = (POPULATION, CLIMATE, later)
    result = run_cut(municipalities, restrictions)
    candidates = [municipalities[code] for code in result.candidates]
    bounds = {criterion.column: freeze(criterion, candidates) for criterion in CRITERIA}
    registro.write(tmp_path, municipalities, restrictions, result, CRITERIA, bounds, SOURCES, COLLECTED_ON)

    text = (tmp_path / "corte.md").read_text(encoding="utf-8")

    assert result.fates["2"].ties and result.fates["2"].cut_by == "depois"
    assert "| 1 | Segue | XX | Beck Cfa, Alvares Cfb |" in text
    assert "Cortada Depois" not in text
