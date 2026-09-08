import GenericPage from "@/components/main_pages/genericPageStructure"
import { SmallSpinner } from "@/components/loading"
import { getElasticSearchClient } from "@/core/elasticsearch"
import { LoggerServerSideProps } from "@/core/logger-api"
import { JurisprudenciaVersion } from "@stjiris/jurisprudencia-document"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { useEffect, useMemo, useRef, useState } from "react"

interface BoletimProps {
    areas: string[]
    minYear: number
    maxYear: number
    isOffline?: boolean
}

const DEFAULT_AREAS = [
    "Área Cível",
    "Área Criminal",
    "Área Social",
    "Contencioso"
]

export const getServerSideProps: GetServerSideProps<BoletimProps> = LoggerServerSideProps(async (ctx) => {
    let areas = DEFAULT_AREAS
    let minYear = 2000
    let maxYear = new Date().getFullYear()
    let isOffline = false

    try {
        const client = await getElasticSearchClient()
        const result = await client.search({
            index: JurisprudenciaVersion,
            size: 0,
            aggs: {
                areas: {
                    terms: {
                        field: "Área.Index.keyword",
                        size: 100,
                        order: { _key: "asc" }
                    }
                },
                minYear: {
                    min: { field: "Data", format: "yyyy" }
                },
                maxYear: {
                    max: { field: "Data", format: "yyyy" }
                }
            }
        })

        const areasBuckets = (result.aggregations?.areas as any)?.buckets || []
        if (areasBuckets.length > 0) {
            areas = areasBuckets.map((b: any) => b.key as string)
        }
        const parsedMin = parseInt((result.aggregations?.minYear as any)?.value_as_string || "")
        if (Number.isFinite(parsedMin) && parsedMin > 0) minYear = parsedMin

        const parsedMax = parseInt((result.aggregations?.maxYear as any)?.value_as_string || "")
        if (Number.isFinite(parsedMax) && parsedMax > 0) maxYear = parsedMax
    } catch (err) {
        console.warn("Boletim getServerSideProps: Elasticsearch offline, using fallback parameters:", err)
        isOffline = true
    }

    return { props: { areas, minYear, maxYear, isOffline } }
})

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export default function Boletim({ areas, minYear, maxYear, isOffline }: BoletimProps) {
    const router = useRouter()
    const now = new Date()
    const [area, setArea] = useState(areas[0] || "")
    const [year, setYear] = useState(now.getFullYear().toString())
    const [month, setMonth] = useState((now.getMonth() + 1).toString())

    const [count, setCount] = useState<number | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null)
    const didInit = useRef(false)

    const years = useMemo(() => {
        const result = []
        for (let y = maxYear; y >= minYear; y--) {
            result.push(y)
        }
        return result
    }, [minYear, maxYear])

    const htmlUrl = useMemo(() => {
        return `${router.basePath}/api/boletim/${encodeURIComponent(area)}/${year}/${month}/html`
    }, [router.basePath, area, year, month])

    const pdfUrl = useMemo(() => {
        return `${router.basePath}/api/boletim/${encodeURIComponent(area)}/${year}/${month}/pdf`
    }, [router.basePath, area, year, month])

    // Count acórdãos for the current combination and automatically update previewUrl.
    useEffect(() => {
        let cancelled = false
        setCount(null)
        const currentHtmlUrl = `${router.basePath}/api/boletim/${encodeURIComponent(area)}/${year}/${month}/html`
        const params = new URLSearchParams({ area, year, month })

        fetch(`${router.basePath}/api/boletim/count?${params.toString()}`)
            .then(r => r.json())
            .then(({ count }) => {
                if (cancelled) return
                setCount(count)
                if (count > 0) {
                    setPreviewUrl(currentHtmlUrl)
                } else {
                    setPreviewUrl(null)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCount(0)
                    setPreviewUrl(null)
                }
            })
        return () => { cancelled = true }
    }, [router.basePath, area, year, month])

    const hasAcordaos = count !== null && count > 0

    const previewRef = useRef<HTMLDivElement>(null)
    const shouldScroll = useRef(false)

    const generatePreview = () => {
        shouldScroll.current = true
        setPreviewUrl(htmlUrl)
    }
    const generatePdf = () => {
        window.open(pdfUrl, "_blank", "noopener,noreferrer")
    }

    // Scroll the preview into view when the user clicks generatePreview.
    useEffect(() => {
        if (previewUrl && shouldScroll.current) {
            shouldScroll.current = false
            previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [previewUrl])

    return (
        <GenericPage title="Jurisprudência STJ - Boletim">
            <div className="row justify-content-center mt-4">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h3 className="mb-0">Boletim Mensal</h3>
                        {isOffline && (
                            <span className="badge bg-warning text-dark d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }} title="Serviço Elasticsearch não detetado localmente. A utilizar valores pré-definidos do STJ.">
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                <span>Modo Offline / Demonstração</span>
                            </span>
                        )}
                    </div>
                    <div className="card">
                        <div className="card-body">
                            <div className="mb-3">
                                <label htmlFor="area-select" className="form-label fw-bold">Área</label>
                                <select
                                    id="area-select"
                                    className="form-select"
                                    value={area}
                                    onChange={e => setArea(e.target.value)}
                                >
                                    {areas.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="row mb-3">
                                <div className="col-6">
                                    <label htmlFor="year-select" className="form-label fw-bold">Ano</label>
                                    <select
                                        id="year-select"
                                        className="form-select"
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                    >
                                        {years.map(y => (
                                           <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label htmlFor="month-select" className="form-label fw-bold">Mês</label>
                                    <select
                                        id="month-select"
                                        className="form-select"
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                    >
                                        {MONTHS.map((m, i) => (
                                            <option key={i + 1} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {count === null ? (
                                <div className="d-flex align-items-center text-muted">
                                    <SmallSpinner className="me-2" />
                                    A verificar acórdãos e a atualizar pré-visualização...
                                </div>
                            ) : count === 0 ? (
                                <div className="alert alert-warning mb-0" role="alert">
                                    Não existem acórdãos para esta combinação.
                                </div>
                            ) : (
                                <div className="row g-2">
                                    <div className="col-6">
                                        <button
                                            type="button"
                                            className="btn btn-primary w-100"
                                            disabled={!hasAcordaos}
                                            onClick={generatePreview}
                                            title="Deslocar a página para a pré-visualização do boletim"
                                        >
                                            <i className="bi bi-eye me-1"></i>
                                            Ver Pré-visualização
                                        </button>
                                    </div>
                                    <div className="col-6">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary w-100"
                                            disabled={!hasAcordaos}
                                            onClick={generatePdf}
                                            title="Descarregar ou abrir o Boletim em formato PDF"
                                        >
                                            <i className="bi bi-file-earmark-pdf me-1"></i>
                                            Gerar PDF
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {previewUrl && (
                        <div className="card mt-3 shadow-sm" ref={previewRef} style={{ scrollMarginTop: "0.5rem" }}>
                            <div className="card-header bg-white d-flex align-items-center justify-content-between py-2">
                                <span className="small fw-semibold text-secondary d-flex align-items-center gap-1">
                                    <i className="bi bi-eye"></i> Pré-visualização ao vivo: {area} ({month}/{year})
                                </span>
                                <span className="badge bg-light text-dark border">Atualização automática</span>
                            </div>
                            <div className="card-body p-0">
                                <iframe
                                    key={previewUrl}
                                    src={previewUrl}
                                    title="Pré-visualização do boletim"
                                    className="w-100 border-0"
                                    style={{ height: "95vh" }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GenericPage>
    )
}
