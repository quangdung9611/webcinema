// src/App.jsx

import React, {
    Suspense,
    lazy,
    useEffect,
    useState,
} from "react";

import {
    Routes,
    Route,
    Navigate,
    Outlet,
    useNavigate,
    useLocation,
} from "react-router-dom";

import axios from "axios";
import api from "./api/api";
import adminapi from "./api/adminapi";

// ============================================================
// CONTEXT
// ============================================================

import {
    AuthProvider,
    useAuth,
} from "./context/AuthContext";

import {
    AdminAuthProvider,
} from "./context/AdminAuthContext";

import {
    RouteLoadingProvider,
    useRouteLoading,
} from "./context/RouteLoadingContext";

import {
    NetworkProvider,
    useNetwork,
} from "./context/NetworkContext";

// ============================================================
// COMPONENTS
// ============================================================

import LoadingSpinner from "./user_frontend/components/LoadingSpinner";
import SessionGuard from "./user_frontend/components/SessionGuard";
import AdminSessionGuard from "./admin_frontend/components/AdminSessionGuard";
import LazyErrorBoundary from "./user_frontend/components/LazyErrorBoundary";
import NetworkErrorPage from "./user_frontend/components/NetworkErrorPage";

// ============================================================
// LAYOUTS
// ============================================================

import UserLayout from "./user_frontend/layouts/UserLayout";
import AdminLayout from "./admin_frontend/layouts/AdminLayout";

// ============================================================
// AXIOS CONFIG
// ============================================================

axios.defaults.withCredentials = true;

// ============================================================
// LAZY LOAD RETRY HELPER
// ============================================================

const lazyRetry = (
    componentImport,
    maxRetries = 2
) => {
    return new Promise(
        (resolve, reject) => {
            let retries = 0;

            const tryLoad = () => {
                componentImport()
                    .then((component) => {
                        sessionStorage.removeItem(
                            "lazyRetried"
                        );

                        sessionStorage.removeItem(
                            "lazyLoadFailed"
                        );

                        resolve(component);
                    })
                    .catch((error) => {
                        retries++;

                        console.warn(
                            `🔄 Lazy load failed (attempt ${retries}/${maxRetries}), retrying...`,
                            error
                        );

                        if (
                            retries <
                            maxRetries
                        ) {
                            setTimeout(
                                tryLoad,
                                1000 *
                                    retries
                            );
                        } else {
                            sessionStorage.removeItem(
                                "lazyRetried"
                            );

                            sessionStorage.removeItem(
                                "lazyLoadFailed"
                            );

                            reject(error);
                        }
                    });
            };

            tryLoad();
        }
    );
};

// ============================================================
// LAZY LOAD - USER PAGES
// ============================================================

const UserHome = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/UserHome"
        )
    )
);

const UserLogin = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/UserLogin"
        )
    )
);

const UserRegister = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/UserRegister"
        )
    )
);

const UserRegisterPin = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/UserRegisterPin"
        )
    )
);

const VerifyEmail = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/VerifyEmail"
        )
    )
);

const ForgotPassword = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ForgotPassword"
        )
    )
);

const VerifyOtpPassword = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/VerifyOtpPassword"
        )
    )
);

const ResetPassword = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ResetPassword"
        )
    )
);

const ForgotPin = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ForgotPin"
        )
    )
);

const VerifyOtpPin = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/VerifyOtpPin"
        )
    )
);

const ResetPin = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ResetPin"
        )
    )
);

const MovieDetail = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/MovieDetail"
        )
    )
);

const MovieStatusPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/MovieStatusPage"
        )
    )
);

const Actor = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Actor"
        )
    )
);

const Cinema = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Cinema"
        )
    )
);

const CinemaDetail = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/CinemaDetail"
        )
    )
);

const Food = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Food"
        )
    )
);

const News = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/News"
        )
    )
);

const Promotion = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Promotion"
        )
    )
);

const BlogCinema = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/BlogCinema"
        )
    )
);

const CinemaCardDetail = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/components/CinemaCardDetail"
        )
    )
);

const Booking = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Booking"
        )
    )
);

const Payment = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Payment"
        )
    )
);

const ConfirmSuccess = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ConfirmSuccess"
        )
    )
);

const BankApp = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/BankApp"
        )
    )
);

const MomoApp = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/MomoApp"
        )
    )
);

const Profile = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/Profile"
        )
    )
);

const FAQ = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/FAQ"
        )
    )
);

const PrivacyPolicy = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/PrivacyPolicy"
        )
    )
);

const TermsOfService = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/TermsOfService"
        )
    )
);

const BookingGuide = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/BookingGuide"
        )
    )
);

const ContactSupport = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ContactSupport"
        )
    )
);

const MemberShip = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/MemberShip"
        )
    )
);

// ============================================================
// LAZY LOAD - ADMIN PAGES
// ============================================================

const AdminLogin = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Auth/AdminLogin"
        )
    )
);

const AdminDashboard = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/AdminDashboard"
        )
    )
);

const UserPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Users/UserPage"
        )
    )
);

const GenresPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Genres/GenresPage"
        )
    )
);

const CinemaPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Cinema/CinemaPage"
        )
    )
);

const RoomPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Room/RoomPage"
        )
    )
);

const MoviePage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Movie/MoviePage"
        )
    )
);

const SeatList = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Seat/SeatList"
        )
    )
);

const TicketList = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Ticket/TicketList"
        )
    )
);

const ActorPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Actor/ActorPage"
        )
    )
);

const CouponPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Coupon/CouponPage"
        )
    )
);

const BookingPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Booking/BookingPage"
        )
    )
);

const MovieGenrePage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/MovieGenre/MovieGenrePage"
        )
    )
);

const MovieActorPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/MovieActor/MovieActorPage"
        )
    )
);

const ShowTimePage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Showtime/ShowTimePage"
        )
    )
);

const MovieShowtimeConfigPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Showtime/MovieShowtimeConfigPage"
        )
    )
);

const NewsPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/News/NewsPage"
        )
    )
);

const FoodPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Food/FoodPage"
        )
    )
);

const BlogCinemaPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/BlogCinema/BlogCinemaPage"
        )
    )
);

const PromotionPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Promotion/PromotionPage"
        )
    )
);

const BannerPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/Banner/BannerPage"
        )
    )
);

const PriceConfigPage = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Admin/PriceConfig/PriceConfigPage"
        )
    )
);

// ============================================================
// ✅ LAZY LOAD - CHECK-IN PAGE
// ============================================================

const CheckIn = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/CheckIn"
        )
    )
);

// ============================================================
// HELPER COMPONENTS
// ============================================================

const SuspenseLoading = () => (
    <LoadingSpinner
        size={72}
        color="#dc2626"
        message="Đang tải Cinema Star..."
        blur={true}
        zIndex={9999}
    />
);

// ============================================================
// SCROLL TO TOP
// ============================================================

const ScrollToTop = () => {
    const { pathname } =
        useLocation();

    useEffect(() => {
        window.history.scrollRestoration =
            "manual";

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, [pathname]);

    return null;
};

// ============================================================
// NOT FOUND
// ============================================================

const NotFoundPage = () => {
    const navigate =
        useNavigate();

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
                background: "#0a0a14",
                color: "#f1f1f1",
            }}
        >
            <h1
                style={{
                    fontSize: "100px",
                    margin: 0,
                    color: "#f37021",
                }}
            >
                404
            </h1>

            <h2
                style={{
                    color: "#fff",
                    marginBottom: "8px",
                }}
            >
                Oops! Trang bạn tìm kiếm
                không tồn tại
            </h2>

            <p
                style={{
                    color: "#94a3b8",
                    marginBottom: "20px",
                }}
            >
                Trang này có thể đã bị xóa
                hoặc di chuyển.
            </p>

            <button
                onClick={() =>
                    navigate("/")
                }
                style={{
                    padding:
                        "10px 24px",
                    cursor: "pointer",
                    background:
                        "linear-gradient(135deg, #f37021, #f5a623)",
                    color: "#0a0a14",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "14px",
                }}
            >
                🏠 QUAY LẠI TRANG CHỦ
            </button>
        </div>
    );
};

// ============================================================
// ROUTE GUARD
// ============================================================

const UserRouteGuard = ({
    children,
}) => {
    const navigate =
        useNavigate();

    const {
        user,
        isLoading,
    } = useAuth();

    useEffect(() => {
        if (
            !isLoading &&
            !user
        ) {
            navigate(
                "/login",
                {
                    replace: true,
                }
            );
        }
    }, [
        user,
        isLoading,
        navigate,
    ]);

    if (isLoading) {
        return (
            <LoadingSpinner
                size={72}
                color="#dc2626"
                message="Đang tải quyền truy cập..."
            />
        );
    }

    return user
        ? children
        : null;
};

// ============================================================
// AUTH ROUTES
// ============================================================

const AUTH_ROUTES = [
    {
        path: "/login",
        element: <UserLogin />,
    },
    {
        path: "/register",
        element: <UserRegister />,
    },
    {
        path: "/register-pin",
        element: <UserRegisterPin />,
    },
    {
        path: "/verify-email",
        element: <VerifyEmail />,
    },
    {
        path: "/forgot-password",
        element: <ForgotPassword />,
    },
    {
        path: "/verify-otp-password",
        element: <VerifyOtpPassword />,
    },
    {
        path: "/reset-password",
        element: <ResetPassword />,
    },
    {
        path: "/forgot-pin",
        element: <ForgotPin />,
    },
    {
        path: "/verify-otp-pin",
        element: <VerifyOtpPin />,
    },
    {
        path: "/reset-pin",
        element: <ResetPin />,
    },
];

// ============================================================
// MAIN ROUTES
// ============================================================

const MAIN_ROUTES = [
    {
        path: "/",
        element: <UserHome />,
    },
    {
        path: "movies/status/:statusSlug",
        element: <MovieStatusPage />,
    },
    {
        path: "movies/detail/:slug",
        element: <MovieDetail />,
    },
    {
        path: "actors",
        element: <Actor />,
    },
    {
        path: "cinema",
        element: <Cinema />,
    },
    {
        path: "cinema/detail/:slug",
        element: <CinemaDetail />,
    },
    {
        path: "foods",
        element: <Food />,
    },
    {
        path: "news",
        element: <News />,
    },
    {
        path: "news/detail/:slug",
        element: (
            <CinemaCardDetail
                type="news"
            />
        ),
    },
    {
        path: "promotion",
        element: <Promotion />,
    },
    {
        path: "promotion/detail/:slug",
        element: (
            <CinemaCardDetail
                type="promotion"
            />
        ),
    },
    {
        path: "blog-cinema",
        element: <BlogCinema />,
    },
    {
        path: "blog-cinema/detail/:slug",
        element: (
            <CinemaCardDetail
                type="blog"
            />
        ),
    },
    {
        path: "faq",
        element: <FAQ />,
    },
    {
        path: "privacy-policy",
        element: <PrivacyPolicy />,
    },
    {
        path: "terms",
        element: <TermsOfService />,
    },
    {
        path: "booking-guide",
        element: <BookingGuide />,
    },
    {
        path: "contact",
        element: <ContactSupport />,
    },
    {
        path: "membership",
        element: <MemberShip />,
    },
    {
        path: "profile",
        element: (
            <UserRouteGuard>
                <Profile />
            </UserRouteGuard>
        ),
    },
    {
        path: "booking/:slug",
        element: (
            <UserRouteGuard>
                <Booking />
            </UserRouteGuard>
        ),
    },
    {
        path: "payment",
        element: (
            <UserRouteGuard>
                <Payment />
            </UserRouteGuard>
        ),
    },
    {
        path: "confirm-success",
        element: (
            <UserRouteGuard>
                <ConfirmSuccess />
            </UserRouteGuard>
        ),
    },
    {
        path: "bank-app",
        element: (
            <UserRouteGuard>
                <BankApp />
            </UserRouteGuard>
        ),
    },
    {
        path: "momo-app",
        element: (
            <UserRouteGuard>
                <MomoApp />
            </UserRouteGuard>
        ),
    },
];

// ============================================================
// ADMIN ROUTES
// ============================================================

const ADMIN_ROUTES = [
    {
        path: "dashboard",
        element: (
            <Navigate
                to="/"
                replace
            />
        ),
    },
    {
        path: "users",
        element: <UserPage />,
    },
    {
        path: "movies",
        element: <MoviePage />,
    },
    {
        path: "rooms",
        element: <RoomPage />,
    },
    {
        path: "news",
        element: <NewsPage />,
    },
    {
        path: "blog-cinema",
        element: <BlogCinemaPage />,
    },
    {
        path: "promotions",
        element: <PromotionPage />,
    },
    {
        path: "coupons",
        element: <CouponPage />,
    },
    {
        path: "genres",
        element: <GenresPage />,
    },
    {
        path: "cinemas",
        element: <CinemaPage />,
    },
    {
        path: "showtimes",
        element: <ShowTimePage />,
    },
    {
        path: "showtime-config",
        element: (
            <MovieShowtimeConfigPage />
        ),
    },
    {
        path: "price-config",
        element: <PriceConfigPage />,
    },
    {
        path: "seats",
        element: <SeatList />,
    },
    {
        path: "movie-genres",
        element: <MovieGenrePage />,
    },
    {
        path: "movie-actors",
        element: <MovieActorPage />,
    },
    {
        path: "bookings",
        element: <BookingPage />,
    },
    {
        path: "tickets",
        element: <TicketList />,
    },
    {
        path: "actors",
        element: <ActorPage />,
    },
    {
        path: "foods",
        element: <FoodPage />,
    },
    {
        path: "banners",
        element: <BannerPage />,
    },
];

// ============================================================
// ADMIN ROUTES COMPONENT
// ============================================================
//
// ⚠️ LƯU Ý:
// Route /check-in và /check-in/:ticketCode phải đặt
// TRƯỚC route có <AdminLayout> để KHÔNG bị bọc sidebar.
//
// ============================================================

const AdminRoutesComponent = () => (
    <Routes>
        {/* ============================================ */}
        {/* LOGIN - Không có layout */}
        {/* ============================================ */}
        <Route
            path="/login"
            element={<AdminLogin />}
        />

        {/* ============================================ */}
        {/* ✅ CHECK-IN - TOÀN MÀN HÌNH (không có sidebar) */}
        {/* ============================================ */}
        <Route
            path="/check-in"
            element={
                <AdminSessionGuard>
                    <CheckIn />
                </AdminSessionGuard>
            }
        />

        <Route
            path="/check-in/:ticketCode"
            element={
                <AdminSessionGuard>
                    <CheckIn />
                </AdminSessionGuard>
            }
        />

        {/* ============================================ */}
        {/* ADMIN LAYOUT - Có sidebar */}
        {/* ============================================ */}
        <Route
            element={
                <AdminSessionGuard>
                    <AdminLayout>
                        <Outlet />
                    </AdminLayout>
                </AdminSessionGuard>
            }
        >
            <Route
                index
                element={
                    <AdminDashboard />
                }
            />

            {ADMIN_ROUTES.map(
                ({
                    path,
                    element,
                }) => (
                    <Route
                        key={path}
                        path={path}
                        element={element}
                    />
                )
            )}
        </Route>

        {/* ============================================ */}
        {/* 404 */}
        {/* ============================================ */}
        <Route
            path="*"
            element={
                <NotFoundPage />
            }
        />
    </Routes>
);

// ============================================================
// USER PAGE CONTAINER
// ============================================================

const UserPageContainer = () => {
    const { pathname } = useLocation();

    return (
        <div
            key={pathname}
            className="user-page-route-container"
        >
            <Outlet />
        </div>
    );
};

// ============================================================
// USER ROUTES
// ============================================================

const UserRoutesComponent = () => (
    <Routes>
        {AUTH_ROUTES.map(
            ({
                path,
                element,
            }) => (
                <Route
                    key={path}
                    path={path}
                    element={element}
                />
            )
        )}

        <Route
            path="/"
            element={
                <SessionGuard>
                    <UserLayout />
                </SessionGuard>
            }
        >
            <Route
                element={
                    <UserPageContainer />
                }
            >
                {MAIN_ROUTES.map(
                    ({
                        path,
                        element,
                    }) => (
                        <Route
                            key={path}
                            path={path}
                            element={element}
                        />
                    )
                )}
            </Route>
        </Route>

        <Route
            path="/admin/*"
            element={
                <Navigate
                    to="/"
                    replace
                />
            }
        />

        <Route
            path="*"
            element={<NotFoundPage />}
        />
    </Routes>
);

// ============================================================
// APP CONTENT
// ============================================================

const AppContent = () => {
    const {
        loading: routeLoading,
    } = useRouteLoading();

    const {
        isOnline,
        isOffline,
        isChecking,
        networkError:
            contextNetworkError,
        retryConnection,
    } = useNetwork();

    const [
        axiosNetworkError,
        setAxiosNetworkError,
    ] = useState(null);

    const isAdminDomain =
        window.location.hostname ===
        "admin.quangdungcinema.id.vn";

    useEffect(() => {
        const handleNetworkError =
            (event) => {
                const detail =
                    event?.detail;

                if (!detail) {
                    return;
                }

                console.warn(
                    "🔴 [App] Network error received:",
                    detail
                );

                setAxiosNetworkError(
                    detail
                );
            };

        window.addEventListener(
            "networkError",
            handleNetworkError
        );

        return () => {
            window.removeEventListener(
                "networkError",
                handleNetworkError
            );
        };
    }, []);

    useEffect(() => {
        if (isOnline) {
            setAxiosNetworkError(null);
        }
    }, [isOnline]);

    const handleRetryConnection =
        async () => {
            console.log(
                "🔄 [App] Retry network connection"
            );

            const connected =
                await retryConnection();

            if (connected) {
                console.log(
                    "✅ [App] Network restored"
                );
            } else {
                console.warn(
                    "🔴 [App] Network still unavailable"
                );
            }

            return connected;
        };

    const effectiveNetworkError =
        contextNetworkError ||
        axiosNetworkError;

    if (
        isOffline ||
        !isOnline
    ) {
        const error =
            effectiveNetworkError ||
            {
                mode: "offline",
                code:
                    "ERR_INTERNET_DISCONNECTED",
                url:
                    window.location.hostname,
            };

        return (
            <NetworkErrorPage
                mode={
                    error.mode ||
                    "offline"
                }
                url={
                    error.url ||
                    window.location.hostname
                }
                message={
                    error.message ||
                    null
                }
                errorCode={
                    error.code ||
                    "ERR_INTERNET_DISCONNECTED"
                }
                isChecking={
                    isChecking
                }
                onRetry={
                    handleRetryConnection
                }
            />
        );
    }

    if (
        effectiveNetworkError &&
        isOnline &&
        !isOffline
    ) {
        return (
            <NetworkErrorPage
                mode={
                    effectiveNetworkError.mode ||
                    "network"
                }
                url={
                    effectiveNetworkError.url ||
                    window.location.hostname
                }
                message={
                    effectiveNetworkError.message ||
                    null
                }
                errorCode={
                    effectiveNetworkError.code ||
                    "ERR_NETWORK"
                }
                isChecking={
                    isChecking
                }
                onRetry={
                    handleRetryConnection
                }
            />
        );
    }

    return (
        <>
            {routeLoading && (
                <LoadingSpinner
                    size={72}
                    color="#dc2626"
                    message="Đang chuyển trang..."
                    blur={true}
                    zIndex={10000}
                />
            )}

            <ScrollToTop />

            <LazyErrorBoundary>
                <Suspense
                    fallback={
                        <SuspenseLoading />
                    }
                >
                    {isAdminDomain ? (
                        <AdminRoutesComponent />
                    ) : (
                        <UserRoutesComponent />
                    )}
                </Suspense>
            </LazyErrorBoundary>
        </>
    );
};

// ============================================================
// APP
// ============================================================
// ✅ FIX: CHỈ mount 1 Provider phù hợp với domain
//
// Kiến trúc:
// - RouteLoadingProvider:  Loading state toàn cục
// - NetworkProvider:        Network state toàn cục
// - Conditional Provider:
//   + Admin domain  → CHỈ AdminAuthProvider
//   + User domain   → CHỈ AuthProvider
//
// KHÔNG mount cả 2 → tránh conflict socket + auth state.
// ============================================================

function App() {
    const isAdminDomain =
        window.location.hostname === "admin.quangdungcinema.id.vn";

    return (
        <RouteLoadingProvider>
            <NetworkProvider>
                {isAdminDomain ? (
                    <AdminAuthProvider>
                        <AppContent />
                    </AdminAuthProvider>
                ) : (
                    <AuthProvider>
                        <AppContent />
                    </AuthProvider>
                )}
            </NetworkProvider>
        </RouteLoadingProvider>
    );
}

export default App;