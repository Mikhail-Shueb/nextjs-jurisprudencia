import React, { useState } from "react";
import Link from "next/link";
import { GenericPageWithForm } from "@/components/main_pages/genericPageStructure";
import { FormProps, withForm } from "@/components/main_pages/pageWithForm";
import { LoggerServerSideProps } from "@/core/logger-api";
import { useFetch } from "@/components/useFetch";
import { Loading } from "@/components/loading";
import { DashboardStatsResponse } from "./api/dashboard/stats";

export const getServerSideProps = LoggerServerSideProps(withForm<FormProps>(async (ctx, formProps) => {
  return { ...formProps };
}));

export default function UserDashboard(props: FormProps) {
  const stats = useFetch<DashboardStatsResponse>("/api/dashboard/stats", []);
  const [temporalMode, setTemporalMode] = useState<"yearly" | "monthly">("yearly");

  return (
    <GenericPageWithForm {...props} title="Jurisprudência STJ - Painel de Análise">
      <div className="dashboard-container">
        
        {/* Cabeçalho Institucional */}
        <div className="dash-header">
          <div className="dash-title-group">
            <div className="dash-icon-badge">
              <i className="bi bi-bar-chart-line-fill"></i>
            </div>
            <div>
              <h1 className="dash-title">Painel de Análise Jurisprudencial</h1>
              <p className="dash-subtitle">
                Estatísticas consolidadas, tendências temporais e distribuição temática dos acórdãos do Supremo Tribunal de Justiça.
              </p>
            </div>
          </div>
          
          <div className="dash-nav-pills">
            <Link href="/pesquisa" className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 fw-semibold">
              <i className="bi bi-search me-1"></i> Pesquisa Avançada
            </Link>
            <Link href="/indices" className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-1 fw-semibold">
              <i className="bi bi-tags me-1"></i> Matriz de Índices
            </Link>
          </div>
        </div>

        {!stats ? (
          <Loading />
        ) : (
          <>
            {/* Aviso informativo em modo de fallback */}
            {stats.isFallback && (
              <div className="alert alert-light border border-warning mb-4 py-2 px-3 small d-flex align-items-center gap-2 rounded-3" role="alert">
                <i className="bi bi-info-circle-fill text-warning fs-5"></i>
                <div>
                  <strong>Modo de Demonstração Local:</strong> Estatísticas representativas de referência da jurisprudência do STJ.
                </div>
              </div>
            )}

            {/* Linha de KPIs (4 Cards de Topo) */}
            <div className="kpi-grid">
              <Link href="/pesquisa" className="kpi-card kpi-card-crimson text-decoration-none">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Total de Acórdãos</span>
                  <div className="kpi-card-icon kpi-icon-crimson">
                    <i className="bi bi-journal-bookmark-fill"></i>
                  </div>
                </div>
                <div className="kpi-card-value text-danger">
                  {stats.totalDocs.toLocaleString("pt-PT")}
                </div>
                <div className="kpi-card-subtext">
                  <i className="bi bi-database-check text-success"></i> Decisões indexadas no arquivo
                </div>
              </Link>

              <Link href='/pesquisa?Votação="Unanimidade"' className="kpi-card kpi-card-gold text-decoration-none">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Taxa de Unanimidade</span>
                  <div className="kpi-card-icon kpi-icon-gold">
                    <i className="bi bi-shield-check"></i>
                  </div>
                </div>
                <div className="kpi-card-value" style={{ color: "#b45309" }}>
                  {stats.unanimousPercent}%
                </div>
                <div className="kpi-card-subtext">
                  <i className="bi bi-people-fill"></i> Decisões sem voto de vencido
                </div>
              </Link>

              <Link href={`/pesquisa?Relator+Nome+Profissional="${encodeURIComponent(stats.topRelator.name)}"`} className="kpi-card kpi-card-navy text-decoration-none">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Relator com Mais Decisões</span>
                  <div className="kpi-card-icon kpi-icon-navy">
                    <i className="bi bi-person-badge-fill"></i>
                  </div>
                </div>
                <div className="kpi-card-value text-primary fs-4 text-truncate" title={stats.topRelator.name}>
                  {stats.topRelator.name}
                </div>
                <div className="kpi-card-subtext">
                  <i className="bi bi-file-earmark-text"></i> {stats.topRelator.count.toLocaleString("pt-PT")} acórdãos relatados
                </div>
              </Link>

              <Link href={`/pesquisa?MinAno=${stats.yearlyStats[stats.yearlyStats.length - 1]?.year || "2026"}&MaxAno=${stats.yearlyStats[stats.yearlyStats.length - 1]?.year || "2026"}`} className="kpi-card kpi-card-emerald text-decoration-none">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Decisões em {stats.yearlyStats[stats.yearlyStats.length - 1]?.year || "2026"}</span>
                  <div className="kpi-card-icon kpi-icon-emerald">
                    <i className="bi bi-calendar-check-fill"></i>
                  </div>
                </div>
                <div className="kpi-card-value text-success">
                  {stats.currentYearCount ? stats.currentYearCount.toLocaleString("pt-PT") : `+${stats.recentCount}`}
                </div>
                <div className="kpi-card-subtext">
                  <i className="bi bi-arrow-up-right"></i> Processos do ano corrente
                </div>
              </Link>
            </div>

            {/* Linha 1 de Gráficos: Evolução Temporal & Distribuição por Área */}
            <div className="row g-4 mb-4">
              
              {/* Gráfico Temporal (Comutador Ano / Mês) */}
              <div className="col-12 col-xl-7">
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <div>
                      <h2 className="dash-panel-title">
                        <i className="bi bi-graph-up text-danger"></i>
                        {temporalMode === "yearly" ? "Evolução Temporal das Decisões (Ano a Ano)" : "Distribuição e Sazonalidade Mensal"}
                      </h2>
                    </div>
                    
                    <div className="dash-tab-group">
                      <button
                        type="button"
                        className={`dash-tab-btn ${temporalMode === "yearly" ? "active" : ""}`}
                        onClick={() => setTemporalMode("yearly")}
                      >
                        <i className="bi bi-calendar3 me-1"></i> Por Ano
                      </button>
                      <button
                        type="button"
                        className={`dash-tab-btn ${temporalMode === "monthly" ? "active" : ""}`}
                        onClick={() => setTemporalMode("monthly")}
                      >
                        <i className="bi bi-calendar-month me-1"></i> Por Mês
                      </button>
                    </div>
                  </div>

                  <p className="dash-panel-subtitle">
                    {temporalMode === "yearly"
                      ? "Volume total de acórdãos proferidos no STJ por ano civil. Clique numa coluna para abrir os processos desse ano."
                      : "Distribuição média de acórdãos ao longo dos 12 meses do ano civil, refletindo as férias judiciais (Agosto)."}
                  </p>

                  {temporalMode === "yearly" ? (
                    <div className="chart-columns-container">
                      {(() => {
                        const maxVal = Math.max(...stats.yearlyStats.map((y) => y.count), 1);
                        return stats.yearlyStats.map((item, idx) => {
                          const heightPct = Math.max(10, (item.count / maxVal) * 100);
                          return (
                            <Link
                              key={idx}
                              href={`/pesquisa?MinAno=${item.year}&MaxAno=${item.year}`}
                              className="chart-col-item"
                              title={`Ano ${item.year}: ${item.count.toLocaleString("pt-PT")} acórdãos (Clique para filtrar)`}
                            >
                              <span className="chart-col-val">
                                {item.count > 999 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                              </span>
                              <div className="chart-col-bar" style={{ height: `${heightPct}%` }}></div>
                              <span className="chart-col-label">{item.year}</span>
                            </Link>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="chart-columns-container">
                      {(() => {
                        const maxVal = Math.max(...stats.monthlyStats.map((m) => m.count), 1);
                        return stats.monthlyStats.map((item, idx) => {
                          const heightPct = Math.max(8, (item.count / maxVal) * 100);
                          return (
                            <Link
                              key={idx}
                              href={`/pesquisa`}
                              className="chart-col-item"
                              title={`Mês de ${item.month}: ${item.count.toLocaleString("pt-PT")} decisões (~${item.percent}%)`}
                            >
                              <span className="chart-col-val">
                                {item.count > 999 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                              </span>
                              <div className="chart-col-bar chart-col-bar-blue" style={{ height: `${heightPct}%` }}></div>
                              <span className="chart-col-label">{item.monthShort}</span>
                            </Link>
                          );
                        });
                      })()}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                    <span className="dash-click-hint">
                      <i className="bi bi-cursor-fill me-1"></i> Clique em qualquer barra para pesquisar o respetivo período
                    </span>
                    <span className="badge bg-light text-muted border">
                      {temporalMode === "yearly" ? `${stats.yearlyStats.length} Anos Catalogados` : "12 Meses"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribuição por Áreas do Direito */}
              <div className="col-12 col-xl-5">
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h2 className="dash-panel-title">
                      <i className="bi bi-pie-chart-fill text-warning"></i>
                      Distribuição por Áreas do Direito
                    </h2>
                    <span className="badge bg-light text-dark border">Grandes Ramos</span>
                  </div>

                  <p className="dash-panel-subtitle">
                    Proporção e volume de acórdãos classificados pelas áreas substantivas do STJ.
                  </p>

                  <div className="progress-list mb-3">
                    {stats.areaStats.map((area, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Área="${encodeURIComponent(area.name)}"`}
                        className="progress-item"
                        title={`Filtrar por ${area.name}`}
                      >
                        <div className="progress-labels">
                          <span className="progress-name">
                            <span className="rounded-circle d-inline-block" style={{ width: 10, height: 10, background: area.color || "#991b1b" }}></span>
                            {area.name}
                          </span>
                          <span className="progress-count">
                            <strong>{area.count.toLocaleString("pt-PT")}</strong> ({area.percent}%)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${area.percent}%`,
                              background: area.color || "#991b1b"
                            }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Divisão de Votação (Unanimidade vs Maioria) */}
                  <div className="p-3 bg-light rounded-3 mt-auto border">
                    <div className="d-flex justify-content-between align-items-center mb-1 small fw-bold">
                      <span><i className="bi bi-check2-all text-success me-1"></i> Consenso Coletivo:</span>
                      <span className="text-muted">{stats.unanimousPercent}% Unânime</span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-success" style={{ width: `${stats.unanimousPercent}%` }} title={`Unanimidade: ${stats.unanimousPercent}%`}></div>
                      <div className="progress-bar bg-secondary" style={{ width: `${100 - stats.unanimousPercent}%` }} title={`Com voto de vencido: ${(100 - stats.unanimousPercent).toFixed(1)}%`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 2: Sentido das Decisões & Secções Judiciais & Relatores */}
            <div className="row g-4 mb-4">
              
              {/* Sentido das Decisões */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h2 className="dash-panel-title">
                      <i className="bi bi-hammer text-danger"></i>
                      Sentido das Deliberações
                    </h2>
                  </div>
                  
                  <p className="dash-panel-subtitle">
                    Classificação dos recursos quanto ao provimento concedido.
                  </p>

                  <div className="progress-list">
                    {stats.decisionStats.map((dec, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Decisão="${encodeURIComponent(dec.name)}"`}
                        className="progress-item"
                        title={`Filtrar acórdãos com sentido: ${dec.name}`}
                      >
                        <div className="progress-labels">
                          <span className="progress-name">
                            <span className="rounded-circle d-inline-block" style={{ width: 10, height: 10, background: dec.color || "#dc2626" }}></span>
                            {dec.name}
                          </span>
                          <span className="progress-count">
                            {dec.count.toLocaleString("pt-PT")} ({dec.percent}%)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${dec.percent}%`,
                              background: dec.color || "#dc2626"
                            }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secções Judiciais */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h2 className="dash-panel-title">
                      <i className="bi bi-building text-primary"></i>
                      Secções Judiciais do STJ
                    </h2>
                  </div>
                  
                  <p className="dash-panel-subtitle">
                    Volume distribuído pelas Secções Cíveis, Criminais e Social.
                  </p>

                  <div className="progress-list">
                    {stats.sectionStats.slice(0, 6).map((sec, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Secção="${encodeURIComponent(sec.name)}"`}
                        className="progress-item"
                        title={`Filtrar por ${sec.name}`}
                      >
                        <div className="progress-labels">
                          <span className="progress-name text-truncate" style={{ maxWidth: "200px" }}>
                            {sec.name}
                          </span>
                          <span className="progress-count">
                            {sec.count.toLocaleString("pt-PT")} ({sec.percent}%)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill bg-primary bg-opacity-75"
                            style={{ width: `${(sec.count / stats.totalDocs) * 100 * 4}%` }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Relatores em Destaque */}
              <div className="col-12 col-xl-4">
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h2 className="dash-panel-title">
                      <i className="bi bi-award-fill text-warning"></i>
                      Relatores em Destaque
                    </h2>
                    <span className="badge bg-light text-muted border">Top Atividade</span>
                  </div>

                  <p className="dash-panel-subtitle">
                    Juízes Conselheiros com maior número de acórdãos relatados.
                  </p>

                  <div className="leaderboard-list">
                    {stats.topRelatores.slice(0, 6).map((rel, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Relator+Nome+Profissional="${encodeURIComponent(rel.name)}"`}
                        className="leaderboard-item"
                        title={`Ver acórdãos relatados por ${rel.name}`}
                      >
                        <div className="leaderboard-left">
                          <span className={`leaderboard-rank ${idx < 3 ? `leaderboard-rank-${idx + 1}` : ""}`}>
                            {idx + 1}
                          </span>
                          <span className="leaderboard-name text-truncate" style={{ maxWidth: "180px" }}>
                            {rel.name}
                          </span>
                        </div>
                        <span className="leaderboard-badge">
                          {rel.count.toLocaleString("pt-PT")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 3: Temas Jurídicos Recorrentes (Nuvem de Descritores) */}
            <div className="dash-panel mb-4">
              <div className="dash-panel-header">
                <h2 className="dash-panel-title">
                  <i className="bi bi-tags-fill text-warning"></i>
                  Temas e Descritores Jurídicos Recorrentes
                </h2>
                <span className="badge bg-light text-dark border">Vocabulário Uniforme</span>
              </div>
              
              <p className="dash-panel-subtitle">
                Descritores mais indexados nos acórdãos do STJ. Clique num tema para abrir a respetiva jurisprudência.
              </p>

              <div className="descriptor-cloud">
                {stats.topDescriptors.map((desc, idx) => (
                  <Link
                    key={idx}
                    href={`/pesquisa?Descritores="${encodeURIComponent(desc.name)}"`}
                    className="descriptor-pill"
                    title={`Pesquisar acórdãos com o descritor: ${desc.name}`}
                  >
                    <span>{desc.name}</span>
                    <span className="badge">{desc.count.toLocaleString("pt-PT")}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Linha 4: Decisões Recentes em Destaque */}
            <div className="dash-panel mb-4">
              <div className="dash-panel-header">
                <h2 className="dash-panel-title">
                  <i className="bi bi-clock-history text-danger"></i>
                  Acórdãos Recentes em Destaque
                </h2>
                <Link href="/pesquisa?sort=des" className="btn btn-outline-danger btn-sm rounded-pill px-3">
                  Ver Todas as Decisões <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              </div>

              <div className="decision-feed-grid">
                {stats.recentDecisions.map((dec, idx) => {
                  const rulingHref = dec.ecli && dec.ecli.startsWith("ECLI:PT:STJ:")
                    ? `/ecli/${dec.ecli}`
                    : `/${encodeURIComponent(dec.processo)}/${dec.id}`;

                  return (
                    <div key={idx} className="decision-feed-card">
                      <div className="decision-feed-meta">
                        <Link href={rulingHref} className="decision-proc">
                          <i className="bi bi-file-earmark-text me-1"></i> {dec.processo}
                        </Link>
                        <span className="badge bg-light text-dark border">{dec.data}</span>
                      </div>

                      <div className="small text-muted d-flex align-items-center gap-2">
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
                          {dec.area}
                        </span>
                        <span className="text-truncate" title={dec.relator}>
                          <i className="bi bi-person me-1"></i>{dec.relator}
                        </span>
                      </div>

                      <p className="decision-summary">{dec.sumario}</p>

                      <div className="decision-footer">
                        <span>{dec.seccao}</span>
                        <Link href={rulingHref} className="btn btn-sm btn-outline-danger py-0 px-2 fw-semibold">
                          Consultar <i className="bi bi-box-arrow-up-right ms-1"></i>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </GenericPageWithForm>
  );
}
