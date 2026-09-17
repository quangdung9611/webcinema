import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import adminapi from "../../api/adminapi";
import AdminModal from "../components/AdminModal";
import "../styles/CheckIn.css";

function CheckIn() {
    const navigate = useNavigate();
    const { ticketCode: urlTicketCode } = useParams();

    const [scanning, setScanning] = useState(!urlTicketCode);
    const [result, setResult] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [torchOn, setTorchOn] = useState(false);

    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const initialCheckDoneRef = useRef(false);
    const autoCloseTimerRef = useRef(null);

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
        if (!scanning || urlTicketCode || showModal) return;

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
    }, [scanning, urlTicketCode, showModal]);

    // ============================================
    // CLEANUP TIMERS
    // ============================================
    useEffect(() => {
        return () => {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
            }
        };
    }, []);

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
                checkedInAt: res.data.checked_in_at,
                window: res.data.window,
            });

            setShowModal(true);

            // ✅ Auto close thành công sau 5s
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
            }
            autoCloseTimerRef.current = setTimeout(() => {
                handleContinueScan();
            }, 5000);

            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            playSound("success");
        } catch (err) {
            const errorData = err.response?.data || {};
            setResult({
                success: false,
                code: errorData.code,
                message: errorData.message || "Lỗi soát vé",
                data: errorData.data,
            });

            setShowModal(true);
            // ✅ Lỗi thì KHÔNG auto close → user phải đọc

            playSound("error");
            if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
        }
    };

    // ============================================
    // CLOSE MODAL → TIẾP TỤC QUÉT
    // ============================================
    const handleContinueScan = () => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
        }

        setShowModal(false);
        setResult(null);
        setScanning(true);
        initialCheckDoneRef.current = false;
        isProcessingRef.current = false;

        // Nếu đến từ URL param → reset URL về /check-in
        if (urlTicketCode) {
            navigate("/check-in", { replace: true });
        }
    };

    // ============================================
    // ĐÓNG MODAL (KHÔNG QUÉT LẠI)
    // ============================================
    const handleCloseModal = () => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
        }

        setShowModal(false);
        setResult(null);
        setScanning(false); // Dừng scanner — user phải bấm nút "Quét lại"
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
    // FORMAT TIME
    // ============================================
    const formatTime = (isoString) => {
        if (!isoString) return "---";
        try {
            const date = new Date(isoString);
            const hh = String(date.getHours()).padStart(2, "0");
            const mm = String(date.getMinutes()).padStart(2, "0");
            const ss = String(date.getSeconds()).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            const mo = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            return `${hh}:${mm}:${ss} - ${dd}/${mo}/${yyyy}`;
        } catch (e) {
            return isoString;
        }
    };

    // ============================================
    // MODAL TITLE
    // ============================================
    const getModalTitle = () => {
        if (result?.success) {
            return "✅ SOÁT VÉ THÀNH CÔNG";
        }

        const map = {
            TICKET_NOT_FOUND: "❌ VÉ KHÔNG TỒN TẠI",
            TICKET_ALREADY_USED: "⚠️ VÉ ĐÃ ĐƯỢC SOÁT",
            TICKET_CANCELLED: "❌ VÉ ĐÃ BỊ HỦY",
            TICKET_INVALID_STATUS: "❌ VÉ KHÔNG HỢP LỆ",
            SHOWTIME_NOT_FOUND: "❌ KHÔNG TÌM THẤY SUẤT CHIẾU",
            CHECKIN_TOO_EARLY: "⏰ CHƯA ĐẾN GIỜ SOÁT VÉ",
            CHECKIN_TOO_LATE: "⏰ ĐÃ QUÁ HẠN SOÁT VÉ",
            MISSING_TICKET_CODE: "❌ THIẾU MÃ VÉ",
            CHECKIN_FAILED: "❌ SOÁT VÉ THẤT BẠI",
        };

        return map[result?.code] || "❌ SOÁT VÉ THẤT BẠI";
    };

    // ============================================
    // MODAL TYPE
    // ============================================
    const getModalType = () => {
        if (result?.success) return "success";

        // Warning cho các case cảnh báo
        if (
            result?.code === "TICKET_ALREADY_USED" ||
            result?.code === "CHECKIN_TOO_EARLY" ||
            result?.code === "CHECKIN_TOO_LATE"
        ) {
            return "warning";
        }

        // Còn lại là error
        return "error";
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
                <span className="qr-header-title">Quét QR Soát Vé</span>
            </div>

            {/* CAMERA */}
            {scanning && !showModal && !urlTicketCode && (
                <div className="qr-scanner-wrap">
                    <div className="qr-frame">
                        <div id="qr-reader" className="qr-reader" />

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

            {/* Nút "Quét lại" nếu scanner bị dừng */}
            {!scanning && !showModal && !urlTicketCode && (
                <div className="qr-scanner-wrap">
                    <button
                        className="qr-restart-btn"
                        onClick={() => setScanning(true)}
                    >
                        📷 Bật camera quét lại
                    </button>
                </div>
            )}

            {/* LOADING */}
            {urlTicketCode && !showModal && (
                <div className="qr-loading">
                    <div className="qr-loading-spinner" />
                    <p>Đang kiểm tra vé...</p>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL KẾT QUẢ (DÙNG AdminModal) */}
            {/* ============================================ */}
            <AdminModal
                open={showModal}
                onClose={handleCloseModal}
                onConfirm={handleContinueScan}
                type={getModalType()}
                title={getModalTitle()}
                size="md"
            >
                <div className="checkin-modal-body">
                    {/* MESSAGE */}
                    <p className="checkin-modal-message">{result?.message}</p>

                    {/* INFO VÉ (nếu thành công) */}
                    {result?.ticket && result.success && (
                        <div className="checkin-ticket-info">
                            <div className="checkin-row">
                                <span>🎬 Phim</span>
                                <b>{result.ticket.movie_title}</b>
                            </div>
                            <div className="checkin-row">
                                <span>🏢 Rạp</span>
                                <b>{result.ticket.cinema_name}</b>
                            </div>
                            <div className="checkin-row">
                                <span>🚪 Phòng</span>
                                <b>{result.ticket.room_name}</b>
                            </div>
                            <div className="checkin-row checkin-seat">
                                <span>💺 Ghế</span>
                                <b>{result.ticket.seat_label}</b>
                            </div>
                            <div className="checkin-row">
                                <span>⏰ Suất</span>
                                <b>{result.ticket.showtime}</b>
                            </div>
                            <div className="checkin-row">
                                <span>👤 Khách</span>
                                <b>{result.ticket.customer_name}</b>
                            </div>
                            <div className="checkin-row">
                                <span>🎫 Mã vé</span>
                                <b className="checkin-code">
                                    {result.ticket.ticket_code}
                                </b>
                            </div>
                            <div className="checkin-row">
                                <span>✅ Soát lúc</span>
                                <b>{formatTime(result.checkedInAt)}</b>
                            </div>
                        </div>
                    )}

                    {/* WINDOW INFO (nếu lỗi quá sớm/muộn) */}
                    {result?.data &&
                        (result.code === "CHECKIN_TOO_EARLY" ||
                            result.code === "CHECKIN_TOO_LATE") && (
                            <div className="checkin-window-info">
                                <div className="checkin-row">
                                    <span>🕐 Giờ chiếu</span>
                                    <b>{formatTime(result.data.showtimeStart)}</b>
                                </div>
                                <div className="checkin-row">
                                    <span>🟢 Mở soát</span>
                                    <b>{formatTime(result.data.windowOpen)}</b>
                                </div>
                                <div className="checkin-row">
                                    <span>🔴 Đóng soát</span>
                                    <b>{formatTime(result.data.windowClose)}</b>
                                </div>
                            </div>
                        )}
                </div>
            </AdminModal>

            {/* Hidden element cho scanFile */}
            <div id="qr-reader-hidden" style={{ display: "none" }} />
        </div>
    );
}

export default CheckIn;