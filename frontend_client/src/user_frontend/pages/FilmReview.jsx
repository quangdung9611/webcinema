import React, {
    useState,
    useEffect,
} from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
    Heart,
    Eye,
} from 'lucide-react';
import '../styles/FilmReview.css';

const FilmReview = () => {
    const [news, setNews] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const IMAGE_BASE_URL =
        'https://api.quangdungcinema.id.vn/uploads';

    useEffect(() => {
        const fetchReviewData =
            async () => {
                try {
                    setLoading(true);

                    const response =
                        await axios.get(
                            'https://api.quangdungcinema.id.vn/api/news/all'
                        );

                    const sortedNews = (
                        response.data ||
                        []
                    ).sort(
                        (a, b) =>
                            new Date(
                                b.created_at
                            ) -
                            new Date(
                                a.created_at
                            )
                    );

                    setNews(
                        sortedNews
                    );
                } catch (error) {
                    console.error(
                        'Lỗi kết nối API:',
                        error
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            };

        fetchReviewData();

        window.scrollTo({
            top: 0,
            behavior:
                'smooth',
        });
    }, []);

    const handleLike =
        async (
            e,
            newsId
        ) => {
            e.preventDefault();

            try {
                await axios.post(
                    `https://api.quangdungcinema.id.vn/api/news/like/${newsId}`
                );

                setNews(
                    (
                        prevNews
                    ) =>
                        prevNews.map(
                            (
                                item
                            ) =>
                                item.news_id ===
                                newsId
                                    ? {
                                          ...item,
                                          likes:
                                              (
                                                  item.likes ||
                                                  0
                                              ) +
                                              1,
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

    const renderExcerpt =
        (
            content = ''
        ) => {
            const cleanText =
                content
                    .replace(
                        /<[^>]*>/g,
                        ''
                    )
                    .replace(
                        /&nbsp;/g,
                        ' '
                    )
                    .trim();

            return cleanText.length >
                120
                ? cleanText.slice(
                      0,
                      120
                  ) + '...'
                : cleanText;
        };

    const formatDate = (
        date
    ) => {
        if (!date)
            return 'Chưa cập nhật';

        const parsedDate =
            new Date(date);

        return isNaN(
            parsedDate
        )
            ? 'Chưa cập nhật'
            : parsedDate.toLocaleDateString(
                  'vi-VN'
              );
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
           <section className="film-review-hero">

                <img
                    src={`${IMAGE_BASE_URL}/film_review/banner_hero.png`}
                    alt=""
                    className="hero-banner-img"
                />
                <div className="film-review-overlay"></div>
                <div className="film-review-light"></div>
                <div className="film-review-text">
                    <span>
                        GÓC ĐIỆN ẢNH

                    </span>
                    <h1>
                        FILM REVIEW
                    </h1>
                    <h3>

                        Bình luận • Review • Phân tích phim

                    </h3>
                    <p>
                        Khám phá thế giới điện ảnh qua những bài viết đánh giá chuyên sâu,
                        phân tích nội dung, diễn xuất và nghệ thuật kể chuyện. Cập nhật các
                        góc nhìn độc đáo, cảm nhận chân thực cùng những tác phẩm nổi bật đang
                        được cộng đồng yêu phim quan tâm và thảo luận nhiều nhất.
                    </p>
                

                </div>
            </section>

            {/* CONTENT */}
            <div className="film-review-content">
                <div className="review-section-header">
                    <span className="section-line"></span>

                    <h2>
                        Bài Viết
                        Mới Nhất
                    </h2>
                </div>

                <div className="review-grid">
                    {news
                        .slice(
                            0,
                            4
                        )
                        .map(
                            (
                                item
                            ) => (
                                <Link
                                    key={
                                        item.news_id
                                    }
                                    to={`/film-review/${item.slug}`}
                                    className="review-item"
                                >
                                    {/* IMAGE */}
                                    <div className="review-image-wrapper">
                                        <img
                                            src={
                                                item.image_url
                                                    ? `${IMAGE_BASE_URL}/news/${item.image_url}`
                                                    : `${IMAGE_BASE_URL}/default-news.jpg`
                                            }
                                            alt={
                                                item.title
                                            }
                                        />

                                        <span className="review-badge">
                                            REVIEW
                                        </span>
                                    </div>

                                    {/* INFO */}
                                    <div className="review-content">
                                        <h3>
                                            {
                                                item.title
                                            }
                                        </h3>

                                        <p>
                                            {renderExcerpt(
                                                item.content ||
                                                    item.short_content
                                            )}
                                        </p>

                                        <div className="review-meta">
                                            <span
                                                onClick={(
                                                    e
                                                ) =>
                                                    handleLike(
                                                        e,
                                                        item.news_id
                                                    )
                                                }
                                            >
                                                <Heart size={16} />
                                                {item.likes ||
                                                    0}
                                            </span>

                                            <span>
                                                <Eye size={16} />
                                                {item.views ||
                                                    0}
                                            </span>

                                            <span>
                                                {formatDate(
                                                    item.created_at
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        )}
                </div>
            </div>
        </div>
    );
};

export default FilmReview;