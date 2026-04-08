import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserForm.css'; // Dùng chung style với UserForm của bạn
import Modal from '../../../components/Modal';

const ShowtimeAdd = () => {
    const navigate = useNavigate();

    // ==========================================
    // 1. KHỞI TẠO STATE
    // ==========================================
    const [formData, setFormData] = useState({
        movie_id: '',
        cinema_id: '',
        room_id: '',
        start_time: ''
    });

    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]); // Danh sách phòng lọc theo rạp

    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // ==========================================
    // 2. LOAD DỮ LIỆU BAN ĐẦU
    // ==========================================
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [movieRes, cinemaRes] = await Promise.all([
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/cinemas')
                ]);
                setMovies(movieRes.data);
                setCinemas(cinemaRes.data);
            } catch (err) {
                console.error("Lỗi tải dữ liệu danh mục:", err);
            }
        };
        fetchData();
    }, []);

    // Load danh sách phòng khi chọn rạp (Cinema)
    useEffect(() => {
        if (formData.cinema_id) {
            const fetchRooms = async () => {
                try {
                    const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/rooms/cinema/${formData.cinema_id}`);
                    setRooms(res.data);
                } catch (err) {
                    console.error("Lỗi tải danh sách phòng:", err);
                }
            };
            fetchRooms();
        } else {
            setRooms([]);
        }
    }, [formData.cinema_id]);

    // ==========================================
    // 3. LOGIC TRỢ GIÚP & VALIDATE
    // ==========================================
    const validateForm = () => {
        let newErrors = {};
        if (!formData.movie_id) newErrors.movie_id = "Vui lòng chọn phim";
        if (!formData.cinema_id) newErrors.cinema_id = "Vui lòng chọn rạp chiếu";
        if (!formData.room_id) newErrors.room_id = "Vui lòng chọn phòng chiếu";
        if (!formData.start_time) {
            newErrors.start_time = "Vui lòng chọn thời gian chiếu";
        } else {
            const selectedDate = new Date(formData.start_time);
            if (selectedDate < new Date()) {
                newErrors.start_time = "Thời gian chiếu không được ở quá khứ";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ==========================================
    // 4. XỬ LÝ SỰ KIỆN (HANDLERS)
    // ==========================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        // XỬ LÝ DỮ LIỆU TRƯỚC KHI GỬI: Bỏ chữ T trong start_time
        const finalData = {
            ...formData,
            start_time: formData.start_time.replace('T', ' ')
        };

        try {
            // Gửi finalData thay vì formData gốc
            await axios.post('https://webcinema-zb8z.onrender.com/api/showtimes/add', finalData);
            
            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Suất chiếu đã được tạo thành công!`,
                onConfirm: () => {
                    setModal({ show: false });
                    navigate('/admin/showtimes');
                }
            });
        } catch (err) {
            setModal({
                show: true,
                type: 'error',
                title: 'LỖI HỆ THỐNG',
                message: err.response?.data?.error || "Không thể tạo suất chiếu. Vui lòng thử lại.",
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />
            
            <h2>THÊM SUẤT CHIẾU MỚI</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Chọn phim chiếu</label>
                    <select name="movie_id" value={formData.movie_id} onChange={handleChange}>
                        <option value="">-- Chọn phim --</option>
                        {movies.map(m => (
                            <option key={m.movie_id} value={m.movie_id}>{m.title}</option>
                        ))}
                    </select>
                    {errors.movie_id && <span className="error-text">{errors.movie_id}</span>}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Rạp chiếu</label>
                        <select name="cinema_id" value={formData.cinema_id} onChange={handleChange}>
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
                            ))}
                        </select>
                        {errors.cinema_id && <span className="error-text">{errors.cinema_id}</span>}
                    </div>

                    <div className="form-group">
                        <label>Phòng chiếu</label>
                        <select 
                            name="room_id" 
                            value={formData.room_id} 
                            onChange={handleChange}
                            disabled={!formData.cinema_id}
                        >
                            <option value="">-- Chọn phòng --</option>
                            {rooms.map(r => (
                                <option key={r.room_id} value={r.room_id}>
                                    {r.room_name} ({r.room_type})
                                </option>
                            ))}
                        </select>
                        {errors.room_id && <span className="error-text">{errors.room_id}</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label>Thời gian bắt đầu</label>
                    <input 
                        name="start_time" 
                        type="datetime-local" 
                        value={formData.start_time}
                        onChange={handleChange} 
                    />
                    {errors.start_time && <span className="error-text">{errors.start_time}</span>}
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu suất chiếu</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/admin/showtimes')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default ShowtimeAdd;