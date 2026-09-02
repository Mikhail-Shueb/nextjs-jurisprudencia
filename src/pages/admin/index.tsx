import { GetServerSideProps } from "next";
import { getUserRole, withAuthentication } from "@/core/user/authenticate";
import { Feature, Role, roleCanAccess } from "@/core/user/roles";
import Link from "next/link";
import { ReactNode, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { LoggerServerSideProps } from "@/core/logger-api";
import GenericPage from "@/components/main_pages/genericPageStructure";
import { useFetch } from "@/components/useFetch";
import { Loading } from "@/components/loading";
import { AdminOverviewResponse, EventLogItem } from "../api/admin/overview";

interface IndexPageProps {
    role: Role;
    syncRole: string | null;
}

export const getServerSideProps = LoggerServerSideProps(withAuthentication<IndexPageProps>(async ctx => {
    const role = await getUserRole(ctx.req) ?? 'editor';
    return { props: { role, syncRole: process.env.SYNC_ROLE || null } }
}));

export default function IndexPage({ role, syncRole }: IndexPageProps) {
    const can = (feature: Feature) => roleCanAccess(role, feature);
    const data = useFetch<AdminOverviewResponse>("/api/admin/overview", []);
    const [activeTab, setActiveTab] = useState<"modules" | "metrics" | "events">("modules");

    // Event Log Filter State
    const [logSearch, setLogSearch] = useState("");
    const [methodFilter, setMethodFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [latencyFilter, setLatencyFilter] = useState("ALL");

    const filteredLogs = useMemo(() => {
        if (!data?.eventLogs) return [];
        return data.eventLogs.filter((log: EventLogItem) => {
            if (logSearch.trim()) {
                const q = logSearch.toLowerCase();
                const matchUrl = log.url.toLowerCase().includes(q);
                const matchMethod = log.method.toLowerCase().includes(q);
                const matchType = log.type.toLowerCase().includes(q);
                if (!matchUrl && !matchMethod && !matchType) return false;
            }
            if (methodFilter !== "ALL" && log.method !== methodFilter) return false;
            if (statusFilter !== "ALL") {
                const s = log.status;
                if (statusFilter === "2xx" && (s < 200 || s >= 300)) return false;
                if (statusFilter === "3xx" && (s < 300 || s >= 400)) return false;
                if (statusFilter === "4xx" && (s < 400 || s >= 500)) return false;
                if (statusFilter === "5xx" && s < 500) return false;
            }
            if (typeFilter !== "ALL" && log.type !== typeFilter) return false;
            if (latencyFilter !== "ALL") {
                if (latencyFilter === "fast" && log.duration >= 20) return false;
                if (latencyFilter === "medium" && (log.duration < 20 || log.duration > 100)) return false;
                if (latencyFilter === "slow" && log.duration <= 100) return false;
            }
            return true;
        });
    }, [data?.eventLogs, logSearch, methodFilter, statusFilter, typeFilter, latencyFilter]);

    return (
        <GenericPage title="Jurisprudência STJ - Administração do Sistema">
            <div className="container-fluid px-0" style={{ maxWidth: 1400 }}>
                
                {/* Top Banner: Status do Sistema & Indicadores Globais */}
                <div className="card shadow-sm border-0 mb-4 bg-white rounded-3 overflow-hidden">
                    <div className="card-body p-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-3 bg-danger bg-opacity-10 text-danger p-3 d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                                    <i className="bi bi-shield-lock-fill fs-3"></i>
                                </div>
                                <div>
                                    <h1 className="h4 fw-bold mb-1 text-dark">Consola de Administração & Controlo</h1>
                                    <p className="text-muted small mb-0">
                                        Supremo Tribunal de Justiça &bull; Perfil: <strong className="text-uppercase text-danger">{role}</strong>
                                        {syncRole && <span className="ms-2 badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">Ambiente: {syncRole}</span>}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <Link href="/pesquisa" className="btn btn-outline-secondary btn-sm fw-semibold rounded-pill px-3">
                                    <i className="bi bi-search me-1"></i> Pesquisa
                                </Link>
                                <Link href="/dashboard" className="btn btn-outline-danger btn-sm fw-semibold rounded-pill px-3">
                                    <i className="bi bi-bar-chart-line-fill me-1"></i> Dashboard
                                </Link>
                                <Link href="/user/logout" className="btn btn-danger btn-sm fw-semibold rounded-pill px-3">
                                    <i className="bi bi-box-arrow-right me-1"></i> Terminar Sessão
                                </Link>
                            </div>
                        </div>

                        {/* Mini Badges de Telemetria no Topo */}
                        {data?.serverMetrics && (
                            <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top small">
                                <span className="badge bg-light text-dark border d-flex align-items-center gap-1 py-1 px-2">
                                    <i className="bi bi-cpu text-primary"></i> RAM: <strong>{data.serverMetrics.ram.usedGb} GB / {data.serverMetrics.ram.totalGb} GB ({data.serverMetrics.ram.usedPercent}%)</strong>
                                </span>
                                <span className="badge bg-light text-dark border d-flex align-items-center gap-1 py-1 px-2">
                                    <i className="bi bi-hdd text-warning"></i> Disco: <strong>{data.serverMetrics.storage.usedGb} GB / {data.serverMetrics.storage.totalGb} GB ({data.serverMetrics.storage.usedPercent}%)</strong>
                                </span>
                                <span className="badge bg-light text-dark border d-flex align-items-center gap-1 py-1 px-2">
                                    <i className="bi bi-clock-history text-success"></i> Uptime: <strong>{data.serverMetrics.system.uptimeFormatted}</strong>
                                </span>
                                <span className="badge bg-light text-dark border d-flex align-items-center gap-1 py-1 px-2">
                                    <i className="bi bi-database text-danger"></i> Índice: <strong>{data.totalDocs.toLocaleString("pt-PT")} docs ({data.serverMetrics.storage.elasticsearchStoreSizeGb} GB)</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {!data ? (
                    <Loading />
                ) : (
                    <>
                        {/* Tab Switcher */}
                        <div className="d-flex gap-2 mb-4 flex-wrap">
                            <button
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === "modules" ? "btn-danger" : "btn-light border"}`}
                                onClick={() => setActiveTab("modules")}
                            >
                                <i className="bi bi-grid-fill me-1"></i> Módulos & Gestão
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === "metrics" ? "btn-danger" : "btn-light border"}`}
                                onClick={() => setActiveTab("metrics")}
                            >
                                <i className="bi bi-speedometer2 me-1"></i> Recursos & Métricas do Servidor
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === "events" ? "btn-danger" : "btn-light border"}`}
                                onClick={() => setActiveTab("events")}
                            >
                                <i className="bi bi-activity me-1"></i> Event Log / Telemetria <span className="badge bg-white text-danger ms-1">{filteredLogs.length}</span>
                            </button>
                        </div>

                        {/* TAB 1: MÓDULOS & GESTÃO (Includes Upstream SyncTriggers + Management) */}
                        {activeTab === "modules" && (
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-md-6 col-xl-4">
                                    <div className="card shadow-sm h-100 border-0 rounded-3">
                                        <div className="card-body p-3">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <i className="bi bi-search text-danger fs-5"></i>
                                                <h2 className="h6 fw-bold mb-0"><Link href="/pesquisa" className="text-decoration-none text-dark">Pesquisa & Edição</Link></h2>
                                            </div>
                                            <p className="small text-muted mb-2">Pesquisa avançada com acesso a metadados restritos e permissão para abrir acórdãos em modo de edição.</p>
                                            <Link href="/pesquisa" className="btn btn-outline-danger btn-sm rounded-pill w-100 fw-semibold">Abrir Pesquisa</Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-xl-4">
                                    <div className="card shadow-sm h-100 border-0 rounded-3">
                                        <div className="card-body p-3">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <i className="bi bi-file-earmark-plus text-primary fs-5"></i>
                                                <h2 className="h6 fw-bold mb-0"><Link href="/editar/criar" className="text-decoration-none text-dark">Criar Acórdão</Link></h2>
                                            </div>
                                            <p className="small text-muted mb-2">Criação manual e indexação direta de novos acórdãos e deliberações com campos estruturados.</p>
                                            <Link href="/editar/criar" className="btn btn-outline-primary btn-sm rounded-pill w-100 fw-semibold">Novo Acórdão</Link>
                                        </div>
                                    </div>
                                </div>

                                {can('importExport') && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm h-100 border-0 rounded-3">
                                            <div className="card-body p-3">
                                                <div className="d-flex align-items-center gap-2 mb-2">
                                                    <i className="bi bi-file-earmark-spreadsheet text-success fs-5"></i>
                                                    <h2 className="h6 fw-bold mb-0"><Link href="/admin/excel" className="text-decoration-none text-dark">Importar / Exportar</Link></h2>
                                                </div>
                                                <p className="small text-muted mb-2">Carga e exportação em lote de folhas de cálculo Excel para atualização massiva de registos.</p>
                                                <Link href="/admin/excel" className="btn btn-outline-success btn-sm rounded-pill w-100 fw-semibold">Gerir Ficheiros</Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {can('filters') && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm h-100 border-0 rounded-3">
                                            <div className="card-body p-3">
                                                <div className="d-flex align-items-center gap-2 mb-2">
                                                    <i className="bi bi-funnel text-warning fs-5"></i>
                                                    <h2 className="h6 fw-bold mb-0"><Link href="/admin/filters" className="text-decoration-none text-dark">Filtros & Visibilidade</Link></h2>
                                                </div>
                                                <p className="small text-muted mb-2">Configurar filtros visíveis, ocultos ou desativados na barra lateral de pesquisa pública.</p>
                                                <Link href="/admin/filters" className="btn btn-outline-warning btn-sm rounded-pill w-100 fw-semibold text-dark">Configurar Filtros</Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {can('manageUsers') && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm h-100 border-0 rounded-3">
                                            <div className="card-body p-3">
                                                <div className="d-flex align-items-center gap-2 mb-2">
                                                    <i className="bi bi-people text-info fs-5"></i>
                                                    <h2 className="h6 fw-bold mb-0"><Link href="/admin/users" className="text-decoration-none text-dark">Gestão de Utilizadores</Link></h2>
                                                </div>
                                                <p className="small text-muted mb-2">Criar contas, redefinir palavras-passe e gerir perfis de acesso (administrador, editor).</p>
                                                <Link href="/admin/users" className="btn btn-outline-info btn-sm rounded-pill w-100 fw-semibold">Gerir Contas</Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {can('manageUsers') && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm h-100 border-0 rounded-3">
                                            <div className="card-body p-3">
                                                <div className="d-flex align-items-center gap-2 mb-2">
                                                    <i className="bi bi-journal-text text-dark fs-5"></i>
                                                    <h2 className="h6 fw-bold mb-0"><Link href="/admin/logs" className="text-decoration-none text-dark">Registo de Atividade</Link></h2>
                                                </div>
                                                <p className="small text-muted mb-2">Consultar o registo de auditoria de ações realizadas no sistema (publicações, edições, etc.).</p>
                                                <Link href="/admin/logs" className="btn btn-outline-dark btn-sm rounded-pill w-100 fw-semibold">Ver Auditoria</Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Sync Triggers from Upstream Pull */}
                                {can('manageUsers') && syncRole === "interno" && (
                                    <div className="col-12 col-md-6 col-xl-6">
                                        <SyncTrigger
                                            title="Pedir Sincronização de Dados"
                                            description="Pedir ao jurisprudência externo as últimas alterações por email Graph API (o externo sobrepõe dados locais). As alterações chegam em ~1 min."
                                            endpoint="/api/gestao/sync-request"
                                            icon="bi-arrow-repeat"
                                        />
                                    </div>
                                )}

                                {can('manageUsers') && syncRole === "externo" && (
                                    <div className="col-12 col-md-6 col-xl-6">
                                        <SyncTrigger
                                            title="Exportar para Ambiente Interno"
                                            description="Enviar por email Microsoft 365 Graph API todos os documentos alterados desde a última exportação com salvaguarda de privacidade."
                                            endpoint="/api/gestao/sync-export"
                                            icon="bi-box-arrow-up"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: RECURSOS & MÉTRICAS DO SERVIDOR */}
                        {activeTab === "metrics" && data.serverMetrics && (
                            <div className="row g-4 mb-4">
                                <div className="col-12 col-xl-6">
                                    <div className="card shadow-sm border-0 rounded-3 h-100">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h2 className="h5 fw-bold text-dark mb-0">
                                                    <i className="bi bi-memory text-primary me-2"></i>Estado da Memória RAM
                                                </h2>
                                                <span className={`badge ${data.serverMetrics.ram.usedPercent > 85 ? 'bg-danger' : 'bg-success'}`}>
                                                    {data.serverMetrics.ram.usedPercent}% Em Uso
                                                </span>
                                            </div>

                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between small text-muted mb-1">
                                                    <span>Utilização Total do Sistema Operativo:</span>
                                                    <strong>{data.serverMetrics.ram.usedGb} GB / {data.serverMetrics.ram.totalGb} GB</strong>
                                                </div>
                                                <div className="progress" style={{ height: "10px" }}>
                                                    <div
                                                        className={`progress-bar ${data.serverMetrics.ram.usedPercent > 85 ? 'bg-danger' : 'bg-primary'}`}
                                                        style={{ width: `${data.serverMetrics.ram.usedPercent}%` }}
                                                    ></div>
                                                </div>
                                                <div className="d-flex justify-content-between small text-muted mt-1">
                                                    <span>Livre: {data.serverMetrics.ram.freeGb} GB</span>
                                                    <span>Total: {data.serverMetrics.ram.totalGb} GB</span>
                                                </div>
                                            </div>

                                            <hr className="my-3" />

                                            <h3 className="h6 text-uppercase fw-bold text-muted small mb-2">Processo Node.js / Next.js Heap</h3>
                                            <div className="row g-2 text-center">
                                                <div className="col-4">
                                                    <div className="p-2 bg-light rounded border">
                                                        <div className="small text-muted">Heap Utilizado</div>
                                                        <div className="fw-bold text-primary fs-5">{data.serverMetrics.ram.processHeapUsedMb} MB</div>
                                                    </div>
                                                </div>
                                                <div className="col-4">
                                                    <div className="p-2 bg-light rounded border">
                                                        <div className="small text-muted">Heap Alocado</div>
                                                        <div className="fw-bold text-dark fs-5">{data.serverMetrics.ram.processHeapTotalMb} MB</div>
                                                    </div>
                                                </div>
                                                <div className="col-4">
                                                    <div className="p-2 bg-light rounded border">
                                                        <div className="small text-muted">RSS Total</div>
                                                        <div className="fw-bold text-secondary fs-5">{data.serverMetrics.ram.processRssMb} MB</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <hr className="my-3" />

                                            <h3 className="h6 text-uppercase fw-bold text-muted small mb-2">Elasticsearch JVM Heap ({data.serverMetrics.elasticsearchJvm.heapMaxMb ? `${Math.round(data.serverMetrics.elasticsearchJvm.heapMaxMb / 1024)} GB Alocado` : 'N/A'})</h3>
                                            <div className="d-flex justify-content-between small text-muted mb-1">
                                                <span>JVM Heap do Cluster:</span>
                                                <strong>{data.serverMetrics.elasticsearchJvm.heapUsedMb} MB / {data.serverMetrics.elasticsearchJvm.heapMaxMb} MB ({data.serverMetrics.elasticsearchJvm.heapUsedPercent}%)</strong>
                                            </div>
                                            <div className="progress" style={{ height: "8px" }}>
                                                <div className="progress-bar bg-success" style={{ width: `${data.serverMetrics.elasticsearchJvm.heapUsedPercent}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-xl-6">
                                    <div className="card shadow-sm border-0 rounded-3 h-100">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h2 className="h5 fw-bold text-dark mb-0">
                                                    <i className="bi bi-hdd-network text-warning me-2"></i>Estado do Armazenamento & Disco
                                                </h2>
                                                <span className="badge bg-primary">
                                                    {data.serverMetrics.storage.usedPercent}% Ocupado
                                                </span>
                                            </div>

                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between small text-muted mb-1">
                                                    <span>Espaço em Disco do Servidor:</span>
                                                    <strong>{data.serverMetrics.storage.usedGb} GB / {data.serverMetrics.storage.totalGb} GB</strong>
                                                </div>
                                                <div className="progress" style={{ height: "10px" }}>
                                                    <div
                                                        className="progress-bar bg-warning"
                                                        style={{ width: `${data.serverMetrics.storage.usedPercent}%` }}
                                                    ></div>
                                                </div>
                                                <div className="d-flex justify-content-between small text-muted mt-1">
                                                    <span>Disponível: {data.serverMetrics.storage.freeGb} GB</span>
                                                    <span>Total: {data.serverMetrics.storage.totalGb} GB</span>
                                                </div>
                                            </div>

                                            <hr className="my-3" />

                                            <h3 className="h6 text-uppercase fw-bold text-muted small mb-2">Volumes & Índices de Dados</h3>
                                            <div className="list-group list-group-flush small">
                                                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                                                    <span>Índice Elasticsearch (Jurisprudência)</span>
                                                    <span className="badge bg-light text-dark border">{data.serverMetrics.storage.elasticsearchStoreSizeGb} GB</span>
                                                </div>
                                                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                                                    <span><i className="bi bi-diagram-3 text-primary me-1"></i> Shards / Partições Lucene Ativas</span>
                                                    <span className="badge bg-light text-dark border">{data.serverMetrics.elasticsearchJvm.shardsCount} Shards</span>
                                                </div>
                                                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                                                    <span><i className="bi bi-file-earmark-excel text-success me-1"></i> Volume de Ficheiros Excel / Exportações</span>
                                                    <span className="badge bg-light text-dark border">{data.serverMetrics.storage.excelFilesCount} Ficheiros</span>
                                                </div>
                                            </div>

                                            <hr className="my-3" />

                                            <div className="p-2 bg-light rounded border small">
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <i className="bi bi-gear-fill text-secondary"></i>
                                                    <span className="text-muted">Processador:</span>
                                                    <strong>{data.serverMetrics.system.cpuCores} Cores &bull; {data.serverMetrics.system.cpuModel}</strong>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-terminal text-secondary"></i>
                                                    <span className="text-muted">Ambiente / Node:</span>
                                                    <strong>{data.serverMetrics.system.platform} &bull; Node {data.serverMetrics.system.nodeVersion}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: EVENT LOG / TELEMETRIA */}
                        {activeTab === "events" && (
                            <div className="card shadow-sm border-0 rounded-3 mb-4">
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                        <div>
                                            <h2 className="h5 fw-bold text-dark mb-0">
                                                <i className="bi bi-activity text-danger me-2"></i>Event Log / Registo de Pedidos
                                            </h2>
                                            <p className="text-muted small mb-0">Últimos eventos de navegação e chamadas às APIs indexadas.</p>
                                        </div>
                                        <span className="badge bg-light text-dark border">
                                            {filteredLogs.length} de {data.eventLogs.length} eventos
                                        </span>
                                    </div>

                                    {/* Filter Controls Bar */}
                                    <div className="bg-light p-3 rounded-3 border mb-3">
                                        <div className="row g-2 align-items-center">
                                            <div className="col-12 col-md-4">
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                                                    <input
                                                        type="text"
                                                        className="form-control border-start-0"
                                                        placeholder="Filtrar por URL, método ou tipo..."
                                                        value={logSearch}
                                                        onChange={(e) => setLogSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-6 col-md-2">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={methodFilter}
                                                    onChange={(e) => setMethodFilter(e.target.value)}
                                                >
                                                    <option value="ALL">Método: Todos</option>
                                                    <option value="GET">GET</option>
                                                    <option value="POST">POST</option>
                                                    <option value="DELETE">DELETE</option>
                                                </select>
                                            </div>

                                            <div className="col-6 col-md-2">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                >
                                                    <option value="ALL">Status: Todos</option>
                                                    <option value="2xx">2xx Sucesso</option>
                                                    <option value="3xx">3xx Redirecionamento</option>
                                                    <option value="4xx">4xx Erro Cliente</option>
                                                    <option value="5xx">5xx Erro Servidor</option>
                                                </select>
                                            </div>

                                            <div className="col-6 col-md-2">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={typeFilter}
                                                    onChange={(e) => setTypeFilter(e.target.value)}
                                                >
                                                    <option value="ALL">Tipo: Todos</option>
                                                    <option value="api">API Routes</option>
                                                    <option value="ssp">Server Pages (SSP)</option>
                                                </select>
                                            </div>

                                            <div className="col-6 col-md-2">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={latencyFilter}
                                                    onChange={(e) => setLatencyFilter(e.target.value)}
                                                >
                                                    <option value="ALL">Latência: Todas</option>
                                                    <option value="fast">&lt; 20ms (Rápido)</option>
                                                    <option value="medium">20 - 100ms</option>
                                                    <option value="slow">&gt; 100ms (Lento)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table View */}
                                    <div className="table-responsive">
                                        <table className="table table-hover table-sm align-middle small mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Timestamp</th>
                                                    <th>Tipo</th>
                                                    <th>Método</th>
                                                    <th>URL / Endpoint</th>
                                                    <th>Status</th>
                                                    <th className="text-end">Duração</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLogs.map((log: EventLogItem) => (
                                                    <tr key={log.id}>
                                                        <td className="text-nowrap text-muted font-monospace">{log.timestamp}</td>
                                                        <td>
                                                            <span className={`badge ${log.type === 'api' ? 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25' : 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25'}`}>
                                                                {log.type.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${log.method === 'GET' ? 'bg-info bg-opacity-10 text-info border border-info border-opacity-25' : log.method === 'POST' ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' : 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25'}`}>
                                                                {log.method}
                                                            </span>
                                                        </td>
                                                        <td className="font-monospace text-truncate" style={{ maxWidth: 380 }} title={log.url}>{log.url}</td>
                                                        <td>
                                                            <span className={`badge ${log.status < 300 ? 'bg-success' : log.status < 400 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end font-monospace">
                                                            <span className={log.duration > 100 ? 'text-danger fw-bold' : log.duration > 30 ? 'text-warning fw-semibold' : 'text-muted'}>
                                                                {log.duration}ms
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </GenericPage>
    );
}

function SyncTrigger({ title, description, endpoint, icon }: { title: string, description: string, endpoint: string, icon: string }) {
    const router = useRouter();
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<{ variant: "success" | "warning" | "danger", text: string } | null>(null);

    const trigger = async () => {
        setRunning(true);
        setResult(null);
        try {
            const res = await fetch(`${router.basePath}${endpoint}`, { method: "POST" });
            const data = await res.json();
            if (!data.ok) {
                setResult({ variant: "danger", text: data.message || `Erro ${res.status}` });
            } else if (data.refused) {
                setResult({ variant: "warning", text: data.message || "Sincronização recusada." });
            } else {
                const text = data.message
                    || (typeof data.sent === "number" ? `${data.sent} documento(s) enviado(s).`
                        : typeof data.processed === "number" ? `${data.processed} documento(s) aplicado(s).`
                            : "Concluído com sucesso.");
                setResult({ variant: "success", text });
            }
        } catch (err: any) {
            setResult({ variant: "danger", text: err?.message || "Falha de rede." });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="card shadow-sm h-100 border-0 rounded-3 bg-light">
            <div className="card-body p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <i className={`bi ${icon} text-primary fs-5`}></i>
                    <h2 className="h6 fw-bold mb-0 text-dark">{title}</h2>
                </div>
                <p className="small text-muted mb-3">{description}</p>
                <button className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold" onClick={trigger} disabled={running}>
                    {running ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            A processar…
                        </>
                    ) : (
                        <>
                            <i className={`bi ${icon} me-1`}></i> {title}
                        </>
                    )}
                </button>
                {result && (
                    <div className={`alert alert-${result.variant} mt-2 mb-0 py-2 small rounded-2`} role="alert">
                        {result.text}
                    </div>
                )}
            </div>
        </div>
    );
}