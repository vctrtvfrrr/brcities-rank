# Cloudflare Pages com build no Gitea Actions

O site é publicado no Cloudflare Pages, em `brcities-rank.pages.dev`. O build roda no Gitea Actions e sobe por upload direto com `wrangler pages deploy`. Já existe um espelho do repositório no GitHub, e o GitHub Pages pareceria o caminho natural. Só que o GitHub Pages fixa `Cache-Control: max-age=600` e não deixa configurar cabeçalhos. Assim, o `dataset.json` com hash no nome nunca teria cache longo, e esse é um critério de aceite da publicação. O Cloudflare Pages aceita um arquivo `_headers` e comprime em brotli sozinho. O CI e o deploy ficam no Gitea, e o espelho no GitHub fica só como backup, sem Actions nem Pages.

## Considered Options

- **GitHub Pages pelo espelho:** o espelho já sincroniza a cada commit e o GitHub Actions é gratuito, mas o cache não pode ser configurado.
- **Servidor próprio no codelab:** dá controle total dos cabeçalhos, mas deixa de ser hospedagem gratuita gerida por terceiros e vira manutenção nossa.

## Consequences

- O Vite coloca o hash no nome do dataset, e um único `_headers` resolve o cache: `/assets/*` com `public, max-age=31536000, immutable` e o HTML com `no-cache`.
- O deploy depende de dois segredos no repositório do Gitea: `CLOUDFLARE_API_TOKEN`, com permissão só de Pages:Edit, e `CLOUDFLARE_ACCOUNT_ID`.
- O plano B do mapa-base (ADR 0001) não cabe no Cloudflare Pages, que tem limite de 25 MiB por arquivo. Se for preciso, o PMTiles vai para outro host com Range Requests, como o R2.
