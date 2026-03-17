import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../../../styles/MovieGenreList.css";
import Modal from '../../../components/Modal';

const MovieGenreList = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [movieGenreMap, setMovieGenreMap] = useState({});
    const [loading, setLoading] = useState(true);

    const [modal, setModal] = useState({
        show: false,
        type: 'success',
        title: '',
        message: ''
    });

    const openModal = (type, title, message) => {
        setModal({ show: true, type, title, message });
    };

    const closeModal = () => {
        setModal({ ...modal, show: false });
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [resMovies, resGenres, resAssignments] = await Promise.all([
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/genres'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/movie-genres/all-assignments')
                ]);
                
                setMovies(resMovies.data);
                setGenres(resGenres.data);

                const initialMap = {};
                
                // 1. Khởi tạo mảng rỗng cho tất cả phim để tránh lỗi map undefined
                resMovies.data.forEach(m => {
                    initialMap[m.movie_id] = [];
                });

                // 2. [SỬA TẠI ĐÂY] Đưa mảng genre_ids từ Backend vào Map
                if (resAssignments.data && Array.isArray(resAssignments.data)) {
                    resAssignments.data.forEach(item => {
                        // Vì bây giờ item.genre_ids đã là một mảng [5, 7] 
                        // nên mình gán trực tiếp luôn, không cần .push() từng cái nữa
                        initialMap[item.movie_id] = item.genre_ids || [];
                    });
                }

                setMovieGenreMap(initialMap);
                setLoading(false);
            } catch (err) {
                console.error("Lỗi tải dữ liệu:", err);
                openModal('error', 'Lỗi kết nối', 'Không thể lấy dữ liệu từ Server.');
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleCheckboxChange = (movieId, genreId) => {
        setMovieGenreMap(prev => {
            const currentGenres = prev[movieId] || [];
            const isSelected = currentGenres.includes(genreId);
            const newGenres = isSelected
                ? currentGenres.filter(id => id !== genreId) 
                : [...currentGenres, genreId];
            
            return { ...prev, [movieId]: newGenres };
        });
    };

    const handleSaveRow = async (movie) => {
        try {
            await axios.post('https://webcinema-zb8z.onrender.com/api/movie-genres/update', {
                movie_id: movie.movie_id,
                genre_ids: movieGenreMap[movie.movie_id] || []
            });
            
            openModal('success', 'Thành công', `Đã cập nhật thể loại cho phim "${movie.title}".`);
        } catch (err) {
            console.error("Lỗi khi lưu:", err);
            openModal('error', 'Thất bại', 'Không thể lưu thay đổi.');
        }
    };

    if (loading) return <div className="loading">Đang tải dữ liệu hệ thống...</div>;

    return (
        <div className="movie-genre-wrapper">
            <div className="admin-header-flex">
                <h2 className="column-header">Quản lý gán thể loại phim</h2>
                <p className="subtitle">Tick chọn thể loại và nhấn Lưu để cập nhật cho từng phim</p>
            </div>

            <div className="table-container">
                <table className="assignment-table">
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>Phim</th>
                            <th style={{ width: '60%' }}>Thiết lập thể loại</th>
                            <th style={{ width: '15%' }} className="text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movies.map((m) => (
                            <tr key={m.movie_id}>
                                <td className="movie-info-cell">
                                    <div className="movie-item-content">
                                        <img 
                                            src={`https://webcinema-zb8z.onrender.com/uploads/posters/${m.poster_url}`} 
                                            alt={m.title} 
                                            className="table-poster"
                                        />
                                        <div>
                                            <div className="title-text">{m.title}</div>
                                            <small>{m.status}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="genre-checkbox-grid">
                                        {genres.map((g) => (
                                            <label key={g.genre_id} className="genre-checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    checked={(movieGenreMap[m.movie_id] || []).includes(g.genre_id)}
                                                    onChange={() => handleCheckboxChange(m.movie_id, g.genre_id)}
                                                />
                                                <span className="genre-name">{g.genre_name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </td>
                                <td className="text-center">
                                    <button 
                                        className="btn-save-row"
                                        onClick={() => handleSaveRow(m)}
                                    >
                                        Lưu
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal 
                show={modal.show}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={closeModal}
                onCancel={closeModal}
            />
        </div>
    );
};

export default MovieGenreList;