import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ThumbsUp, Eye } from 'lucide-react'; 
import MovieSidebar from '../components/MovieSidebar'; 
import '../styles/CinemaGenre.css';

const CinemaGenre = () => {
    const navigate = useNavigate();
    const { genreSlug } = useParams();
    
    const [movies, setMovies] = useState([]);      // Phim đã lọc theo thể loại
    const [allMovies, setAllMovies] = useState([]); // Tất cả phim để truyền vào Sidebar
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);

    const IMAGE_BASE_URL = 'https://api.quangdungcinema.id.vn/uploads';

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const [resMovies, resGenres] = await Promise.all([
                    axios.get('https://api.quangdungcinema.id.vn/api/movies'),
                    axios.get('https://api.quangdungcinema.id.vn/api/genres')
                ]);

                setAllMovies(resMovies.data);
                setGenres(resGenres.data);
                
                // Lọc phim theo thể loại từ URL (genreSlug)
                if (genreSlug) {
                    const filtered = resMovies.data.filter(m => 
                        m.genres?.some(g => g.slug === genreSlug)
                    );
                    setMovies(filtered);
                } else {
                    setMovies(resMovies.data);
                }

                setLoading(false);
            } catch (error) {
                console.error("Lỗi kết nối API:", error);
                setLoading(false);
            }
        };

        fetchAllData();
        window.scrollTo(0, 0);
    }, [genreSlug]);

    const handleMovieClick = async (e, movie) => {
        e.preventDefault(); 
        try {
            await axios.patch(`https://api.quangdungcinema.id.vn/api/movies/view/${movie.movie_id}`);
            navigate(`/movies/detail/${movie.slug}`);
        } catch (error) {
            console.error("Lỗi tăng lượt xem:", error);
            navigate(`/movies/detail/${movie.slug}`);
        }
    };

    const handleLikeMovie = async (movieId) => {
        try {
            await axios.patch(`https://api.quangdungcinema.id.vn/api/movies/like/${movieId}`);
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
                        <h2 className="section-title">
                            {genreSlug 
                                ? `PHIM THEO THỂ LOẠI: ${genres.find(g => g.slug === genreSlug)?.genre_name || ""}` 
                                : "DANH SÁCH PHIM"}
                        </h2>
                    </div>
                    
                    <div className="genre-filters-bar">
                        <select 
                            className="filter-select-custom" 
                            value={genreSlug || ""}
                            onChange={(e) => navigate(e.target.value ? `/movies/genre/${e.target.value}` : '/movies/genre')}
                        >
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
                                    <Link 
                                        to={`/movies/detail/${movie.slug}`} 
                                        className="movie-image-container"
                                        onClick={(e) => handleMovieClick(e, movie)}
                                    >
                                        <img 
                                            className="movie-img-main"
                                            src={`${IMAGE_BASE_URL}/backdrops/${movie.backdrop_url}`} 
                                            alt={movie.title} 
                                        />
                                    </Link>

                                    <div className="movie-content-info">
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
                                            {movie.description ? movie.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : "Chưa có mô tả cho phim này."}
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
                    <MovieSidebar 
                        IMAGE_BASE_URL={IMAGE_BASE_URL}
                        title="Phim Đang Chiếu"
                        relatedMovies={allMovies.slice(0, 6)} // Truyền data vào đây để Sidebar có cái mà hiện
                    />
                </div>

            </div>
        </div>
    );
};

export default CinemaGenre;