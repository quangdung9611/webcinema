import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api'; // ✅ Import api
import { ChevronRight, Gift, AlertCircle } from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

import CinemaCard from '../components/CinemaCard';
import '../styles/Promotion.css';

const Promotion = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);

    // ===== STATE BANNER TỪ API =====
    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);

    // ===== FETCH BANNER =====
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setBannerLoading(true);
                const res = await api.get('/api/banners?page=PROMOTION');
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

    // ===== FETCH PROMOTIONS =====
    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                setLoading(true);
                const res = await api.get('/api/promotions');
                setPromotions(res.data || []);
            } catch (error) {
                console.error("Lỗi khi tải khuyến mãi:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPromotions();
    }, []);

    if (loading || bannerLoading) {
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

    const hasBanners = banners.length > 0;

    return (
        <div className="promotion-page">
            
            {/* ===== BANNER SLIDER ===== */}
            <div className="promotion-hero">
                <div className="promotion-overlay"></div>
                <div className="promotion-light"></div>
                <div className="promotion-particles"></div>

                <Swiper
                    modules={[Autoplay, EffectFade]}
                    effect="fade"
                    speed={1200}
                    autoplay={{ delay: 4500, disableOnInteraction: false }}
                    loop={hasBanners && banners.length > 1}
                    className="promotion-swiper"
                >
                    {hasBanners ? (
                        banners.map((banner, idx) => (
                            <SwiperSlide key={banner.banner_id || idx}>
                                <img
                                    src={banner.image_url}
                                    alt={`Promotion Banner ${idx + 1}`}
                                    className="promotion-banner-img"
                                />
                            </SwiperSlide>
                        ))
                    ) : (
                        <SwiperSlide>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#888',
                                fontSize: '1.5rem',
                                fontWeight: 'bold'
                            }}>
                                🎁 Khuyến Mãi
                            </div>
                        </SwiperSlide>
                    )}
                </Swiper>
            </div>

            <div className="promotion-container">
                <div className="promotion-header">
                    <div className="promotion-header-icon"><Gift size={48} /></div>
                    <h1>Khuyến Mãi &amp; Ưu Đãi</h1>
                    <p className="promotion-header-desc">Cập nhật những chương trình ưu đãi hấp dẫn nhất từ CineStar.</p>
                    <div className="promotion-header-line"></div>
                </div>

                <div className="promotion-breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span>Khuyến mãi</span>
                </div>

                {promotions.length === 0 ? (
                    <div className="promotion-empty">
                        <AlertCircle size={48} />
                        <h3>Chưa có chương trình khuyến mãi</h3>
                        <p>Hiện tại chưa có chương trình ưu đãi nào. Vui lòng quay lại sau!</p>
                        <Link to="/" className="promotion-empty-btn">Về trang chủ</Link>
                    </div>
                ) : (
                    <div className="promotion-grid">
                        {promotions.map((promo) => {
                            const imageUrl = promo.promotion_image || null;
                            return (
                                <CinemaCard
                                    key={promo.promotion_id}
                                    type="promotion"
                                    image={imageUrl}
                                    title={promo.title}
                                    link={`/promotion/${promo.slug}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Promotion;