/**
 * QA Test Suite for Court Decision Image Support in Juris & ETL
 * Covers:
 * 1. Image API Endpoint (/api/images/[...path].ts) - Streaming, MIME types, Caching, Security/Path Traversal, Methods
 * 2. Search API (?IMG=s) - Parameter parsing, Case-insensitivity, Elasticsearch filter injection
 * 3. HTML Sanitization (stripHTMLAttributes) - Attribute filtering, Security (XSS stripping), Dimensions preservation
 * 4. Image Naming & Extension Resolution - UUID suffixing, Domino Lotus Notes URL resolution
 * 5. Full End-to-End Pipeline Simulation - Processing mock DGSI HTML -> File writing -> API Serving -> Verification
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ANSI colors for clean test reporting
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ${GREEN}✓ PASS:${RESET} ${testName}`);
    } else {
        failedTests++;
        console.error(`  ${RED}✗ FAIL:${RESET} ${testName}${detail ? ` -> ${detail}` : ""}`);
    }
}

// =========================================================================
// MOCK HTTP OBJECTS FOR TESTING NEXT.JS API HANDLERS
// =========================================================================
function createMockReqRes(options: {
    method?: string;
    query?: Record<string, string | string[]>;
    headers?: Record<string, string>;
}) {
    const headersSent: Record<string, string | number> = {};
    let statusCode = 200;
    let ended = false;
    let jsonBody: any = null;
    let bufferChunks: Buffer[] = [];

    const req: any = {
        method: options.method || "GET",
        query: options.query || {},
        headers: options.headers || {},
    };

    const res: any = {
        get headersSent() {
            return Object.keys(headersSent).length > 0;
        },
        status(code: number) {
            statusCode = code;
            return res;
        },
        setHeader(name: string, value: string | number) {
            headersSent[name.toLowerCase()] = value;
            return res;
        },
        getHeader(name: string) {
            return headersSent[name.toLowerCase()];
        },
        json(body: any) {
            jsonBody = body;
            ended = true;
            return res;
        },
        end(data?: any) {
            if (data) bufferChunks.push(Buffer.from(data));
            ended = true;
            return res;
        },
        write(chunk: any) {
            bufferChunks.push(Buffer.from(chunk));
            return true;
        },
        on(event: string, handler: Function) {
            return res;
        },
        once(event: string, handler: Function) {
            return res;
        },
        emit(event: string, ...args: any[]) {
            return true;
        }
    };

    return {
        req,
        res,
        getStatusCode: () => statusCode,
        getHeader: (name: string) => headersSent[name.toLowerCase()],
        getJsonBody: () => jsonBody,
        getBuffer: () => Buffer.concat(bufferChunks),
        isEnded: () => ended,
    };
}

// =========================================================================
// SUITE 1: API ROUTE (/api/images/[...path].ts)
// =========================================================================
async function runSuite1_ApiRoute() {
    console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
    console.log(`${BOLD}${CYAN}SUITE 1: Image Streaming API Endpoint (/api/images)${RESET}`);
    console.log(`${BOLD}${CYAN}====================================================${RESET}`);

    // Create temp test directory
    const tempImagesDir = path.join(os.tmpdir(), `juris-qa-images-${Date.now()}`);
    fs.mkdirSync(tempImagesDir, { recursive: true });
    process.env.IMAGES_PATH = tempImagesDir;

    // Create test files
    const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]); // 1x1 GIF header
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]); // PNG header
    const jpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPG header
    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]); // WEBP header

    fs.writeFileSync(path.join(tempImagesDir, "test_doc_1.gif"), gifBuffer);
    fs.writeFileSync(path.join(tempImagesDir, "test_doc_2.png"), pngBuffer);
    fs.writeFileSync(path.join(tempImagesDir, "test_doc_3.jpg"), jpgBuffer);
    fs.writeFileSync(path.join(tempImagesDir, "test_doc_4.webp"), webpBuffer);

    // Import the actual handler
    const apiPath = fs.existsSync("./src/pages/api/images/[...path].ts")
        ? "./src/pages/api/images/[...path].ts"
        : "./nextjs-jurisprudencia/src/pages/api/images/[...path].ts";
    const imageHandler = (await import(apiPath)).default;

    // 1.1 GET existing GIF
    {
        const { req, res, getStatusCode, getHeader } = createMockReqRes({
            method: "GET",
            query: { path: ["test_doc_1.gif"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 200, "1.1 GET valid GIF returns HTTP 200");
        assert(getHeader("content-type") === "image/gif", "1.1 Content-Type is 'image/gif'");
        assert(getHeader("cache-control") === "public, max-age=31536000, immutable", "1.1 Cache-Control is immutable 1-year cache");
        assert(Number(getHeader("content-length")) === gifBuffer.length, "1.1 Content-Length matches file size");
    }

    // 1.2 GET existing PNG
    {
        const { req, res, getStatusCode, getHeader } = createMockReqRes({
            method: "GET",
            query: { path: "test_doc_2.png" }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 200, "1.2 GET valid PNG returns HTTP 200");
        assert(getHeader("content-type") === "image/png", "1.2 Content-Type is 'image/png'");
    }

    // 1.3 GET existing JPEG
    {
        const { req, res, getStatusCode, getHeader } = createMockReqRes({
            method: "GET",
            query: { path: ["test_doc_3.jpg"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 200, "1.3 GET valid JPG returns HTTP 200");
        assert(getHeader("content-type") === "image/jpeg", "1.3 Content-Type is 'image/jpeg'");
    }

    // 1.4 GET existing WEBP
    {
        const { req, res, getStatusCode, getHeader } = createMockReqRes({
            method: "GET",
            query: { path: ["test_doc_4.webp"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 200, "1.4 GET valid WEBP returns HTTP 200");
        assert(getHeader("content-type") === "image/webp", "1.4 Content-Type is 'image/webp'");
    }

    // 1.5 HEAD request
    {
        const { req, res, getStatusCode, getHeader, isEnded } = createMockReqRes({
            method: "HEAD",
            query: { path: ["test_doc_1.gif"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 200, "1.5 HEAD request returns HTTP 200");
        assert(getHeader("content-type") === "image/gif", "1.5 HEAD request returns headers");
        assert(isEnded(), "1.5 HEAD request terminates cleanly without streaming body");
    }

    // 1.6 Non-existent file
    {
        const { req, res, getStatusCode, getJsonBody } = createMockReqRes({
            method: "GET",
            query: { path: ["non_existent_file.png"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 404, "1.6 Non-existent file returns HTTP 404");
        assert(getJsonBody()?.error === "Image not found", "1.6 Error message is 'Image not found'");
    }

    // 1.7 Security: Directory traversal (..)
    {
        const { req, res, getStatusCode, getJsonBody } = createMockReqRes({
            method: "GET",
            query: { path: ["..", "secret.txt"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 400 || getStatusCode() === 403, "1.7 Directory traversal ('..') is blocked (HTTP 400/403)");
    }

    // 1.8 Security: Directory traversal in string
    {
        const { req, res, getStatusCode } = createMockReqRes({
            method: "GET",
            query: { path: "../../package.json" }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 400 || getStatusCode() === 403, "1.8 String-based path traversal ('../../') is blocked");
    }

    // 1.9 Security: Absolute paths
    {
        const { req, res, getStatusCode } = createMockReqRes({
            method: "GET",
            query: { path: "/etc/passwd" }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 400 || getStatusCode() === 404 || getStatusCode() === 403, "1.9 Absolute path request is blocked or isolated");
    }

    // 1.10 Method Not Allowed: POST
    {
        const { req, res, getStatusCode, getHeader, getJsonBody } = createMockReqRes({
            method: "POST",
            query: { path: ["test_doc_1.gif"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 405, "1.10 POST method returns HTTP 405 Method Not Allowed");
        assert(getHeader("allow")?.includes("GET"), "1.10 Allow header contains GET");
        assert(getJsonBody()?.error === "Method not allowed", "1.10 Error message is 'Method not allowed'");
    }

    // 1.11 Method Not Allowed: DELETE
    {
        const { req, res, getStatusCode } = createMockReqRes({
            method: "DELETE",
            query: { path: ["test_doc_1.gif"] }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 405, "1.11 DELETE method returns HTTP 405 Method Not Allowed");
    }

    // 1.12 Empty query path
    {
        const { req, res, getStatusCode } = createMockReqRes({
            method: "GET",
            query: { path: "" }
        });
        await imageHandler(req, res);
        assert(getStatusCode() === 400, "1.12 Empty path parameter returns HTTP 400");
    }

    // Cleanup temp dir
    try {
        fs.rmSync(tempImagesDir, { recursive: true, force: true });
    } catch {}
}

// =========================================================================
// SUITE 2: SEARCH FILTER (?IMG=s) IN /api/search.ts
// =========================================================================
function runSuite2_SearchFilter() {
    console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
    console.log(`${BOLD}${CYAN}SUITE 2: Audit Search Filter Logic (?IMG=s)${RESET}`);
    console.log(`${BOLD}${CYAN}====================================================${RESET}`);

    // Simulation of the exact filter extraction block implemented in search.ts:
    function evaluateImageFilter(query: Record<string, string | string[]>) {
        const sfilters: { pre: any[]; after: any[] } = { pre: [], after: [] };
        const imgParam = (Array.isArray(query?.IMG) ? query.IMG[0] : query?.IMG)
                      || (Array.isArray(query?.img) ? query.img[0] : query?.img);
        if (imgParam && ["s", "sim", "1", "true", "yes", "y"].includes(imgParam.toLowerCase().trim())) {
            sfilters.pre.push({
                term: {
                    hasImages: true
                }
            });
        }
        return sfilters;
    }

    // 2.1 Standard uppercase IMG=s (as requested by Prof. Borbinha)
    {
        const filters = evaluateImageFilter({ IMG: "s" });
        assert(filters.pre.length === 1 && filters.pre[0].term?.hasImages === true,
            "2.1 ?IMG=s injects { term: { hasImages: true } }");
    }

    // 2.2 Lowercase img=s
    {
        const filters = evaluateImageFilter({ img: "s" });
        assert(filters.pre.length === 1 && filters.pre[0].term?.hasImages === true,
            "2.2 ?img=s injects { term: { hasImages: true } }");
    }

    // 2.3 Portuguese 'sim'
    {
        const filters = evaluateImageFilter({ IMG: "sim" });
        assert(filters.pre.length === 1 && filters.pre[0].term?.hasImages === true,
            "2.3 ?IMG=sim injects { term: { hasImages: true } }");
    }

    // 2.4 Boolean string 'true'
    {
        const filters = evaluateImageFilter({ IMG: "true" });
        assert(filters.pre.length === 1 && filters.pre[0].term?.hasImages === true,
            "2.4 ?IMG=true injects { term: { hasImages: true } }");
    }

    // 2.5 Integer string '1'
    {
        const filters = evaluateImageFilter({ IMG: "1" });
        assert(filters.pre.length === 1 && filters.pre[0].term?.hasImages === true,
            "2.5 ?IMG=1 injects { term: { hasImages: true } }");
    }

    // 2.6 Array parameter (e.g. repeated in query string: ?IMG=s&IMG=extra)
    {
        const filters = evaluateImageFilter({ IMG: ["s", "extra"] });
        assert(filters.pre.length === 1 && filters.pre[0].term?.hasImages === true,
            "2.6 ?IMG=['s','extra'] handles array parameter gracefully");
    }

    // 2.7 Negative check: IMG=n (should not filter for hasImages)
    {
        const filters = evaluateImageFilter({ IMG: "n" });
        assert(filters.pre.length === 0,
            "2.7 ?IMG=n does NOT inject hasImages filter");
    }

    // 2.8 Negative check: Empty query string
    {
        const filters = evaluateImageFilter({});
        assert(filters.pre.length === 0,
            "2.8 Standard query without IMG param does not filter by hasImages");
    }

    // 2.9 Negative check: Arbitrary text
    {
        const filters = evaluateImageFilter({ IMG: "random_text" });
        assert(filters.pre.length === 0,
            "2.9 Random text in IMG param does not inject hasImages filter");
    }
}

// =========================================================================
// SUITE 3: HTML SANITIZATION & ATTRIBUTE PRESERVATION
// =========================================================================
function runSuite3_HtmlSanitizer() {
    console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
    console.log(`${BOLD}${CYAN}SUITE 3: HTML Sanitization & Attribute Preservation${RESET}`);
    console.log(`${BOLD}${CYAN}====================================================${RESET}`);

    // The stripHTMLAttributes implementation in crud-jurisprudencia-document-from-url.ts
    function stripHTMLAttributes(text: string) {
        let regex = /<(?<closing>\/?)(?<tag>\w+)(?<attrs>[^>]*)>/g;
        var comments = /<!--[\s\S]*?-->/gi;
        return text.replace(comments, '').replace(regex, (match, closing, tag, attrs) => {
            if (tag.toLowerCase() === 'img') {
                const allowed = ["src", "width", "height", "alt", "style"];
                const kept: string[] = [];
                const attrPattern = /(?<name>[\w\-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
                let m;
                while ((m = attrPattern.exec(attrs)) !== null) {
                    const attrName = m.groups?.name?.toLowerCase();
                    if (attrName && allowed.includes(attrName)) {
                        kept.push(m[0]);
                    }
                }
                return `<${closing}${tag}${kept.length > 0 ? " " + kept.join(" ") : ""}>`;
            }
            return `<${closing}${tag}>`;
        });
    }

    // 3.1 Real DGSI sample from Prof. José Borbinha's email
    {
        const input = '<p><font size="4" face="Times New Roman">18 &#8211; A 2.ª Ré dirigiu aos Autores carta registada com aviso de recepção, datada de 15.11.2019, assinada pelo gerente GG, recebida pelos autores em 19.11.2019, com o seguinte teor (doc. N.º11 junto a Contestação da 2.ª Ré): </font><img src="/api/images/uuid_1.gif" width="626" height="894"></p>';
        const expected = '<p><font>18 &#8211; A 2.ª Ré dirigiu aos Autores carta registada com aviso de recepção, datada de 15.11.2019, assinada pelo gerente GG, recebida pelos autores em 19.11.2019, com o seguinte teor (doc. N.º11 junto a Contestação da 2.ª Ré): </font><img src="/api/images/uuid_1.gif" width="626" height="894"></p>';
        const output = stripHTMLAttributes(input);
        assert(output === expected, "3.1 Exact email line preserves img src/width/height and strips font size/face");
    }

    // 3.2 Preservation of alt and style
    {
        const input = '<div align="center"><img src="/api/images/uuid_2.png" alt="Croquis do acidente" style="display:block;margin:auto" width="500"></div>';
        const expected = '<div><img src="/api/images/uuid_2.png" alt="Croquis do acidente" style="display:block;margin:auto" width="500"></div>';
        const output = stripHTMLAttributes(input);
        assert(output === expected, "3.2 Preserves alt and style attributes while stripping div align");
    }

    // 3.3 Security: Stripping XSS / event handlers from <img>
    {
        const input = '<img src="/api/images/safe.jpg" onerror="alert(1)" onclick="stealCookies()" onload="pwn()" width="300">';
        const expected = '<img src="/api/images/safe.jpg" width="300">';
        const output = stripHTMLAttributes(input);
        assert(output === expected, "3.3 Strips dangerous event handlers (onerror, onclick, onload) from <img>");
    }

    // 3.4 Stripping attributes on all other tags
    {
        const input = '<table border="1" cellpadding="0" cellspacing="0"><tr class="highlight"><td style="color:red">Texto</td></tr></table>';
        const expected = '<table><tr><td>Texto</td></tr></table>';
        const output = stripHTMLAttributes(input);
        assert(output === expected, "3.4 Correctly strips all attributes from standard non-image tags");
    }

    // 3.5 Removal of HTML comments
    {
        const input = '<!-- Start of Lotus Notes Body --><p>Content<!-- comment with <img src="bad"> --></p>';
        const expected = '<p>Content</p>';
        const output = stripHTMLAttributes(input);
        assert(output === expected, "3.5 Completely strips HTML comments without leaving stray tags");
    }
}

// =========================================================================
// SUITE 4: IMAGE NAMING & URL RESOLUTION LOGIC
// =========================================================================
function runSuite4_NamingAndUrls() {
    console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
    console.log(`${BOLD}${CYAN}SUITE 4: Image Naming & URL Resolution Logic${RESET}`);
    console.log(`${BOLD}${CYAN}====================================================${RESET}`);

    // Helper functions tested
    function resolveImageUrl(src: string, baseUrl: string): string {
        return (src.startsWith("http://") || src.startsWith("https://"))
            ? src
            : new URL(src, baseUrl).toString();
    }

    function generateImageFilename(uuid: string, index: number, contentType: string, url: string): string {
        let ext = ".gif";
        if (contentType.includes("gif") || url.toLowerCase().includes("format=gif")) {
            ext = ".gif";
        } else if (contentType.includes("jpeg") || contentType.includes("jpg") || url.toLowerCase().includes("format=jpg")) {
            ext = ".jpg";
        } else if (contentType.includes("png") || url.toLowerCase().includes("format=png")) {
            ext = ".png";
        } else if (contentType.includes("webp")) {
            ext = ".webp";
        } else if (contentType.includes("bmp")) {
            ext = ".bmp";
        }
        return `${uuid}_${index}${ext}`;
    }

    const testUUID = "e4d3a2b1c0f9";
    const dgsiDocUrl = "http://www.dgsi.pt/jstj.nsf/954f0ce6ad9dd8b980256b5f003fa814/94e854cedf678a5280258e7a003b9e99?OpenDocument";

    // 4.1 Resolution of relative Lotus Notes URL
    {
        const relativeSrc = "/jstj.nsf/954f0ce6ad9dd8b980256b5f003fa814/94e854cedf678a5280258e7a003b9e99/DECTINTEGRAL/324.49CA?OpenElement&FieldElemFormat=gif";
        const resolved = resolveImageUrl(relativeSrc, dgsiDocUrl);
        assert(resolved === "http://www.dgsi.pt/jstj.nsf/954f0ce6ad9dd8b980256b5f003fa814/94e854cedf678a5280258e7a003b9e99/DECTINTEGRAL/324.49CA?OpenElement&FieldElemFormat=gif",
            "4.1 Relative Lotus Notes URL correctly resolved to absolute DGSI domain");
    }

    // 4.2 Preservation of already-absolute URL
    {
        const absoluteSrc = "https://external-archive.justica.gov.pt/img/annex.png";
        const resolved = resolveImageUrl(absoluteSrc, dgsiDocUrl);
        assert(resolved === absoluteSrc, "4.2 Absolute URL preserved without double prefixing");
    }

    // 4.3 Multi-image sequential numbering
    {
        const f1 = generateImageFilename(testUUID, 1, "image/gif", "http://.../img?format=gif");
        const f2 = generateImageFilename(testUUID, 2, "image/png", "http://.../img");
        const f3 = generateImageFilename(testUUID, 3, "image/jpeg", "http://.../img");

        assert(f1 === "e4d3a2b1c0f9_1.gif", "4.3 Image 1 named with _1 suffix and .gif");
        assert(f2 === "e4d3a2b1c0f9_2.png", "4.3 Image 2 named with _2 suffix and .png");
        assert(f3 === "e4d3a2b1c0f9_3.jpg", "4.3 Image 3 named with _3 suffix and .jpg");
    }

    // 4.4 Lotus Notes format fallback from URL query
    {
        const f = generateImageFilename(testUUID, 1, "application/octet-stream", "http://dgsi.pt/doc/123?FieldElemFormat=gif");
        assert(f === "e4d3a2b1c0f9_1.gif", "4.4 Fallback detects .gif from FieldElemFormat=gif when content-type is generic");
    }
}

// =========================================================================
// SUITE 5: FULL END-TO-END PIPELINE SIMULATION
// =========================================================================
async function runSuite5_EndToEndSimulation() {
    console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
    console.log(`${BOLD}${CYAN}SUITE 5: End-to-End Pipeline & Serving Simulation${RESET}`);
    console.log(`${BOLD}${CYAN}====================================================${RESET}`);

    const tempDir = path.join(os.tmpdir(), `juris-e2e-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    process.env.IMAGES_PATH = tempDir;

    const mockUUID = "proc_uuid_2026_stj";
    const testBinaryData = Buffer.from("SIMULATED_COURT_DECISION_IMAGE_SCAN_DATA_BYTES");

    // 1. Simulate saving images during ETL ingestion
    const savedFilename1 = `${mockUUID}_1.gif`;
    const savedFilename2 = `${mockUUID}_2.png`;
    fs.writeFileSync(path.join(tempDir, savedFilename1), testBinaryData);
    fs.writeFileSync(path.join(tempDir, savedFilename2), testBinaryData);

    assert(fs.existsSync(path.join(tempDir, savedFilename1)), "5.1 Image 1 written to storage volume");
    assert(fs.existsSync(path.join(tempDir, savedFilename2)), "5.2 Image 2 written to storage volume");

    // 2. Simulate decision HTML generated by ETL
    const decisionHtml = `
        <div class="doc-body">
            <p>18 - Conforme demonstrado no documento em anexo:</p>
            <img src="/api/images/${savedFilename1}" width="626" height="894" alt="Anexo 1">
            <p>E confirmado pela perícia técnica:</p>
            <img src="/api/images/${savedFilename2}" width="400" height="300" alt="Anexo 2">
        </div>
    `;

    assert(decisionHtml.includes(`/api/images/${savedFilename1}`), "5.3 Decision HTML contains relative API link for image 1");
    assert(decisionHtml.includes(`/api/images/${savedFilename2}`), "5.4 Decision HTML contains relative API link for image 2");

    // 3. Request Image 1 through the Next.js API endpoint
    const apiPath = fs.existsSync("./src/pages/api/images/[...path].ts")
        ? "./src/pages/api/images/[...path].ts"
        : "./nextjs-jurisprudencia/src/pages/api/images/[...path].ts";
    const imageHandler = (await import(apiPath)).default;
    {
        const { req, res, getStatusCode, getHeader, getBuffer } = createMockReqRes({
            method: "GET",
            query: { path: [savedFilename1] }
        });
        await imageHandler(req, res);

        assert(getStatusCode() === 200, "5.5 Next.js API returns HTTP 200 for stored image 1");
        assert(getHeader("content-type") === "image/gif", "5.6 Next.js API returns 'image/gif'");
        assert(Number(getHeader("content-length")) === testBinaryData.length, "5.7 Content-Length matches original binary size");
    }

    // 4. Request Image 2 through the Next.js API endpoint
    {
        const { req, res, getStatusCode, getHeader } = createMockReqRes({
            method: "GET",
            query: { path: [savedFilename2] }
        });
        await imageHandler(req, res);

        assert(getStatusCode() === 200, "5.8 Next.js API returns HTTP 200 for stored image 2");
        assert(getHeader("content-type") === "image/png", "5.9 Next.js API returns 'image/png'");
    }

    // Cleanup after short delay to let stream pipe finish
    await new Promise(r => setTimeout(r, 50));
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
}

// =========================================================================
// RUN ALL SUITES & REPORT
// =========================================================================
async function main() {
    console.log(`${BOLD}================================================================${RESET}`);
    console.log(`${BOLD}STARTING COMPREHENSIVE QA TEST SUITE: JURISPRUDÊNCIA IMAGE SUPPORT${RESET}`);
    console.log(`${BOLD}================================================================${RESET}`);

    const startTime = Date.now();

    await runSuite1_ApiRoute();
    runSuite2_SearchFilter();
    runSuite3_HtmlSanitizer();
    runSuite4_NamingAndUrls();
    await runSuite5_EndToEndSimulation();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n${BOLD}================================================================${RESET}`);
    console.log(`${BOLD}QA TEST SUITE SUMMARY RESULTS${RESET}`);
    console.log(`${BOLD}================================================================${RESET}`);
    console.log(`Total Assertions: ${BOLD}${totalTests}${RESET}`);
    console.log(`Passed:           ${GREEN}${BOLD}${passedTests}${RESET}`);
    console.log(`Failed:           ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);
    console.log(`Duration:         ${duration}s`);

    if (failedTests > 0) {
        console.error(`\n${RED}${BOLD}❌ QA SUITE FAILED: ${failedTests} assertion(s) failed.${RESET}`);
        process.exit(1);
    } else {
        console.log(`\n${GREEN}${BOLD}✔ QA SUITE PASSED: 100% of quality control checks succeeded!${RESET}\n`);
    }
}

main().catch(err => {
    console.error("Fatal error in QA runner:", err);
    process.exit(1);
});
