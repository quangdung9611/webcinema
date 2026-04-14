import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext'; 

// --- CẤU HÌNH QUAN TRỌNG ---
axios.defaults.withCredentials = true;

// --- LAYOUTS & PROTECTION ---
import AdminLayout from './admin_frontend/layouts/AdminLayout';
import UserLayout from './user_frontend/layouts/UserLayout'; 
import ProtectedRoute from './admin_frontend/components/ProtectedRoute';

// --- PAGES USER ---
import UserHome from './user_frontend/pages/UserHome';
import UserLogin from './user_frontend/pages/UserLogin';
import UserRegister from './user_frontend/pages/UserRegister';
import MovieDetail from './user_frontend/pages/MovieDetail';
import Actor from './user_frontend/pages/Actor'; 
import ActorDetail from './user_frontend/pages/ActorDetail'; 
import Booking from './user_frontend/pages/Booking';
import Food from './user_frontend/pages/Food';
import Payment from './user_frontend/pages/Payment';
import ConfirmSuccess from './user_frontend/pages/ConfirmSuccess';
import BankApp from './user_frontend/pages/BankApp';
import MomoApp from './user_frontend/pages/MomoApp';
import MovieStatusPage from './user_frontend/pages/MovieStatusPage';
import CinemaDetail from './user_frontend/pages/CinemaDetail';
import CinemaGenre from './user_frontend/pages/CinemaGenre';
import FilmReview from './user_frontend/pages/FilmReview';
import FilmReviewDetail from './user_frontend/pages/FilmReviewDetail';
import Profile from './user_frontend/pages/Profile';

// --- PAGES ADMIN ---
import AdminLogin from './admin_frontend/pages/Auth/AdminLogin';
import AdminDashboard from './admin_frontend/pages/Admin/AdminDashboard';
import UserList from './admin_frontend/pages/Admin/Users/UserList';
import UserAdd from './admin_frontend/pages/Admin/Users/UserAdd';
import UserUpdate from './admin_frontend/pages/Admin/Users/UserUpdate';
import GenresList from './admin_frontend/pages/Admin/Genres/GenresList';
import GenresAdd from './admin_frontend/pages/Admin/Genres/GenresAdd';
import GenresUpdate from './admin_frontend/pages/Admin/Genres/GenresUpdate';
import CinemaList from './admin_frontend/pages/Admin/Cinema/CinemaList';
import CinemaAdd from './admin_frontend/pages/Admin/Cinema/CinemaAdd';
import CinemaUpdate from './admin_frontend/pages/Admin/Cinema/CinemaUpdate';
import RoomList from './admin_frontend/pages/Admin/Room/RoomList';
import RoomAdd from './admin_frontend/pages/Admin/Room/RoomAdd';
import RoomUpdate from './admin_frontend/pages/Admin/Room/RoomUpdate';
import MovieList from './admin_frontend/pages/Admin/Movie/MovieList';
import MovieAdd from './admin_frontend/pages/Admin/Movie/MovieAdd';
import MovieUpdate from './admin_frontend/pages/Admin/Movie/MovieUpdate';
import SeatList from './admin_frontend/pages/Admin/Seat/SeatList';
import TicketList from './admin_frontend/pages/Admin/Ticket/TicketList';
import ActorList from './admin_frontend/pages/Admin/Actor/ActorList';
import ActorAdd from './admin_frontend/pages/Admin/Actor/ActorAdd';
import ActorUpdate from './admin_frontend/pages/Admin/Actor/ActorUpdate';
import CouponList from './admin_frontend/pages/Admin/Coupon/CouponList';
import CouponAdd from './admin_frontend/pages/Admin/Coupon/CouponAdd';
import CouponUpdate from './admin_frontend/pages/Admin/Coupon/CouponUpdate';
import BookingList from './admin_frontend/pages/Admin/Booking/BookingList';
import BookingDetail from './admin_frontend/pages/Admin/Booking/BookingDetail';
import MovieGenreList from './admin_frontend/pages/Admin/MovieGenre/MovieGenreList';
import MovieActorList from './admin_frontend/pages/Admin/MovieActor/MovieActorList';
import ShowTimeList from './admin_frontend/pages/Admin/Showtime/ShowTimeList';
import ShowtimeAdd from './admin_frontend/pages/Admin/Showtime/ShowTimeAdd';
import ShowtimeUpdate from './admin_frontend/pages/Admin/Showtime/ShowTimeUpdate';
import NewsList from './admin_frontend/pages/Admin/News/NewsList';
import NewsAdd from './admin_frontend/pages/Admin/News/NewsAdd';
import NewsUpdate from './admin_frontend/pages/Admin/News/NewsUpdate';

const AdminLayoutWrapper = () => (
    <ProtectedRoute>
        <AdminLayout />
    </ProtectedRoute>
);

function App() {
    const { loading } = useAuth();
    const hostname = window.location.hostname;
    const isAdminDomain = hostname === 'admin.quangdungcinema.id.vn';

    if (loading) {
        return (
            <div style={{ 
                height: '100vh', display: 'flex', justifyContent: 'center', 
                alignItems: 'center', background: '#000', color: '#ffcc00' 
            }}>
                ĐANG TẢI CINEMA STAR...
            </div>
        );
    }

    return (
        <Router>
            <div className="app-wrapper">
                <Routes>
                    {isAdminDomain ? (
                        /* --- ROUTE CHO DOMAIN ADMIN --- */
                        <Route path="/">
                            {/* Trang đăng nhập: admin.quangdungcinema.id.vn/login */}
                            <Route path="login" element={<AdminLogin />} />

                            {/* Bọc bảo mật cho các trang nội bộ */}
                            <Route element={<AdminLayoutWrapper />}>
                                {/* 🔥 THAY ĐỔI CHÍNH: Trang chủ domain chính là Dashboard */}
                                <Route index element={<AdminDashboard />} />
                                
                                {/* Nếu user gõ /dashboard thì đá về trang chủ / cho đồng nhất */}
                                <Route path="dashboard" element={<Navigate to="/" replace />} />

                                <Route path="users">
                                    <Route index element={<UserList />} />
                                    <Route path="add" element={<UserAdd />} />
                                    <Route path="update/:user_id" element={<UserUpdate />} />
                                </Route>

                                <Route path="movies">
                                    <Route index element={<MovieList />} />
                                    <Route path="add" element={<MovieAdd />} />
                                    <Route path="update/:id" element={<MovieUpdate />} />
                                </Route>

                                <Route path="rooms">
                                    <Route index element={<RoomList />} />
                                    <Route path="add" element={<RoomAdd />} />
                                    <Route path="update/:room_id" element={<RoomUpdate />} />
                                </Route>

                                <Route path="news">
                                    <Route index element={<NewsList />} />
                                    <Route path="add" element={<NewsAdd />} />
                                    <Route path="update/:news_id" element={<NewsUpdate />} />
                                </Route>

                                <Route path="coupons">
                                    <Route index element={<CouponList />} />
                                    <Route path="add" element={<CouponAdd />} />
                                    <Route path="update/:coupon_id" element={<CouponUpdate />} />
                                </Route>

                                <Route path="genres">
                                    <Route index element={<GenresList />} />
                                    <Route path="add" element={<GenresAdd />} />
                                    <Route path="update/:genre_id" element={<GenresUpdate />} />
                                </Route>

                                <Route path="cinemas">
                                    <Route index element={<CinemaList />} />
                                    <Route path="add" element={<CinemaAdd />} />
                                    <Route path="update/:cinema_id" element={<CinemaUpdate />} />
                                </Route>

                                <Route path="showtimes">
                                    <Route index element={<ShowTimeList />} />
                                    <Route path="add" element={<ShowtimeAdd />} />
                                    <Route path="update/:showtime_id" element={<ShowtimeUpdate />} />
                                </Route>

                                <Route path="seats" element={<SeatList />} />
                                <Route path="movie-genres" element={<MovieGenreList />} />
                                <Route path="movie-actors" element={<MovieActorList />} />
                                <Route path="bookings" element={<BookingList />} />
                                <Route path="bookings/:id" element={<BookingDetail />} />
                                <Route path="tickets" element={<TicketList />} />
                                
                                <Route path="actors">
                                    <Route index element={<ActorList/>} />
                                    <Route path="add" element={<ActorAdd />} />
                                    <Route path="update/:id" element={<ActorUpdate/>} />
                                </Route>
                            </Route>
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>
                    ) : (
                        /* --- ROUTE CHO DOMAIN USER --- */
                        <Route path="/">
                            <Route element={<UserLayout />}>
                                <Route index element={<UserHome />} />
                                <Route path="movies/status/:statusSlug" element={<MovieStatusPage />} />
                                <Route path="movies/detail/:slug" element={<MovieDetail />} />
                                <Route path="actors" element={<Actor />} />
                                <Route path="actor/:slug" element={<ActorDetail />} /> 
                                <Route path="cinema/:slug" element={<CinemaDetail />} /> 
                                <Route path="booking" element={<Booking />} />
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
                            </Route>
                            {/* Chặn truy cập /admin từ domain chính */}
                            <Route path="admin/*" element={<Navigate to="/" replace />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>
                    )}
                </Routes>
            </div>
        </Router>
    );
}

const NotFoundPage = () => (
    <div className="not-found-container" style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1 className="not-found-title" style={{ fontSize: '100px', margin: 0 }}>404</h1>
        <h2 className="not-found-subtitle">Opps! Trang bạn tìm kiếm không tồn tại</h2>
        <button 
            className="not-found-button"
            style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '20px' }}
            onClick={() => window.location.href = '/'}
        >
            QUAY LẠI TRANG CHỦ
        </button>
    </div>
);

export default App;