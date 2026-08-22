import { GetServerSideProps } from "next";
import { getUserRole, withAuthentication } from "@/core/user/authenticate";
import { Feature, Role, roleCanAccess } from "@/core/user/roles";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LoggerServerSideProps } from "@/core/logger-api";
import GenericPage from "@/components/main_pages/genericPageStructure";
import { useFetch } from "@/components/useFetch";
import { Loading } from "@/components/loading";
import { AdminOverviewResponse } from "../api/admin/overview";

interface IndexPageProps {
    role: Role;
}

export const getServerSideProps = LoggerServerSideProps(withAuthentication<IndexPageProps>(async (ctx) => {
    const role = (await getUserRole(ctx.req)) ?? "editor";
    return { props: { role } };
}));

export default function IndexPage({ role }: IndexPageProps) {
    const can = (feature: Feature) => roleCanAccess(role, feature);
    const data = useFetch<AdminOverviewResponse>("/api/admin/overview", []);
    const [activeTab, setActiveTab] = useState<"overview" | "logs" | "quality">("overview");

    // Estados dos Filtros do Event Log
    const [logSearch, setLogSearch] = useState("");
    const [methodFilter, setMethodFilter] = useState<"ALL" | "GET" | "POST" | "DELETE">("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "2xx" | "3xx" | "4xx" | "5xx">("ALL");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "api" | "ssp">("ALL");
    const [latencyFilter, setLatencyFilter] = useState<"ALL" | "fast" | "medium" | "slow">("ALL");

    // Filtragem reativa do Event Log
    const filteredLogs = useMemo(() => {
        if (!data?.eventLogs) return [];
        return data.eventLogs.filter((log) => {
            // Filtro de Texto (URL / Endpoint)
            if (logSearch.trim()) {
                const query = logSearch.toLowerCase().trim();
                const matchUrl = log.url.toLowerCase().includes(query);
                const matchMethod = log.method.toLowerCase().includes(query);
                if (!matchUrl && !matchMethod) return false;
            }

            // Filtro de Método
            if (methodFilter !== "ALL" && log.method !== methodFilter) {
                return false;
            }

            // Filtro de Código de Estado
            if (statusFilter === "2xx" && (log.status < 200 || log.status >= 300)) return false;
            if (statusFilter === "3xx" && (log.status < 300 || log.status >= 400)) return false;
            if (statusFilter === "4xx" && (log.status < 400 || log.status >= 500)) return false;
            if (statusFilter === "5xx" && log.status < 500) return false;

            // Filtro de Tipo
            if (typeFilter !== "ALL" && log.type !== typeFilter) {
                return false;
            }

            // Filtro de Latência
            if (latencyFilter === "fast" && log.duration >= 20) return false;
            if (latencyFilter === "medium" && (log.duration < 20 || log.duration > 100)) return false;
            if (latencyFilter === "slow" && log.duration <= 100) return false;

            return true;
        });
    }, [data?.eventLogs, logSearch, methodFilter, statusFilter, typeFilter, latencyFilter]);

    // Estatísticas calculadas dos logs filtrados
    const logMetrics = useMemo(() => {
        if (!filteredLogs.length) return { avgDuration: 0, errorCount: 0, successPercent: 100 };
        const totalDuration = filteredLogs.reduce((acc, l) => acc + l.duration, 0);
        const avgDuration = Math.round(totalDuration / filteredLogs.length);
        const errorCount = filteredLogs.filter((l) => l.status >= 400).length;
        const successPercent = Math.round(((filteredLogs.length - errorCount) / filteredLogs.length) * 100);
        return { avgDuration, errorCount, successPercent };
    }, [filteredLogs]);

    const hasActiveFilters = logSearch !== "" || methodFilter !== "ALL" || statusFilter !== "ALL" || typeFilter !== "ALL" || latencyFilter !== "ALL";

    function resetFilters() {
        setLogSearch("");
        setMethodFilter("ALL");
        setStatusFilter("ALL");
        setTypeFilter("ALL");
        setLatencyFilter("ALL");
    }

    return (
        <GenericPage title="Jurisprudência STJ - Consola de Administração & Servidor">
            <div className="container-fluid px-0 py-3">
                {/* Header Institucional */}
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 pb-3 border-bottom">
                    <div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-danger p-2 fs-6 rounded-3">
                                <i className="bi bi-cpu-fill"></i>
                            </span>
                            <h1 className="m-0 fs-3 fw-bold text-dark">Consola de Administração & Servidor</h1>
                        </div>
                        <p className="text-muted small mb-0 mt-1">
                            Monitorização de telemetria, integridade do cluster, registo de eventos operacionais e gestão do sistema.
                        </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <Link href="/dashboard" className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold">
                            <i className="bi bi-bar-chart-line-fill me-1"></i> Dashboard Público
                        </Link>
                        {can("manageUsers") && (
                            <Link href="/admin/users" className="btn btn-danger btn-sm rounded-pill px-3 fw-semibold">
                                <i className="bi bi-people-fill me-1"></i> Gerir Utilizadores
                            </Link>
                        )}
                    </div>
                </div>

                {!data ? (
                    <Loading />
                ) : (
                    <>
                        {/* Banner de Estado do Servidor / Cluster */}
                        <div className="card shadow-sm border-0 mb-4 bg-light">
                            <div className="card-body p-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className={`rounded-circle d-flex align-items-center justify-content-center ${
                                            data.clusterStatus === "green"
                                                ? "bg-success text-white"
                                                : data.clusterStatus === "yellow"
                                                ? "bg-warning text-dark"
                                                : "bg-secondary text-white"
                                        }`}
                                        style={{ width: 42, height: 42, fontSize: 20 }}
                                    >
                                        <i className="bi bi-hdd-network-fill"></i>
                                    </div>
                                    <div>
                                        <div className="fw-bold d-flex align-items-center gap-2">
                                            <span>Estado do Servidor:</span>
                                            <span
                                                className={`badge ${
                                                    data.clusterStatus === "green"
                                                        ? "bg-success"
                                                        : data.clusterStatus === "yellow"
                                                        ? "bg-warning text-dark"
                                                        : "bg-secondary"
                                                }`}
                                            >
                                                {data.clusterStatus === "green"
                                                    ? "Cluster Operacional (Green)"
                                                    : data.clusterStatus === "yellow"
                                                    ? "Degradado (Yellow)"
                                                    : "Modo Local / Standby"}
                                            </span>
                                        </div>
                                        <div className="small text-muted">
                                            Elasticsearch + Redis &bull; Sincronização Microsoft 365 / DGSI &bull; {data.totalDocs.toLocaleString("pt-PT")} acórdãos ativos
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-white text-dark border py-2 px-3 small">
                                        <i className="bi bi-clock-history text-danger me-1"></i> Último Sync ETL: <strong>{data.etlSummary.lastRunDate}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top KPIs de Telemetria */}
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card shadow-sm border h-100 rounded-3 p-3 bg-white">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <span className="text-muted small fw-semibold">Acórdãos no Índice</span>
                                        <span className="badge bg-danger bg-opacity-10 text-danger p-2">
                                            <i className="bi bi-file-earmark-text-fill fs-6"></i>
                                        </span>
                                    </div>
                                    <div className="fs-3 fw-bold text-dark mt-2">
                                        {data.totalDocs.toLocaleString("pt-PT")}
                                    </div>
                                    <div className="small text-success mt-1">
                                        <i className="bi bi-check-circle-fill me-1"></i> {data.qualityMetrics.dataCompletenessPercent}% com texto integral
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card shadow-sm border h-100 rounded-3 p-3 bg-white">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <span className="text-muted small fw-semibold">Utilizadores Registados</span>
                                        <span className="badge bg-primary bg-opacity-10 text-primary p-2">
                                            <i className="bi bi-people-fill fs-6"></i>
                                        </span>
                                    </div>
                                    <div className="fs-3 fw-bold text-primary mt-2">
                                        {data.userCount}
                                    </div>
                                    <div className="small text-muted mt-1">
                                        <i className="bi bi-shield-lock me-1"></i> Perfis com role RBAC
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card shadow-sm border h-100 rounded-3 p-3 bg-white">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <span className="text-muted small fw-semibold">Volume de Pesquisas</span>
                                        <span className="badge bg-warning bg-opacity-10 text-warning p-2">
                                            <i className="bi bi-search fs-6"></i>
                                        </span>
                                    </div>
                                    <div className="fs-3 fw-bold text-warning mt-2" style={{ color: "#b45309" }}>
                                        {data.searchAnalytics.totalSearches.toLocaleString("pt-PT")}
                                    </div>
                                    <div className="small text-muted mt-1">
                                        <i className="bi bi-graph-up-arrow text-primary me-1"></i> Consultas guardadas
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card shadow-sm border h-100 rounded-3 p-3 bg-white">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <span className="text-muted small fw-semibold">Conflitos de Indexação</span>
                                        <span className="badge bg-secondary bg-opacity-10 text-secondary p-2">
                                            <i className="bi bi-exclamation-triangle-fill fs-6"></i>
                                        </span>
                                    </div>
                                    <div className={`fs-3 fw-bold mt-2 ${data.pendingConflicts > 0 ? "text-warning" : "text-success"}`}>
                                        {data.pendingConflicts}
                                    </div>
                                    <div className="small text-muted mt-1">
                                        <i className="bi bi-arrow-repeat me-1"></i> A aguardar resolução
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Abas de Navegação dos Detalhes do Servidor */}
                        <div className="d-flex gap-2 mb-3 border-bottom pb-2">
                            <button
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === "overview" ? "btn-danger" : "btn-light border text-muted"}`}
                                onClick={() => setActiveTab("overview")}
                            >
                                <i className="bi bi-grid-fill me-1"></i> Módulos & Gestão
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === "logs" ? "btn-danger" : "btn-light border text-muted"}`}
                                onClick={() => setActiveTab("logs")}
                            >
                                <i className="bi bi-activity me-1"></i> Event Log / Telemetria em Tempo Real
                                <span className="badge bg-white text-danger ms-2 border">{data.eventLogs.length}</span>
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${activeTab === "quality" ? "btn-danger" : "btn-light border text-muted"}`}
                                onClick={() => setActiveTab("quality")}
                            >
                                <i className="bi bi-database-check me-1"></i> Qualidade & Ingestão de Dados
                            </button>
                        </div>

                        {/* Conteúdo da Aba: Módulos & Gestão */}
                        {activeTab === "overview" && (
                            <div className="row g-4 mb-4">
                                <div className="col-12 col-md-6 col-xl-4">
                                    <div className="card shadow-sm border h-100 rounded-3 p-3">
                                        <div className="d-flex align-items-center gap-3 mb-2">
                                            <div className="badge bg-danger p-2 fs-5 rounded-3">
                                                <i className="bi bi-bar-chart-line"></i>
                                            </div>
                                            <div>
                                                <h5 className="card-title m-0 fs-6 fw-bold">Dashboard Analítico</h5>
                                                <span className="small text-muted">Estatísticas Públicas</span>
                                            </div>
                                        </div>
                                        <p className="card-text small text-muted flex-grow-1">
                                            Visualizar métricas gerais, gráficos temporais (ano a ano / mês a mês) e distribuição de jurisprudência.
                                        </p>
                                        <Link href="/dashboard" className="btn btn-outline-danger btn-sm fw-semibold">
                                            Abrir Dashboard <i className="bi bi-arrow-right ms-1"></i>
                                        </Link>
                                    </div>
                                </div>

                                {can("manageUsers") && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm border h-100 rounded-3 p-3">
                                            <div className="d-flex align-items-center gap-3 mb-2">
                                                <div className="badge bg-primary p-2 fs-5 rounded-3">
                                                    <i className="bi bi-people-fill"></i>
                                                </div>
                                                <div>
                                                    <h5 className="card-title m-0 fs-6 fw-bold">Gestão de Utilizadores</h5>
                                                    <span className="small text-muted">Segurança & RBAC</span>
                                                </div>
                                            </div>
                                            <p className="card-text small text-muted flex-grow-1">
                                                Criar utilizadores, definir papéis de permissão (Administrador / Editor) e gerir acessos.
                                            </p>
                                            <Link href="/admin/users" className="btn btn-outline-primary btn-sm fw-semibold">
                                                Gerir Utilizadores <i className="bi bi-arrow-right ms-1"></i>
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                <div className="col-12 col-md-6 col-xl-4">
                                    <div className="card shadow-sm border h-100 rounded-3 p-3">
                                        <div className="d-flex align-items-center gap-3 mb-2">
                                            <div className="badge bg-success p-2 fs-5 rounded-3">
                                                <i className="bi bi-file-earmark-plus-fill"></i>
                                            </div>
                                            <div>
                                                <h5 className="card-title m-0 fs-6 fw-bold">Criar Acórdão</h5>
                                                <span className="small text-muted">Registo Manual</span>
                                            </div>
                                        </div>
                                        <p className="card-text small text-muted flex-grow-1">
                                            Criar novo acórdão manualmente no sistema com metadados estruturados, sumário e texto integral.
                                        </p>
                                        <Link href="/editar/criar" className="btn btn-outline-success btn-sm fw-semibold">
                                            Novo Acórdão <i className="bi bi-arrow-right ms-1"></i>
                                        </Link>
                                    </div>
                                </div>

                                {can("importExport") && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm border h-100 rounded-3 p-3">
                                            <div className="d-flex align-items-center gap-3 mb-2">
                                                <div className="badge bg-info text-white p-2 fs-5 rounded-3">
                                                    <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                                                </div>
                                                <div>
                                                    <h5 className="card-title m-0 fs-6 fw-bold">Importar / Exportar</h5>
                                                    <span className="small text-muted">Excel & Ficheiros</span>
                                                </div>
                                            </div>
                                            <p className="card-text small text-muted flex-grow-1">
                                                Importar ou exportar folhas de cálculo Excel para atualização e auditoria de jurisprudência em lote.
                                            </p>
                                            <Link href="/admin/excel" className="btn btn-outline-info btn-sm fw-semibold">
                                                Aceder a Excel <i className="bi bi-arrow-right ms-1"></i>
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {can("filters") && (
                                    <div className="col-12 col-md-6 col-xl-4">
                                        <div className="card shadow-sm border h-100 rounded-3 p-3">
                                            <div className="d-flex align-items-center gap-3 mb-2">
                                                <div className="badge bg-secondary p-2 fs-5 rounded-3">
                                                    <i className="bi bi-sliders"></i>
                                                </div>
                                                <div>
                                                    <h5 className="card-title m-0 fs-6 fw-bold">Gestão de Filtros</h5>
                                                    <span className="small text-muted">Índices & Chaves</span>
                                                </div>
                                            </div>
                                            <p className="card-text small text-muted flex-grow-1">
                                                Gerir filtros escondidos ou removidos, controlar visibilidade das facetas de pesquisa pública.
                                            </p>
                                            <Link href="/admin/filters" className="btn btn-outline-secondary btn-sm fw-semibold">
                                                Configurar Filtros <i className="bi bi-arrow-right ms-1"></i>
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                <div className="col-12 col-md-6 col-xl-4">
                                    <div className="card shadow-sm border h-100 rounded-3 p-3">
                                        <div className="d-flex align-items-center gap-3 mb-2">
                                            <div className="badge bg-dark p-2 fs-5 rounded-3">
                                                <i className="bi bi-search"></i>
                                            </div>
                                            <div>
                                                <h5 className="card-title m-0 fs-6 fw-bold">Pesquisa Avançada</h5>
                                                <span className="small text-muted">Modo Editorial</span>
                                            </div>
                                        </div>
                                        <p className="card-text small text-muted flex-grow-1">
                                            Pesquise com acesso a todos os estados de publicação e abertura de documentos em modo de edição.
                                        </p>
                                        <Link href="/pesquisa" className="btn btn-outline-dark btn-sm fw-semibold">
                                            Ir para Pesquisa <i className="bi bi-arrow-right ms-1"></i>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conteúdo da Aba: Event Log / Telemetria com FILTROS AVANÇADOS */}
                        {activeTab === "logs" && (
                            <div className="card shadow-sm border rounded-3 p-3 mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <h5 className="m-0 fs-6 fw-bold text-dark d-flex align-items-center gap-2">
                                        <i className="bi bi-activity text-danger"></i> Registo de Pedidos & Eventos Recentes (requests.0.2)
                                    </h5>
                                    
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-light text-dark border">
                                            A mostrar <strong>{filteredLogs.length}</strong> de {data.eventLogs.length} eventos
                                        </span>
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={resetFilters}
                                                className="btn btn-outline-secondary btn-sm py-0 px-2 small"
                                                title="Limpar todos os filtros"
                                            >
                                                <i className="bi bi-x-circle me-1"></i> Limpar Filtros
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Barra de Filtros Interativos */}
                                <div className="p-3 bg-light rounded-3 border mb-3">
                                    <div className="row g-3 align-items-center">
                                        {/* Pesquisa por URL / Endpoint */}
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-muted mb-1">
                                                <i className="bi bi-search me-1"></i> Filtrar por URL / Endpoint
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm bg-white"
                                                placeholder="ex: /api/search, /dashboard, login..."
                                                value={logSearch}
                                                onChange={(e) => setLogSearch(e.target.value)}
                                            />
                                        </div>

                                        {/* Filtro de Método HTTP */}
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-muted mb-1">
                                                Método HTTP
                                            </label>
                                            <select
                                                className="form-select form-select-sm bg-white"
                                                value={methodFilter}
                                                onChange={(e) => setMethodFilter(e.target.value as any)}
                                            >
                                                <option value="ALL">Todos os Métodos</option>
                                                <option value="GET">GET</option>
                                                <option value="POST">POST</option>
                                                <option value="DELETE">DELETE</option>
                                            </select>
                                        </div>

                                        {/* Filtro de Estado HTTP */}
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-muted mb-1">
                                                Estado HTTP
                                            </label>
                                            <select
                                                className="form-select form-select-sm bg-white"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                            >
                                                <option value="ALL">Todos os Estados</option>
                                                <option value="2xx">2xx (Sucesso)</option>
                                                <option value="3xx">3xx (Redirecionamento)</option>
                                                <option value="4xx">4xx (Erro Cliente)</option>
                                                <option value="5xx">5xx (Erro Servidor)</option>
                                            </select>
                                        </div>

                                        {/* Filtro de Tipo (API vs SSP) */}
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-muted mb-1">
                                                Tipo de Pedido
                                            </label>
                                            <select
                                                className="form-select form-select-sm bg-white"
                                                value={typeFilter}
                                                onChange={(e) => setTypeFilter(e.target.value as any)}
                                            >
                                                <option value="ALL">Todos os Tipos</option>
                                                <option value="api">API (JSON)</option>
                                                <option value="ssp">SSP (Render SSR)</option>
                                            </select>
                                        </div>

                                        {/* Filtro de Latência / Duração */}
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-muted mb-1">
                                                Latência / Tempo
                                            </label>
                                            <select
                                                className="form-select form-select-sm bg-white"
                                                value={latencyFilter}
                                                onChange={(e) => setLatencyFilter(e.target.value as any)}
                                            >
                                                <option value="ALL">Qualquer Duração</option>
                                                <option value="fast">&lt; 20ms (Rápido)</option>
                                                <option value="medium">20ms - 100ms</option>
                                                <option value="slow">&gt; 100ms (Lento)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Métricas Rápidas dos Registos Filtrados */}
                                    <div className="d-flex gap-3 mt-2 pt-2 border-top flex-wrap small text-muted">
                                        <span>
                                            <i className="bi bi-stopwatch text-primary me-1"></i> Latência Média: <strong>{logMetrics.avgDuration}ms</strong>
                                        </span>
                                        <span>
                                            <i className="bi bi-check-circle text-success me-1"></i> Taxa de Sucesso: <strong>{logMetrics.successPercent}%</strong>
                                        </span>
                                        {logMetrics.errorCount > 0 && (
                                            <span className="text-danger fw-semibold">
                                                <i className="bi bi-exclamation-octagon-fill me-1"></i> {logMetrics.errorCount} erro(s) detetado(s)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Tabela de Registos */}
                                {filteredLogs.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-funnel fs-1 d-block mb-2 text-secondary"></i>
                                        <p className="mb-2">Nenhum evento corresponde aos filtros selecionados.</p>
                                        <button onClick={resetFilters} className="btn btn-outline-danger btn-sm">
                                            Limpar Filtros
                                        </button>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover table-sm align-middle small mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Método</th>
                                                    <th>Endpoint / URL</th>
                                                    <th>Tipo</th>
                                                    <th>Estado</th>
                                                    <th>Latência</th>
                                                    <th>Data / Hora</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLogs.map((log) => (
                                                    <tr key={log.id}>
                                                        <td>
                                                            <span
                                                                className={`badge ${
                                                                    log.method === "POST"
                                                                        ? "bg-primary"
                                                                        : log.method === "DELETE"
                                                                        ? "bg-danger"
                                                                        : "bg-secondary"
                                                                }`}
                                                            >
                                                                {log.method}
                                                            </span>
                                                        </td>
                                                        <td className="font-monospace text-truncate" style={{ maxWidth: "350px" }} title={log.url}>
                                                            {log.url}
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-light text-muted border">
                                                                {log.type.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`badge ${
                                                                    log.status >= 200 && log.status < 300
                                                                        ? "bg-success"
                                                                        : log.status >= 300 && log.status < 400
                                                                        ? "bg-info text-white"
                                                                        : "bg-danger"
                                                                }`}
                                                            >
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`fw-semibold ${log.duration > 100 ? "text-warning" : "text-muted"}`}>
                                                                {log.duration}ms
                                                            </span>
                                                        </td>
                                                        <td className="text-muted">
                                                            {new Date(log.timestamp).toLocaleTimeString("pt-PT")} &bull;{" "}
                                                            {new Date(log.timestamp).toLocaleDateString("pt-PT")}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Conteúdo da Aba: Qualidade & Ingestão */}
                        {activeTab === "quality" && (
                            <div className="row g-4 mb-4">
                                <div className="col-12 col-xl-6">
                                    <div className="card shadow-sm border rounded-3 p-3 h-100">
                                        <h5 className="fs-6 fw-bold mb-3 d-flex align-items-center gap-2">
                                            <i className="bi bi-shield-check text-success"></i> Métricas de Integridade & Qualidade
                                        </h5>
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between small fw-semibold mb-1">
                                                <span>Cobertura com Texto Integral:</span>
                                                <span>{data.qualityMetrics.hasTextoIntegral.toLocaleString("pt-PT")} ({data.qualityMetrics.dataCompletenessPercent}%)</span>
                                            </div>
                                            <div className="progress" style={{ height: 8 }}>
                                                <div className="progress-bar bg-success" style={{ width: `${data.qualityMetrics.dataCompletenessPercent}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between small fw-semibold mb-1">
                                                <span>Acórdãos com Sumário Indexado:</span>
                                                <span>{(data.totalDocs - data.qualityMetrics.missingSummary).toLocaleString("pt-PT")} ({(100 - (data.qualityMetrics.missingSummary / data.totalDocs) * 100).toFixed(1)}%)</span>
                                            </div>
                                            <div className="progress" style={{ height: 8 }}>
                                                <div className="progress-bar bg-primary" style={{ width: `${100 - (data.qualityMetrics.missingSummary / data.totalDocs) * 100}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-light rounded-3 border small">
                                            <div className="fw-bold mb-1">Alertas de Qualidade de Dados:</div>
                                            <ul className="mb-0 ps-3">
                                                <li>{data.qualityMetrics.missingSummary} acórdãos sem sumário estruturado</li>
                                                <li>{data.qualityMetrics.unmappedDescriptors} descritores fora do vocabulário controlado</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-xl-6">
                                    <div className="card shadow-sm border rounded-3 p-3 h-100">
                                        <h5 className="fs-6 fw-bold mb-3 d-flex align-items-center gap-2">
                                            <i className="bi bi-search-heart text-danger"></i> Termos Mais Pesquisados no Sistema
                                        </h5>
                                        <div className="list-group list-group-flush">
                                            {data.searchAnalytics.topQueries.map((q, idx) => (
                                                <div key={idx} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                                    <span className="fw-semibold">
                                                        <i className="bi bi-search text-muted me-2 small"></i>
                                                        {q.query}
                                                    </span>
                                                    <span className="badge bg-light text-dark border">
                                                        {q.count.toLocaleString("pt-PT")} pesquisas
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
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