import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Eye } from 'lucide-react'; 
import MovieSidebar from '../components/MovieSidebar'; 
import '../styles/Actor.css';

const Actor = () => {
    const navigate = useNavigate();
    
    const [actors, setActors] = useState([]);      // Danh sách diễn viên
    const [allMovies, setAllMovies] = useState([]); // Tất cả phim để truyền vào Sidebar
    const [loading, setLoading] = useState(true);

    const IMAGE_BASE_URL = 'https://webcinema-zb8z.onrender.com/uploads';

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                // Gọi song song cả Actors và Movies giống CinemaGenre gọi Movies/Genres
                const [resActors, resMovies] = await Promise.all([
                    axios.get('https://webcinema-zb8z.onrender.com/api/actors'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies')
                ]);

                setActors(resActors.data);
                setAllMovies(resMovies.data);
                
                setLoading(false);
            } catch (error) {
                console.error("Lỗi kết nối API:", error);
                setLoading(false);
            }
        };

        fetchAllData();
        window.scrollTo(0, 0);
    }, []);

    if (loading) return <div className="loading">Đang tải dữ liệu từ hệ thống...</div>;

    return (
        <div className="actor-page-bg">
            <div className="actor-content-flex">
                
                {/* CỘT TRÁI: MAIN CONTENT (7.5) */}
                <div className="main-actor-col">
                    <div className="section-header-galaxy">
                        <span className="blue-line"></span>
                        <h2 className="section-title">DIỄN VIÊN</h2>
                    </div>
                    
                    <div className="actor-filters-bar">
                        <select className="filter-select-custom">
                            <option value="">Tất cả quốc gia</option>
                            <option value="vn">Việt Nam</option>
                            <option value="us">Mỹ</option>
                            <option value="kr">Hàn Quốc</option>
                        </select>
                    </div>

                    <div className="actor-list">
                        {actors.length > 0 ? (
                            actors.map(actor => (
                                <div key={actor.actor_id} className="actor-card-horizontal">
                                    <Link 
                                        to={`/actor/${actor.slug}`} 
                                        className="actor-img-box"
                                    >
                                        <img 
                                            src={`${IMAGE_BASE_URL}/actors/${actor.avatar}`} 
                                            alt={actor.name} 
                                        />
                                    </Link>

                                    <div className="actor-content-info">
                                        <Link 
                                            to={`/actor/${actor.slug}`} 
                                            className="actor-name-link"
                                        >
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
                                            {actor.biography 
                                                ? actor.biography.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') 
                                                : "Thông tin tiểu sử đang được cập nhật..."}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">Hiện chưa có dữ liệu diễn viên.</p>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI: SIDEBAR (2.5) */}
                <div className="sidebar-col">
                    <MovieSidebar 
                        IMAGE_BASE_URL={IMAGE_BASE_URL}
                        title="Phim Đang Chiếu"
                        relatedMovies={allMovies.slice(0, 6)} // Lấy 6 phim đầu tiên hiện lên Sidebar
                    />
                </div>

            </div>
        </div>
    );
};

export default Actor;