import { SearchHandlerResponseItem, HighlightFragment } from '@/types/search';

export const MOCK_DECISIONS: SearchHandlerResponseItem[] = [
  {
    _source: {
      "Número de Processo": "1234/21.4T8LRA.C1.S1",
      "Data": "14/01/2026",
      "Relator Nome Profissional": { Show: ["Conselheiro Manuel Capelo"], Original: ["Manuel Capelo"], Index: ["Manuel Capelo"] },
      "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
      "Secção": { Show: ["1.ª Secção (Cível)"], Original: ["1.ª Secção (Cível)"], Index: ["1.ª Secção (Cível)"] },
      "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Responsabilidade Civil", "Erro Judiciário", "Indemnização"], Original: ["Responsabilidade Civil"], Index: ["Responsabilidade Civil"] },
      "Sumário": "I - A responsabilidade civil extracontratual do Estado por erro judiciário manifesto e inescusável pressupõe a existência de decisão jurisdicional manifestamente contrária ao direito. II - Verificados os pressupostos do dever de indemnizar, impõe-se a fixação de compensação pelos danos não patrimoniais sofridos.",
      "Texto": "Acordam no Supremo Tribunal de Justiça: A responsabilidade civil do Estado funda-se na garantia de reparação integral dos danos injustamente causados...",
      "ECLI": "ECLI:PT:STJ:2026:1234.21.4T8LRA.C1.S1",
      "UUID": "doc-mock-1"
    } as any,
    score: 0.98,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "456/20.8GBABF.E1.S1",
      "Data": "12/01/2026",
      "Relator Nome Profissional": { Show: ["Conselheira Maria do Carmo Silva"], Original: ["Maria do Carmo Silva"], Index: ["Maria do Carmo Silva"] },
      "Área": { Show: ["Área Criminal"], Original: ["Área Criminal"], Index: ["Área Criminal"] },
      "Secção": { Show: ["3.ª Secção (Criminal)"], Original: ["3.ª Secção (Criminal)"], Index: ["3.ª Secção (Criminal)"] },
      "Decisão": { Show: ["Concedido Provimento"], Original: ["Concedido Provimento"], Index: ["Concedido Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Burla Qualificada", "Medida Concreta da Pena", "Branqueamento"], Original: ["Burla Qualificada"], Index: ["Burla Qualificada"] },
      "Sumário": "I - O crime de burla qualificada consuma-se com a obtenção de enriquecimento ilegítimo mediante indução em erro praticada por via de enganos e artifícios astuciosos. II - Na fixação da medida da pena, atende-se à culpa do agente e às exigências de prevenção geral e especial.",
      "Texto": "Acordam na 3.ª Secção Criminal do STJ: Em julgamento de recurso interposto pelo arguido condenado pela prática continuada de crime de burla qualificada...",
      "ECLI": "ECLI:PT:STJ:2026:456.20.8GBABF.E1.S1",
      "UUID": "doc-mock-2"
    } as any,
    score: 0.92,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "789/19.2T8VNG.P1.S1",
      "Data": "08/01/2026",
      "Relator Nome Profissional": { Show: ["Conselheiro António Barateiro Martins"], Original: ["António Barateiro Martins"], Index: ["António Barateiro Martins"] },
      "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
      "Secção": { Show: ["2.ª Secção (Cível)"], Original: ["2.ª Secção (Cível)"], Index: ["2.ª Secção (Cível)"] },
      "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Contrato de Empreitada", "Defeitos da Obra", "Caducidade"], Original: ["Contrato de Empreitada"], Index: ["Contrato de Empreitada"] },
      "Sumário": "I - No contrato de empreitada de construção de imóvel de longa duração, a denúncia tempestiva dos defeitos dentro do prazo de garantia constitui pressuposto indispensável do direito à eliminação dos mesmos. II - A caducidade do direito de ação extingue a pretensão indemnizatória do dono da obra.",
      "Texto": "Acordam no Supremo Tribunal de Justiça: A questão central submetida a revista respeita à contagem dos prazos de denúncia de defeitos ocultos e caducidade da ação...",
      "ECLI": "ECLI:PT:STJ:2026:789.19.2T8VNG.P1.S1",
      "UUID": "doc-mock-3"
    } as any,
    score: 0.85,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "102/22.0YFLSB.S1",
      "Data": "18/12/2025",
      "Relator Nome Profissional": { Show: ["Conselheiro Júlio Gomes"], Original: ["Júlio Gomes"], Index: ["Júlio Gomes"] },
      "Área": { Show: ["Área Social"], Original: ["Área Social"], Index: ["Área Social"] },
      "Secção": { Show: ["4.ª Secção (Social)"], Original: ["4.ª Secção (Social)"], Index: ["4.ª Secção (Social)"] },
      "Decisão": { Show: ["Concedido Parcialmente"], Original: ["Concedido Parcialmente"], Index: ["Concedido Parcialmente"] },
      "Votação": { Show: ["Maioria"], Original: ["Maioria"], Index: ["Maioria"] },
      "Descritores": { Show: ["Despedimento Ilícito", "Indemnização de Antiguidade", "Justa Causa"], Original: ["Despedimento Ilícito"], Index: ["Despedimento Ilícito"] },
      "Sumário": "I - A justa causa de despedimento exige comportamento culposo grave do trabalhador que determine a quebra de confiança insuscetível de permitir a subsistência da relação de trabalho. II - Sendo o despedimento ilícito, cabe indemnização de antiguidade fixada entre 15 e 45 dias de retribuição base.",
      "Texto": "Acordam na Secção Social do Supremo Tribunal de Justiça: Discute-se a ilicitude do despedimento disciplinar promovido pela entidade patronal com fundamento em quebra de deveres funcionais...",
      "ECLI": "ECLI:PT:STJ:2025:102.22.0YFLSB.S1",
      "UUID": "doc-mock-4"
    } as any,
    score: 0.78,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "233/18.4JAPRT.P1.S1",
      "Data": "04/11/2024",
      "Relator Nome Profissional": { Show: ["Conselheiro Nuno Gonçalves"], Original: ["Nuno Gonçalves"], Index: ["Nuno Gonçalves"] },
      "Área": { Show: ["Área Criminal"], Original: ["Área Criminal"], Index: ["Área Criminal"] },
      "Secção": { Show: ["5.ª Secção (Criminal)"], Original: ["5.ª Secção (Criminal)"], Index: ["5.ª Secção (Criminal)"] },
      "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Tráfico de Estupefacientes", "Apreensão de Bens", "Perda a Favor do Estado"], Original: ["Tráfico de Estupefacientes"], Index: ["Tráfico de Estupefacientes"] },
      "Sumário": "I - A declaração de perda de bens e vantagens do crime a favor do Estado tem natureza sancionatória análoga à pena e visa eliminar o proveito económico do ilícito. II - A incongruência entre o património demonstrado e os rendimentos declarados fundamenta a perda alargada nos termos da Lei n.º 5/2002.",
      "Texto": "Acordam na 5.ª Secção Criminal do Supremo Tribunal de Justiça: O Ministério Público e o arguido recorrem da decisão do Tribunal da Relação sobre a liquidação da perda alargada de património...",
      "ECLI": "ECLI:PT:STJ:2024:233.18.4JAPRT.P1.S1",
      "UUID": "doc-mock-5"
    } as any,
    score: 0.71,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "512/17.6TBBRG.G1.S1",
      "Data": "22/05/2023",
      "Relator Nome Profissional": { Show: ["Conselheira Ana Paula Boularot"], Original: ["Ana Paula Boularot"], Index: ["Ana Paula Boularot"] },
      "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
      "Secção": { Show: ["1.ª Secção (Cível)"], Original: ["1.ª Secção (Cível)"], Index: ["1.ª Secção (Cível)"] },
      "Decisão": { Show: ["Concedido Provimento"], Original: ["Concedido Provimento"], Index: ["Concedido Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Responsabilidade Pré-Contratual", "Boa Fé", "Interesse Contratual Negativo"], Original: ["Responsabilidade Pré-Contratual"], Index: ["Responsabilidade Pré-Contratual"] },
      "Sumário": "I - Quem negoceia com outrem para conclusão de um contrato deve, tanto nos preliminares como na formação dele, proceder segundo as regras da boa fé, sob pena de responder pelos danos que culposamente causar (art. 227.º do Código Civil). II - A rutura injustificada e arbitrária de negociações avançadas confere direito à reparação do interesse contratual negativo.",
      "Texto": "Acordam na 1.ª Secção Cível: As partes iniciaram negociações destinadas à transmissão de participações sociais que decorreram durante meses, tendo a ré abandonado abruptamente o processo negocial...",
      "ECLI": "ECLI:PT:STJ:2023:512.17.6TBBRG.G1.S1",
      "UUID": "doc-mock-6"
    } as any,
    score: 0.65,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "610/20.3T8AVR.C1.S1",
      "Data": "15/03/2023",
      "Relator Nome Profissional": { Show: ["Conselheiro Ferreira Pinto"], Original: ["Ferreira Pinto"], Index: ["Ferreira Pinto"] },
      "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
      "Secção": { Show: ["2.ª Secção (Cível)"], Original: ["2.ª Secção (Cível)"], Index: ["2.ª Secção (Cível)"] },
      "Decisão": { Show: ["Concedido Provimento"], Original: ["Concedido Provimento"], Index: ["Concedido Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Mútuo Bancário", "Hipoteca", "Cláusulas Abusivas", "Defesa do Consumidor"], Original: ["Mútuo Bancário"], Index: ["Mútuo Bancário"] },
      "Sumário": "I - As cláusulas gerais inseridas em contrato de mútuo bancário com garantia hipotecária que permitam a exigibilidade antecipada da totalidade da dívida perante mero atraso insignificante são nulas por desproporcionadas. II - O controlo judicial das cláusulas contratuais abusivas visa restabelecer o equilíbrio das prestações contratuais.",
      "Texto": "Acordam no Supremo Tribunal de Justiça: A autora impugna a validade de cláusulas de resolução e de vencimento imediato apostas na escritura pública de mútuo com hipoteca...",
      "ECLI": "ECLI:PT:STJ:2023:610.20.3T8AVR.C1.S1",
      "UUID": "doc-mock-7"
    } as any,
    score: 0.61,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "845/21.9JABRG.S1",
      "Data": "19/01/2023",
      "Relator Nome Profissional": { Show: ["Conselheiro Cid Geraldo"], Original: ["Cid Geraldo"], Index: ["Cid Geraldo"] },
      "Área": { Show: ["Área Criminal"], Original: ["Área Criminal"], Index: ["Área Criminal"] },
      "Secção": { Show: ["3.ª Secção (Criminal)"], Original: ["3.ª Secção (Criminal)"], Index: ["3.ª Secção (Criminal)"] },
      "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Homicídio Qualificado", "Legítima Defesa", "Excesso de Legítima Defesa"], Original: ["Homicídio Qualificado"], Index: ["Homicídio Qualificado"] },
      "Sumário": "I - A legítima defesa supõe a existência de agressão atual e ilícita contra a pessoa do agente ou terceiro, e a impossibilidade de recorrer em tempo útil à força pública. II - O recurso a arma de fogo desferindo múltiplos disparos contra agressor já neutralizado consubstancia excesso de legítima defesa não desculpante.",
      "Texto": "Acordam na Secção Criminal do Supremo Tribunal de Justiça: O recorrente alega ter agido em estado de legítima defesa justificante ou, subsidiariamente, em excesso não censurável por perturbação emocional...",
      "ECLI": "ECLI:PT:STJ:2023:845.21.9JABRG.S1",
      "UUID": "doc-mock-8"
    } as any,
    score: 0.58,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "318/19.7T8VIS.C1.S1",
      "Data": "28/09/2022",
      "Relator Nome Profissional": { Show: ["Conselheira Maria dos Prazeres Beleza"], Original: ["Maria dos Prazeres Beleza"], Index: ["Maria dos Prazeres Beleza"] },
      "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
      "Secção": { Show: ["1.ª Secção (Cível)"], Original: ["1.ª Secção (Cível)"], Index: ["1.ª Secção (Cível)"] },
      "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Ação de Reivindicação", "Usucapião", "Posse de Boa Fé"], Original: ["Ação de Reivindicação"], Index: ["Ação de Reivindicação"] },
      "Sumário": "I - Na ação de reivindicação, incumbe ao autor a prova do direito de propriedade sobre a coisa reivindicada. II - A usucapião consubstancia modo de aquisição originária do direito de propriedade, prevalecendo sobre o registo predial desconforme com a posse pacífica e pública exercida por mais de vinte anos.",
      "Texto": "Acordam no Supremo Tribunal de Justiça: A ação de reivindicação foi julgada improcedente nas instâncias em virtude do reconhecimento da aquisição originária por usucapião deduzida em reconvenção...",
      "ECLI": "ECLI:PT:STJ:2022:318.19.7T8VIS.C1.S1",
      "UUID": "doc-mock-9"
    } as any,
    score: 0.54,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "492/22.5T8MTS.P1.S1",
      "Data": "12/05/2022",
      "Relator Nome Profissional": { Show: ["Conselheiro Domingos Morais"], Original: ["Domingos Morais"], Index: ["Domingos Morais"] },
      "Área": { Show: ["Área Social"], Original: ["Área Social"], Index: ["Área Social"] },
      "Secção": { Show: ["4.ª Secção (Social)"], Original: ["4.ª Secção (Social)"], Index: ["4.ª Secção (Social)"] },
      "Decisão": { Show: ["Concedido Provimento"], Original: ["Concedido Provimento"], Index: ["Concedido Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Acidente de Trabalho", "Incapacidade Permanente", "Pensão Vitalícia"], Original: ["Acidente de Trabalho"], Index: ["Acidente de Trabalho"] },
      "Sumário": "I - É acidente de trabalho aquele que se verifique no local e no tempo de trabalho e produza direta ou indiretamente lesão corporal, perturbação funcional ou doença de que resulte redução na capacidade de ganho. II - A fixação da incapacidade permanente parcial determina a atribuição de capital de remição ou pensão vitalícia obrigatória.",
      "Texto": "Acordam na 4.ª Secção Social: Discute-se a aplicação da Tabela Nacional de Incapacidades e a eventual violação das regras de segurança e saúde no trabalho por parte da entidade patronal...",
      "ECLI": "ECLI:PT:STJ:2022:492.22.5T8MTS.P1.S1",
      "UUID": "doc-mock-10"
    } as any,
    score: 0.51,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "115/23.0YFLSB.S1",
      "Data": "17/02/2022",
      "Relator Nome Profissional": { Show: ["Conselheira Graça Amaral"], Original: ["Graça Amaral"], Index: ["Graça Amaral"] },
      "Área": { Show: ["Contencioso"], Original: ["Contencioso"], Index: ["Contencioso"] },
      "Secção": { Show: ["Secção Contencioso"], Original: ["Secção Contencioso"], Index: ["Secção Contencioso"] },
      "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Conselho Superior da Magistratura", "Deliberação", "Avaliação de Mérito"], Original: ["Conselho Superior da Magistratura"], Index: ["Conselho Superior da Magistratura"] },
      "Sumário": "I - O contencioso das deliberações do Conselho Superior da Magistratura rege-se pelas normas do processo administrativo, competindo ao Supremo Tribunal de Justiça o escrutínio da legalidade. II - Os juízos de mérito e valoração técnica emitidos pelo plenário em matéria inspetiva só admitem controlo judicial perante erro manifesto ou vício de forma.",
      "Texto": "Acordam na Secção de Contencioso do Supremo Tribunal de Justiça: O magistrado judicial impugnou a deliberação que manteve a notação de serviço atribuída em sede de inspeção ordinária...",
      "ECLI": "ECLI:PT:STJ:2022:115.23.0YFLSB.S1",
      "UUID": "doc-mock-11"
    } as any,
    score: 0.47,
    max_score: 1.0
  },
  {
    _source: {
      "Número de Processo": "734/18.1T8CBR.C1.S1",
      "Data": "11/11/2021",
      "Relator Nome Profissional": { Show: ["Conselheira Maria João Vaz Tomé"], Original: ["Maria João Vaz Tomé"], Index: ["Maria João Vaz Tomé"] },
      "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
      "Secção": { Show: ["2.ª Secção (Cível)"], Original: ["2.ª Secção (Cível)"], Index: ["2.ª Secção (Cível)"] },
      "Decisão": { Show: ["Concedido Provimento"], Original: ["Concedido Provimento"], Index: ["Concedido Provimento"] },
      "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
      "Descritores": { Show: ["Responsabilidade Médica", "Erro de Diagnóstico", "Consentimento Informado"], Original: ["Responsabilidade Médica"], Index: ["Responsabilidade Médica"] },
      "Sumário": "I - A responsabilidade civil do médico por violação do dever de esclarecimento e obtenção do consentimento informado configura responsabilidade contratual decorrente do contrato de prestação de serviços médicos. II - A omissão de riscos cirúrgicos conhecidos e previsíveis compromete a autodeterminação do doente e gera obrigação de indemnizar.",
      "Texto": "Acordam no Supremo Tribunal de Justiça: A autora demandou o estabelecimento hospitalar e o médico cirurgião reclamando indemnização por sequelas neurológicas permanentes decorrentes de cirurgia...",
      "ECLI": "ECLI:PT:STJ:2021:734.18.1T8CBR.C1.S1",
      "UUID": "doc-mock-12"
    } as any,
    score: 0.43,
    max_score: 1.0
  }
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterMockDecisions(
  query?: string,
  areaFilter?: string
): SearchHandlerResponseItem[] {
  let list = [...MOCK_DECISIONS];

  if (areaFilter && areaFilter.trim().length > 0) {
    const normArea = normalize(areaFilter);
    list = list.filter(item => {
      const areas = item._source?.Área?.Show || item._source?.Área?.Original || [];
      return areas.some((a: string) => normalize(a).includes(normArea));
    });
  }

  if (query && query.trim().length > 0) {
    const normQuery = normalize(query);
    const tokens = normQuery.split(/\s+/).filter(Boolean);

    list = list.filter(item => {
      const src = item._source || {};
      const fieldsToSearch = [
        src["Número de Processo"] || "",
        src.Sumário || "",
        src.Texto || "",
        ...(src["Relator Nome Profissional"]?.Show || []),
        ...(src.Descritores?.Show || []),
        ...(src.Decisão?.Show || []),
        ...(src.Secção?.Show || []),
        ...(src.Área?.Show || [])
      ].map(f => normalize(String(f)));

      // Todas as palavras da pesquisa têm de encontrar correspondência em pelo menos um dos campos
      return tokens.every(token =>
        fieldsToSearch.some(field => field.includes(token))
      );
    });
  }

  return list;
}
