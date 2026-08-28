// src/components/LazyErrorBoundary.js
import React from "react";

class LazyErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("🔴 [APP] Lazy load error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
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
                    background: "#1e1e2f",
                    color: "#f1f1f1"
                }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
                    <h2>Không thể tải trang</h2>
                    <p style={{ color: "#d1d5db", maxWidth: "500px", lineHeight: "1.6" }}>
                        Có lỗi xảy ra khi tải trang. Vui lòng thử lại hoặc quay lại trang chủ.
                    </p>
                    <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                        <button onClick={this.handleRetry} style={{ padding: "10px 24px", cursor: "pointer" }}>
                            Tải lại trang
                        </button>
                        <button onClick={() => window.location.href = "/"} style={{ padding: "10px 24px", cursor: "pointer" }}>
                            Trang chủ
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default LazyErrorBoundary;