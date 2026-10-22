from types import ModuleType

from coleta.fontes import anatel, atlas_desastres, casa_civil, cnes, ibge_censo_criancas, ibge_censo_esgoto, ibge_censo_populacao, ibge_estimativas, ibge_localidades, inep_ideb, sgb, sim
from coleta.fontes import br_dwgd
from coleta.fontes import alvares, beck

BASE = ibge_localidades.NAME

SOURCES: dict[str, ModuleType] = {
    module.NAME: module
    for module in (ibge_localidades, ibge_estimativas, anatel, ibge_censo_esgoto, inep_ideb, ibge_censo_criancas, cnes, ibge_censo_populacao, sim, casa_civil, sgb, atlas_desastres, br_dwgd, beck, alvares)
}
