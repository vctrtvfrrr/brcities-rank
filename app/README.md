# App

SPA estática (Vite, TypeScript, React e MapLibre GL) do BRCities Rank. O núcleo de domínio (`src/domain/`) é TypeScript puro e concentra as regras; a interface (`src/ui/`) só lê o resultado do `rank` e despacha comandos da Sessão.

```bash
npm ci
npm run dev     # servidor de desenvolvimento
npm test        # Vitest sobre o núcleo
npm run build   # build estático em dist/
```

O app consome `../pipeline/dados/dataset.json`, que o Vite copia para `dist/assets/` com o hash do conteúdo no nome. O contorno dos estados (`src/assets/state-outlines.geojson`) vem das malhas territoriais do IBGE, simplificado.
