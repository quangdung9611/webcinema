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
// LENIS SMOOTH SCROLL
// ============================================================

import useLenis from "./hooks/useLenis";

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

// ✅ THÊM MỚI — AIChatBox
import AIChatBox from "./user_frontend/components/AiChatBox";

// ============================================================
// PAGE TRANSITION
// ============================================================

import PageTransition from "./user_frontend/components/PageTransition";

// ============================================================
// 404 NOT FOUND
// ============================================================

import NotFoundPage from "./user_frontend/pages/NotFound";

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
// ADMIN DOMAIN HELPER
// ============================================================

const ADMIN_HOSTNAME = "admin.quangdungcinema.id.vn";

const checkIsAdminDomain = () =>
    typeof window !== "undefined" &&
    window.location.hostname === ADMIN_HOSTNAME;

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
                                1000 * retries
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

const ActorDetail = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/ActorDetail"
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

const BookingSelect = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/BookingSelect"
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

const RescheduleSelect = lazy(() =>
    lazyRetry(() =>
        import(
            "./user_frontend/pages/RescheduleSelect"
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

const AdminForgotPassword = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Auth/AdminForgotPassword"
        )
    )
);

const AdminVerifyOtpPassword = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Auth/AdminVerifyOtpPassword"
        )
    )
);

const AdminResetPassword = lazy(() =>
    lazyRetry(() =>
        import(
            "./admin_frontend/pages/Auth/AdminResetPassword"
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
    const { pathname } = useLocation();

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "scrollRestoration" in window.history
        ) {
            window.history.scrollRestoration = "manual";
        }
    }, []);

    useEffect(() => {
        if (window.__lenis) {
            window.__lenis.scrollTo(0, {
                immediate: true,
            });
            return;
        }

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "auto",
        });
    }, [pathname]);

    return null;
};

// ============================================================
// USER ROUTE GUARD
// ============================================================

const UserRouteGuard = ({
    children,
}) => {
    const navigate = useNavigate();

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
        path: "actor/detail/:slug",
        element: <ActorDetail />,
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
        path: "reschedule/:bookingId/select",
        element: (
            <UserRouteGuard>
                <RescheduleSelect />
            </UserRouteGuard>
        ),
    },

    {
        path: "booking",
        element: <BookingSelect />,
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

const AdminRoutesComponent = () => (
    <Routes>

        <Route
            path="/login"
            element={<AdminLogin />}
        />

        <Route
            path="/forgot-password"
            element={<AdminForgotPassword />}
        />

        <Route
            path="/verify-otp-password"
            element={<AdminVerifyOtpPassword />}
        />

        <Route
            path="/reset-password"
            element={<AdminResetPassword />}
        />

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

const UserRoutesComponent = ({ location }) => (
    <Routes location={location}>

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
            path="/confirm-success"
            element={
                <ConfirmSuccess />
            }
        />

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
            element={
                <NotFoundPage />
            }
        />

    </Routes>
);

// ============================================================
// APP CONTENT
// ============================================================

const AppContent = () => {

    const isAdminDomain = checkIsAdminDomain();

    useLenis({ enabled: !isAdminDomain });

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

    // ==========================================================
    // NETWORK EVENT
    // ==========================================================

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

    // ==========================================================
    // CLEAR NETWORK ERROR
    // ==========================================================

    useEffect(() => {

        if (isOnline) {
            setAxiosNetworkError(null);
        }

    }, [isOnline]);

    // ==========================================================
    // RETRY NETWORK
    // ==========================================================

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

    // ==========================================================
    // EFFECTIVE NETWORK ERROR
    // ==========================================================

    const effectiveNetworkError =
        contextNetworkError ||
        axiosNetworkError;

    // ==========================================================
    // OFFLINE
    // ==========================================================

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

    // ==========================================================
    // NETWORK ERROR
    // ==========================================================

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

    // ==========================================================
    // MAIN
    // ==========================================================

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

                {/* ==================================================
                    ✅ AIChatBox — NGOÀI Suspense + NGOÀI PageTransition
                    → Fixed thật sự ở góc phải dưới
                    → Không unmount khi chuyển route
                    → Chỉ hiện ở user domain (không hiện admin)
                ================================================== */}
                {!isAdminDomain && <AIChatBox />}

                <Suspense
                    fallback={
                        <SuspenseLoading />
                    }
                >

                    {isAdminDomain ? (
                        <AdminRoutesComponent />
                    ) : (
                        <PageTransition>
                            <UserRoutesComponent />
                        </PageTransition>
                    )}

                </Suspense>

            </LazyErrorBoundary>

        </>
    );
};

// ============================================================
// APP
// ============================================================

function App() {

    const isAdminDomain = checkIsAdminDomain();

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