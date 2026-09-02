import GenericPage from "@/components/main_pages/genericPageStructure";
import { LoggerServerSideProps } from "@/core/logger-api";
import { authenticate, AuthenticateResponse } from "@/core/user/authenticate";
import { createSession, validateSession } from "@/core/user/session";
import { logAuditEvent } from "@/core/audit-log";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

interface LoginProps {
    response?: AuthenticateResponse;
}

export const getServerSideProps: GetServerSideProps<LoginProps> = LoggerServerSideProps(async (ctx) => {
    let redirect = Array.isArray(ctx.query.redirect) ? ctx.query.redirect[0] : ctx.query.redirect || `/admin`;

    if (ctx.req.method === "POST") {
        let requestPostDataParams: URLSearchParams;
        if ((ctx.req as any).body && typeof (ctx.req as any).body === "object") {
            requestPostDataParams = new URLSearchParams((ctx.req as any).body);
        } else {
            requestPostDataParams = await new Promise<URLSearchParams>((resolve) => {
                let _data = "";
                const timer = setTimeout(() => resolve(new URLSearchParams(_data)), 800);
                ctx.req.on("data", (d) => (_data += d.toString()));
                ctx.req.on("end", () => {
                    clearTimeout(timer);
                    resolve(new URLSearchParams(_data));
                });
                ctx.req.on("error", () => {
                    clearTimeout(timer);
                    resolve(new URLSearchParams(_data));
                });
            });
        }

        let user = requestPostDataParams.get("user");
        let pass = requestPostDataParams.get("pass");
        let r = user && pass && (await authenticate(user, pass));

        if (r === AuthenticateResponse.AUTHORIZED) {
            let session = await createSession(user!);
            ctx.res.setHeader("Set-cookie", [`user=${user}; HttpOnly; Path=/`,`session=${session}; HttpOnly; Path=/`])
            const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.socket?.remoteAddress || "unknown";
            logAuditEvent("login", user!, { ip });
            return {redirect: {destination: redirect, statusCode: 303}}
        }
    } else {
        let user = ctx.req.cookies["user"];
        let session = ctx.req.cookies["session"];

        if (user && session && (await validateSession(user, session))) {
            return { redirect: { destination: redirect, permanent: false } };
        }
    }

    return { props: {} };
});

export default function Login(props: LoginProps) {
    const router = useRouter();
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(props.response !== undefined ? "Utilizador ou palavra-passe errados" : "");

    const redirectTarget = Array.isArray(router.query.redirect)
        ? router.query.redirect[0]
        : router.query.redirect || "/admin";

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !pass) {
            setErrorMsg("Por favor introduza o utilizador e a palavra-passe.");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch("/api/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user, pass })
            });

            const data = await res.json();
            if (data.ok) {
                window.location.href = redirectTarget;
            } else {
                setErrorMsg(data.message || "Utilizador ou palavra-passe errados.");
                setLoading(false);
            }
        } catch {
            // Fallback: submeter via POST nativo
            (e.target as HTMLFormElement).submit();
        }
    }

    return (
        <GenericPage keys_to_remove={["redirect"]} title="Jurisprudência STJ - Autenticação">
            <div className="row justify-content-sm-center py-4">
                <div className="col-12 col-sm-10 col-md-6 col-xl-4">
                    <div className="card shadow-sm border rounded-3 overflow-hidden">
                        <div className="card-header bg-danger text-white py-3">
                            <h4 className="card-title m-0 fs-5 fw-bold d-flex align-items-center gap-2">
                                <i className="bi bi-shield-lock-fill"></i> Autenticação
                            </h4>
                        </div>
                        <div className="card-body p-4">
                            {errorMsg && (
                                <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    <div>{errorMsg}</div>
                                </div>
                            )}

                            <form onSubmit={handleLogin} method="POST">
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold text-muted">Nome de Utilizador</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light text-muted">
                                            <i className="bi bi-person"></i>
                                        </span>
                                        <input
                                            name="user"
                                            type="text"
                                            className="form-control"
                                            placeholder="ex: admin"
                                            value={user}
                                            onChange={(e) => setUser(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label small fw-semibold text-muted">Palavra-passe</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light text-muted">
                                            <i className="bi bi-key"></i>
                                        </span>
                                        <input
                                            name="pass"
                                            type="password"
                                            className="form-control"
                                            placeholder="••••••••"
                                            value={pass}
                                            onChange={(e) => setPass(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-danger py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                <span>A autenticar...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-box-arrow-in-right"></i>
                                                <span>Entrar no Sistema</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </GenericPage>
    );
}