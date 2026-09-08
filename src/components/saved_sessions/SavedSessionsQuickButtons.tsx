'use client';

import React, { useState, useEffect } from "react";
import { getSavedSessions } from "@/core/session-saves";

export default function SavedSessionsQuickButtons({ className = "" }: { className?: string }) {
    const [savedSessionsCount, setSavedSessionsCount] = useState(0);

    useEffect(() => {
        const updateCount = () => {
            setSavedSessionsCount(getSavedSessions().length);
        };
        updateCount();
        window.addEventListener("storage", updateCount);
        window.addEventListener("juris-sessions-updated", updateCount);
        return () => {
            window.removeEventListener("storage", updateCount);
            window.removeEventListener("juris-sessions-updated", updateCount);
        };
    }, []);

    return (
        <div className={`d-inline-flex align-items-center gap-1 ${className}`}>
            <button
                type="button"
                className="btn btn-outline-primary btn-sm py-1 px-2 d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.82rem" }}
                data-bs-toggle="modal"
                data-bs-target="#modal-saved-sessions"
                title="Guardar parâmetros atuais da pesquisa no browser (Save File com Hash SHA-256)"
            >
                <i className="bi bi-bookmark-plus-fill"></i>
                <span>Guardar</span>
            </button>
            <button
                type="button"
                className="btn btn-outline-secondary btn-sm py-1 px-2 d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.82rem" }}
                data-bs-toggle="modal"
                data-bs-target="#modal-saved-sessions"
                title="Ver e carregar pesquisas guardadas no navegador"
            >
                <i className="bi bi-folder2-open"></i>
                <span>Sessões</span>
                {savedSessionsCount > 0 && (
                    <span className="badge bg-secondary ms-1" style={{ fontSize: "0.68rem" }}>
                        {savedSessionsCount}
                    </span>
                )}
            </button>
        </div>
    );
}
