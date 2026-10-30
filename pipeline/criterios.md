# Critérios

> Gerado pela Coleta (`uv run python -m coleta montar`, em `pipeline/`). Não edite: rode a Coleta de novo.

P5 e P95 foram calculados sobre as 120 Candidatas ao fim do Corte.

## Segurança: Homicídios por 100 mil habitantes

| Campo | Valor |
| --- | --- |
| Categoria | Segurança |
| Fonte | SIM/DataSUS, Declarações de Óbito |
| Recorte | Óbitos por agressão (CID-10 X85–Y09) e intervenção legal (Y35–Y36), por município de residência, somados de 2022 a 2024 e divididos pela soma das populações dos três anos: o Censo 2022, a média do Censo 2022 e da Estimativa 2024 para 2023, e a Estimativa 2024; sem óbito registrado, a taxa é zero |
| Edição | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 |
| Ano | 2022 a 2024 |
| Endereço | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `homicidios_por_100_mil` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `3.502110` |
| P95 | `18.212850` |
| Candidatas com dado | 120 |

## Desastres: Anos com registro de desastre

| Campo | Valor |
| --- | --- |
| Categoria | Desastres |
| Fonte | Atlas Digital de Desastres no Brasil<br>Casa Civil, municípios mais suscetíveis a deslizamentos, enxurradas e inundações<br>SGB, Setorização de Áreas de Risco Geológico |
| Recorte | Anos com ao menos um registro da família chuva (COBRADE 12100, 12200, 12300, 113xx e 13214) mais metade dos anos com registro de vento ou granizo (13111, 13112, 13211, 13212, 13213 e 13215), de 0 a 15, pela data do evento e com todos os status; 13214 conta só na chuva. `suscetivel` marca a cidade da lista da Casa Civil ou com setor de risco alto ou muito alto do SGB, que a pontuação conta como 1 ano quando ela não tem registro |
| Edição | v1.1 de 2026-08-06, eventos de 2016 a 2025<br>Anexo I da NT 1/2023 (1.942 municípios) e NT 1/2025 (153 municípios)<br>Camada Setorização de Risco, setorizações até 2026-08-18 |
| Ano | 2016 a 2025 |
| Endereço | <https://atlasdigital.mdr.gov.br/arquivos/2026/BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv><br><https://www.gov.br/casacivil/pt-br/assuntos/cadastro-de-municipios-suscetiveis-a-eventos-de-enxurradas-e-inundacoes/copy10_of_NotaTcnica01_2023_SAM_CC_PR_eAnexosIeII.pdf><br><https://www.gov.br/casacivil/pt-br/assuntos/cadastro-de-municipios-suscetiveis-a-eventos-de-enxurradas-e-inundacoes/NotaTecnica1.2025_SADJVISEPACCCeAnexoI.pdf><br><https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/FeatureServer/0/query?where=grau_risco+IN+%28%27Alto%27%2C+%27Muito+alto%27%29&outStatistics=%5B%7B%22statisticType%22%3A%22count%22%2C%22onStatisticField%22%3A%22objectid%22%2C%22outStatisticFieldName%22%3A%22setores%22%7D%2C%7B%22statisticType%22%3A%22max%22%2C%22onStatisticField%22%3A%22data_setor%22%2C%22outStatisticFieldName%22%3A%22ultima_setorizacao%22%7D%5D&groupByFieldsForStatistics=cd_geocmu&orderByFields=cd_geocmu&f=json> |
| Baixado em | 2026-10-21<br>2026-10-21<br>2026-10-21<br>2026-10-21 |
| Coluna no CSV | `anos_desastre` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `0.000000` |
| P95 | `8.500000` |
| Candidatas com dado | 120 |

## Desastres: Danos humanos da família chuva por mil habitantes

| Campo | Valor |
| --- | --- |
| Categoria | Desastres |
| Fonte | Atlas Digital de Desastres no Brasil |
| Recorte | Óbitos, desabrigados e desalojados dos registros da família chuva, pela data do evento e com todos os status, somados de 2016 a 2025 e divididos pela Estimativa da População 2026, por mil habitantes; sem registro, zero |
| Edição | v1.1 de 2026-08-06, eventos de 2016 a 2025 |
| Ano | 2016 a 2025 |
| Endereço | <https://atlasdigital.mdr.gov.br/arquivos/2026/BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `danos_chuva_por_mil` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `0.000000` |
| P95 | `46.348995` |
| Candidatas com dado | 120 |

## Saúde: Pediatras por mil crianças

| Campo | Valor |
| --- | --- |
| Categoria | Saúde |
| Fonte | CNES/DataSUS |
| Recorte | Médicos pediatras (CBO 225124) com vínculo no município na competência 2026-09, contados por CPF único dentro do município, por mil crianças de 0 a 14 anos do Censo 2022; um médico com vínculos em vários municípios conta em cada um |
| Edição | Competência 2026-09, DBC ST, LT e PF das 27 UFs |
| Ano | 2026 |
| Endereço | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFAC2609.dbc> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `pediatras_por_mil_criancas` |
| Direção | Maior |
| Transformação | Nenhuma |
| P5 | `0.691120` |
| P95 | `6.789755` |
| Candidatas com dado | 120 |

## Saúde: Esgoto por rede geral ou fossa séptica

| Campo | Valor |
| --- | --- |
| Categoria | Saúde |
| Fonte | IBGE, Censo Demográfico 2022 |
| Recorte | Percentual de moradores em domicílios particulares permanentes ocupados com esgotamento por rede geral, rede pluvial ou fossa ligada à rede, ou por fossa séptica ou fossa filtro não ligada à rede |
| Edição | Tabela 7555 do SIDRA (Censo 2022, atualizado em 2024-02-23) |
| Ano | 2022 |
| Endereço | <https://servicodados.ibge.gov.br/api/v3/agregados/7555/periodos/2022/variaveis/382?localidades=N6%5Ball%5D&classificacao=11558%5B46292%2C46290%2C72112%5D%7C58%5B95253%5D%7C86%5B95251%5D> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `esgoto_pct` |
| Direção | Maior |
| Transformação | Nenhuma |
| P5 | `68.351000` |
| P95 | `98.652500` |
| Candidatas com dado | 120 |

## Escola: IDEB dos anos iniciais do fundamental

| Campo | Valor |
| --- | --- |
| Categoria | Escola |
| Fonte | INEP, IDEB |
| Recorte | IDEB observado em 2025 da rede pública do município, dos anos iniciais do fundamental; vazio sem nota divulgada |
| Edição | IDEB 2025, resultados por município, rede pública |
| Ano | 2025 |
| Endereço | <https://download.inep.gov.br/ideb/resultados/divulgacao_anos_iniciais_municipios_2025.zip> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `ideb_anos_iniciais` |
| Direção | Maior |
| Transformação | Nenhuma |
| P5 | `5.995000` |
| P95 | `7.200000` |
| Candidatas com dado | 120 |

## Escola: IDEB dos anos finais do fundamental

| Campo | Valor |
| --- | --- |
| Categoria | Escola |
| Fonte | INEP, IDEB |
| Recorte | IDEB observado em 2025 da rede pública do município, dos anos finais do fundamental; vazio sem nota divulgada |
| Edição | IDEB 2025, resultados por município, rede pública |
| Ano | 2025 |
| Endereço | <https://download.inep.gov.br/ideb/resultados/divulgacao_anos_finais_municipios_2025.zip> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `ideb_anos_finais` |
| Direção | Maior |
| Transformação | Nenhuma |
| P5 | `4.800000` |
| P95 | `6.000000` |
| Candidatas com dado | 120 |

## Escola: IDEB do ensino médio

| Campo | Valor |
| --- | --- |
| Categoria | Escola |
| Fonte | INEP, IDEB |
| Recorte | IDEB observado em 2025 da rede pública do município, do ensino médio; vazio sem nota divulgada |
| Edição | IDEB 2025, resultados por município, rede pública |
| Ano | 2025 |
| Endereço | <https://download.inep.gov.br/ideb/resultados/divulgacao_ensino_medio_municipios_2025.zip> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `ideb_ensino_medio` |
| Direção | Maior |
| Transformação | Nenhuma |
| P5 | `4.100000` |
| P95 | `5.200000` |
| Candidatas com dado | 120 |

## Clima: Umidade relativa média anual

| Campo | Valor |
| --- | --- |
| Categoria | Clima |
| Fonte | BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira |
| Recorte | Média da umidade relativa diária de 1991 a 2020, no pixel de 0,1° que contém a sede, sem interpolação; a sede sobre pixel sem dado usa o pixel válido mais próximo |
| Edição | Versão 3.2.4 da grade diária de 0,1°, série até 2025; 60 sedes caem em pixel sem dado e usam o pixel válido mais próximo |
| Ano | 1991 a 2020 |
| Endereço | <https://drive.google.com/file/d/1aGdOHRT10W8oBWvE5IvmEAqJCNQOYYid/view> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `umidade_relativa` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `69.695000` |
| P95 | `81.605000` |
| Candidatas com dado | 120 |

## Clima: Ponto de orvalho médio de dezembro a fevereiro

| Campo | Valor |
| --- | --- |
| Categoria | Clima |
| Fonte | BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira |
| Recorte | Média, nos dias de dezembro a fevereiro de 1991 a 2020, do ponto de orvalho diário pela fórmula de Magnus, Td = b·γ / (a − γ) com γ = ln(UR / 100) + a·T / (b + T), a = 17,625 e b = 243,04 °C (Alduchov e Eskridge 1996), T = (Tmax + Tmin) / 2 e UR a umidade relativa do dia, em °C, no pixel de 0,1° que contém a sede, sem interpolação; a sede sobre pixel sem dado usa o pixel válido mais próximo |
| Edição | Versão 3.2.4 da grade diária de 0,1°, série até 2025; 60 sedes caem em pixel sem dado e usam o pixel válido mais próximo |
| Ano | 1991 a 2020 |
| Endereço | <https://drive.google.com/file/d/1aGdOHRT10W8oBWvE5IvmEAqJCNQOYYid/view><br><https://drive.google.com/file/d/1oQWHpXwFgTKNH4Fa2GwCPJ3QN1AMgNPJ/view> |
| Baixado em | 2026-10-21<br>2026-10-21 |
| Coluna no CSV | `orvalho_dez_fev` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `17.095000` |
| P95 | `19.800000` |
| Candidatas com dado | 120 |

## Clima: Dias com chuva de 1 mm ou mais por ano

| Campo | Valor |
| --- | --- |
| Categoria | Clima |
| Fonte | BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira |
| Recorte | Dias com precipitação de 1 mm ou mais, de 1991 a 2020, divididos pelo número de anos, no pixel de 0,1° que contém a sede, sem interpolação; a sede sobre pixel sem dado usa o pixel válido mais próximo; a grade interpolada conta mais dias que as estações, porque espalha a garoa entre as células (na validação, 39 dias por ano acima das Normais 1991–2020 do INMET, em média), e o critério compara as cidades na mesma grade |
| Edição | Versão 3.2.4 da grade diária de 0,1°, série até 2025; 60 sedes caem em pixel sem dado e usam o pixel válido mais próximo |
| Ano | 1991 a 2020 |
| Endereço | <https://drive.google.com/file/d/1oQWHpXwFgTKNH4Fa2GwCPJ3QN1AMgNPJ/view> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `dias_de_chuva` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `113.895000` |
| P95 | `158.255000` |
| Candidatas com dado | 120 |

## Clima: Temperatura do mês mais quente

| Campo | Valor |
| --- | --- |
| Categoria | Clima |
| Fonte | BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira |
| Recorte | Maior das 12 médias mensais da temperatura média diária, (Tmax + Tmin) / 2, de 1991 a 2020, em °C, no pixel de 0,1° que contém a sede, sem interpolação; a sede sobre pixel sem dado usa o pixel válido mais próximo |
| Edição | Versão 3.2.4 da grade diária de 0,1°, série até 2025; 60 sedes caem em pixel sem dado e usam o pixel válido mais próximo |
| Ano | 1991 a 2020 |
| Endereço | <https://drive.google.com/file/d/1oQWHpXwFgTKNH4Fa2GwCPJ3QN1AMgNPJ/view> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `temp_mes_mais_quente` |
| Direção | Menor |
| Transformação | Nenhuma |
| P5 | `21.500000` |
| P95 | `24.500000` |
| Candidatas com dado | 120 |

## Porte: População

| Campo | Valor |
| --- | --- |
| Categoria | Porte |
| Fonte | IBGE, Estimativas da População |
| Recorte | População residente estimada em 1º de julho, por município |
| Edição | Tabela 6579 do SIDRA (2024 atualizado em 2024-12-30, 2026 atualizado em 2026-08-28) |
| Ano | 2026 |
| Endereço | <https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2026/variaveis/9324?localidades=N6%5Ball%5D> |
| Baixado em | 2026-10-21 |
| Coluna no CSV | `populacao_2026` |
| Direção | Maior |
| Transformação | Logaritmo natural antes do min-max |
| P5 | `10.598595` (logaritmo de 40.078) |
| P95 | `13.544446` (logaritmo de 762.567) |
| Candidatas com dado | 120 |

## Relevo: Altitude

| Campo | Valor |
| --- | --- |
| Fonte | ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul |
| Recorte | Altitude do pixel ANADEM de 30 m que contém a sede; sem dado, usa o pixel válido mais próximo, sem interpolação |
| Edição | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 |
| Coluna no CSV | `altitude` |
| Unidade | m |
| Uso no app | Só Restrição; não pontua, sem direção, transformação nem P5/P95 |

## Relevo: Declividade urbana

| Campo | Valor |
| --- | --- |
| Fonte | ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul<br>IBGE, Malhas de municípios, distritos e setores censitários do Censo 2022 |
| Recorte | Média da declividade dos pixels nos setores urbanos (CD_SIT 1, 2 ou 3) do distrito que contém a sede, Censo 2022 |
| Edição | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022<br>Malha Municipal 2022 e malhas definitivas de distritos e setores do Censo 2022 |
| Coluna no CSV | `declividade_urbana` |
| Unidade | % |
| Uso no app | Só Restrição; não pontua, sem direção, transformação nem P5/P95 |

## Relevo: Classe de relevo

| Campo | Valor |
| --- | --- |
| Fonte | ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul<br>IBGE, Malhas de municípios, distritos e setores censitários do Censo 2022 |
| Recorte | Classe Embrapa de maior área no território municipal: 0–3%, 3–8%, 8–20%, 20–45%, 45–75%, acima de 75%; empate pela mais plana |
| Edição | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022<br>Malha Municipal 2022 e malhas definitivas de distritos e setores do Censo 2022 |
| Coluna no CSV | `classe_relevo` |
| Unidade | Classe |
| Uso no app | Só Restrição; não pontua, sem direção, transformação nem P5/P95 |

## Fontes

Todos os arquivos baixados nesta Coleta, com a edição de cada fonte.

| Fonte | Edição | Arquivo | Endereço | Baixado em |
| --- | --- | --- | --- | --- |
| IBGE, Localidades do Brasil 2022 | Localidades do Brasil 2022, GeoPackage | `Localidades_Brasil_gpkg.zip` | <https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_Brasil_gpkg.zip> | 2026-10-21 |
| IBGE, Estimativas da População | Tabela 6579 do SIDRA (2024 atualizado em 2024-12-30, 2026 atualizado em 2026-08-28) | `periodos.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos> | 2026-10-21 |
| IBGE, Estimativas da População | Tabela 6579 do SIDRA (2024 atualizado em 2024-12-30, 2026 atualizado em 2026-08-28) | `populacao-2024.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2024/variaveis/9324?localidades=N6%5Ball%5D> | 2026-10-21 |
| IBGE, Estimativas da População | Tabela 6579 do SIDRA (2024 atualizado em 2024-12-30, 2026 atualizado em 2026-08-28) | `populacao-2026.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2026/variaveis/9324?localidades=N6%5Ball%5D> | 2026-10-21 |
| Anatel, acessos de banda larga fixa | Os 12 meses mais recentes do arquivo, de 2025-09 a 2026-08 | `acessos_banda_larga_fixa.zip` | <https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa.zip> | 2026-10-21 |
| IBGE, Censo Demográfico 2022 | Tabela 7555 do SIDRA (Censo 2022, atualizado em 2024-02-23) | `periodos.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/7555/periodos> | 2026-10-21 |
| IBGE, Censo Demográfico 2022 | Tabela 7555 do SIDRA (Censo 2022, atualizado em 2024-02-23) | `moradores-por-esgotamento.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/7555/periodos/2022/variaveis/382?localidades=N6%5Ball%5D&classificacao=11558%5B46292%2C46290%2C72112%5D%7C58%5B95253%5D%7C86%5B95251%5D> | 2026-10-21 |
| INEP, IDEB | IDEB 2025, resultados por município, rede pública | `divulgacao_anos_iniciais_municipios_2025.zip` | <https://download.inep.gov.br/ideb/resultados/divulgacao_anos_iniciais_municipios_2025.zip> | 2026-10-21 |
| INEP, IDEB | IDEB 2025, resultados por município, rede pública | `divulgacao_anos_finais_municipios_2025.zip` | <https://download.inep.gov.br/ideb/resultados/divulgacao_anos_finais_municipios_2025.zip> | 2026-10-21 |
| INEP, IDEB | IDEB 2025, resultados por município, rede pública | `divulgacao_ensino_medio_municipios_2025.zip` | <https://download.inep.gov.br/ideb/resultados/divulgacao_ensino_medio_municipios_2025.zip> | 2026-10-21 |
| IBGE, Censo 2022, crianças de 0 a 14 anos | Tabela 9514 do SIDRA (2022 atualizado em 2023-12-22) | `periodos.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/9514/periodos> | 2026-10-21 |
| IBGE, Censo 2022, crianças de 0 a 14 anos | Tabela 9514 do SIDRA (2022 atualizado em 2023-12-22) | `criancas-0-a-14.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/9514/periodos/2022/variaveis/93?localidades=N6%5Ball%5D&classificacao=287%5B93070,93084,93085%5D%7C2%5B6794%5D%7C286%5B113635%5D> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STAC2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STAC2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STAL2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STAL2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STAM2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STAM2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STAP2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STAP2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STBA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STBA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STCE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STCE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STDF2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STDF2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STES2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STES2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STGO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STGO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STMA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STMA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STMG2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STMG2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STMS2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STMS2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STMT2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STMT2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STPA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STPA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STPB2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STPB2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STPE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STPE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STPI2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STPI2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STPR2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STPR2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STRJ2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STRJ2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STRN2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STRN2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STRO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STRO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STRR2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STRR2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STRS2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STRS2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STSC2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STSC2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STSE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STSE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STSP2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STSP2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `STTO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STTO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTAC2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTAC2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTAL2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTAL2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTAM2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTAM2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTAP2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTAP2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTBA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTBA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTCE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTCE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTDF2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTDF2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTES2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTES2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTGO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTGO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTMA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTMA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTMG2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTMG2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTMS2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTMS2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTMT2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTMT2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTPA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTPA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTPB2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTPB2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTPE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTPE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTPI2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTPI2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTPR2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTPR2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTRJ2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTRJ2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTRN2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTRN2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTRO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTRO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTRR2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTRR2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTRS2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTRS2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTSC2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTSC2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTSE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTSE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTSP2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTSP2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `LTTO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT/LTTO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFAC2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFAC2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFAL2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFAL2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFAM2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFAM2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFAP2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFAP2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFBA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFBA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFCE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFCE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFDF2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFDF2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFES2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFES2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFGO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFGO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFMA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFMA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFMG2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFMG2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFMS2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFMS2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFMT2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFMT2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFPA2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFPA2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFPB2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFPB2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFPE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFPE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFPI2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFPI2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFPR2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFPR2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFRJ2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFRJ2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFRN2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFRN2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFRO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFRO2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFRR2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFRR2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFRS2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFRS2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFSC2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFSC2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFSE2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFSE2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFSP2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFSP2609.dbc> | 2026-10-21 |
| CNES/DataSUS | Competência 2026-09, DBC ST, LT e PF das 27 UFs | `PFTO2609.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/PF/PFTO2609.dbc> | 2026-10-21 |
| IBGE, Censo Demográfico 2022: população residente | Tabela 4709 do SIDRA (2022 atualizado em 2023-12-22) | `periodos.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/4709/periodos> | 2026-10-21 |
| IBGE, Censo Demográfico 2022: população residente | Tabela 4709 do SIDRA (2022 atualizado em 2023-12-22) | `populacao-2022.json` | <https://servicodados.ibge.gov.br/api/v3/agregados/4709/periodos/2022/variaveis/93?localidades=N6%5Ball%5D> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `dores.txt` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `municipios.json` | <https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAC2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAC2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAL2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAL2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAM2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAM2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAP2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAP2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOBA2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOBA2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOCE2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOCE2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DODF2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DODF2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOES2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOES2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOGO2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOGO2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMA2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMA2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMG2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMG2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMS2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMS2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMT2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMT2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPA2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPA2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPB2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPB2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPE2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPE2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPI2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPI2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPR2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPR2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORJ2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORJ2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORN2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORN2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORO2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORO2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORR2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORR2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORS2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORS2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSC2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSC2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSE2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSE2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSP2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSP2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOTO2022.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOTO2022.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAC2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAC2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAL2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAL2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAM2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAM2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAP2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAP2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOBA2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOBA2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOCE2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOCE2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DODF2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DODF2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOES2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOES2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOGO2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOGO2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMA2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMA2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMG2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMG2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMS2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMS2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMT2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMT2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPA2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPA2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPB2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPB2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPE2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPE2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPI2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPI2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPR2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPR2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORJ2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORJ2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORN2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORN2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORO2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORO2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORR2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORR2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORS2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORS2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSC2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSC2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSE2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSE2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSP2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSP2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOTO2023.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOTO2023.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAC2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAC2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAL2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAL2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAM2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAM2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOAP2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOAP2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOBA2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOBA2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOCE2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOCE2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DODF2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DODF2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOES2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOES2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOGO2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOGO2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMA2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMA2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMG2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMG2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMS2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMS2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOMT2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOMT2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPA2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPA2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPB2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPB2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPE2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPE2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPI2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPI2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOPR2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOPR2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORJ2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORJ2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORN2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORN2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORO2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORO2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORR2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORR2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DORS2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DORS2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSC2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSC2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSE2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSE2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOSP2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOSP2024.dbc> | 2026-10-21 |
| SIM/DataSUS, Declarações de Óbito | DORES (definitivo) de 2022 a 2024, arquivos publicados de 2023-12-21 a 2025-12-23 | `DOTO2024.dbc` | <ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/DORES/DOTO2024.dbc> | 2026-10-21 |
| Casa Civil, municípios mais suscetíveis a deslizamentos, enxurradas e inundações | Anexo I da NT 1/2023 (1.942 municípios) e NT 1/2025 (153 municípios) | `nota-tecnica-1-2023.pdf` | <https://www.gov.br/casacivil/pt-br/assuntos/cadastro-de-municipios-suscetiveis-a-eventos-de-enxurradas-e-inundacoes/copy10_of_NotaTcnica01_2023_SAM_CC_PR_eAnexosIeII.pdf> | 2026-10-21 |
| Casa Civil, municípios mais suscetíveis a deslizamentos, enxurradas e inundações | Anexo I da NT 1/2023 (1.942 municípios) e NT 1/2025 (153 municípios) | `nota-tecnica-1-2025.pdf` | <https://www.gov.br/casacivil/pt-br/assuntos/cadastro-de-municipios-suscetiveis-a-eventos-de-enxurradas-e-inundacoes/NotaTecnica1.2025_SADJVISEPACCCeAnexoI.pdf> | 2026-10-21 |
| SGB, Setorização de Áreas de Risco Geológico | Camada Setorização de Risco, setorizações até 2026-08-18 | `setores-risco-alto-por-municipio.json` | <https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/FeatureServer/0/query?where=grau_risco+IN+%28%27Alto%27%2C+%27Muito+alto%27%29&outStatistics=%5B%7B%22statisticType%22%3A%22count%22%2C%22onStatisticField%22%3A%22objectid%22%2C%22outStatisticFieldName%22%3A%22setores%22%7D%2C%7B%22statisticType%22%3A%22max%22%2C%22onStatisticField%22%3A%22data_setor%22%2C%22outStatisticFieldName%22%3A%22ultima_setorizacao%22%7D%5D&groupByFieldsForStatistics=cd_geocmu&orderByFields=cd_geocmu&f=json> | 2026-10-21 |
| Atlas Digital de Desastres no Brasil | v1.1 de 2026-08-06, eventos de 2016 a 2025 | `BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv` | <https://atlasdigital.mdr.gov.br/arquivos/2026/BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv> | 2026-10-21 |
| BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira | Versão 3.2.4 da grade diária de 0,1°, série até 2025; 60 sedes caem em pixel sem dado e usam o pixel válido mais próximo | `pr_Tmax_Tmin_NetCDF_Files.zip` | <https://drive.google.com/file/d/1oQWHpXwFgTKNH4Fa2GwCPJ3QN1AMgNPJ/view> | 2026-10-21 |
| BR-DWGD, Xavier et al. 2022, grade meteorológica diária brasileira | Versão 3.2.4 da grade diária de 0,1°, série até 2025; 60 sedes caem em pixel sem dado e usam o pixel válido mais próximo | `ETo_u2_RH_Rs_NetCDF_Files.zip` | <https://drive.google.com/file/d/1aGdOHRT10W8oBWvE5IvmEAqJCNQOYYid/view> | 2026-10-21 |
| Beck et al. 2023, High-resolution (1 km) Köppen-Geiger maps for 1901–2099 | Figshare 21789074 v2, GeoTIFF de 1991–2020 a 30″ (cerca de 1 km) | `koppen_geiger_tif.zip` | <https://ndownloader.figshare.com/files/61012822> | 2026-10-21 |
| Alvares et al. 2013, Köppen's climate classification map for Brazil | Planilha por município da malha de 2007, classe de maior área | `Koppen_Brazil_2013.rar` | <https://www.ipef.br/geodatabase/Koppen_Brazil_2013.rar> | 2026-10-21 |
| IBGE, Malhas de municípios, distritos e setores censitários do Censo 2022 | Malha Municipal 2022 e malhas definitivas de distritos e setores do Censo 2022 | `BR_Municipios_2022.zip` | <https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/Brasil/BR/BR_Municipios_2022.zip> | 2026-10-30 |
| IBGE, Malhas de municípios, distritos e setores censitários do Censo 2022 | Malha Municipal 2022 e malhas definitivas de distritos e setores do Censo 2022 | `BR_distritos_CD2022.gpkg` | <https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/distritos/gpkg/BR/BR_distritos_CD2022.gpkg> | 2026-10-30 |
| IBGE, Malhas de municípios, distritos e setores censitários do Censo 2022 | Malha Municipal 2022 e malhas definitivas de distritos e setores do Censo 2022 | `BR_setores_CD2022.gpkg` | <https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/gpkg/BR/BR_setores_CD2022.gpkg> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_18L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_18L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_18M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_18M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_19L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_19L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_19M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_19M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_19N.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_19N.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_20K.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_20K.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_20L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_20L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_20M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_20M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_20N.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_20N.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_21H.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_21H.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_21J.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_21J.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_21K.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_21K.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_21L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_21L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_21M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_21M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_21N.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_21N.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_22H.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_22H.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_22J.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_22J.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_22K.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_22K.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_22L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_22L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_22M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_22M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_22N.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_22N.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_23J.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_23J.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_23K.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_23K.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_23L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_23L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_23M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_23M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_24K.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_24K.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_24L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_24L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_24M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_24M.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_25L.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_25L.tif> | 2026-10-30 |
| ANA e UFRGS, ANADEM: modelo digital do terreno da América do Sul | ANADEM v1.0 (2024), 30 m; malhas IBGE do Censo 2022 | `anadem_v1_25M.tif` | <https://metadados.snirh.gov.br/files/anadem_v1_tiles/anadem_v1_25M.tif> | 2026-10-30 |
