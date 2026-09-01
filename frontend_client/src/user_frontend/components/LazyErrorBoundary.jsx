// src/user_frontend/components/LazyErrorBoundary.jsx
import React from "react";
import "../styles/LazyErrorBoundary.css";

class LazyErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("🔴 [APP] Lazy load error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        sessionStorage.removeItem('lazyRetried');
        sessionStorage.removeItem('lazyLoadFailed');
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        sessionStorage.removeItem('lazyRetried');
        sessionStorage.removeItem('lazyLoadFailed');
        window.location.href = '/';
    };

    handleClearCache = () => {
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => {
                    caches.delete(name);
                });
            });
        }
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="lazy-error-boundary">
                    <div className="lazy-error-icon">⚠️</div>
                    <h2 className="lazy-error-title">Không thể tải trang</h2>
                    <p className="lazy-error-message">
                        Có lỗi xảy ra khi tải trang. Vui lòng thử lại hoặc quay lại trang chủ.
                        {this.state.error?.message && (
                            <span className="lazy-error-detail">
                                Lỗi: {this.state.error.message}
                            </span>
                        )}
                    </p>
                    <div className="lazy-error-actions">
                        <button 
                            onClick={this.handleRetry} 
                            className="lazy-btn-retry"
                        >
                            🔄 Tải lại trang
                        </button>
                        <button 
                            onClick={this.handleGoHome} 
                            className="lazy-btn-home"
                        >
                            🏠 Trang chủ
                        </button>
                    </div>
                    <div className="lazy-error-tips">
                        <p className="lazy-error-tips-text">
                            💡 Thử <strong>Ctrl+F5</strong> (Windows) hoặc <strong>Cmd+Shift+R</strong> (Mac) để tải lại.
                        </p>
                        <button 
                            onClick={this.handleClearCache}
                            className="lazy-btn-clear-cache"
                        >
                            🗑️ Xóa cache & thử lại
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default LazyErrorBoundary;