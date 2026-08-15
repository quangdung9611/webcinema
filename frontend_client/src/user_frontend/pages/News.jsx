import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import {
    ChevronRight,
    Newspaper,
    AlertCircle
} from 'lucide-react';

import {
    Swiper,
    SwiperSlide
} from 'swiper/react';

import {
    Autoplay,
    EffectFade
} from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-fade';

import CinemaCard from '../components/CinemaCard';
import '../styles/News.css';

const News = () => {

    // ==========================================================
    // NEWS
    // ==========================================================

    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    // ==========================================================
    // BANNERS
    // ==========================================================

    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);

    // ==========================================================
    // FETCH BANNERS
    // ==========================================================

    useEffect(() => {

        const fetchBanners = async () => {

            try {

                setBannerLoading(true);

                const res = await api.get(
                    '/api/banners',
                    {
                        params: {
                            page: 'NEWS'
                        }
                    }
                );

                /*
                 * API trả về:
                 *
                 * {
                 *     success: true,
                 *     data: [
                 *         {
                 *             banner_id: 1,
                 *             page: "NEWS",
                 *             image_url: "...",
                 *             is_active: 1
                 *         }
                 *     ]
                 * }
                 *
                 * => BANNER NẰM TẠI:
                 *
                 * res.data.data
                 */

                const bannerData =
                    res.data?.success === true &&
                    Array.isArray(res.data?.data)
                        ? res.data.data
                        : [];

                setBanners(bannerData);

            } catch (error) {

                console.error(
                    'Lỗi tải banner News:',
                    error
                );

                setBanners([]);

            } finally {

                setBannerLoading(false);

            }
        };

        fetchBanners();

    }, []);

    // ==========================================================
    // FETCH NEWS
    // ==========================================================

    useEffect(() => {

        const fetchNews = async () => {

            try {

                setLoading(true);

                const res = await api.get(
                    '/api/news'
                );

                const newsData =
                    Array.isArray(res.data?.data)
                        ? res.data.data
                        : [];

                setNews(newsData);

            } catch (error) {

                console.error(
                    'Lỗi khi tải tin tức:',
                    error
                );

                setNews([]);

            } finally {

                setLoading(false);

            }
        };

        fetchNews();

    }, []);

    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading || bannerLoading) {

        return (
            <div className="news-page">

                <div className="news-container">

                    <div className="news-loading">

                        <div className="news-loading-spinner"></div>

                        <p>
                            Đang tải tin tức...
                        </p>

                    </div>

                </div>

            </div>
        );
    }

    // ==========================================================
    // BANNER STATE
    // ==========================================================

    const hasBanners = banners.length > 0;

    // ==========================================================
    // RENDER
    // ==========================================================

    return (

        <div className="news-page">


            {/* ==================================================
                BANNER SLIDER
            ================================================== */}

            <div className="news-hero">

                <div className="news-overlay"></div>

                <div className="news-light"></div>

                <div className="news-particles"></div>


                <Swiper
                    modules={[
                        Autoplay,
                        EffectFade
                    ]}
                    effect="fade"
                    fadeEffect={{
                        crossFade: true
                    }}
                    speed={1200}
                    autoplay={{
                        delay: 4500,
                        disableOnInteraction: false
                    }}
                    loop={
                        hasBanners &&
                        banners.length > 1
                    }
                    className="news-swiper"
                >

                    {hasBanners ? (

                        banners.map(
                            (banner, index) => (

                                <SwiperSlide
                                    key={
                                        banner.banner_id ||
                                        index
                                    }
                                >

                                    <img
                                        src={banner.image_url}
                                        alt={
                                            `News Banner ${index + 1}`
                                        }
                                        className="news-banner-img"
                                    />

                                </SwiperSlide>

                            )
                        )

                    ) : (

                        <SwiperSlide>

                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background:
                                        'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#888',
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                📰 Tin Tức
                            </div>

                        </SwiperSlide>

                    )}

                </Swiper>

            </div>


            {/* ==================================================
                MAIN CONTENT
            ================================================== */}

            <div className="news-container">


                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="news-header">

                    <div className="news-header-icon">

                        <Newspaper size={48} />

                    </div>

                    <h1>
                        Tin Tức &amp; Sự Kiện
                    </h1>

                    <p className="news-header-desc">
                        Cập nhật những thông tin mới nhất từ CineStar.
                    </p>

                    <div className="news-header-line"></div>

                </div>


                {/* ==================================================
                    BREADCRUMB
                ================================================== */}

                <div className="news-breadcrumb">

                    <Link to="/">
                        Trang chủ
                    </Link>

                    <ChevronRight size={14} />

                    <span>
                        Tin tức
                    </span>

                </div>


                {/* ==================================================
                    NEWS LIST
                ================================================== */}

                {news.length === 0 ? (

                    <div className="news-empty">

                        <AlertCircle size={48} />

                        <h3>
                            Chưa có bài viết
                        </h3>

                        <p>
                            Hiện tại chưa có bài viết nào.
                            Vui lòng quay lại sau!
                        </p>

                        <Link
                            to="/"
                            className="news-empty-btn"
                        >
                            Về trang chủ
                        </Link>

                    </div>

                ) : (

                    <div className="news-grid">

                        {news.map(
                            (item) => {

                                const imageUrl =
                                    item.news_image ||
                                    item.image_url ||
                                    null;

                                return (

                                    <CinemaCard
                                        key={
                                            item.news_id
                                        }
                                        type="news"
                                        image={imageUrl}
                                        title={item.title}
                                        link={
                                            `/news/${item.slug}`
                                        }
                                    />

                                );

                            }
                        )}

                    </div>

                )}

            </div>

        </div>
    );
};

export default News;