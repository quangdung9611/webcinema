import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api/api';
import { Users, Loader2, Search, X, ChevronDown, Save } from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';
import AdminPagination from '../../../components/AdminPagination';

import '../../../styles/MovieActorPage.css';

const DEFAULT_POSTER = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-poster.jpg';
const getPosterUrl = (poster) => {
    if (!poster) return DEFAULT_POSTER;
    if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
    return `https://api.quangdungcinema.id.vn/uploads/posters/${poster}`;
};

const DEFAULT_AVATAR = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-avatar.jpg';
const getAvatarUrl = (avatar) => {
    if (!avatar) return DEFAULT_AVATAR;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `https://api.quangdungcinema.id.vn/uploads/actors/${avatar}`;
};

const extractData = (response) => {
    if (response?.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
    }
    if (response?.data && Array.isArray(response.data)) {
        return response.data;
    }
    if (Array.isArray(response)) {
        return response;
    }
    return [];
};

const MovieActorPage = () => {
    const [movies, setMovies] = useState([]);
    const [actors, setActors] = useState([]);
    const [movieActorMap, setMovieActorMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [actorModalOpen, setActorModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [actorSearch, setActorSearch] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(4);

    // ======================================================
    // ALERT MODAL (giống UserPage)
    // ======================================================
    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({
            open: true,
            title,
            message,
            type,
            onConfirm,
            onCancel
        });
    };

    const closeAlert = () => {
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // =====================================================
    // FETCH DATA
    // =====================================================
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resMovies, resActors, resAssignments] = await Promise.all([
                api.get('/api/movies'),
                api.get('/api/actors'),
                api.get('/api/movie-actors'),
            ]);

            console.log('🔍 Raw Movies:', resMovies.data);
            console.log('🔍 Raw Actors:', resActors.data);
            console.log('🔍 Raw Assignments:', resAssignments.data);

            const moviesData = extractData(resMovies);
            const actorsData = extractData(resActors);
            const assignmentsData = extractData(resAssignments);

            console.log('✅ Parsed Movies:', moviesData);
            console.log('✅ Parsed Actors:', actorsData);
            console.log('✅ Parsed Assignments:', assignmentsData);

            setMovies(Array.isArray(moviesData) ? moviesData : []);
            setActors(Array.isArray(actorsData) ? actorsData : []);

            const initialMap = {};
            (Array.isArray(moviesData) ? moviesData : []).forEach((movie) => {
                initialMap[movie.movie_id] = [];
            });

            if (Array.isArray(assignmentsData)) {
                assignmentsData.forEach((item) => {
                    if (initialMap[item.movie_id] !== undefined) {
                        initialMap[item.movie_id] = item.actor_ids || [];
                    }
                });
            }

            console.log('📦 Final Actor Map:', initialMap);
            setMovieActorMap(initialMap);
        } catch (error) {
            console.error('❌ Fetch error:', error);
            showAlert('Lỗi', 'Không thể tải dữ liệu hệ thống.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // =====================================================
    // HANDLERS
    // =====================================================
    const handleCheckboxChange = (movieId, actorId) => {
        setMovieActorMap((prev) => {
            const currentActors = prev[movieId] || [];
            const isSelected = currentActors.includes(actorId);
            const newActors = isSelected
                ? currentActors.filter((id) => id !== actorId)
                : [...currentActors, actorId];
            return { ...prev, [movieId]: newActors };
        });
    };

    const handleRemoveActor = (movieId, actorId) => {
        setMovieActorMap((prev) => {
            const currentActors = prev[movieId] || [];
            return {
                ...prev,
                [movieId]: currentActors.filter((id) => id !== actorId),
            };
        });
    };

    const handleSaveActors = async () => {
        if (!selectedMovie) return;
        try {
            await api.post('/api/movie-actors/update', {
                movie_id: selectedMovie.movie_id,
                actor_ids: movieActorMap[selectedMovie.movie_id] || [],
            });
            setActorModalOpen(false);
            showAlert('Thành công', `Đã cập nhật diễn viên cho phim "${selectedMovie.title}".`, 'success');
        } catch (error) {
            console.error('SAVE ACTORS ERROR:', error);
            showAlert('Lỗi', 'Không thể cập nhật diễn viên.', 'error');
        }
    };

    // =====================================================
    // FILTER & PAGINATION
    // =====================================================
    const filteredMovies = useMemo(() => {
        return movies.filter((movie) => {
            const keyword = search.toLowerCase();
            return movie.title?.toLowerCase().includes(keyword);
        });
    }, [movies, search]);

    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    const currentMovies = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMovies.slice(start, start + itemsPerPage);
    }, [filteredMovies, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const filteredActors = actors.filter((actor) =>
        actor.name?.toLowerCase().includes(actorSearch.toLowerCase())
    );

    // =====================================================
    // RENDER
    // =====================================================
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
                    <>
                        <div className="movie-actor-page">
                            {currentMovies.length === 0 ? (
                                <div className="admin-empty-data">
                                    {search ? 'Không tìm thấy phim phù hợp.' : 'Không có dữ liệu phim.'}
                                </div>
                            ) : (
                                currentMovies.map((movie) => {
                                    const selectedActorIds = movieActorMap[movie.movie_id] || [];
                                    const selectedActors = actors.filter((a) =>
                                        selectedActorIds.includes(a.actor_id)
                                    );

                                    return (
                                        <div key={movie.movie_id} className="movie-actor-card">
                                            <img
                                                src={getPosterUrl(movie.movie_poster)}
                                                alt={movie.title}
                                                className="movie-actor-poster"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_POSTER;
                                                }}
                                            />
                                            <div className="movie-actor-content">
                                                <h3>{movie.title}</h3>
                                                <span className="movie-status">{movie.status}</span>

                                                <div className="actor-selected-list">
                                                    {selectedActors.length > 0 ? (
                                                        selectedActors.map((actor) => (
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

                                                <div className="movie-select-box">
                                                    <button
                                                        type="button"
                                                        className="movie-select-trigger"
                                                        onClick={() => {
                                                            setSelectedMovie(movie);
                                                            setActorSearch('');
                                                            setActorModalOpen(true);
                                                        }}
                                                    >
                                                        <span>
                                                            {selectedActorIds.length > 0
                                                                ? `${selectedActorIds.length} diễn viên đã chọn`
                                                                : 'Chọn diễn viên'}
                                                        </span>
                                                        <ChevronDown size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {filteredMovies.length > itemsPerPage && (
                            <AdminPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                MODAL CHỌN DIỄN VIÊN
            ================================================== */}
            <AdminModal
                open={actorModalOpen}
                onClose={() => setActorModalOpen(false)}
                title={`Chọn diễn viên cho "${selectedMovie?.title || ''}"`}
                type="default"
                size="md"
            >
                <div className="actor-modal-content">
                    <div className="movie-select-search-wrapper">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Tìm diễn viên..."
                            value={actorSearch}
                            onChange={(e) => setActorSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="actor-modal-options">
                        {filteredActors.length === 0 ? (
                            <div className="movie-no-result">Không tìm thấy diễn viên</div>
                        ) : (
                            filteredActors.map((actor) => {
                                const isChecked = (movieActorMap[selectedMovie?.movie_id] || []).includes(actor.actor_id);
                                return (
                                    <label key={actor.actor_id} className="movie-select-item">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                                handleCheckboxChange(selectedMovie?.movie_id, actor.actor_id)
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
                                );
                            })
                        )}
                    </div>
                    <div className="admin-form-footer">
                        <button className="admin-cancel-btn" onClick={() => setActorModalOpen(false)}>
                            Hủy
                        </button>
                        <button className="admin-confirm-btn" onClick={handleSaveActors}>
                            <Save size={16} /> Lưu
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL (giống UserPage)
            ================================================== */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
                onConfirm={alertModal.onConfirm || closeAlert}
                onCancel={alertModal.onCancel || closeAlert}
                confirmText="Xác nhận"
                cancelText="Hủy"
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};

export default MovieActorPage;