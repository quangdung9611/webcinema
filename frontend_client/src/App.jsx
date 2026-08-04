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

// ==========================================================
// USER PAGES - LAZY
// ==========================================================

const UserHome = lazy(() =>
    import("./user_frontend/pages/UserHome")
);

const UserLogin = lazy(() =>
    import("./user_frontend/pages/UserLogin")
);

const UserRegister = lazy(() =>
    import("./user_frontend/pages/UserRegister")
);

const MovieDetail = lazy(() =>
    import("./user_frontend/pages/MovieDetail")
);

const Actor = lazy(() =>
    import("./user_frontend/pages/Actor")
);

const ActorDetail = lazy(() =>
    import("./user_frontend/pages/ActorDetail")
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

const CinemaDetail = lazy(() =>
    import("./user_frontend/pages/CinemaDetail")
);

const CinemaGenre = lazy(() =>
    import("./user_frontend/pages/CinemaGenre")
);

const FilmReview = lazy(() =>
    import("./user_frontend/pages/FilmReview")
);

const FilmReviewDetail = lazy(() =>
    import("./user_frontend/pages/FilmReviewDetail")
);

const Profile = lazy(() =>
    import("./user_frontend/pages/Profile")
);

// ==========================================================
// PROMOTION & CINEMA CORNER
// ==========================================================

const Promotion = lazy(() =>
    import("./user_frontend/pages/Promotion")
);

const BlogCinema = lazy(() =>
    import("./user_frontend/pages/BlogCinema")
);

// ==========================================================
// SUPPORT PAGES - LAZY
// ==========================================================

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

// ==========================================================
// ADMIN PAGES - LAZY
// ==========================================================

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

// ==========================================================
// ERROR BOUNDARY
// ==========================================================

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
            "Lazy load error:",
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
                        width: "100%",
                        padding: "20px",
                        boxSizing: "border-box",
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

                    <h2
                        style={{
                            marginBottom: "10px"
                        }}
                    >
                        Không thể tải trang
                    </h2>

                    <p
                        style={{
                            color: "#d1d5db",
                            maxWidth: "500px",
                            marginBottom: "20px",
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
                            flexWrap: "wrap",
                            justifyContent: "center"
                        }}
                    >

                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: "10px 24px",
                                background: "#dc2626",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600"
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
                                background: "#3a3a4f",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600"
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
// SUSPENSE LOADING
// ==========================================================

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

// ==========================================================
// NOT FOUND PAGE
// ==========================================================

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
                padding: "20px",
                boxSizing: "border-box"
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

            <h2
                style={{
                    marginTop: "10px"
                }}
            >
                Opps! Trang bạn tìm kiếm không tồn tại
            </h2>

            <button
                className="not-found-button"
                style={{
                    padding: "10px 20px",
                    cursor: "pointer",
                    marginTop: "20px"
                }}
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

    const {
        loading: routeLoading
    } = useRouteLoading();

    const hostname =
        window.location.hostname;

    const isAdminDomain =
        hostname === "admin.quangdungcinema.id.vn";

    return (

        <>

            {/* ==================================================
                ROUTE LOADING
            ================================================== */}

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

                    <Suspense
                        fallback={
                            <SuspenseLoading />
                        }
                    >

                        <Routes>

                            {/* ==================================================
                                ADMIN DOMAIN
                            ================================================== */}

                            {isAdminDomain ? (

                                <Route path="/">

                                    {/* ==================================================
                                        ADMIN LOGIN
                                    ================================================== */}

                                    <Route
                                        path="login"
                                        element={
                                            <AdminLogin />
                                        }
                                    />

                                    {/* ==================================================
                                        ADMIN AREA
                                    ================================================== */}

                                    <Route
                                        element={
                                            <AdminLayout>
                                                <Outlet />
                                            </AdminLayout>
                                        }
                                    >

                                        {/* DASHBOARD */}

                                        <Route
                                            index
                                            element={
                                                <AdminDashboard />
                                            }
                                        />

                                        {/* DASHBOARD REDIRECT */}

                                        <Route
                                            path="dashboard"
                                            element={
                                                <Navigate
                                                    to="/"
                                                    replace
                                                />
                                            }
                                        />

                                        {/* USERS */}

                                        <Route
                                            path="users"
                                            element={
                                                <UserPage />
                                            }
                                        />

                                        {/* MOVIES */}

                                        <Route
                                            path="movies"
                                            element={
                                                <MoviePage />
                                            }
                                        />

                                        {/* ROOMS */}

                                        <Route
                                            path="rooms"
                                            element={
                                                <RoomPage />
                                            }
                                        />

                                        {/* NEWS */}

                                        <Route
                                            path="news"
                                            element={
                                                <NewsPage />
                                            }
                                        />

                                        {/* BLOG */}

                                        <Route
                                            path="blog-cinema"
                                            element={
                                                <BlogCinemaPage />
                                            }
                                        />

                                        {/* PROMOTIONS */}

                                        <Route
                                            path="promotions"
                                            element={
                                                <PromotionPage />
                                            }
                                        />

                                        {/* COUPONS */}

                                        <Route
                                            path="coupons"
                                            element={
                                                <CouponPage />
                                            }
                                        />

                                        {/* GENRES */}

                                        <Route
                                            path="genres"
                                            element={
                                                <GenresPage />
                                            }
                                        />

                                        {/* CINEMAS */}

                                        <Route
                                            path="cinemas"
                                            element={
                                                <CinemaPage />
                                            }
                                        />

                                        {/* SHOWTIMES */}

                                        <Route
                                            path="showtimes"
                                            element={
                                                <ShowTimePage />
                                            }
                                        />

                                        {/* SEATS */}

                                        <Route
                                            path="seats"
                                            element={
                                                <SeatList />
                                            }
                                        />

                                        {/* MOVIE GENRES */}

                                        <Route
                                            path="movie-genres"
                                            element={
                                                <MovieGenrePage />
                                            }
                                        />

                                        {/* MOVIE ACTORS */}

                                        <Route
                                            path="movie-actors"
                                            element={
                                                <MovieActorPage />
                                            }
                                        />

                                        {/* BOOKINGS */}

                                        <Route
                                            path="bookings"
                                            element={
                                                <BookingPage />
                                            }
                                        />

                                        {/* TICKETS */}

                                        <Route
                                            path="tickets"
                                            element={
                                                <TicketList />
                                            }
                                        />

                                        {/* ACTORS */}

                                        <Route
                                            path="actors"
                                            element={
                                                <ActorPage />
                                            }
                                        />

                                        {/* FOODS */}

                                        <Route
                                            path="foods"
                                            element={
                                                <FoodPage />
                                            }
                                        />

                                        {/* BANNERS */}

                                        <Route
                                            path="banners"
                                            element={
                                                <BannerPage />
                                            }
                                        />

                                    </Route>

                                    {/* ==================================================
                                        ADMIN 404
                                    ================================================== */}

                                    <Route
                                        path="*"
                                        element={
                                            <NotFoundPage />
                                        }
                                    />

                                </Route>

                            ) : (

                                /* ==================================================
                                   USER DOMAIN
                                ================================================== */

                                <Route path="/">

                                    <Route
                                        element={
                                            <UserLayout />
                                        }
                                    >

                                        {/* HOME */}

                                        <Route
                                            index
                                            element={
                                                <UserHome />
                                            }
                                        />

                                        {/* MOVIES */}

                                        <Route
                                            path="movies/status/:statusSlug"
                                            element={
                                                <MovieStatusPage />
                                            }
                                        />

                                        <Route
                                            path="movies/detail/:slug"
                                            element={
                                                <MovieDetail />
                                            }
                                        />

                                        {/* ACTORS */}

                                        <Route
                                            path="actors"
                                            element={
                                                <Actor />
                                            }
                                        />

                                        <Route
                                            path="actor/:slug"
                                            element={
                                                <ActorDetail />
                                            }
                                        />

                                        {/* CINEMA */}

                                        <Route
                                            path="cinema/:slug"
                                            element={
                                                <CinemaDetail />
                                            }
                                        />

                                        {/* BOOKING */}

                                        <Route
                                            path="booking/:slug"
                                            element={
                                                <Booking />
                                            }
                                        />

                                        {/* FOOD */}

                                        <Route
                                            path="foods"
                                            element={
                                                <Food />
                                            }
                                        />

                                        {/* CINEMA GENRE */}

                                        <Route
                                            path="cinema-genre"
                                            element={
                                                <CinemaGenre />
                                            }
                                        />

                                        {/* PAYMENT */}

                                        <Route
                                            path="payment"
                                            element={
                                                <Payment />
                                            }
                                        />

                                        {/* FILM REVIEW */}

                                        <Route
                                            path="film-review"
                                            element={
                                                <FilmReview />
                                            }
                                        />

                                        <Route
                                            path="film-review/:slug"
                                            element={
                                                <FilmReviewDetail />
                                            }
                                        />

                                        {/* PAYMENT APPS */}

                                        <Route
                                            path="bank-app"
                                            element={
                                                <BankApp />
                                            }
                                        />

                                        <Route
                                            path="momo-app"
                                            element={
                                                <MomoApp />
                                            }
                                        />

                                        <Route
                                            path="confirm-success"
                                            element={
                                                <ConfirmSuccess />
                                            }
                                        />

                                        {/* AUTH */}

                                        <Route
                                            path="login"
                                            element={
                                                <UserLogin />
                                            }
                                        />

                                        <Route
                                            path="register"
                                            element={
                                                <UserRegister />
                                            }
                                        />

                                        {/* PROFILE */}

                                        <Route
                                            path="profile"
                                            element={
                                                <Profile />
                                            }
                                        />

                                        {/* PROMOTION */}

                                        <Route
                                            path="promotion"
                                            element={
                                                <Promotion />
                                            }
                                        />

                                        {/* BLOG */}

                                        <Route
                                            path="blog-cinema"
                                            element={
                                                <BlogCinema />
                                            }
                                        />

                                        {/* SUPPORT */}

                                        <Route
                                            path="faq"
                                            element={
                                                <FAQ />
                                            }
                                        />

                                        <Route
                                            path="privacy-policy"
                                            element={
                                                <PrivacyPolicy />
                                            }
                                        />

                                        <Route
                                            path="terms"
                                            element={
                                                <TermsOfService />
                                            }
                                        />

                                        <Route
                                            path="booking-guide"
                                            element={
                                                <BookingGuide />
                                            }
                                        />

                                        <Route
                                            path="contact"
                                            element={
                                                <ContactSupport />
                                            }
                                        />

                                        <Route
                                            path="membership"
                                            element={
                                                <MemberShip />
                                            }
                                        />

                                    </Route>

                                    {/* ==================================================
                                        CHẶN /admin TRÊN USER DOMAIN
                                    ================================================== */}

                                    <Route
                                        path="admin/*"
                                        element={
                                            <Navigate
                                                to="/"
                                                replace
                                            />
                                        }
                                    />

                                    {/* ==================================================
                                        USER 404
                                    ================================================== */}

                                    <Route
                                        path="*"
                                        element={
                                            <NotFoundPage />
                                        }
                                    />

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
// CREATE DATA ROUTER
// ==========================================================

const router = createBrowserRouter([
    {
        path: "*",
        element: <AppWrapper />
    }
]);

// ==========================================================
// APP
// ==========================================================

function App() {

    return (

        <RouterProvider
            router={router}
        />

    );

}

export default App;