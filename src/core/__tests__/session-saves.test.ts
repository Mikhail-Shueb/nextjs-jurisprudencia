import {
    canonicalizeParams,
    computeParamsHash,
    parseSearchParamsToRecord,
    buildParamsSummary,
    verifySaveIntegrity,
    saveSession,
    getSavedSessions,
    deleteSavedSession,
    updateSessionName,
    saveLastSession,
    getLastSession,
    importSavesFromJsonString,
    STORAGE_KEY_SAVES,
    STORAGE_KEY_LAST,
    SearchSessionSave
} from "../session-saves";

describe("Session Saves & Integrity Hash System", () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        const localStorageMock = {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, val: string) => { mockStorage[key] = val; },
            removeItem: (key: string) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; },
        };
        Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
            writable: true,
            configurable: true,
        });
    });

    describe("Canonicalization and Hashing", () => {
        it("should deterministically canonicalize parameters regardless of key order", () => {
            const p1 = { "Área": ["Cível"], "q": ["burla"], "MinDate": ["2024"] };
            const p2 = { "q": ["burla"], "MinDate": ["2024"], "Área": ["Cível"] };
            expect(canonicalizeParams(p1)).toEqual(canonicalizeParams(p2));
        });

        it("should produce the same SHA-256 hash for identical parameters in different query order", async () => {
            const p1 = { "Área": ["Cível"], "q": ["burla"] };
            const p2 = { "q": ["burla"], "Área": ["Cível"] };
            const h1 = await computeParamsHash(p1);
            const h2 = await computeParamsHash(p2);
            expect(h1).toHaveLength(64);
            expect(h1).toEqual(h2);
        });

        it("should parse search params properly into array records", () => {
            const sp = new URLSearchParams("q=responsabilidade&Área=Cível&Área=Criminal&MinDate=2024-01-01");
            const record = parseSearchParamsToRecord(sp);
            expect(record["q"]).toEqual(["responsabilidade"]);
            expect(record["Área"]).toEqual(["Cível", "Criminal"]);
            expect(record["MinDate"]).toEqual(["2024-01-01"]);
        });

        it("should build informative summaries", () => {
            const params = {
                "q": ["contrato"],
                "MinDate": ["2023"],
                "MaxDate": ["2026"],
                "Área": ["Cível"],
                "Secção": ["1.ª Secção"]
            };
            const summary = buildParamsSummary(params);
            expect(summary.queryText).toBe("contrato");
            expect(summary.dateRange).toBe("2023 até 2026");
            expect(summary.filterCount).toBe(2);
            expect(summary.filtersPreview).toContain("Área: Cível");
            expect(summary.filtersPreview).toContain("Secção: 1.ª Secção");
        });
    });

    describe("Integrity Verification (Anonimizador Principle)", () => {
        it("should verify a pristine save as valid", async () => {
            const save = await saveSession("Minha Pesquisa", "q=burla&Área=Criminal");
            const isValid = await verifySaveIntegrity(save);
            expect(isValid).toBe(true);
        });

        it("should detect tampering if parameters are altered after save", async () => {
            const save = await saveSession("Teste Integridade", "q=burla&Área=Criminal");
            expect(await verifySaveIntegrity(save)).toBe(true);

            // Simulate malicious or corrupt tampering of parameters
            save.params["Área"] = ["Cível"];
            const isTamperedValid = await verifySaveIntegrity(save);
            expect(isTamperedValid).toBe(false);
        });

        it("should detect tampering if hash is corrupted", async () => {
            const save = await saveSession("Teste Hash", "q=test");
            save.hash = "0000000000000000000000000000000000000000000000000000000000000000";
            expect(await verifySaveIntegrity(save)).toBe(false);
        });
    });

    describe("CRUD and LocalStorage Persistence", () => {
        it("should save and retrieve sessions from storage", async () => {
            await saveSession("Sessão 1", "q=primeira");
            await saveSession("Sessão 2", "q=segunda");

            const list = getSavedSessions();
            expect(list).toHaveLength(2);
            expect(list[0].name).toBe("Sessão 2"); // Most recent first
            expect(list[1].name).toBe("Sessão 1");
        });

        it("should rename an existing session", async () => {
            const save = await saveSession("Original", "q=test");
            const success = updateSessionName(save.id, "Renomeado com Sucesso");
            expect(success).toBe(true);

            const list = getSavedSessions();
            expect(list[0].name).toBe("Renomeado com Sucesso");
        });

        it("should delete a saved session", async () => {
            const save1 = await saveSession("Para Manter", "q=keep");
            const save2 = await saveSession("Para Apagar", "q=delete");

            expect(getSavedSessions()).toHaveLength(2);
            deleteSavedSession(save2.id);

            const list = getSavedSessions();
            expect(list).toHaveLength(1);
            expect(list[0].id).toBe(save1.id);
        });

        it("should save and restore last session", async () => {
            await saveLastSession("q=ultima&Área=Social");
            const last = getLastSession();
            expect(last).not.toBeNull();
            expect(last?.params["q"]).toEqual(["ultima"]);
            expect(last?.params["Área"]).toEqual(["Social"]);
        });
    });

    describe("JSON Export & Import", () => {
        it("should import saves from JSON string", async () => {
            const sampleJson = JSON.stringify({
                version: "1.0",
                saves: [
                    {
                        name: "Importado 1",
                        params: { "q": ["exemplo1"] },
                        queryString: "?q=exemplo1"
                    }
                ]
            });

            const res = await importSavesFromJsonString(sampleJson);
            expect(res.imported).toBe(1);
            expect(res.errors).toBe(0);

            const list = getSavedSessions();
            expect(list).toHaveLength(1);
            expect(list[0].name).toBe("Importado 1");
            expect(await verifySaveIntegrity(list[0])).toBe(true);
        });
    });
});
