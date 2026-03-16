import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Eye, ChevronRight } from 'lucide-react'; 
import '../styles/Actor.css';

const Actor = () => {
    const navigate = useNavigate();
    const [actors, setActors] = useState([]);
    const [relatedMovies, setRelatedMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const resActors = await axios.get('http://localhost:5000/api/actors');
                setActors(resActors.data);

                const resMovies = await axios.get(`http://localhost:5000/api/movies`);
                setRelatedMovies(resMovies.data.slice(0, 3));
                
                setLoading(false);
            } catch (error) {
                console.error("Lỗi gọi API:", error);
                setLoading(false);
            }
        };
        fetchData();
        window.scrollTo(0, 0);
    }, []);

    if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

    return (
        <div className="actor-page-bg">
            <div className="actor-content-flex">
                
                {/* CỘT TRÁI: DANH SÁCH DIỄN VIÊN */}
                <div className="main-actor-col">
                    <div className="section-header-galaxy">
                        <span className="blue-line"></span>
                        <h2 className="section-title">DIỄN VIÊN</h2>
                    </div>
                    
                    <div className="actor-filters-bar">
                        <select className="filter-select">
                            <option value="">Quốc Gia</option>
                            <option>Việt Nam</option>
                            <option>Mỹ</option>
                        </select>
                        <select className="filter-select">
                            <option value="">Xem Nhiều Nhất</option>
                        </select>
                    </div>

                    <div className="actor-list">
                        {actors.map(actor => (
                            <div key={actor.actor_id} className="actor-card-horizontal">
                                <Link to={`/actor/${actor.slug}`} className="actor-img-box">
                                    <img 
                                        src={`http://localhost:5000/uploads/actors/${actor.avatar}`} 
                                        alt={actor.name} 
                                    />
                                </Link>
                                <div className="actor-content-info">
                                    <Link to={`/actor/${actor.slug}`} className="actor-name-link">
                                        <h3>{actor.name}</h3>
                                    </Link>
                                    <div className="actor-meta-row">
                                        <button className="btn-fb-like">
                                            <ThumbsUp size={14} strokeWidth={2.5} fill="currentColor" /> 
                                            <span>Thích</span>
                                        </button>
                                        <span className="view-count">
                                            <Eye size={14} strokeWidth={2} /> 
                                            <span>{Math.floor(Math.random() * 5000)} lượt xem</span>
                                        </span>
                                    </div>
                                    <p className="actor-biography-text">
                                        {actor.biography || "Thông tin tiểu sử đang được cập nhật..."}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- SIDEBAR: PHIM ĐANG CHIẾU (TỐI GIẢN) --- */}
                <div className="sidebar-col">
                    <div className="sidebar-title">Phim Đang Chiếu</div>
                    <div className="sidebar-movie-list">
                        {relatedMovies.map((m, index) => (
                            <div key={index} className="simple-movie-item" onClick={() => navigate(`/movies/detail/${m.slug}`)}>
                                <div className="simple-poster">
                                    <img 
                                        src={`http://localhost:5000/uploads/posters/${m.poster_url}`} 
                                        alt={m.title} 
                                    />
                                </div>
                                {/* Tên phim nằm rời hẳn ở dưới hình */}
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

export default Actor;