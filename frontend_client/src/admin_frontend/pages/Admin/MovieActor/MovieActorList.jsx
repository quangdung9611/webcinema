import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../../../styles/MovieActorList.css";
import Modal from '../../../components/Modal';

const MovieActorList = () => {
    const [movies, setMovies] = useState([]);
    const [actors, setActors] = useState([]);
    const [movieActorMap, setMovieActorMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeMovieId, setActiveMovieId] = useState(null); 
    const [searchTerm, setSearchTerm] = useState("");

    const [modal, setModal] = useState({ show: false, type: 'success', title: '', message: '' });
    const closeModal = () => setModal({ ...modal, show: false });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [resMovies, resActors, resAssignments] = await Promise.all([
                    axios.get('http://localhost:5000/api/movies'),
                    axios.get('http://localhost:5000/api/actors'),
                    axios.get('http://localhost:5000/api/movie-actors/all-assignments')
                ]);
                setMovies(resMovies.data);
                setActors(resActors.data);
                const initialMap = {};
                resMovies.data.forEach(m => { initialMap[m.movie_id] = []; });
                if (resAssignments.data) {
                    resAssignments.data.forEach(item => {
                        initialMap[item.movie_id] = item.actor_ids || [];
                    });
                }
                setMovieActorMap(initialMap);
                setLoading(false);
            } catch (err) {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const toggleActor = (movieId, actorId) => {
        setMovieActorMap(prev => {
            const current = prev[movieId] || [];
            const newActors = current.includes(actorId)
                ? current.filter(id => id !== actorId)
                : [...current, actorId];
            return { ...prev, [movieId]: newActors };
        });
    };

    const handleSaveRow = async (movie) => {
        try {
            await axios.post('http://localhost:5000/api/movie-actors/update', {
                movie_id: movie.movie_id,
                actor_ids: movieActorMap[movie.movie_id] || []
            });
            setModal({ show: true, type: 'success', title: 'Thành công', message: `Đã lưu dàn cast phim ${movie.title}` });
            setActiveMovieId(null);
        } catch (err) {
            setModal({ show: true, type: 'error', title: 'Lỗi', message: 'Không thể lưu.' });
        }
    };

    if (loading) return <div className="loading-screen">Đang tải dữ liệu...</div>;

    return (
        <div className="movie-actor-wrapper">
            <h2 className="column-header">Thiết lập diễn viên (Cinema Star)</h2>
            
            {/* Overlay tàng hình để đóng dropdown khi click ra ngoài */}
            {activeMovieId && <div className="click-outside-overlay" onClick={() => setActiveMovieId(null)}></div>}

            <div className="table-container">
                <table className="assignment-table">
                    <thead>
                        <tr>
                            <th width="30%">Phim</th>
                            <th width="55%">Dàn diễn viên</th>
                            <th width="15%" className="text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movies.map((m) => {
                            const selectedIds = movieActorMap[m.movie_id] || [];
                            const isOpen = activeMovieId === m.movie_id;

                            return (
                                <tr key={m.movie_id} className={isOpen ? "row-active" : ""}>
                                    <td className="movie-info-cell">
                                        <img src={`http://localhost:5000/uploads/posters/${m.poster_url}`} className="table-poster" alt="" />
                                        <span className="title-text">{m.title}</span>
                                    </td>
                                    <td>
                                        <div className="custom-select-container">
                                            <div className={`select-box ${isOpen ? "active" : ""}`} 
                                                 onClick={() => {
                                                     setActiveMovieId(isOpen ? null : m.movie_id);
                                                     setSearchTerm("");
                                                 }}>
                                                <span className="placeholder">
                                                    {selectedIds.length > 0 ? `Đã chọn ${selectedIds.length} diễn viên` : "Chọn diễn viên..."}
                                                </span>
                                                <span className={`arrow-icon ${isOpen ? 'up' : ''}`}>▼</span>
                                            </div>

                                            {isOpen && (
                                                <div className="dropdown-list">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Tìm diễn viên nhanh..." 
                                                        className="search-input"
                                                        autoFocus
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                    <div className="options-list">
                                                        {actors.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(a => (
                                                            <div 
                                                                key={a.actor_id} 
                                                                className={`option-item ${selectedIds.includes(a.actor_id) ? 'selected' : ''}`}
                                                                onClick={() => toggleActor(m.movie_id, a.actor_id)}
                                                            >
                                                                <input type="checkbox" checked={selectedIds.includes(a.actor_id)} readOnly />
                                                                <span className="actor-name-text">{a.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <button className="btn-save-row" onClick={() => handleSaveRow(m)}>Lưu lại</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Modal show={modal.show} type={modal.type} title={modal.title} message={modal.message} onConfirm={closeModal} onCancel={closeModal} />
        </div>
    );
};

export default MovieActorList;