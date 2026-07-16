import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Crown,
  Star,
  Gift,
  Ticket,
  CreditCard,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Sparkles,
  Zap,
  Award,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import '../styles/MemberShip.css';

const MemberShip = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [selectedTier, setSelectedTier] = useState('gold');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const tiers = [
    {
      id: 'silver',
      name: 'Thành viên Bạc',
      icon: <Star size={32} />,
      color: '#A8A8A8',
      bgColor: 'rgba(168, 168, 168, 0.08)',
      borderColor: 'rgba(168, 168, 168, 0.3)',
      discount: '5%',
      points: '1 điểm/10.000đ',
      benefits: [
        'Giảm 5% giá vé',
        'Tích lũy điểm thưởng',
        'Nhận thông báo ưu đãi',
        'Quà tặng sinh nhật'
      ],
      price: 'Miễn phí'
    },
    {
      id: 'gold',
      name: 'Thành viên Vàng',
      icon: <Crown size={32} />,
      color: '#C9A84C',
      bgColor: 'rgba(201, 168, 76, 0.12)',
      borderColor: 'rgba(201, 168, 76, 0.4)',
      discount: '10%',
      points: '1,5 điểm/10.000đ',
      benefits: [
        'Giảm 10% giá vé',
        'Tích lũy điểm thưởng cao hơn',
        'Đặt vé trước 12 giờ',
        'Quà tặng sinh nhật đặc biệt',
        'Voucher giảm giá combo',
        'Ưu tiên hỗ trợ'
      ],
      price: '200.000đ/năm'
    },
    {
      id: 'platinum',
      name: 'Thành viên Bạch Kim',
      icon: <Sparkles size={32} />,
      color: '#E8C84A',
      bgColor: 'rgba(232, 200, 74, 0.15)',
      borderColor: 'rgba(232, 200, 74, 0.5)',
      discount: '20%',
      points: '2 điểm/10.000đ',
      benefits: [
        'Giảm 20% giá vé',
        'Tích lũy điểm thưởng tối đa',
        'Đặt vé trước 24 giờ',
        'Quà tặng sinh nhật cao cấp',
        'Voucher combo độc quyền',
        'Ưu tiên hỗ trợ 24/7',
        'Sự kiện VIP riêng',
        'Vé xem phim miễn phí mỗi tháng'
      ],
      price: '500.000đ/năm'
    }
  ];

  const benefits = [
    {
      icon: <Ticket size={24} />,
      title: 'Đặt vé ưu tiên',
      desc: 'Đặt vé trước khi phát hành chính thức'
    },
    {
      icon: <Gift size={24} />,
      title: 'Quà tặng sinh nhật',
      desc: 'Nhận vé miễn phí và combo đặc biệt'
    },
    {
      icon: <CreditCard size={24} />,
      title: 'Hoàn tiền lên đến 20%',
      desc: 'Hoàn tiền vào ví thành viên'
    },
    {
      icon: <Users size={24} />,
      title: 'Sự kiện VIP',
      desc: 'Tham gia buổi chiếu đặc biệt'
    },
    {
      icon: <Zap size={24} />,
      title: 'Tích lũy điểm nhanh',
      desc: 'Đổi điểm lấy vé và quà tặng'
    },
    {
      icon: <Shield size={24} />,
      title: 'Bảo vệ quyền lợi',
      desc: 'Hỗ trợ đổi vé miễn phí'
    }
  ];

  return (
    <div className="membership-page">
      <div className="membership-container">

        {/* ===== HEADER ===== */}
        <div className="membership-header">
          <div className="membership-header-icon">
            <Crown size={52} />
          </div>
          <h1>Thành Viên CineStar</h1>
          <p className="membership-header-desc">
            Trở thành thành viên của CineStar để tận hưởng những quyền lợi đặc biệt,
            ưu đãi hấp dẫn và trải nghiệm điện ảnh đẳng cấp nhất!
          </p>
          <div className="membership-header-line"></div>
        </div>

        {/* ===== BREADCRUMB ===== */}
        <div className="membership-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Dịch vụ</span>
          <ChevronRight size={14} />
          <span className="current">Thành viên</span>
        </div>

        {/* ===== STATS ===== */}
        <div className="membership-stats">
          <div className="membership-stat">
            <span className="membership-stat-number">50K+</span>
            <span className="membership-stat-label">Thành viên</span>
          </div>
          <div className="membership-stat">
            <span className="membership-stat-number">3</span>
            <span className="membership-stat-label">Cấp độ</span>
          </div>
          <div className="membership-stat">
            <span className="membership-stat-number">20%</span>
            <span className="membership-stat-label">Giảm giá tối đa</span>
          </div>
          <div className="membership-stat">
            <span className="membership-stat-number">24/7</span>
            <span className="membership-stat-label">Hỗ trợ</span>
          </div>
        </div>

        {/* ===== TIERS ===== */}
        <div className="membership-tiers">
          <h2>Chọn cấp độ thành viên</h2>
          <p>Phù hợp với nhu cầu và ngân sách của bạn</p>

          <div className="membership-tier-grid">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`membership-tier-card ${selectedTier === tier.id ? 'active' : ''}`}
                onClick={() => setSelectedTier(tier.id)}
                style={{
                  borderColor: selectedTier === tier.id ? tier.color : 'rgba(255,255,255,0.06)',
                  background: selectedTier === tier.id ? tier.bgColor : 'rgba(255,255,255,0.02)'
                }}
              >
                <div className="membership-tier-icon" style={{ color: tier.color }}>
                  {tier.icon}
                </div>
                <h3 className="membership-tier-name">{tier.name}</h3>
                <div className="membership-tier-price">{tier.price}</div>
                <div className="membership-tier-discount">Giảm {tier.discount}</div>
                <div className="membership-tier-points">{tier.points}</div>
                <ul className="membership-tier-benefits">
                  {tier.benefits.map((benefit, index) => (
                    <li key={index}>
                      <CheckCircle size={16} />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`membership-tier-btn ${selectedTier === tier.id ? 'active' : ''}`}
                  style={{
                    background: selectedTier === tier.id ? tier.color : 'rgba(255,255,255,0.05)',
                    color: selectedTier === tier.id ? '#0a0a0a' : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {selectedTier === tier.id ? 'Đang chọn' : 'Chọn gói'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ===== BENEFITS ===== */}
        <div className="membership-benefits">
          <h2>Quyền lợi đặc biệt</h2>
          <p>Khi trở thành thành viên CineStar</p>

          <div className="membership-benefits-grid">
            {benefits.map((benefit, index) => (
              <div className="membership-benefit-card" key={index}>
                <div className="membership-benefit-icon">
                  {benefit.icon}
                </div>
                <h4>{benefit.title}</h4>
                <p>{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== REGISTER FORM ===== */}
        <div className="membership-register">
          <h2>Đăng ký thành viên ngay</h2>
          <p>Điền thông tin bên dưới để bắt đầu hành trình điện ảnh của bạn!</p>

          {submitted ? (
            <div className="membership-success">
              <CheckCircle size={48} />
              <h3>Đăng ký thành công!</h3>
              <p>Chào mừng bạn đến với gia đình CineStar. Vui lòng kiểm tra email để xác nhận!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="membership-form">
              <div className="membership-form-row">
                <div className="membership-form-group">
                  <label><User size={18} /> Họ tên</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Nhập họ tên của bạn"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="membership-form-group">
                  <label><Mail size={18} /> Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="support@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="membership-form-row">
                <div className="membership-form-group">
                  <label><Phone size={18} /> Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="0900 123 456"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="membership-form-group">
                  <label><Calendar size={18} /> Ngày sinh</label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="membership-submit-btn">
                Đăng ký thành viên
              </button>
            </form>
          )}
        </div>

        {/* ===== CTA ===== */}
        <div className="membership-cta">
          <div className="membership-cta-icon">
            <Award size={32} />
          </div>
          <h3>Bạn đã sẵn sàng trở thành thành viên?</h3>
          <p>Đăng ký ngay hôm nay để nhận vé xem phim miễn phí và các ưu đãi đặc biệt!</p>
          <div className="membership-cta-buttons">
            <Link to="/register" className="membership-cta-btn primary">
              Đăng ký ngay
            </Link>
            <Link to="/" className="membership-cta-btn outline">
              Về trang chủ
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MemberShip;