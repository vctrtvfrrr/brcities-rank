import json

import pytest

from coleta import __main__ as cli, extraidos
from coleta.fontes import aneel_tensoes, ibge_localidades
from coleta.fontes.base import Extraction


@pytest.fixture
def project(tmp_path, monkeypatch):
    extracted = tmp_path / "fontes" / "extraidos"
    monkeypatch.setattr(cli, "PIPELINE_DIR", tmp_path)
    monkeypatch.setattr(cli, "EXTRACTED_DIR", extracted)
    monkeypatch.setattr(cli, "SOURCES_DIR", extracted.parent)
    monkeypatch.setattr(cli, "SOURCES", {module.NAME: module for module in (ibge_localidades, aneel_tensoes)})
    monkeypatch.setattr(cli, "CRITERIA", ())
    monkeypatch.setattr(cli, "RESTRICTIONS", ())
    return extracted


def write_base(folder):
    extraidos.write(folder, ibge_localidades.NAME, ibge_localidades.TITLE, Extraction(
        ("nome", "uf", "latitude", "longitude"),
        {"1200401": {"nome": "Rio Branco", "uf": "AC", "latitude": "-9.97", "longitude": "-67.82"}},
        "2022",
    ), [])


def test_mount_succeeds_without_the_manual_voltage_extraction(project, tmp_path):
    write_base(project)

    assert cli.main(["montar"]) == 0

    dataset = json.loads((tmp_path / "dados" / "dataset.json").read_text())
    assert dataset["colunas"]["codigo_ibge"] == ["1200401"]
    assert "tensao" not in dataset["colunas"]
    assert all(entry["chave"] != "tensao" for entry in dataset["catalogo"])
    assert "tensao" not in (tmp_path / "dados" / "municipios.csv").read_text().splitlines()[0]


def test_mount_still_requires_the_ibge_base(project, tmp_path, capsys):
    assert cli.main(["montar"]) == 1
    assert "ibge-localidades" in capsys.readouterr().out
    assert not (tmp_path / "dados").exists()


def test_mount_includes_voltage_once_extracted(project, tmp_path):
    write_base(project)
    extraidos.write(project, aneel_tensoes.NAME, aneel_tensoes.TITLE, Extraction(
        ("tensao",), {"1200401": {"tensao": "220/127;230/115"}}, "2026-10-30",
    ), [])

    assert cli.main(["montar"]) == 0

    dataset = json.loads((tmp_path / "dados" / "dataset.json").read_text())
    assert dataset["colunas"]["tensao"] == ["220/127;230/115"]
    assert next(entry for entry in dataset["catalogo"] if entry["chave"] == "tensao")["pontua"] is False


def test_mount_refuses_stale_voltage_coverage(project, tmp_path):
    write_base(project)
    extraidos.write(project, aneel_tensoes.NAME, aneel_tensoes.TITLE, Extraction(("tensao",), {}, "2026-10-30"), [])
    with pytest.raises(SystemExit, match="cobertura.*IBGE"):
        cli.main(["montar"])
    assert not (tmp_path / "dados").exists()


def test_extract_all_skips_an_optional_manual_file_that_is_missing(project, monkeypatch, capsys):
    monkeypatch.setattr(cli, "SOURCES", {aneel_tensoes.NAME: aneel_tensoes})
    assert cli.main(["extrair"]) == 0
    assert "aneel-tensoes" in capsys.readouterr().out
    assert not extraidos.exists(project, aneel_tensoes.NAME)


def test_explicit_voltage_extraction_still_requires_the_csv(project, capsys):
    assert cli.main(["extrair", "aneel-tensoes"]) == 1
    assert "tensoes.csv" in capsys.readouterr().out
    assert not extraidos.exists(project, aneel_tensoes.NAME)


def test_extract_all_still_requires_files_of_required_sources(project, capsys):
    assert cli.main(["extrair"]) == 1
    assert "ibge-localidades" in capsys.readouterr().out
