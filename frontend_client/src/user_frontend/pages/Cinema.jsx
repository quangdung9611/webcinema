import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import {
  Loader2,
  Film,
  Building2,
  MapPin,
  Phone,
  ArrowRight,
  Sparkles
} from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

import CinemaCard from '../components/CinemaCard';

import '../styles/Cinema.css';

// ============================================================
// HELPER: Lấy URL backdrop
// ============================================================
const getBackdropUrl = (backdrop) => {
  if (!backdrop) return '';
  if (backdrop.startsWith('http')) return backdrop;
  return `https://api.quangdungcinema.id.vn/uploads/backdrops/${backdrop}`;
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const Cinema = () => {
  const [cinemas, setCinemas] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(true);

  // ===== FETCH BANNERS =====
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setBannerLoading(true);
        const res = await api.get('/api/banners?page=CINEMA');
        const bannerData = res.data?.data || [];
        setBanners(Array.isArray(bannerData) ? bannerData : []);
      } catch (error) {
        console.error('Lỗi tải banner:', error);
        setBanners([]);
      } finally {
        setBannerLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // ===== FETCH CINEMAS =====
  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/cinemas');
        const cinemaData = res.data?.data || [];
        setCinemas(Array.isArray(cinemaData) ? cinemaData : []);
      } catch (error) {
        console.error('Lỗi tải danh sách rạp:', error);
        setCinemas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCinemas();
  }, []);

  const hasBanners = banners.length > 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="cinema-page">

      {/* ===== BANNER SWIPER 2.5/1 ===== */}
      <div className="cinema-banner">
        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          speed={1200}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          loop={hasBanners && banners.length > 1}
          className="cinema-banner-swiper"
        >
          {hasBanners ? (
            banners.map((banner, idx) => (
              <SwiperSlide key={banner.banner_id || idx}>
                <img
                  src={banner.image_url}
                  alt={`Banner ${idx + 1}`}
                  className="cinema-banner-img"
                />
              </SwiperSlide>
            ))
          ) : (
            <SwiperSlide>
              <div className="cinema-banner-placeholder">
                <Film size={48} />
                <span>Cinema</span>
              </div>
            </SwiperSlide>
          )}
        </Swiper>

        {/* Overlay tối + gradient trái */}
        <div className="cinema-banner-overlay"></div>
        <div className="cinema-banner-overlay-side"></div>

        {/* ==================================================
            BANNER TITLE — BÊN TRÁI, 3D PREMIUM
        ================================================== */}
        <div className="cinema-banner-title">
          <div className="cinema-banner-title__inner">

            {/* Eyebrow */}
            <div className="cinema-banner-eyebrow">
              <span className="cinema-banner-eyebrow__line"></span>
              <Sparkles size={14} className="cinema-banner-eyebrow__icon" />
              <span>Hệ thống rạp chiếu phim</span>
            </div>

            {/* Title — CINEMA MOVIE */}
            <h1 className="cinema-banner-heading">
              {/* CINEMA — Solid silver, 2 lớp */}
              <span className="cinema-banner-heading__solid">
                <span className="cinema-banner-heading__solid-bg">CINEMA</span>
                <span className="cinema-banner-heading__solid-fg">CINEMA</span>
              </span>

              {/* MOVIE — Outline */}
              <span className="cinema-banner-heading__outline">MOVIE</span>
            </h1>

            {/* Divider */}
            <div className="cinema-banner-divider"></div>

            {/* Description */}
            <p className="cinema-banner-desc">
              Trải nghiệm điện ảnh đỉnh cao với hệ thống phòng chiếu
              hiện đại, âm thanh vòm Dolby Atmos và màn hình 4K HDR
              sắc nét tại mọi rạp của Quang Dũng Cinema.
            </p>

            {/* Quick stats */}
            <div className="cinema-banner-stats">
              <div className="cinema-banner-stat">
                <Building2 size={20} className="cinema-banner-stat__icon" />
                <div className="cinema-banner-stat__content">
                  <span className="cinema-banner-stat__label">Số rạp</span>
                  <strong className="cinema-banner-stat__value">
                    {cinemas.length || '—'}
                  </strong>
                </div>
              </div>

              <div className="cinema-banner-stat__divider"></div>

              <div className="cinema-banner-stat">
                <Film size={20} className="cinema-banner-stat__icon" />
                <div className="cinema-banner-stat__content">
                  <span className="cinema-banner-stat__label">Định dạng</span>
                  <strong className="cinema-banner-stat__value">4K HDR</strong>
                </div>
              </div>

              <div className="cinema-banner-stat__divider"></div>

              <div className="cinema-banner-stat">
                <MapPin size={20} className="cinema-banner-stat__icon" />
                <div className="cinema-banner-stat__content">
                  <span className="cinema-banner-stat__label">Khu vực</span>
                  <strong className="cinema-banner-stat__value">Toàn quốc</strong>
                </div>
              </div>
            </div>

          

          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="cinema-content" id="cinema-list">
        <div className="cinema-header">
          <div className="cinema-header-left">
            <Building2 size={32} className="cinema-header-icon" />
            <h2>Danh sách rạp</h2>
          </div>
          <span className="cinema-count">{cinemas.length} rạp</span>
        </div>

        {loading ? (
          <div className="cinema-loading">
            <Loader2 size={45} className="spin-icon" />
            <span>Đang tải danh sách rạp...</span>
          </div>
        ) : cinemas.length === 0 ? (
          <div className="cinema-empty">
            <Building2 size={60} />
            <h3>Chưa có rạp nào</h3>
            <p>Hiện tại hệ thống chưa có rạp chiếu phim nào.</p>
          </div>
        ) : (
          <div className="cinema-grid">
            {cinemas.map((cinema) => {
              const backdropUrl = cinema.cinema_backdrop
                ? getBackdropUrl(cinema.cinema_backdrop)
                : null;

              return (
                <CinemaCard
                  key={cinema.cinema_id}
                  type="cinema"
                  image={backdropUrl || '/cinema-placeholder.jpg'}
                  title={cinema.cinema_name}
                  buttonText="Xem chi tiết"
                  link={`/cinema/detail/${cinema.slug}`}
                  address={cinema.address}
                  hotline={cinema.hotline}
                  mapLink={cinema.map_link}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cinema;