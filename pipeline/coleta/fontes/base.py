"""Convention shared by the source modules.

Each module in this package exposes NAME (its folder under fontes/), TITLE,
YEAR_LABEL, LANDING_URL and CREDIT (the citation shown by the app), FILES, download(folder) and extract(folder). download never overwrites a file
already present and returns the manual files still missing; extract returns an
Extraction keyed by the 7-digit IBGE code and knows nothing about the Corte.
A module may also expose derive(row), which montar applies to every merged
municipality to compute the columns that combine several sources, and
year_label(edition), which replaces YEAR_LABEL when the year depends on the edition.
"""

import gzip
import json
import shutil
import urllib.request
from dataclasses import dataclass
from datetime import date
from email.utils import parsedate_to_datetime
from pathlib import Path

USER_AGENT = "brcities-rank-coleta/0.1"


@dataclass(frozen=True)
class RemoteFile:
    name: str
    url: str
    manual: bool = False


@dataclass(frozen=True)
class Extraction:
    columns: tuple[str, ...]
    rows: dict[str, dict[str, str]]
    edition: str


def download_files(folder: Path, files: tuple[RemoteFile, ...]) -> list[RemoteFile]:
    folder.mkdir(parents=True, exist_ok=True)
    missing = []
    for remote in files:
        target = folder / remote.name
        if target.exists():
            if not _receipt(target).exists():
                _write_receipt(target, remote.url, date.fromtimestamp(target.stat().st_mtime), None)
        elif remote.manual:
            missing.append(remote)
        else:
            _fetch(remote, target)
    return missing


def missing_files(folder: Path, files: tuple[RemoteFile, ...]) -> list[RemoteFile]:
    return [remote for remote in files if not (folder / remote.name).exists()]


def provenance(folder: Path, files: tuple[RemoteFile, ...]) -> list[dict[str, str | None]]:
    return [
        {"arquivo": remote.name} | json.loads(_receipt(folder / remote.name).read_text(encoding="utf-8"))
        for remote in files
    ]


def _fetch(remote: RemoteFile, target: Path) -> None:
    partial = target.with_name(target.name + ".parcial")
    request = urllib.request.Request(remote.url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request) as response, partial.open("wb") as output:
        received = _CountingReader(response)
        body = gzip.GzipFile(fileobj=received) if response.headers.get("Content-Encoding") == "gzip" else received
        shutil.copyfileobj(body, output)
        expected = response.headers.get("Content-Length")
        last_modified = response.headers.get("Last-Modified")
    if expected is not None and received.count != int(expected):
        partial.unlink()
        raise SystemExit(f"{remote.name}: vieram {received.count} de {expected} bytes; rode baixar de novo")
    partial.rename(target)
    server_date = parsedate_to_datetime(last_modified).date() if last_modified else None
    _write_receipt(target, remote.url, date.today(), server_date)


class _CountingReader:
    """The server closing early truncates the body silently; the bytes read are compared with Content-Length."""

    def __init__(self, stream):
        self.stream = stream
        self.count = 0

    def read(self, size: int = -1) -> bytes:
        chunk = self.stream.read(size)
        self.count += len(chunk)
        return chunk


def _receipt(target: Path) -> Path:
    return target.with_name(target.name + ".baixado.json")


def _write_receipt(target: Path, url: str, downloaded: date, modified: date | None) -> None:
    receipt = {
        "endereco": url,
        "baixado_em": downloaded.isoformat(),
        "modificado_no_servidor": modified.isoformat() if modified else None,
    }
    _receipt(target).write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
