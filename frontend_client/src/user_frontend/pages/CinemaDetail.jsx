import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/CinemaDetail.css';

const CinemaDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedMovieId, setSelectedMovieId] = useState(null);
    
    // --- 1. Thêm State để lưu ngày đang chọn (Mặc định là hôm nay) ---
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    const moviesPerPage = 6;

    // --- 2. Hàm tạo danh sách 10 ngày tự động kể từ hôm nay ---
    const dateList = useMemo(() => {
        const days = [];
        const daysOfWeek = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            days.push({
                fullDate: date.toISOString().split('T')[0], // Dùng để so sánh với DB (YYYY-MM-DD)
                dayText: i === 0 ? "Hôm Nay" : daysOfWeek[date.getDay()],
                dateDisplay: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            });
        }
        return days;
    }, []);

    useEffect(() => {
        const fetchCinemaData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/cinemas/${slug}`);
                setData(res.data);
            } catch (err) {
                console.error("Lỗi:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCinemaData();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) return <div className="loading-wrap"><div className="loader"></div></div>;
    if (!data) return <div className="error-msg">Không tìm thấy dữ liệu rạp!</div>;

    const { cinema, movies } = data;

    // --- 3. Logic Lọc phim theo ngày và Phân trang ---
    // Chỉ hiện những phim có suất chiếu trong ngày đã chọn
    const filteredMovies = movies.filter(movie => 
        movie.showtimes && movie.showtimes.some(st => st.start_time.startsWith(selectedDate))
    );

    const indexOfLastMovie = currentPage * moviesPerPage;
    const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;
    const currentMovies = filteredMovies.slice(indexOfFirstMovie, indexOfLastMovie);
    const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);

    const handleMovieClick = (movieId) => {
        setSelectedMovieId(selectedMovieId === movieId ? null : movieId);
    };

    return (
        <div className="cinema-detail-wrapper">
            <div className="cinema-top-info">
                <div className="info-left">
                    <h2 className="c-name">{cinema.cinema_name}</h2>
                    <p className="c-address">Địa chỉ: {cinema.address}, {cinema.city}</p>
                    <p className="c-hotline">Hotline: 1900 2224</p>
                </div>
                <div className="info-right">
                    <select className="select-box"><option>{cinema.city}</option></select>
                    <select className="select-box"><option>{cinema.cinema_name}</option></select>
                </div>
            </div>

            <div className="cinema-main-content">
                <div className="section-header">
                    <span className="blue-line"></span>
                    <h3 className="section-label">PHIM</h3>
                </div>

                {/* --- 4. Sửa lại thanh chọn ngày tự động --- */}
                <div className="date-picker-strip">
                    {dateList.map((item, index) => (
                        <div 
                            key={index} 
                            className={`date-item ${selectedDate === item.fullDate ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedDate(item.fullDate);
                                setCurrentPage(1); // Reset về trang 1 khi đổi ngày
                                setSelectedMovieId(null); // Đóng suất chiếu đang mở
                            }}
                        >
                            <span className="day-text">{item.dayText}</span>
                            <span className="date-text">{item.dateDisplay}</span>
                        </div>
                    ))}
                </div>

                <div className="movie-grid-container">
                    {currentMovies.length > 0 ? currentMovies.map((movie) => (
                        <React.Fragment key={movie.movie_id}>
                            <div 
                                className={`movie-grid-card ${selectedMovieId === movie.movie_id ? 'active' : ''}`}
                                onClick={() => handleMovieClick(movie.movie_id)} 
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="poster-wrapper">
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/posters/${movie.poster_url}`} 
                                        alt={movie.title} 
                                    />
                                    {selectedMovieId === movie.movie_id && (
                                        <div className="selected-overlay">
                                            <span className="check-icon">✓</span>
                                        </div>
                                    )}
                                    <div className="rating-badge">⭐ {movie.avg_rating || '0.0'}</div>
                                    <div className="age-badge">T18</div>
                                </div>
                                <h4 className="movie-grid-title">{movie.title}</h4>
                            </div>

                            {/* --- 5. Lọc Suất chiếu chỉ hiện của ngày đang chọn --- */}
                            {selectedMovieId === movie.movie_id && (
                                <div className="showtime-dropdown-panel">
                                    <h5 className="panel-title">Suất chiếu ({item.dateDisplay})</h5>
                                    <div className="showtime-type-group">
                                        <span className="type-label">2D Phụ Đề</span>
                                        <div className="showtime-slots">
                                            {movie.showtimes
                                                .filter(st => st.start_time.startsWith(selectedDate))
                                                .map((st, idx) => (
                                                <button 
                                                    key={idx} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/booking/${st.showtime_id}`);
                                                    }}
                                                >
                                                    {new Date(st.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    )) : (
                        <div className="no-data">Ngày này hiện không có suất chiếu nào tại rạp.</div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        {[...Array(totalPages)].map((_, i) => (
                            <button 
                                key={i} 
                                className={currentPage === i + 1 ? 'active' : ''}
                                onClick={() => {
                                    setCurrentPage(i + 1);
                                    setSelectedMovieId(null);
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CinemaDetail;