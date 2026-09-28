import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../../api/api';
import {
  CheckCircle2,
  MapPin,
  Monitor,
  CalendarDays,
  Clock3,
  Armchair,
  Mail,
  House,
  Download,
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

  // ✅ Lấy orderId từ location.state, sessionStorage, hoặc localStorage
  const getOrderId = () => {
    const state = location.state?.data || location.state || {};
    const saved = sessionStorage.getItem('lastSuccessTicket');
    const parsed = saved ? JSON.parse(saved) : null;

    const id =
      state?.orderId ||
      state?.bookingId ||
      parsed?.orderId ||
      parsed?.bookingId ||
      localStorage.getItem('completedBookingId') ||
      null;

    return id || null;
  };

  const orderId = getOrderId();

  // ✅ CHẶN BACK BUTTON — không cho quay lại trang trước
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Nếu không có orderId -> quay về trang chủ
  useEffect(() => {
    if (!orderId) {
      navigate('/', { replace: true });
    }
  }, [orderId, navigate]);

  // Gọi API lấy chi tiết booking
  useEffect(() => {
    const fetchBooking = async () => {
      if (!orderId || hasConfirmed.current) return;
      hasConfirmed.current = true;

      try {
        // ✅ GỌI API USER — không cần admin token, chỉ cần user login
        const response = await api.get(`/api/bookings/my-booking/${orderId}`);

        if (response.data.success) {
          const b = response.data.booking;
          const details = response.data.details || [];
          const tickets = response.data.tickets || [];

          // ✅ Build seat display từ tickets hoặc details
          let seatDisplay = b.seat_label || '';

          if (!seatDisplay) {
            const seatSources = details.length > 0 ? details : tickets;
            const seats = seatSources
              .filter((i) => i.seat_id || i.item_name?.includes('Ghế'))
              .map((i) => {
                if (i.item_name) {
                  return i.item_name.replace('Ghế ', '').trim();
                }
                if (i.seat_row && i.seat_number) {
                  return `${i.seat_row}${i.seat_number}`;
                }
                return null;
              })
              .filter(Boolean)
              .join(', ');
            seatDisplay = seats;
          }

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
            seatDisplay: seatDisplay || '---',
            ticketPIN: b.pin || b.memo?.slice(-6) || '------',
            customerName: b.full_name,
            customerEmail: b.email,
            selectedFoods: foods,
          };

          setTicketData(ticketDataFromAPI);

          sessionStorage.setItem('lastSuccessTicket', JSON.stringify(ticketDataFromAPI));
        } else {
          console.error('API không trả về success');
        }
      } catch (err) {
        console.error('Lỗi lấy thông tin vé:', err.message);

        // ✅ Fallback: thử lấy từ sessionStorage
        const saved = sessionStorage.getItem('lastSuccessTicket');
        if (saved) {
          try {
            setTicketData(JSON.parse(saved));
          } catch (parseErr) {
            console.error('Parse sessionStorage error:', parseErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [orderId]);

  useEffect(() => {
    setPrintTime(new Date().toLocaleString('vi-VN'));
    window.scrollTo(0, 0);
  }, []);

  // ✅ Về trang chủ
  const handleGoHome = () => {
    localStorage.removeItem('paymentCompleted');
    localStorage.removeItem('completedBookingId');
    localStorage.removeItem('momoPaymentCompleted');
    localStorage.removeItem('momoCompletedBookingId');

    navigate('/', { replace: true });
  };

  // ✅ Tải vé về máy
  const handleDownload = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div className="confirm-success-page">
        <div className="success-loading">
          <Loader2 size={48} className="spinner" />
          <p className="loading-text">Đang tải thông tin vé...</p>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="confirm-success-page">
        <div className="success-container">
          <h2>Không tìm thấy thông tin vé</h2>
          <button onClick={handleGoHome}>Về trang chủ</button>
        </div>
      </div>
    );
  }

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

        {/* ✅ 2 NÚT: VỀ TRANG CHỦ + TẢI VÉ */}
        <div className="success-actions">
          <button className="home-btn" onClick={handleGoHome}>
            <House size={20} /> VỀ TRANG CHỦ
          </button>
          <button className="download-btn" onClick={handleDownload}>
            <Download size={20} /> TẢI VÉ VỀ MÁY
          </button>
        </div>

        <p className="print-time">{printTime}</p>
      </div>
    </div>
  );
};

export default ConfirmSuccess;