import { getElasticSearchClient, padZero } from '@/core/elasticsearch';
import LoggerApi from '@/core/logger-api';
import { PartialJurisprudenciaDocument } from '@stjiris/jurisprudencia-document';
import PDFDocument from 'pdfkit';
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

    // Obter acórdãos do Elasticsearch ou utilizar acórdãos demonstrativos
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
                const rawSumario = src.Sumário || "Sumário não disponível.";
                const sumario = rawSumario.replace(/<[^>]+>/g, "").trim();
                const data = src.Data || "Data N/D";
                const processo = src["Número de Processo"] || "S/N";
                const relator = (src["Relator Nome Profissional"]?.Show || ["STJ"]).join(", ");
                return { descritores, sumario, data, processo, relator };
            });
        }
    } catch (err) {
        console.warn("Boletim: Elasticsearch offline or query error, serving demonstration summaries:", err);
        isOffline = true;
    }

    if (items.length === 0) {
        items = DEMO_ITEMS_BY_AREA[area] || DEMO_ITEMS_BY_AREA["Área Cível"] || [];
        isOffline = true;
    }

    // 1. Rota HTML: Pré-visualização formatada direta
    if (format === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const html = renderBulletinHtml(title, area, year, month, items, isOffline);
        res.status(200).send(html);
        return;
    }

    // 2. Rota PDF: Geração binária de PDF nativa, universal e fiável via PDFKit
    if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="boletim-${encodeURIComponent(area)}-${year}-${month}.pdf"`);
        await renderBulletinPdf(res, title, area, year, month, items, isOffline);
        return;
    }

    res.status(400).send("Formato não suportado.");
});

function renderBulletinPdf(
    res: NextApiResponse,
    title: string,
    area: string,
    year: string,
    month: string,
    items: BulletinItem[],
    isOffline: boolean
): Promise<void> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 45,
            bufferPages: true,
            info: {
                Title: title,
                Author: 'Supremo Tribunal de Justiça',
                Subject: `Boletim Mensal - ${area} (${month}/${year})`
            }
        });

        doc.pipe(res);

        // Header Superior
        doc.rect(45, 45, 505, 4).fill('#0f172a');
        doc.moveDown(0.8);

        doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text('SUPREMO TRIBUNAL DE JUSTIÇA');
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#0284c7').text(title);
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Publicação Oficial de Jurisprudência • Período: ${month}/${year}`);
        doc.moveDown(0.5);

        // Linha divisória
        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.8);

        if (isOffline) {
            const bannerY = doc.y;
            doc.rect(45, bannerY, 505, 24).fill('#fffbeb');
            doc.strokeColor('#f59e0b').lineWidth(1).rect(45, bannerY, 505, 24).stroke();
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#b45309')
               .text('Modo Offline / Demonstração: ', 55, bannerY + 7, { continued: true })
               .font('Helvetica').fillColor('#92400e')
               .text(`Elasticsearch não detetado localmente. A apresentar acórdãos modelo para ${area}.`);
            doc.moveDown(1.5);
        }

        // Acórdãos
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (doc.y > 670) {
                doc.addPage();
            }

            const itemStartY = doc.y;

            // Metadados
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a')
               .text(`Processo: ${item.processo}`, 55, doc.y, { continued: true })
               .font('Helvetica').fillColor('#64748b')
               .text(`   •   Data: ${item.data}   •   Relator: ${item.relator}`);

            doc.moveDown(0.35);

            // Descritores
            if (item.descritores.length > 0) {
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0369a1')
                   .text('Descritores: ', 55, doc.y, { continued: true })
                   .font('Helvetica').fillColor('#334155')
                   .text(item.descritores.join('  •  '));
                doc.moveDown(0.3);
            }

            // Sumário
            doc.font('Helvetica').fontSize(9).fillColor('#1e293b')
               .text(item.sumario, 55, doc.y, {
                   width: 495,
                   align: 'justify',
                   lineGap: 2
               });

            doc.moveDown(0.8);

            // Barra lateral azul
            const itemEndY = doc.y;
            doc.rect(45, itemStartY, 3, itemEndY - itemStartY).fill('#0284c7');

            // Separador entre acórdãos
            if (i < items.length - 1) {
                doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(0.8);
            }
        }

        // Adicionar numeração de página em todas as páginas guardadas
        const range = doc.bufferedPageRange();
        for (let p = range.start; p < range.start + range.count; p++) {
            doc.switchToPage(p);
            doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(45, doc.page.height - 38).lineTo(550, doc.page.height - 38).stroke();
            doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
               .text('Supremo Tribunal de Justiça — República Portuguesa', 45, doc.page.height - 28);
            doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
               .text(`Página ${p + 1} de ${range.count}`, 45, doc.page.height - 28, {
                   width: 505,
                   align: 'right'
               });
        }

        doc.end();

        res.on('finish', resolve);
        res.on('error', reject);
    });
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