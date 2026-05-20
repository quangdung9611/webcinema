import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    Tags,
    Save,
    Loader2,
    ChevronDown,
    Search
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/MovieGenrePage.css';

const MOVIES_API =
    'https://api.quangdungcinema.id.vn/api/movies';

const GENRES_API =
    'https://api.quangdungcinema.id.vn/api/genres';

const ASSIGNMENTS_API =
    'https://api.quangdungcinema.id.vn/api/movie-genres/all-assignments';

const UPDATE_API =
    'https://api.quangdungcinema.id.vn/api/movie-genres/update';

const MovieGenrePage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [movies, setMovies] = useState([]);

    const [genres, setGenres] = useState([]);

    const [movieGenreMap, setMovieGenreMap] = useState({});

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [openMovieId, setOpenMovieId] =
        useState(null);

    const [genreSearch, setGenreSearch] =
        useState('');

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

    const showAlert = (
        title,
        message,
        onConfirm = null,
        onCancel = null
    ) => {

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

            const [
                resMovies,
                resGenres,
                resAssignments
            ] = await Promise.all([
                axios.get(MOVIES_API),
                axios.get(GENRES_API),
                axios.get(ASSIGNMENTS_API)
            ]);

            setMovies(resMovies.data);

            setGenres(resGenres.data);

            const initialMap = {};

            resMovies.data.forEach(movie => {

                initialMap[movie.movie_id] = [];

            });

            if (
                resAssignments.data &&
                Array.isArray(resAssignments.data)
            ) {

                resAssignments.data.forEach(item => {

                    initialMap[item.movie_id] =
                        item.genre_ids || [];

                });

            }

            setMovieGenreMap(initialMap);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải dữ liệu hệ thống.'
            );

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

    const handleCheckboxChange = (
        movieId,
        genreId
    ) => {

        setMovieGenreMap(prev => {

            const currentGenres =
                prev[movieId] || [];

            const isSelected =
                currentGenres.includes(genreId);

            const newGenres = isSelected
                ? currentGenres.filter(
                    id => id !== genreId
                )
                : [
                    ...currentGenres,
                    genreId
                ];

            return {
                ...prev,
                [movieId]: newGenres
            };

        });

    };

    /* =====================================================
        SAVE GENRES
    ===================================================== */

    const handleSaveGenres = async (movie) => {

        try {

            await axios.post(
                UPDATE_API,
                {
                    movie_id: movie.movie_id,
                    genre_ids:
                        movieGenreMap[movie.movie_id] || []
                }
            );

            showAlert(
                'Thành công',
                `Đã cập nhật thể loại cho phim "${movie.title}".`
            );

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể cập nhật thể loại.'
            );

        }

    };

    /* =====================================================
        FILTER MOVIES
    ===================================================== */

    const filteredMovies = movies.filter(movie => {

        const keyword =
            search.toLowerCase();

        return (
            movie.title
                ?.toLowerCase()
                .includes(keyword)
        );

    });

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

                {
                    loading ? (

                        <div className="admin-loading">

                            <Loader2
                                size={32}
                                className="spin-icon"
                            />

                            <span>
                                Đang tải dữ liệu...
                            </span>

                        </div>

                    ) : (

                        <div className="movie-genre-page">

                            {
                                filteredMovies.length === 0 ? (

                                    <div className="admin-empty-data">
                                        Không có dữ liệu phim.
                                    </div>

                                ) : (

                                    filteredMovies.map(movie => {

                                        const selectedGenres =
                                            movieGenreMap[
                                                movie.movie_id
                                            ] || [];

                                        const isOpen =
                                            openMovieId ===
                                            movie.movie_id;

                                        return (

                                            <div
                                                key={movie.movie_id}
                                                className="movie-genre-card"
                                            >

                                                {/* =======================
                                                    POSTER
                                                ======================= */}

                                                <img
                                                    src={`https://api.quangdungcinema.id.vn/uploads/posters/${movie.poster_url}`}
                                                    alt={movie.title}
                                                    className="movie-genre-poster"
                                                />

                                                {/* =======================
                                                    INFO
                                                ======================= */}

                                                <div className="movie-genre-content">

                                                    <h3>
                                                        {movie.title}
                                                    </h3>

                                                    <span className="movie-status">
                                                        {movie.status}
                                                    </span>

                                                    {/* =======================
                                                        SELECT BOX
                                                    ======================= */}

                                                    <div className="movie-select-box">

                                                        <div
                                                            className="movie-select-trigger"
                                                            onClick={() => {

                                                                setOpenMovieId(
                                                                    isOpen
                                                                        ? null
                                                                        : movie.movie_id
                                                                );

                                                                setGenreSearch('');

                                                            }}
                                                        >

                                                            <span>

                                                                {
                                                                    selectedGenres.length > 0
                                                                        ? `Đã chọn ${selectedGenres.length} thể loại`
                                                                        : 'Chọn thể loại'
                                                                }

                                                            </span>

                                                            <ChevronDown
                                                                size={18}
                                                                className={
                                                                    isOpen
                                                                        ? 'rotate-icon'
                                                                        : ''
                                                                }
                                                            />

                                                        </div>

                                                        {
                                                            isOpen && (

                                                                <div className="movie-select-dropdown">

                                                                    {/* SEARCH */}

                                                                    <div className="movie-select-search-wrapper">

                                                                        <Search size={16} />

                                                                        <input
                                                                            type="text"
                                                                            placeholder="Tìm thể loại..."
                                                                            className="movie-select-search"
                                                                            value={genreSearch}
                                                                            onChange={(e) =>
                                                                                setGenreSearch(
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        />

                                                                    </div>

                                                                    {/* OPTIONS */}

                                                                    <div className="movie-select-options">

                                                                        {
                                                                            genres
                                                                                .filter(genre =>
                                                                                    genre.genre_name
                                                                                        .toLowerCase()
                                                                                        .includes(
                                                                                            genreSearch.toLowerCase()
                                                                                        )
                                                                                )
                                                                                .map(genre => (

                                                                                    <label
                                                                                        key={genre.genre_id}
                                                                                        className="movie-select-item"
                                                                                    >

                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={
                                                                                                selectedGenres.includes(
                                                                                                    genre.genre_id
                                                                                                )
                                                                                            }
                                                                                            onChange={() =>
                                                                                                handleCheckboxChange(
                                                                                                    movie.movie_id,
                                                                                                    genre.genre_id
                                                                                                )
                                                                                            }
                                                                                        />

                                                                                        <span>
                                                                                            {
                                                                                                genre.genre_name
                                                                                            }
                                                                                        </span>

                                                                                    </label>

                                                                                ))
                                                                        }

                                                                    </div>

                                                                </div>

                                                            )
                                                        }

                                                    </div>

                                                    {/* =======================
                                                        BUTTON
                                                    ======================= */}

                                                    <button
                                                        className="movie-genre-save-btn"
                                                        onClick={() =>
                                                            handleSaveGenres(movie)
                                                        }
                                                    >

                                                        <Save size={16} />

                                                        Lưu

                                                    </button>

                                                </div>

                                            </div>

                                        );

                                    })

                                )
                            }

                        </div>

                    )
                }

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

                    <p>
                        {alertModal.message}
                    </p>

                    <div className="admin-alert-actions">

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm || closeAlert
                            }
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