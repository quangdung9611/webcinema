import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";

const NetworkContext = createContext(null);

// ============================================================
// INITIAL STATE
// ============================================================

const getInitialOnlineState = () => {
    if (typeof navigator === "undefined") {
        return true;
    }

    return navigator.onLine;
};

// ============================================================
// PROVIDER
// ============================================================

export const NetworkProvider = ({ children }) => {
    // ========================================================
    // NETWORK STATE
    // ========================================================

    const [isOnline, setIsOnline] = useState(
        getInitialOnlineState
    );

    const [isOffline, setIsOffline] = useState(
        () => !getInitialOnlineState()
    );

    const [isChecking, setIsChecking] = useState(false);

    const [networkError, setNetworkError] = useState(
        null
    );

    // ========================================================
    // REFS
    // ========================================================

    const mountedRef = useRef(false);

    const reloadTriggeredRef = useRef(false);

    // ========================================================
    // SET ONLINE
    // ========================================================

    const setOnlineState = useCallback(() => {
        if (!mountedRef.current) {
            return;
        }

        setIsOnline(true);
        setIsOffline(false);
        setNetworkError(null);
    }, []);

    // ========================================================
    // SET OFFLINE
    // ========================================================

    const setOfflineState = useCallback(
        (source = "unknown") => {
            if (!mountedRef.current) {
                return;
            }

            setIsOnline(false);
            setIsOffline(true);

            setNetworkError({
                mode: "offline",
                code: "ERR_INTERNET_DISCONNECTED",
                url: window.location.hostname,
                source,
            });
        },
        []
    );

    // ========================================================
    // HANDLE OFFLINE
    // ========================================================
    //
    // Không polling.
    //
    // Browser phát offline
    // → cập nhật state ngay.
    //
    // Không reload.
    //
    // ========================================================

    const handleOffline = useCallback(() => {
        console.warn(
            "🔴 [Network] Browser OFFLINE"
        );

        reloadTriggeredRef.current = false;

        setOfflineState("browser");
    }, [setOfflineState]);

    // ========================================================
    // HANDLE ONLINE
    // ========================================================
    //
    // Browser phát online
    // → khôi phục trạng thái
    // → reload toàn bộ app.
    //
    // Chỉ reload đúng một lần cho mỗi lần offline.
    //
    // ========================================================

    const handleOnline = useCallback(() => {
        console.log(
            "🟢 [Network] Browser ONLINE"
        );

        /*
         * Nếu chưa từng rơi vào trạng thái offline
         * thì không cần reload.
         */

        if (!isOfflineStateRef.current) {
            setOnlineState();
            return;
        }

        setOnlineState();

        if (reloadTriggeredRef.current) {
            return;
        }

        reloadTriggeredRef.current = true;

        console.log(
            "🔄 [Network] Internet restored → reload page"
        );

        /*
         * Cho React cập nhật state trước khi reload.
         * Sau đó browser khởi động lại app hoàn toàn.
         */

        setTimeout(() => {
            if (
                typeof window !==
                    "undefined"
            ) {
                window.location.reload();
            }
        }, 100);
    }, [setOnlineState]);

    // ========================================================
    // STATE REF
    // ========================================================

    const isOfflineStateRef = useRef(
        !getInitialOnlineState()
    );

    useEffect(() => {
        isOfflineStateRef.current =
            isOffline;
    }, [isOffline]);

    // ========================================================
    // BROWSER EVENTS
    // ========================================================

    useEffect(() => {
        window.addEventListener(
            "offline",
            handleOffline
        );

        window.addEventListener(
            "online",
            handleOnline
        );

        return () => {
            window.removeEventListener(
                "offline",
                handleOffline
            );

            window.removeEventListener(
                "online",
                handleOnline
            );
        };
    }, [
        handleOffline,
        handleOnline,
    ]);

    // ========================================================
    // INITIAL STATE
    // ========================================================

    useEffect(() => {
        mountedRef.current = true;

        const initialStatus =
            navigator.onLine;

        console.log(
            "🌐 [Network] Initial status:",
            initialStatus
        );

        if (initialStatus) {
            setIsOnline(true);
            setIsOffline(false);
            setNetworkError(null);

            isOfflineStateRef.current = false;
        } else {
            setIsOnline(false);
            setIsOffline(true);

            setNetworkError({
                mode: "offline",
                code:
                    "ERR_INTERNET_DISCONNECTED",
                url: window.location.hostname,
                source: "initial_check",
            });

            isOfflineStateRef.current = true;
        }

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // ========================================================
    // MANUAL CHECK
    // ========================================================
    //
    // Không tạo polling.
    //
    // Hàm này chỉ kiểm tra navigator.onLine
    // khi component khác chủ động gọi.
    //
    // ========================================================

    const checkInternetConnection =
        useCallback(() => {
            const online =
                typeof navigator !==
                    "undefined"
                    ? navigator.onLine
                    : true;

            if (online) {
                setOnlineState();
            } else {
                setOfflineState(
                    "manual_check"
                );
            }

            return online;
        }, [
            setOnlineState,
            setOfflineState,
        ]);

    // ========================================================
    // CLEAR NETWORK ERROR
    // ========================================================

    const clearNetworkError =
        useCallback(() => {
            setNetworkError(null);

            if (navigator.onLine) {
                setIsOnline(true);
                setIsOffline(false);

                isOfflineStateRef.current =
                    false;
            }
        }, []);

    // ========================================================
    // MANUAL RETRY
    // ========================================================

    const retryConnection =
        useCallback(() => {
            console.log(
                "🔄 [Network] Manual retry"
            );

            const online =
                navigator.onLine;

            if (online) {
                setOnlineState();

                reloadTriggeredRef.current =
                    false;

                /*
                 * Manual retry cũng reload để
                 * khởi động lại toàn bộ app sạch.
                 */

                setTimeout(() => {
                    window.location.reload();
                }, 100);

                return true;
            }

            setOfflineState(
                "manual_retry"
            );

            return false;
        }, [
            setOnlineState,
            setOfflineState,
        ]);

    // ========================================================
    // CONTEXT VALUE
    // ========================================================

    const value = {
        isOnline,
        isOffline,

        isChecking,

        networkError,

        checkInternetConnection,
        retryConnection,
        clearNetworkError,
    };

    return (
        <NetworkContext.Provider
            value={value}
        >
            {children}
        </NetworkContext.Provider>
    );
};

// ============================================================
// HOOK
// ============================================================

export const useNetwork = () => {
    const context =
        useContext(NetworkContext);

    if (!context) {
        throw new Error(
            "useNetwork must be used inside NetworkProvider"
        );
    }

    return context;
};

export default NetworkContext;