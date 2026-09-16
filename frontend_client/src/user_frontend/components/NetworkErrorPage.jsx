
import React, { useMemo } from "react";
import {
    FileWarning,
    WifiOff,
    RefreshCw,
    Globe2,
} from "lucide-react";

import "../styles/NetworkErrorPage.css";

// ============================================================
// ERROR CONFIG
// ============================================================

const ERROR_CONFIG = {
    offline: {
        Icon: WifiOff,

        title: "No internet",

        defaultMessage:
            "Your device is offline. Check your network connection, then try again.",

        defaultCode:
            "ERR_INTERNET_DISCONNECTED",
    },

    dns: {
        Icon: FileWarning,

        title: "This site can't be reached",

        defaultMessage:
            "The server IP address could not be found.",

        defaultCode:
            "ERR_NAME_NOT_RESOLVED",
    },

    timeout: {
        Icon: Globe2,

        title: "This site took too long to respond",

        defaultMessage:
            "The server took too long to respond.",

        defaultCode:
            "ERR_CONNECTION_TIMED_OUT",
    },

    connection: {
        Icon: FileWarning,

        title: "This site can't be reached",

        defaultMessage:
            "The connection to the server could not be established.",

        defaultCode:
            "ERR_CONNECTION_REFUSED",
    },

    network: {
        Icon: WifiOff,

        title: "Network error",

        defaultMessage:
            "A network error occurred while trying to connect to the server.",

        defaultCode:
            "ERR_NETWORK",
    },
};

// ============================================================
// COMPONENT
// ============================================================

const NetworkErrorPage = ({
    mode = "offline",

    url = typeof window !== "undefined"
        ? window.location.hostname
        : "",

    message = null,

    errorCode = null,

    isChecking = false,

    onRetry = null,
}) => {
    // ========================================================
    // CONFIG
    // ========================================================

    const config = useMemo(() => {
        return (
            ERROR_CONFIG[mode] ||
            ERROR_CONFIG.network
        );
    }, [mode]);

    const {
        Icon,
        title,
        defaultMessage,
        defaultCode,
    } = config;

    const displayCode =
        errorCode || defaultCode;

    // ========================================================
    // MESSAGE
    // ========================================================

    const displayMessage =
        message || defaultMessage;

    // ========================================================
    // RETRY
    // ========================================================

    const handleRetry = async () => {
        /*
         * Nếu App truyền onRetry thì dùng retryConnection
         * từ NetworkContext.
         *
         * Nếu không truyền thì fallback về reload.
         */

        if (typeof onRetry === "function") {
            try {
                await onRetry();
            } catch (error) {
                console.warn(
                    "⚠️ [NetworkErrorPage] Retry failed:",
                    error
                );
            }

            return;
        }

        window.location.reload();
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <main
            className={`network-error-page network-error-page--${mode}`}
        >
            <section className="network-error-page__content">

                {/* ==================================================
                    ICON
                ================================================== */}

                <div
                    className="network-error-page__icon"
                    aria-hidden="true"
                >
                    <Icon
                        size={72}
                        strokeWidth={1.25}
                    />
                </div>

                {/* ==================================================
                    TITLE
                ================================================== */}

                <h1 className="network-error-page__title">
                    {title}
                </h1>

                {/* ==================================================
                    MESSAGE
                ================================================== */}

                <p className="network-error-page__message">
                    {mode === "dns" ||
                    mode === "timeout" ||
                    mode === "connection" ? (
                        <>
                            <strong>
                                {url}
                            </strong>{" "}
                            {displayMessage}
                        </>
                    ) : (
                        displayMessage
                    )}
                </p>

                {/* ==================================================
                    TRY SUGGESTIONS
                ================================================== */}

                {mode === "offline" && (
                    <div className="network-error-page__tips">
                        <span>
                            Try:
                        </span>

                        <ul>
                            <li>
                                Checking your
                                network connection
                            </li>

                            <li>
                                Checking your Wi-Fi
                                or network cable
                            </li>
                        </ul>
                    </div>
                )}

                {mode === "timeout" && (
                    <div className="network-error-page__tips">
                        <span>
                            Try:
                        </span>

                        <ul>
                            <li>
                                Checking your
                                network connection
                            </li>

                            <li>
                                Checking whether the
                                server is available
                            </li>
                        </ul>
                    </div>
                )}

                {mode === "connection" && (
                    <div className="network-error-page__tips">
                        <span>
                            Try:
                        </span>

                        <ul>
                            <li>
                                Checking your
                                network connection
                            </li>

                            <li>
                                Checking the server
                                status
                            </li>
                        </ul>
                    </div>
                )}

                {/* ==================================================
                    ERROR CODE
                ================================================== */}

                <div
                    className="network-error-page__code"
                    role="status"
                    aria-live="polite"
                >
                    {displayCode}
                </div>

                {/* ==================================================
                    ACTION
                ================================================== */}

                <button
                    type="button"
                    className="network-error-page__btn"
                    onClick={handleRetry}
                    disabled={isChecking}
                >
                    <RefreshCw
                        size={16}
                        className={
                            isChecking
                                ? "network-error-page__spinner"
                                : ""
                        }
                    />

                    {isChecking
                        ? "Checking..."
                        : "Reload"}
                </button>

            </section>
        </main>
    );
};

export default NetworkErrorPage;

