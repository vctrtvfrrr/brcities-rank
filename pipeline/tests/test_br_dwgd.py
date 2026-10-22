import zipfile

import numpy as np
import pandas as pd
import pytest
import xarray as xr

from coleta.fontes.br_dwgd import (
    Pixels,
    daily_series,
    dew_point,
    hottest_month_temperature,
    locate,
    members,
    rain_days_per_year,
    summer_dew_point,
)

# Saturation vapour pressure over water in hPa, from Hardy (1998), "ITS-90 formulations for vapor pressure".
SATURATION = {0: 6.112, 5: 8.725, 10: 12.281, 15: 17.057, 20: 23.393, 25: 31.699, 30: 42.470, 35: 56.292}


def series(values, start: str = "2001-01-01", points: int = 1) -> xr.DataArray:
    data = np.asarray(values, dtype=float).reshape(-1, points)
    time = pd.date_range(start, periods=len(data), freq="D")
    return xr.DataArray(data, coords={"time": time}, dims=("time", "point"))


@pytest.mark.parametrize(("temperature", "expected"), [(10, 0), (20, 10), (25, 5), (30, 20), (30, 25), (35, 25)])
def test_dew_point_matches_the_saturation_table(temperature, expected):
    humidity = 100 * SATURATION[expected] / SATURATION[temperature]

    assert dew_point(temperature, humidity) == pytest.approx(expected, abs=0.05)


def test_dew_point_of_saturated_air_is_the_temperature():
    assert dew_point(np.array([-5.0, 18.3]), np.array([100.0, 100.0])) == pytest.approx([-5.0, 18.3])


def test_summer_dew_point_averages_december_to_february_on_the_mean_temperature():
    time = pd.date_range("2001-01-01", "2001-12-31", freq="D")
    summer = time.month.isin([12, 1, 2])
    maximum = series(np.where(summer, 34.0, 10.0))
    minimum = series(np.where(summer, 26.0, 0.0))
    humidity = series(np.where(summer, 100 * SATURATION[25] / SATURATION[30], 50.0))

    assert summer_dew_point(maximum, minimum, humidity).item() == pytest.approx(25, abs=0.05)


def test_hottest_month_is_the_largest_monthly_mean_of_the_daily_mean():
    time = pd.date_range("2001-01-01", "2001-12-31", freq="D")
    october = time.month == 10
    maximum = series(np.where(october, 30.0, 28.0))
    minimum = series(np.where(october, 20.0, 18.0))

    assert hottest_month_temperature(maximum, minimum).values.tolist() == pytest.approx([25.0])


def test_hottest_month_averages_the_same_month_across_years():
    time = pd.date_range("2001-01-01", "2002-12-31", freq="D")
    january = time.month == 1
    mean_temperature = np.where(january & (time.year == 2001), 24.0, np.where(january, 28.0, 10.0))
    maximum = series(mean_temperature + 5)
    minimum = series(mean_temperature - 5)

    assert hottest_month_temperature(maximum, minimum).values.tolist() == pytest.approx([26.0])


def test_hottest_month_skips_missing_days():
    time = pd.date_range("2001-01-01", "2001-12-31", freq="D")
    january = time.month == 1
    missing = january & (time.day <= 15)
    maximum = series(np.where(missing, np.nan, np.where(january, 30.0, 12.0)))
    minimum = series(np.where(january, 20.0, 8.0))

    assert hottest_month_temperature(maximum, minimum).values.tolist() == pytest.approx([25.0])


def test_hottest_month_is_missing_for_a_point_without_data():
    time = pd.date_range("2001-01-01", "2001-12-31", freq="D")
    maximum = series(np.column_stack([np.full(len(time), 30.0), np.full(len(time), np.nan)]), points=2)
    minimum = series(np.column_stack([np.full(len(time), 20.0), np.full(len(time), np.nan)]), points=2)

    result = hottest_month_temperature(maximum, minimum)

    assert result.values[0] == pytest.approx(25.0)
    assert np.isnan(result.values[1])


def test_hottest_month_ignores_a_month_without_any_day():
    time = pd.date_range("2001-01-01", "2001-03-31", freq="D")
    maximum = series(np.where(time.month == 2, 34.0, 30.0))
    minimum = series(np.where(time.month == 2, 26.0, 20.0))

    assert hottest_month_temperature(maximum, minimum).values.tolist() == pytest.approx([30.0])


def test_rain_days_count_from_one_millimetre():
    first_year = [0.0, 0.9, 1.0, 25.0] + [0.0] * 361
    second_year = [1.1] * 10 + [0.0] * 355

    assert rain_days_per_year(series(first_year + second_year)).item() == pytest.approx((2 + 10) / 2)


def test_rain_days_scale_missing_days_to_the_whole_period():
    year = [5.0] * 100 + [0.0] * 165 + [np.nan] * 100

    assert rain_days_per_year(series(year)).item() == pytest.approx(100 / 265 * 365)


def test_locate_takes_the_cell_containing_the_point():
    latitudes = np.array([-20.05, -19.95, -19.85])
    longitudes = np.array([-44.05, -43.95])
    valid = np.ones((3, 2), dtype=bool)

    pixels = locate(latitudes, longitudes, valid, np.array([-19.99, -19.83]), np.array([-44.01, -43.91]))

    assert pixels.rows.tolist() == [1, 2]
    assert pixels.columns.tolist() == [0, 1]
    assert not pixels.displaced.any()


def test_locate_moves_a_point_over_the_sea_to_the_closest_valid_cell():
    latitudes = np.array([-20.05, -19.95, -19.85])
    longitudes = np.array([-40.15, -40.05, -39.95])
    valid = np.array([
        [True, True, False],
        [True, False, False],
        [True, True, False],
    ])

    pixels = locate(latitudes, longitudes, valid, np.array([-19.96]), np.array([-39.97]))

    assert (pixels.rows[0], pixels.columns[0]) == (0, 1)
    assert pixels.displaced.tolist() == [True]


def test_members_pick_the_files_of_the_variable_covering_the_period(tmp_path):
    archive = tmp_path / "pr_Tmax_Tmin_NetCDF_Files.zip"
    with zipfile.ZipFile(archive, "w") as opened:
        for name in (
            "pr_19610101_19801231_BR-DWGD_UFES_UTEXAS_v_3.2.4.nc",
            "pr_20010101_20251231_BR-DWGD_UFES_UTEXAS_v_3.2.4.nc",
            "pr_19810101_20001231_BR-DWGD_UFES_UTEXAS_v_3.2.4.nc",
            "pr_Control_19810101_20001231_BR-DWGD_UFES_UTEXAS_v_3.2.4.nc",
            "Tmax_19810101_20001231_BR-DWGD_UFES_UTEXAS_v_3.2.4.nc",
        ):
            opened.writestr(name, b"")

    selected = members(archive, "pr", (1991, 2020))

    assert [(member.start, member.end, member.version) for member in selected] == [(1981, 2000, "3.2.4"), (2001, 2025, "3.2.4")]


def test_daily_series_reads_the_pixels_across_files(tmp_path):
    latitudes = np.array([-20.05, -19.95])
    longitudes = np.array([-44.05, -43.95, -43.85])
    paths = []
    for start, end in (("1999-01-01", "2000-12-31"), ("2001-01-01", "2002-12-31")):
        time = pd.date_range(start, end, freq="D")
        grid = np.arange(len(time) * 6, dtype=float).reshape(len(time), 2, 3)
        path = tmp_path / f"RH_{start[:4]}.nc"
        xr.Dataset(
            {"RH": (("time", "latitude", "longitude"), grid)},
            coords={"time": time, "latitude": latitudes, "longitude": longitudes},
        ).to_netcdf(path)
        paths.append(path)
    pixels = Pixels(np.array([1, 0]), np.array([2, 0]), np.array([False, False]))

    daily = daily_series(paths, "RH", (2000, 2001), pixels)

    assert str(daily.time.values[0])[:10] == "2000-01-01"
    assert str(daily.time.values[-1])[:10] == "2001-12-31"
    assert daily.sizes == {"time": 366 + 365, "point": 2}
    assert daily.values[0].tolist() == [365 * 6 + 5, 365 * 6]
    assert daily.values[366].tolist() == [5, 0]
