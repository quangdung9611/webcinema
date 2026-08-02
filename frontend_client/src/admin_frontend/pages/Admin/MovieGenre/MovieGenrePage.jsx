import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api/api';  // ✅ Import api thay vì axios
import { Tags, Save, Loader2, ChevronDown, Search, X } from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';
import AdminPagination from '../../../components/AdminPagination';

import '../../../styles/MovieGenrePage.css';

// ❌ Xóa các API constants

const DEFAULT_POSTER =
    'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-poster.jpg';

const getPosterUrl = (poster) => {
    if (!poster) return DEFAULT_POSTER;
    if (poster.startsWith('http://') || poster.startsWith('https://')) {
        return poster;
    }
    return `https://api.quangdungcinema.id.vn/uploads/posters/${poster}`;
};

const MovieGenrePage = () => {
    /* =====================================================
        STATES
    ===================================================== */
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [movieGenreMap, setMovieGenreMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Modal states
    const [genreModalOpen, setGenreModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [tempGenres, setTempGenres] = useState([]);
    const [genreSearch, setGenreSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(4);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
    });

    /* =====================================================
        ALERT MODAL
    ===================================================== */
    const showAlert = (title, message, onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal((prev) => ({ ...prev, open: false }));
    };

    /* =====================================================
        FETCH DATA
    ===================================================== */
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resMovies, resGenres, resAssignments] = await Promise.all([
                api.get('/api/movies'),                           // ✅ Dùng api
                api.get('/api/genres'),                           // ✅ Dùng api
                api.get('/api/movie-genres/all-assignments'),     // ✅ Dùng api
            ]);

            setMovies(resMovies.data);
            setGenres(resGenres.data);

            const initialMap = {};
            resMovies.data.forEach((movie) => {
                initialMap[movie.movie_id] = [];
            });

            if (resAssignments.data && Array.isArray(resAssignments.data)) {
                resAssignments.data.forEach((item) => {
                    initialMap[item.movie_id] = item.genre_ids || [];
                });
            }

            setMovieGenreMap(initialMap);
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
        MODAL HANDLERS
    ===================================================== */
    const openGenreModal = (movie) => {
        setSelectedMovie(movie);
        setTempGenres(movieGenreMap[movie.movie_id] || []);
        setGenreSearch('');
        setGenreModalOpen(true);
    };

    const closeGenreModal = () => {
        setGenreModalOpen(false);
        setSelectedMovie(null);
        setTempGenres([]);
        setGenreSearch('');
    };

    const handleCheckboxChange = (genreId) => {
        setTempGenres((prev) => {
            const isSelected = prev.includes(genreId);
            return isSelected
                ? prev.filter((id) => id !== genreId)
                : [...prev, genreId];
        });
    };

    const handleSaveGenres = async () => {
        if (!selectedMovie) return;

        setSaving(true);
        try {
            await api.post('/api/movie-genres/update', {   // ✅ Dùng api
                movie_id: selectedMovie.movie_id,
                genre_ids: tempGenres,
            });

            setMovieGenreMap((prev) => ({
                ...prev,
                [selectedMovie.movie_id]: tempGenres,
            }));

            showAlert('Thành công', `Đã cập nhật thể loại cho phim "${selectedMovie.title}".`);
            closeGenreModal();
        } catch (error) {
            showAlert('Lỗi', 'Không thể cập nhật thể loại.');
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
        FILTER MOVIES
    ===================================================== */
    const filteredMovies = useMemo(() => {
        return movies.filter((movie) => {
            const keyword = search.toLowerCase();
            return movie.title?.toLowerCase().includes(keyword);
        });
    }, [movies, search]);

    /* =====================================================
        PAGINATION
    ===================================================== */
    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    const currentMovies = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMovies.slice(start, start + itemsPerPage);
    }, [filteredMovies, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    /* =====================================================
        RENDER
    ===================================================== */
    return (
        <>
            <AdminPage
                title="Quản lý thể loại phim"
                subtitle="Thiết lập thể loại cho từng phim"
                icon={<Tags size={30} />}
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
                        <div className="movie-genre-page">
                            {currentMovies.length === 0 ? (
                                <div className="admin-empty-data">
                                    {search ? 'Không tìm thấy phim phù hợp.' : 'Không có dữ liệu phim.'}
                                </div>
                            ) : (
                                currentMovies.map((movie) => {
                                    const selectedGenres = movieGenreMap[movie.movie_id] || [];

                                    return (
                                        <div key={movie.movie_id} className="movie-genre-card">
                                            <img
                                                src={getPosterUrl(movie.movie_poster)}
                                                alt={movie.title}
                                                className="movie-genre-poster"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_POSTER;
                                                }}
                                            />
                                            <div className="movie-genre-content">
                                                <h3>{movie.title}</h3>

                                                <button
                                                    type="button"
                                                    className="movie-select-trigger"
                                                    onClick={() => openGenreModal(movie)}
                                                >
                                                    <span>
                                                        {selectedGenres.length > 0
                                                            ? `Đã chọn ${selectedGenres.length} thể loại`
                                                            : 'Chọn thể loại'}
                                                    </span>
                                                    <ChevronDown size={18} />
                                                </button>
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

            {/* =====================================================
                GENRE MODAL (AdminModal)
            ===================================================== */}
            <AdminModal
                open={genreModalOpen}
                onClose={closeGenreModal}
                title={`Chọn thể loại - ${selectedMovie?.title || ''}`}
                size="md"
            >
                <div className="movie-genre-modal-content">
                    {/* Search */}
                    <div className="movie-select-search-wrapper">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Tìm thể loại..."
                            value={genreSearch}
                            onChange={(e) => setGenreSearch(e.target.value)}
                        />
                    </div>

                    {/* Danh sách thể loại */}
                    <div className="movie-genre-modal-list">
                        {genres
                            .filter((genre) =>
                                genre.genre_name
                                    .toLowerCase()
                                    .includes(genreSearch.toLowerCase())
                            )
                            .map((genre) => (
                                <label key={genre.genre_id} className="movie-select-item">
                                    <input
                                        type="checkbox"
                                        checked={tempGenres.includes(genre.genre_id)}
                                        onChange={() => handleCheckboxChange(genre.genre_id)}
                                    />
                                    <span>{genre.genre_name}</span>
                                </label>
                            ))}
                    </div>

                    {/* Actions */}
                    <div className="movie-genre-modal-actions">
                        <button
                            type="button"
                            className="movie-genre-cancel-btn"
                            onClick={closeGenreModal}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="movie-genre-save-btn"
                            onClick={handleSaveGenres}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="spin-icon" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Lưu
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ALERT MODAL */}
            <AdminModal open={alertModal.open} onClose={closeAlert} title={alertModal.title}>
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

export default MovieGenrePage;