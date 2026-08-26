import React, {
    Suspense,
    lazy,
    useEffect,
    useState
} from "react";

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    Outlet,
    useNavigate,
    useLocation
} from "react-router-dom";

import axios from "axios";
import api from "./api/api";

/* ==========================================================
   AUTH
========================================================== */

import {
    AuthProvider,
    useAuth
} from "./context/AuthContext";

/* ==========================================================
   SESSION GUARD
========================================================== */

import SessionGuard from "./user_frontend/components/SessionGuard";

/* ==========================================================
   ROUTE LOADING
========================================================== */

import {
    RouteLoadingProvider,
    useRouteLoading
} from "./context/RouteLoadingContext";

/* ==========================================================
   GLOBAL CONFIG
========================================================== */

axios.defaults.withCredentials = true;

/* ==========================================================
   GLOBAL COMPONENTS
========================================================== */

import LoadingSpinner from "./user_frontend/components/LoadingSpinner";

/* ==========================================================
   LAYOUTS
========================================================== */

import UserLayout from "./user_frontend/layouts/UserLayout";
import AdminLayout from "./admin_frontend/layouts/AdminLayout";

/* ==========================================================
   USER PAGES
========================================================== */

const UserHome = lazy(() =>
    import("./user_frontend/pages/UserHome")
);

const UserLogin = lazy(() =>
    import("./user_frontend/pages/UserLogin")
);

const UserRegister = lazy(() =>
    import("./user_frontend/pages/UserRegister")
);

const VerifyEmail = lazy(() =>
    import("./user_frontend/pages/VerifyEmail")
);

// 🔥 THÊM 3 TRANG CHO LUỒNG QUÊN MẬT KHẨU 5 BƯỚC
const ForgotPassword = lazy(() =>
    import("./user_frontend/pages/ForgotPassword")
);

const VerifyOTP = lazy(() =>
    import("./user_frontend/pages/VerifyOTP")
);

const ResetPassword = lazy(() =>
    import("./user_frontend/pages/ResetPassword")
);

const MovieDetail = lazy(() =>
    import("./user_frontend/pages/MovieDetail")
);

const Actor = lazy(() =>
    import("./user_frontend/pages/Actor")
);

const Booking = lazy(() =>
    import("./user_frontend/pages/Booking")
);

const Food = lazy(() =>
    import("./user_frontend/pages/Food")
);

const Payment = lazy(() =>
    import("./user_frontend/pages/Payment")
);

const ConfirmSuccess = lazy(() =>
    import("./user_frontend/pages/ConfirmSuccess")
);

const BankApp = lazy(() =>
    import("./user_frontend/pages/BankApp")
);

const MomoApp = lazy(() =>
    import("./user_frontend/pages/MomoApp")
);

const MovieStatusPage = lazy(() =>
    import("./user_frontend/pages/MovieStatusPage")
);

const Cinema = lazy(() =>
    import("./user_frontend/pages/Cinema")
);

const CinemaDetail = lazy(() =>
    import("./user_frontend/pages/CinemaDetail")
);

const News = lazy(() =>
    import("./user_frontend/pages/News")
);

const Profile = lazy(() =>
    import("./user_frontend/pages/Profile")
);

const Promotion = lazy(() =>
    import("./user_frontend/pages/Promotion")
);

const BlogCinema = lazy(() =>
    import("./user_frontend/pages/BlogCinema")
);

const CinemaCardDetail = lazy(() =>
    import("./user_frontend/components/CinemaCardDetail")
);

/* ==========================================================
   SUPPORT PAGES
========================================================== */

const FAQ = lazy(() =>
    import("./user_frontend/pages/FAQ")
);

const PrivacyPolicy = lazy(() =>
    import("./user_frontend/pages/PrivacyPolicy")
);

const TermsOfService = lazy(() =>
    import("./user_frontend/pages/TermsOfService")
);

const BookingGuide = lazy(() =>
    import("./user_frontend/pages/BookingGuide")
);

const ContactSupport = lazy(() =>
    import("./user_frontend/pages/ContactSupport")
);

const MemberShip = lazy(() =>
    import("./user_frontend/pages/MemberShip")
);

/* ==========================================================
   ADMIN PAGES
========================================================== */

const AdminLogin = lazy(() =>
    import("./admin_frontend/pages/Auth/AdminLogin")
);

const AdminDashboard = lazy(() =>
    import("./admin_frontend/pages/Admin/AdminDashboard")
);

const UserPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Users/UserPage")
);

const GenresPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Genres/GenresPage")
);

const CinemaPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Cinema/CinemaPage")
);

const RoomPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Room/RoomPage")
);

const MoviePage = lazy(() =>
    import("./admin_frontend/pages/Admin/Movie/MoviePage")
);

const SeatList = lazy(() =>
    import("./admin_frontend/pages/Admin/Seat/SeatList")
);

const TicketList = lazy(() =>
    import("./admin_frontend/pages/Admin/Ticket/TicketList")
);

const ActorPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Actor/ActorPage")
);

const CouponPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Coupon/CouponPage")
);

const BookingPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Booking/BookingPage")
);

const MovieGenrePage = lazy(() =>
    import("./admin_frontend/pages/Admin/MovieGenre/MovieGenrePage")
);

const MovieActorPage = lazy(() =>
    import("./admin_frontend/pages/Admin/MovieActor/MovieActorPage")
);

const ShowTimePage = lazy(() =>
    import("./admin_frontend/pages/Admin/Showtime/ShowTimePage")
);

const NewsPage = lazy(() =>
    import("./admin_frontend/pages/Admin/News/NewsPage")
);

const FoodPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Food/FoodPage")
);

const BlogCinemaPage = lazy(() =>
    import("./admin_frontend/pages/Admin/BlogCinema/BlogCinemaPage")
);

const PromotionPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Promotion/PromotionPage")
);

const BannerPage = lazy(() =>
    import("./admin_frontend/pages/Admin/Banner/BannerPage")
);

/* ==========================================================
   ERROR BOUNDARY
========================================================== */

class LazyErrorBoundary extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error, errorInfo) {
        console.error(
            "🔴 [APP] Lazy load error:",
            error,
            errorInfo
        );
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null
        });

        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100vh",
                        padding: "20px",
                        textAlign: "center",
                        background: "#1e1e2f",
                        color: "#f1f1f1"
                    }}
                >
                    <div
                        style={{
                            fontSize: "48px",
                            marginBottom: "20px"
                        }}
                    >
                        ⚠️
                    </div>

                    <h2>
                        Không thể tải trang
                    </h2>

                    <p
                        style={{
                            color: "#d1d5db",
                            maxWidth: "500px",
                            lineHeight: "1.6"
                        }}
                    >
                        Có lỗi xảy ra khi tải trang.
                        Vui lòng thử lại hoặc quay lại trang chủ.
                    </p>

                    <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            marginTop: "20px"
                        }}
                    >
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: "10px 24px",
                                cursor: "pointer"
                            }}
                        >
                            Tải lại trang
                        </button>

                        <button
                            onClick={() => {
                                window.location.href = "/";
                            }}
                            style={{
                                padding: "10px 24px",
                                cursor: "pointer"
                            }}
                        >
                            Trang chủ
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/* ==========================================================
   SUSPENSE LOADING
========================================================== */

const SuspenseLoading = () => {
    return (
        <LoadingSpinner
            size={72}
            color="#dc2626"
            message="Đang tải Cinema Star..."
            blur={true}
            zIndex={9999}
        />
    );
};

/* ==========================================================
   NOT FOUND
========================================================== */

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div
            className="not-found-container"
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px"
            }}
        >
            <h1
                className="not-found-title"
                style={{
                    fontSize: "100px",
                    margin: 0
                }}
            >
                404
            </h1>

            <h2>
                Opps! Trang bạn tìm kiếm không tồn tại
            </h2>

            <button
                className="not-found-button"
                onClick={() => navigate("/")}
                style={{
                    padding: "10px 20px",
                    cursor: "pointer",
                    marginTop: "20px"
                }}
            >
                QUAY LẠI TRANG CHỦ
            </button>
        </div>
    );
};

/* ==========================================================
   ADMIN ROUTE GUARD
========================================================== */

const AdminRouteGuard = ({ children }) => {
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const response = await api.get(
                    "/admin/api/auth/me"
                );

                const raw = response?.data;

                const account =
                    raw?.user ||
                    raw?.data?.user ||
                    raw;

                if (
                    account &&
                    account.role === "admin"
                ) {
                    setIsAuth(true);
                } else {
                    setIsAuth(false);

                    navigate(
                        "/login",
                        { replace: true }
                    );
                }
            } catch (error) {
                console.warn(
                    "🔴 [ADMIN GUARD] Unauthorized"
                );

                setIsAuth(false);

                navigate(
                    "/login",
                    { replace: true }
                );
            } finally {
                setIsLoading(false);
            }
        };

        checkAdmin();
    }, [navigate]);

    if (isLoading) {
        return (
            <LoadingSpinner
                size={72}
                color="#dc2626"
                message="Đang tải quyền truy cập..."
            />
        );
    }

    return isAuth ? children : null;
};

/* ==========================================================
   USER ROUTE GUARD
========================================================== */

const UserRouteGuard = ({ children }) => {
    const navigate = useNavigate();

    const {
        user,
        isLoading
    } = useAuth();

    useEffect(() => {
        if (!isLoading && !user) {
            navigate(
                "/login",
                {
                    replace: true
                }
            );
        }
    }, [
        user,
        isLoading,
        navigate
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

    return user ? children : null;
};

/* ==========================================================
   SCROLL TO TOP
========================================================== */

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        if (
            "scrollRestoration" in
            window.history
        ) {
            window.history.scrollRestoration =
                "manual";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }, [pathname]);

    return null;
};

/* ==========================================================
   ADMIN ROUTES
========================================================== */

const AdminRoutes = () => {
    return (
        <Routes>
            <Route
                path="/login"
                element={<AdminLogin />}
            />

            <Route
                element={
                    <AdminRouteGuard>
                        <AdminLayout>
                            <Outlet />
                        </AdminLayout>
                    </AdminRouteGuard>
                }
            >
                <Route
                    index
                    element={<AdminDashboard />}
                />

                <Route
                    path="dashboard"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

                <Route
                    path="users"
                    element={<UserPage />}
                />

                <Route
                    path="movies"
                    element={<MoviePage />}
                />

                <Route
                    path="rooms"
                    element={<RoomPage />}
                />

                <Route
                    path="news"
                    element={<NewsPage />}
                />

                <Route
                    path="blog-cinema"
                    element={<BlogCinemaPage />}
                />

                <Route
                    path="promotions"
                    element={<PromotionPage />}
                />

                <Route
                    path="coupons"
                    element={<CouponPage />}
                />

                <Route
                    path="genres"
                    element={<GenresPage />}
                />

                <Route
                    path="cinemas"
                    element={<CinemaPage />}
                />

                <Route
                    path="showtimes"
                    element={<ShowTimePage />}
                />

                <Route
                    path="seats"
                    element={<SeatList />}
                />

                <Route
                    path="movie-genres"
                    element={<MovieGenrePage />}
                />

                <Route
                    path="movie-actors"
                    element={<MovieActorPage />}
                />

                <Route
                    path="bookings"
                    element={<BookingPage />}
                />

                <Route
                    path="tickets"
                    element={<TicketList />}
                />

                <Route
                    path="actors"
                    element={<ActorPage />}
                />

                <Route
                    path="foods"
                    element={<FoodPage />}
                />

                <Route
                    path="banners"
                    element={<BannerPage />}
                />
            </Route>

            <Route
                path="*"
                element={<NotFoundPage />}
            />
        </Routes>
    );
};

/* ==========================================================
   USER ROUTES
========================================================== */

const UserRoutes = () => {
    return (
        <Routes>
            {/* 🔥 CÁC TRANG AUTH (KHÔNG CẦN ĐĂNG NHẬP) - HIỂN THỊ TOÀN MÀN HÌNH */}
            <Route
                path="/login"
                element={<UserLogin />}
            />
            <Route
                path="/register"
                element={<UserRegister />}
            />
            <Route
                path="/verify-email"
                element={<VerifyEmail />}
            />
            <Route
                path="/forgot-password"
                element={<ForgotPassword />}
            />
            <Route
                path="/verify-otp"
                element={<VerifyOTP />}
            />
            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />

            {/* 🔥 CÁC TRANG CÓ LAYOUT (HEADER + FOOTER) */}
            <Route
                path="/"
                element={<UserLayout />}
            >
                {/* HOME */}
                <Route
                    index
                    element={<UserHome />}
                />

                {/* MOVIES */}
                <Route
                    path="movies/status/:statusSlug"
                    element={<MovieStatusPage />}
                />

                <Route
                    path="movies/detail/:slug"
                    element={<MovieDetail />}
                />

                {/* ACTORS */}
                <Route
                    path="actors"
                    element={<Actor />}
                />

                {/* CINEMA */}
                <Route
                    path="cinema"
                    element={<Cinema />}
                />

                <Route
                    path="cinema/detail/:slug"
                    element={<CinemaDetail />}
                />

                {/* FOOD */}
                <Route
                    path="foods"
                    element={<Food />}
                />

                {/* NEWS */}
                <Route
                    path="news"
                    element={<News />}
                />

                <Route
                    path="news/detail/:slug"
                    element={
                        <CinemaCardDetail
                            type="news"
                        />
                    }
                />

                {/* PROMOTION */}
                <Route
                    path="promotion"
                    element={<Promotion />}
                />

                <Route
                    path="promotion/detail/:slug"
                    element={
                        <CinemaCardDetail
                            type="promotion"
                        />
                    }
                />

                {/* BLOG */}
                <Route
                    path="blog-cinema"
                    element={<BlogCinema />}
                />

                <Route
                    path="blog-cinema/detail/:slug"
                    element={
                        <CinemaCardDetail
                            type="blog"
                        />
                    }
                />

                {/* SUPPORT */}
                <Route
                    path="faq"
                    element={<FAQ />}
                />

                <Route
                    path="privacy-policy"
                    element={<PrivacyPolicy />}
                />

                <Route
                    path="terms"
                    element={<TermsOfService />}
                />

                <Route
                    path="booking-guide"
                    element={<BookingGuide />}
                />

                <Route
                    path="contact"
                    element={<ContactSupport />}
                />

                <Route
                    path="membership"
                    element={<MemberShip />}
                />

                {/* PROTECTED */}
                <Route
                    path="profile"
                    element={
                        <UserRouteGuard>
                            <Profile />
                        </UserRouteGuard>
                    }
                />

                <Route
                    path="booking/:slug"
                    element={
                        <UserRouteGuard>
                            <Booking />
                        </UserRouteGuard>
                    }
                />

                <Route
                    path="payment"
                    element={
                        <UserRouteGuard>
                            <Payment />
                        </UserRouteGuard>
                    }
                />

                <Route
                    path="confirm-success"
                    element={
                        <UserRouteGuard>
                            <ConfirmSuccess />
                        </UserRouteGuard>
                    }
                />

                <Route
                    path="bank-app"
                    element={
                        <UserRouteGuard>
                            <BankApp />
                        </UserRouteGuard>
                    }
                />

                <Route
                    path="momo-app"
                    element={
                        <UserRouteGuard>
                            <MomoApp />
                        </UserRouteGuard>
                    }
                />
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
};

/* ==========================================================
   APP CONTENT
========================================================== */

const AppContent = () => {
    const {
        loading: routeLoading
    } = useRouteLoading();

    const hostname =
        window.location.hostname;

    const isAdminDomain =
        hostname ===
        "admin.quangdungcinema.id.vn";

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

            {/* 🔥 BỎ SessionGuard RA KHỎI ĐÂY - ĐỂ CÁC TRANG AUTH TỰ DO */}
            <ScrollToTop />

            <LazyErrorBoundary>
                <Suspense
                    fallback={<SuspenseLoading />}
                >
                    {isAdminDomain ? (
                        <AdminRoutes />
                    ) : (
                        <UserRoutes />
                    )}
                </Suspense>
            </LazyErrorBoundary>
        </>
    );
};

/* ==========================================================
   APP
========================================================== */

function App() {
    return (
        <BrowserRouter>
            <RouteLoadingProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </RouteLoadingProvider>
        </BrowserRouter>
    );
}

export default App;