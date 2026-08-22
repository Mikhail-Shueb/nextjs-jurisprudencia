import type { NextApiRequest, NextApiResponse } from "next";
import LoggerApi from "@/core/logger-api";
import { authenticate, AuthenticateResponse } from "@/core/user/authenticate";
import { createSession } from "@/core/user/session";

export default LoggerApi(async function loginApiHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, message: "Method Not Allowed" });
    }

    const { user, pass } = req.body || {};
    if (!user || !pass) {
        return res.status(400).json({ ok: false, message: "Utilizador e palavra-passe obrigatórios" });
    }

    const authRes = await authenticate(user, pass);
    if (authRes === AuthenticateResponse.AUTHORIZED) {
        const session = await createSession(user);
        const isSecure = process.env.NODE_ENV === "production" && !req.headers.host?.includes("localhost");
        const secureFlag = isSecure ? "; Secure" : "";

        res.setHeader("Set-Cookie", [
            `user=${encodeURIComponent(user)}; HttpOnly${secureFlag}; SameSite=Lax; Path=/`,
            `session=${encodeURIComponent(session)}; HttpOnly${secureFlag}; SameSite=Lax; Path=/`
        ]);

        return res.status(200).json({ ok: true, user });
    }

    return res.status(401).json({
        ok: false,
        message: authRes === AuthenticateResponse.WRONG_PASSWORD ? "Palavra-passe incorreta" : "Utilizador não encontrado"
    });
});
