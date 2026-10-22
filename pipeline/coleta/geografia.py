"""Municipality names and distances shared by the sources and the validation."""

import math
import re
import unicodedata
from collections.abc import Mapping

EARTH_RADIUS_KM = 6371.0088


def normalize(text: str) -> str:
    """Without accents, case or punctuation: "Olho d' Água" and "Olho d'Água" become "olho d agua"."""
    decomposed = unicodedata.normalize("NFKD", text)
    unaccented = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^0-9a-z]+", " ", unaccented.casefold()).split())


class Gazetteer:
    """Finds the IBGE code of a municipality by name, within a UF or, without one, only if the name is unique."""

    def __init__(self, municipalities: Mapping[str, Mapping[str, str]]):
        self._codes: dict[str, dict[str, str]] = {}
        for code, row in municipalities.items():
            self._codes.setdefault(normalize(row["nome"]), {})[row["uf"]] = code

    def find(self, city: str, state: str | None = None) -> str | None:
        by_state = self._codes.get(normalize(city), {})
        if state is not None:
            return by_state.get(state)
        return next(iter(by_state.values())) if len(by_state) == 1 else None


def great_circle_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    haversine = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(haversine))
