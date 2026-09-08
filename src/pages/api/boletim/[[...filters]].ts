import { getElasticSearchClient, padZero } from '@/core/elasticsearch';
import LoggerApi from '@/core/logger-api';
import { PartialJurisprudenciaDocument } from '@stjiris/jurisprudencia-document';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import type { NextApiRequest, NextApiResponse } from 'next';

type BulletinItem = {
    descritores: string[];
    sumario: string;
    data: string;
    processo: string;
    relator: string;
};

const DEMO_ITEMS_BY_AREA: Record<string, BulletinItem[]> = {
    "Área Cível": [
        {
            processo: "1234/21.4T8LRA.C1.S1",
            data: "14/01/2026",
            relator: "Conselheiro Manuel Capelo",
            descritores: ["Responsabilidade Civil Extracontratual", "Erro Judiciário", "Danos Não Patrimoniais"],
            sumario: "I - A responsabilidade civil extracontratual do Estado por danos decorrentes do exercício da função jurisdicional pressupõe a verificação de erro judiciário manifesto e inescusável. II - Demonstrados os pressupostos da ilicitude, culpa grave e nexo de causalidade adequada, impõe-se a fixação de indemnização a título de danos morais nos termos do art. 496.º do Código Civil."
        },
        {
            processo: "7890/22.0T8VNG.P1.S1",
            data: "10/01/2026",
            relator: "Conselheiro António Barateiro Martins",
            descritores: ["Mútuo Bancário", "Hipoteca", "Cláusulas Contratuais Gerais", "Vencimento Antecipado"],
            sumario: "I - Nos contratos de mútuo com hipoteca celebrados com consumidores, a cláusula de resolução por incumprimento deve respeitar o princípio da boa-fé e da proporcionalidade. II - A faculdade de declaração de vencimento antecipado depende de prévia interpelação admonitória com concessão de prazo suplementar razoável para regularização."
        }
    ],
    "Área Criminal": [
        {
            processo: "456/20.8GBABF.E1.S1",
            data: "12/01/2026",
            relator: "Conselheira Maria do Carmo Silva",
            descritores: ["Burla Qualificada", "Branqueamento de Capitais", "Medida da Pena", "Cúmulo Jurídico"],
            sumario: "I - O crime de burla qualificada consuma-se com a obtenção de enriquecimento ilegítimo mediante indução em erro por meio de artifícios fraudulentos. II - Na fixação das penas parcelares e da pena única em cúmulo jurídico, deve atender-se à gravidade do ilícito global e à personalidade unitária revelada pelo agente."
        }
    ],
    "Área Social": [
        {
            processo: "321/19.3T8BRG.G1.S1",
            data: "08/01/2026",
            relator: "Conselheiro Júlio Gomes",
            descritores: ["Contrato de Trabalho", "Despedimento", "Justa Causa", "Proporcionalidade da Sanção"],
            sumario: "I - A justa causa de despedimento disciplinar exige a verificação cumulativa de um comportamento culposo grave do trabalhador e a impossibilidade prática de manutenção do vínculo laboral. II - Se a conduta culposa não inviabilizar a subsistência da relação de trabalho, o despedimento é ilícito por violação do princípio da proporcionalidade."
        }
    ],
    "Contencioso": [
        {
            processo: "88/23.1YFLSB.S1",
            data: "16/01/2026",
            relator: "Conselheiro Nuno Gonçalves",
            descritores: ["Conselho Superior da Magistratura", "Ação de Impugnação", "Classificação de Serviço"],
            sumario: "I - No âmbito do contencioso das deliberações do Conselho Superior da Magistratura, o Supremo Tribunal de Justiça exerce jurisdição própria e plena sobre a legalidade dos atos impugnados. II - A discricionariedade técnica na avaliação de mérito de magistrados judiciais só é sindicável em caso de erro manifesto, desvio de poder ou violação de princípios constitucionais."
        }
    ]
};

export default LoggerApi(async function datalistHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    let date = new Date();
    let currentMonth = `${date.getMonth() + 1}`;
    let currentYear = `${date.getFullYear()}`;
    let [area = "Área Social", year = currentYear, month = currentMonth, format = "pdf"] = Array.isArray(req.query.filters) ? req.query.filters : req.query.filters ? [req.query.filters] : [];
    let title = `Sumários de Acórdãos - ${area} - ${month}/${year}`;

    // 1. Rota HTML: Geração direta rápida, fiável e sem dependência obrigatória de pandoc CLI
    if (format === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");

        let items: BulletinItem[] = [];
        let isOffline = false;

        try {
            const client = await getElasticSearchClient();
            const r = await client.search<PartialJurisprudenciaDocument>({
                query: {
                    bool: {
                        must: [{
                            term: {
                                "Área.Index.keyword": area
                            }
                        }, {
                            range: {
                                "Data": {
                                    gte: `01/${padZero(parseInt(month), 2)}/${padZero(parseInt(year))}`,
                                    lt: `01/${padZero(parseInt(month), 2)}/${padZero(parseInt(year))}\|\|+1M`,
                                    format: "dd/MM/yyyy"
                                }
                            }
                        }]
                    }
                },
                size: 50
            });

            if (r.hits.hits.length > 0) {
                items = r.hits.hits.map(h => {
                    const src = h._source || {};
                    const descritores = (src.Descritores?.Show || src.Descritores?.Original || []).map((d: any) => `${d}`);
                    const sumario = src.Sumário || "Sumário não disponível.";
                    const data = src.Data || "Data N/D";
                    const processo = src["Número de Processo"] || "S/N";
                    const relator = (src["Relator Nome Profissional"]?.Show || ["STJ"]).join(", ");
                    return { descritores, sumario, data, processo, relator };
                });
            }
        } catch (err) {
            console.warn("Boletim HTML: Elasticsearch offline or query error, serving demonstration summaries:", err);
            isOffline = true;
        }

        if (items.length === 0) {
            items = DEMO_ITEMS_BY_AREA[area] || DEMO_ITEMS_BY_AREA["Área Cível"] || [];
            isOffline = true;
        }

        const html = renderBulletinHtml(title, area, year, month, items, isOffline);
        res.status(200).send(html);
        return;
    }

    // 2. Rota PDF: Tenta compilar via Pandoc/XeLaTeX; se indisponível, devolve alternativa informativa
    if (format === "pdf") {
        let pandocProc: ChildProcessWithoutNullStreams | null = null;
        let wls: ((...args: string[]) => boolean) | null = null;

        try {
            const convertRes = convert(title, format);
            pandocProc = convertRes[0];
            wls = convertRes[1];
        } catch (err) {
            console.warn("Pandoc spawn failed:", err);
            renderPdfUnavailable(res, area, year, month);
            return;
        }

        let processFailed = false;

        pandocProc.on("error", (err) => {
            processFailed = true;
            console.warn("Pandoc process error (CLI missing or failed):", err);
            if (!res.headersSent) {
                renderPdfUnavailable(res, area, year, month);
            }
        });

        res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="boletim-${area}-${year}-${month}.pdf"`
        });

        pandocProc.stderr.pipe(process.stderr);
        pandocProc.stdout.pipe(res);

        try {
            const client = await getElasticSearchClient();
            let r = await client.search<PartialJurisprudenciaDocument>({
                query: {
                    bool: {
                        must: [{
                            term: {
                                "Área.Index.keyword": area
                            }
                        }, {
                            range: {
                                "Data": {
                                    gte: `01/${padZero(parseInt(month), 2)}/${padZero(parseInt(year))}`,
                                    lt: `01/${padZero(parseInt(month), 2)}/${padZero(parseInt(year))}\|\|+1M`,
                                    format: "dd/MM/yyyy"
                                }
                            }
                        }]
                    }
                },
                scroll: "30s"
            });

            while (r.hits.hits.length > 0 && !processFailed) {
                for (let hit of r.hits.hits) {
                    wls!(`<div style="page-break-after: always;">\n`);
                    if (hit._source?.Descritores?.Show || hit._source?.Descritores?.Original) {
                        wls!(`---\n`);
                        wls!(...(hit._source?.Descritores.Show || hit._source?.Descritores.Original).map((d: any) => `**${`${d}`.replace(/`/g, "")}**\n`));
                        wls!(`---\n`);
                        wls!(`<div>`);
                        wls!(hit._source.Sumário || "Sumário não disponível");
                        wls!(`</div>`);
                        wls!(`${hit._source['Data']}\n`);
                        wls!(`Proc. nº ${hit._source['Número de Processo']}\n`);
                        wls!(`${hit._source['Relator Nome Profissional']?.Show?.join("\n") || "STJ"}\n`);
                    }
                    wls!(`</div>\n`);
                }
                r = await client.scroll({ scroll_id: r._scroll_id, scroll: "30s" });
            }
        } catch (e) {
            console.error("Elasticsearch error during PDF streaming:", e);
        } finally {
            try { pandocProc.stdin.end(); } catch {}
        }

        return await new Promise<void>(resolve => {
            pandocProc?.stdout.on("end", resolve);
            pandocProc?.on("close", resolve);
        });
    }

    res.status(400).send("Formato não suportado.");
});

function convert(title: string, format: string) {
    let proc: ChildProcessWithoutNullStreams;
    if (format === "pdf") {
        proc = spawn("pandoc", ["-t", format, "-o", "-", "--standalone", "--pdf-engine", "xelatex", "--template", "pdf-template.tex"], {});
    }
    else {
        proc = spawn("pandoc", ["-t", format, "-o", "-", "--standalone"], {});
    }

    let wls = (...args: string[]) => proc.stdin.write(args.join("\n") + "\n");

    wls(`---`);
    wls(`title: ${title}`);
    wls(`output:`);
    wls(`   beamer_presentation:`);
    wls(`       keep_tex: true`);
    wls(`header-includes:`);
    wls(` - \\usepackage{fancyhdr}`);
    wls(` - \\pagestyle{fancy}`);
    wls(` - \\fancyhead{}`);
    wls(` - \\fancyhead[L]{${title}}`);
    wls(`---\n`);

    return [proc, wls] as const;
}

function renderPdfUnavailable(res: NextApiResponse, area: string, year: string, month: string) {
    if (res.headersSent) return;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <title>Geração Direta de PDF Indisponível</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .card { background: white; padding: 2.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 580px; border-left: 5px solid #0284c7; }
        h2 { margin-top: 0; color: #0f172a; font-size: 1.4rem; }
        p { line-height: 1.6; color: #475569; }
        .btn { display: inline-block; background: #0284c7; color: white; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 1rem; }
        .btn:hover { background: #0369a1; }
        code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Compilação Direta de PDF Indisponível no Host Local</h2>
        <p>A compilação de ficheiros PDF binários via <strong>XeLaTeX</strong> requer o binário do <code>pandoc</code> e distribuição TeX instalados no sistema operativo anfitrião, ou a execução da aplicação através do contentor Docker oficial (<code>clitools</code>).</p>
        <p><strong>Como obter o PDF no navegador:</strong><br>
        1. Regresse à página do Boletim e clique em <strong>"Gerar Boletim"</strong> (Pré-visualização HTML).<br>
        2. Utilize a funcionalidade nativa do seu browser para Imprimir/Guardar como PDF (atalho <code>Ctrl + P</code>).</p>
        <a href="javascript:window.close()" class="btn">Fechar Janela</a>
    </div>
</body>
</html>`);
}

function renderBulletinHtml(
    title: string,
    area: string,
    year: string,
    month: string,
    items: BulletinItem[],
    isOffline: boolean
): string {
    return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            background-color: #f1f5f9;
            margin: 0;
            padding: 2rem 1rem;
            line-height: 1.6;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        .header {
            border-bottom: 3px solid #0f172a;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .header-title {
            font-size: 1.6rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 0.25rem 0;
            letter-spacing: -0.02em;
        }
        .header-subtitle {
            color: #475569;
            font-size: 1.05rem;
            margin: 0;
            font-weight: 500;
        }
        .header-badge {
            text-align: right;
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .demo-banner {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 0.85rem 1.25rem;
            border-radius: 0 6px 6px 0;
            margin-bottom: 2rem;
            color: #92400e;
            font-size: 0.875rem;
        }
        .acordao-item {
            border: 1px solid #e2e8f0;
            border-left: 4px solid #0284c7;
            border-radius: 6px;
            padding: 1.75rem;
            margin-bottom: 2rem;
            background: #ffffff;
            page-break-after: always;
        }
        .acordao-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 1.25rem;
            font-size: 0.875rem;
            color: #475569;
            margin-bottom: 1rem;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 0.85rem;
        }
        .acordao-meta strong {
            color: #0f172a;
        }
        .tags-container {
            margin-bottom: 1rem;
        }
        .tag {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-right: 0.4rem;
            margin-bottom: 0.4rem;
        }
        .acordao-sumario {
            font-size: 0.95rem;
            color: #334155;
            text-align: justify;
            white-space: pre-line;
            line-height: 1.7;
        }
        .footer {
            margin-top: 3rem;
            border-top: 1px solid #e2e8f0;
            padding-top: 1.5rem;
            text-align: center;
            font-size: 0.85rem;
            color: #94a3b8;
        }
        @media print {
            body { background: #ffffff; padding: 0; }
            .container { box-shadow: none; padding: 0; max-width: 100%; }
            .demo-banner { display: none; }
            .acordao-item { border: 1px solid #cbd5e1; page-break-after: always; break-after: page; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 class="header-title">Supremo Tribunal de Justiça</h1>
                <p class="header-subtitle">${title}</p>
            </div>
            <div class="header-badge">
                Boletim Informativo
            </div>
        </div>

        ${isOffline ? `
            <div class="demo-banner">
                <strong>Modo Offline / Demonstração:</strong> O servidor de indexação Elasticsearch não está ativo localmente. A apresentar acórdãos modelo demonstrativos para <strong>${area}</strong> (${month}/${year}).
            </div>
        ` : ''}

        ${items.map(item => `
            <article class="acordao-item">
                <div class="acordao-meta">
                    <div><strong>Processo:</strong> ${item.processo}</div>
                    <div><strong>Data:</strong> ${item.data}</div>
                    <div><strong>Relator:</strong> ${item.relator}</div>
                </div>

                ${item.descritores.length > 0 ? `
                    <div class="tags-container">
                        ${item.descritores.map(d => `<span class="tag">${d}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="acordao-sumario">
                    ${item.sumario}
                </div>
            </article>
        `).join('')}

        <footer class="footer">
            Supremo Tribunal de Justiça — República Portuguesa • Gerado a ${new Date().toLocaleDateString("pt-PT")}
        </footer>
    </div>
</body>
</html>`;
}