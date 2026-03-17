import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Save, ArrowLeft, Loader2, Film, MapPin, Monitor } from 'lucide-react';

// Sử dụng chung Style với UserUpdate để giao diện đồng bộ
import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

const ShowtimeUpdate = () => {
    const { showtime_id } = useParams(); 
    const navigate = useNavigate();

    // --- 1. QUẢN LÝ STATE ---
    const [formData, setFormData] = useState({
        showtime_id: '',
        movie_id: '',
        cinema_id: '',
        room_id: '',
        start_time: ''
    });

    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // --- 2. EFFECT: LẤY DỮ LIỆU BAN ĐẦU ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // CẬP NHẬT ĐƯỜNG DẪN: Thêm /detail/ vào trước showtime_id cho đúng Router mới
                const [movieRes, cinemaRes, showtimeRes] = await Promise.all([
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/cinemas'),
                    axios.get(`https://webcinema-zb8z.onrender.com/api/showtimes/detail/${showtime_id}`)
                ]);

                setMovies(movieRes.data);
                setCinemas(cinemaRes.data);

                const st = showtimeRes.data;
                if (st) {
                    // Lấy danh sách phòng của rạp hiện tại
                    const roomRes = await axios.get(`https://webcinema-zb8z.onrender.com/api/rooms/cinema/${st.cinema_id}`);
                    setRooms(roomRes.data);

                    // Định dạng thời gian chuẩn cho input datetime-local
                    const date = new Date(st.start_time);
                    const formattedTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                                            .toISOString().slice(0, 16);
                    
                    setFormData({
                        showtime_id: st.showtime_id,
                        movie_id: st.movie_id,
                        cinema_id: st.cinema_id,
                        room_id: st.room_id,
                        start_time: formattedTime
                    });
                }
            } catch (err) {
                showNotice('error', 'LỖI TẢI DỮ LIỆU', 'Không thể lấy thông tin suất chiếu từ máy chủ.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showtime_id]);

    // --- 3. HELPERS ---
    const showNotice = (type, title, message, onConfirm = null) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCinemaChange = async (e) => {
        const newCinemaId = e.target.value;
        setFormData(prev => ({ ...prev, cinema_id: newCinemaId, room_id: '' }));
        
        if (newCinemaId) {
            try {
                const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/rooms/cinema/${newCinemaId}`);
                setRooms(res.data);
            } catch (err) {
                console.error("Lỗi tải danh sách phòng:", err);
            }
        } else {
            setRooms([]);
        }
    };

    // --- 4. XỬ LÝ CẬP NHẬT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // CẬP NHẬT ĐƯỜNG DẪN: Thêm /update/ vào trước showtime_id cho đúng Router mới
            await axios.put(`https://webcinema-zb8z.onrender.com/api/showtimes/update/${showtime_id}`, formData);
            
            showNotice(
                'success',
                'CẬP NHẬT THÀNH CÔNG',
                'Thông tin suất chiếu đã được lưu lại.',
                () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/admin/showtimes');
                }
            );
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Lỗi khi cập nhật suất chiếu.';
            showNotice('error', 'CẬP NHẬT THẤT BẠI', errorMsg);
        }
    };

    if (loading) {
        return (
            <div className="loader">
                <Loader2 size={32} className="spin-icon" /> Đang tải dữ liệu...
            </div>
        );
    }

    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <h2>CHỈNH SỬA SUẤT CHIẾU</h2>
            <p className="update-subtitle">Sửa suất chiếu: <strong>#{showtime_id}</strong></p>
            
            <form onSubmit={handleSubmit}>
                <div className="update-form-grid">
                    <div className="update-field full-width">
                        <label><Film size={16} /> Bộ phim</label>
                        <select name="movie_id" value={formData.movie_id} onChange={handleInputChange} required>
                            <option value="">-- Chọn phim --</option>
                            {movies.map(m => (
                                <option key={m.movie_id} value={m.movie_id}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="update-field">
                        <label><MapPin size={16} /> Rạp chiếu</label>
                        <select name="cinema_id" value={formData.cinema_id} onChange={handleCinemaChange} required>
                            <option value="">-- Lựa chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="update-field">
                        <label><Monitor size={16} /> Phòng chiếu</label>
                        <select 
                            name="room_id" 
                            value={formData.room_id} 
                            onChange={handleInputChange} 
                            required 
                            disabled={!formData.cinema_id}
                        >
                            <option value="">-- Chọn phòng --</option>
                            {rooms.map(r => (
                                <option key={r.room_id} value={r.room_id}>{r.room_name} ({r.room_type})</option>
                            ))}
                        </select>
                    </div>

                    <div className="update-field full-width">
                        <label><Calendar size={16} /> Thời gian bắt đầu</label>
                        <input 
                            name="start_time"
                            type="datetime-local" 
                            value={formData.start_time}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button type="button" className="btn-go-back" onClick={() => navigate('/admin/showtimes')}>
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    
                    <button type="submit" className="btn-submit-update">
                        <Save size={18} /> Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ShowtimeUpdate;