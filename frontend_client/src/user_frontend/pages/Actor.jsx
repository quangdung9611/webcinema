import React, { useState, useEffect } from 'react';
import api from '../../api/api'; // ✅ Import api
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

// SWIPER cho banner
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

import '../styles/Actor.css';

const Actor = () => {
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);

    // ===== STATE BANNER TỪ API =====
    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);

    // ===== FETCH BANNER =====
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setBannerLoading(true);
                const res = await api.get('/api/banners?page=ACTOR');
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

    // ===== FETCH ACTORS =====
    useEffect(() => {
        const fetchActors = async () => {
            try {
                const res = await api.get('/api/actors');
                setActors(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchActors();
        window.scrollTo(0, 0);
    }, []);

    if (loading || bannerLoading) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    const hasBanners = banners.length > 0;

    return (
        <div className="actor-page">

            {/* ===== BANNER SLIDER ===== */}
            <div className="actor-hero">
                <div className="actor-hero-overlay"></div>
                <div className="actor-hero-light"></div>
                <div className="actor-hero-particles"></div>

                <Swiper
                    modules={[Autoplay, EffectFade]}
                    effect="fade"
                    speed={1200}
                    autoplay={{ delay: 4500, disableOnInteraction: false }}
                    loop={hasBanners && banners.length > 1}
                    className="actor-hero-swiper"
                >
                    {hasBanners ? (
                        banners.map((banner, idx) => (
                            <SwiperSlide key={banner.banner_id || idx}>
                                <img
                                    src={banner.image_url}
                                    alt={`Actor Banner ${idx + 1}`}
                                    className="hero-banner-img"
                                />
                            </SwiperSlide>
                        ))
                    ) : (
                        <SwiperSlide>
                            <div className="hero-banner-fallback">
                                <span>🎬 Diễn Viên</span>
                            </div>
                        </SwiperSlide>
                    )}
                </Swiper>
            </div>

            {/* ===== ACTOR LIST ===== */}
            <section id="actor-list" className="actor-section">
                <div className="actor-section-header">
                    <div className="section-header-left">
                        <h2 className="section-title">DANH SÁCH DIỄN VIÊN</h2>
                    </div>
                </div>

                <div className="actor-grid">
                    {actors.map(actor => {
                        const avatarUrl = actor.actor_avatar;

                        return (
                            <div key={actor.actor_id} className="actor-card">
                                <Link to={`/actor/${actor.slug}`} className="actor-image">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={actor.name} />
                                    ) : (
                                        <div className="actor-no-avatar" />
                                    )}
                                </Link>

                                <div className="actor-info">
                                    <Link to={`/actor/${actor.slug}`} className="actor-title">
                                        {actor.name}
                                    </Link>

                                    <div className="actor-meta">
                                        <Eye size={14} />
                                        <span>
                                            {Math.floor(Math.random() * 5000)} lượt xem
                                        </span>
                                    </div>

                                    <p>
                                        {actor.biography
                                            ? actor.biography
                                                .replace(/<[^>]*>/g, '')
                                                .replace(/&nbsp;/g, ' ')
                                                .substring(0, 140) + '...'
                                            : 'Thông tin đang cập nhật...'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default Actor;