# Metodologia da Coleta

> Como o pipeline levanta, por município, os valores que o app usa: critérios, restrições de referência, normalização e fontes. A edição efetivamente usada em cada Coleta está em [`criterios.md`](criterios.md). O vocabulário do app está no [`GLOSSARY.md`](../GLOSSARY.md), e as regras do app, no [PRD: BRCities Rank](https://git.codelab.tec.br/vctrtvfrrr/brcities-rank/issues/16).

## Glossário

- **Coleta:** o levantamento dos dados dos 5.570 municípios, nas edições das fontes vigentes numa data. É uma foto.
- **Corte de referência:** a aplicação das restrições de referência, uma depois da outra, que tira da lista as cidades que não atingem o limite de cada uma.
- **Candidata:** cidade que passou no Corte de referência.
- **Restrição:** condição com um limite que corta a cidade no Corte de referência, sem peso nem graduação.
- **A conferir:** marca da cidade que passou por uma restrição de referência sem que o dado decidisse (falta o dado ou ausente na base).
- **Categoria:** tema que agrupa critérios e recebe um peso. Pontua e nunca corta.
- **Critério:** uma medida dentro de uma Categoria, com direção (maior ou menor, melhor), tirada de um indicador de fonte pública.

## Restrições de referência

O pipeline aplica um conjunto fixo de restrições e registra o resultado no [`corte.md`](corte.md), como artefato próprio, sem vínculo com o app. A ordem não muda quem sobra; ela muda qual restrição fica registrada como motivo da saída. Os limites são inclusivos.

| Ordem | Restrição | Passa quando | Fonte |
| --- | --- | --- | --- |
| 1 | População | Tem 35 mil habitantes ou mais. | IBGE, Estimativas da População 2026 |
| 2 | Clima | A classe Köppen no ponto da sede é Cwb, Cwc, Cfb, Cfc, Csb ou Csc: só os climas de verão ameno. As demais classes cortam, Cfa inclusive. | Beck et al. 2023 (1991–2020) e Alvares et al. 2013 |
| 3 | Homicídios | Tem taxa de até 20 por 100 mil habitantes, na média de 2022 a 2024 (os óbitos dos três anos sobre a soma das populações dos três anos), com os óbitos atribuídos ao município de residência da vítima. | SIM/DataSUS, com o Censo 2022 e as Estimativas da População 2024 do IBGE |
| 4 | Hospital | Tem ao menos um hospital geral com leito de internação no próprio município. | CNES/DataSUS |
| 5 | Internet | Tem ao menos uma empresa com acesso de fibra declarado no município, em qualquer um dos 12 meses mais recentes. | Anatel, acessos de banda larga fixa |

**Quando o dado não decide a restrição:**

- **Clima:** corta só quando as duas fontes cortam. Se Beck e Alvares divergem, a cidade passa como empate, sem marca: o calor do verão pontua no critério Temperatura do mês mais quente. Um município ausente da planilha de Alvares (criado depois da malha de 2007) fica só com Beck.
- **Hospital e internet:** a cidade que não aparece na base passa A conferir (ausente na base), porque a declaração ao CNES e à Anatel é irregular.
- **Qualquer restrição sem dado** passa A conferir (falta o dado).

O app não segue essas duas regras: nele, o dado ausente corta, e o município ausente do CNES ou da Anatel vale "não". Por isso a Coleta grava hospital e fibra só como sim, não ou vazio no dataset do app ([PRD: BRCities Rank](https://git.codelab.tec.br/vctrtvfrrr/brcities-rank/issues/16)).

## Categorias objetivas

Seis Categorias, treze critérios. Os critérios só pontuam.

| Categoria | Critério | Fonte e recorte | Direção |
| --- | --- | --- | --- |
| Segurança | Homicídios por 100 mil habitantes, município de residência, média de 2022 a 2024: a mesma taxa da restrição | SIM/DataSUS | Menor |
| Desastres | Anos de 2016 a 2025 com ao menos um registro da família chuva, mais metade dos anos com registro de vento ou granizo (0 a 15) | Atlas Digital de Desastres v1.1, registros e reconhecidos | Menor |
| Desastres | Óbitos, desabrigados e desalojados da família chuva de 2016 a 2025, por mil habitantes | Idem, com a população das Estimativas do IBGE | Menor |
| Saúde | Pediatras com vínculo no município, contados por CPF único, por mil crianças de 0 a 14 anos | CNES, competência mais recente; crianças do Censo 2022 | Maior |
| Saúde | Percentual de moradores com esgoto por rede geral ou fossa séptica | IBGE, Censo 2022 | Maior |
| Escola | IDEB dos anos iniciais do fundamental | INEP, IDEB 2025, rede pública do município | Maior |
| Escola | IDEB dos anos finais do fundamental | Idem | Maior |
| Escola | IDEB do ensino médio | Idem | Maior |
| Clima | Umidade relativa média anual | BR-DWGD, normal de 1991–2020 no ponto da sede | Menor |
| Clima | Ponto de orvalho médio de dezembro a fevereiro, a medida do abafamento do verão | BR-DWGD, 1991–2020, calculado das temperaturas e da umidade diárias no ponto da sede | Menor |
| Clima | Dias com chuva de 1 mm ou mais por ano | BR-DWGD, 1991–2020, no ponto da sede | Menor |
| Clima | Temperatura do mês mais quente | BR-DWGD, maior das 12 médias mensais de (Tmax+Tmin)/2, normal de 1991–2020 no ponto da sede | Menor |
| Porte | População | IBGE, Estimativas da População 2026 | Maior |

**Clima.** Beck e Alvares divergem porque o primeiro é de 1991–2020 no ponto da sede e o segundo de 1950–1990 pela classe de maior área do município: Alvares tende a verão ameno e Beck a mais quente, em boa parte por aquecimento entre os períodos. A divergência não corta nem marca: é um empate que a Temperatura do mês mais quente desfaz de forma contínua. Ela continua visível em `koppen_beck`, `koppen_alvares` e na tabela do [`corte.md`](corte.md). O critério mede o calor do verão, inclusive o seco, e se sobrepõe em parte ao ponto de orvalho de dezembro a fevereiro, que mede o abafamento. A grade de 0,1° pode errar a temperatura de cidade de serra, e isso custa só uma nota de critério.

**Desastres.** A família chuva reúne inundação (12100), enxurrada (12200), alagamento (12300), movimentos de massa (113xx) e chuvas intensas (13214), pela COBRADE. Vento e granizo são 13111, 13112, 13211, 13212, 13213 e 13215; as chuvas intensas (13214) contam uma vez, só na família chuva. Estiagem, seca, incêndio florestal, doenças e desastres tecnológicos ficam de fora. Contar anos com registro, e não registros, neutraliza decretos renovados e formulários duplicados; contar todos os status evita o viés político do reconhecimento federal.

**Fora das Categorias objetivas:** custo de moradia e de vida (sem dado municipal completo; cabe numa categoria subjetiva), roubo, furto e outros crimes (sem série municipal confiável; cabem na sensação de segurança), qualidade da escola privada e confessional (sem dado municipal) e leitos e UTI (o hospital só filtra). Foram considerados e descartados inverno rigoroso, IPS Brasil, crescimento populacional, oferta de escola privada, rendimento domiciliar como proxy de custo e estiagem.

## Normalização

**Min-max aparado.** Cada indicador é aparado no 5º e no 95º percentil das Candidatas do Corte de referência, no [`criterios.md`](criterios.md), e esticado de 0 a 100, invertido nos critérios em que menor é melhor: o valor no P5 ou além dele vale 100 (ou 0), o do P95 ou além vale 0 (ou 100), e entre eles a nota é linear. O app não usa essa normalização: nele a nota vem da Régua do Critério, com as pontas nos limites das Restrições do visitante ou nos percentis de todos os municípios do Brasil (ver o [`GLOSSARY.md`](../GLOSSARY.md)).

- **População:** passa por logaritmo antes do min-max, de modo que cada vez que ela dobra a nota sobe o mesmo tanto.
- **Desastres:** a Candidata sem nenhum registro, mas presente na lista de municípios suscetíveis da Casa Civil ou com setor de risco alto ou muito alto do SGB, conta no critério de anos como se tivesse 1 ano com registro da família chuva. Os danos humanos dela continuam zero.
- **Critério sem variação** (P5 igual a P95): todas as Candidatas valem 100 nele. Na Régua do app vale o mesmo quando as duas pontas coincidem.

**Anos das fontes.** Cada critério usa a edição vigente da sua fonte na data da Coleta, com o ano registrado, sem alinhar anos entre critérios: a normalização compara cidades dentro do mesmo critério.

## Fontes

Levantadas em 2026-10-20. O endereço de cada uma é o ponto de partida da Coleta; [`criterios.md`](criterios.md) registra a edição efetivamente usada.

### Ponto de cada município

- **IBGE, Localidades do Brasil 2022** (GeoPackage, Shapefile ou KML em <https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/>). Filtrando `CT_LOCALIDADE = 'Cidade'` e deduplicando por `CD_MUN` saem os 5.570 municípios; as capitais aparecem duas vezes. É o ponto da sede, a área urbana: é nele que se amostra o clima e que fica o marcador do mapa.

### População

- **IBGE, Estimativas da População 2026** (SIDRA, tabela 6579: <https://sidra.ibge.gov.br/tabela/6579>; API de agregados: <https://servicodados.ibge.gov.br/api/docs/agregados?versao=3>). População em 1º de julho, anual. É estimativa, não contagem.
- **IBGE, Censo 2022** (<https://censo2022.ibge.gov.br/>, SIDRA): a população residente, para o denominador dos homicídios; crianças de 0 a 14 anos para a razão de pediatras; e esgotamento sanitário.

### Clima

- **Beck et al. 2023**, "High-resolution (1 km) Köppen-Geiger maps for 1901–2099", *Scientific Data* 10:724 (GeoTIFF `koppen_geiger_tif.zip` em <https://www.gloh2o.org/koppen> e no [Figshare](https://figshare.com/articles/dataset/High-resolution_1_km_K_ppen-Geiger_maps_for_1901_2099_based_on_constrained_CMIP6_projections/21789074)). Usar o período 1991–2020, amostrado no ponto da sede. Global, não calibrado para o Brasil.
- **Alvares et al. 2013**, "Köppen's climate classification map for Brazil", *Meteorologische Zeitschrift* 22(6) (RAR com `Koppen Brazilian municipalities.xls` em <https://www.ipef.br/geodatabase/>). Classe por município, períodos de 1950–1990, malha de 2007 (faltam os municípios criados depois). Serve para conferir o Köppen de Beck.
- **BR-DWGD**, Xavier et al. 2022, grade diária brasileira a 0,1° (NetCDF e script de extração por município em <https://github.com/AlexandreCandidoXavier/BR-DWGD>; também no Earth Engine). A versão 3.2.4 (abril de 2026) traz chuva, temperatura e umidade até 2025, por isso os quatro critérios usam a normal de 1991–2020. As normais são calculadas no ponto da sede. Alternativa pronta, se o processamento pesar: a climatologia 1991–2020 do TerraClimate (<https://www.climatologylab.org/terraclimate.html>), com a umidade calculada da pressão de vapor.
- **INMET, Normais 1991–2020** (<https://portal.inmet.gov.br/normais>): só 267 estações. Servem para validar as normais calculadas. Na validação da Coleta, a umidade e o orvalho da grade ficaram perto das estações (diferença média absoluta de 2,4 pontos e de 0,5 °C), mas os dias de chuva ficaram 39 por ano acima, em média (de +14 a +42 nas Candidatas com estação), porque a interpolação do BR-DWGD espalha a garoa entre as células. Na temperatura do mês mais quente, 107 pares de estação e grade mostraram a grade em média 0,7 °C acima das estações, com diferença máxima de 1,8 °C (Guaramiranga), nenhuma acima da tolerância de 2,0 °C. O critério fica com a grade, que mede todas as cidades com a mesma régua.

### Segurança

- **SIM/DataSUS** (TabNet: <http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/ext10br.def>; arquivos DBC: <https://datasus.saude.gov.br/transferencia-de-arquivos/>). Óbitos por agressão (CID-10 X85–Y09) e intervenção legal (Y35–Y36), por município de residência, de 2022 a 2024, todos definitivos. A taxa por 100 mil soma os óbitos dos três anos e os divide pela soma das populações dos três anos, para amortecer a oscilação dos municípios pequenos. O IBGE não publicou Estimativa para 2022 nem para 2023: 2022 é o Censo 2022, 2024 é a Estimativa 2024, e 2023 é a média dos dois. Um município sem óbito registrado tem taxa zero. Só mortes; o Atlas da Violência (<https://www.ipea.gov.br/atlasviolencia/>) deriva do SIM e serve de conferência.

### Saúde

- **CNES/DataSUS** (TabNet e arquivos DBC no mesmo endereço do SIM; ST = estabelecimentos, LT = leitos, PF = profissionais). Hospital geral com leito de internação para a restrição; pediatras por CPF único para o critério, porque um médico com vínculos em vários municípios aparece em todos. Cadastro declaratório e irregular: a ausência na base passa A conferir no Corte de referência.

### Escola

- **INEP, IDEB 2025** (<https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb/resultados>): planilhas por município, anos iniciais, anos finais e ensino médio, rede pública. Não mede a rede privada.

### Internet

- **Anatel, acessos de banda larga fixa** (ZIP de CSV em <https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa.zip>; painel em <https://informacoes.anatel.gov.br/paineis/acessos/banda-larga-fixa>). Acessos por município, empresa e tecnologia, mensal. Conta assinaturas, não cobertura nem velocidade, e os pequenos provedores declaram de forma irregular: a ausência na base passa A conferir no Corte de referência.

### Desastres

- **Atlas Digital de Desastres no Brasil**, v1.1 de 06/08/2026 (<https://atlasdigital.mdr.gov.br/paginas/downloads.xhtml>; CSV com `;` e Latin-1, 1991–2025). É o S2iD da Defesa Civil tratado: um registro por ocorrência, com código IBGE, COBRADE, status e danos humanos. Contar por data do evento, todos os status. Os vieses (adoção do S2iD de 29% dos municípios em 2013 a 88% em 2024, decretos de seca renovados, reconhecimento favorável a prefeitos aliados) são a razão de contar anos da família chuva e não decretos. A versão 1991–2026 deve sair em meados de 2027.
- **Casa Civil, municípios suscetíveis a deslizamentos, enxurradas e inundações** (<https://www.gov.br/casacivil/pt-br/assuntos/cadastro-de-municipios-suscetiveis-a-eventos-de-enxurradas-e-inundacoes/criterios-de-identificacao>): 2.095 municípios (NT 1/2023 mais a lista complementar da NT 1/2025). Corrige os zeros de quem sub-registra.
- **SGB, setorização de áreas de risco geológico** (painel: <https://geoportal.sgb.gov.br/portal/apps/dashboards/c338199dee3a4d4bb0e43738b424a298>; camada nacional consultável: <https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/FeatureServer/0>): a camada que alimenta o painel traz cada setor com o código IBGE e o grau de risco, e uma consulta agrupada por município dá os setores de risco alto e muito alto em 1.599 municípios (17.918 setores, setorizações até 2026-08-18). Ausência de mapeamento não significa ausência de risco.

### Sem fonte municipal

Aluguel e preço de imóvel (o FipeZAP cobre 36 cidades no aluguel e cerca de 56 na venda), custo de vida, crimes além de homicídio (o FBSP só detalha municípios acima de 100 mil habitantes), qualidade da escola privada e velocidade de internet entregue. Por isso o custo de moradia e a sensação de segurança ficam para as categorias subjetivas.
