import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Heart, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/FilmReview.css';

const FilmReview = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const IMAGE_BASE_URL = 'https://api.quangdungcinema.id.vn/uploads';

    const ITEMS_PER_PAGE = 8; // 4 card x 2 hàng

    useEffect(() => {
        const fetchReviewData = async () => {
            try {
                setLoading(true);

                const resNews = await axios.get(
                    'https://api.quangdungcinema.id.vn/api/news/all'
                );

                setNews(resNews.data || []);
            } catch (error) {
                console.error('Lỗi kết nối API:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviewData();
        window.scrollTo(0, 0);
    }, []);

    const handleLike = async (e, newsId) => {
        e.preventDefault();

        try {
            await axios.post(
                `https://api.quangdungcinema.id.vn/api/news/like/${newsId}`
            );

            setNews((prevNews) =>
                prevNews.map((item) =>
                    item.news_id === newsId
                        ? {
                              ...item,
                              likes: (item.likes || 0) + 1,
                          }
                        : item
                )
            );
        } catch (error) {
            console.error('Lỗi khi thích bài viết:', error);
        }
    };

    const renderExcerpt = (item) => {
        const rawText = item.content || item.short_content || '';

        const cleanText = rawText
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ');

        return cleanText.length > 100
            ? cleanText.substring(0, 100) + '...'
            : cleanText;
    };

    // ===== Pagination =====
    const totalPages = Math.ceil(news.length / ITEMS_PER_PAGE);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentNews = news.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    const goToPage = (page) => {
        setCurrentPage(page);
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    if (loading) {
        return (
            <div className="film-review-loading">
                Đang tải dữ liệu...
            </div>
        );
    }

    return (
        <div className="film-review-page">

          {/* HERO BANNER */}
            <section className="film-review-hero">
                <img
                    src="https://api.quangdungcinema.id.vn/uploads/film_review/banner_hero.png"
                    alt="Film Review Banner"
                    className="hero-banner-img"
                />
            </section>

            {/* TITLE */}
            <div className="review-section-header">
                <span className="section-line"></span>
                <h2>BÀI VIẾT MỚI NHẤT</h2>
            </div>

            {/* GRID REVIEW */}
            <div className="review-grid">
                {currentNews.map((item) => (
                    <Link
                        key={item.news_id}
                        to={`/film-review/${item.slug}`}
                        className="review-card"
                    >
                        <div className="review-image-wrapper">
                            <img
                                src={`${IMAGE_BASE_URL}/news/${item.image_url}`}
                                alt={item.title}
                            />

                            <span className="review-badge">
                                REVIEW
                            </span>
                        </div>

                        <div className="review-content">
                            <h3>{item.title}</h3>

                            <p>
                                {renderExcerpt(item)}
                            </p>

                            <div className="review-meta">
                                <span
                                    onClick={(e) =>
                                        handleLike(
                                            e,
                                            item.news_id
                                        )
                                    }
                                >
                                    <Heart size={15} />
                                    {item.likes || 0}
                                </span>

                                <span>
                                    <Eye size={15} />
                                    {item.views || 0}
                                </span>

                                <span>
                                    {new Date(
                                        item.created_at
                                    ).toLocaleDateString(
                                        'vi-VN'
                                    )}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() =>
                            goToPage(currentPage - 1)
                        }
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {[...Array(totalPages)].map(
                        (_, index) => (
                            <button
                                key={index}
                                className={
                                    currentPage ===
                                    index + 1
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    goToPage(index + 1)
                                }
                            >
                                {index + 1}
                            </button>
                        )
                    )}

                    <button
                        disabled={
                            currentPage === totalPages
                        }
                        onClick={() =>
                            goToPage(currentPage + 1)
                        }
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilmReview;