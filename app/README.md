# App

SPA estática (Vite, TypeScript, React e MapLibre GL) do BRCities Rank. O núcleo de domínio (`src/domain/`) é TypeScript puro e concentra as regras; a interface (`src/ui/`) só lê o resultado do `rank` e despacha comandos da Sessão.

```bash
npm ci
npm run dev     # servidor de desenvolvimento
npm run lint    # ESLint
npm test        # Vitest sobre o núcleo
npm run build   # build estático em dist/
```

O app consome `../pipeline/dados/dataset.json`, que o Vite copia para `dist/assets/` com o hash do conteúdo no nome. O contorno dos estados (`src/assets/state-outlines.geojson`) vem das malhas territoriais do IBGE, simplificado.

O push na `master` que passa em todas as verificações do `.gitea/workflows/app.yml` publica `dist/` no Cloudflare Pages (`brcities-rank.pages.dev`), com os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. Os cabeçalhos de cache ficam em `public/_headers`. O ESLint usa o TypeScript 6 porque o `typescript-eslint` ainda não aceita o TypeScript 7.
