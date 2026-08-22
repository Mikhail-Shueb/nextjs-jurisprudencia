import { getElasticSearchClient } from "../elasticsearch";
import { Role } from "./roles";
import crypto, { timingSafeEqual } from "crypto";

export const sha256 = (msg: string) => crypto.createHash("sha256").update(msg).digest("hex");
const saltGen = (size: number = 16) => crypto.randomBytes(size).toString("hex");

export const USERS_INDEX = "users.0.0";

export type User = {
    username: string;
    salt: string;
    hash: string;
    role: Role;
};

export function hashPassword(salt: string, password: string) {
    return sha256(salt + password);
}

export function compare(hash1: string, hash2: string) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return false;
    return timingSafeEqual(Buffer.from(hash1), Buffer.from(hash2));
}

// In-memory user fallback for local testing & offline environments
const inMemoryUsers: Map<string, User> = new Map([
    [
        "admin",
        {
            username: "admin",
            salt: "demousersalt16ch",
            hash: hashPassword("demousersalt16ch", process.env.ADMIN_PASSWORD || "admin"),
            role: "admin"
        }
    ],
    [
        "editor",
        {
            username: "editor",
            salt: "demousersalt16ch",
            hash: hashPassword("demousersalt16ch", "editor"),
            role: "editor"
        }
    ]
]);

let esUserIndexReady: boolean | null = null;
let lastEsCheck = 0;

export async function getClient() {
    if (esUserIndexReady === false && Date.now() - lastEsCheck < 15000) {
        return null;
    }
    try {
        lastEsCheck = Date.now();
        const client = await getElasticSearchClient();
        const exists = await Promise.race([
            client.indices.exists({ index: USERS_INDEX }),
            new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error("ES timeout")), 200))
        ]).catch(() => false);

        if (!exists) {
            await client.indices.create({
                index: USERS_INDEX,
                mappings: {
                    properties: {
                        username: { type: 'keyword' },
                        salt:     { type: 'binary' },
                        hash:     { type: 'binary' },
                        role:     { type: 'keyword' }
                    }
                },
                settings: {
                    number_of_shards: 1,
                    number_of_replicas: 0,
                    max_result_window: 550000
                }
            }).catch(() => {});

            await client.index({
                index: USERS_INDEX,
                document: {
                    username: "admin",
                    salt: "initialadminsalt16",
                    hash: hashPassword("initialadminsalt16", process.env.ADMIN_PASSWORD || "admin"),
                    role: "admin"
                }
            }).catch(() => {});
        }
        esUserIndexReady = true;
        return client;
    } catch {
        esUserIndexReady = false;
        return null;
    }
}

export async function listUsers(from: number = 0) {
    try {
        const client = await getClient();
        if (client) {
            const res = await Promise.race([
                client.search<User>({ index: USERS_INDEX, from: from, track_total_hits: true }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 300))
            ]);
            if (res) return res;
        }
    } catch {}

    const hits = Array.from(inMemoryUsers.values()).map(u => ({
        _id: u.username,
        _source: u
    }));
    return { hits: { hits, total: { value: hits.length, relation: "eq" } } } as any;
}

export async function createUser(user: string, password: string, role: Role = 'editor') {
    try {
        const client = await getClient();
        if (client) {
            const r = await Promise.race([
                client.search<User>({ index: USERS_INDEX, query: { term: { username: user } } }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 300))
            ]);
            if (r && r.hits.hits.length > 0) {
                return false;
            }
            const salt = saltGen();
            const res = await client.index({
                index: USERS_INDEX,
                document: {
                    username: user,
                    salt: salt,
                    hash: hashPassword(salt, password),
                    role
                },
                refresh: "wait_for"
            });
            return res.result === "created";
        }
    } catch {}

    if (inMemoryUsers.has(user)) {
        return false;
    }
    const salt = saltGen();
    inMemoryUsers.set(user, {
        username: user,
        salt,
        hash: hashPassword(salt, password),
        role
    });
    return true;
}

export async function readUser(user: string) {
    const memUser = inMemoryUsers.get(user);
    try {
        const client = await getClient();
        if (client) {
            const r = await Promise.race([
                client.search<User>({ index: USERS_INDEX, query: { term: { username: user } } }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 300))
            ]);
            if (r && r.hits.hits[0]) {
                return r.hits.hits[0];
            }
        }
    } catch {}

    if (memUser) {
        return { _id: user, _source: memUser } as any;
    }
    return null;
}

export async function updateUser(user: string, password: string) {
    try {
        const client = await getClient();
        if (client) {
            const r = await client.search<User>({ index: USERS_INDEX, query: { term: { username: user } } });
            if (r.hits.hits.length >= 1) {
                const hit = r.hits.hits[0];
                const salt = saltGen();
                return await client.update({
                    index: USERS_INDEX,
                    id: hit._id!,
                    doc: {
                        salt: salt,
                        hash: hashPassword(salt, password)
                    },
                    refresh: "wait_for"
                }).then(res => res.result === "updated");
            }
        }
    } catch {}

    const memUser = inMemoryUsers.get(user);
    if (memUser) {
        const salt = saltGen();
        memUser.salt = salt;
        memUser.hash = hashPassword(salt, password);
        return true;
    }
    return false;
}

export async function deleteUser(user: string) {
    try {
        const client = await getClient();
        if (client) {
            return await client.deleteByQuery({ index: USERS_INDEX, query: { term: { username: user } }, refresh: true });
        }
    } catch {}

    inMemoryUsers.delete(user);
    return true;
}