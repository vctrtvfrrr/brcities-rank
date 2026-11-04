import type { Dataset } from "./dataset";
import type { Reference } from "./session";

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

const UNLIMITED_END: Record<Reference, string> = {
  candidates: "entre as Candidatas, a Referência padrão",
  brazil: "entre todos os municípios do Brasil, a Referência escolhida",
};

const scoring = (reference: Reference) =>
  "Cada critério vira uma nota de 0 a 100 pela régua dele, que vai de uma ponta ruim (nota 0) a uma ponta boa (nota 100), com a nota proporcional entre elas. " +
  `Cada ponta é o limite da restrição ligada naquele critério, naquele lado; sem limite, é o valor dos 5% melhores (ou dos 5% piores) ${UNLIMITED_END[reference]}. ` +
  "Assim, a cidade bem no limite da restrição vale 0, e a nota sobe conforme ela se afasta dele no sentido bom. " +
  "A nota da categoria é a média simples das notas dos seus critérios, e o critério sem dado conta 0.";

const LOG_SCALE =
  "A população passa antes por logaritmo, de modo que cada vez que ela dobra a nota sobe o mesmo tanto. ";

const TEXTS: Record<string, { measures: string; details: string; scoringPrefix?: string }> = {
  Segurança: {
    measures: "Quão segura é a cidade, medida pelas mortes violentas dos seus moradores.",
    details:
      "Conta os homicídios, incluindo as mortes por intervenção legal, de pessoas que moram no município, em média de 2022 a 2024: a média de três anos evita que um ano ruim distorça uma cidade pequena. " +
      "Em cidade pequena, poucos óbitos mudam muito a taxa; por isso ela é puxada para a taxa do estado, tanto mais quanto menor a população, e a cidade grande fica quase com a própria taxa. " +
      "Roubo, furto e outros crimes ficam de fora, porque não há dado municipal confiável; para eles, crie uma categoria subjetiva.",
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
    scoringPrefix: LOG_SCALE,
  },
};

export function explainCategory(
  dataset: Dataset,
  categoryId: string,
  reference: Reference,
): CategoryExplanation | null {
  const text = TEXTS[categoryId];
  if (!text) return null;
  const criteria = dataset.catalogo
    .filter((entry) => entry.pontua && entry.categoria === categoryId && entry.direcao !== null)
    .map((entry) => ({ label: entry.rotulo, unit: entry.unidade ?? "", direction: entry.direcao! }));
  return {
    measures: text.measures,
    details: text.details,
    scoring: (text.scoringPrefix ?? "") + scoring(reference),
    criteria,
  };
}

export const SUBJECTIVE_GRADING =
  "Categoria subjetiva: a coluna mostra a média das Notas subjetivas de 1 a 5 e, em destaque, a do Avaliador ativo. Para dar ou mudar uma nota, abra o Detalhe da cidade clicando na linha.";

const RULER_READING: Record<Reference, string> = {
  candidates:
    "Cada critério mede a cidade numa régua que vai do limite da restrição, se houver, ao melhor da Referência, que agora é a das Candidatas: a régua sai das cidades que passam em todas as restrições ligadas menos a Pontuação mínima. Mexer em qualquer outra restrição pode mudar as notas de todo mundo, e a cidade cortada é medida pela mesma régua.",
  brazil:
    "Cada critério mede a cidade numa régua que vai do limite da restrição, se houver, ao melhor da Referência, que agora é a de todos os municípios do Brasil. Por isso as notas só dependem dos dados da cidade e das restrições.",
};

export const explainScoreReading = (reference: Reference): string[] => [
  "A Pontuação vai de 0 a 100 e serve para ordenar as Candidatas do Corte atual. Com a restrição Pontuação mínima, ela também corta: mudar pesos, notas subjetivas ou categorias ligadas pode tirar ou devolver cidades ao Ranking.",
  RULER_READING[reference],
  "Dado ausente conta 0 no critério, para que a falta de dado nunca favoreça uma cidade.",
  "Cada avaliador dá a cada categoria um peso de 0 a 10, sem soma fixa. Entre as categorias ligadas, o peso vira a participação da categoria na conta daquele avaliador (o peso dividido pela soma dos pesos dele), e o Ranking usa a média das participações de todos os avaliadores; assim, quem dá 10 a tudo não pesa mais do que quem dá 2 a tudo. A Pontuação é a média das notas das categorias ligadas, ponderada por essas participações; categoria desligada ou com peso 0 fica fora da conta.",
  "Numa categoria subjetiva, vale a média das notas de 1 a 5 de quem avaliou a cidade, passada para 0 a 100 (1 vale 0 e 5 vale 100). Se ninguém avaliou, a subjetiva sai da conta daquela cidade e o peso dela se reparte entre as demais.",
  "A cidade em que nenhuma categoria entra na conta fica sem Pontuação (–) e vai para o fim da lista. Empates se desfazem pela maior população e, depois, pelo código IBGE.",
];

const BAND_REFERENCE: Record<Reference, string> = {
  candidates:
    "o melhor das Candidatas, a Referência ativa. Por isso a Faixa de uma cidade pode mudar quando outras cidades entram ou saem do Corte.",
  brazil:
    "o melhor do Brasil, a Referência ativa. Por isso a Faixa de uma cidade não muda quando outras cidades entram ou saem do Corte.",
};

export const explainBands = (reference: Reference): string =>
  "A Pontuação e a nota de cada categoria ganham a cor da Faixa em que caem. Como as notas vêm da régua de cada critério, a Faixa diz onde a cidade fica entre o limite das suas restrições e " +
  BAND_REFERENCE[reference];

const CONSTRAINT_EXPLANATIONS: Record<string, string> = {
  tensao:
    "Olha a tensão da tomada comum (fase-neutro). Basta uma das tensões da cidade estar aceita. " +
    "Tensões raras contam na mais próxima de 127 V ou 220 V. Sem tensão conhecida, a cidade não passa. " +
    "A Tensão nunca entra na Pontuação.",
};

export function explainConstraint(criterion: string): string | null {
  return CONSTRAINT_EXPLANATIONS[criterion] ?? null;
}
