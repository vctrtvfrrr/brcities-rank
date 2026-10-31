# Pipeline da Coleta

Levanta os dados dos 5.570 municípios nas fontes públicas descritas em [METODOLOGIA.md](METODOLOGIA.md) e escreve o registro versionado:

- `dados/municipios.csv`: um município por linha, com os valores das restrições de referência, o motivo do corte ou as marcas A conferir, e os valores dos critérios.
- `dados/dataset.json`: o dataset que o app consome, colunar, com as colunas do app, o catálogo dos critérios e os metadados das fontes (versão do contrato, data da Coleta e, por fonte, edição, ano, endereço e crédito). A Coleta falha se `hospital_geral` ou `fibra` vier com valor fora de sim, não ou vazio.
- `corte.md`: quantas cidades cada restrição de referência cortou e quais Candidatas passaram com marca.
- `criterios.md`: fonte, recorte, edição, endereço e P5/P95 de cada critério.

Os arquivos baixados ficam em `fontes/`, fora do Git: são grandes e reproduzíveis, e `criterios.md` guarda o bastante para baixá-los de novo.

## Uso

Requer [uv](https://docs.astral.sh/uv/).

```bash
uv run python -m coleta baixar
```

```bash
uv run python -m coleta extrair
```

```bash
uv run python -m coleta montar
```

```bash
uv run python -m coleta validar
```

`baixar` e `extrair` aceitam nomes de fonte para rodar só parte delas. Algumas fontes não têm link direto: `baixar` lista o caminho e o endereço de cada arquivo de download manual. `validar` confronta a Coleta com fontes de referência e escreve `fontes/validacao.md`, fora do Git.

## Testes

```bash
uv run pytest
```

## Relevo

`ibge-setores` baixa as malhas de municípios, distritos e setores do Censo 2022. `anadem` baixa as folhas GeoTIFF v1.0 que cobrem o Brasil (dezenas de GB, fora do Git). Extraia as duas depois de `ibge-localidades`:

```bash
uv run python -m coleta baixar ibge-setores anadem
uv run python -m coleta extrair ibge-setores anadem
uv run python -m coleta montar
```

A extração lê o mosaico em blocos, sem carregá-lo inteiro na memória. As três colunas só restringem no app; não alteram o Corte de referência. O método está em [METODOLOGIA.md](METODOLOGIA.md#relevo).


## Tensão

A fonte `aneel-tensoes` usa um CSV manual: a Coleta não faz requisições à consulta da ANEEL. Para gerar o arquivo, abra a [consulta de tensões nominais secundárias](https://www2.aneel.gov.br/aplicacoes/srd/frmConcessionaria.cfm), conclua a verificação do site e cole o conteúdo de [scripts/aneel-tensoes.js](scripts/aneel-tensoes.js) no console do navegador.

O script percorre as 27 UFs e seus municípios em sequência. Se uma consulta falhar por erro de rede, timeout, erro HTTP ou resposta fora do formato esperado, ele tenta até três vezes antes de registrar a falha: espera 1,5 segundo antes da primeira tentativa, 3 segundos antes da segunda e 6 segundos antes da terceira. Isso vale tanto para a lista de municípios quanto para as tensões. A coleta nacional pode levar algumas horas. O script pausa imediatamente em respostas 403/429 ou em um novo desafio do site, para o mantenedor verificar a página e retomar; também pausa após três consultas consecutivas que esgotarem suas tentativas. O console mostra cada nova tentativa e o progresso; ao terminar, o navegador baixa `tensoes.csv`. O progresso fica salvo no armazenamento local da ANEEL, inclusive se a página for recarregada. Mantenha a página aberta durante a execução.

- `aneelVoltages.status()` mostra os municípios processados, os códigos que falharam e as UFs cuja lista não foi obtida.
- `aneelVoltages.stop()` interrompe após a chamada em andamento ou antes da próxima tentativa, se estiver esperando, e baixa o CSV parcial. Uma consulta interrompida permanece pendente, sem registrar uma falha definitiva.
- `aneelVoltages.resume()` ou `aneelVoltages.retryFailures()` retoma o que falta e repete apenas as falhas; os municípios concluídos não são consultados de novo.
- `aneelVoltages.downloadCSV()` baixa novamente o arquivo com o progresso atual.

Depois de recarregar a página, cole o script de novo para retomar. Se o site solicitar nova verificação, conclua-a na página e repita as falhas. Não publique um CSV com UFs pendentes: nesse caso ainda não há códigos para registrar os municípios faltantes. Para renovar toda a coleta, interrompa uma execução ativa, remova apenas a chave `brcities-rank:aneel-tensoes:v2` do armazenamento local da ANEEL e recarregue a página antes de colar o script novamente.

Guarde o arquivo em `fontes/aneel-tensoes/tensoes.csv`, relativo à pasta `pipeline`, e execute:

```bash
uv run python -m coleta baixar aneel-tensoes
uv run python -m coleta extrair aneel-tensoes
uv run python -m coleta montar
uv run python -m coleta validar
```

O contrato do CSV é UTF-8 (com ou sem BOM), separado por vírgulas, com este cabeçalho, nesta ordem:

```csv
codigo_ibge,uf,distribuidora,tensao,status,consultado_em,erro
1200401,AC,Distribuidora A,220/127,ok,2026-10-30,
1200401,AC,Distribuidora A,230/115,ok,2026-10-30,
1100015,RO,,,sem_tensao,2026-10-30,
3550308,SP,,,falha,2026-10-30,HTTP 503
```

Cada par de cada distribuidora ocupa uma linha. O HTML real sem tensão identifica uma distribuidora (`div#distribuidora`, como CEA), mas não traz nenhum `div#resultado`; esse caso gera uma linha `sem_tensao`. Municípios que a ANEEL não tem cadastrados, em geral os criados mais recentemente, recebem o modelo da página com o `body` vazio, e isso também vira `sem_tensao`. Valores isolados ao lado dos pares, como `220 volts` ou `1 volts`, são ignorados com um aviso no console. Qualquer outra resposta fora dessa estrutura continua sendo falha de consulta. O script genérico de detecção da Cloudflare também pode aparecer numa resposta válida e, sozinho, não indica bloqueio. Consultas que falharam e municípios conhecidos ainda pendentes têm uma linha `falha` com o erro. Cada município concluído conserva a data da sua consulta em `consultado_em`, no formato `AAAA-MM-DD`; baixar novamente o CSV não a altera. A edição da fonte é essa data ou o intervalo entre a primeira e a última consulta, quando a coleta atravessa dias. O extrator recusa cabeçalhos, pares, códigos, datas e status inválidos ou inconsistentes. O CSV conserva a distribuidora para auditoria; o dataset publica apenas os pares distintos, na ordem da ANEEL e separados por `;`, ou `null` quando a tensão é desconhecida.

O extrator interrompe se houver qualquer `falha`. O extrator ignora as entradas 99000xx da ANEEL, que não são municípios do IBGE. O `montar` exige todos os municípios da base do IBGE e recusa os ausentes, listando-os; códigos fora da base, como Fernando de Noronha, são ignorados como nas outras fontes. Uma UF que não foi consultada aparece entre os municípios ausentes. Corrija ou retome a coleta, gere outro CSV e extraia de novo antes de publicar.

Na extração geral, sem nomes de fontes, a ausência do CSV opcional é informada e a execução continua; pedir `extrair aneel-tensoes` explicitamente mantém o erro quando falta o arquivo. A fonte manual `aneel-tensoes` é opcional enquanto ainda não foi extraída: `montar` continua atualizando as demais fontes e publica o dataset sem a coluna e a entrada de Tensão no catálogo. Depois da extração completa, a coluna, o catálogo e os metadados passam a ser publicados juntos; o `montar` também recusa uma cobertura extraída que tenha ficado diferente da base atual do IBGE. A validação informa quantos municípios ficaram sem tensão e quantos têm simultaneamente 127 V e 220 V, após agrupar as tensões raras. A coluna só restringe: não altera notas, Pontuação nem o Corte de referência.

O checkpoint atual usa a chave `brcities-rank:aneel-tensoes:v2`. Checkpoints e CSVs anteriores, sem a data de cada consulta, precisam de uma nova coleta para produzir o contrato `consultado_em`.
