import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api/api';
import { Tags, Save, Loader2, ChevronDown, Search, X } from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';
import AdminPagination from '../../../components/AdminPagination';

import '../../../styles/MovieGenrePage.css';

const DEFAULT_POSTER = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-poster.jpg';
const getPosterUrl = (poster) => {
    if (!poster) return DEFAULT_POSTER;
    if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
    return `https://api.quangdungcinema.id.vn/uploads/posters/${poster}`;
};

// ✅ Hàm parse dữ liệu an toàn, hỗ trợ nhiều cấu trúc
const extractData = (response) => {
    // Ưu tiên lấy response.data.data nếu là mảng
    if (response?.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
    }
    // Nếu response.data là mảng
    if (response?.data && Array.isArray(response.data)) {
        return response.data;
    }
    // Nếu response là mảng trực tiếp
    if (Array.isArray(response)) {
        return response;
    }
    return [];
};

const MovieGenrePage = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [movieGenreMap, setMovieGenreMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [genreModalOpen, setGenreModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [tempGenres, setTempGenres] = useState([]);
    const [genreSearch, setGenreSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(4);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
    });

    const showAlert = (title, message, onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, onConfirm, onCancel });
    };

    const closeAlert = () => setAlertModal((prev) => ({ ...prev, open: false }));

    // =====================================================
    // FETCH DATA
    // =====================================================
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resMovies, resGenres, resAssignments] = await Promise.all([
                api.get('/api/movies'),
                api.get('/api/genres'),
                api.get('/api/movie-genres'),
            ]);

            console.log('🔍 Raw Movies:', resMovies.data);
            console.log('🔍 Raw Genres:', resGenres.data);
            console.log('🔍 Raw Assignments:', resAssignments.data);

            const moviesData = extractData(resMovies);
            const genresData = extractData(resGenres);
            const assignmentsData = extractData(resAssignments);

            console.log('✅ Parsed Movies:', moviesData);
            console.log('✅ Parsed Genres:', genresData);
            console.log('✅ Parsed Assignments:', assignmentsData);

            setMovies(Array.isArray(moviesData) ? moviesData : []);
            setGenres(Array.isArray(genresData) ? genresData : []);

            const initialMap = {};
            (Array.isArray(moviesData) ? moviesData : []).forEach((movie) => {
                initialMap[movie.movie_id] = [];
            });

            if (Array.isArray(assignmentsData)) {
                assignmentsData.forEach((item) => {
                    if (initialMap[item.movie_id] !== undefined) {
                        initialMap[item.movie_id] = item.genre_ids || [];
                    }
                });
            }

            console.log('📦 Final Map:', initialMap);
            setMovieGenreMap(initialMap);
        } catch (error) {
            console.error('❌ Fetch error:', error);
            showAlert('Lỗi', 'Không thể tải dữ liệu hệ thống.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // =====================================================
    // MODAL HANDLERS
    // =====================================================
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
            await api.post('/api/movie-genres/update', {
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

    // =====================================================
    // RENDER
    // =====================================================
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

            {/* GENRE MODAL */}
            <AdminModal
                open={genreModalOpen}
                onClose={closeGenreModal}
                title={`Chọn thể loại - ${selectedMovie?.title || ''}`}
                size="md"
            >
                <div className="movie-genre-modal-content">
                    <div className="movie-select-search-wrapper">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Tìm thể loại..."
                            value={genreSearch}
                            onChange={(e) => setGenreSearch(e.target.value)}
                        />
                    </div>

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