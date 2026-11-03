# Taxa de homicídios suavizada pela UF

A taxa bruta de homicídios por 100 mil habitantes oscila muito em municípios pequenos: numa cidade de 35 mil habitantes, cada óbito a mais nos três anos soma quase 1 ponto à taxa e tira cerca de 6 pontos da nota, e o erro de Poisson de uma taxa típica chega a ±3 por 100 mil. Por isso a Coleta publica em `homicidios_por_100_mil` a taxa suavizada pelo estimador bayesiano empírico global de Marshall, com uma média por UF calculada sobre todos os municípios com população. Cada taxa é puxada para a taxa da UF em proporção ao seu ruído, então a cidade grande quase não muda e a pequena se aproxima do estado. A mesma coluna serve ao Corte de referência, ao Critério e, no app, à Restrição e à Régua, que continuam casadas. A taxa bruta fica no CSV em `homicidios_por_100_mil_bruta`.

## Considered Options

- **Média nacional como referência:** um único alvo de cerca de 21 por 100 mil puxaria cidades pequenas de estados pouco violentos, como SP e SC, para uma violência que não é a do seu contexto.
- **Suavização local pelos vizinhos:** acompanha melhor os gradientes dentro do estado, mas exige definir a vizinhança e fica mais difícil de explicar e de conferir.
- **Taxa suavizada só na nota:** deixaria a Restrição na taxa bruta e a Régua em outra coluna, desfazendo o casamento da [ADR 0006](0006-nota-pela-regua-das-restricoes.md).
- **Mais anos na média:** reduziria o ruído sem modelo, mas misturaria períodos de violência diferentes e ainda deixaria as cidades muito pequenas instáveis.

## Consequences

- A suavização puxa para a média da UF nos dois sentidos: a cidade pequena com taxa bruta baixa piora, e a com taxa bruta alta melhora. Como as Candidatas tendem a ficar abaixo da média do estado, a maioria das pequenas perde um pouco.
- Município sem óbito registrado deixa de ter taxa zero e fica com uma taxa entre zero e a da UF.
- A taxa de um município depende dos outros da mesma UF; mudar os dados de um estado muda as taxas suavizadas dele.
- O Corte de referência pode mudar nas cidades perto do limite de 20.
