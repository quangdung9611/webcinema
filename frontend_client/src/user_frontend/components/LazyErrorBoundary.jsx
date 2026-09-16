import React from "react";
import {
    FileWarning,
    RefreshCw,
} from "lucide-react";

import "../styles/LazyErrorBoundary.css";

// ============================================================
// LAZY ERROR BOUNDARY
// ============================================================

class LazyErrorBoundary extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
            error: null,
        };
    }

    // ========================================================
    // CATCH ERROR
    // ========================================================

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }

    // ========================================================
    // LOG ERROR
    // ========================================================

    componentDidCatch(error, errorInfo) {
        console.error(
            "🔴 [APP] Page loading error:",
            error,
            errorInfo
        );
    }

    // ========================================================
    // RETRY
    // ========================================================

    handleRetry = () => {
        /*
         * Chỉ xoá các flag liên quan tới lazy loading.
         *
         * Không xoá:
         * - localStorage
         * - toàn bộ sessionStorage
         *
         * để tránh ảnh hưởng auth / booking / payment.
         */

        sessionStorage.removeItem(
            "lazyRetried"
        );

        sessionStorage.removeItem(
            "lazyLoadFailed"
        );

        /*
         * Reload app để browser lấy lại
         * deployment / chunk hiện tại.
         */

        window.location.reload();
    };

    // ========================================================
    // RENDER
    // ========================================================

    render() {
        // ----------------------------------------------------
        // NORMAL
        // ----------------------------------------------------

        if (!this.state.hasError) {
            return this.props.children;
        }

        const currentUrl =
            typeof window !== "undefined"
                ? window.location.hostname
                : "quangdungcinema.id.vn";

        /*
         * Không hiển thị error.message trực tiếp ra giao diện
         * chính để tránh UI bị dài hoặc khó hiểu với khách.
         */

        return (
            <main className="lazy-error-page">
                <section className="lazy-error-page__content">

                    {/* ==================================================
                        ICON
                    ================================================== */}

                    <div
                        className="lazy-error-page__icon"
                        aria-hidden="true"
                    >
                        <FileWarning
                            size={48}
                            strokeWidth={1.25}
                        />
                    </div>

                    {/* ==================================================
                        TITLE
                    ================================================== */}

                    <h1 className="lazy-error-page__title">
                        This site can’t be reached
                    </h1>

                    {/* ==================================================
                        MESSAGE
                    ================================================== */}

                    <p className="lazy-error-page__message">
                        <strong>
                            {currentUrl}
                        </strong>{" "}
                        couldn’t load this page.
                    </p>

                    {/* ==================================================
                        TRY
                    ================================================== */}

                    <div className="lazy-error-page__tips">
                        <span>
                            Try:
                        </span>

                        <ul>
                            <li>
                                Reloading the page
                            </li>

                            <li>
                                Checking your
                                internet connection
                            </li>
                        </ul>
                    </div>

                    {/* ==================================================
                        ERROR CODE
                    ================================================== */}

                    <div
                        className="lazy-error-page__code"
                        role="status"
                        aria-live="polite"
                    >
                        ERR_PAGE_LOAD_FAILED
                    </div>

                    {/* ==================================================
                        ACTION
                    ================================================== */}

                    <button
                        type="button"
                        className="lazy-error-page__btn"
                        onClick={
                            this.handleRetry
                        }
                    >
                        <RefreshCw
                            size={16}
                            strokeWidth={2}
                        />

                        Reload
                    </button>

                </section>
            </main>
        );
    }
}

export default LazyErrorBoundary;