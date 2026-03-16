import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ThumbsUp, Eye, ChevronRight } from 'lucide-react'; 
import '../styles/CinemaGenre.css';

const CinemaGenre = () => {
    const navigate = useNavigate();
    const { genreSlug } = useParams();
    
    // State quản lý dữ liệu từ CSDL
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [sidebarMovies, setSidebarMovies] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                
                // GỌI TẤT CẢ API TỪ BACKEND
                const [resMovies, resGenres] = await Promise.all([
                    axios.get('http://localhost:5000/api/movies'),
                    axios.get('http://localhost:5000/api/genres')
                ]);

                // 1. Lưu danh sách phim chính
                setMovies(resMovies.data);

                // 2. Lưu danh sách thể loại cho filter
                setGenres(resGenres.data);

                // 3. Lấy danh sách NĂM duy nhất từ API movies (Xử lý từ dữ liệu thô của CSDL)
                const years = [...new Set(resMovies.data.map(m => 
                    new Date(m.release_date).getFullYear()
                ))].sort((a, b) => b - a);
                setAvailableYears(years);

                // 4. Lấy danh sách TRẠNG THÁI duy nhất từ cột status trong CSDL
                const statuses = [...new Set(resMovies.data.map(m => m.status))];
                setAvailableStatuses(statuses);

                // 5. Sidebar: Lấy phim đang chiếu thực tế
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

    if (loading) return <div className="loading">Đang tải dữ liệu từ CSDL...</div>;

    return (
        <div className="genre-page-bg">
            <div className="genre-content-flex">
                
                {/* CỘT TRÁI: DỮ LIỆU CHÍNH */}
                <div className="main-genre-col">
                    <div className="section-header-galaxy">
                        <span className="blue-line"></span>
                        <h2 className="section-title">PHIM ĐIỆN ẢNH</h2>
                    </div>
                    
                    <div className="genre-filters-bar">
                        {/* Filter Thể loại lấy từ table genres */}
                        <select className="filter-select" defaultValue={genreSlug || ""}>
                            <option value="">Tất cả thể loại</option>
                            {genres.map(g => (
                                <option key={g.genre_id} value={g.slug}>{g.genre_name}</option>
                            ))}
                        </select>

                        {/* Filter Năm lấy từ release_date của table movies */}
                        <select className="filter-select">
                            <option value="">Tất cả năm</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        {/* Filter Trạng thái lấy từ cột status của table movies */}
                        <select className="filter-select">
                            <option value="">Trạng thái</option>
                            {availableStatuses.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>

                    <div className="movie-genre-list">
                        {movies.map(movie => (
                            <div key={movie.movie_id} className="movie-card-horizontal">
                                <Link to={`/movies/detail/${movie.slug}`} className="movie-img-box">
                                    <img 
                                        src={`http://localhost:5000/uploads/posters/${movie.poster_url}`} 
                                        alt={movie.title} 
                                    />
                                </Link>
                                <div className="movie-content-info">
                                    <Link to={`/movies/detail/${movie.slug}`} className="movie-name-link">
                                        <h3>{movie.title}</h3>
                                    </Link>
                                    <div className="movie-meta-row">
                                        <button className="btn-fb-like">
                                            <ThumbsUp size={14} strokeWidth={2.5} fill="currentColor" /> 
                                            <span>Thích</span>
                                        </button>
                                        <span className="view-count">
                                            <Eye size={14} strokeWidth={2} /> 
                                            <span>{movie.movie_id * 150} lượt xem</span>
                                        </span>
                                    </div>
                                    <p className="movie-summary-text">
                                        {movie.description}
                                    </p>
                                    <div className="movie-release-date">
                                        Khởi chiếu: {new Date(movie.release_date).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CỘT PHẢI: SIDEBAR */}
                <div className="sidebar-col">
                    <div className="sidebar-title">Phim Đang Chiếu</div>
                    <div className="sidebar-movie-list">
                        {sidebarMovies.map((m) => (
                            <div key={m.movie_id} className="simple-movie-item" onClick={() => navigate(`/movies/detail/${m.slug}`)}>
                                <div className="simple-poster">
                                    <img 
                                        src={`http://localhost:5000/uploads/posters/${m.poster_url}`} 
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