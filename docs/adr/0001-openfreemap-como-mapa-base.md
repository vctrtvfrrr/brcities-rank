# OpenFreeMap como mapa-base, com PMTiles como plano B

O app é uma SPA estática, pública e sem backend, e precisa de um mapa-base vetorial gratuito para o MapLibre. Escolhemos a instância pública do OpenFreeMap: não tem chave nem cota, permite uso público e comercial, e a atribuição sai sozinha no MapLibre. Aceitamos o risco de ela não ter SLA e viver de doações, porque o mapa-base é só contexto: os marcadores vêm do nosso dataset, então uma queda tira o fundo, não o app. A URL do estilo fica isolada para que a troca não exija refatoração.

## Considered Options

- **MapTiler Free:** 5 mil sessões por mês, depois o serviço pausa até o mês seguinte; só uso não comercial, logo obrigatório e chave exposta no cliente.
- **Stadia Maps Free:** 200 mil créditos por mês (1 por tile), HTTP 429 ao esgotar; só uso não comercial.
- **Protomaps em PMTiles próprio:** sem chave nem cota, mas exige hospedar um arquivo grande com HTTP Range Requests. Virou o plano B.

As quatro opções usam dados do OpenStreetMap, então a cobertura do Brasil é a mesma; muda só o estilo.

## Consequences

- **Plano B:** um extrato PMTiles do Brasil da build diária da Protomaps, até zoom 9 ou 10. Medido com `pmtiles extract --dry-run` em 20/10/2026: z8 = 21 MB, z9 = 62 MB, z10 = 149 MB, z11 = 314 MB. Acima do `maxzoom` o MapLibre faz overzoom; para marcadores de município, z9 ou z10 basta.
- **Onde hospedar o plano B:** o Cloudflare Pages não serve (limite de 25 MiB por arquivo e Range Requests pouco confiáveis). O GitHub Pages responde 206 a Range Requests e aceita site de até 1 GB, mas o arquivo passa do limite de 100 MiB por arquivo num push e teria de ser publicado pelo artefato do Actions (e o repo está no Gitea, então exigiria um espelho). O R2 funciona, mas exige domínio próprio em produção.
- **Atribuição:** OpenFreeMap, OpenMapTiles e OpenStreetMap no plano A; OpenStreetMap (ODbL) no plano B, com link para `openstreetmap.org/copyright`.
