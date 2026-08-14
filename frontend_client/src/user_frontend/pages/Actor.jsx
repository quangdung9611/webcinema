import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

// 👇 Import CinemaCard
import CinemaCard from '../components/CinemaCard';

// SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

import '../styles/Actor.css';


const Actor = () => {

    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);

    // ===== FETCH BANNERS =====
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setBannerLoading(true);
                const res = await api.get('/api/banners?page=ACTOR');
                const bannerData = res.data?.success === true ? res.data?.data : [];
                setBanners(Array.isArray(bannerData) ? bannerData : []);
            } catch (error) {
                console.error('Lỗi tải banner Actor:', error);
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
                setLoading(true);
                const res = await api.get('/api/actors');
                const actorData = Array.isArray(res.data)
                    ? res.data
                    : res.data?.success === true && Array.isArray(res.data?.data)
                        ? res.data.data
                        : [];
                setActors(actorData);
            } catch (error) {
                console.error('Lỗi tải danh sách diễn viên:', error);
                setActors([]);
            } finally {
                setLoading(false);
            }
        };
        fetchActors();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Helper xử lý tiểu sử
    const cleanBiography = (bio) => {
        if (!bio) return 'Thông tin đang cập nhật...';
        const clean = bio.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return clean.length > 120 ? clean.substring(0, 120) + '...' : clean;
    };

    return (
        <div className="actor-page">

            {/* ===== BANNER 2.5/1 ===== */}
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
                        banners.map((banner, index) => (
                            <SwiperSlide key={banner.banner_id || index}>
                                <img
                                    src={banner.image_url}
                                    alt={`Actor Banner ${index + 1}`}
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

                {actors.length === 0 ? (
                    <div className="actor-empty">
                        <p>Chưa có diễn viên nào.</p>
                    </div>
                ) : (
                    <div className="actor-grid">
                        {actors.map((actor) => {
                            const avatarUrl = actor.actor_avatar || null;
                            return (
                                <CinemaCard
                                    key={actor.actor_id}
                                    type="cinema"
                                    image={avatarUrl || '/actor-placeholder.jpg'}
                                    title={actor.name}
                                    link={`/actor/${actor.slug}`}
                                    subtitle={`${actor.views || 0} lượt xem`}
                                    description={cleanBiography(actor.biography)}
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Actor;