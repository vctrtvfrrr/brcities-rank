# CI e deploy no GitHub Actions pelo espelho

O CI e o deploy no Cloudflare Pages saem do Gitea Actions e vão para o GitHub Actions, que roda no espelho `github.com/vctrtvfrrr/brcities-rank`. O motivo é a visibilidade: o projeto é público no GitHub, e o status do CI deve aparecer lá. O Gitea continua sendo o repositório principal, com issues, PRs e push. Ele empurra cada commit para o espelho (`sync_on_commit`), e o push no espelho dispara os workflows. Isso substitui a parte do ADR 0002 que deixava o espelho sem Actions. A escolha do Cloudflare Pages, e não do GitHub Pages, continua valendo.

## Considered Options

- **Manter o CI no Gitea Actions:** o resultado fica junto dos PRs, mas não aparece para quem vê o projeto no GitHub.
- **Migrar o repositório inteiro para o GitHub:** os PRs ganhariam checks, mas o issue tracker e o fluxo de trabalho no Gitea teriam de mudar junto.
- **Testes no GitHub e deploy no Gitea:** o pipeline ficaria dividido entre duas plataformas, sem ganho.

## Consequences

- Os workflows disparam só em `push`. Os PRs vivem no Gitea, então `pull_request` nunca dispararia no GitHub. O código das branches de PR roda pelo push espelhado, e o resultado não aparece no PR do Gitea.
- Os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` passam a viver no repositório do GitHub.
- O Actions fica desligado no repositório do Gitea, para que não haja dois deploys concorrentes em `master`.
- O CI depende do espelho: se o push mirror falhar, nada roda.
