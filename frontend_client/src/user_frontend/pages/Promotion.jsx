import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronRight,
  Gift,
  Tag,
  Clock,
  Calendar,
  Sparkles,
  Filter,
  AlertCircle
} from 'lucide-react';

import CinemaCard from '../components/CinemaCard';
import ScrollReveal from '../components/ScrollReveal';
import '../styles/Promotion.css';

const Promotion = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [filteredPromotions, setFilteredPromotions] = useState([]);

  const promotionImageUrl = "https://api.quangdungcinema.id.vn/uploads/promotions/";

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const res = await axios.get('https://api.quangdungcinema.id.vn/api/promotions/all');
        setPromotions(res.data || []);
        setFilteredPromotions(res.data || []);
      } catch (error) {
        console.error("Lỗi khi tải khuyến mãi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredPromotions(promotions);
      return;
    }

    const now = new Date();
    let filtered = [];

    switch (filter) {
      case 'active':
        filtered = promotions.filter(p => {
          const start = new Date(p.start_date);
          const end = new Date(p.end_date);
          return start <= now && end >= now;
        });
        break;
      case 'upcoming':
        filtered = promotions.filter(p => {
          const start = new Date(p.start_date);
          return start > now;
        });
        break;
      case 'expired':
        filtered = promotions.filter(p => {
          const end = new Date(p.end_date);
          return end < now;
        });
        break;
      default:
        filtered = promotions;
    }

    setFilteredPromotions(filtered);
  }, [filter, promotions]);

  const getCountByStatus = (status) => {
    const now = new Date();
    let count = 0;

    promotions.forEach(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);

      switch (status) {
        case 'all':
          count++;
          break;
        case 'active':
          if (start <= now && end >= now) count++;
          break;
        case 'upcoming':
          if (start > now) count++;
          break;
        case 'expired':
          if (end < now) count++;
          break;
        default:
          break;
      }
    });

    return count;
  };

  const getBadge = (promo) => {
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);

    if (start <= now && end >= now) {
      return { text: 'ĐANG DIỄN RA', type: 'active' };
    } else if (start > now) {
      return { text: 'SẮP DIỄN RA', type: 'upcoming' };
    } else {
      return { text: 'ĐÃ KẾT THÚC', type: 'expired' };
    }
  };

  if (loading) {
    return (
      <div className="promotion-page">
        <div className="promotion-container">
          <div className="promotion-loading">
            <div className="promotion-loading-spinner"></div>
            <p>Đang tải chương trình khuyến mãi...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="promotion-page">
      <div className="promotion-container">

        {/* ===== HEADER ===== */}
        <div className="promotion-header">
          <div className="promotion-header-icon">
            <Gift size={52} />
          </div>
          <h1>Khuyến Mãi &amp; Ưu Đãi</h1>
          <p className="promotion-header-desc">
            Cập nhật những chương trình ưu đãi hấp dẫn nhất từ CineStar. Đặt vé ngay
            để không bỏ lỡ những combo giá tốt và quà tặng độc quyền!
          </p>
          <div className="promotion-header-line"></div>
        </div>

        {/* ===== BREADCRUMB ===== */}
        <div className="promotion-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Dịch vụ</span>
          <ChevronRight size={14} />
          <span className="current">Khuyến mãi</span>
        </div>

        {/* ===== STATS ===== */}
        <div className="promotion-stats">
          <div className="promotion-stat">
            <span className="promotion-stat-number">{promotions.length}</span>
            <span className="promotion-stat-label">Tổng chương trình</span>
          </div>
          <div className="promotion-stat">
            <span className="promotion-stat-number">{getCountByStatus('active')}</span>
            <span className="promotion-stat-label">Đang diễn ra</span>
          </div>
          <div className="promotion-stat">
            <span className="promotion-stat-number">{getCountByStatus('upcoming')}</span>
            <span className="promotion-stat-label">Sắp diễn ra</span>
          </div>
          <div className="promotion-stat">
            <span className="promotion-stat-number">{getCountByStatus('expired')}</span>
            <span className="promotion-stat-label">Đã kết thúc</span>
          </div>
        </div>

        {/* ===== FILTER ===== */}
        <div className="promotion-filter-bar">
          <div className="promotion-filter-label">
            <Filter size={18} />
            <span>Lọc theo:</span>
          </div>
          <div className="promotion-filter-options">
            <button
              className={`promotion-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả ({getCountByStatus('all')})
            </button>
            <button
              className={`promotion-filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              <Sparkles size={14} />
              Đang diễn ra ({getCountByStatus('active')})
            </button>
            <button
              className={`promotion-filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              <Calendar size={14} />
              Sắp diễn ra ({getCountByStatus('upcoming')})
            </button>
            <button
              className={`promotion-filter-btn ${filter === 'expired' ? 'active' : ''}`}
              onClick={() => setFilter('expired')}
            >
              <Clock size={14} />
              Đã kết thúc ({getCountByStatus('expired')})
            </button>
          </div>
        </div>

        {/* ===== GRID ===== */}
        {filteredPromotions.length === 0 ? (
          <div className="promotion-empty">
            <AlertCircle size={48} />
            <h3>Không có chương trình khuyến mãi nào</h3>
            <p>Hiện tại chưa có chương trình ưu đãi nào trong danh mục này. Vui lòng quay lại sau!</p>
            <Link to="/" className="promotion-empty-btn">Về trang chủ</Link>
          </div>
        ) : (
          <div className="promotion-grid">
            {filteredPromotions.map((promo) => {
              const badge = getBadge(promo);
              return (
                <ScrollReveal curtain curtainSpeed={0.3} curtainFolds={3} key={promo.promotion_id}>
                  <CinemaCard
                    type="promotion"
                    image={`${promotionImageUrl}${promo.image_url}`}
                    title={promo.title}
                    badge={badge.text}
                    link={`/promotion/${promo.slug}`}
                  />
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* ===== CTA ===== */}
        <div className="promotion-cta">
          <div className="promotion-cta-icon">
            <Tag size={32} />
          </div>
          <h3>Đừng bỏ lỡ ưu đãi!</h3>
          <p>
            Theo dõi fanpage và đăng ký nhận email để cập nhật sớm nhất các chương
            trình khuyến mãi mới từ CineStar.
          </p>
          <div className="promotion-cta-buttons">
            <Link to="/contact" className="promotion-cta-btn primary">
              Đăng ký nhận ưu đãi
            </Link>
            <Link to="/" className="promotion-cta-btn outline">
              Về trang chủ
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Promotion;