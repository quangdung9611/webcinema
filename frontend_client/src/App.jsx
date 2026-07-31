import React, {
    Suspense,
    lazy,
    useState,
    useEffect
} from "react";

import {
    createBrowserRouter,
    RouterProvider,
    Routes,
    Route,
    Navigate,
    useNavigate,
    Outlet
} from "react-router-dom";

import axios from "axios";

// ==========================================================
// CONTEXT
// ==========================================================

import { useAuth } from "./context/AuthContext";
import {
    RouteLoadingProvider,
    useRouteLoading
} from "./context/RouteLoadingContext";

// ==========================================================
// GLOBAL CONFIG
// ==========================================================

axios.defaults.withCredentials = true;

// ==========================================================
// GLOBAL COMPONENTS
// ==========================================================

import LoadingSpinner from "./user_frontend/components/LoadingSpinner";

// ==========================================================
// LAYOUT
// ==========================================================

import UserLayout from "./user_frontend/layouts/UserLayout";
import AdminLayout from "./admin_frontend/layouts/AdminLayout";
import ProtectedRoute from "./admin_frontend/components/ProtectedRoute";

// ==========================================================
// USER PAGES (LAZY)
// ==========================================================

const UserHome = lazy(() => import("./user_frontend/pages/UserHome"));
const UserLogin = lazy(() => import("./user_frontend/pages/UserLogin"));
const UserRegister = lazy(() => import("./user_frontend/pages/UserRegister"));
const MovieDetail = lazy(() => import("./user_frontend/pages/MovieDetail"));
const Actor = lazy(() => import("./user_frontend/pages/Actor"));
const ActorDetail = lazy(() => import("./user_frontend/pages/ActorDetail"));
const Booking = lazy(() => import("./user_frontend/pages/Booking"));
const Food = lazy(() => import("./user_frontend/pages/Food"));
const Payment = lazy(() => import("./user_frontend/pages/Payment"));
const ConfirmSuccess = lazy(() => import("./user_frontend/pages/ConfirmSuccess"));
const BankApp = lazy(() => import("./user_frontend/pages/BankApp"));
const MomoApp = lazy(() => import("./user_frontend/pages/MomoApp"));
const MovieStatusPage = lazy(() => import("./user_frontend/pages/MovieStatusPage"));
const CinemaDetail = lazy(() => import("./user_frontend/pages/CinemaDetail"));
const CinemaGenre = lazy(() => import("./user_frontend/pages/CinemaGenre"));
const FilmReview = lazy(() => import("./user_frontend/pages/FilmReview"));
const FilmReviewDetail = lazy(() => import("./user_frontend/pages/FilmReviewDetail"));
const Profile = lazy(() => import("./user_frontend/pages/Profile"));

// ==========================================================
// PROMOTION & CINEMA CORNER PAGES
// ==========================================================

const Promotion = lazy(() => import("./user_frontend/pages/Promotion"));
const BlogCinema = lazy(() => import("./user_frontend/pages/BlogCinema"));

// ==========================================================
// SUPPORT PAGES (LAZY)
// ==========================================================

const FAQ = lazy(() => import("./user_frontend/pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./user_frontend/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./user_frontend/pages/TermsOfService"));
const BookingGuide = lazy(() => import("./user_frontend/pages/BookingGuide"));
const ContactSupport = lazy(() => import("./user_frontend/pages/ContactSupport"));
const MemberShip = lazy(() => import("./user_frontend/pages/MemberShip"));

// ==========================================================
// ADMIN PAGES (LAZY)
// ==========================================================

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

// ==========================================================
// ERROR BOUNDARY – Bắt lỗi lazy load
// ==========================================================

class LazyErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Lazy load error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    padding: '20px',
                    textAlign: 'center',
                    background: '#1e1e2f',
                    color: '#f1f1f1'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                    <h2 style={{ marginBottom: '10px' }}>Không thể tải trang</h2>
                    <p style={{ color: '#d1d5db', maxWidth: '500px', marginBottom: '20px' }}>
                        Có lỗi xảy ra khi tải trang. Vui lòng thử lại hoặc quay lại trang chủ.
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: '10px 24px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Tải lại trang
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            style={{
                                padding: '10px 24px',
                                background: '#3a3a4f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Quay lại trang chủ
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ==========================================================
// ADMIN LAYOUT WRAPPER
// ==========================================================

const AdminLayoutWrapper = () => (
    <ProtectedRoute>
        <AdminLayout />
    </ProtectedRoute>
);

// ==========================================================
// SUSPENSE LOADING
// ==========================================================

const SuspenseLoading = () => (
    <LoadingSpinner
        size={72}
        color="#dc2626"
        message="Đang tải trang..."
        blur={true}
        zIndex={9999}
    />
);

// ==========================================================
// NOT FOUND PAGE
// ==========================================================

const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div className="not-found-container" style={{ textAlign: "center", marginTop: "50px" }}>
            <h1 className="not-found-title" style={{ fontSize: "100px", margin: 0 }}>404</h1>
            <h2 className="not-found-subtitle">Opps! Trang bạn tìm kiếm không tồn tại</h2>
            <button
                className="not-found-button"
                style={{ padding: "10px 20px", cursor: "pointer", marginTop: "20px" }}
                onClick={() => navigate("/")}
            >
                QUAY LẠI TRANG CHỦ
            </button>
        </div>
    );
};

// ==========================================================
// APP CONTENT
// ==========================================================

function AppContent() {
    const { loading: authLoading } = useAuth();
    const { loading: routeLoading } = useRouteLoading();

    const hostname = window.location.hostname;
    const isAdminDomain = hostname === "admin.quangdungcinema.id.vn";

    if (authLoading) {
        return (
            <LoadingSpinner
                size={72}
                color="#dc2626"
                message="Đang tải Cinema Star..."
                blur={true}
                zIndex={9999}
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

            <div className="app-wrapper">
                <LazyErrorBoundary>
                    <Suspense fallback={<SuspenseLoading />}>
                        <Routes>
                            {isAdminDomain ? (
                                <Route path="/">
                                    <Route path="login" element={<AdminLogin />} />
                                    <Route element={<AdminLayoutWrapper />}>
                                        <Route index element={<AdminDashboard />} />
                                        <Route path="dashboard" element={<Navigate to="/" replace />} />
                                        <Route path="users" element={<UserPage />} />
                                        <Route path="movies" element={<MoviePage />} />
                                        <Route path="rooms" element={<RoomPage />} />
                                        <Route path="news" element={<NewsPage />} />
                                        <Route path="blog-cinema" element={<BlogCinemaPage />} />
                                        <Route path="promotions" element={<PromotionPage />} />
                                        <Route path="coupons" element={<CouponPage />} />
                                        <Route path="genres" element={<GenresPage />} />
                                        <Route path="cinemas" element={<CinemaPage />} />
                                        <Route path="showtimes" element={<ShowTimePage />} />
                                        <Route path="seats" element={<SeatList />} />
                                        <Route path="movie-genres" element={<MovieGenrePage />} />
                                        <Route path="movie-actors" element={<MovieActorPage />} />
                                        <Route path="bookings" element={<BookingPage />} />
                                        <Route path="tickets" element={<TicketList />} />
                                        <Route path="actors" element={<ActorPage />} />
                                        <Route path="foods" element={<FoodPage />} />
                                        <Route path="banners" element={<BannerPage />} />
                                    </Route>
                                    <Route path="*" element={<NotFoundPage />} />
                                </Route>
                            ) : (
                                <Route path="/">
                                    <Route element={<UserLayout />}>
                                        <Route index element={<UserHome />} />
                                        <Route path="movies/status/:statusSlug" element={<MovieStatusPage />} />
                                        <Route path="movies/detail/:slug" element={<MovieDetail />} />
                                        <Route path="actors" element={<Actor />} />
                                        <Route path="actor/:slug" element={<ActorDetail />} />
                                        <Route path="cinema/:slug" element={<CinemaDetail />} />
                                        <Route path="booking/:slug" element={<Booking />} />
                                        <Route path="foods" element={<Food />} />
                                        <Route path="cinema-genre" element={<CinemaGenre />} />
                                        <Route path="payment" element={<Payment />} />
                                        <Route path="film-review" element={<FilmReview />} />
                                        <Route path="film-review/:slug" element={<FilmReviewDetail />} />
                                        <Route path="bank-app" element={<BankApp />} />
                                        <Route path="momo-app" element={<MomoApp />} />
                                        <Route path="confirm-success" element={<ConfirmSuccess />} />
                                        <Route path="login" element={<UserLogin />} />
                                        <Route path="register" element={<UserRegister />} />
                                        <Route path="profile" element={<Profile />} />
                                        <Route path="promotion" element={<Promotion />} />
                                        <Route path="blog-cinema" element={<BlogCinema />} />
                                        <Route path="faq" element={<FAQ />} />
                                        <Route path="privacy-policy" element={<PrivacyPolicy />} />
                                        <Route path="terms" element={<TermsOfService />} />
                                        <Route path="booking-guide" element={<BookingGuide />} />
                                        <Route path="contact" element={<ContactSupport />} />
                                        <Route path="membership" element={<MemberShip />} />
                                    </Route>
                                    <Route path="admin/*" element={<Navigate to="/" replace />} />
                                    <Route path="*" element={<NotFoundPage />} />
                                </Route>
                            )}
                        </Routes>
                    </Suspense>
                </LazyErrorBoundary>
            </div>
        </>
    );
}

// ==========================================================
// WRAPPER COMPONENT
// ==========================================================

function AppWrapper() {
    return (
        <RouteLoadingProvider>
            <AppContent />
        </RouteLoadingProvider>
    );
}

// ==========================================================
// TẠO DATA ROUTER
// ==========================================================

const router = createBrowserRouter([
    {
        path: "*",
        element: <AppWrapper />,
    }
]);

// ==========================================================
// APP
// ==========================================================

function App() {
    return <RouterProvider router={router} />;
}

export default App;