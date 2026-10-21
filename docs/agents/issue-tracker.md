# Issue tracker: Gitea (API REST)

As issues e specs deste repo ficam nas issues do Gitea em `https://git.codelab.tec.br/vctrtvfrrr/brcities-rank`. Toda operação usa a API REST do Gitea via `curl`.

## Autenticação

A autenticação depende da variável de ambiente `GITEA_TOKEN`: um token de acesso pessoal com escopo de leitura e escrita em issues, que precisa existir no ambiente de execução do agente.

Cada ferramenta injeta essa variável no ambiente do seu próprio jeito. Este repo não depende de nenhum mecanismo específico. Se ela estiver vazia, pare e peça ao usuário para configurá-la. Não procure o token em arquivos de configuração. Nunca imprima nem grave o token.

```bash
: "${GITEA_TOKEN:?defina GITEA_TOKEN}"
GITEA="https://git.codelab.tec.br/api/v1"
API="$GITEA/repos/vctrtvfrrr/brcities-rank"
AUTH=(-H "Authorization: token $GITEA_TOKEN" -H "Content-Type: application/json")
```

Monte os corpos JSON com `jq -n` (ou Python) a partir de um arquivo Markdown, nunca à mão, para escapar corretamente quebras de linha e aspas:

```bash
jq -n --arg title "..." --rawfile body corpo.md '{title: $title, body: $body}' > payload.json
```

## Convenções

- **Criar uma issue**: `curl -s "${AUTH[@]}" -X POST "$API/issues" -d @payload.json`. Para aplicar rótulos na criação, inclua `labels: [<ids>]` no payload (IDs numéricos, veja **Rótulos**).
- **Ler uma issue**: `curl -s "${AUTH[@]}" "$API/issues/<n>"` e os comentários em `curl -s "${AUTH[@]}" "$API/issues/<n>/comments"`.
- **Listar issues**: `curl -s "${AUTH[@]}" "$API/issues?state=open&type=issues&limit=50&labels=<nome>"`, filtrando com `jq '[.[] | {number, title, body, labels: [.labels[].name]}]'`. Pagine com `&page=N`.
- **Comentar**: `curl -s "${AUTH[@]}" -X POST "$API/issues/<n>/comments" -d "$(jq -n --rawfile body comentario.md '{body: $body}')"`.
- **Rótulos**: descubra os IDs com `curl -s "${AUTH[@]}" "$API/labels" | jq '.[] | {id, name}'`. Adicione com `POST "$API/issues/<n>/labels"` e corpo `{"labels": [<id>]}`; remova com `DELETE "$API/issues/<n>/labels/<id>"`.
- **Fechar**: comente primeiro, depois `curl -s "${AUTH[@]}" -X PATCH "$API/issues/<n>" -d '{"state": "closed"}'`.
- **Sub-issue de um pai**: o Gitea não tem sub-issues nativas. Coloque `Parte de #<pai>` no topo do corpo da filha e adicione a filha a uma task list (`- [ ] #<filha>`) no corpo do pai.

## Pull requests como superfície de triagem

**PRs como superfície de pedidos: não.** _(Mude para `sim` se este repo tratar PRs externos como pedidos de funcionalidade; o `/triage` lê esta flag.)_

Quando `sim`, os PRs passam pelos mesmos rótulos e estados das issues: leia com `GET "$API/pulls/<n>"` e o diff com `GET "$API/pulls/<n>.diff"`; comentários, rótulos e fechamento usam os mesmos endpoints de `issues/<n>`. Issues e PRs compartilham a mesma numeração no Gitea, então um `#42` solto pode ser qualquer um dos dois: tente `GET "$API/pulls/42"` e, se der 404, `GET "$API/issues/42"`.

## Quando um skill disser "publique no issue tracker"

Crie uma issue no Gitea como em **Criar uma issue**.

## Quando um skill disser "busque o ticket relevante"

Leia-o como em **Ler uma issue**.

## Operações de wayfinding

Usadas pelo `/wayfinder`. O **mapa** é uma única issue com issues **filhas** como tickets.

- **Mapa**: uma issue com o rótulo `wayfinder:map`, contendo o corpo Notes / Decisions-so-far / Fog.
- **Ticket filho**: uma issue ligada ao mapa como em **Sub-issue de um pai**. Rótulos: `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Ao ser reivindicado, o ticket é atribuído ao dev que conduz.
- **Bloqueio**: use as **dependências nativas de issues** do Gitea. Adicione uma aresta com `curl -s "${AUTH[@]}" -X POST "$API/issues/<filha>/dependencies" -d '{"owner": "vctrtvfrrr", "repo": "brcities-rank", "index": <bloqueadora>}'` e liste os bloqueadores com `GET "$API/issues/<filha>/dependencies"`. Se as dependências estiverem desativadas no repo, use uma linha `Bloqueada por: #<n>, #<n>` no topo do corpo da filha. Um ticket está desbloqueado quando todos os bloqueadores estão fechados.
- **Fronteira**: liste as filhas abertas do mapa (pela task list do mapa), descarte as que têm bloqueador aberto ou responsável; vence a primeira na ordem do mapa.
- **Reivindicar**: `curl -s "${AUTH[@]}" -X PATCH "$API/issues/<n>" -d '{"assignees": ["<login>"]}'`, como primeira escrita da sessão. Descubra o login do token com `GET "$GITEA/user"`.
- **Resolver**: comente a resposta, feche a issue e acrescente um ponteiro de contexto (resumo + link) em Decisions-so-far do mapa.
