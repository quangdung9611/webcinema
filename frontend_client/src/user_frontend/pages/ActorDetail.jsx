import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ActorDetail.css'; 

const ActorDetail = () => {
    const { slug } = useParams(); 
    const navigate = useNavigate();
    const [actor, setActor] = useState(null);
    const [loading, setLoading] = useState(true);
    // State lưu danh sách phim cho sidebar
    const [relatedMovies, setRelatedMovies] = useState([]);

    useEffect(() => {
        const fetchActorData = async () => {
            if (!slug || slug === 'undefined') return;
            try {
                setLoading(true);
                const response = await axios.get(`https://webcinema-zb8z.onrender.com/api/actors/${slug}`);
                setActor(response.data);

                // Lấy phim cho sidebar
                const resRelated = await axios.get(`https://webcinema-zb8z.onrender.com/api/movies`);
                setRelatedMovies(resRelated.data.slice(0, 3));

                setLoading(false);
            } catch (error) {
                console.error("Lỗi lấy thông tin diễn viên:", error);
                setLoading(false);
            }
        };
        fetchActorData();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) return <div className="actor-loading">Đang tải Profile nghệ sĩ...</div>;
    if (!actor) return <div className="actor-error">Không tìm thấy thông tin nghệ sĩ.</div>;

    return (
        <div className="actor-profile-page">
            <div className="detail-content-flex">
                
                {/* CỘT TRÁI: THÔNG TIN CHI TIẾT */}
                <div className="main-detail-col">
                    <div className="actor-container">
                        
                        {/* PHẦN 1: PROFILE HEADER */}
                        <div className="actor-header">
                            <div className="actor-avatar-wrapper">
                                {actor.avatar ? (
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/actors/${actor.avatar}`} 
                                        alt={actor.name} 
                                        className="actor-img"
                                        onError={(e) => { 
                                            e.target.style.display = 'none'; 
                                        }}
                                    />
                                ) : (
                                    <div className="no-avatar-placeholder">No Image</div>
                                )}
                            </div>
                            <div className="actor-basic-info">
                                <h1 className="actor-name-title">{actor.name}</h1>
                                <div className="actor-badges">
                                    <span className="badge-item">
                                        <i className="fas fa-map-marker-alt"></i> {actor.nationality || 'Việt Nam'}
                                    </span>
                                    <span className="badge-item">
                                        <i className="fas fa-calendar-alt"></i> {actor.birthday ? new Date(actor.birthday).toLocaleDateString('vi-VN') : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PHẦN 2: TIỂU SỬ */}
                        <div className="actor-section">
                            <div className="section-divider">
                                <h3>Tiểu Sử</h3>
                            </div>
                            <div className="description-text">
                                <p>{actor.biography || "Nghệ sĩ này hiện chưa có thông tin tiểu sử chi tiết."}</p>
                            </div>
                        </div>

                        {/* PHẦN 3: CÁC PHIM THAM GIA (POSTER DỌC) */}
                        <div className="actor-section">
                            <div className="section-divider">
                                <h3>Các Phim Đã Tham Gia</h3>
                            </div>
                            <div className="actor-movie-grid">
                                {actor.movies && actor.movies.length > 0 ? (
                                    actor.movies.map((movie) => (
                                        <div 
                                            key={movie.movie_id}
                                            className="actor-movie-card"
                                            onClick={() => navigate(`/movies/${movie.slug}`)}
                                        >
                                            <div className="actor-movie-poster">
                                                <img 
                                                    src={`https://webcinema-zb8z.onrender.com/uploads/posters/${movie.poster_url}`} 
                                                    alt={movie.title}
                                                    onError={(e) => { e.target.style.visibility = 'hidden'; }}
                                                />
                                            </div>
                                            <div className="actor-movie-info">
                                                <h4>{movie.title}</h4>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-movies">Hiện chưa cập nhật danh sách phim tham gia.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: SIDEBAR PHIM ĐANG CHIẾU (POSTER DỌC) */}
                <div className="sidebar-col">
                    <div className="sidebar-section">
                        <div className="sidebar-title-v2">
                            <span className="blue-line">|</span> PHIM ĐANG CHIẾU
                        </div>
                        <div className="sidebar-movie-list">
                            {relatedMovies.map((m, index) => (
                                <div 
                                    key={index} 
                                    className="sidebar-movie-item-vertical" 
                                    onClick={() => navigate(`/movies/detail/${m.slug}`)}
                                >
                                    <div className="sidebar-poster-vertical">
                                        <img 
                                            src={`https://webcinema-zb8z.onrender.com/uploads/posters/${m.poster_url}`} 
                                            alt={m.title} 
                                        />
                                        {/* Overlay nhãn tuổi và rating */}
                                        <div className="movie-meta-overlay">
                                            <span className="rating-tag"><i className="fas fa-star"></i> 8.6</span>
                                            <span className="age-limit-tag">T18</span>
                                        </div>
                                    </div>
                                    <div className="sidebar-info-v2">
                                        <h4 className="sidebar-movie-name">{m.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ActorDetail;