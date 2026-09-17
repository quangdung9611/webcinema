import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
    // Header
    ChevronLeft,
    ScanLine,

    // Torch
    Zap,
    ZapOff,
    Sun,
    Lightbulb,

    // Camera / Restart
    Camera,
    RefreshCw,

    // Modal info rows
    Film,
    Building2,
    DoorOpen,
    Armchair,
    Clock,
    User,
    Ticket,
    CheckCircle2,

    // Window info
    PlayCircle,
    StopCircle,

    // Status / Alert
    XCircle,
    AlertTriangle,
    Info,

    // Loading
    Loader2,
} from "lucide-react";

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

    // ✅ TORCH STATE
    const [torchState, setTorchState] = useState({
        supported: false,
        on: false,
        mode: null,
        checked: false,
    });

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
    // CHECK TORCH SUPPORT
    // ============================================
    const checkTorchSupport = useCallback(async () => {
        try {
            const videoElement = document.querySelector("#qr-reader video");
            if (!videoElement?.srcObject) {
                console.log("⏳ [TORCH] Video chưa ready");
                return;
            }

            const stream = videoElement.srcObject;
            const track = stream.getVideoTracks?.()?.[0];

            if (!track) {
                console.log("⚠️ [TORCH] Không có video track");
                setTorchState((prev) => ({
                    ...prev,
                    supported: false,
                    mode: "brightness",
                    checked: true,
                }));
                return;
            }

            const caps = track.getCapabilities?.() || {};
            const hasTorch = !!caps.torch;

            console.log("🔦 [TORCH] Capabilities:", { hasTorch, allCaps: caps });

            setTorchState((prev) => ({
                ...prev,
                supported: hasTorch,
                mode: hasTorch ? "torch" : "brightness",
                checked: true,
            }));
        } catch (err) {
            console.warn("⚠️ [TORCH] Check error:", err.message);
            setTorchState((prev) => ({
                ...prev,
                supported: false,
                mode: "brightness",
                checked: true,
            }));
        }
    }, []);

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
                setTimeout(checkTorchSupport, 1000);
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
    }, [scanning, urlTicketCode, showModal, checkTorchSupport]);

    // ============================================
    // CLEANUP TIMERS + RESET BRIGHTNESS
    // ============================================
    useEffect(() => {
        return () => {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
            }
            document.documentElement.style.filter = "";

            try {
                if (window._wakeLock) {
                    window._wakeLock.release();
                    window._wakeLock = null;
                }
            } catch (e) {}
        };
    }, []);

    // ============================================
    // EXTRACT CODE
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

        if (urlTicketCode) {
            navigate("/check-in", { replace: true });
        }
    };

    // ============================================
    // ĐÓNG MODAL
    // ============================================
    const handleCloseModal = () => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
        }

        setShowModal(false);
        setResult(null);
        setScanning(false);
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
    // TOGGLE ĐÈN FLASH — 3 TẦNG FALLBACK
    // ============================================
    const toggleTorch = async () => {
        console.log("🔦 [TORCH] Toggle clicked, state:", torchState);

        // TẦNG 1: TORCH API
        if (torchState.supported) {
            try {
                const videoElement = document.querySelector("#qr-reader video");

                if (!videoElement?.srcObject) {
                    console.warn("⚠️ [TORCH] Không có stream");
                    alert("Camera chưa sẵn sàng. Vui lòng đợi 2 giây.");
                    return;
                }

                const track = videoElement.srcObject.getVideoTracks()[0];

                if (!track) {
                    console.warn("⚠️ [TORCH] Không có track");
                    return;
                }

                const newTorchState = !torchState.on;

                await track.applyConstraints({
                    advanced: [{ torch: newTorchState }],
                });

                setTorchState((prev) => ({
                    ...prev,
                    on: newTorchState,
                    mode: "torch",
                }));

                console.log(`✅ [TORCH] Torch ${newTorchState ? "ON" : "OFF"}`);

                if (navigator.vibrate) navigator.vibrate(50);
                return;
            } catch (err) {
                console.error("❌ [TORCH] Apply failed:", err.message);
            }
        }

        // TẦNG 2: FALLBACK BRIGHTNESS
        try {
            const newBrightnessState = !torchState.on;

            if (newBrightnessState) {
                document.documentElement.style.filter = "brightness(1.8)";
                document.documentElement.style.transition = "filter 0.3s";

                try {
                    if ("wakeLock" in navigator) {
                        const wakeLock = await navigator.wakeLock.request("screen");
                        window._wakeLock = wakeLock;
                        console.log("✅ Wake Lock activated");
                    }
                } catch (wlErr) {
                    console.warn("Wake Lock not supported:", wlErr.message);
                }

                setTorchState((prev) => ({
                    ...prev,
                    on: true,
                    mode: "brightness",
                }));

                console.log("💡 [FALLBACK] Brightness mode ON");
            } else {
                document.documentElement.style.filter = "";

                try {
                    if (window._wakeLock) {
                        await window._wakeLock.release();
                        window._wakeLock = null;
                    }
                } catch (wlErr) {}

                setTorchState((prev) => ({
                    ...prev,
                    on: false,
                    mode: "brightness",
                }));

                console.log("💡 [FALLBACK] Brightness mode OFF");
            }

            if (navigator.vibrate) navigator.vibrate(50);

            if (!window._brightnessNotified) {
                window._brightnessNotified = true;
                alert(
                    "Chế độ tăng sáng màn hình đã bật\n\n" +
                    "Thiết bị/trình duyệt không hỗ trợ bật đèn flash trực tiếp.\n\n" +
                    "Giải pháp:\n" +
                    "• Đưa màn hình điện thoại lại gần QR\n" +
                    "• Hoặc dùng đèn pin bên ngoài\n" +
                    "• Hoặc di chuyển đến nơi sáng hơn"
                );
            }
        } catch (err) {
            console.error("❌ [FALLBACK] Brightness mode failed:", err.message);
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
    // MODAL TITLE + TYPE
    // ============================================
    const getModalTitle = () => {
        if (result?.success) return "SOÁT VÉ THÀNH CÔNG";

        const map = {
            TICKET_NOT_FOUND: "VÉ KHÔNG TỒN TẠI",
            TICKET_ALREADY_USED: "VÉ ĐÃ ĐƯỢC SOÁT",
            TICKET_CANCELLED: "VÉ ĐÃ BỊ HỦY",
            TICKET_INVALID_STATUS: "VÉ KHÔNG HỢP LỆ",
            SHOWTIME_NOT_FOUND: "KHÔNG TÌM THẤY SUẤT CHIẾU",
            CHECKIN_TOO_EARLY: "CHƯA ĐẾN GIỜ SOÁT VÉ",
            CHECKIN_TOO_LATE: "ĐÃ QUÁ HẠN SOÁT VÉ",
            MISSING_TICKET_CODE: "THIẾU MÃ VÉ",
            CHECKIN_FAILED: "SOÁT VÉ THẤT BẠI",
        };

        return map[result?.code] || "SOÁT VÉ THẤT BẠI";
    };

    const getModalType = () => {
        if (result?.success) return "success";
        if (
            result?.code === "TICKET_ALREADY_USED" ||
            result?.code === "CHECKIN_TOO_EARLY" ||
            result?.code === "CHECKIN_TOO_LATE"
        ) {
            return "warning";
        }
        return "error";
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="qr-scan-page">
            {/* HEADER */}
            <div className="qr-header">
                <button
                    className="qr-back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Quay lại"
                >
                    <ChevronLeft size={22} strokeWidth={2.2} />
                </button>
                <span className="qr-header-title">
                    <ScanLine size={18} strokeWidth={2.2} /> Quét QR Soát Vé
                </span>
            </div>

            {/* SCANNER */}
            {scanning && !showModal && !urlTicketCode && (
                <div className="qr-scanner-wrap">
                    <div className="qr-frame">
                        <div id="qr-reader" className="qr-reader" />

                        {/* NÚT ĐÈN */}
                        {torchState.checked && (
                            <button
                                className={`qr-torch-btn ${
                                    torchState.on ? "active" : ""
                                }`}
                                onClick={toggleTorch}
                                title={
                                    torchState.mode === "torch"
                                        ? torchState.on
                                            ? "Tắt đèn flash"
                                            : "Bật đèn flash"
                                        : torchState.on
                                        ? "Tắt tăng sáng"
                                        : "Bật tăng sáng màn hình"
                                }
                            >
                                {torchState.on ? (
                                    <Zap
                                        size={24}
                                        strokeWidth={2.2}
                                        fill="currentColor"
                                    />
                                ) : (
                                    <ZapOff size={24} strokeWidth={2} />
                                )}
                            </button>
                        )}

                        {/* BADGE FALLBACK */}
                        {torchState.checked &&
                            !torchState.supported &&
                            torchState.on && (
                                <div className="qr-torch-badge">
                                    <Zap
                                        size={12}
                                        strokeWidth={2.5}
                                        fill="currentColor"
                                    />
                                    <span>Tăng sáng màn hình</span>
                                </div>
                            )}
                    </div>

                    <p className="qr-hint">
                        <ScanLine size={16} strokeWidth={2} />
                        <span>Đưa mã QR vào khung để quét</span>
                    </p>

                    {/* HINT NẾU DEVICE KHÔNG HỖ TRỢ FLASH */}
                    {torchState.checked && !torchState.supported && (
                        <p className="qr-torch-hint">
                            <Lightbulb size={14} strokeWidth={2} />
                            <span>
                                Thiết bị không hỗ trợ flash — dùng chế độ
                                tăng sáng màn hình
                            </span>
                        </p>
                    )}

                    {cameraError && (
                        <div className="qr-error">
                            <AlertTriangle size={16} strokeWidth={2.2} />
                            <span>{cameraError}</span>
                        </div>
                    )}
                </div>
            )}

            {/* RESTART BUTTON */}
            {!scanning && !showModal && !urlTicketCode && (
                <div className="qr-scanner-wrap">
                    <button
                        className="qr-restart-btn"
                        onClick={() => setScanning(true)}
                    >
                        <Camera size={20} strokeWidth={2.2} />
                        <span>Bật camera quét lại</span>
                    </button>
                </div>
            )}

            {/* LOADING */}
            {urlTicketCode && !showModal && (
                <div className="qr-loading">
                    <div className="qr-loading-spinner">
                        <Loader2 size={48} strokeWidth={2} className="spin" />
                    </div>
                    <p>Đang kiểm tra vé...</p>
                </div>
            )}

            {/* MODAL */}
            <AdminModal
                open={showModal}
                onClose={handleCloseModal}
                onConfirm={handleContinueScan}
                type={getModalType()}
                title={getModalTitle()}
                size="md"
            >
                <div className="checkin-modal-body">
                    <p className="checkin-modal-message">{result?.message}</p>

                    {result?.ticket && result.success && (
                        <div className="checkin-ticket-info">
                            <div className="checkin-row">
                                <span>
                                    <Film size={14} strokeWidth={2.2} />
                                    <span>Phim</span>
                                </span>
                                <b>{result.ticket.movie_title}</b>
                            </div>
                            <div className="checkin-row">
                                <span>
                                    <Building2 size={14} strokeWidth={2.2} />
                                    <span>Rạp</span>
                                </span>
                                <b>{result.ticket.cinema_name}</b>
                            </div>
                            <div className="checkin-row">
                                <span>
                                    <DoorOpen size={14} strokeWidth={2.2} />
                                    <span>Phòng</span>
                                </span>
                                <b>{result.ticket.room_name}</b>
                            </div>
                            <div className="checkin-row checkin-seat">
                                <span>
                                    <Armchair size={14} strokeWidth={2.2} />
                                    <span>Ghế</span>
                                </span>
                                <b>{result.ticket.seat_label}</b>
                            </div>
                            <div className="checkin-row">
                                <span>
                                    <Clock size={14} strokeWidth={2.2} />
                                    <span>Suất</span>
                                </span>
                                <b>{result.ticket.showtime}</b>
                            </div>
                            <div className="checkin-row">
                                <span>
                                    <User size={14} strokeWidth={2.2} />
                                    <span>Khách</span>
                                </span>
                                <b>{result.ticket.customer_name}</b>
                            </div>
                            <div className="checkin-row">
                                <span>
                                    <Ticket size={14} strokeWidth={2.2} />
                                    <span>Mã vé</span>
                                </span>
                                <b className="checkin-code">
                                    {result.ticket.ticket_code}
                                </b>
                            </div>
                            <div className="checkin-row">
                                <span>
                                    <CheckCircle2 size={14} strokeWidth={2.2} />
                                    <span>Soát lúc</span>
                                </span>
                                <b>{formatTime(result.checkedInAt)}</b>
                            </div>
                        </div>
                    )}

                    {result?.data &&
                        (result.code === "CHECKIN_TOO_EARLY" ||
                            result.code === "CHECKIN_TOO_LATE") && (
                            <div className="checkin-window-info">
                                <div className="checkin-row">
                                    <span>
                                        <Clock size={14} strokeWidth={2.2} />
                                        <span>Giờ chiếu</span>
                                    </span>
                                    <b>{formatTime(result.data.showtimeStart)}</b>
                                </div>
                                <div className="checkin-row">
                                    <span>
                                        <PlayCircle size={14} strokeWidth={2.2} />
                                        <span>Mở soát</span>
                                    </span>
                                    <b>{formatTime(result.data.windowOpen)}</b>
                                </div>
                                <div className="checkin-row">
                                    <span>
                                        <StopCircle size={14} strokeWidth={2.2} />
                                        <span>Đóng soát</span>
                                    </span>
                                    <b>{formatTime(result.data.windowClose)}</b>
                                </div>
                            </div>
                        )}
                </div>
            </AdminModal>

            <div id="qr-reader-hidden" style={{ display: "none" }} />
        </div>
    );
}

export default CheckIn;