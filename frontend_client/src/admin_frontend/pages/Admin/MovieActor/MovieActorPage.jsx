import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users,
    Save,
    Loader2,
    ChevronDown,
    Search,
    X
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/MovieActorPage.css';

const MOVIES_API = 'https://api.quangdungcinema.id.vn/api/movies';
const ACTORS_API = 'https://api.quangdungcinema.id.vn/api/actors';
const ASSIGNMENTS_API = 'https://api.quangdungcinema.id.vn/api/movie-actors/all-assignments';
const UPDATE_API = 'https://api.quangdungcinema.id.vn/api/movie-actors/update';

// =============================================
// HELPER: LẤY URL POSTER (GIỐNG MovieGenrePage)
// =============================================
const DEFAULT_POSTER =
    'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-poster.jpg';

const getPosterUrl = (poster) => {
    if (!poster) return DEFAULT_POSTER;
    if (poster.startsWith('http://') || poster.startsWith('https://')) {
        return poster;
    }
    return `https://api.quangdungcinema.id.vn/uploads/posters/${poster}`;
};

// =============================================
// HELPER: LẤY URL AVATAR ACTOR
// =============================================
const DEFAULT_AVATAR =
    'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-avatar.jpg';

const getAvatarUrl = (avatar) => {
    if (!avatar) return DEFAULT_AVATAR;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }
    return `https://api.quangdungcinema.id.vn/uploads/actors/${avatar}`;
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
        REMOVE ACTOR (Từ danh sách đã chọn)
    ===================================================== */

    const handleRemoveActor = (movieId, actorId) => {
        setMovieActorMap(prev => {
            const currentActors = prev[movieId] || [];
            return {
                ...prev,
                [movieId]: currentActors.filter(id => id !== actorId)
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
                                const selectedActorIds = movieActorMap[movie.movie_id] || [];
                                const selectedActors = actors.filter(a => selectedActorIds.includes(a.actor_id));
                                const posterUrl = getPosterUrl(movie.movie_poster || movie.poster_url);

                                return (
                                    <div key={movie.movie_id} className="movie-actor-card">
                                        {/* =======================
                                            POSTER
                                        ======================= */}
                                        <img
                                            src={posterUrl}
                                            alt={movie.title}
                                            className="movie-actor-poster"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = DEFAULT_POSTER;
                                            }}
                                        />

                                        {/* =======================
                                            INFO
                                        ======================= */}
                                        <div className="movie-actor-content">
                                            <h3>{movie.title}</h3>
                                            <span className="movie-status">{movie.status}</span>

                                            {/* =======================
                                                SELECTED ACTORS (VERTICAL SCROLL)
                                            ======================= */}
                                            <div className="actor-selected-list">
                                                {selectedActors.length > 0 ? (
                                                    selectedActors.map(actor => (
                                                        <div key={actor.actor_id} className="actor-selected-item">
                                                            <img
                                                                src={getAvatarUrl(actor.actor_avatar)}
                                                                alt={actor.name}
                                                                className="actor-avatar-small"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = DEFAULT_AVATAR;
                                                                }}
                                                            />
                                                            <span className="actor-name">{actor.name}</span>
                                                            <button
                                                                className="actor-remove-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveActor(movie.movie_id, actor.actor_id);
                                                                }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="actor-empty-text">Chưa có diễn viên</span>
                                                )}
                                            </div>

                                            {/* =======================
                                                SELECT BOX
                                            ======================= */}
                                            <div className="movie-select-box">
                                                <div
                                                    className="movie-select-trigger"
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
                                                        {selectedActorIds.length > 0
                                                            ? `${selectedActorIds.length} diễn viên đã chọn`
                                                            : 'Chọn diễn viên'}
                                                    </span>
                                                    <ChevronDown
                                                        size={18}
                                                        className={openDropdown === movie.movie_id ? 'rotate-icon' : ''}
                                                    />
                                                </div>

                                                {openDropdown === movie.movie_id && (
                                                    <div className="movie-select-dropdown">
                                                        {/* SEARCH */}
                                                        <div className="movie-select-search-wrapper">
                                                            <Search size={16} />
                                                            <input
                                                                type="text"
                                                                placeholder="Tìm diễn viên..."
                                                                className="movie-select-search"
                                                                value={actorSearch}
                                                                onChange={(e) => setActorSearch(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>

                                                        {/* OPTIONS */}
                                                        <div className="movie-select-options">
                                                            {filteredActors.length === 0 ? (
                                                                <div className="movie-no-result">Không tìm thấy diễn viên</div>
                                                            ) : (
                                                                filteredActors.map(actor => (
                                                                    <label key={actor.actor_id} className="movie-select-item">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedActorIds.includes(actor.actor_id)}
                                                                            onChange={() =>
                                                                                handleCheckboxChange(movie.movie_id, actor.actor_id)
                                                                            }
                                                                        />
                                                                        <img
                                                                            src={getAvatarUrl(actor.actor_avatar)}
                                                                            alt={actor.name}
                                                                            className="actor-avatar-dropdown"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.src = DEFAULT_AVATAR;
                                                                            }}
                                                                        />
                                                                        <span>{actor.name}</span>
                                                                    </label>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* =======================
                                                BUTTON
                                            ======================= */}
                                            <button
                                                className="movie-genre-save-btn"
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