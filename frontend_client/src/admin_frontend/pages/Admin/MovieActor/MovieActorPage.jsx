import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users,
    Save,
    Loader2,
    ChevronDown,
    Search
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/MovieActorPage.css';

const MOVIES_API = 'https://api.quangdungcinema.id.vn/api/movies';
const ACTORS_API = 'https://api.quangdungcinema.id.vn/api/actors';
const ASSIGNMENTS_API = 'https://api.quangdungcinema.id.vn/api/movie-actors/all-assignments';
const UPDATE_API = 'https://api.quangdungcinema.id.vn/api/movie-actors/update';

// =============================================
// HELPER: LẤY URL POSTER (HỖ TRỢ CLOUDINARY + LOCAL)
// =============================================
const getPosterUrl = (poster) => {
    if (!poster) return '';
    if (poster.startsWith('http://') || poster.startsWith('https://')) {
        return poster;
    }
    return `https://api.quangdungcinema.id.vn/uploads/posters/${poster}`;
};

const MovieActorPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [movies, setMovies] = useState([]);
    const [actors, setActors] = useState([]);
    const [movieActorMap, setMovieActorMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [openDropdown, setOpenDropdown] = useState(null);
    const [actorSearch, setActorSearch] = useState('');

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    /* =====================================================
        ALERT MODAL
    ===================================================== */

    const showAlert = (title, message, onConfirm = null, onCancel = null) => {
        setAlertModal({
            open: true,
            title,
            message,
            onConfirm,
            onCancel
        });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({
            ...prev,
            open: false
        }));
    };

    /* =====================================================
        FETCH DATA
    ===================================================== */

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resMovies, resActors, resAssignments] = await Promise.all([
                axios.get(MOVIES_API),
                axios.get(ACTORS_API),
                axios.get(ASSIGNMENTS_API)
            ]);

            setMovies(resMovies.data);
            setActors(resActors.data);

            const initialMap = {};
            resMovies.data.forEach(movie => {
                initialMap[movie.movie_id] = [];
            });

            if (resAssignments.data && Array.isArray(resAssignments.data)) {
                resAssignments.data.forEach(item => {
                    initialMap[item.movie_id] = item.actor_ids || [];
                });
            }

            setMovieActorMap(initialMap);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải dữ liệu hệ thống.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /* =====================================================
        HANDLE CHECKBOX
    ===================================================== */

    const handleCheckboxChange = (movieId, actorId) => {
        setMovieActorMap(prev => {
            const currentActors = prev[movieId] || [];
            const isSelected = currentActors.includes(actorId);
            const newActors = isSelected
                ? currentActors.filter(id => id !== actorId)
                : [...currentActors, actorId];

            return {
                ...prev,
                [movieId]: newActors
            };
        });
    };

    /* =====================================================
        SAVE ACTORS
    ===================================================== */

    const handleSaveActors = async (movie) => {
        try {
            await axios.post(UPDATE_API, {
                movie_id: movie.movie_id,
                actor_ids: movieActorMap[movie.movie_id] || []
            });
            showAlert('Thành công', `Đã cập nhật diễn viên cho phim "${movie.title}".`);
        } catch (error) {
            showAlert('Lỗi', 'Không thể cập nhật diễn viên.');
        }
    };

    /* =====================================================
        FILTER MOVIES
    ===================================================== */

    const filteredMovies = movies.filter(movie => {
        const keyword = search.toLowerCase();
        return movie.title?.toLowerCase().includes(keyword);
    });

    /* =====================================================
        FILTER ACTORS
    ===================================================== */

    const filteredActors = actors.filter(actor =>
        actor.name?.toLowerCase().includes(actorSearch.toLowerCase())
    );

    /* =====================================================
        RENDER
    ===================================================== */

    return (
        <>
            <AdminPage
                title="Quản lý diễn viên phim"
                subtitle="Thiết lập diễn viên cho từng phim"
                icon={<Users size={30} />}
                buttonText={null}
                searchValue={search}
                onSearchChange={setSearch}
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <div className="movie-actor-page">
                        {filteredMovies.length === 0 ? (
                            <div className="admin-empty-data">Không có dữ liệu phim.</div>
                        ) : (
                            filteredMovies.map(movie => {
                                const selectedActors = movieActorMap[movie.movie_id] || [];
                                // ✅ Lấy poster URL với helper hỗ trợ Cloudinary
                                const posterUrl = getPosterUrl(movie.poster_url);

                                return (
                                    <div key={movie.movie_id} className="movie-actor-card">
                                        {/* =======================
                                            POSTER
                                        ======================= */}
                                        <img
                                            src={posterUrl}
                                            alt={movie.title}
                                            className="movie-actor-poster"
                                        />

                                        {/* =======================
                                            INFO
                                        ======================= */}
                                        <div className="movie-actor-content">
                                            <h3>{movie.title}</h3>
                                            <span className="movie-status">{movie.status}</span>

                                            {/* =======================
                                                SELECT BOX
                                            ======================= */}
                                            <div className="actor-select-wrapper">
                                                <div
                                                    className="actor-select-box"
                                                    onClick={() => {
                                                        if (openDropdown === movie.movie_id) {
                                                            setOpenDropdown(null);
                                                        } else {
                                                            setOpenDropdown(movie.movie_id);
                                                            setActorSearch('');
                                                        }
                                                    }}
                                                >
                                                    <span>
                                                        {selectedActors.length > 0
                                                            ? `Đã chọn ${selectedActors.length} diễn viên`
                                                            : 'Chọn diễn viên'}
                                                    </span>
                                                    <ChevronDown
                                                        size={18}
                                                        className={openDropdown === movie.movie_id ? 'rotate-icon' : ''}
                                                    />
                                                </div>

                                                {openDropdown === movie.movie_id && (
                                                    <div className="actor-dropdown">
                                                        {/* SEARCH */}
                                                        <div className="actor-search-box">
                                                            <Search size={16} />
                                                            <input
                                                                type="text"
                                                                placeholder="Tìm diễn viên..."
                                                                value={actorSearch}
                                                                onChange={(e) => setActorSearch(e.target.value)}
                                                            />
                                                        </div>

                                                        {/* LIST */}
                                                        <div className="actor-dropdown-list">
                                                            {filteredActors.map(actor => (
                                                                <label key={actor.actor_id} className="actor-dropdown-item">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedActors.includes(actor.actor_id)}
                                                                        onChange={() =>
                                                                            handleCheckboxChange(movie.movie_id, actor.actor_id)
                                                                        }
                                                                    />
                                                                    <span>{actor.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* =======================
                                                BUTTON
                                            ======================= */}
                                            <button
                                                className="movie-actor-save-btn"
                                                onClick={() => handleSaveActors(movie)}
                                            >
                                                <Save size={16} />
                                                Lưu
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </AdminPage>

            {/* =============================================
                ALERT MODAL
            ============================================= */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                    <div className="admin-alert-actions">
                        <button
                            className="admin-confirm-btn"
                            onClick={alertModal.onConfirm || closeAlert}
                        >
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default MovieActorPage;