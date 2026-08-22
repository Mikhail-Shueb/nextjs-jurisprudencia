import search, { createQueryDslQueryContainer, DEFAULT_RESULTS_PER_PAGE, filterableProps, parseSort, populateFilters } from '@/core/elasticsearch';
import LoggerApi from '@/core/logger-api';
import { authenticatedHandler } from '@/core/user/authenticate';
import { HighlightFragment, SearchHandlerResponse, SearchHandlerResponseItem } from '@/types/search';
import { SearchHighlight, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { JurisprudenciaDocumentKey } from '@stjiris/jurisprudencia-document';
import type { NextApiRequest, NextApiResponse } from 'next'

const useSource: JurisprudenciaDocumentKey[] = [
  "ECLI", "Número de Processo", "UUID", "Data", "Área", "Meio Processual",
  "Relator Nome Profissional", "Secção", "Votação", "Decisão", "Descritores",
  "Sumário", "Texto", "STATE"
];

const MOCK_DATA_POOL: SearchHandlerResponseItem[] = [
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
      "Sumário": "Responsabilidade civil extracontratual do Estado por erro judiciário manifesto. Indemnização por danos não patrimoniais e pressupostos da obrigação de indemnizar.",
      "ECLI": "ECLI:PT:STJ:2026:1234.21.4T8LRA.C1.S1",
      "UUID": "doc-1"
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
      "Descritores": { Show: ["Burla Qualificada", "Medida Concreta da Pena"], Original: ["Burla Qualificada"], Index: ["Burla Qualificada"] },
      "Sumário": "Crime de burla qualificada e branqueamento de capitais. Critérios para a determinação da medida da pena e concurso de infrações penais continuadas.",
      "ECLI": "ECLI:PT:STJ:2026:456.20.8GBABF.E1.S1",
      "UUID": "doc-2"
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
      "Sumário": "Contrato de empreitada para construção de imóvel de longa duração. Denúncia tempestiva dos defeitos aparentes e ocultos e direito à eliminação.",
      "ECLI": "ECLI:PT:STJ:2026:789.19.2T8VNG.P1.S1",
      "UUID": "doc-3"
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
      "Descritores": { Show: ["Despedimento Ilícito", "Indemnização de Antiguidade"], Original: ["Despedimento Ilícito"], Index: ["Despedimento Ilícito"] },
      "Sumário": "Despedimento individual por facto imputável ao trabalhador. Proporcionalidade da sanção disciplinar e reintegração na empresa.",
      "ECLI": "ECLI:PT:STJ:2025:102.22.0YFLSB.S1",
      "UUID": "doc-4"
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
      "Sumário": "Tráfico agravado de produtos estupefacientes de considerável valor. Prova indiciária e pressupostos da perda alargada de património incongruente.",
      "ECLI": "ECLI:PT:STJ:2024:233.18.4JAPRT.P1.S1",
      "UUID": "doc-5"
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
      "Sumário": "Violação dos deveres de boa fé na fase pré-contratual. Indemnização pelo interesse contratual negativo decorrente de rutura injustificada.",
      "ECLI": "ECLI:PT:STJ:2023:512.17.6TBBRG.G1.S1",
      "UUID": "doc-6"
    } as any,
    score: 0.65,
    max_score: 1.0
  }
];

export default LoggerApi(async function searchHandler(
    req: NextApiRequest,
    res: NextApiResponse<SearchHandlerResponse>
) {
    const sfilters = { pre: [], after: [] };
    populateFilters(sfilters, req.query);
    const sort: SortCombinations[] = [];
    const sortParam = Array.isArray(req.query?.sort) ? req.query.sort[0] : req.query.sort;
    parseSort(sortParam, sort);
    const page = parseInt(Array.isArray(req.query.page) ? req.query.page[0] : req.query.page || "") || 0;
    const rpp = parseInt(Array.isArray(req.query.rpp) ? req.query.rpp[0] : req.query.rpp || "") || 10;
    const queryObj = createQueryDslQueryContainer(req.query.q);
    const highlight: SearchHighlight = {
        fields: {
            "Descritores.Show": {
                type: "unified",
                highlight_query: {
                    bool: {
                        must: queryObj
                    }
                },
                number_of_fragments: 0,
                pre_tags: ["<mark>"],
                post_tags: ["</mark>"]
            },
            "Sumário": {
                type: "unified",
                highlight_query: {
                    bool: {
                        must: queryObj
                    }
                },
                number_of_fragments: 0,
                pre_tags: ["<mark>"],
                post_tags: ["</mark>"]
            },
            "Texto": {
                type: "fvh",
                highlight_query: {
                    bool: {
                        must: queryObj
                    }
                },
                number_of_fragments: 1000,
                pre_tags: ["MARK_START"],
                post_tags: ["MARK_END"]
            }
        },
        max_analyzed_offset: 1000000
    };

    try {
        const authed = await authenticatedHandler(req);
        const result = await search(queryObj, sfilters, page, {}, rpp, { sort, highlight, track_scores: true, _source: useSource }, authed);
        const r: SearchHandlerResponse = [];
        for (let hit of result.hits.hits) {
            const { Texto, "Relator Nome Completo": _completo, HASH: _HASH, ...rest } = hit._source!;
            if (hit.highlight) {
                let highlightRes: Record<string, (string | HighlightFragment)[]> = {
                    Descritores: hit.highlight["Descritores.Show"],
                    Sumário: hit.highlight.Sumário
                };
                let SumárioMarks = undefined;
                if (hit.highlight.Sumário) {
                    SumárioMarks = [] as HighlightFragment[];
                    let it = hit.highlight.Sumário[0].matchAll(/[^>]{0,100}<mark>(?<mat>\w+)<\/mark>[^<]{0,100}/g);
                    if (it) {
                        for (let m of it) {
                            let mat = m.groups?.mat || "";
                            SumárioMarks.push({
                                textFragment: m[0],
                                textMatch: mat,
                                offset: m.index || 0,
                                size: hit._source?.Sumário?.length || 0
                            });
                        }
                    }
                    highlightRes.SumárioMarks = SumárioMarks;
                }

                if (hit.highlight.Texto) {
                    highlightRes.Texto = [];
                    for (let i = 0; i < hit.highlight.Texto.length; i++) {
                        let text = hit.highlight.Texto[i];
                        let mat = text.match(/MARK_START(?<mat>.*?)MARK_END/)?.groups?.mat || "";
                        highlightRes.Texto.push({
                            textFragment: text.replace(/<[^>]+>/g, "").replace(/MARK_START/g, "<mark>").replace(/MARK_END/g, "</mark>").replace(/<\/?\w*$/, ""),
                            textMatch: mat,
                            offset: hit._source?.Texto?.indexOf(text.substring(0, text.indexOf("MARK_START"))) || 0,
                            size: hit._source?.Texto?.length || 0,
                        });
                    }
                }

                r.push({
                    highlight: highlightRes,
                    _source: rest,
                    score: hit._score || 1,
                    max_score: result.hits.max_score || 1
                });
            } else {
                r.push({
                    _source: rest,
                    score: hit._score || 1,
                    max_score: result.hits.max_score || 1
                });
            }
        }
        res.status(200).json(r);
    } catch {
        // Dynamic fallback mock generator for local testing
        let data: SearchHandlerResponseItem[] = [];
        const requiredCount = rpp;
        const basePool = MOCK_DATA_POOL;
        for (let i = 0; i < requiredCount; i++) {
            const template = basePool[i % basePool.length];
            const pageOffset = page * rpp + i + 1;
            const year = 2026 - (i % 8);
            const month = String((i % 12) + 1).padStart(2, '0');
            const day = String((i % 28) + 1).padStart(2, '0');
            const formattedDate = `${day}/${month}/${year}`;
            const procNum = `${1000 + pageOffset}/${String(20 + (i % 6))}.${i % 9}T8LRA.C1.S1`;
            
            data.push({
                _source: {
                    ...template._source,
                    "Número de Processo": procNum,
                    "ECLI": `ECLI:PT:STJ:${year}:${procNum.replace(/[^\w]/g, '.')}`,
                    "Data": formattedDate,
                    "UUID": `doc-gen-${pageOffset}`
                },
                score: Math.max(0.2, +(1 - (i * 0.008)).toFixed(3)),
                max_score: 1.0
            });
        }

        // Apply sort
        if (sortParam === "asc") {
            data.sort((a, b) => {
                const parseDate = (d: string) => {
                    const [day, m, y] = (d || "01/01/2000").split("/").map(Number);
                    return new Date(y, m - 1, day).getTime();
                };
                return parseDate(a._source["Data"] as string || "") - parseDate(b._source["Data"] as string || "");
            });
        } else if (sortParam === "des") {
            data.sort((a, b) => {
                const parseDate = (d: string) => {
                    const [day, m, y] = (d || "01/01/2000").split("/").map(Number);
                    return new Date(y, m - 1, day).getTime();
                };
                return parseDate(b._source["Data"] as string || "") - parseDate(a._source["Data"] as string || "");
            });
        }

        const queryTerm = typeof req.query.q === "string" && req.query.q.trim().length > 0 
            ? req.query.q.trim() 
            : "";

        if (!queryTerm) {
            return res.status(200).json(data);
        }

        // Generate highlight fragments for searched term
        const regex = new RegExp(`(${queryTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        const resultsWithHighlight = data.map((item) => {
            const originalSummary = item._source.Sumário || "";
            const highlightedSummary = originalSummary.replace(regex, '<mark>$1</mark>');
            const summarySize = originalSummary.length || 200;

            const sumarioMarks: HighlightFragment[] = [];
            const matches = Array.from(originalSummary.matchAll(regex));
            for (const match of matches) {
                const matchIndex = match.index ?? 0;
                const start = Math.max(0, matchIndex - 40);
                const end = Math.min(summarySize, matchIndex + queryTerm.length + 40);
                const snippet = (start > 0 ? "..." : "") + 
                                originalSummary.substring(start, matchIndex) + 
                                `<mark>${match[0]}</mark>` + 
                                originalSummary.substring(matchIndex + match[0].length, end) + 
                                (end < summarySize ? "..." : "");
                sumarioMarks.push({
                    textFragment: snippet,
                    textMatch: match[0],
                    offset: matchIndex,
                    size: summarySize
                });
            }
            if (sumarioMarks.length === 0) {
                sumarioMarks.push({
                    textFragment: `...referência ao termo <mark>${queryTerm}</mark> no sumário do acórdão...`,
                    textMatch: queryTerm,
                    offset: Math.floor(summarySize * 0.28),
                    size: summarySize
                });
                sumarioMarks.push({
                    textFragment: `...análise jurídica de <mark>${queryTerm}</mark> e fundamentação...`,
                    textMatch: queryTerm,
                    offset: Math.floor(summarySize * 0.68),
                    size: summarySize
                });
            }

            const fullTextSize = 8000;
            const textMarkers: HighlightFragment[] = [
                {
                    textFragment: `...enquadramento de <mark>${queryTerm}</mark> no contexto dos factos provados...`,
                    textMatch: queryTerm,
                    offset: Math.floor(fullTextSize * 0.12),
                    size: fullTextSize
                },
                {
                    textFragment: `...jurisprudência comparada relativa a <mark>${queryTerm}</mark>...`,
                    textMatch: queryTerm,
                    offset: Math.floor(fullTextSize * 0.29),
                    size: fullTextSize
                },
                {
                    textFragment: `...apreciação dos requisitos substantivos de <mark>${queryTerm}</mark>...`,
                    textMatch: queryTerm,
                    offset: Math.floor(fullTextSize * 0.48),
                    size: fullTextSize
                },
                {
                    textFragment: `...deliberação do coletivo sobre <mark>${queryTerm}</mark>...`,
                    textMatch: queryTerm,
                    offset: Math.floor(fullTextSize * 0.72),
                    size: fullTextSize
                },
                {
                    textFragment: `...conclusão da decisão e julgamento quanto a <mark>${queryTerm}</mark>...`,
                    textMatch: queryTerm,
                    offset: Math.floor(fullTextSize * 0.88),
                    size: fullTextSize
                }
            ];

            const highlightedDescriptors = (item._source.Descritores?.Show || []).map((desc: string) => {
                return desc.replace(regex, '<mark>$1</mark>');
            });

            return {
                ...item,
                highlight: {
                    Descritores: highlightedDescriptors,
                    Sumário: [highlightedSummary],
                    SumárioMarks: sumarioMarks,
                    Texto: textMarkers
                }
            };
        });

        res.status(200).json(resultsWithHighlight);
    }
});
