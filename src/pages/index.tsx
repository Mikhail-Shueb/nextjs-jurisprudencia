import Head from 'next/head'
import GenericPage from '@/components/main_pages/genericPageStructure'
import Link from 'next/link'
import { GetServerSideProps } from 'next'
import { LoggerServerSideProps } from '@/core/logger-api'

export const getServerSideProps: GetServerSideProps = LoggerServerSideProps(async (ctx) => {
  return { redirect: {destination: "/pesquisa", permanent: false} }
})

export default function Home() {
  return (
    <GenericPage title="Jurisprudência STJ - Página Inicial">
      <div className="row g-3 p-3">
        <div className="col-12 col-md-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-body d-flex flex-column justify-content-between p-4">
              <div>
                <h5 className="card-title fw-bold text-danger">
                  <i className="bi bi-search me-2"></i>
                  Pesquisar Documentos
                </h5>
                <p className="card-text text-muted small">
                  Pesquise no arquivo completo de decisões do STJ através de texto livre, operadores avançados e filtros temáticos.
                </p>
              </div>
              <Link href="/pesquisa" className="btn btn-outline-danger btn-sm rounded-pill mt-3 align-self-start px-3">
                Pesquisa <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-body d-flex flex-column justify-content-between p-4">
              <div>
                <h5 className="card-title fw-bold text-dark">
                  <i className="bi bi-tags me-2 text-warning"></i>
                  Navegar Índices
                </h5>
                <p className="card-text text-muted small">
                  Explore os índices temáticos estruturados por área de jurisdição, secção e descritores oficiais.
                </p>
              </div>
              <Link href="/indices" className="btn btn-outline-dark btn-sm rounded-pill mt-3 align-self-start px-3">
                Navegar <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-body d-flex flex-column justify-content-between p-4">
              <div>
                <h5 className="card-title fw-bold text-danger">
                  <i className="bi bi-bar-chart-line-fill me-2 text-danger"></i>
                  Painel de Análise
                </h5>
                <p className="card-text text-muted small">
                  Consulte estatísticas consolidadas, taxas de unanimidade, tendências temporais e distribuições de acórdãos.
                </p>
              </div>
              <Link href="/dashboard" className="btn btn-danger btn-sm rounded-pill mt-3 align-self-start px-3 shadow-sm">
                Abrir Dashboard <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </GenericPage>
  )
}
