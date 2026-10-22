import gzip
import io
import urllib.request

import pytest

from coleta.fontes.base import RemoteFile, download_files

REMOTE = RemoteFile("dados.csv", "https://exemplo.gov.br/dados.csv")


class FakeResponse(io.BytesIO):
    def __init__(self, body: bytes, headers: dict[str, str]):
        super().__init__(body)
        self.headers = headers


def serve(monkeypatch, body: bytes, headers: dict[str, str]) -> None:
    monkeypatch.setattr(urllib.request, "urlopen", lambda request: FakeResponse(body, headers))


def test_download_shorter_than_content_length_fails_without_leaving_the_file(monkeypatch, tmp_path):
    serve(monkeypatch, b"1234", {"Content-Length": "10"})

    with pytest.raises(SystemExit, match="4 de 10 bytes"):
        download_files(tmp_path, (REMOTE,))

    assert list(tmp_path.iterdir()) == []


def test_download_matching_content_length_is_kept(monkeypatch, tmp_path):
    serve(monkeypatch, b"1234567890", {"Content-Length": "10"})

    download_files(tmp_path, (REMOTE,))

    assert (tmp_path / REMOTE.name).read_bytes() == b"1234567890"


def test_download_without_content_length_is_kept(monkeypatch, tmp_path):
    serve(monkeypatch, b"1234", {})

    download_files(tmp_path, (REMOTE,))

    assert (tmp_path / REMOTE.name).read_bytes() == b"1234"


def test_gzip_download_compares_content_length_with_the_compressed_bytes(monkeypatch, tmp_path):
    compressed = gzip.compress(b"a" * 1000)
    serve(monkeypatch, compressed, {"Content-Length": str(len(compressed)), "Content-Encoding": "gzip"})

    download_files(tmp_path, (REMOTE,))

    assert (tmp_path / REMOTE.name).read_bytes() == b"a" * 1000
