import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    useNavigate,
    useParams
} from 'react-router-dom';

import axios from 'axios';

import {
    MapPin,
    Phone,
    CalendarDays,
    Clock3,
    Star,
    Ticket,
    Film,
    ChevronDown,
    Building2,
    ExternalLink,
    Loader2
} from 'lucide-react';

import '../styles/CinemaDetail.css';

const CinemaDetail = () => {

    const { slug } = useParams();

    const navigate = useNavigate();

    const [data, setData] = useState(null);

    const [loading, setLoading] = useState(true);

    const [selectedMovieId, setSelectedMovieId] =
        useState(null);

    const [selectedDate, setSelectedDate] =
        useState(
            new Date()
                .toISOString()
                .split('T')[0]
        );

    /* =====================================================
        DATE LIST
    ===================================================== */

    const dateList = useMemo(() => {

        const days = [];

        const weekdays = [
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

            date.setDate(
                date.getDate() + i
            );

            days.push({

                fullDate:
                    date
                        .toISOString()
                        .split('T')[0],

                dayText:
                    i === 0
                        ? 'HÔM NAY'
                        : weekdays[
                            date.getDay()
                        ],

                dateDisplay:
                    date.toLocaleDateString(
                        'vi-VN',
                        {
                            day: '2-digit',
                            month: '2-digit'
                        }
                    )

            });

        }

        return days;

    }, []);

    /* =====================================================
        FETCH DATA
    ===================================================== */

    useEffect(() => {

        const fetchCinemaData =
            async () => {

                try {

                    setLoading(true);

                    const res =
                        await axios.get(
                            `https://api.quangdungcinema.id.vn/api/cinemas/${slug}`
                        );

                    setData(res.data);

                } catch (error) {

                    console.error(error);

                } finally {

                    setLoading(false);

                }

            };

        fetchCinemaData();

        window.scrollTo(0, 0);

    }, [slug]);

    /* =====================================================
        LOADING
    ===================================================== */

    if (loading) {

        return (

            <div className="cinema-loading">

                <Loader2
                    size={45}
                    className="spin-icon"
                />

            </div>

        );

    }

    /* =====================================================
        ERROR
    ===================================================== */

    if (!data) {

        return (

            <div className="cinema-error">

                <Film size={60} />

                <h2>
                    Không tìm thấy rạp
                </h2>

            </div>

        );

    }

    const {
        cinema,
        movies
    } = data;

    /* =====================================================
        FILTER MOVIES
    ===================================================== */

    const filteredMovies =
        movies.filter(movie =>

            movie.showtimes &&
            movie.showtimes.some(st =>
                st.start_time.startsWith(
                    selectedDate
                )
            )

        );

    /* =====================================================
        DATE OBJECT
    ===================================================== */

    const selectedDateObject =
        dateList.find(
            d =>
                d.fullDate === selectedDate
        );

    /* =====================================================
        TOGGLE MOVIE
    ===================================================== */

    const handleMovieClick =
        (movieId) => {

            setSelectedMovieId(

                selectedMovieId === movieId
                    ? null
                    : movieId

            );

        };

    return (

        <div className="cinema-detail-page">

            {/* =====================================================
                HERO
            ===================================================== */}

            <div className="cinema-hero">

                <div className="cinema-overlay"></div>

                <div className="cinema-hero-content">

                    {/* LEFT */}

                    <div className="cinema-hero-left">

                        <div className="cinema-badge">

                            <Building2 size={16} />

                            HỆ THỐNG RẠP
                        </div>

                        <h1>
                            {cinema.cinema_name}
                        </h1>

                        <div className="cinema-meta">

                            <div className="meta-item">

                                <MapPin size={18} />

                                <span>
                                    {cinema.address},
                                    {' '}
                                    {cinema.city}
                                </span>

                            </div>

                            <div className="meta-item">

                                <Phone size={18} />

                                <span>
                                    {
                                        cinema.hotline ||
                                        '1900 2224'
                                    }
                                </span>

                            </div>

                        </div>

                        <div className="cinema-actions">

                            {
                                cinema.map_link && (

                                    <a
                                        href={
                                            cinema.map_link
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="map-btn"
                                    >

                                        <MapPin size={18} />

                                        Xem Google Maps

                                        <ExternalLink size={16} />

                                    </a>

                                )
                            }

                        </div>

                    </div>

                    {/* RIGHT */}

                    <div className="cinema-hero-right">

                        <div className="hero-select">

                            <MapPin size={18} />

                            <span>
                                {cinema.city}
                            </span>

                            <ChevronDown size={18} />

                        </div>

                        <div className="hero-select">

                            <Building2 size={18} />

                            <span>
                                {cinema.cinema_name}
                            </span>

                            <ChevronDown size={18} />

                        </div>

                    </div>

                </div>

            </div>

            {/* =====================================================
                CONTENT
            ===================================================== */}

            <div className="cinema-content">

                {/* =====================================================
                    MAP
                ===================================================== */}

                {
                    cinema.map_link && (

                        <div className="cinema-map-section">

                            <div className="section-title">

                                <span className="section-line"></span>

                                <h2>

                                    <MapPin size={24} />

                                    VỊ TRÍ RẠP

                                </h2>

                            </div>

                            <div className="cinema-map-card">

                                <iframe
                                    src={cinema.map_link}
                                    width="100%"
                                    height="450"
                                    style={{
                                        border: 0
                                    }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Cinema Map"
                                ></iframe>

                            </div>

                        </div>

                    )
                }

                {/* =====================================================
                    MOVIE TITLE
                ===================================================== */}

                <div className="section-title">

                    <span className="section-line"></span>

                    <h2>

                        <Film size={24} />

                        PHIM ĐANG CHIẾU

                    </h2>

                </div>

                {/* =====================================================
                    DATE LIST
                ===================================================== */}

                <div className="date-list">

                    {
                        dateList.map(
                            (item, index) => (

                                <div
                                    key={index}
                                    className={`
                                        date-card
                                        ${
                                            selectedDate === item.fullDate
                                                ? 'active'
                                                : ''
                                        }
                                    `}
                                    onClick={() => {

                                        setSelectedDate(
                                            item.fullDate
                                        );

                                        setSelectedMovieId(
                                            null
                                        );

                                    }}
                                >

                                    <span className="date-day">
                                        {item.dayText}
                                    </span>

                                    <span className="date-number">
                                        {item.dateDisplay}
                                    </span>

                                </div>

                            )
                        )
                    }

                </div>

                {/* =====================================================
                    MOVIES
                ===================================================== */}

                {
                    filteredMovies.length > 0 ? (

                        <div className="movie-list">

                            {
                                filteredMovies.map(movie => (

                                    <div
                                        key={movie.movie_id}
                                        className={`
                                            movie-card
                                            ${
                                                selectedMovieId === movie.movie_id
                                                    ? 'active'
                                                    : ''
                                            }
                                        `}
                                    >

                                        {/* TOP */}

                                        <div
                                            className="movie-top"
                                            onClick={() =>
                                                handleMovieClick(
                                                    movie.movie_id
                                                )
                                            }
                                        >

                                            {/* POSTER */}

                                            <div className="movie-poster">

                                                <img
                                                    src={`https://api.quangdungcinema.id.vn/uploads/posters/${movie.poster_url}`}
                                                    alt={movie.title}
                                                />

                                                <div className="movie-rating">

                                                    <Star size={14} />

                                                    {
                                                        movie.avg_rating ||
                                                        '0.0'
                                                    }

                                                </div>

                                                <div className="movie-age">
                                                    T18
                                                </div>

                                            </div>

                                            {/* INFO */}

                                            <div className="movie-info">

                                                <h3>
                                                    {movie.title}
                                                </h3>

                                                <div className="movie-info-row">

                                                    <CalendarDays size={16} />

                                                    <span>
                                                        {
                                                            selectedDateObject?.dateDisplay
                                                        }
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

                                        {/* SHOWTIMES */}

                                        {
                                            selectedMovieId === movie.movie_id && (

                                                <div className="showtime-panel">

                                                    <div className="showtime-header">

                                                        <Clock3 size={18} />

                                                        <span>
                                                            Suất chiếu
                                                        </span>

                                                    </div>

                                                    <div className="showtime-list">

                                                        {
                                                            movie.showtimes
                                                                .filter(st =>
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

                                                                        {
                                                                            new Date(
                                                                                st.start_time
                                                                            ).toLocaleTimeString(
                                                                                [],
                                                                                {
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit',
                                                                                    hour12: false
                                                                                }
                                                                            )
                                                                        }

                                                                    </button>

                                                                ))
                                                        }

                                                    </div>

                                                </div>

                                            )
                                        }

                                    </div>

                                ))
                            }

                        </div>

                    ) : (

                        <div className="empty-box">

                            <Film size={70} />

                            <h3>
                                Không có suất chiếu
                            </h3>

                            <p>
                                Ngày này hiện chưa có suất chiếu tại rạp.
                            </p>

                        </div>

                    )
                }

            </div>

        </div>

    );

};

export default CinemaDetail;