import React, { CSSProperties, ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import GenericPage from "@/components/genericPageStructure";

function Row(props: { children: ReactNode; style?: CSSProperties }) {
    return <div className="row border-bottom" style={props.style}>{props.children}</div>;
}

export default function TestImagemPage() {
    return (
        <GenericPage title="1978/19.0T8STR.E1.S1 - Jurisprudência - STJ">
            <Head>
                <title>1978/19.0T8STR.E1.S1 - Jurisprudência - STJ</title>
            </Head>

            <div className="border border-dark container-fluid mt-2">
                <Row>
                    <div className="col-2"><b>N.º de Processo:</b></div>
                    <div className="col-6">1978/19.0T8STR.E1.S1</div>
                    <div className="col-4 text-end">
                        <small><b>Fonte:&nbsp;</b><span>DGSI.pt</span></small>
                    </div>
                </Row>
                <Row>
                    <div className="col-2"><b>Data do Acórdão:</b></div>
                    <div className="col-10">09-05-2024</div>
                </Row>
                <Row>
                    <div className="col-2"><b>Relator:</b></div>
                    <div className="col-10">Conselheiro Fernando Jorge Veloso Gomes</div>
                </Row>
                <Row>
                    <div className="col-2"><b>Secção:</b></div>
                    <div className="col-10">1.ª Secção (Cível)</div>
                </Row>
                <Row>
                    <div className="col-2"><b>Meio Processual:</b></div>
                    <div className="col-10">Revista</div>
                </Row>
                <Row>
                    <div className="col-2"><b>Votação:</b></div>
                    <div className="col-10">Unanimidade</div>
                </Row>
                <Row>
                    <div className="col-2"><b>Área Temática:</b></div>
                    <div className="col-10">Direito Civil / Arrendamento Urbano</div>
                </Row>
                <Row>
                    <div className="col-2"><b>Decisão:</b></div>
                    <div className="col-10">Negada a revista</div>
                </Row>
            </div>

            <h6 className="border-top border-2 mt-3 pt-2"><b>Sumário</b></h6>
            <div
                className="p-2"
                dangerouslySetInnerHTML={{
                    __html: `<p>18 &#8211; Resolução de contrato de arrendamento com base em comunicação escrita enviada por carta registada com aviso de receção. A eficácia da declaração receptícia opera logo que chega ao poder do destinatário ou dele é conhecida.</p>`
                }}
            />

            <h6 className="border-top border-2 mt-2 pt-2"><b>Decisão Texto Integral</b></h6>
            <div
                className="p-2"
                dangerouslySetInnerHTML={{
                    __html: `<p>Relatório minucioso dos factos provados:</p>
<p>18 &#8211; A 2.ª Ré dirigiu aos Autores carta registada com aviso de recepção, datada de 15.11.2019, assinada pelo gerente GG, recebida pelos autores em 19.11.2019, com o seguinte teor (doc. N.º11 junto a Contestação da 2.ª Ré): </p>
<p><img src="/api/images/sample_real_stj_1.gif" width="626" height="894" alt="Documento n.º 11 junto a Contestação da 2.ª Ré"></p>
<p>19 &#8211; Os Autores não responderam à carta referida em 18.</p>
<p>20 &#8211; Em face do teor do documento junto aos autos e supra reproduzido, não subsistem dúvidas quanto à manifestação tempestiva de vontade resolutiva.</p>`
                }}
            />
        </GenericPage>
    );
}
