// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import search, { createQueryDslQueryContainer, filterableProps, parseSort, populateFilters, RESULTS_PER_PAGE, SearchFilters } from '@/core/elasticsearch';
import LoggerApi from '@/core/logger-api';
import { authenticatedHandler } from '@/core/user/authenticate';
import { HighlightFragment, SearchHandlerResponse, SearchHandlerResponseItem } from '@/types/search';
import { SearchHighlight, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { JurisprudenciaDocumentKey } from '@stjiris/jurisprudencia-document';
import type { NextApiRequest, NextApiResponse } from 'next'

const useSource: JurisprudenciaDocumentKey[] = ["ECLI","Número de Processo","UUID","Data","Área","Meio Processual","Relator Nome Profissional","Secção","Votação","Decisão","Descritores","Sumário","Texto","STATE"]
       
export default LoggerApi(async function searchHandler(
  req: NextApiRequest,
  res: NextApiResponse<SearchHandlerResponse>
) {
    const sfilters: SearchFilters = {pre: [], after: []};
    populateFilters(sfilters, req.query)
    const imgParam = (Array.isArray(req.query?.IMG) ? req.query.IMG[0] : req.query?.IMG)
                  || (Array.isArray(req.query?.img) ? req.query.img[0] : req.query?.img);
    if (imgParam && ["s", "sim", "1", "true", "yes", "y"].includes(imgParam.toLowerCase().trim())) {
        sfilters.pre.push({
            term: {
                hasImages: true
            }
        });
    }
    const sort: SortCombinations[] = [];
    parseSort(Array.isArray(req.query?.sort) ? req.query.sort[0] : req.query.sort, sort)
    const page = parseInt(Array.isArray(req.query.page) ? req.query.page[0] : req.query.page || "" ) || 0
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
                pre_tags: [""],
                post_tags: [""],
                number_of_fragments: 0           
            },
            "Sumário": {
                type: "fvh",
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
    }
    const authed = await authenticatedHandler(req);
    const r: SearchHandlerResponse = [];
    try {
        const result = await search(queryObj, sfilters, page, {}, RESULTS_PER_PAGE, {sort, highlight, track_scores: true, _source: useSource}, authed);
        for( let hit of result.hits.hits ){
            const {Texto, "Relator Nome Completo": _completo, HASH: _HASH, ...rest} = hit._source!
            if(hit.highlight){
                let highlight: Record<string, (string | HighlightFragment)[]> = {
                    Descritores: hit.highlight["Descritores.Show"],
                    Sumário: hit.highlight.Sumário
                };
                let SumárioMarks = undefined;
                if( hit.highlight.Sumário ){
                    SumárioMarks = [] as HighlightFragment[];
                    let it = hit.highlight.Sumário[0].matchAll(/[^>]{0,100}<mark>(?<mat>\w+)<\/mark>[^<]{0,100}/g)
                    if( it ){
                        for( let m of it ){
                            let mat = m.groups?.mat || ""
                            SumárioMarks.push({
                                textFragment: m[0],
                                textMatch: mat,
                                offset: m.index || 0,
                                size: hit._source?.Sumário?.length || 0
                            })
                        }
                    }
                    highlight.SumárioMarks = SumárioMarks;
                }

                if( hit.highlight.Texto ){
                    highlight.Texto = []
                    for(let i = 0; i < hit.highlight.Texto.length; i++){
                        let text = hit.highlight.Texto[i];
                        let mat = text.match(/MARK_START(?<mat>.*?)MARK_END/)?.groups?.mat || "";
                        highlight.Texto.push({
                            textFragment: text.replace(/<[^>]+>/g, "").replace(/MARK_START/g, "<mark>").replace(/MARK_END/g, "</mark>").replace(/<\/?\w*$/, ""),
                            textMatch: mat,
                            offset: hit._source?.Texto?.indexOf(text.substring(0, text.indexOf("MARK_START"))) || 0,
                            size: hit._source?.Texto?.length || 0,
                        })
                    }
                }

                r.push({
                    highlight,
                    _source: rest,
                    score: hit._score || 1,
                    max_score: result.hits.max_score || 1
                })
            }
            else{
                r.push({
                    _source: rest,
                    score: hit._score || 1,
                    max_score: result.hits.max_score || 1
                })
            }
        }
    } catch (e) {
        console.warn("[Search API] Elasticsearch indisponível. A utilizar acórdãos de demonstração de referência.");
        const qStr = Array.isArray(req.query.q) ? req.query.q.join(" ") : req.query.q || "";
        return res.status(200).json(getDemoSearchResults(qStr));
    }

    res.status(200).json(r);

});

function getDemoSearchResults(q?: string): SearchHandlerResponse {
    const demoItems: SearchHandlerResponseItem[] = [
        {
            _source: {
                "Número de Processo": "4624/21.4T8GMR.L1.S1",
                "UUID": "j7BiHNzjE-L4EYhf55_xpdx-cQk",
                "Data": "15-01-2025",
                "Área": { Show: "Área Social", Index: "social" } as any,
                "Secção": { Show: "Secção Social", Original: ["Secção Social"] } as any,
                "Relator Nome Profissional": { Show: "Mário Belo Morgado", Original: ["Mário Belo Morgado"] } as any,
                "Descritores": {
                    Show: ["Ação de anulação e interpretação de cláusula de CCT", "Acordo de empresa", "Convenção coletiva de trabalho", "Nulidade", "Atividade bancária", "Segurança Social"],
                    Original: ["Ação de anulação e interpretação de cláusula de CCT", "Acordo de empresa", "Convenção coletiva de trabalho", "Nulidade", "Atividade bancária", "Segurança Social"]
                } as any,
                "Meio Processual": { Show: ["Revista"], Original: ["Revista"] } as any,
                "Decisão": { Show: ["Concedida a revista"], Original: ["Concedida a revista"] } as any,
                "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"] } as any,
                "Sumário": "I - No período subsequente à integração dos trabalhadores oriundos do BANIF no banco Santander Totta, estes continuaram abrangidos pelo acordo de empresa (AE) celebrado entre o Banif – Banco Internacional do Funchal, S. A., o Sindicato Nacional dos Quadros e Técnicos Bancários, o Sindicato Independente da Banca e os trabalhadores ao serviço daquele banco representados por estes sindicatos, e, assim, sujeitos ao regime de Segurança Social aí consagrado.\n\nII - A cláusula 23.ª deste AE estipulava que os trabalhadores do Banif “beneficiam do regime de proteção na doença, nos precisos termos que, em cada momento, se encontrem previstos no acordo coletivo de trabalho do sector bancário, outorgado pelo banco e pelos sindicatos signatários deste acordo”.\n\nIII - A cláusula 115.ª do atual ACT – que é posterior ao momento da integração dos trabalhadores do Banif no banco Santander – estipula no seu n.º 1 que àqueles trabalhadores será “exclusivamente aplicável o regime de segurança social previsto nas cláusulas 12.ª a 16.ª, 18.ª e 19.ª do acordo de empresa”.",
                "STATE": "público"
            },
            score: 1,
            max_score: 1
        },
        {
            _source: {
                "Número de Processo": "2638/18.0T8VCT-B.G1.S1",
                "UUID": "xwXMyldLpNCEMqU1O20",
                "Data": "15-01-2025",
                "Área": { Show: "Área Social", Index: "social" } as any,
                "Secção": { Show: "Secção Social", Original: ["Secção Social"] } as any,
                "Relator Nome Profissional": { Show: "Júlio Gomes", Original: ["Júlio Gomes"] } as any,
                "Descritores": {
                    Show: ["Competência material", "Tribunal do Trabalho", "Acidente de trabalho"],
                    Original: ["Competência material", "Tribunal do Trabalho", "Acidente de trabalho"]
                } as any,
                "Meio Processual": { Show: ["Revista"], Original: ["Revista"] } as any,
                "Decisão": { Show: ["Negada a revista"], Original: ["Negada a revista"] } as any,
                "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"] } as any,
                "Sumário": "I - O conceito de representante para efeitos do art. 18.º da LAT abrange todos os que exercem poderes próprios do empregador no local de trabalho e são responsáveis pelo cumprimento das regras de segurança e saúde no local de trabalho.\n\nII - Uma vez que no processo de trabalho, mormente na fase conciliatória, não foi alegada a violação culposa de regras de segurança, nem convocados os referidos representantes, fica precludida a invocação em processo posterior da alegada violação.",
                "STATE": "público"
            },
            score: 1,
            max_score: 1
        },
        {
            _source: {
                "Número de Processo": "174/21.0T8PNF.P1.S1",
                "UUID": "vlkAMZN294_194j29a",
                "Data": "20-02-2026",
                "Área": { Show: "Área Cível", Index: "civel" } as any,
                "Secção": { Show: "1.ª Secção", Original: ["1.ª Secção"] } as any,
                "Relator Nome Profissional": { Show: "Graça Araújo", Original: ["Graça Araújo"] } as any,
                "Descritores": {
                    Show: ["Impugnação pauliana", "Herança indivisa", "Quinhão hereditário", "Penhora"],
                    Original: ["Impugnação pauliana", "Herança indivisa", "Quinhão hereditário", "Penhora"]
                } as any,
                "Meio Processual": { Show: ["Revista"], Original: ["Revista"] } as any,
                "Decisão": { Show: ["Concedida a revista"], Original: ["Concedida a revista"] } as any,
                "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"] } as any,
                "Sumário": "I - A impugnação pauliana visa a reparação do prejuízo sofrido pelo credor em virtude de atos praticados pelo devedor que diminuam a garantia patrimonial do crédito.\n\nII - A penhora do direito e ação sobre quota-parte em herança indivisa não obsta à procedência da impugnação pauliana contra atos fraudulentos de partilha que esvaziem a referida garantia patrimonial.",
                "STATE": "público"
            },
            score: 1,
            max_score: 1
        },
        {
            _source: {
                "Número de Processo": "1121/24.0T9PFR.S1",
                "UUID": "kdlPGMSJJnnGFdMPeBs",
                "Data": "30-06-2026",
                "Área": { Show: "Área Criminal", Index: "criminal" } as any,
                "Secção": { Show: "3.ª Secção", Original: ["3.ª Secção"] } as any,
                "Relator Nome Profissional": { Show: "Maria Margarida Almeida", Original: ["Maria Margarida Almeida"] } as any,
                "Descritores": {
                    Show: ["Recurso per saltum", "Nulidade de acórdão", "Omissão de pronúncia"],
                    Original: ["Recurso per saltum", "Nulidade de acórdão", "Omissão de pronúncia"]
                } as any,
                "Meio Processual": { Show: ["Recurso"], Original: ["Recurso"] } as any,
                "Decisão": { Show: ["Não provido"], Original: ["Não provido"] } as any,
                "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"] } as any,
                "Sumário": "I - A arguição de nulidade por omissão de pronúncia exige que o tribunal tenha deixado de conhecer de questões essenciais que lhe foram submetidas.\n\nII - Mostrando-se a fundamentação jurídica consentânea e suficiente, improcede a alegada nulidade do acórdão recorrido.",
                "STATE": "público"
            },
            score: 1,
            max_score: 1
        },
        {
            _source: {
                "Número de Processo": "3215/23.0JABRG.G1.S1",
                "UUID": "znmbq0192837465abc",
                "Data": "18-06-2026",
                "Área": { Show: "Área Criminal", Index: "criminal" } as any,
                "Secção": { Show: "3.ª Secção", Original: ["3.ª Secção"] } as any,
                "Relator Nome Profissional": { Show: "Maria Margarida Almeida", Original: ["Maria Margarida Almeida"] } as any,
                "Descritores": {
                    Show: ["Habeas Corpus", "Prisão preventiva", "Prazos de duração máxima"],
                    Original: ["Habeas Corpus", "Prisão preventiva", "Prazos de duração máxima"]
                } as any,
                "Meio Processual": { Show: ["Habeas Corpus"], Original: ["Habeas Corpus"] } as any,
                "Decisão": { Show: ["Indeferido"], Original: ["Indeferido"] } as any,
                "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"] } as any,
                "Sumário": "I - A providência de habeas corpus tem natureza extraordinária e visa exclusivamente sancionar situações de ilegalidade grosseira da prisão.\n\nII - Encontrando-se a prisão preventiva validamente decretada e dentro dos prazos legais do Código de Processo Penal, inexiste fundamento para a libertação imediata.",
                "STATE": "público"
            },
            score: 1,
            max_score: 1
        }
    ];

    if (!q || !q.trim()) return demoItems;
    const term = q.toLowerCase().trim();
    return demoItems.filter(item => {
        const src: any = item._source;
        const proc = (src["Número de Processo"] || "").toLowerCase();
        const sum = (src.Sumário || "").toLowerCase();
        const rel = ((src["Relator Nome Profissional"]?.Show as any) || "").toString().toLowerCase();
        const descs = Array.isArray(src.Descritores?.Show) ? src.Descritores.Show.join(" ").toLowerCase() : "";
        return proc.includes(term) || sum.includes(term) || rel.includes(term) || descs.includes(term);
    });
}
