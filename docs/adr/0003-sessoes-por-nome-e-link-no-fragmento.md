# Sessões guardadas por nome e compartilhadas no fragmento da URL

O app não tem backend, e o visitante quer compartilhar uma Sessão por link, além do arquivo. O link leva a Sessão inteira no fragmento da URL (`#sessao=…`), em JSON comprimido com `deflate-raw` e codificado em base64url. O fragmento nunca vai para o servidor, então nada de notas ou pesos aparece em log do Cloudflare Pages, e o app continua estático. O navegador passa a guardar várias Sessões, e o nome é a identidade de cada uma: abrir um link ou importar um arquivo substitui a Sessão com o mesmo nome (perguntando antes, se ela tiver conteúdo próprio) ou acrescenta uma nova.

## Considered Options

- **Encurtador ou armazenamento remoto (KV, gist):** links curtos, mas exige backend ou chave, e os dados do visitante passam a morar com terceiros.
- **Query string (`?sessao=…`):** funciona igual no cliente, mas manda a Sessão ao servidor a cada acesso e quebra o cache do HTML.
- **Uma só Sessão por navegador, sempre substituída:** mais simples, mas abrir o link de outra pessoa apagaria a própria Sessão do visitante.

## Consequences

- O link cresce com o número de notas subjetivas; Sessões com milhares de notas geram links longos, que alguns apps de mensagem cortam. O arquivo continua sendo o caminho para Sessões grandes.
- Renomear uma Sessão para um nome que já existe no navegador é recusado.
- O armazenamento local mudou de chave (`brcities-rank:session` → `brcities-rank:sessions`); a Sessão antiga é migrada na primeira carga.
