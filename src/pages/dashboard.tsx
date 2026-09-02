import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  const [quickQuery, setQuickQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      router.push(`/pesquisa?query=${encodeURIComponent(quickQuery.trim())}`);
    } else {
      router.push("/pesquisa");
    }
  };

  return (
    <GenericPageWithForm {...props} title="Supremo Tribunal de Justiça - Painel de Jurisprudência">
      <div className="dashboard-container">
        
        {/* Cabeçalho Institucional */}
        <div className="stj-header-banner">
          <div className="stj-header-left">
            <div className="stj-emblem-badge" title="Supremo Tribunal de Justiça">
              <i className="bi bi-bank2"></i>
            </div>
            <div>
              <h1 className="stj-main-title">Painel de Análise Jurisprudencial</h1>
              <p className="stj-main-subtitle">
                Estatísticas oficiais, evolução temporal e distribuição temática dos acórdãos do Supremo Tribunal de Justiça.
              </p>
            </div>
          </div>
          
          <div className="stj-header-actions">
            <Link href="/pesquisa" className="stj-btn-primary">
              <i className="bi bi-search"></i> Pesquisa Avançada
            </Link>
            <Link href="/boletim" className="stj-btn-outline">
              <i className="bi bi-newspaper"></i> Boletim Mensal
            </Link>
            <Link href="/indices" className="stj-btn-outline">
              <i className="bi bi-table"></i> Matriz de Índices
            </Link>
          </div>
        </div>

        {/* Barra de Pesquisa Rápida Integrada */}
        <div className="stj-quicksearch-bar">
          <form onSubmit={handleSearch} className="stj-search-input-group">
            <div className="stj-search-input-wrapper">
              <i className="bi bi-search stj-search-icon"></i>
              <input
                type="text"
                className="stj-search-input"
                placeholder="Pesquisar diretamente por termo, conceito jurídico ou número de processo (ex: 123/20.5YFLSB)..."
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="stj-search-submit">
              <i className="bi bi-arrow-right-circle"></i> Pesquisar
            </button>
          </form>

          <div className="stj-quick-tags">
            <span>Acesso direto por ramo:</span>
            <Link href='/pesquisa?Área="Cível"' className="stj-tag-chip">
              <i className="bi bi-tag-fill me-1 text-danger"></i> Cível
            </Link>
            <Link href='/pesquisa?Área="Criminal"' className="stj-tag-chip">
              <i className="bi bi-tag-fill me-1 text-primary"></i> Criminal
            </Link>
            <Link href='/pesquisa?Área="Social"' className="stj-tag-chip">
              <i className="bi bi-tag-fill me-1 text-success"></i> Social
            </Link>
            <Link href='/pesquisa?Votação="Unanimidade"' className="stj-tag-chip">
              <i className="bi bi-check2-circle me-1 text-warning"></i> Votação Unânime
            </Link>
            <Link href="/boletim" className="stj-tag-chip">
              <i className="bi bi-file-earmark-pdf me-1 text-danger"></i> Gerar Boletim
            </Link>
            <Link href="/pesquisa?sort=des" className="stj-tag-chip">
              <i className="bi bi-clock-history me-1"></i> Mais Recentes
            </Link>
          </div>
        </div>

        {!stats ? (
          <Loading />
        ) : (
          <>
            {/* Aviso em modo de fallback quando offline */}
            {stats.isFallback && (
              <div className="alert alert-light border border-warning mb-3 py-2 px-3 small d-flex align-items-center gap-2 rounded-2" role="alert">
                <i className="bi bi-info-circle-fill text-warning fs-6"></i>
                <span className="text-muted">
                  <strong>Arquivo de Referência:</strong> Apresentando indicadores representativos consolidados do STJ.
                </span>
              </div>
            )}

            {/* 4 KPIs de Alto Nível */}
            <div className="stj-kpi-grid">
              <Link href="/pesquisa" className="stj-kpi-card stj-kpi-navy">
                <div className="stj-kpi-header">
                  <span className="stj-kpi-title">Total de Acórdãos</span>
                  <i className="bi bi-journal-bookmark-fill stj-kpi-icon"></i>
                </div>
                <div className="stj-kpi-number">
                  {stats.totalDocs.toLocaleString("pt-PT")}
                </div>
                <div className="stj-kpi-subtext">
                  <i className="bi bi-check-circle-fill text-success"></i> Acórdãos registados no arquivo
                </div>
              </Link>

              <Link href='/pesquisa?Votação="Unanimidade"' className="stj-kpi-card stj-kpi-gold">
                <div className="stj-kpi-header">
                  <span className="stj-kpi-title">Taxa de Unanimidade</span>
                  <i className="bi bi-shield-check stj-kpi-icon"></i>
                </div>
                <div className="stj-kpi-number" style={{ color: "#92400e" }}>
                  {stats.unanimousPercent}%
                </div>
                <div className="stj-kpi-subtext">
                  <i className="bi bi-people-fill text-muted"></i> Decisões colegiais por consenso
                </div>
              </Link>

              <Link href={`/pesquisa?Relator+Nome+Profissional="${encodeURIComponent(stats.topRelator.name)}"`} className="stj-kpi-card stj-kpi-burgundy">
                <div className="stj-kpi-header">
                  <span className="stj-kpi-title">Maior Volume por Relator</span>
                  <i className="bi bi-person-badge-fill stj-kpi-icon"></i>
                </div>
                <div className="stj-kpi-number fs-4 text-truncate" title={stats.topRelator.name}>
                  {stats.topRelator.name}
                </div>
                <div className="stj-kpi-subtext">
                  <i className="bi bi-files text-muted"></i> {stats.topRelator.count.toLocaleString("pt-PT")} acórdãos relatados
                </div>
              </Link>

              <Link href={`/pesquisa?MinAno=${stats.yearlyStats[stats.yearlyStats.length - 1]?.year || "2026"}&MaxAno=${stats.yearlyStats[stats.yearlyStats.length - 1]?.year || "2026"}`} className="stj-kpi-card stj-kpi-emerald">
                <div className="stj-kpi-header">
                  <span className="stj-kpi-title">Ano {stats.yearlyStats[stats.yearlyStats.length - 1]?.year || "2026"}</span>
                  <i className="bi bi-calendar-check-fill stj-kpi-icon"></i>
                </div>
                <div className="stj-kpi-number text-success">
                  {stats.currentYearCount ? stats.currentYearCount.toLocaleString("pt-PT") : `+${stats.recentCount}`}
                </div>
                <div className="stj-kpi-subtext">
                  <i className="bi bi-arrow-up-right text-success"></i> Decisões proferidas no ano civil
                </div>
              </Link>
            </div>

            {/* Linha 1: Evolução Temporal & Distribuição por Ramo do Direito */}
            <div className="row g-3 mb-3">
              
              {/* Gráfico de Evolução Temporal */}
              <div className="col-12 col-xl-7">
                <div className="stj-panel">
                  <div className="stj-panel-header">
                    <h2 className="stj-panel-title">
                      <i className="bi bi-bar-chart-fill text-primary"></i>
                      {temporalMode === "yearly" ? "Volume Anual de Acórdãos" : "Sazonalidade e Distribuição Mensal"}
                    </h2>
                    
                    <div className="stj-mode-tabs">
                      <button
                        type="button"
                        className={`stj-tab-btn ${temporalMode === "yearly" ? "active" : ""}`}
                        onClick={() => setTemporalMode("yearly")}
                      >
                        <i className="bi bi-calendar3 me-1"></i> Anual
                      </button>
                      <button
                        type="button"
                        className={`stj-tab-btn ${temporalMode === "monthly" ? "active" : ""}`}
                        onClick={() => setTemporalMode("monthly")}
                      >
                        <i className="bi bi-calendar-month me-1"></i> Mensal
                      </button>
                    </div>
                  </div>

                  <p className="stj-panel-desc">
                    {temporalMode === "yearly"
                      ? "Histórico de decisões proferidas por ano civil. Clique numa coluna para filtrar as decisões desse ano."
                      : "Distribuição mensal agregada das deliberações ao longo do ano judicial."}
                  </p>

                  {temporalMode === "yearly" ? (
                    <div className="stj-chart-container">
                      {(() => {
                        const maxVal = Math.max(...stats.yearlyStats.map((y) => y.count), 1);
                        return stats.yearlyStats.map((item, idx) => {
                          const heightPct = Math.max(10, (item.count / maxVal) * 100);
                          return (
                            <Link
                              key={idx}
                              href={`/pesquisa?MinAno=${item.year}&MaxAno=${item.year}`}
                              className="stj-chart-col"
                              title={`Ano ${item.year}: ${item.count.toLocaleString("pt-PT")} acórdãos`}
                            >
                              <span className="stj-chart-col-val">
                                {item.count > 999 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                              </span>
                              <div className="stj-chart-bar-wrap">
                                <div className="stj-chart-bar" style={{ height: `${heightPct}%` }}></div>
                              </div>
                              <span className="stj-chart-label">{item.year}</span>
                            </Link>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="stj-chart-container">
                      {(() => {
                        const maxVal = Math.max(...stats.monthlyStats.map((m) => m.count), 1);
                        return stats.monthlyStats.map((item, idx) => {
                          const heightPct = Math.max(8, (item.count / maxVal) * 100);
                          return (
                            <Link
                              key={idx}
                              href={`/pesquisa`}
                              className="stj-chart-col"
                              title={`Mês de ${item.month}: ${item.count.toLocaleString("pt-PT")} decisões (~${item.percent}%)`}
                            >
                              <span className="stj-chart-col-val">
                                {item.count > 999 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                              </span>
                              <div className="stj-chart-bar-wrap">
                                <div className="stj-chart-bar stj-chart-bar-blue" style={{ height: `${heightPct}%` }}></div>
                              </div>
                              <span className="stj-chart-label">{item.monthShort}</span>
                            </Link>
                          );
                        });
                      })()}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small text-muted">
                    <span>
                      <i className="bi bi-cursor-fill me-1 text-primary"></i> Clique numa barra para navegar
                    </span>
                    <span>
                      {temporalMode === "yearly" ? `${stats.yearlyStats.length} Anos Registados` : "12 Meses Judiciais"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribuição por Ramo do Direito */}
              <div className="col-12 col-xl-5">
                <div className="stj-panel">
                  <div className="stj-panel-header">
                    <h2 className="stj-panel-title">
                      <i className="bi bi-pie-chart-fill text-danger"></i>
                      Distribuição por Área do Direito
                    </h2>
                    <span className="badge bg-light text-dark border">Ramos Principais</span>
                  </div>

                  <p className="stj-panel-desc">
                    Volume e proporção de acórdãos classificados pelas áreas temáticas de competência do STJ.
                  </p>

                  <div className="stj-progress-list mb-3">
                    {stats.areaStats.map((area, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Área="${encodeURIComponent(area.name)}"`}
                        className="stj-progress-item"
                        title={`Filtrar por ${area.name}`}
                      >
                        <div className="stj-progress-header">
                          <span className="stj-progress-name">
                            <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: area.color || "#8b1e2d" }}></span>
                            {area.name}
                          </span>
                          <span className="stj-progress-meta">
                            <strong>{area.count.toLocaleString("pt-PT")}</strong> ({area.percent}%)
                          </span>
                        </div>
                        <div className="stj-progress-track">
                          <div
                            className="stj-progress-fill"
                            style={{
                              width: `${area.percent}%`,
                              background: area.color || "#8b1e2d"
                            }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Consenso Colegial */}
                  <div className="p-2 bg-light rounded-2 mt-auto border">
                    <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
                      <span><i className="bi bi-check2-all text-success me-1"></i> Consenso Coletivo:</span>
                      <span className="text-muted">{stats.unanimousPercent}% Unânime</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div className="progress-bar bg-success" style={{ width: `${stats.unanimousPercent}%` }} title={`Unanimidade: ${stats.unanimousPercent}%`}></div>
                      <div className="progress-bar bg-secondary" style={{ width: `${100 - stats.unanimousPercent}%` }} title={`Voto de Vencido: ${(100 - stats.unanimousPercent).toFixed(1)}%`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 2: Sentido das Decisões, Secções Judiciais e Relatores */}
            <div className="row g-3 mb-3">
              
              {/* Sentido das Decisões */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="stj-panel">
                  <div className="stj-panel-header">
                    <h2 className="stj-panel-title">
                      <i className="bi bi-hammer text-danger"></i>
                      Sentido das Deliberações
                    </h2>
                  </div>
                  
                  <p className="stj-panel-desc">
                    Classificação dos recursos quanto ao provimento concedido pelo coletivo.
                  </p>

                  <div className="stj-progress-list">
                    {stats.decisionStats.map((dec, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Decisão="${encodeURIComponent(dec.name)}"`}
                        className="stj-progress-item"
                        title={`Filtrar por ${dec.name}`}
                      >
                        <div className="stj-progress-header">
                          <span className="stj-progress-name">
                            <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: dec.color || "#8b1e2d" }}></span>
                            {dec.name}
                          </span>
                          <span className="stj-progress-meta">
                            {dec.count.toLocaleString("pt-PT")} ({dec.percent}%)
                          </span>
                        </div>
                        <div className="stj-progress-track">
                          <div
                            className="stj-progress-fill"
                            style={{
                              width: `${dec.percent}%`,
                              background: dec.color || "#8b1e2d"
                            }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secções do STJ */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="stj-panel">
                  <div className="stj-panel-header">
                    <h2 className="stj-panel-title">
                      <i className="bi bi-building text-primary"></i>
                      Secções Judiciais
                    </h2>
                  </div>
                  
                  <p className="stj-panel-desc">
                    Distribuição pelas Secções Cíveis, Criminais e Secção Social.
                  </p>

                  <div className="stj-progress-list">
                    {stats.sectionStats.slice(0, 6).map((sec, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Secção="${encodeURIComponent(sec.name)}"`}
                        className="stj-progress-item"
                        title={`Filtrar por ${sec.name}`}
                      >
                        <div className="stj-progress-header">
                          <span className="stj-progress-name text-truncate" style={{ maxWidth: "200px" }}>
                            {sec.name}
                          </span>
                          <span className="stj-progress-meta">
                            {sec.count.toLocaleString("pt-PT")} ({sec.percent}%)
                          </span>
                        </div>
                        <div className="stj-progress-track">
                          <div
                            className="stj-progress-fill"
                            style={{
                              width: `${(sec.count / stats.totalDocs) * 100 * 4}%`,
                              background: "#183b66"
                            }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Relatores em Destaque */}
              <div className="col-12 col-xl-4">
                <div className="stj-panel">
                  <div className="stj-panel-header">
                    <h2 className="stj-panel-title">
                      <i className="bi bi-person-lines-fill text-warning"></i>
                      Juízes Conselheiros
                    </h2>
                    <span className="badge bg-light text-muted border">Maior Volume</span>
                  </div>

                  <p className="stj-panel-desc">
                    Relatores com maior número de acórdãos catalogados no sistema.
                  </p>

                  <div className="stj-leaderboard">
                    {stats.topRelatores.slice(0, 6).map((rel, idx) => (
                      <Link
                        key={idx}
                        href={`/pesquisa?Relator+Nome+Profissional="${encodeURIComponent(rel.name)}"`}
                        className="stj-leader-row"
                        title={`Ver acórdãos relatados por ${rel.name}`}
                      >
                        <div className="stj-leader-left">
                          <span className={`stj-rank-badge ${idx < 3 ? `stj-rank-${idx + 1}` : ""}`}>
                            {idx + 1}
                          </span>
                          <span className="stj-leader-name">
                            {rel.name}
                          </span>
                        </div>
                        <span className="stj-leader-count">
                          {rel.count.toLocaleString("pt-PT")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 3: Temas Jurídicos Recorrentes (Nuvem de Descritores) */}
            <div className="stj-panel mb-3">
              <div className="stj-panel-header">
                <h2 className="stj-panel-title">
                  <i className="bi bi-tags-fill text-warning"></i>
                  Descritores e Conceitos Jurídicos Recorrentes
                </h2>
                <span className="badge bg-light text-dark border">Vocabulário Controlado</span>
              </div>
              
              <p className="stj-panel-desc">
                Conceitos e descritores mais frequentemente indexados. Clique num descritor para consultar todos os acórdãos conexos.
              </p>

              <div className="stj-tag-cloud">
                {stats.topDescriptors.map((desc, idx) => (
                  <Link
                    key={idx}
                    href={`/pesquisa?Descritores="${encodeURIComponent(desc.name)}"`}
                    className="stj-cloud-tag"
                    title={`Pesquisar acórdãos com o descritor: ${desc.name}`}
                  >
                    <span>{desc.name}</span>
                    <span className="stj-cloud-count">{desc.count.toLocaleString("pt-PT")}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Linha 4: Decisões Recentes em Destaque */}
            <div className="stj-panel">
              <div className="stj-panel-header">
                <h2 className="stj-panel-title">
                  <i className="bi bi-clock-history text-danger"></i>
                  Acórdãos Proferidos Recentemente
                </h2>
                <Link href="/pesquisa?sort=des" className="stj-btn-outline">
                  Ver Todas as Decisões <i className="bi bi-arrow-right"></i>
                </Link>
              </div>

              <p className="stj-panel-desc">
                Últimas decisões indexadas no repositório com indicação de processo, relator e sumário.
              </p>

              <div className="stj-decisions-feed">
                {stats.recentDecisions.map((dec, idx) => {
                  const rulingHref = dec.ecli && dec.ecli.startsWith("ECLI:PT:STJ:")
                    ? `/ecli/${dec.ecli}`
                    : `/${encodeURIComponent(dec.processo)}/${dec.id}`;

                  return (
                    <div key={idx} className="stj-ruling-card">
                      <div className="stj-ruling-header">
                        <Link href={rulingHref} className="stj-ruling-proc">
                          <i className="bi bi-file-earmark-text me-1"></i> {dec.processo}
                        </Link>
                        <span className="stj-ruling-date">{dec.data}</span>
                      </div>

                      <div className="stj-ruling-meta">
                        <span className="stj-badge-area">{dec.area}</span>
                        {dec.ecli && (
                          <span className="stj-badge-ecli" title={dec.ecli}>
                            {dec.ecli.length > 22 ? `${dec.ecli.substring(0, 22)}...` : dec.ecli}
                          </span>
                        )}
                        <span className="text-truncate" title={dec.relator}>
                          <i className="bi bi-person me-1"></i>{dec.relator}
                        </span>
                      </div>

                      <p className="stj-ruling-summary">{dec.sumario}</p>

                      <div className="stj-ruling-footer">
                        <span>{dec.seccao}</span>
                        <Link href={rulingHref} className="stj-ruling-link">
                          Consultar Acórdão <i className="bi bi-arrow-right-short"></i>
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
