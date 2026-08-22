import { NextApiRequest, NextApiResponse } from "next";
import { getElasticSearchClient } from "./elasticsearch";
import { IncomingMessage } from "http";

const REQUEST_INDEX = "requests.0.2";

let _clientReady = false;
async function getClient() {
    try {
        let client = await getElasticSearchClient();
        if (!_clientReady) {
            const exists = await client.indices.exists({ index: REQUEST_INDEX }).catch(() => false);
            if (!exists) {
                await client.indices.create({
                    index: REQUEST_INDEX,
                    mappings: {
                        properties: {
                            method: { type: 'keyword' },
                            url: { type: 'keyword' },
                            status: { type: 'integer' },
                            start: { type: 'date' },
                            end: { type: 'date' },
                            duration: { type: 'integer' },
                            userAgent: { type: 'keyword' },
                            ip: { type: 'ip' },
                            type: { type: 'keyword' }
                        }
                    },
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                        max_result_window: 550000
                    }
                }).catch(() => {});
            }
            _clientReady = true;
        }
        return client;
    } catch {
        return null;
    }
}

export async function trackApiRequest(req: NextApiRequest, res: NextApiResponse, start: Date, end: Date) {
    try {
        let client = await getClient();
        if (!client) return;
        await client.index({
            index: REQUEST_INDEX,
            body: {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                start: start.toISOString(),
                end: end.toISOString(),
                duration: (+end) - (+start),
                userAgent: req.headers['user-agent'],
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                type: "api"
            }
        }).catch(() => {});
    } catch {}
}

export async function trackSspRequest(req: IncomingMessage, status: number, start: Date, end: Date) {
    try {
        let client = await getClient();
        if (!client) return;
        await client.index({
            index: REQUEST_INDEX,
            body: {
                method: req.method,
                url: req.url,
                status,
                start: start.toISOString(),
                end: end.toISOString(),
                duration: (+end) - (+start),
                userAgent: req.headers['user-agent'],
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                type: "ssp"
            }
        }).catch(() => {});
    } catch {}
}