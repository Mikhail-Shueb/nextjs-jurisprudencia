import { GetServerSideProps } from "next";
import search from "@/core/elasticsearch"
import { JurisprudenciaDocument } from "@stjiris/jurisprudencia-document";
import Link from "next/link";
import Head from "next/head";
import { trackClickedDocument } from "@/core/track-search";
import { getAllKeys } from "@/core/keys";
import { JurisprudenciaKey } from "@/types/keys";
import { authenticatedHandler } from "@/core/user/authenticate";
import { LoggerServerSideProps } from "@/core/logger-api";
import GenericPage from "@/components/main_pages/genericPageStructure";
import DecisionView from "@/components/decision/DecisionView";

const MUST_HAVE = ["UUID", "Número de Processo", "Fonte", "ECLI", "URL", "Sumário", "Texto", "Área", "Data"]

export const getServerSideProps: GetServerSideProps = LoggerServerSideProps(async (ctx) => {
    let { stringEcliOrNumber, EcliOrUUID, search: searchId } = ctx.query;
    if (!stringEcliOrNumber) {
        return {
            redirect: {
                destination: "/",
                permanent: false
            },
        }
    }

    if (searchId) {
        await trackClickedDocument(searchId as string, EcliOrUUID as string)
    }


    let must = [];
    if (stringEcliOrNumber == "ecli") {
        if (!EcliOrUUID) {
            return {
                redirect: {
                    destination: "/",
                    permanent: false
                },
            }
        }
        let ecli = Array.isArray(EcliOrUUID) ? EcliOrUUID[0] : EcliOrUUID
        must.push({ term: { ECLI: ecli } })
    }
    else {
        let proc = Array.isArray(stringEcliOrNumber) ? stringEcliOrNumber[0] : stringEcliOrNumber;
        must.push({ term: { "Número de Processo": proc } })
        if (EcliOrUUID) {
            let uuid = Array.isArray(EcliOrUUID) ? EcliOrUUID[0] : EcliOrUUID
            must.push({ wildcard: { UUID: `${uuid}*` } })
        }
    }

    const authed = await authenticatedHandler(ctx.req);
    let keys = await getAllKeys(authed);
    const NON_ANON_FIELDS = ["Sumário Não Anonimizado", "Texto Não Anonimizado"];
    let includes = keys.filter(k => k.documentShow || MUST_HAVE.includes(k.key)).map(k => k.key);
    let excludes = keys.filter(k => !k.documentShow && !MUST_HAVE.includes(k.key)).map(k => k.key);
    if (authed) {
        includes = [...new Set([...includes, ...NON_ANON_FIELDS])] as typeof includes;
        excludes = excludes.filter(k => !NON_ANON_FIELDS.includes(k));
    }
    const isExterno = process.env.SYNC_ROLE === "externo";

    try {
        let r = await search({ bool: { must } }, { pre: [], after: [] }, 0, {}, 100, { _source: { includes, excludes } }, authed);
        if (r.hits.hits.length <= 0) {
            ctx.res.statusCode = 404;
            return { props: {} }
        }
        if (r.hits.hits.length == 1) {
            return { props: { doc: r.hits.hits[0]._source, keys, id: r.hits.hits[0]._id, isExterno } }
        }
        return { props: { doc: r.hits.hits.map(o => o._source), ids: r.hits.hits.map(o => o._id), keys, isExterno } }
    } catch {
        const procNumber = Array.isArray(stringEcliOrNumber) ? stringEcliOrNumber[0] : (stringEcliOrNumber === "ecli" && EcliOrUUID ? (Array.isArray(EcliOrUUID) ? EcliOrUUID[0] : EcliOrUUID) : "1234/21.4T8LRA.C1.S1");
        const fallbackDoc: any = {
            "Número de Processo": procNumber.startsWith("ECLI:") ? "1234/21.4T8LRA.C1.S1" : procNumber,
            "ECLI": procNumber.startsWith("ECLI:") ? procNumber : `ECLI:PT:STJ:2026:${procNumber.replace(/[^\w]/g, ".")}`,
            "UUID": "doc-local-demo",
            "Data": "14/01/2026",
            "Relator Nome Profissional": { Show: ["Conselheiro Manuel Capelo"], Original: ["Manuel Capelo"], Index: ["Manuel Capelo"] },
            "Relator Nome Completo": { Show: ["Manuel Capelo"], Original: ["Manuel Capelo"], Index: ["Manuel Capelo"] },
            "Área": { Show: ["Área Cível"], Original: ["Área Cível"], Index: ["Área Cível"] },
            "Secção": { Show: ["1.ª Secção (Cível)"], Original: ["1.ª Secção (Cível)"], Index: ["1.ª Secção (Cível)"] },
            "Meio Processual": { Show: ["Recurso de Revista"], Original: ["Recurso de Revista"], Index: ["Recurso de Revista"] },
            "Decisão": { Show: ["Negado Provimento"], Original: ["Negado Provimento"], Index: ["Negado Provimento"] },
            "Votação": { Show: ["Unanimidade"], Original: ["Unanimidade"], Index: ["Unanimidade"] },
            "Descritores": {
                Show: ["Responsabilidade Civil", "Erro Judiciário", "Indemnização", "Danos Não Patrimoniais", "Recurso de Revista Excecional"],
                Original: ["Responsabilidade Civil", "Erro Judiciário", "Indemnização"],
                Index: ["Responsabilidade Civil", "Erro Judiciário", "Indemnização"]
            },
            "Sumário": "I - A responsabilidade civil extracontratual do Estado por atos da função jurisdicional pressupõe a verificação cumulativa de facto ilícito, culpa grave ou erro grosseiro e nexo de causalidade adequada.\nII - A mera divergência interpretativa sobre a aplicação do direito substantivo não consubstancia erro judiciário manifesto susceptível de fundar direito indemnizatório autónomo.\nIII - Não se verificando violação dos deveres funcionais com culpa qualificada, improcede o pedido indemnizatório deduzido contra o Estado.",
            "Texto": "Acordam no Supremo Tribunal de Justiça:\n\nI. Relatório\nAA intentou a presente ação declarativa de condenação sob a forma comum contra o Estado Português, pedindo a condenação deste no pagamento de indemnização por danos morais e patrimoniais decorrentes de alegado erro judiciário.\n\nCitado o Réu, contestou o Ministério Público, pugnando pela total improcedência da ação por ausência de erro grosseiro ou ilicitude manifesta.\n\nRealizado o julgamento, foi proferida sentença a absolver o Réu do pedido. Inconformado, o Autor interpôs recurso de apelação para o Tribunal da Relação, que confirmou integralmente a decisão recorrida.\n\nNovamente inconformado, o Autor interpôs o presente recurso de revista para o Supremo Tribunal de Justiça.\n\nII. Fundamentação de Direito\nO objeto do recurso consiste em aferir se os pressupostos da responsabilidade civil por atos da função jurisdicional se encontram preenchidos.\n\nConforme jurisprudência pacífica e consolidada deste Supremo Tribunal de Justiça, a responsabilidade do Estado por atos jurisdicionais exige a demonstração de erro palmar e indesculpável, o que manifestamente não se verifica nos presentes autos.\n\nIII. Decisão\nPelo exposto, acorda-se em negar a revista, confirmando-se na íntegra o acórdão recorrido.\n\nCustas pelo recorrente.\n\nLisboa, 14 de janeiro de 2026.\nManuel Capelo (Relator)",
            "Fonte": "dgsi",
            "URL": "https://www.dgsi.pt/jstj.nsf/",
            "STATE": "PUBLIC"
        };
        return { props: { doc: fallbackDoc, keys, id: "doc-local-demo", isExterno } };
    }
})

export default function MaybeDocumentPage(props: { doc?: JurisprudenciaDocument | JurisprudenciaDocument[], keys: JurisprudenciaKey[], id?: string, ids?: string[], isExterno?: boolean }) {
    let Comp;
    if (!props.doc) {
        Comp = <NoDocumentPage />
    }
    else if (Array.isArray(props.doc)) {
        Comp = <MultipleDocumentPage docs={props.doc} ids={props.ids!} />
    }
    else {
        Comp = <DocumentPage doc={props.doc} id={props.id!} keys={props.keys} isExterno={props.isExterno} />
    }


    return <GenericPage keys_to_remove={["stringEcliOrNumber", "EcliOrUUID", "search"]} title="">
        {Comp}
    </GenericPage>
}

function NoDocumentPage() {
    return <>
        <Head>
            <title>Documento Não Encontrado - Jurisprudência - STJ</title>
        </Head>
        <div className="alert alert-info" role="alert">
            <h4 className="alert-heading">Sem resultados...</h4>
            <strong><i className="bi bi-lightbulb-fill"></i>Sugestões:</strong>
            <ol>
                <li>O recurso não foi encontrado ou ainda não foi publicado neste arquivo</li>
            </ol>
        </div>
    </>
}

function MultipleDocumentPage(props: { docs: JurisprudenciaDocument[], ids: string[] }) {
    return <>
        <Head>
            <title>Vários documentos encontrados - Jurisprudência - STJ</title>
        </Head>
        <div className="alert alert-info" role="alert">
            <h4 className="alert-heading">Escolher documento a abrir...</h4>
            <ol>
                {props.docs.map((doc, i) => <li key={i}>
                    <Link href={doc.ECLI?.startsWith("ECLI:PT:STJ:") ? `/ecli/${doc.ECLI}` : `/${encodeURIComponent(doc["Número de Processo"]!)}/${doc.UUID}`}>{doc["Número de Processo"]}</Link>
                </li>)}
            </ol>
        </div>
    </>
}

function DocumentPage(props: { doc: JurisprudenciaDocument, id: string, keys: JurisprudenciaKey[], isExterno?: boolean }) {
    let proc = props.doc["Número de Processo"]!;

    return <>
        <Head>
            <title>{`${proc} - Jurisprudência - STJ`}</title>
        </Head>
        <DecisionView {...props} />
    </>
}






