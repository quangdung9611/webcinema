import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import adminapi from "../../api/adminapi";
import "../styles/CheckIn.css";

function CheckIn() {
    const navigate = useNavigate();
    const { ticketCode: urlTicketCode } = useParams();

    const [scanning, setScanning] = useState(!urlTicketCode);
    const [result, setResult] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [torchOn, setTorchOn] = useState(false);

    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const initialCheckDoneRef = useRef(false);

    // ============================================
    // AUTO CHECK-IN NẾU CÓ URL PARAM
    // ============================================
    useEffect(() => {
        if (!urlTicketCode || initialCheckDoneRef.current) return;
        initialCheckDoneRef.current = true;
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
                        qrbox: { width: 260, height: 260 },
                        aspectRatio: 1.0,
                    },
                    async (decodedText) => {
                        if (isProcessingRef.current) return;
                        isProcessingRef.current = true;

                        const code = extractCode(decodedText);
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
                    "Không mở được camera. Vui lòng cấp quyền camera cho trình duyệt."
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
    // AUTO VỀ CAMERA SAU 3S
    // ============================================
    useEffect(() => {
        if (result?.success) {
            const timer = setTimeout(() => {
                setResult(null);
                setScanning(true);
                initialCheckDoneRef.current = false;
                if (urlTicketCode) navigate("/check-in", { replace: true });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [result]);

    // ============================================
    // EXTRACT CODE TỪ QR
    // ============================================
    const extractCode = (text) => {
        if (text.includes("/check-in/")) {
            const parts = text.split("/check-in/");
            return parts[parts.length - 1].split("?")[0].trim();
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

            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            playSound("success");
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
    // RENDER
    // ============================================
    return (
        <div className="qr-scan-page">
            {/* HEADER NHỎ */}
            <div className="qr-header">
                <button
                    className="qr-back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Quay lại"
                >
                    ←
                </button>
                <span className="qr-header-title">Quét QR</span>
            </div>

            {/* CAMERA */}
            {scanning && !result && !urlTicketCode && (
                <div className="qr-scanner-wrap">
                    <div className="qr-frame">
                        <div id="qr-reader" className="qr-reader" />

                        {/* Nút đèn flash */}
                        <button
                            className="qr-torch-btn"
                            onClick={toggleTorch}
                            title="Bật/tắt đèn"
                        >
                            {torchOn ? "🔦" : "💡"}
                        </button>
                    </div>

                    <p className="qr-hint">Đưa mã QR vào khung để quét</p>

                    {cameraError && (
                        <div className="qr-error">⚠️ {cameraError}</div>
                    )}
                </div>
            )}

            {/* LOADING */}
            {urlTicketCode && !result && (
                <div className="qr-loading">
                    <div className="qr-loading-spinner" />
                    <p>Đang kiểm tra vé...</p>
                </div>
            )}

            {/* KẾT QUẢ */}
            {result && (
                <div
                    className={`qr-result ${
                        result.success ? "qr-result-ok" : "qr-result-fail"
                    }`}
                >
                    <div className="qr-result-icon">
                        {result.success ? "✓" : "✕"}
                    </div>

                    <h2 className="qr-result-title">
                        {result.success ? "THÀNH CÔNG" : "THẤT BẠI"}
                    </h2>

                    <p className="qr-result-msg">{result.message}</p>

                    {result.ticket && result.success && (
                        <div className="qr-ticket">
                            <div className="qr-ticket-row">
                                <span>Phim</span>
                                <b>{result.ticket.movie_title}</b>
                            </div>
                            <div className="qr-ticket-row">
                                <span>Rạp</span>
                                <b>{result.ticket.cinema_name}</b>
                            </div>
                            <div className="qr-ticket-row">
                                <span>Phòng</span>
                                <b>{result.ticket.room_name}</b>
                            </div>
                            <div className="qr-ticket-row qr-ticket-seat">
                                <span>Ghế</span>
                                <b>{result.ticket.seat_label}</b>
                            </div>
                            <div className="qr-ticket-row">
                                <span>Suất</span>
                                <b>{result.ticket.showtime}</b>
                            </div>
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