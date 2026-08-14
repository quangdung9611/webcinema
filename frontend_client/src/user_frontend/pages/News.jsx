import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Heart, Eye } from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-fade';

import CinemaCard from '../components/CinemaCard';
import '../styles/News.css';

const News = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);

    // ===== FETCH BANNERS =====
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setBannerLoading(true);
                const res = await api.get('/api/banners', {
                    params: { page: 'NEWS' }
                });

                let bannerData = [];
                if (res.data?.success === true) {
                    if (Array.isArray(res.data?.data)) {
                        bannerData = res.data.data;
                    } else if (Array.isArray(res.data?.data?.data)) {
                        bannerData = res.data.data.data;
                    }
                }
                setBanners(bannerData);
            } catch (error) {
                console.error('Lỗi tải banner News:', error);
                setBanners([]);
            } finally {
                setBannerLoading(false);
            }
        };
        fetchBanners();
    }, []);

    // ===== FETCH NEWS =====
    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/news');
                const newsData = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.data)
                        ? response.data.data
                        : [];

                const sortedNews = [...newsData].sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
                setNews(sortedNews);
            } catch (error) {
                console.error('Lỗi kết nối API:', error);
                setNews([]);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // ===== HANDLE LIKE =====
    const handleLike = async (e, newsId) => {
        e.preventDefault();
        try {
            await api.post(`/api/news/like/${newsId}`);
            setNews((prev) =>
                prev.map((item) =>
                    item.news_id === newsId
                        ? { ...item, likes: (item.likes || 0) + 1 }
                        : item
                )
            );
        } catch (error) {
            console.error('Lỗi khi thích bài viết:', error);
        }
    };

    // ===== RENDER EXCERPT =====
    const renderExcerpt = (content = '') => {
        const cleanText = String(content)
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
        return cleanText.length > 120 ? `${cleanText.slice(0, 120)}...` : cleanText;
    };

    // ===== FORMAT DATE =====
    const formatDate = (date) => {
        if (!date) return 'Chưa cập nhật';
        const parsedDate = new Date(date);
        return isNaN(parsedDate)
            ? 'Chưa cập nhật'
            : parsedDate.toLocaleDateString('vi-VN');
    };

    if (loading || bannerLoading) {
        return (
            <div className="news-page">
                <div className="news-container">
                    <div className="news-loading">
                        <div className="news-loading-spinner"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    const hasBanners = banners.length > 0;

    return (
        <div className="news-page">
            {/* ===== BANNER ===== */}
            <div className="news-hero">
                <div className="news-overlay"></div>
                <div className="news-light"></div>
                <div className="news-particles"></div>

                <Swiper
                    modules={[Autoplay, EffectFade]}
                    effect="fade"
                    fadeEffect={{ crossFade: true }}
                    speed={1200}
                    autoplay={{ delay: 4500, disableOnInteraction: false }}
                    loop={hasBanners && banners.length > 1}
                    className="news-swiper"
                >
                    {hasBanners ? (
                        banners.map((banner, index) => (
                            <SwiperSlide key={banner.banner_id || index}>
                                <img
                                    src={banner.image_url}
                                    alt={`News Banner ${index + 1}`}
                                    className="news-banner-img"
                                />
                            </SwiperSlide>
                        ))
                    ) : (
                        <SwiperSlide>
                            <div className="news-banner-fallback">📰 Tin Tức</div>
                        </SwiperSlide>
                    )}
                </Swiper>
            </div>

            {/* ===== CONTENT ===== */}
            <div className="news-container">
                <div className="news-header">
                    <div className="news-header-icon">📰</div>
                    <h1>Tin Tức &amp; Sự Kiện</h1>
                    <p className="news-header-desc">
                        Cập nhật những thông tin mới nhất từ CineStar.
                    </p>
                    <div className="news-header-line"></div>
                </div>

                {news.length === 0 ? (
                    <div className="news-empty">
                        <h3>Chưa có bài viết</h3>
                        <p>Hiện tại chưa có bài viết nào.</p>
                    </div>
                ) : (
                    <div className="news-grid">
                        {news.slice(0, 4).map((item) => {
                            const metaText = `${formatDate(item.created_at)} • ${item.views || 0} lượt xem`;
                            const excerpt = renderExcerpt(item.content || '');

                            return (
                                <CinemaCard
                                    key={item.news_id}
                                    type="movie"
                                    image={item.news_image || null}
                                    title={item.title}
                                    link={`/news/detail/${item.slug}`}
                                    badge="TIN TỨC"
                                    subtitle={metaText}
                                    description={excerpt}
                                    // Thêm nút like tùy chỉnh (truyền qua children)
                                >
                                    {/* Thêm phần like vào dưới description */}
                                    <div className="news-card-like" onClick={(e) => handleLike(e, item.news_id)}>
                                        <Heart size={14} />
                                        <span>{item.likes || 0}</span>
                                    </div>
                                </CinemaCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default News;