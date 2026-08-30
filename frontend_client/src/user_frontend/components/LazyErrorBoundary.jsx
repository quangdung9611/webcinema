// src/user_frontend/components/LazyErrorBoundary.js
import React from "react";

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
        // Xóa session storage để thử lại
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
        // Xóa cache và reload
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
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    padding: "20px",
                    textAlign: "center",
                    background: "#0a0a14",
                    color: "#f1f1f1",
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
                }}>
                    <div style={{ fontSize: "56px", marginBottom: "16px" }}>⚠️</div>
                    <h2 style={{ 
                        color: "#fff", 
                        marginBottom: "8px",
                        fontSize: "24px",
                        fontWeight: "700"
                    }}>
                        Không thể tải trang
                    </h2>
                    <p style={{ 
                        color: "#94a3b8", 
                        maxWidth: "500px", 
                        lineHeight: "1.6", 
                        marginBottom: "20px",
                        fontSize: "15px"
                    }}>
                        Có lỗi xảy ra khi tải trang. Vui lòng thử lại hoặc quay lại trang chủ.
                        {this.state.error?.message && (
                            <span style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: '#64748b' }}>
                                Lỗi: {this.state.error.message}
                            </span>
                        )}
                    </p>
                    <div style={{ 
                        display: "flex", 
                        gap: "12px", 
                        flexWrap: "wrap", 
                        justifyContent: "center",
                        marginBottom: "16px"
                    }}>
                        <button 
                            onClick={this.handleRetry} 
                            style={{
                                padding: "10px 24px",
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #f37021, #f5a623)",
                                color: "#0a0a14",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "700",
                                fontSize: "14px",
                                transition: "all 0.3s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = "translateY(-2px)";
                                e.target.style.boxShadow = "0 4px 20px rgba(243, 112, 33, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                            }}
                        >
                            🔄 Tải lại trang
                        </button>
                        <button 
                            onClick={this.handleGoHome} 
                            style={{
                                padding: "10px 24px",
                                cursor: "pointer",
                                background: "rgba(255,255,255,0.06)",
                                color: "#94a3b8",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontWeight: "700",
                                fontSize: "14px",
                                transition: "all 0.3s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = "rgba(255,255,255,0.1)";
                                e.target.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = "rgba(255,255,255,0.06)";
                                e.target.style.color = "#94a3b8";
                            }}
                        >
                            🏠 Trang chủ
                        </button>
                    </div>
                    <div style={{ 
                        marginTop: "12px", 
                        padding: "12px 16px", 
                        background: "rgba(255,255,255,0.03)", 
                        borderRadius: "8px", 
                        maxWidth: "500px",
                        border: "1px solid rgba(255,255,255,0.05)"
                    }}>
                        <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
                            💡 Thử <strong style={{ color: "#94a3b8" }}>Ctrl+F5</strong> (Windows) hoặc <strong style={{ color: "#94a3b8" }}>Cmd+Shift+R</strong> (Mac) để tải lại.
                        </p>
                        <button 
                            onClick={this.handleClearCache}
                            style={{
                                marginTop: "8px",
                                padding: "6px 16px",
                                cursor: "pointer",
                                background: "rgba(255,59,92,0.1)",
                                color: "#ff6b8a",
                                border: "1px solid rgba(255,59,92,0.2)",
                                borderRadius: "6px",
                                fontSize: "12px",
                                transition: "all 0.3s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = "rgba(255,59,92,0.2)";
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = "rgba(255,59,92,0.1)";
                            }}
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