
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import {
    ChevronRight,
    Gift,
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
import '../styles/Promotion.css';

const Promotion = () => {

    // ==========================================================
    // PROMOTIONS
    // ==========================================================

    const [promotions, setPromotions] = useState([]);
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
                            page: 'PROMOTION'
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
                 *             page: "PROMOTION",
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
                    'Lỗi tải banner Promotion:',
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
    // FETCH PROMOTIONS
    // ==========================================================

    useEffect(() => {

        const fetchPromotions = async () => {

            try {

                setLoading(true);

                const res = await api.get(
                    '/api/promotions'
                );

                const promotionData =
                    Array.isArray(res.data?.data)
                        ? res.data.data
                        : [];

                setPromotions(promotionData);

            } catch (error) {

                console.error(
                    'Lỗi khi tải khuyến mãi:',
                    error
                );

                setPromotions([]);

            } finally {

                setLoading(false);

            }
        };

        fetchPromotions();

    }, []);


    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading || bannerLoading) {

        return (
            <div className="promotion-page">

                <div className="promotion-container">

                    <div className="promotion-loading">

                        <div className="promotion-loading-spinner"></div>

                        <p>
                            Đang tải chương trình khuyến mãi...
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

        <div className="promotion-page">


            {/* ==================================================
                BANNER SLIDER
            ================================================== */}

            <div className="promotion-hero">

                <div className="promotion-overlay"></div>

                <div className="promotion-light"></div>

                <div className="promotion-particles"></div>


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
                    className="promotion-swiper"
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
                                            `Promotion Banner ${index + 1}`
                                        }
                                        className="promotion-banner-img"
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
                                🎁 Khuyến Mãi
                            </div>

                        </SwiperSlide>

                    )}

                </Swiper>

            </div>


            {/* ==================================================
                MAIN CONTENT
            ================================================== */}

            <div className="promotion-container">


                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="promotion-header">

                    <div className="promotion-header-icon">

                        <Gift size={48} />

                    </div>

                    <h1>
                        Khuyến Mãi &amp; Ưu Đãi
                    </h1>

                    <p className="promotion-header-desc">
                        Cập nhật những chương trình ưu đãi hấp dẫn nhất từ CineStar.
                    </p>

                    <div className="promotion-header-line"></div>

                </div>


                {/* ==================================================
                    BREADCRUMB
                ================================================== */}

                <div className="promotion-breadcrumb">

                    <Link to="/">
                        Trang chủ
                    </Link>

                    <ChevronRight size={14} />

                    <span>
                        Khuyến mãi
                    </span>

                </div>


                {/* ==================================================
                    PROMOTION LIST
                ================================================== */}

                {promotions.length === 0 ? (

                    <div className="promotion-empty">

                        <AlertCircle size={48} />

                        <h3>
                            Chưa có chương trình khuyến mãi
                        </h3>

                        <p>
                            Hiện tại chưa có chương trình ưu đãi nào.
                            Vui lòng quay lại sau!
                        </p>

                        <Link
                            to="/"
                            className="promotion-empty-btn"
                        >
                            Về trang chủ
                        </Link>

                    </div>

                ) : (

                    <div className="promotion-grid">

                        {promotions.map(
                            (promo) => {

                                const imageUrl =
                                    promo.promotion_image ||
                                    promo.image_url ||
                                    null;

                                return (

                                    <CinemaCard
                                        key={
                                            promo.promotion_id
                                        }
                                        type="promotion"
                                        image={imageUrl}
                                        title={promo.title}
                                        link={
                                            `/promotion/${promo.slug}`
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

export default Promotion;

