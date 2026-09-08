// pages/admin/MovieShowtimeConfigPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../api/api';
import {
    Save,
    Plus,
    Trash2,
    Loader2,
    Film,
    ArrowLeft,
    Settings,
    ChevronDown,
    ChevronUp,
    Search
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';
import '../../../styles/MovieShowtimeConfigPage.css'; //

// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_SLOTS = [
    { key: 'MORNING', label: '🌅 SÁNG (06:00 - 12:00)' },
    { key: 'AFTERNOON', label: '☀️ TRƯA (12:00 - 17:00)' },
    { key: 'EVENING', label: '🌆 CHIỀU (17:00 - 20:00)' },
    { key: 'NIGHT', label: '🌙 TỐI (20:00 - 24:00)' }
];

const ROOM_TYPES = ['2D', '3D', 'VIP', 'IMAX'];

const DAY_TYPES = [
    { key: 'ALL', label: 'Tất cả các ngày' },
    { key: 'WEEKDAY', label: 'Ngày thường (T2-T6)' },
    { key: 'WEEKEND', label: 'Cuối tuần (T7-CN)' }
];

// ==========================================================
// COMPONENT
// ==========================================================

const MovieShowtimeConfigPage = () => {
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedMovies, setSelectedMovies] = useState([]);
    const [searchMovie, setSearchMovie] = useState('');
    const [configs, setConfigs] = useState({});
    const [expandedMovies, setExpandedMovies] = useState({});
    
    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default'
    });

    const showAlert = (title, message, type = 'default') => {
        setAlertModal({ open: true, title, message, type });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, open: false });
    };

    // Load dữ liệu ban đầu
    useEffect(() => {
        fetchMovies();
        fetchCinemas();
    }, []);

    // Load config khi chọn rạp hoặc chọn phim
    useEffect(() => {
        if (selectedCinema && selectedMovies.length > 0) {
            loadAllConfigs();
        }
    }, [selectedCinema, selectedMovies]);

    // Lấy danh sách phim
    const fetchMovies = async () => {
        try {
            const res = await api.get('/api/movies');
            setMovies(res.data.data || []);
        } catch (error) {
            console.error('Lỗi load phim:', error);
            showAlert('Lỗi', 'Không thể tải danh sách phim', 'error');
        }
    };

    // Lấy danh sách rạp
    const fetchCinemas = async () => {
        try {
            const res = await api.get('/api/cinemas');
            setCinemas(res.data.data || []);
            if (res.data.data && res.data.data.length > 0) {
                setSelectedCinema(res.data.data[0].cinema_id);
            }
        } catch (error) {
            console.error('Lỗi load rạp:', error);
            showAlert('Lỗi', 'Không thể tải danh sách rạp', 'error');
        }
    };

    // Load config cho tất cả phim đã chọn
    const loadAllConfigs = async () => {
        setLoading(true);
        const newConfigs = {};
        
        for (const movieId of selectedMovies) {
            try {
                const res = await api.get(`/api/admin/movies/${movieId}/showtime-config?cinema_id=${selectedCinema}`);
                newConfigs[movieId] = res.data.data || [];
            } catch (error) {
                newConfigs[movieId] = [];
            }
        }
        
        setConfigs(newConfigs);
        setLoading(false);
    };

    // Thêm phim vào danh sách chọn
    const toggleMovieSelection = (movieId) => {
        setSelectedMovies(prev => {
            if (prev.includes(movieId)) {
                return prev.filter(id => id !== movieId);
            } else {
                return [...prev, movieId];
            }
        });
        setExpandedMovies(prev => ({
            ...prev,
            [movieId]: true
        }));
    };

    // Toggle expand/collapse của phim
    const toggleExpand = (movieId) => {
        setExpandedMovies(prev => ({
            ...prev,
            [movieId]: !prev[movieId]
        }));
    };

    // Thêm dòng cấu hình cho 1 phim
    const addConfig = (movieId) => {
        setConfigs(prev => ({
            ...prev,
            [movieId]: [
                ...(prev[movieId] || []),
                {
                    time_slot: 'MORNING',
                    room_type: '2D',
                    slot_count: 1,
                    interval_minutes: 45,
                    day_type: 'ALL',
                    is_active: 1
                }
            ]
        }));
    };

    // Xóa dòng cấu hình của 1 phim
    const removeConfig = async (movieId, index) => {
        const movieConfigs = configs[movieId] || [];
        const newConfigs = [...movieConfigs];
        const removed = newConfigs.splice(index, 1)[0];
        
        if (removed.config_id) {
            try {
                await api.delete(`/api/admin/movies/${movieId}/showtime-config/${removed.config_id}`);
                setConfigs(prev => ({
                    ...prev,
                    [movieId]: newConfigs
                }));
                showAlert('Thành công', 'Xóa cấu hình thành công', 'success');
            } catch (err) {
                console.error('Lỗi xóa config:', err);
                showAlert('Lỗi', 'Không thể xóa cấu hình', 'error');
            }
        } else {
            setConfigs(prev => ({
                ...prev,
                [movieId]: newConfigs
            }));
        }
    };

    // Cập nhật giá trị của 1 config cho 1 phim
    const updateConfig = (movieId, index, field, value) => {
        setConfigs(prev => {
            const movieConfigs = [...(prev[movieId] || [])];
            movieConfigs[index] = { ...movieConfigs[index], [field]: value };
            return { ...prev, [movieId]: movieConfigs };
        });
    };

    // Lưu tất cả config cho tất cả phim
    const handleSaveAll = async () => {
        if (!selectedCinema) {
            showAlert('Lỗi', 'Vui lòng chọn rạp', 'error');
            return;
        }

        if (selectedMovies.length === 0) {
            showAlert('Lỗi', 'Vui lòng chọn ít nhất 1 phim', 'error');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorCount = 0;

        for (const movieId of selectedMovies) {
            const movieConfigs = configs[movieId] || [];
            const validConfigs = movieConfigs.filter(c => c.slot_count > 0);
            
            if (validConfigs.length === 0) continue;

            try {
                await api.post(`/api/admin/movies/${movieId}/showtime-config`, {
                    cinema_id: selectedCinema,
                    configs: validConfigs.map(c => ({
                        time_slot: c.time_slot,
                        room_type: c.room_type,
                        slot_count: c.slot_count,
                        interval_minutes: c.interval_minutes,
                        day_type: c.day_type || 'ALL',
                        is_active: c.is_active !== undefined ? c.is_active : 1
                    }))
                });
                successCount++;
            } catch (error) {
                console.error(`Lỗi lưu config cho phim ${movieId}:`, error);
                errorCount++;
            }
        }

        setSaving(false);

        if (errorCount === 0) {
            showAlert('Thành công', `Lưu cấu hình thành công cho ${successCount} phim!`, 'success');
        } else {
            showAlert('Thông báo', `Lưu thành công ${successCount} phim, thất bại ${errorCount} phim`, 'warning');
        }
        
        await loadAllConfigs();
    };

    const filteredMovies = movies.filter(movie => 
        movie.title.toLowerCase().includes(searchMovie.toLowerCase())
    );

    const getMovieTitle = (movieId) => {
        const movie = movies.find(m => m.movie_id === movieId);
        return movie?.title || `Phim #${movieId}`;
    };

    const getTotalSlots = (movieId) => {
        const movieConfigs = configs[movieId] || [];
        return movieConfigs.filter(c => c.slot_count > 0 && c.is_active === 1).length;
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <Loader2 size={32} className="spin-icon" />
                <span>Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <>
            <AdminPage
                title="Cấu hình lịch chiếu"
                subtitle="Cấu hình suất chiếu cho nhiều phim cùng lúc"
                icon={<Settings size={30} />}
                buttonText="Quay lại"
                onAdd={() => navigate('/admin/showtime-config')}
                buttonIcon={<ArrowLeft size={18} />}
            >
                <div className="movie-showtime-config-page">
                    
                    {/* Chọn rạp */}
                    <div className="cinema-select-wrapper">
                        <label className="cinema-select-label">🏠 Chọn rạp:</label>
                        <select 
                            value={selectedCinema}
                            onChange={(e) => setSelectedCinema(e.target.value)}
                            className="cinema-select"
                        >
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>
                                    {c.cinema_name} - {c.city || ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chọn phim */}
                    {selectedCinema && (
                        <div className="movie-select-wrapper">
                            <label className="movie-select-label">
                                🎬 Chọn phim để cấu hình
                                <span className="movie-select-hint">
                                    (Có thể chọn nhiều phim)
                                </span>
                            </label>
                            
                            <div className="movie-search-wrapper">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Tìm phim..."
                                    value={searchMovie}
                                    onChange={(e) => setSearchMovie(e.target.value)}
                                    className="movie-search-input"
                                />
                                <span className="selected-count">
                                    Đã chọn: {selectedMovies.length} phim
                                </span>
                            </div>

                            <div className="movie-list">
                                {filteredMovies.map(movie => {
                                    const isChecked = selectedMovies.includes(movie.movie_id);
                                    return (
                                        <label key={movie.movie_id} className={`movie-chip ${isChecked ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleMovieSelection(movie.movie_id)}
                                            />
                                            {movie.title}
                                            {isChecked && (
                                                <span className="movie-chip-badge">
                                                    {getTotalSlots(movie.movie_id)} suất
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                                {filteredMovies.length === 0 && (
                                    <span className="no-movies">Không tìm thấy phim</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Cấu hình cho từng phim */}
                    {selectedCinema && selectedMovies.length > 0 && (
                        <div className="config-container">
                            {selectedMovies.map((movieId, idx) => {
                                const movieConfigs = configs[movieId] || [];
                                const isExpanded = expandedMovies[movieId] !== false;
                                const movieTitle = getMovieTitle(movieId);
                                const totalSlots = getTotalSlots(movieId);

                                return (
                                    <div key={movieId} className="movie-config-card">
                                        <div 
                                            className={`movie-config-header ${isExpanded ? 'expanded' : ''}`}
                                            onClick={() => toggleExpand(movieId)}
                                        >
                                            <div className="movie-config-title">
                                                <span className="movie-config-index">{idx + 1}.</span>
                                                <span className="movie-config-name">🎬 {movieTitle}</span>
                                                <span className="movie-config-badge">{totalSlots} suất</span>
                                            </div>
                                            <div className="movie-config-toggle">
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="movie-config-body">
                                                <div className="config-actions">
                                                    <button 
                                                        className="btn-add-row"
                                                        onClick={() => addConfig(movieId)}
                                                    >
                                                        <Plus size={16} /> Thêm dòng
                                                    </button>
                                                </div>

                                                {movieConfigs.length === 0 ? (
                                                    <div className="empty-config">
                                                        <p>Chưa có cấu hình cho phim này</p>
                                                        <p className="empty-hint">Bấm "Thêm dòng" để bắt đầu</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="config-table-header">
                                                            <span>Khung giờ</span>
                                                            <span>Loại phòng</span>
                                                            <span>Số suất</span>
                                                            <span>K/c (phút)</span>
                                                            <span>Áp dụng</span>
                                                            <span>Bật</span>
                                                            <span></span>
                                                        </div>

                                                        {movieConfigs.map((config, index) => (
                                                            <div key={index} className="config-table-row">
                                                                <select 
                                                                    value={config.time_slot}
                                                                    onChange={(e) => updateConfig(movieId, index, 'time_slot', e.target.value)}
                                                                    className="config-select"
                                                                >
                                                                    {TIME_SLOTS.map(s => <option key={s.key} value={s.key}>{s.label.split(' ')[0]}</option>)}
                                                                </select>

                                                                <select 
                                                                    value={config.room_type}
                                                                    onChange={(e) => updateConfig(movieId, index, 'room_type', e.target.value)}
                                                                    className="config-select"
                                                                >
                                                                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                                </select>

                                                                <input 
                                                                    type="number" 
                                                                    value={config.slot_count}
                                                                    onChange={(e) => updateConfig(movieId, index, 'slot_count', Number(e.target.value))}
                                                                    min="0"
                                                                    max="30"
                                                                    className="config-input config-input-number"
                                                                />

                                                                <input 
                                                                    type="number" 
                                                                    value={config.interval_minutes}
                                                                    onChange={(e) => updateConfig(movieId, index, 'interval_minutes', Number(e.target.value))}
                                                                    min="30"
                                                                    max="120"
                                                                    step="5"
                                                                    className="config-input config-input-number"
                                                                />

                                                                <select 
                                                                    value={config.day_type || 'ALL'}
                                                                    onChange={(e) => updateConfig(movieId, index, 'day_type', e.target.value)}
                                                                    className="config-select"
                                                                >
                                                                    {DAY_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                                                </select>

                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={config.is_active === 1}
                                                                    onChange={(e) => updateConfig(movieId, index, 'is_active', e.target.checked ? 1 : 0)}
                                                                    className="config-checkbox"
                                                                />

                                                                <button 
                                                                    className="btn-remove-row"
                                                                    onClick={() => removeConfig(movieId, index)}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="save-all-wrapper">
                                <button 
                                    className="btn-save-all" 
                                    onClick={handleSaveAll} 
                                    disabled={saving || selectedMovies.length === 0}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="spin-icon" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Lưu tất cả ({selectedMovies.length} phim)
                                        </>
                                    )}
                                </button>
                                <span className="save-hint">
                                    💡 Cấu hình sẽ được lưu cho từng phim
                                </span>
                            </div>
                        </div>
                    )}

                    {selectedCinema && selectedMovies.length === 0 && (
                        <div className="empty-state">
                            <Film size={48} className="empty-icon" />
                            <p className="empty-title">Chưa chọn phim nào</p>
                            <p className="empty-subtitle">Hãy chọn ít nhất 1 phim ở trên để cấu hình</p>
                        </div>
                    )}
                </div>
            </AdminPage>

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
                onConfirm={closeAlert}
                confirmText="Đóng"
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};

export default MovieShowtimeConfigPage;