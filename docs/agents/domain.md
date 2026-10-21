# Documentação de domínio

Como os skills de engenharia devem consumir a documentação de domínio deste repo ao explorar o código. Layout: **contexto único**.

## Antes de explorar, leia

- **`GLOSSARY.md`** na raiz do repo.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você vai trabalhar.

Se algum desses arquivos não existir, **siga em silêncio**. Não aponte a ausência nem sugira criá-los de antemão. O skill `/domain-modeling` (acessado via `/grill-with-docs` e `/improve-codebase-architecture`) os cria sob demanda, quando termos ou decisões forem de fato resolvidos.

## Estrutura de arquivos

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-exemplo-de-decisao.md
│   └── 0002-outra-decisao.md
└── pipeline/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (no título de uma issue, numa proposta de refatoração, numa hipótese, no nome de um teste), use o termo como definido em `GLOSSARY.md`. Não derive para sinônimos que o glossário evita explicitamente.

Se o conceito de que você precisa ainda não está no glossário, isso é um sinal: ou você está inventando uma linguagem que o projeto não usa (reconsidere), ou há uma lacuna real (registre-a para o `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz um ADR existente, explicite isso em vez de sobrescrevê-lo em silêncio:

> _Contradiz o ADR-0007 (…), mas vale reabrir porque…_
