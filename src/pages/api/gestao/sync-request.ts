import LoggerApi from "@/core/logger-api";
import { sendSyncRequestEmail } from "@/core/email-sync";
import type { NextApiRequest, NextApiResponse } from "next";

type Response = { ok: boolean; message?: string };

/**
 * POST /api/gestao/sync-request
 *
 * Sends a signed [JURIS-SYNC-REQUEST] email to externo asking it to run its
 * export. Externo's poller verifies and responds with per-document
 * [JURIS-SYNC-BACK] emails, which interno's import poller then applies.
 * The flow is asynchronous — this returns as soon as the request is sent; the
 * data lands over the mailbox within ~10-70s.
 * Only active on internal deployments (SYNC_ROLE=interno).
 */
export default LoggerApi(async function syncRequestHandler(
    req: NextApiRequest,
    res: NextApiResponse<Response>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    if (process.env.SYNC_ROLE !== "interno") {
        return res.status(403).json({ ok: false, message: "Sync request is only active on internal deployments (SYNC_ROLE=interno)" });
    }

    try {
        await sendSyncRequestEmail();
        return res.status(200).json({ ok: true, message: "Pedido de sincronização enviado — as alterações chegam dentro de ~1 min" });
    } catch (err: any) {
        console.error("Error in /api/gestao/sync-request:", err);
        return res.status(500).json({ ok: false, message: err?.message || "Internal server error" });
    }
});
