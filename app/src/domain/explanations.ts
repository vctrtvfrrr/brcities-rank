import type { Dataset } from "./dataset";

export type CriterionSummary = {
  label: string;
  unit: string;
  direction: "maior" | "menor";
};

export type CategoryExplanation = {
  measures: string;
  details: string;
  scoring: string;
  criteria: CriterionSummary[];
};

const SCORING =
  "Cada critério vira uma nota de 0 a 100 pela régua dele, que vai de uma ponta ruim (nota 0) a uma ponta boa (nota 100), com a nota proporcional entre elas. " +
  "Cada ponta é o limite da restrição ligada naquele critério, naquele lado; sem limite, é o valor dos 5% melhores (ou dos 5% piores) entre todos os municípios do Brasil. " +
  "Assim, a cidade bem no limite da restrição vale 0, e a nota sobe conforme ela se afasta dele no sentido bom. " +
  "A nota da categoria é a média simples das notas dos seus critérios, e o critério sem dado conta 0.";

const TEXTS: Record<string, { measures: string; details: string; scoring?: string }> = {
  Segurança: {
    measures: "Quão segura é a cidade, medida pelas mortes violentas dos seus moradores.",
    details:
      "Conta os homicídios, incluindo as mortes por intervenção legal, de pessoas que moram no município, em média de 2022 a 2024: a média de três anos evita que um ano ruim distorça uma cidade pequena. " +
      "Cidade sem óbito registrado tem taxa zero. Roubo, furto e outros crimes ficam de fora, porque não há dado municipal confiável; para eles, crie uma categoria subjetiva.",
  },
  Desastres: {
    measures:
      "O quanto a cidade já sofreu com desastres ligados à chuva (inundação, enxurrada, alagamento, deslizamento) e, com menos peso, com vento e granizo.",
    details:
      "Olha os anos de 2016 a 2025. O primeiro critério conta em quantos anos houve ao menos um registro (os de chuva valem 1 ano cada e os de vento ou granizo, meio ano, de 0 a 15), e não quantos registros houve, para que decretos renovados e formulários duplicados não pesem. " +
      "A cidade sem registro que a Casa Civil ou o Serviço Geológico do Brasil apontam como sujeita a deslizamento ou enchente conta como se tivesse 1 ano com registro, porque a falta de registro pode ser falta de notificação, e não de risco. " +
      "O segundo critério soma mortos, desabrigados e desalojados dos desastres de chuva, por mil habitantes. Estiagem, seca e incêndio não entram.",
  },
  Saúde: {
    measures: "O acesso da população a cuidado infantil e a saneamento básico.",
    details:
      "Os pediatras são os médicos com vínculo no município, contados uma vez cada, na competência mais recente do cadastro nacional de estabelecimentos de saúde (CNES); " +
      "o médico com vínculos em vários municípios conta em cada um. O esgoto é a parcela de moradores ligada à rede geral ou a uma fossa séptica, pelo Censo 2022. " +
      "Ter hospital geral é uma restrição que você pode ligar à parte e não entra na nota da categoria.",
  },
  Escola: {
    measures: "A qualidade do ensino público do município, pelo IDEB.",
    details:
      "O IDEB combina a aprovação dos alunos com o desempenho deles nas provas, e vai de 0 a 10. Entram os três níveis da rede pública: anos iniciais e anos finais do fundamental e ensino médio, na edição de 2025. " +
      "A escola privada não é medida, porque não há dado por município.",
  },
  Clima: {
    measures:
      "O quanto o clima da cidade é seco e ameno, sem abafamento, com poucos dias de chuva e verão sem calor extremo.",
    details:
      "Os quatro critérios usam as médias de 1991 a 2020 no ponto da sede do município, tiradas de uma grade de clima de 0,1° (cerca de 10 km), e não de estações. " +
      "Por isso, em cidade de serra a grade pode errar a temperatura, e os dias de chuva tendem a vir acima do medido nas estações, igual para todas as cidades. " +
      "O ponto de orvalho de dezembro a fevereiro mede o abafamento do verão e a temperatura do mês mais quente, o calor do verão, inclusive o seco; os dois se sobrepõem em parte. " +
      "O tipo de clima (Köppen) só entra como restrição, nunca na nota.",
  },
  Porte: {
    measures: "O tamanho da cidade, pela população: quanto maior, maior a nota.",
    details: "Usa a estimativa de população do IBGE para 1º de julho de 2026, uma estimativa e não uma contagem.",
    scoring: SCORING.replace(
      "Cada critério vira",
      "A população passa antes por logaritmo, de modo que cada vez que ela dobra a nota sobe o mesmo tanto. Cada critério vira",
    ),
  },
};

export function explainCategory(dataset: Dataset, categoryId: string): CategoryExplanation | null {
  const text = TEXTS[categoryId];
  if (!text) return null;
  const criteria = dataset.catalogo
    .filter((entry) => entry.pontua && entry.categoria === categoryId && entry.direcao !== null)
    .map((entry) => ({ label: entry.rotulo, unit: entry.unidade ?? "", direction: entry.direcao! }));
  return { measures: text.measures, details: text.details, scoring: text.scoring ?? SCORING, criteria };
}

export const SUBJECTIVE_GRADING =
  "Categoria subjetiva: a coluna mostra a média das Notas subjetivas de 1 a 5 e, em destaque, a do Avaliador ativo. Para dar ou mudar uma nota, abra o Detalhe da cidade clicando na linha.";

export const SCORE_READING: string[] = [
  "A Pontuação vai de 0 a 100 e serve para ordenar as Candidatas do Corte atual. Com a restrição Pontuação mínima, ela também corta: mudar pesos, notas subjetivas ou categorias ligadas pode tirar ou devolver cidades ao Ranking.",
  "As notas não dependem das outras Candidatas: cada critério mede a cidade numa régua que vai do limite da restrição, se houver, ao melhor do Brasil. Mudar o limite de uma restrição muda as notas daquele critério; cortar ou recortar outras cidades não muda.",
  "Dado ausente conta 0 no critério, para que a falta de dado nunca favoreça uma cidade.",
  "Cada avaliador dá a cada categoria um peso de 0 a 10, sem soma fixa. Entre as categorias ligadas, o peso vira a participação da categoria na conta daquele avaliador (o peso dividido pela soma dos pesos dele), e o Ranking usa a média das participações de todos os avaliadores; assim, quem dá 10 a tudo não pesa mais do que quem dá 2 a tudo. A Pontuação é a média das notas das categorias ligadas, ponderada por essas participações; categoria desligada ou com peso 0 fica fora da conta.",
  "Numa categoria subjetiva, vale a média das notas de 1 a 5 de quem avaliou a cidade, passada para 0 a 100 (1 vale 0 e 5 vale 100). Se ninguém avaliou, a subjetiva sai da conta daquela cidade e o peso dela se reparte entre as demais.",
  "A cidade em que nenhuma categoria entra na conta fica sem Pontuação (–) e vai para o fim da lista. Empates se desfazem pela maior população e, depois, pelo código IBGE.",
];
