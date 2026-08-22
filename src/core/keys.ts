import { JurisprudenciaKey, KEYS_INFO_INDEX_VERSION, KEYS_INFO_PROPERTIES, makeValidValue } from "@/types/keys";
import { getElasticSearchClient } from "./elasticsearch";
import { JurisprudenciaDocumentKey, JurisprudenciaDocumentKeys } from "@stjiris/jurisprudencia-document";
import { Client } from "@elastic/elasticsearch";

async function getClient(): Promise<Client> {
    let client = await getElasticSearchClient();
    try {
        if (!(await client.indices.exists({ index: KEYS_INFO_INDEX_VERSION }))) {
            await client.indices.create({
                index: KEYS_INFO_INDEX_VERSION,
                mappings: {
                    properties: KEYS_INFO_PROPERTIES
                },
                settings: {
                    number_of_shards: 1,
                    number_of_replicas: 0,
                    refresh_interval: "1s"
                }
            }).catch(e => {
                console.log(e)
            });
            await client.bulk<JurisprudenciaKey, JurisprudenciaKey>({
                index: KEYS_INFO_INDEX_VERSION,
                operations: JurisprudenciaDocumentKeys.flatMap((key, i) => [
                    { create: {} },
                    { key: key, name: key, description: KEY_DESCRIPTIONS[key] || "Sem descrição", active: false, filtersSuggest: false, filtersShow: false, filtersOrder: i + 1, indicesList: false, indicesGroup: false, documentShow: false, authentication: false, editorEnabled: false, editorRestricted: false, editorSuggestions: false }
                ])
            })
        }
        else {
            let r = await client.search<JurisprudenciaKey>({
                index: KEYS_INFO_INDEX_VERSION,
                size: 1000
            })

            // Deduplicate: for each key, keep the entry with the most boolean flags set to true
            const countTrue = (src: any) => Object.values(src ?? {}).filter(v => v === true).length;
            const bestByKey = new Map<string, { id: string, score: number, source: JurisprudenciaKey }>();
            for (const hit of r.hits.hits) {
                const k = hit._source?.key;
                if (!k || !hit._id) continue;
                const score = countTrue(hit._source);
                const existing = bestByKey.get(k);
                if (!existing || score > existing.score) {
                    bestByKey.set(k, { id: hit._id, score, source: hit._source! });
                }
            }
            const keepIds = new Set(Array.from(bestByKey.values()).map(v => v.id));
            const toDelete: string[] = r.hits.hits
                .filter(h => h._id && !keepIds.has(h._id))
                .map(h => h._id!);
            const seenKeys = new Set(bestByKey.keys());
            if (toDelete.length > 0) {
                console.log(`keys-info: removing ${toDelete.length} duplicate entries`);
                await client.bulk({
                    operations: toDelete.map(id => ({ delete: { _index: KEYS_INFO_INDEX_VERSION, _id: id } })),
                    refresh: "true"
                });
            }

            // Add any keys present in v13 but missing from the index
            const missingKeys = JurisprudenciaDocumentKeys.filter(k => !seenKeys.has(k));
            if (missingKeys.length > 0) {
                console.log(`keys-info: adding ${missingKeys.length} missing keys: ${missingKeys.join(", ")}`);
                await client.bulk<JurisprudenciaKey, JurisprudenciaKey>({
                    index: KEYS_INFO_INDEX_VERSION,
                    operations: missingKeys.flatMap((key, i) => [
                        { create: {} },
                        { key: key, name: key, description: KEY_DESCRIPTIONS[key] || "Sem descrição", active: false, filtersSuggest: false, filtersShow: false, filtersOrder: seenKeys.size + i + 1, indicesList: false, indicesGroup: false, documentShow: false, authentication: false, editorEnabled: false, editorRestricted: false, editorSuggestions: false }
                    ]),
                    refresh: "true"
                });
            }
        }
    } catch {
        // cluster offline
    }
    return client;
}

const KEY_DESCRIPTIONS: Record<string, string> = {
    "Área": "Índice que agrupa os acórdãos pelas respetivas áreas jurídicas substantivas e materiais (Cível, Criminal, Social e Contencioso).",
    "Secção": "Índice que organiza as decisões pelas secções judiciais especializadas do Supremo Tribunal de Justiça.",
    "Decisão": "Índice que sistematiza os sentidos decisórios proferidos nas deliberações (Negado Provimento, Concedido, Parcialmente Concedido, etc.).",
    "Votação": "Índice do tipo de votação do coletivo de juízes (Unanimidade ou Maioria com votos de vencido).",
    "Relator Nome Profissional": "Índice dos Juízes Conselheiros que assumiram a relatoria dos processos no STJ.",
    "Relator Nome Completo": "Índice por nome completo dos Juízes Conselheiros relatores.",
    "Descritores": "Índice temático e conceptual de descritores jurídicos normalizados atribuídos a cada acórdão.",
    "Meio Processual": "Índice das formas processuais e espécies de recurso (Recurso de Revista, Agravo, Reclamação, etc.).",
    "Tribunal de Recurso": "Índice dos tribunais recorridos de origem (Tribunais da Relação e instâncias inferiores).",
    "Tribunal de Recurso - Processo": "Índice dos processos judiciais nas instâncias recorridas.",
    "ECLI": "Índice de identificadores europeus uniformes de jurisprudência (European Case Law Identifier).",
    "Número de Processo": "Índice por número de processo judicial no Supremo Tribunal de Justiça.",
    "Data": "Índice cronológico de prolação das decisões do tribunal.",
    "Tipo": "Índice da natureza da decisão judicial (Acórdão, Decisão Singular, etc.).",
    "Sumário": "Campo com o sumário e súmula jurídica oficial da decisão.",
    "Texto": "Campo com a fundamentação e o texto integral do acórdão."
};

const FALLBACK_KEYS: JurisprudenciaKey[] = JurisprudenciaDocumentKeys.map((key, i) => ({
    key: key,
    name: key,
    description: KEY_DESCRIPTIONS[key] || "Índice de pesquisa e classificação da jurisprudência do Supremo Tribunal de Justiça.",
    active: true,
    filtersSuggest: true,
    filtersShow: true,
    filtersOrder: i + 1,
    indicesList: true,
    indicesGroup: true,
    documentShow: true,
    authentication: false,
    editorEnabled: true,
    editorRestricted: false,
    editorSuggestions: true
}));

export async function getAllKeys(authed: boolean = false) {
    try {
        let client = await getClient();
        return await client.search<JurisprudenciaKey>({
            index: KEYS_INFO_INDEX_VERSION,
            size: 1000,
            sort: [{
                "filtersOrder": "asc"
            }, {
                "key": "asc"
            }]
        }).then(r => r.hits.hits.map<JurisprudenciaKey>(({ _source: key }) => {
            if (!key) throw new Error("Unreachable");

            if (!authed && key.authentication) {
                return {
                    key: key.key,
                    name: key.name,
                    description: key.description,
                    filtersOrder: key.filtersOrder,
                    active: false,
                    authentication: true,
                    documentShow: false,
                    filtersShow: false,
                    filtersSuggest: false,
                    indicesGroup: false,
                    indicesList: false,
                    editorEnabled: false,
                    editorRestricted: false,
                    editorSuggestions: false
                }
            }

            return key;
        }));
    } catch {
        return FALLBACK_KEYS;
    }
}

export async function getKey(k: JurisprudenciaDocumentKey): Promise<JurisprudenciaKey> {
    try {
        let client = await getClient();
        let r = await client.search<JurisprudenciaKey>({ index: KEYS_INFO_INDEX_VERSION, query: { term: { key: k } } });
        if (r.hits.hits[0]?._source) {
            return r.hits.hits[0]._source;
        }
    } catch {
        // cluster offline
    }
    return FALLBACK_KEYS.find(key => key.key === k) || {
        key: k,
        name: k,
        description: "Sem descrição",
        active: true,
        filtersSuggest: true,
        filtersShow: true,
        filtersOrder: 1,
        indicesList: true,
        indicesGroup: true,
        documentShow: true,
        authentication: false,
        editorEnabled: true,
        editorRestricted: false,
        editorSuggestions: true
    };
}

export async function updateKey(key: JurisprudenciaDocumentKey, update: Partial<JurisprudenciaKey>) {
    let client = await getClient();

    let r = await client.search<JurisprudenciaKey>({
        index: KEYS_INFO_INDEX_VERSION,
        query: {
            term: {
                "key": key
            }
        }
    });
    let hit = r.hits.hits[0];
    if (!hit || !hit._id) return;

    // if update a boolean that it's dependent of other update it
    if (update.indicesGroup) update.indicesList = true;
    if (update.filtersSuggest || update.filtersShow || update.indicesList) update.active = true;
    if (update.editorRestricted) update.editorSuggestions = true;
    if (update.editorSuggestions) update.editorEnabled = true;

    // Can never update internal key
    update = makeValidValue({ ...hit._source!, ...update, key: key })

    return await client.update<JurisprudenciaKey>({
        index: KEYS_INFO_INDEX_VERSION,
        id: hit._id,
        doc: update,
        refresh: "true"
    })
}
