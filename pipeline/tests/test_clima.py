import numpy as np
import pytest
from rasterio.io import MemoryFile
from rasterio.transform import from_origin

from coleta.corte import CUT, PASS, Reason, Verdict, judge_climate
from coleta.fontes import alvares, beck


def climate(beck_class: str, alvares_class: str) -> dict[str, str]:
    return {"koppen_beck": beck_class, "koppen_alvares": alvares_class}


@pytest.mark.parametrize("mild", ["Cwb", "Cwc", "Cfb", "Cfc", "Csb", "Csc"])
def test_both_sources_on_a_mild_summer_pass(mild):
    assert judge_climate(climate(mild, mild)) == PASS


def test_both_sources_on_other_classes_cut_even_when_they_differ():
    assert judge_climate(climate("Cfa", "Aw")) == CUT


def test_both_sources_passing_with_different_classes_pass():
    assert judge_climate(climate("Cfb", "Cwb")) == PASS


def test_divergent_sources_tie_with_both_classes():
    outcome = judge_climate(climate("Cfa", "Cfb"))

    assert outcome.verdict is Verdict.TIE
    assert outcome.reason == Reason.DIVERGENT
    assert outcome.detail == "Beck Cfa, Alvares Cfb"


def test_city_absent_from_alvares_is_decided_by_beck_alone():
    assert judge_climate(climate("Cfb", "")) == PASS
    assert judge_climate(climate("Cfa", "")) == CUT


def test_city_without_beck_is_decided_by_alvares_alone():
    assert judge_climate(climate("", "Cwb")) == PASS


def test_city_without_both_sources_passes_to_check():
    outcome = judge_climate({})

    assert outcome.verdict is Verdict.CHECK
    assert outcome.reason == Reason.MISSING


LEGEND = """Legend linking the numeric values in the maps to the K\xf6ppen-Geiger classes.

    1:  Af   Tropical, rainforest                  [0 0 255]
    14: Cfa  Temperate, no dry season, hot summer  [200 255 80]
    15: Cfb  Temperate, no dry season, warm summer [100 255 80]
    29: ET   Polar, tundra                         [178 178 178]

   Beck, H. E., T. R. McVicar, N. Vergopolan, A. Berg, N. J. Lutsko, A. Dufour,
"""


def test_legend_translates_codes_to_classes():
    assert beck.parse_legend(LEGEND) == {1: "Af", 14: "Cfa", 15: "Cfb", 29: "ET"}


def raster(cells: list[list[int]]):
    """A 1-degree grid whose top-left corner is at longitude 10, latitude 0."""
    data = np.array(cells, dtype="uint8")
    memory = MemoryFile()
    with memory.open(
        driver="GTiff", width=data.shape[1], height=data.shape[0], count=1, dtype="uint8", nodata=0,
        crs="EPSG:4326", transform=from_origin(10, 0, 1, 1),
    ) as dataset:
        dataset.write(data, 1)
    return memory.open()


def test_sample_takes_the_pixel_under_the_seat():
    with raster([[14, 14, 14], [14, 15, 14], [14, 14, 14]]) as dataset:
        assert beck.sample_class(dataset, 11.5, -1.5) == 15


def test_seat_on_sea_takes_the_nearest_land_pixel():
    with raster([[0, 0, 0], [0, 0, 15], [0, 14, 0]]) as dataset:
        assert beck.sample_class(dataset, 11.9, -1.2) == 15
        assert beck.sample_class(dataset, 11.2, -1.9) == 14


def test_seat_surrounded_by_sea_has_no_class():
    with raster([[0, 0, 0], [0, 0, 0], [0, 0, 0]]) as dataset:
        assert beck.sample_class(dataset, 11.5, -1.5) == 0


def test_seat_on_the_raster_edge_reads_outside_as_sea():
    with raster([[15, 0], [0, 0]]) as dataset:
        assert beck.sample_class(dataset, 10.5, -0.5) == 15


ALVARES_HEADER = ["Municipality", "IBGE-Code", "State", "Region", "K�ppen", "Altitude"]


def test_alvares_reads_the_class_by_ibge_code():
    table = [
        ALVARES_HEADER,
        ["Curitiba", 4106902.0, "PR", "Sul", "Cfb", 934.2],
        ["Rio de Janeiro", 3304557.0, "RJ", "Sudeste", "Am", 85.4],
        ["Rio de Janeiro", 3304557.0, "RJ", "Sudeste", "Am", 85.4],
    ]

    assert alvares.read_classes(table) == {"4106902": "Cfb", "3304557": "Am"}


def test_alvares_skips_rows_without_code_or_class():
    table = [ALVARES_HEADER, ["", "", "", "", "", ""], ["Sem classe", 1100015.0, "RO", "Norte", "", 246.1]]

    assert alvares.read_classes(table) == {}
