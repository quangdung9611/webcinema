
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Link } from 'react-router-dom';
import { Heart, Eye } from 'lucide-react';

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

import '../styles/FilmReview.css';

const FilmReview = () => {

    // ==========================================================
    // NEWS STATE
    // ==========================================================

    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);


    // ==========================================================
    // BANNER STATE
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
                            page: 'FILM_REVIEW'
                        }
                    }
                );

                console.log(
                    'FILM_REVIEW BANNER API:',
                    res.data
                );

                /*
                 * API hiện tại:
                 *
                 * {
                 *     success: true,
                 *     data: [
                 *         {
                 *             banner_id: 1,
                 *             page: "FILM_REVIEW",
                 *             image_url: "...",
                 *             is_active: 1
                 *         }
                 *     ]
                 * }
                 *
                 * => MẢNG BANNER nằm tại:
                 *
                 * res.data.data
                 *
                 * Không phải:
                 * res.data.data.data
                 */

                let bannerData = [];

                if (res.data?.success === true) {

                    // Trường hợp API hiện tại
                    if (Array.isArray(res.data?.data)) {

                        bannerData = res.data.data;

                    }

                    // Trường hợp sau này API trả pagination
                    else if (
                        Array.isArray(
                            res.data?.data?.data
                        )
                    ) {

                        bannerData = res.data.data.data;

                    }
                }

                setBanners(bannerData);

            } catch (error) {

                console.error(
                    'Lỗi tải banner Film Review:',
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

        const fetchReviewData = async () => {

            try {

                setLoading(true);

                const response = await api.get(
                    '/api/news/all'
                );

                /*
                 * API:
                 *
                 * [
                 *     {
                 *         news_id,
                 *         title,
                 *         slug,
                 *         news_image,
                 *         content,
                 *         likes,
                 *         views,
                 *         created_at
                 *     }
                 * ]
                 */

                const newsData =
                    Array.isArray(response.data)
                        ? response.data
                        : Array.isArray(response.data?.data)
                            ? response.data.data
                            : [];

                // Sắp xếp bài mới nhất trước
                const sortedNews = [...newsData].sort(
                    (a, b) =>
                        new Date(b.created_at) -
                        new Date(a.created_at)
                );

                setNews(sortedNews);

            } catch (error) {

                console.error(
                    'Lỗi kết nối API:',
                    error
                );

                setNews([]);

            } finally {

                setLoading(false);

            }
        };

        fetchReviewData();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

    }, []);


    // ==========================================================
    // HANDLE LIKE
    // ==========================================================

    const handleLike = async (
        e,
        newsId
    ) => {

        e.preventDefault();

        try {

            await api.post(
                `/api/news/like/${newsId}`
            );

            setNews(
                (prevNews) =>
                    prevNews.map(
                        (item) =>
                            item.news_id === newsId
                                ? {
                                    ...item,
                                    likes:
                                        (item.likes || 0) + 1
                                }
                                : item
                    )
            );

        } catch (error) {

            console.error(
                'Lỗi khi thích bài viết:',
                error
            );

        }
    };


    // ==========================================================
    // RENDER EXCERPT
    // ==========================================================

    const renderExcerpt = (
        content = ''
    ) => {

        const cleanText =
            String(content)
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim();

        return cleanText.length > 120
            ? `${cleanText.slice(0, 120)}...`
            : cleanText;
    };


    // ==========================================================
    // FORMAT DATE
    // ==========================================================

    const formatDate = (
        date
    ) => {

        if (!date) {
            return 'Chưa cập nhật';
        }

        const parsedDate =
            new Date(date);

        return isNaN(parsedDate)
            ? 'Chưa cập nhật'
            : parsedDate.toLocaleDateString(
                'vi-VN'
            );
    };


    // ==========================================================
    // LOADING
    // ==========================================================

    if (
        loading ||
        bannerLoading
    ) {

        return (
            <div className="film-review-loading">
                Đang tải dữ liệu...
            </div>
        );
    }


    // ==========================================================
    // BANNER CHECK
    // ==========================================================

    const hasBanners =
        banners.length > 0;


    // ==========================================================
    // RENDER
    // ==========================================================

    return (

        <div className="film-review-page">


            {/* ==================================================
                BANNER NGANG
            ================================================== */}

            <div className="film-review-hero">

                <div className="review-overlay"></div>

                <div className="review-light"></div>

                <div className="review-particles"></div>


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
                    className="review-swiper"
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
                                        src={
                                            banner.image_url
                                        }
                                        alt={
                                            `Film Review Banner ${index + 1}`
                                        }
                                        className="review-banner-img"
                                    />

                                </SwiperSlide>

                            )
                        )

                    ) : (

                        <SwiperSlide>

                            <div className="review-banner-fallback">
                                🎬 Film Review
                            </div>

                        </SwiperSlide>

                    )}

                </Swiper>

            </div>


            {/* ==================================================
                CONTENT
            ================================================== */}

            <div className="film-review-content">

                <div className="review-section-header">

                    <span className="section-line"></span>

                    <h2>
                        Bài Viết Mới Nhất
                    </h2>

                </div>


                {/* ==================================================
                    POSTER / CARD DỌC
                ================================================== */}

                {news.length === 0 ? (

                    <div className="review-empty">

                        <h3>
                            Chưa có bài viết
                        </h3>

                        <p>
                            Hiện tại chưa có bài review nào.
                        </p>

                    </div>

                ) : (

                    <div className="review-grid">

                        {news
                            .slice(0, 4)
                            .map(
                                (item) => (

                                    <Link
                                        key={
                                            item.news_id
                                        }
                                        to={
                                            `/film-review/${item.slug}`
                                        }
                                        className="review-item"
                                    >

                                        {/* ==========================
                                            IMAGE DỌC
                                        ========================== */}

                                        <div className="review-image-wrapper">

                                            {item.news_image ? (

                                                <img
                                                    src={
                                                        item.news_image
                                                    }
                                                    alt={
                                                        item.title
                                                    }
                                                    loading="lazy"
                                                />

                                            ) : (

                                                <div className="review-no-image">
                                                    🎬
                                                </div>

                                            )}

                                            <span className="review-badge">
                                                REVIEW
                                            </span>

                                        </div>


                                        {/* ==========================
                                            CONTENT
                                        ========================== */}

                                        <div className="review-content">

                                            <h3>
                                                {item.title}
                                            </h3>

                                            <p>
                                                {
                                                    renderExcerpt(
                                                        item.content ||
                                                        item.short_content ||
                                                        ''
                                                    )
                                                }
                                            </p>


                                            {/* ======================
                                                META
                                            ====================== */}

                                            <div className="review-meta">

                                                <span
                                                    onClick={(e) =>
                                                        handleLike(
                                                            e,
                                                            item.news_id
                                                        )
                                                    }
                                                >

                                                    <Heart
                                                        size={16}
                                                    />

                                                    {item.likes || 0}

                                                </span>


                                                <span>

                                                    <Eye
                                                        size={16}
                                                    />

                                                    {item.views || 0}

                                                </span>


                                                <span>

                                                    {
                                                        formatDate(
                                                            item.created_at
                                                        )
                                                    }

                                                </span>

                                            </div>

                                        </div>

                                    </Link>

                                )
                            )}

                    </div>

                )}

            </div>

        </div>
    );
};

export default FilmReview;
