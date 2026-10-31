# Tensão coletada pelo console do navegador

A única fonte oficial da tensão de cada município é a consulta da ANEEL às tensões nominais secundárias (`www2.aneel.gov.br/aplicacoes/srd/`), que responde por UF e por município, sem arquivo para baixar e atrás de uma verificação da Cloudflare que recusa o `baixar` da Coleta. Por isso, a Coleta não busca essa fonte: um script versionado no repositório, rodado pelo mantenedor no console do navegador com a página da ANEEL aberta, percorre os municípios em ritmo lento, na sessão dele, e baixa um CSV nacional, que o `baixar` trata como arquivo manual. Reaproveitar o cookie da sessão do navegador num script fora dele contornaria a proteção do site, e isso ficou descartado.

## Considered Options

- **BDGD:** dado aberto e baixável sem bloqueio, mas com gigabytes por distribuidora e a tensão por transformador, o que obrigaria a derivar a tensão do município. Rejeitada pelo custo e por trocar a tensão declarada pela ANEEL por uma inferência nossa.
- **Pedido pela LAI:** daria a lista completa num arquivo, mas deixaria a Restrição parada à espera da resposta, sem prazo de atualização.
- **Páginas salvas à mão:** inviável para cerca de 5.570 municípios.

## Consequences

- Atualizar a Tensão exige uma pessoa com navegador; a Coleta automática não a renova, e cada município fica com a data da sua consulta.
- A fonte é opcional para a Coleta: enquanto o CSV não for gerado e extraído, `montar` publica o dataset sem a coluna nem a entrada da Tensão no catálogo, e o app não oferece a Restrição. Assim a Tensão não trava a atualização das outras fontes; depois de extraída, ela tem de cobrir todos os municípios da base do IBGE.
- A fonte declara a tensão das distribuidoras, que pode estar desatualizada, e traz nomes antigos de distribuidoras; o app mostra só as tensões.
