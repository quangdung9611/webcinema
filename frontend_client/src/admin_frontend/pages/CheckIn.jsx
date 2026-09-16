import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import adminapi from "../../api/adminapi";
import "../styles/CheckIn.css";

function CheckIn() {
    const navigate = useNavigate();
    const { ticketCode: urlTicketCode } = useParams();

    // ============================================
    // STATE
    // ============================================
    const [scanning, setScanning] = useState(!urlTicketCode);
    const [result, setResult] = useState(null);
    const [manualCode, setManualCode] = useState("");
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [torchOn, setTorchOn] = useState(false);
    const [checkedCount, setCheckedCount] = useState(0);

    // ============================================
    // REFS
    // ============================================
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const initialCheckDoneRef = useRef(false);
    const fileInputRef = useRef(null);

    // ============================================
    // AUTO CHECK-IN NẾU CÓ URL PARAM
    // ============================================
    useEffect(() => {
        if (!urlTicketCode || initialCheckDoneRef.current) return;
        initialCheckDoneRef.current = true;

        console.log("🔗 Auto check-in từ URL:", urlTicketCode);
        doCheckIn(urlTicketCode);
    }, [urlTicketCode]);

    // ============================================
    // CAMERA SCANNER
    // ============================================
    useEffect(() => {
        if (!scanning || urlTicketCode || result) return;

        let html5QrCode = null;

        const startScanner = async () => {
            try {
                html5QrCode = new Html5Qrcode("qr-reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    async (decodedText) => {
                        if (isProcessingRef.current) return;
                        isProcessingRef.current = true;

                        const code = extractCode(decodedText);
                        console.log("📷 Quét được:", code);

                        await doCheckIn(code);

                        setTimeout(() => {
                            isProcessingRef.current = false;
                        }, 2000);
                    },
                    () => {}
                );

                setCameraError(null);
            } catch (err) {
                console.error("❌ Không mở được camera:", err);
                setCameraError(
                    "Không mở được camera. Vui lòng cấp quyền hoặc nhập mã thủ công."
                );
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => scannerRef.current.clear())
                    .catch(() => {});
                scannerRef.current = null;
            }
        };
    }, [scanning, urlTicketCode, result]);

    // ============================================
    // AUTO VỀ CAMERA SAU 5S (nếu thành công)
    // ============================================
    useEffect(() => {
        if (result?.success) {
            const timer = setTimeout(() => {
                handleScanAgain();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [result]);

    // ============================================
    // TRÍCH CODE TỪ QR
    // ============================================
    const extractCode = (text) => {
        if (text.includes("/check-in/")) {
            const parts = text.split("/check-in/");
            const lastPart = parts[parts.length - 1];
            return lastPart.split("?")[0].trim();
        }
        return text.trim();
    };

    // ============================================
    // GỌI API CHECK-IN
    // ============================================
    const doCheckIn = async (ticketCode) => {
        try {
            const res = await adminapi.post("/api/tickets/check-in", {
                ticketCode,
            });

            setResult({
                success: true,
                message: res.data.message,
                ticket: res.data.ticket,
            });

            setCheckedCount((prev) => prev + 1);

            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            playSound("success");

            if (showHistory) loadHistory();
        } catch (err) {
            setResult({
                success: false,
                message: err.response?.data?.message || "Lỗi soát vé",
            });
            playSound("error");
        }
    };

    // ============================================
    // ÂM THANH
    // ============================================
    const playSound = (type) => {
        try {
            const audio = new Audio(`/sounds/${type}.mp3`);
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (err) {}
    };

    // ============================================
    // BẬT/TẮT ĐÈN FLASH
    // ============================================
    const toggleTorch = async () => {
        if (!scannerRef.current) return;

        try {
            const newState = !torchOn;
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: newState }],
            });
            setTorchOn(newState);
        } catch (err) {
            console.warn("Không bật được đèn:", err.message);
        }
    };

    // ============================================
    // CHỌN ẢNH TỪ THƯ VIỆN
    // ============================================
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const html5QrCode = new Html5Qrcode("qr-reader-hidden");
            const decodedText = await html5QrCode.scanFile(file, true);
            const code = extractCode(decodedText);
            await doCheckIn(code);
        } catch (err) {
            setResult({
                success: false,
                message: "Không đọc được QR từ ảnh này",
            });
        } finally {
            e.target.value = "";
        }
    };

    // ============================================
    // QUÉT TIẾP
    // ============================================
    const handleScanAgain = () => {
        setResult(null);
        setManualCode("");
        setScanning(true);
        setCameraError(null);
        setTorchOn(false);
        initialCheckDoneRef.current = false;

        if (urlTicketCode) {
            navigate("/check-in", { replace: true });
        }
    };

    // ============================================
    // NHẬP THỦ CÔNG
    // ============================================
    const handleManualSubmit = (e) => {
        e.preventDefault();
        const code = manualCode.trim().toUpperCase();
        if (!code) return;

        doCheckIn(code);
        setManualCode("");
    };

    // ============================================
    // LỊCH SỬ
    // ============================================
    const loadHistory = async () => {
        try {
            const res = await adminapi.get("/api/tickets/checkin-history");
            setHistory(res.data.data || []);
        } catch (err) {
            console.error("Lỗi tải lịch sử:", err);
        }
    };

    useEffect(() => {
        if (showHistory) loadHistory();
    }, [showHistory]);

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="checkin-page">
            {/* HEADER */}
            <div className="checkin-header">
                <h1 className="checkin-title">
                    <span className="checkin-icon">🎫</span>
                    SOÁT VÉ
                </h1>

                <div className="checkin-header-actions">
                    <span className="checkin-count">
                        ✅ {checkedCount} vé
                    </span>
                    <button
                        onClick={() => setShowHistory((v) => !v)}
                        className="checkin-btn checkin-btn-history"
                    >
                        {showHistory ? "📷 Quét vé" : "📋 Lịch sử"}
                    </button>
                </div>
            </div>

            {/* ============ CHẾ ĐỘ QUÉT ============ */}
            {!showHistory && (
                <>
                    {/* CAMERA */}
                    {scanning && !result && !urlTicketCode && (
                        <div className="checkin-scan">
                            <p className="checkin-hint">
                                📷 Đưa mã QR của khách vào khung hình
                            </p>

                            <div className="checkin-camera-wrapper">
                                <div id="qr-reader" className="checkin-camera" />

                                {/* Nút đèn flash */}
                                <button
                                    onClick={toggleTorch}
                                    className="checkin-torch-btn"
                                    title="Bật/tắt đèn"
                                >
                                    {torchOn ? "🔦" : "💡"}
                                </button>
                            </div>

                            {/* Nút phụ */}
                            <div className="checkin-camera-actions">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    style={{ display: "none" }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="checkin-btn checkin-btn-secondary"
                                >
                                    📁 Chọn từ thư viện
                                </button>
                            </div>

                            {/* LỖI CAMERA */}
                            {cameraError && (
                                <div className="checkin-camera-error">
                                    ⚠️ {cameraError}
                                </div>
                            )}

                            {/* NHẬP THỦ CÔNG */}
                            <div className="checkin-manual">
                                <p className="checkin-manual-label">
                                    Hoặc nhập mã vé thủ công:
                                </p>
                                <form
                                    onSubmit={handleManualSubmit}
                                    className="checkin-form"
                                >
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) =>
                                            setManualCode(e.target.value)
                                        }
                                        placeholder="VD: K7M2P9X4"
                                        className="checkin-input"
                                        maxLength={20}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        className="checkin-btn checkin-btn-primary"
                                    >
                                        ✅ Soát
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* LOADING */}
                    {urlTicketCode && !result && (
                        <div className="checkin-loading">
                            <div className="checkin-loading-icon">⏳</div>
                            <p className="checkin-loading-text">
                                Đang kiểm tra vé <b>{urlTicketCode}</b>...
                            </p>
                        </div>
                    )}

                    {/* KẾT QUẢ */}
                    {result && (
                        <div
                            className={`checkin-result ${
                                result.success
                                    ? "checkin-result-success"
                                    : "checkin-result-error"
                            }`}
                        >
                            <div className="checkin-result-icon">
                                {result.success ? "✅" : "❌"}
                            </div>

                            <h1 className="checkin-result-title">
                                {result.success ? "THÀNH CÔNG" : "THẤT BẠI"}
                            </h1>

                            <p className="checkin-result-message">
                                {result.message}
                            </p>

                            {result.ticket && (
                                <div className="checkin-ticket-info">
                                    <div className="checkin-ticket-row">
                                        <span className="checkin-ticket-label">
                                            🎬 Phim
                                        </span>
                                        <span className="checkin-ticket-value">
                                            {result.ticket.movie_title}
                                        </span>
                                    </div>
                                    <div className="checkin-ticket-row">
                                        <span className="checkin-ticket-label">
                                            🏢 Rạp
                                        </span>
                                        <span className="checkin-ticket-value">
                                            {result.ticket.cinema_name}
                                        </span>
                                    </div>
                                    <div className="checkin-ticket-row">
                                        <span className="checkin-ticket-label">
                                            🚪 Phòng
                                        </span>
                                        <span className="checkin-ticket-value">
                                            {result.ticket.room_name}
                                        </span>
                                    </div>
                                    <div className="checkin-ticket-row checkin-ticket-highlight">
                                        <span className="checkin-ticket-label">
                                            💺 Ghế
                                        </span>
                                        <span className="checkin-ticket-value checkin-seat">
                                            {result.ticket.seat_label}
                                        </span>
                                    </div>
                                    <div className="checkin-ticket-row">
                                        <span className="checkin-ticket-label">
                                            ⏰ Suất
                                        </span>
                                        <span className="checkin-ticket-value">
                                            {result.ticket.showtime}
                                        </span>
                                    </div>
                                    <div className="checkin-ticket-row">
                                        <span className="checkin-ticket-label">
                                            👤 Khách
                                        </span>
                                        <span className="checkin-ticket-value">
                                            {result.ticket.customer_name}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleScanAgain}
                                className="checkin-btn checkin-btn-primary checkin-btn-large"
                            >
                                🔄 Quét vé tiếp theo
                            </button>

                            {result.success && (
                                <p className="checkin-auto-hint">
                                    Tự động quay lại sau 5 giây...
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ============ CHẾ ĐỘ LỊCH SỬ ============ */}
            {showHistory && (
                <div className="checkin-history">
                    <h2 className="checkin-history-title">
                        📋 100 vé soát gần nhất
                    </h2>

                    {history.length === 0 ? (
                        <p className="checkin-history-empty">
                            Chưa có vé nào được soát
                        </p>
                    ) : (
                        <div className="checkin-history-list">
                            {history.map((item) => (
                                <div
                                    key={item.ticket_id}
                                    className="checkin-history-item"
                                >
                                    <div className="checkin-history-left">
                                        <div className="checkin-history-code">
                                            {item.ticket_code}
                                        </div>
                                        <div className="checkin-history-movie">
                                            🎬 {item.movie_title}
                                        </div>
                                        <div className="checkin-history-seat">
                                            💺 {item.seat_row}
                                            {item.seat_number} —{" "}
                                            {item.customer_name}
                                        </div>
                                    </div>
                                    <div className="checkin-history-time">
                                        {new Date(
                                            item.checked_in_at
                                        ).toLocaleString("vi-VN")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Hidden element cho scanFile */}
            <div id="qr-reader-hidden" style={{ display: "none" }} />
        </div>
    );
}

export default CheckIn;