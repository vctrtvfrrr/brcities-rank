import argparse
import sys
from datetime import date
from types import ModuleType

from coleta import EXTRACTED_DIR, PIPELINE_DIR, SOURCES_DIR, extraidos, registro, validacao
from coleta.corte import RESTRICTIONS, run_cut
from coleta.criterios import CRITERIA, freeze
from coleta.fontes import BASE, SOURCES
from coleta.fontes.base import missing_files, provenance


def baixar(names: list[str]) -> int:
    missing = []
    for source in _select(names):
        print(f"{source.NAME}: baixando")
        missing += [(source.NAME, remote) for remote in source.download(SOURCES_DIR / source.NAME)]
    if not missing:
        return 0
    print("\nFaltam arquivos de download manual. Baixe cada um no caminho indicado e rode de novo:")
    for name, remote in missing:
        print(f"- {SOURCES_DIR / name / remote.name}\n  de {remote.url}")
    return 1


def extrair(names: list[str]) -> int:
    for source in _select(names):
        folder = SOURCES_DIR / source.NAME
        if absent := missing_files(folder, source.FILES):
            print(f"{source.NAME}: faltam {', '.join(remote.name for remote in absent)}; rode baixar antes")
            return 1
        extraction = source.extract(folder)
        extraidos.write(EXTRACTED_DIR, source.NAME, source.TITLE, extraction, provenance(folder, source.FILES))
        print(f"{source.NAME}: {len(extraction.rows)} municípios extraídos")
    return 0


def montar() -> int:
    if absent := [name for name in SOURCES if not extraidos.exists(EXTRACTED_DIR, name)]:
        print(f"Faltam extraídos de {', '.join(absent)}; rode extrair antes")
        return 1
    sources = [extraidos.read(EXTRACTED_DIR, name) for name in SOURCES]
    base = next(source for source in sources if source.name == BASE)
    municipalities = extraidos.merge(base, [source for source in sources if source is not base])
    for module in SOURCES.values():
        if derive := getattr(module, "derive", None):
            for row in municipalities.values():
                row.update(derive(row))
    result = run_cut(municipalities, RESTRICTIONS)
    candidates = [municipalities[code] for code in result.candidates]
    bounds = {criterion.column: freeze(criterion, candidates) for criterion in CRITERIA}
    registro.write(PIPELINE_DIR, municipalities, RESTRICTIONS, result, CRITERIA, bounds, sources, date.today())
    print(f"{len(municipalities)} municípios, {len(candidates)} Candidatas")
    return 0


def validar() -> int:
    if not validacao.RECORD.exists():
        print("Falta dados/municipios.csv; rode montar antes")
        return 1
    print(f"Relatório em {validacao.run()}")
    return 0


def _select(names: list[str]) -> list[ModuleType]:
    unknown = [name for name in names if name not in SOURCES]
    if unknown:
        raise SystemExit(f"Fonte desconhecida: {', '.join(unknown)}. Fontes: {', '.join(SOURCES)}")
    return [SOURCES[name] for name in names] if names else list(SOURCES.values())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m coleta", description="Coleta dos dados municipais do BRCities Rank.")
    commands = parser.add_subparsers(dest="command", required=True)
    for name, summary in (
        ("baixar", "baixa o que tem link e lista o que falta à mão"),
        ("extrair", "lê fontes/<fonte>/ e escreve fontes/extraidos/<fonte>.csv"),
    ):
        command = commands.add_parser(name, help=summary)
        command.add_argument("fontes", nargs="*", metavar="fonte", help=f"uma de: {', '.join(SOURCES)}")
    commands.add_parser("montar", help="junta os extraídos, roda o Corte, calcula P5/P95 e escreve o registro e o dataset do app")
    commands.add_parser("validar", help="relatório de conferência, fora do Git")
    arguments = parser.parse_args(argv)
    match arguments.command:
        case "baixar":
            return baixar(arguments.fontes)
        case "extrair":
            return extrair(arguments.fontes)
        case "montar":
            return montar()
        case "validar":
            return validar()


if __name__ == "__main__":
    sys.exit(main())
