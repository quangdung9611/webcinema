import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import axios from 'axios';
import '../styles/MovieSidebar.css';

const MovieSidebar = ({ IMAGE_BASE_URL, title = "Phim Đang Chiếu" }) => {
    const navigate = useNavigate();
    const { slug } = useParams(); // Lấy slug hiện tại để lọc trùng
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Endpoint Render của Dũng
    const API_URL = 'https://webcinema-zb8z.onrender.com/api';

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                // Sửa thành /category/ theo đúng router.get('/category/:statusSlug') của Dũng
                const response = await axios.get(`${API_URL}/movies/category/phim-dang-chieu`);
                
                // Controller của Dũng trả về mảng rows trực tiếp nên response.data là mảng
                if (response.data && Array.isArray(response.data)) {
                    const filteredMovies = response.data
                        .filter(m => m.slug !== slug) // Không hiện phim đang xem
                        .slice(0, 5); // Lấy 5 phim thôi cho sidebar đẹp
                    
                    setMovies(filteredMovies);
                }
            } catch (error) {
                console.error("Lỗi gọi API Sidebar:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [slug]); // Load lại khi đổi phim

    if (loading || !movies || movies.length === 0) return null;

    return (
        <div className="cinemastar-sidebar-container">
            <div className="cinemastar-sidebar-title">
                <span>{title}</span>
                <div className="title-underline"></div>
            </div>
            <div className="cinemastar-list-wrapper">
                {movies.map((m, index) => (
                    <div 
                        key={index} 
                        className="cinemastar-backdrop-item" 
                        onClick={() => {
                            navigate(`/movies/detail/${m.slug}`);
                            window.scrollTo(0, 0);
                        }}
                    >
                        <div className="backdrop-img-box">
                            <img 
                                src={`${IMAGE_BASE_URL}/backdrops/${m.backdrop_url}`} 
                                alt={m.title} 
                            />
                        </div>
                        <div className="backdrop-movie-name">{m.title}</div>
                    </div>
                ))}
            </div>
            <button 
                className="cinemastar-viewall-btn" 
                onClick={() => navigate('/movies/category/phim-dang-chieu')}
            >
                <span>Xem tất cả phim</span>
                <ChevronRight size={18} />
            </button>
        </div>
    );
};

export default MovieSidebar;