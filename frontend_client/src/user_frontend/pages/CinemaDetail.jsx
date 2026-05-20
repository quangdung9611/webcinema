import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import {
    MapPin,
    Phone,
    CalendarDays,
    Clock3,
    Star,
    Ticket,
    Film,
    Building2,
    ChevronDown
} from 'lucide-react';

import '../styles/CinemaDetail.css';

const CinemaDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMovieId, setSelectedMovieId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    const dateList = useMemo(() => {
        const days = [];
        const daysOfWeek = [
            'CN',
            'THỨ 2',
            'THỨ 3',
            'THỨ 4',
            'THỨ 5',
            'THỨ 6',
            'THỨ 7'
        ];

        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);

            days.push({
                fullDate: date.toISOString().split('T')[0],
                dayText: i === 0 ? 'HÔM NAY' : daysOfWeek[date.getDay()],
                dateDisplay: date.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit'
                })
            });
        }

        return days;
    }, []);

    useEffect(() => {
        const fetchCinemaData = async () => {
            try {
                setLoading(true);

                const res = await axios.get(
                    `https://api.quangdungcinema.id.vn/api/cinemas/${slug}`
                );

                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCinemaData();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) {
        return (
            <div className="loading-wrap">
                <div className="loader"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="error-msg">
                Không tìm thấy dữ liệu rạp!
            </div>
        );
    }

    const { cinema, movies } = data;

    const filteredMovies = movies.filter(
        (movie) =>
            movie.showtimes &&
            movie.showtimes.some((st) =>
                st.start_time.startsWith(selectedDate)
            )
    );

    const selectedDateObject = dateList.find(
        (d) => d.fullDate === selectedDate
    );

    const handleMovieClick = (movieId) => {
        setSelectedMovieId(
            selectedMovieId === movieId ? null : movieId
        );
    };

    return (
        <div className="cinema-detail-page">

            {/* ================= HERO ================= */}
            <div className="cinema-hero">

                <div className="cinema-hero-overlay"></div>

                <div className="cinema-hero-content">

                    <div className="cinema-left">

                        <h1 className="cinema-title">
                            {cinema.cinema_name}
                        </h1>

                        <div className="cinema-meta">

                            <div className="meta-item">
                                <MapPin size={18} />
                                <span>
                                    Địa chỉ: {cinema.address}, {cinema.city}
                                </span>
                            </div>

                            <div className="meta-item">
                                <Phone size={18} />
                                <span>Hotline: 1900 2224</span>
                            </div>

                        </div>

                    </div>

                    <div className="cinema-right">

                        <div className="custom-select">
                            <MapPin size={18} />
                            <span>{cinema.city}</span>
                            <ChevronDown size={18} />
                        </div>

                        <div className="custom-select">
                            <Building2 size={18} />
                            <span>{cinema.cinema_name}</span>
                            <ChevronDown size={18} />
                        </div>

                    </div>

                </div>

            </div>

            {/* ================= CONTENT ================= */}
            <div className="cinema-content">

                {/* TITLE */}
                <div className="section-title">

                    <span className="section-line"></span>

                    <h2>
                        <Film size={28} />
                        PHIM
                    </h2>

                </div>

                {/* DATE LIST */}
                <div className="date-list">

                    {dateList.map((item, index) => (

                        <div
                            key={index}
                            className={`date-card ${
                                selectedDate === item.fullDate
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() => {
                                setSelectedDate(item.fullDate);
                                setSelectedMovieId(null);
                            }}
                        >

                            <span className="date-day">
                                {item.dayText}
                            </span>

                            <span className="date-number">
                                {item.dateDisplay}
                            </span>

                        </div>

                    ))}

                </div>

                {/* MOVIES */}
                {filteredMovies.length > 0 ? (

                    <div className="movie-list">

                        {filteredMovies.map((movie) => (

                            <div
                                className={`movie-card ${
                                    selectedMovieId === movie.movie_id
                                        ? 'active'
                                        : ''
                                }`}
                                key={movie.movie_id}
                            >

                                {/* TOP */}
                                <div
                                    className="movie-top"
                                    onClick={() =>
                                        handleMovieClick(movie.movie_id)
                                    }
                                >

                                    <div className="movie-poster">

                                        <img
                                            src={`https://api.quangdungcinema.id.vn/uploads/posters/${movie.poster_url}`}
                                            alt={movie.title}
                                        />

                                        <div className="movie-rating">
                                            <Star size={14} />
                                            {movie.avg_rating || '0.0'}
                                        </div>

                                        <div className="movie-age">
                                            T18
                                        </div>

                                    </div>

                                    <div className="movie-info">

                                        <h3>
                                            {movie.title}
                                        </h3>

                                        <div className="movie-info-row">
                                            <CalendarDays size={16} />
                                            <span>
                                                {selectedDateObject?.dateDisplay}
                                            </span>
                                        </div>

                                        <div className="movie-info-row">
                                            <Ticket size={16} />
                                            <span>
                                                2D Phụ Đề
                                            </span>
                                        </div>

                                    </div>

                                </div>

                                {/* SHOWTIME */}
                                {selectedMovieId === movie.movie_id && (

                                    <div className="showtime-panel">

                                        <div className="showtime-header">

                                            <Clock3 size={18} />

                                            <span>
                                                Suất chiếu
                                            </span>

                                        </div>

                                        <div className="showtime-list">

                                            {movie.showtimes
                                                .filter((st) =>
                                                    st.start_time.startsWith(
                                                        selectedDate
                                                    )
                                                )
                                                .map((st, idx) => (

                                                    <button
                                                        key={idx}
                                                        className="showtime-btn"
                                                        onClick={() =>
                                                            navigate(
                                                                `/booking/${st.showtime_id}`
                                                            )
                                                        }
                                                    >

                                                        {new Date(
                                                            st.start_time
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: '2-digit',
                                                                minute:
                                                                    '2-digit',
                                                                hour12: false
                                                            }
                                                        )}

                                                    </button>

                                                ))}

                                        </div>

                                    </div>

                                )}

                            </div>

                        ))}

                    </div>

                ) : (

                    <div className="empty-box">

                        <Film size={70} />

                        <h3>
                            Ngày này hiện không có suất chiếu nào tại rạp.
                        </h3>

                        <p>
                            Vui lòng chọn ngày khác để xem suất chiếu.
                        </p>

                        <button>
                            <CalendarDays size={18} />
                            Chọn ngày khác
                        </button>

                    </div>

                )}

            </div>

        </div>
    );
};

export default CinemaDetail;