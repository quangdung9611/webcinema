import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  User,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Ticket,
  Shield
} from 'lucide-react';
import '../styles/ContactSupport.css';

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="contact-page">
      <div className="contact-container">

        {/* Header */}
        <div className="contact-header">
          <div className="contact-header-icon">
            <MessageCircle size={48} />
          </div>
          <h1>Liên Hệ Hỗ Trợ</h1>
          <p>Chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn!</p>
          <div className="contact-header-line"></div>
        </div>

        {/* Breadcrumb */}
        <div className="contact-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Hỗ trợ</span>
          <ChevronRight size={14} />
          <span className="current">Liên hệ hỗ trợ</span>
        </div>

        {/* Nội dung */}
        <div className="contact-content">

          {/* Phần thông tin liên hệ */}
          <div className="contact-info-grid">
            <div className="contact-info-card">
              <div className="contact-info-icon"><Phone size={28} /></div>
              <h3>Hotline</h3>
              <p><strong>1900 1234</strong></p>
              <p>Hoạt động 24/7, tất cả các ngày</p>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon"><Mail size={28} /></div>
              <h3>Email</h3>
              <p><strong>support@cinemastar.vn</strong></p>
              <p>Phản hồi trong vòng 24 giờ</p>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon"><MapPin size={28} /></div>
              <h3>Địa chỉ</h3>
              <p><strong>123 Đường Số 7, Bình Tân</strong></p>
              <p>TP. Hồ Chí Minh</p>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon"><Clock size={28} /></div>
              <h3>Giờ hoạt động</h3>
              <p><strong>08:00 – 23:00</strong></p>
              <p>Thứ 2 – Chủ nhật</p>
            </div>
          </div>

          {/* Form liên hệ */}
          <div className="contact-form-wrapper">
            <h2>Gửi yêu cầu hỗ trợ</h2>
            <p>
              Điền thông tin bên dưới, chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.
            </p>

            {submitted ? (
              <div className="contact-success">
                <CheckCircle size={48} />
                <h3>Gửi thành công!</h3>
                <p>Cảm ơn bạn đã liên hệ với CineStar. Chúng tôi sẽ phản hồi trong vòng 24 giờ.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="contact-form-row">
                  <div className="contact-form-group">
                    <label htmlFor="name"><User size={18} /> Họ tên</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Nhập họ tên của bạn"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="contact-form-group">
                    <label htmlFor="email"><Mail size={18} /> Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="support@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="contact-form-group">
                  <label htmlFor="subject">📌 Chủ đề</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    placeholder="Vui lòng nhập chủ đề"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="contact-form-group">
                  <label htmlFor="message">📝 Nội dung</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="contact-submit-btn">
                  <Send size={20} />
                  Gửi yêu cầu
                </button>
              </form>
            )}
          </div>

          {/* FAQ nhanh */}
          <div className="contact-quick-faq">
            <h3>📖 Bạn có thể tìm thấy câu trả lời tại</h3>
            <div className="contact-quick-links">
              <Link to="/faq" className="contact-quick-link">
                <AlertCircle size={20} />
                Câu hỏi thường gặp
              </Link>
              <Link to="/booking-guide" className="contact-quick-link">
                <Ticket size={20} />
                Hướng dẫn đặt vé
              </Link>
              <Link to="/privacy-policy" className="contact-quick-link">
                <Shield size={20} />
                Chính sách bảo mật
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactSupport;