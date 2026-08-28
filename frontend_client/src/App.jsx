import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import api from "./api/api";

// ============================================================
// CONTEXT
// ============================================================
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RouteLoadingProvider, useRouteLoading } from "./context/RouteLoadingContext";

// ============================================================
// COMPONENTS
// ============================================================
import LoadingSpinner from "./user_frontend/components/LoadingSpinner";
import SessionGuard from "./user_frontend/components/SessionGuard";
import LazyErrorBoundary from "./user_frontend/components/LazyErrorBoundary";

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
// LAZY LOAD - USER PAGES
// ============================================================
const UserHome = lazy(() => import("./user_frontend/pages/UserHome"));
const UserLogin = lazy(() => import("./user_frontend/pages/UserLogin"));
const UserRegister = lazy(() => import("./user_frontend/pages/UserRegister"));
const UserRegisterPin = lazy(() => import("./user_frontend/pages/UserRegisterPin"));
const VerifyEmail = lazy(() => import("./user_frontend/pages/VerifyEmail"));

// Auth Pages
const ForgotPassword = lazy(() => import("./user_frontend/pages/ForgotPassword"));
const VerifyOTP = lazy(() => import("./user_frontend/pages/VerifyOTP"));
const ResetPassword = lazy(() => import("./user_frontend/pages/ResetPassword"));
const ForgotPin = lazy(() => import("./user_frontend/pages/ForgotPin"));

// Main Pages
const MovieDetail = lazy(() => import("./user_frontend/pages/MovieDetail"));
const MovieStatusPage = lazy(() => import("./user_frontend/pages/MovieStatusPage"));
const Actor = lazy(() => import("./user_frontend/pages/Actor"));
const Cinema = lazy(() => import("./user_frontend/pages/Cinema"));
const CinemaDetail = lazy(() => import("./user_frontend/pages/CinemaDetail"));
const Food = lazy(() => import("./user_frontend/pages/Food"));
const News = lazy(() => import("./user_frontend/pages/News"));
const Promotion = lazy(() => import("./user_frontend/pages/Promotion"));
const BlogCinema = lazy(() => import("./user_frontend/pages/BlogCinema"));
const CinemaCardDetail = lazy(() => import("./user_frontend/components/CinemaCardDetail"));

// Booking
const Booking = lazy(() => import("./user_frontend/pages/Booking"));
const Payment = lazy(() => import("./user_frontend/pages/Payment"));
const ConfirmSuccess = lazy(() => import("./user_frontend/pages/ConfirmSuccess"));
const BankApp = lazy(() => import("./user_frontend/pages/BankApp"));
const MomoApp = lazy(() => import("./user_frontend/pages/MomoApp"));

// Profile & Support
const Profile = lazy(() => import("./user_frontend/pages/Profile"));
const FAQ = lazy(() => import("./user_frontend/pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./user_frontend/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./user_frontend/pages/TermsOfService"));
const BookingGuide = lazy(() => import("./user_frontend/pages/BookingGuide"));
const ContactSupport = lazy(() => import("./user_frontend/pages/ContactSupport"));
const MemberShip = lazy(() => import("./user_frontend/pages/MemberShip"));

// ============================================================
// LAZY LOAD - ADMIN PAGES
// ============================================================
const AdminLogin = lazy(() => import("./admin_frontend/pages/Auth/AdminLogin"));
const AdminDashboard = lazy(() => import("./admin_frontend/pages/Admin/AdminDashboard"));
const UserPage = lazy(() => import("./admin_frontend/pages/Admin/Users/UserPage"));
const GenresPage = lazy(() => import("./admin_frontend/pages/Admin/Genres/GenresPage"));
const CinemaPage = lazy(() => import("./admin_frontend/pages/Admin/Cinema/CinemaPage"));
const RoomPage = lazy(() => import("./admin_frontend/pages/Admin/Room/RoomPage"));
const MoviePage = lazy(() => import("./admin_frontend/pages/Admin/Movie/MoviePage"));
const SeatList = lazy(() => import("./admin_frontend/pages/Admin/Seat/SeatList"));
const TicketList = lazy(() => import("./admin_frontend/pages/Admin/Ticket/TicketList"));
const ActorPage = lazy(() => import("./admin_frontend/pages/Admin/Actor/ActorPage"));
const CouponPage = lazy(() => import("./admin_frontend/pages/Admin/Coupon/CouponPage"));
const BookingPage = lazy(() => import("./admin_frontend/pages/Admin/Booking/BookingPage"));
const MovieGenrePage = lazy(() => import("./admin_frontend/pages/Admin/MovieGenre/MovieGenrePage"));
const MovieActorPage = lazy(() => import("./admin_frontend/pages/Admin/MovieActor/MovieActorPage"));
const ShowTimePage = lazy(() => import("./admin_frontend/pages/Admin/Showtime/ShowTimePage"));
const NewsPage = lazy(() => import("./admin_frontend/pages/Admin/News/NewsPage"));
const FoodPage = lazy(() => import("./admin_frontend/pages/Admin/Food/FoodPage"));
const BlogCinemaPage = lazy(() => import("./admin_frontend/pages/Admin/BlogCinema/BlogCinemaPage"));
const PromotionPage = lazy(() => import("./admin_frontend/pages/Admin/Promotion/PromotionPage"));
const BannerPage = lazy(() => import("./admin_frontend/pages/Admin/Banner/BannerPage"));

// ============================================================
// HELPER COMPONENTS
// ============================================================

// Loading fallback
const SuspenseLoading = () => (
    <LoadingSpinner size={72} color="#dc2626" message="Đang tải Cinema Star..." blur={true} zIndex={9999} />
);

// Scroll to top
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.history.scrollRestoration = "manual";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [pathname]);
    return null;
};

// 404 Not Found
const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div style={{ 
            minHeight: "100vh", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            textAlign: "center", 
            padding: "20px" 
        }}>
            <h1 style={{ fontSize: "100px", margin: 0 }}>404</h1>
            <h2>Opps! Trang bạn tìm kiếm không tồn tại</h2>
            <button 
                onClick={() => navigate("/")} 
                style={{ 
                    padding: "10px 20px", 
                    cursor: "pointer", 
                    marginTop: "20px",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px"
                }}
            >
                QUAY LẠI TRANG CHỦ
            </button>
        </div>
    );
};

// ============================================================
// ROUTE GUARDS
// ============================================================

// Admin Guard
const AdminRouteGuard = ({ children }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const response = await api.get("/admin/api/auth/me");
                const account = response?.data?.user || response?.data?.data?.user || response;
                if (account?.role === "admin") {
                    setIsAuth(true);
                } else {
                    navigate("/login", { replace: true });
                }
            } catch (error) {
                console.warn("🔴 [ADMIN GUARD] Unauthorized:", error);
                navigate("/login", { replace: true });
            } finally {
                setIsLoading(false);
            }
        };
        checkAdmin();
    }, [navigate]);

    if (isLoading) {
        return <LoadingSpinner size={72} color="#dc2626" message="Đang tải quyền truy cập..." />;
    }
    return isAuth ? children : null;
};

// User Guard
const UserRouteGuard = ({ children }) => {
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !user) {
            navigate("/login", { replace: true });
        }
    }, [user, isLoading, navigate]);

    if (isLoading) {
        return <LoadingSpinner size={72} color="#dc2626" message="Đang tải quyền truy cập..." />;
    }
    return user ? children : null;
};

// ============================================================
// ROUTES CONFIG
// ============================================================

// ✅ User Auth Routes (không cần đăng nhập, fullscreen)
const AUTH_ROUTES = [
    { path: "/login", element: <UserLogin /> },
    { path: "/register", element: <UserRegister /> },
    { path: "/register-pin", element: <UserRegisterPin /> },
    { path: "/verify-email", element: <VerifyEmail /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/verify-otp", element: <VerifyOTP /> },
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/forgot-pin", element: <ForgotPin /> },
];

// ✅ User Main Routes (có Layout - Cần SessionGuard)
const MAIN_ROUTES = [
    { path: "/", element: <UserHome /> },
    { path: "movies/status/:statusSlug", element: <MovieStatusPage /> },
    { path: "movies/detail/:slug", element: <MovieDetail /> },
    { path: "actors", element: <Actor /> },
    { path: "cinema", element: <Cinema /> },
    { path: "cinema/detail/:slug", element: <CinemaDetail /> },
    { path: "foods", element: <Food /> },
    { path: "news", element: <News /> },
    { path: "news/detail/:slug", element: <CinemaCardDetail type="news" /> },
    { path: "promotion", element: <Promotion /> },
    { path: "promotion/detail/:slug", element: <CinemaCardDetail type="promotion" /> },
    { path: "blog-cinema", element: <BlogCinema /> },
    { path: "blog-cinema/detail/:slug", element: <CinemaCardDetail type="blog" /> },
    // Support
    { path: "faq", element: <FAQ /> },
    { path: "privacy-policy", element: <PrivacyPolicy /> },
    { path: "terms", element: <TermsOfService /> },
    { path: "booking-guide", element: <BookingGuide /> },
    { path: "contact", element: <ContactSupport /> },
    { path: "membership", element: <MemberShip /> },
    // Protected - Cần đăng nhập
    { path: "profile", element: <UserRouteGuard><Profile /></UserRouteGuard> },
    { path: "booking/:slug", element: <UserRouteGuard><Booking /></UserRouteGuard> },
    { path: "payment", element: <UserRouteGuard><Payment /></UserRouteGuard> },
    { path: "confirm-success", element: <UserRouteGuard><ConfirmSuccess /></UserRouteGuard> },
    { path: "bank-app", element: <UserRouteGuard><BankApp /></UserRouteGuard> },
    { path: "momo-app", element: <UserRouteGuard><MomoApp /></UserRouteGuard> },
];

// ✅ Admin Routes
const ADMIN_ROUTES = [
    { path: "dashboard", element: <Navigate to="/" replace /> },
    { path: "users", element: <UserPage /> },
    { path: "movies", element: <MoviePage /> },
    { path: "rooms", element: <RoomPage /> },
    { path: "news", element: <NewsPage /> },
    { path: "blog-cinema", element: <BlogCinemaPage /> },
    { path: "promotions", element: <PromotionPage /> },
    { path: "coupons", element: <CouponPage /> },
    { path: "genres", element: <GenresPage /> },
    { path: "cinemas", element: <CinemaPage /> },
    { path: "showtimes", element: <ShowTimePage /> },
    { path: "seats", element: <SeatList /> },
    { path: "movie-genres", element: <MovieGenrePage /> },
    { path: "movie-actors", element: <MovieActorPage /> },
    { path: "bookings", element: <BookingPage /> },
    { path: "tickets", element: <TicketList /> },
    { path: "actors", element: <ActorPage /> },
    { path: "foods", element: <FoodPage /> },
    { path: "banners", element: <BannerPage /> },
];

// ============================================================
// ROUTE COMPONENTS
// ============================================================

const AdminRoutesComponent = () => (
    <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route element={<AdminRouteGuard><AdminLayout><Outlet /></AdminLayout></AdminRouteGuard>}>
            <Route index element={<AdminDashboard />} />
            {ADMIN_ROUTES.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
            ))}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

const UserRoutesComponent = () => (
    <Routes>
        {/* ✅ Auth Routes - Fullscreen (KHÔNG BỌC SESSION GUARD) */}
        {AUTH_ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
        ))}

        {/* ✅ Main Routes - With Layout (CÓ BỌC SESSION GUARD) */}
        <Route path="/" element={
            <SessionGuard>
                <UserLayout />
            </SessionGuard>
        }>
            {MAIN_ROUTES.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
            ))}
        </Route>

        {/* Redirect Admin to Home */}
        <Route path="/admin/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
);

// ============================================================
// APP CONTENT
// ============================================================

const AppContent = () => {
    const { loading: routeLoading } = useRouteLoading();
    const isAdminDomain = window.location.hostname === "admin.quangdungcinema.id.vn";

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
            
            {/* ✅ SessionGuard KHÔNG bọc toàn bộ App, chỉ bọc bên trong UserRoutes */}
            <LazyErrorBoundary>
                <Suspense fallback={<SuspenseLoading />}>
                    {isAdminDomain ? <AdminRoutesComponent /> : <UserRoutesComponent />}
                </Suspense>
            </LazyErrorBoundary>
        </>
    );
};

// ============================================================
// APP
// ============================================================

function App() {
    return (
        <RouteLoadingProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </RouteLoadingProvider>
    );
}

export default App;