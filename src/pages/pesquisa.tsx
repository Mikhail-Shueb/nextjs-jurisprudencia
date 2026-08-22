import { GenericPageWithForm } from "@/components/main_pages/genericPageStructure"
import { Loading } from "@/components/loading"
import { FormProps, withForm } from "@/components/main_pages/pageWithForm"
import { useFetch } from "@/components/useFetch"
import { getSearchedArray } from "@/core/elasticsearch"
import { LoggerServerSideProps } from "@/core/logger-api"
import { saveSearch } from "@/core/track-search"
import { SearchHandlerResponse } from "@/types/search"
import Link from "next/link"
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation"
import { modifySearchParams, SelectNavigate } from "@/components/main_pages/SelectNavigate"
import JurisprudenciaItem from "@/components/main_pages/search/JurisprudenciaItem"

interface PesquisaProps extends FormProps {
    searchedArray: string[]
    searchId?: string | null
    pages: number
    rpp: number
}

export const getServerSideProps = LoggerServerSideProps(withForm<PesquisaProps>(async (ctx, formProps) => {
    let searchId = (await saveSearch(ctx.resolvedUrl)) || null;
    let searchedArray = await getSearchedArray(Array.isArray(ctx.query.q) ? ctx.query.q.join(" ") : ctx.query.q || "");
    let rpp = parseInt(Array.isArray(ctx.query.rpp) ? ctx.query.rpp[0] : ctx.query.rpp || "10") || 10;
    let pages = Math.max(1, Math.ceil(formProps.count / rpp));

    return {
        ...formProps,
        searchedArray,
        pages,
        rpp,
        searchId
    }
}))

export default function Pesquisa(props: PesquisaProps) {
    const searchParams = useSearchParams();
    const results = useFetch<SearchHandlerResponse>(`/api/search?${searchParams}`, [])

    return <GenericPageWithForm {...props} title="Jurisprudência STJ - Pesquisa">
        {results ?
            results.length > 0 ?
                <ShowResults results={results} searchParams={searchParams} searchInfo={props} /> :
                <NoResults /> :
            <Loading />
        }
    </GenericPageWithForm>
}

function ShowResults({ results, searchParams, searchInfo }: { results: SearchHandlerResponse, searchParams: ReadonlyURLSearchParams, searchInfo: PesquisaProps }) {
    const sort = searchParams.get("sort") || "des";
    const rpp = searchParams.get("rpp") || `${searchInfo.rpp || 10}`;
    const page = parseInt(searchParams.get("page") || "0");

    function onClickShare(e: React.MouseEvent<HTMLElement>) {
        const id = e.currentTarget.getAttribute("data-id");
        if (id && typeof window !== "undefined" && navigator.clipboard) {
            const url = `${window.location.origin}/pesquisa?search=${id}`;
            navigator.clipboard.writeText(url);
            alert("Endereço da pesquisa copiado para a área de transferência!");
        }
    }

    return <>
        <article className="d-flex align-items-center flex-wrap gap-2 mb-2">
            <div>
                <b className="d-none d-print-inline">Ordenação:</b>
                <b><SelectNavigate name="sort" className="me-2" defaultValue={sort} valueToHref={(v, params) => `/pesquisa?${modifySearchParams(params, "sort", v)}`}>
                    <option value="score">Relevância</option>
                    <option value="asc">Data Ascendente</option>
                    <option value="des">Data Descendente</option>
                </SelectNavigate></b>
            </div>
            <div>
                <b className="d-none d-print-inline">Resultados por página:</b>
                <b><SelectNavigate name="rpp" className="me-2" defaultValue={rpp} valueToHref={(v, params) => {
                    const newParams = modifySearchParams(params, "rpp", v);
                    newParams.delete("page");
                    return `/pesquisa?${newParams.toString()}`;
                }}>
                    <option value="10">10 resultados</option>
                    <option value="20">20 resultados</option>
                    <option value="50">50 resultados</option>
                    <option value="100">100 resultados</option>
                </SelectNavigate></b>
            </div>
            {searchInfo.searchId ? <i className="bi bi-share ms-2" title="Partilhar" role="button" onClick={onClickShare} data-id={searchInfo.searchId}></i> : ""}
            <div className="ms-auto d-print-none">
                {searchInfo.searchedArray.length > 0 ?
                    ["Termos da pesquisa destacados: ", searchInfo.searchedArray.map((s, i) => <span key={i} className="badge bg-white text-dark mx-1" style={{ border: `2px solid var(--highlight-${i % 5}, var(--primary-gold))` }}>{s}</span>)]
                    : ""}
            </div>
        </article>
        {...results.map((h, i) => <JurisprudenciaItem key={i} hit={h} searchId={searchInfo.searchId || undefined} />)}
        <article className="row d-print-none mt-3">
            <nav>
                <ul className="pagination justify-content-center text-center">
                    <li className="page-item">
                        <NavLink page={0} icon="bi-chevron-double-left" searchParams={searchParams} />
                    </li>
                    <li className="page-item">
                        {page > 0 ? <NavLink page={page - 1} icon="bi-chevron-left" searchParams={searchParams} /> : <span className="page-link"><i className="bi bi-chevron-left disabled"></i></span>}
                    </li>
                    <li className="page-item w-25">
                        <span className="page-link"><small>Página {page + 1}/{searchInfo.pages}</small></span>
                    </li>
                    <li className="page-item">
                        {page < searchInfo.pages - 1 ? <NavLink page={page + 1} icon="bi-chevron-right" searchParams={searchParams} /> : <span className="page-link"><i className="bi bi-chevron-right disabled"></i></span>}
                    </li>
                    <li className="page-item">
                        <NavLink page={searchInfo.pages - 1} icon="bi-chevron-double-right" searchParams={searchParams} />
                    </li>
                </ul>
            </nav>
        </article>
    </>
}

function NavLink({ page, icon, searchParams }: { page: number, icon: string, searchParams: ReadonlyURLSearchParams }) {
    const tmp = new URLSearchParams(searchParams.toString());
    tmp.set("page", page.toString())
    return <Link className="page-link" href={`?${tmp.toString()}`} title={`Ir para a página ${page + 1}`}><i className={`bi ${icon}`}></i></Link>
}

function NoResults() {
    return <div className="alert alert-info" role="alert">
        <h4 className="alert-heading">Sem resultados...</h4>
        <strong><i className="bi bi-lightbulb-fill"></i> Sugestões:</strong>
        <ol>
            <li>Verifique os filtros utilizados (tribunais, relator, data)</li>
            <li>Verifique o termo pesquisado</li>
        </ol>
    </div>
}