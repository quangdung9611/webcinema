import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';
import {
  CheckCircle2,
  MapPin,
  Monitor,
  CalendarDays,
  Clock3,
  Armchair,
  Mail,
  Download,
  House,
  Loader2,
} from 'lucide-react';
import '../styles/ConfirmSuccess.css';

const ConfirmSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printTime, setPrintTime] = useState('');
  const hasConfirmed = useRef(false);

  // Lấy orderId từ location.state hoặc sessionStorage
  const getOrderId = () => {
    const state = location.state?.data || location.state || {};
    const saved = sessionStorage.getItem('lastSuccessTicket');
    const parsed = saved ? JSON.parse(saved) : null;

    const id = state?.orderId || state?.bookingId || parsed?.orderId || parsed?.bookingId;
    return id || null;
  };

  const orderId = getOrderId();

  // Nếu không có orderId -> quay về trang chủ
  useEffect(() => {
    if (!orderId) {
      navigate('/');
    }
  }, [orderId, navigate]);

  // Gọi API lấy chi tiết booking
  useEffect(() => {
    const fetchBooking = async () => {
      if (!orderId || hasConfirmed.current) return;
      hasConfirmed.current = true;

      try {
        const response = await axios.get(
          `https://api.quangdungcinema.id.vn/api/bookings/detail/${orderId}`,
          { withCredentials: true }
        );

        if (response.data.success) {
          const b = response.data.booking;
          const details = response.data.details || [];

          // Xử lý ghế
          const seats = details
            .filter((i) => i.seat_id || i.item_name?.includes('Ghế'))
            .map((i) => i.item_name.replace('Ghế ', '').trim())
            .join(', ');

          // Lấy food (nếu có)
          const foods = details.filter(
            (i) => !i.seat_id && !i.item_name?.includes('Ghế')
          );

          const ticketDataFromAPI = {
            orderId: b.booking_id,
            bookingId: b.booking_id,
            movieTitle: b.movie_name,
            moviePoster: b.movie_poster,
            cinemaName: b.cinema_name,
            roomName: b.room_name,
            startTime: b.start_time?.split(' ')[1]?.substring(0, 5),
            selectedDate: b.start_time?.split(' ')[0]?.split('-').reverse().join('/'),
            seatDisplay: b.seat_label || seats,
            ticketPIN: b.pin || b.memo?.slice(-6),
            customerName: b.full_name,
            customerEmail: b.email, // ✅ ĐÃ CẬP NHẬT TỪ SERVER (EMAIL B)
            selectedFoods: foods,
          };

          setTicketData(ticketDataFromAPI);

          // Cập nhật sessionStorage để dùng cho lần sau
          sessionStorage.setItem('lastSuccessTicket', JSON.stringify(ticketDataFromAPI));

          // Cập nhật user info (nếu cần)
          try {
            const userRes = await axios.get(
              'https://api.quangdungcinema.id.vn/api/auth/me',
              { withCredentials: true }
            );
            if (userRes.data.success) {
              localStorage.setItem('user', JSON.stringify(userRes.data.user));
              window.dispatchEvent(new Event('storage'));
            }
          } catch (e) {
            console.warn('Không lấy được user info:', e.message);
          }
        } else {
          console.error('API không trả về success');
        }
      } catch (err) {
        console.error('❌ Lỗi lấy thông tin vé:', err.message);
        // Nếu lỗi, thử dùng dữ liệu từ sessionStorage
        const saved = sessionStorage.getItem('lastSuccessTicket');
        if (saved) {
          setTicketData(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [orderId]);

  // In thời gian
  useEffect(() => {
    setPrintTime(new Date().toLocaleString('vi-VN'));
    window.scrollTo(0, 0);
  }, []);

  // Hiển thị loading
  if (loading) {
    return (
      <div className="confirm-success-page">
        <div className="success-container" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', height: '60vh' }}>
          <Loader2 size={48} className="spinner" />
          <p style={{ marginTop: '16px', color: '#666' }}>Đang tải thông tin vé...</p>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="confirm-success-page">
        <div className="success-container">
          <h2>Không tìm thấy thông tin vé</h2>
          <button onClick={() => navigate('/')}>Về trang chủ</button>
        </div>
      </div>
    );
  }

  // Destructure
  const {
    movieTitle,
    moviePoster,
    cinemaName,
    roomName,
    startTime,
    selectedDate,
    ticketPIN,
    customerName,
    customerEmail,
    seatDisplay,
    orderId: finalOrderId,
    bookingId,
  } = ticketData;

  const orderIdDisplay = finalOrderId || bookingId;

  // Xử lý poster
  const posterUrl = moviePoster
    ? moviePoster.startsWith('http')
      ? moviePoster
      : `https://api.quangdungcinema.id.vn/uploads/posters/${moviePoster}`
    : null;

  const displayRoom = roomName?.replace('Phòng ', '').trim() || '1';

  return (
    <div className="confirm-success-page">
      <div className="success-overlay"></div>

      <div className="success-container">
        <div className="success-top">
          <div className="success-icon">
            <CheckCircle2 size={70} />
          </div>
          <h1>THANH TOÁN THÀNH CÔNG!</h1>
          <p>
            Cảm ơn <span>{customerName}</span>, giao dịch của bạn đã hoàn tất.
          </p>
          <div className="order-badge">
            Mã đơn hàng: <span>#{orderIdDisplay}</span>
          </div>
        </div>

        <div className="cinema-ticket">
          <div className="ticket-left">
            <div className="poster-box">
              {posterUrl ? (
                <img src={posterUrl} alt={movieTitle} />
              ) : (
                <div className="no-poster">NO IMAGE</div>
              )}
            </div>
            <div className="ticket-info">
              <h2>{movieTitle}</h2>
              <div className="ticket-detail">
                <div className="detail-row">
                  <MapPin size={18} />
                  <span className="label">Rạp</span>
                  <span className="value">{cinemaName}</span>
                </div>
                <div className="detail-row">
                  <Monitor size={18} />
                  <span className="label">Phòng</span>
                  <span className="value">{displayRoom}</span>
                </div>
                <div className="detail-row">
                  <CalendarDays size={18} />
                  <span className="label">Ngày chiếu</span>
                  <span className="value">{selectedDate}</span>
                </div>
                <div className="detail-row">
                  <Clock3 size={18} />
                  <span className="label">Suất chiếu</span>
                  <span className="value">{startTime}</span>
                </div>
                <div className="detail-row">
                  <Armchair size={18} />
                  <span className="label">Ghế ngồi</span>
                  <span className="seat-value">{seatDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ticket-divider">
            <div className="circle-top"></div>
            <div className="dash-line"></div>
            <div className="circle-bottom"></div>
          </div>

          <div className="ticket-right">
            <p className="pin-title">MÃ NHẬN VÉ</p>
            <h2 className="pin-code">{ticketPIN}</h2>
            <div className="qr-wrapper">
              <QRCodeCanvas value={`TICKET-${orderIdDisplay}-${ticketPIN}`} size={150} level={'H'} />
            </div>
            <p className="qr-note">Quét mã QR tại rạp để nhận vé</p>
          </div>
        </div>

        <div className="email-box">
          <div className="email-left">
            <Mail size={24} />
            <div>
              <p>Vé đã được gửi đến email:</p>
              <h4>{customerEmail}</h4>
            </div>
          </div>
          <CheckCircle2 className="email-check" size={28} />
        </div>

        <div className="success-actions">
          <button className="home-btn" onClick={() => navigate('/')}>
            <House size={20} /> VỀ TRANG CHỦ
          </button>
          <button className="download-btn" onClick={() => window.print()}>
            <Download size={20} /> TẢI VÉ VỀ MÁY
          </button>
        </div>

        <p className="print-time">{printTime}</p>
      </div>
    </div>
  );
};

export default ConfirmSuccess;