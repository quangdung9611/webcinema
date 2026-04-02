import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ThumbsUp, Eye, ChevronRight } from 'lucide-react'; 
import '../styles/CinemaGenre.css';

const CinemaGenre = () => {
    const navigate = useNavigate();
    const { genreSlug } = useParams();
    
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [sidebarMovies, setSidebarMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const [resMovies, resGenres] = await Promise.all([
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/genres')
                ]);

                setMovies(resMovies.data);
                setGenres(resGenres.data);

                const active = resMovies.data.filter(m => m.status === 'Đang chiếu');
                setSidebarMovies(active.slice(0, 3));
                
                setLoading(false);
            } catch (error) {
                console.error("Lỗi kết nối API:", error);
                setLoading(false);
            }
        };

        fetchAllData();
        window.scrollTo(0, 0);
    }, [genreSlug]);

    // --- BỔ SUNG: HÀM XỬ LÝ KHI BẤM VÀO PHIM ĐỂ TĂNG VIEW ---
    const handleMovieClick = async (e, movie) => {
        // Ngăn chặn hành vi mặc định nếu cần
        e.preventDefault(); 
        try {
            // 1. Gọi API tăng lượt xem (PATCH)
            await axios.patch(`https://webcinema-zb8z.onrender.com/api/movies/view/${movie.movie_id}`);
            
            // 2. Sau đó mới chuyển sang trang chi tiết
            navigate(`/movies/detail/${movie.slug}`);
        } catch (error) {
            console.error("Lỗi tăng lượt xem:", error);
            // Nếu API lỗi vẫn cho chuyển trang để khách xem phim
            navigate(`/movies/detail/${movie.slug}`);
        }
    };

    const handleLikeMovie = async (movieId) => {
        try {
            await axios.patch(`https://webcinema-zb8z.onrender.com/api/movies/like/${movieId}`);
            setMovies(prevMovies => 
                prevMovies.map(movie => 
                    movie.movie_id === movieId 
                    ? { ...movie, total_likes: (movie.total_likes || 0) + 1 } 
                    : movie
                )
            );
        } catch (error) {
            console.error("Không thể thích phim:", error);
        }
    };

    if (loading) return <div className="loading">Đang tải dữ liệu từ hệ thống...</div>;

    return (
        <div className="genre-page-bg">
            <div className="genre-content-flex">
                
                <div className="main-genre-col">
                    <div className="section-header-galaxy">
                        <span className="blue-line"></span>
                        <h2 className="section-title">DANH SÁCH PHIM</h2>
                    </div>
                    
                    <div className="genre-filters-bar">
                        <select className="filter-select-custom" defaultValue={genreSlug || ""}>
                            <option value="">Tất cả thể loại</option>
                            {genres.map(g => (
                                <option key={g.genre_id} value={g.slug}>{g.genre_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="movie-genre-list">
                        {movies.length > 0 ? (
                            movies.map(movie => (
                                <div key={movie.movie_id} className="movie-card-horizontal">
                                    {/* SỬA TẠI ĐÂY: Thêm onClick vào Link */}
                                    <Link 
                                        to={`/movies/detail/${movie.slug}`} 
                                        className="movie-img-box"
                                        onClick={(e) => handleMovieClick(e, movie)}
                                    >
                                        <img 
                                            src={`https://webcinema-zb8z.onrender.com/uploads/posters/${movie.poster_url}`} 
                                            alt={movie.title} 
                                        />
                                    </Link>
                                    <div className="movie-content-info">
                                        {/* SỬA TẠI ĐÂY: Thêm onClick vào Link tiêu đề */}
                                        <Link 
                                            to={`/movies/detail/${movie.slug}`} 
                                            className="movie-name-link"
                                            onClick={(e) => handleMovieClick(e, movie)}
                                        >
                                            <h3>{movie.title}</h3>
                                        </Link>
                                        <div className="movie-meta-row">
                                            <button 
                                                className="btn-fb-like" 
                                                onClick={() => handleLikeMovie(movie.movie_id)}
                                            >
                                                <ThumbsUp size={14} strokeWidth={2.5} fill="currentColor" /> 
                                                <span>Thích {movie.total_likes > 0 ? movie.total_likes : ""}</span>
                                            </button>

                                            <span className="view-count">
                                                <Eye size={14} strokeWidth={2} /> 
                                                <span>{movie.views_count || 0} lượt xem</span>
                                            </span>
                                        </div>
                                        <p className="movie-summary-text">
                                            {movie.description || "Chưa có mô tả cho phim này."}
                                        </p>
                                        <div className="movie-release-date">
                                            Khởi chiếu: {new Date(movie.release_date).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">Hiện chưa có phim nào trong mục này.</p>
                        )}
                    </div>
                </div>

                <div className="sidebar-col">
                    <div className="sidebar-title">Phim Đang Chiếu</div>
                    <div className="sidebar-movie-list">
                        {sidebarMovies.map((m) => (
                            <div 
                                key={m.movie_id} 
                                className="simple-movie-item" 
                                onClick={(e) => handleMovieClick(e, m)}
                                style={{cursor: 'pointer'}}
                            >
                                <div className="simple-poster">
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/posters/${m.poster_url}`} 
                                        alt={m.title} 
                                    />
                                    <div className="age-badge">C{m.age_rating}</div>
                                </div>
                                <div className="simple-title">{m.title}</div>
                            </div>
                        ))}
                    </div>
                    <button className="view-more-btn" onClick={() => navigate('/movies')}>
                        <span>Xem thêm</span>
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CinemaGenre;