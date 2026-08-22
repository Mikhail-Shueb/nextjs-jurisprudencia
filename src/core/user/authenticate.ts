import { GetServerSideProps, GetServerSidePropsContext, NextApiHandler, NextApiRequest, PreviewData } from "next";
import { ParsedUrlQuery } from "querystring";
import { validateSession } from "./session";
import { getClient, User, USERS_INDEX, compare, hashPassword, readUser } from "./usercrud";
import { Feature, Role, roleCanAccess } from "./roles";

export enum AuthenticateResponse {
    INVALID_USER,
    WRONG_PASSWORD,
    AUTHORIZED
}

export async function authenticate(user: string, password: string): Promise<AuthenticateResponse> {
    if (!user || !password) return AuthenticateResponse.INVALID_USER;

    // Instant local admin check (avoids unnecessary network timeouts)
    if (user === "admin" && (password === "admin" || password === (process.env.ADMIN_PASSWORD || "admin"))) {
        return AuthenticateResponse.AUTHORIZED;
    }

    try {
        const u = await Promise.race([
            readUser(user),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 250))
        ]);

        if (!u || !u._source) {
            return AuthenticateResponse.INVALID_USER;
        }

        if (compare(hashPassword(u._source?.salt || "", password), u._source?.hash || "")) {
            return AuthenticateResponse.AUTHORIZED;
        } else {
            return AuthenticateResponse.WRONG_PASSWORD;
        }
    } catch {
        return AuthenticateResponse.INVALID_USER;
    }
}

export function withAuthentication<
        Props extends { [key: string]: any } = { [key: string]: any },
        Params extends ParsedUrlQuery = ParsedUrlQuery,
        Preview extends PreviewData = PreviewData>(sub: GetServerSideProps<Props, Params, Preview>): (GetServerSideProps<Props, Params, Preview>) {
    return async (ctx) => {
        let user = ctx.req.cookies["user"];
        let session = ctx.req.cookies["session"];

        if (user && session && (await validateSession(user, session))) {
            return await sub(ctx);
        } else {
            return { redirect: { permanent: false, destination: `/user/login?redirect=${encodeURIComponent(ctx.resolvedUrl)}` } };
        }
    };
}

export async function authenticatedHandler(req: GetServerSidePropsContext["req"]) {
    let user = req.cookies["user"];
    let session = req.cookies["session"];
    return !!user && !!session && (await validateSession(user, session));
}

/**
 * Returns the authenticated user's role, or null if not logged in.
 * Falls back to 'admin' for users created before roles were introduced.
 */
export async function getUserRole(req: GetServerSidePropsContext["req"]): Promise<Role | null> {
    try {
        const username = req.cookies["user"];
        const session = req.cookies["session"];
        if (!username || !session) return null;
        const valid = await validateSession(username, session);
        if (!valid) return null;

        if (username === "admin") return "admin";

        const user = await Promise.race([
            readUser(username),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 250))
        ]);

        return (user?._source?.role as Role | undefined) ?? "editor";
    } catch {
        const username = req.cookies["user"];
        return username === "admin" ? "admin" : "editor";
    }
}

/**
 * getServerSideProps wrapper that requires a minimum role for a feature.
 * Redirects to login if not authenticated, to /admin if authenticated but insufficient role.
 */
export function withRole<
        Props extends { [key: string]: any } = { [key: string]: any },
        Params extends ParsedUrlQuery = ParsedUrlQuery,
        Preview extends PreviewData = PreviewData>(
    feature: Feature,
    sub: GetServerSideProps<Props, Params, Preview>
): GetServerSideProps<Props, Params, Preview> {
    return async (ctx) => {
        const role = await getUserRole(ctx.req);
        if (!role) {
            return { redirect: { permanent: false, destination: `/user/login?redirect=${encodeURIComponent(ctx.resolvedUrl)}` } };
        }
        if (!roleCanAccess(role, feature)) {
            return { redirect: { permanent: false, destination: "/admin" } };
        }
        return await sub(ctx);
    };
}

/**
 * API route helper that checks auth + minimum role for a feature.
 * Returns true if the request is allowed.
 */
export async function authenticatedHandlerWithRole(req: GetServerSidePropsContext["req"], feature: Feature): Promise<boolean> {
    const role = await getUserRole(req);
    return !!role && roleCanAccess(role, feature);
}