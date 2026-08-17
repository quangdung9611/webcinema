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
import '../styles/BlogCinema.css';

const BlogCinema = () => {

    // ==========================================================
    // BLOG STATE
    // ==========================================================

    const [blogs, setBlogs] = useState([]);
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
                            page: 'BLOG'
                        }
                    }
                );

                const bannerData =
                    res.data?.success === true &&
                    Array.isArray(res.data?.data)
                        ? res.data.data
                        : [];

                setBanners(bannerData);

            } catch (error) {

                console.error(
                    'Lỗi tải banner Blog:',
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
    // FETCH BLOGS
    // ==========================================================

    useEffect(() => {

        const fetchBlogs = async () => {

            try {

                setLoading(true);

                const res = await api.get(
                    '/api/blog-cinema'
                );

                const blogData =
                    Array.isArray(res.data?.data)
                        ? res.data.data
                        : [];

                setBlogs(blogData);

            } catch (error) {

                console.error(
                    'Lỗi khi tải bài viết:',
                    error
                );

                setBlogs([]);

            } finally {

                setLoading(false);

            }
        };

        fetchBlogs();

    }, []);


    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading || bannerLoading) {

        return (
            <div className="blog-page">

                <div className="blog-container">

                    <div className="blog-loading">

                        <div className="blog-loading-spinner" />

                        <p>
                            Đang tải bài viết...
                        </p>

                    </div>

                </div>

            </div>
        );
    }


    // ==========================================================
    // BANNER CHECK
    // ==========================================================

    const hasBanners = banners.length > 0;


    // ==========================================================
    // RENDER
    // ==========================================================

    return (

        <div className="blog-page">


            {/* ==================================================
                BANNER SLIDER
            ================================================== */}

            <div className="blog-hero">

                <div className="blog-overlay"></div>

                <div className="blog-light"></div>

                <div className="blog-particles"></div>


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
                    className="blog-swiper"
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
                                            `Blog Banner ${index + 1}`
                                        }
                                        className="blog-banner-img"
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
                                📰 Blog Điện Ảnh
                            </div>

                        </SwiperSlide>

                    )}

                </Swiper>

            </div>


            {/* ==================================================
                BLOG CONTENT
            ================================================== */}

            <div className="blog-container">


                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="blog-header">

                    <div className="blog-header-icon">

                        <Newspaper size={48} />

                    </div>

                    <h1>
                        Blog Điện Ảnh
                    </h1>

                    <p className="blog-header-desc">
                        Cập nhật những tin tức mới nhất về phim ảnh,
                        review phim và sự kiện điện ảnh tại CineStar.
                    </p>

                    <div className="blog-header-line" />

                </div>


                {/* ==================================================
                    BREADCRUMB
                ================================================== */}

                <div className="blog-breadcrumb">

                    <Link to="/">
                        Trang chủ
                    </Link>

                    <ChevronRight size={14} />

                    <span>
                        Góc điện ảnh
                    </span>

                </div>


                {/* ==================================================
                    BLOG LIST
                ================================================== */}

                {blogs.length === 0 ? (

                    <div className="blog-empty">

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
                            className="blog-empty-btn"
                        >
                            Về trang chủ
                        </Link>

                    </div>

                ) : (

                    <div className="blog-grid">

                        {blogs.map(
                            (blog) => {

                                const imageUrl =
                                    blog.blog_image ||
                                    blog.image_url ||
                                    null;

                                return (

                                    <CinemaCard
                                        key={
                                            blog.blog_id
                                        }
                                        type="blog"
                                        detailType="blog"
                                        slug={blog.slug}
                                        image={imageUrl}
                                        title={blog.title}
                                        buttonText="Đọc thêm"
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

export default BlogCinema;