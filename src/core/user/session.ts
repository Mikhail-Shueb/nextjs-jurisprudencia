import { createClient } from "redis";
import crypto from "crypto";

export const sha256 = (msg: string) => crypto.createHash("sha256").update(msg).digest("hex");
const saltGen = (size: number = 16) => crypto.randomBytes(size).toString("hex");

export const SESSION_KEY = "redis-sessions.0.0";
export const SESSION_EXPIRE = 15 * 60;

// ── Redis circuit-breaker ────────────────────────────────────────────
let redisAvailable: boolean | null = null;
let lastRedisCheck = 0;

export async function getRedisClient() {
    if (redisAvailable === false && Date.now() - lastRedisCheck < 15000) {
        return null;
    }
    try {
        lastRedisCheck = Date.now();
        const client = createClient({
            url: process.env.REDIS_URL || "redis://127.0.0.1:6379/0",
            socket: {
                connectTimeout: 200,
                reconnectStrategy: false
            }
        });
        client.on("error", () => { redisAvailable = false; });
        await Promise.race([
            client.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 200))
        ]);
        redisAvailable = true;
        return client;
    } catch {
        redisAvailable = false;
        return null;
    }
}

// ── In-memory session store ──────────────────────────────────────────
// IMPORTANT: Use globalThis so the Map is shared across Next.js webpack
// bundles (API routes vs SSP pages get separate module instances in dev).
const GLOBAL_KEY = "__jurisprudencia_sessions__";
type SessionEntry = { user: string; expires: number };

function getMemorySessions(): Map<string, SessionEntry> {
    const g = globalThis as any;
    if (!g[GLOBAL_KEY]) {
        g[GLOBAL_KEY] = new Map<string, SessionEntry>();
    }
    return g[GLOBAL_KEY];
}

// ── Public API ───────────────────────────────────────────────────────

export async function createSession(user: string): Promise<string> {
    try {
        const client = await getRedisClient();
        if (client) {
            try {
                let tries = 3;
                let sessionId: string | null = null;
                while (!sessionId && tries > 0) {
                    sessionId = saltGen(24);
                    const r = await client.set(`${SESSION_KEY}:${sessionId}`, user, { NX: true, EX: SESSION_EXPIRE });
                    if (r !== "OK") sessionId = null;
                    tries--;
                }
                if (sessionId) return sessionId;
            } finally {
                await client.quit().catch(() => {});
            }
        }
    } catch {}

    // Fallback: in-memory (0 ms latency)
    const sessionId = saltGen(24);
    getMemorySessions().set(sessionId, { user, expires: Date.now() + SESSION_EXPIRE * 1000 });
    return sessionId;
}

export async function validateSession(user: string, session: string): Promise<boolean> {
    if (!session || !user) return false;
    try {
        const client = await getRedisClient();
        if (client) {
            try {
                const sessionUser = await client.get(`${SESSION_KEY}:${session}`);
                if (sessionUser && sessionUser === user) {
                    await client.expire(`${SESSION_KEY}:${session}`, SESSION_EXPIRE).catch(() => {});
                    return true;
                }
                return false;
            } finally {
                await client.quit().catch(() => {});
            }
        }
    } catch {}

    // Fallback: in-memory
    const sessions = getMemorySessions();
    const entry = sessions.get(session);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
        sessions.delete(session);
        return false;
    }
    if (entry.user !== user) return false;
    entry.expires = Date.now() + SESSION_EXPIRE * 1000;
    return true;
}

export async function deleteSession(user: string, session: string): Promise<number> {
    try {
        const client = await getRedisClient();
        if (client) {
            try {
                return await client.del(`${SESSION_KEY}:${session}`);
            } finally {
                await client.quit().catch(() => {});
            }
        }
    } catch {}

    getMemorySessions().delete(session);
    return 1;
}

export async function deleteUserSession(user: string): Promise<void> {
    const sessions = getMemorySessions();
    for (const [sId, data] of Array.from(sessions.entries())) {
        if (data.user === user) {
            sessions.delete(sId);
        }
    }
}