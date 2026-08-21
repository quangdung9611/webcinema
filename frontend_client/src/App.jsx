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
    useLocation,
    Outlet
} from "react-router-dom";

import axios from "axios";
import api from "./api/api";

// ==========================================================
// CONTEXT
// ==========================================================

import {
    RouteLoadingProvider,
    useRouteLoading
} from "./context/RouteLoadingContext";

// ==========================================================
// SOCKET SERVICE
// ==========================================================

import socketService from "./api/socket";

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

// ==========================================================
// USER PAGES - LAZY
// ==========================================================

const UserHome = lazy(() => import("./user_frontend/pages/UserHome"));
const UserLogin = lazy(() => import("./user_frontend/pages/UserLogin"));
const UserRegister = lazy(() => import("./user_frontend/pages/UserRegister"));
const MovieDetail = lazy(() => import("./user_frontend/pages/MovieDetail"));
const Actor = lazy(() => import("./user_frontend/pages/Actor"));

const Booking = lazy(() => import("./user_frontend/pages/Booking"));
const Food = lazy(() => import("./user_frontend/pages/Food"));
const Payment = lazy(() => import("./user_frontend/pages/Payment"));
const ConfirmSuccess = lazy(() => import("./user_frontend/pages/ConfirmSuccess"));
const BankApp = lazy(() => import("./user_frontend/pages/BankApp"));
const MomoApp = lazy(() => import("./user_frontend/pages/MomoApp"));
const MovieStatusPage = lazy(() => import("./user_frontend/pages/MovieStatusPage"));
const Cinema = lazy(() => import("./user_frontend/pages/Cinema"));
const CinemaDetail = lazy(() => import("./user_frontend/pages/CinemaDetail"));
const CinemaGenre = lazy(() => import("./user_frontend/pages/CinemaGenre"));
const News = lazy(() => import("./user_frontend/pages/News"));

const Profile = lazy(() => import("./user_frontend/pages/Profile"));

// ==========================================================
// PROMOTION & CINEMA CORNER
// ==========================================================

const Promotion = lazy(() => import("./user_frontend/pages/Promotion"));
const BlogCinema = lazy(() => import("./user_frontend/pages/BlogCinema"));

// ==========================================================
// CINEMA CARD DETAIL
// ==========================================================

const CinemaCardDetail = lazy(() => import("./user_frontend/components/CinemaCardDetail"));

// ==========================================================
// SUPPORT PAGES - LAZY
// ==========================================================

const FAQ = lazy(() => import("./user_frontend/pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./user_frontend/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./user_frontend/pages/TermsOfService"));
const BookingGuide = lazy(() => import("./user_frontend/pages/BookingGuide"));
const ContactSupport = lazy(() => import("./user_frontend/pages/ContactSupport"));
const MemberShip = lazy(() => import("./user_frontend/pages/MemberShip"));

// ==========================================================
// ADMIN PAGES - LAZY
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
// ERROR BOUNDARY
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
        console.error("Lazy load error:", error, errorInfo);
    }
    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", width: "100%", padding: "20px", boxSizing: "border-box", textAlign: "center", background: "#1e1e2f", color: "#f1f1f1" }}>
                    <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
                    <h2 style={{ marginBottom: "10px" }}>Không thể tải trang</h2>
                    <p style={{ color: "#d1d5db", maxWidth: "500px", marginBottom: "20px", lineHeight: "1.6" }}>Có lỗi xảy ra khi tải trang. Vui lòng thử lại hoặc quay lại trang chủ.</p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                        <button onClick={this.handleRetry} style={{ padding: "10px 24px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Tải lại trang</button>
                        <button onClick={() => { window.location.href = "/"; }} style={{ padding: "10px 24px", background: "#3a3a4f", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Quay lại trang chủ</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ==========================================================
// SUSPENSE LOADING
// ==========================================================

const SuspenseLoading = () => {
    return (
        <LoadingSpinner size={72} color="#dc2626" message="Đang tải Cinema Star..." blur={true} zIndex={9999} />
    );
};

// ==========================================================
// NOT FOUND PAGE
// ==========================================================

const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div className="not-found-container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px", boxSizing: "border-box" }}>
            <h1 className="not-found-title" style={{ fontSize: "100px", margin: 0 }}>404</h1>
            <h2 style={{ marginTop: "10px" }}>Opps! Trang bạn tìm kiếm không tồn tại</h2>
            <button className="not-found-button" style={{ padding: "10px 20px", cursor: "pointer", marginTop: "20px" }} onClick={() => navigate("/")}>QUAY LẠI TRANG CHỦ</button>
        </div>
    );
};

/* ==========================================================
    ROUTE GUARDS
========================================================== */
const AdminRouteGuard = ({ children }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await api.get('/admin/api/auth/me');
                const raw = res.data;
                const account = raw?.user || raw?.data?.user || raw;
                if (account && account.role === 'admin') {
                    setIsAuth(true);
                } else {
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                navigate('/login', { replace: true });
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

const UserRouteGuard = ({ children }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const res = await api.get('/api/auth/me');
                const raw = res.data;
                const account = raw?.user || raw?.data?.user || raw;
                if (account) {
                    setIsAuth(true);
                } else {
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                navigate('/login', { replace: true });
            } finally {
                setIsLoading(false);
            }
        };
        checkUser();
    }, [navigate]);

    if (isLoading) {
        return <LoadingSpinner size={72} color="#dc2626" message="Đang tải quyền truy cập..." />;
    }
    return isAuth ? children : null;
};

// ==========================================================
// SCROLL TO TOP COMPONENT
// ==========================================================

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, [pathname]);

    useEffect(() => {
        const handlePopState = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return null;
};

// ==========================================================
// SESSION EXPIRED MODAL COMPONENT
// ==========================================================

const SessionExpiredModal = () => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [deviceInfo, setDeviceInfo] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleSessionExpired = (event) => {
            const { message, newDevice, fromSocket, code } = event.detail || {};
            
            console.warn('🔴 [SESSION_EXPIRED]', event.detail);
            
            setMessage(message || 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.');
            setDeviceInfo(newDevice || null);
            setVisible(true);

            localStorage.removeItem('user_info');
            localStorage.removeItem('admin_info');
            localStorage.removeItem('access_token');

            socketService.disconnect();
        };

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('socketAuthError', handleSessionExpired);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('socketAuthError', handleSessionExpired);
        };
    }, []);

    const handleOk = () => {
        setVisible(false);
        navigate('/login', { replace: true, state: { expired: true } });
    };

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                padding: '32px 40px',
                borderRadius: '12px',
                maxWidth: '480px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'modalFadeIn 0.3s ease'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                <h2 style={{ color: '#dc2626', marginBottom: '12px', fontSize: '24px' }}>
                    Phiên đăng nhập đã hết hạn
                </h2>
                <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
                    {message}
                </p>
                
                {deviceInfo && (
                    <div style={{
                        background: '#f3f4f6',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        textAlign: 'left',
                        fontSize: '14px'
                    }}>
                        <p style={{ margin: '4px 0', color: '#6b7280' }}>
                            <strong>📱 IP:</strong> {deviceInfo.ip || 'Không xác định'}
                        </p>
                        <p style={{ margin: '4px 0', color: '#6b7280' }}>
                            <strong>🖥️ Thiết bị:</strong> {deviceInfo.userAgent || 'Không xác định'}
                        </p>
                    </div>
                )}

                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                    💡 Vui lòng đăng nhập lại để tiếp tục sử dụng dịch vụ.
                </p>

                <button
                    onClick={handleOk}
                    style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '12px 40px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                    onMouseLeave={(e) => e.target.style.background = '#dc2626'}
                >
                    Đăng nhập lại
                </button>
            </div>
        </div>
    );
};

// ==========================================================
// APP CONTENT
// ==========================================================

function AppContent() {
    const { loading: routeLoading } = useRouteLoading();
    const hostname = window.location.hostname;
    const isAdminDomain = hostname === "admin.quangdungcinema.id.vn";
    const navigate = useNavigate();

    // ==========================================================
    // KẾT NỐI SOCKET KHI APP LOAD
    // ==========================================================
    useEffect(() => {
        const connectSocket = () => {
            const userInfo = localStorage.getItem('user_info');
            if (userInfo) {
                try {
                    const user = JSON.parse(userInfo);
                    if (user?.user_id) {
                        console.log('🔄 [APP] Connecting socket for user:', user.user_id);
                        socketService.connect(user.user_id);
                    }
                } catch (e) {
                    console.error('Error parsing user info:', e);
                }
            }
        };

        connectSocket();

        return () => {
            socketService.disconnect();
        };
    }, []);

    // ==========================================================
    // XỬ LÝ UNAUTHORIZED
    // ==========================================================
    useEffect(() => {
        const handleUnauthorized = () => {
            if (!window.location.pathname.includes('/login')) {
                navigate('/login', { replace: true });
            }
        };
        window.addEventListener('unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, [navigate]);

    return (
        <>
            {routeLoading && (
                <LoadingSpinner size={72} color="#dc2626" message="Đang chuyển trang..." blur={true} zIndex={10000} />
            )}
            <div className="app-wrapper">
                <ScrollToTop />
                
                <SessionExpiredModal />

                <LazyErrorBoundary>
                    <Suspense fallback={<SuspenseLoading />}>
                        <Routes>
                            {/* ==================================================
                                ADMIN DOMAIN
                            ================================================== */}
                            {isAdminDomain ? (
                                <Route path="/">
                                    <Route path="login" element={<AdminLogin />} />
                                    <Route element={
                                        <AdminRouteGuard>
                                            <AdminLayout>
                                                <Outlet />
                                            </AdminLayout>
                                        </AdminRouteGuard>
                                    }>
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
                                /* ==================================================
                                   USER DOMAIN
                                ================================================== */
                                <Route path="/">
                                    <Route element={<UserLayout />}>
                                        <Route index element={<UserHome />} />
                                        
                                        {/* MOVIES */}
                                        <Route path="movies/status/:statusSlug" element={<MovieStatusPage />} />
                                        <Route path="movies/detail/:slug" element={<MovieDetail />} />
                                        
                                        {/* ACTORS */}
                                        <Route path="actors" element={<Actor />} />
                                     
                                        
                                        {/* CINEMA */}
                                        <Route path="cinema" element={<Cinema />} />
                                        <Route path="cinema/detail/:slug" element={<CinemaDetail />} />
                                        
                                        {/* FOOD */}
                                        <Route path="foods" element={<Food />} />
                                        
                                        {/* CINEMA GENRE */}
                                        <Route path="cinema-genre" element={<CinemaGenre />} />
                                        
                                        {/* NEWS */}
                                        <Route path="news" element={<News />} />
                                        <Route path="news/detail/:slug" element={<CinemaCardDetail type="news" />} />
                                        
                                        {/* PROMOTION */}
                                        <Route path="promotion" element={<Promotion />} />
                                        <Route path="promotion/detail/:slug" element={<CinemaCardDetail type="promotion" />} />
                                        
                                        {/* BLOG CINEMA */}
                                        <Route path="blog-cinema" element={<BlogCinema />} />
                                        <Route path="blog-cinema/detail/:slug" element={<CinemaCardDetail type="blog" />} />
                                        
                                        {/* SUPPORT PAGES */}
                                        <Route path="faq" element={<FAQ />} />
                                        <Route path="privacy-policy" element={<PrivacyPolicy />} />
                                        <Route path="terms" element={<TermsOfService />} />
                                        <Route path="booking-guide" element={<BookingGuide />} />
                                        <Route path="contact" element={<ContactSupport />} />
                                        <Route path="membership" element={<MemberShip />} />

                                        {/* AUTH */}
                                        <Route path="login" element={<UserLogin />} />
                                        <Route path="register" element={<UserRegister />} />

                                        {/* PROTECTED ROUTES */}
                                        <Route path="profile" element={
                                            <UserRouteGuard><Profile /></UserRouteGuard>
                                        } />
                                        <Route path="booking/:slug" element={
                                            <UserRouteGuard><Booking /></UserRouteGuard>
                                        } />
                                        <Route path="payment" element={
                                            <UserRouteGuard><Payment /></UserRouteGuard>
                                        } />
                                        <Route path="confirm-success" element={
                                            <UserRouteGuard><ConfirmSuccess /></UserRouteGuard>
                                        } />
                                        <Route path="bank-app" element={
                                            <UserRouteGuard><BankApp /></UserRouteGuard>
                                        } />
                                        <Route path="momo-app" element={
                                            <UserRouteGuard><MomoApp /></UserRouteGuard>
                                        } />
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
// APP WRAPPER
// ==========================================================

function AppWrapper() {
    return (
        <RouteLoadingProvider>
            <AppContent />
        </RouteLoadingProvider>
    );
}

// ==========================================================
// DATA ROUTER
// ==========================================================

const router = createBrowserRouter([
    { path: "*", element: <AppWrapper /> }
]);

// ==========================================================
// APP
// ==========================================================

function App() {
    return <RouterProvider router={router} />;
}

export default App;