import React from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    Eye,
    Calendar
} from "lucide-react";

import { optimizeCloudinary } from "../../utils/imageHelper";
import "../styles/NewsCard.css";

/* ==========================================================
   NEWS CARD — MAGAZINE 50/50
   ✅ ĐÃ TỐI ƯU ẢNH CHO MOBILE
========================================================== */

const getBackdropUrl = (backdrop) => {
    if (!backdrop) return "";

    if (
        backdrop.startsWith("http://") ||
        backdrop.startsWith("https://")
    ) {
        return backdrop;
    }

    return `https://api.quangdungcinema.id.vn/uploads/news/${backdrop}`;
};

const NewsCard = ({ news = [] }) => {
    const navigate = useNavigate();

    // 1 featured + 3 small = 4 bài
    const items = news.slice(0, 4);
    if (items.length === 0) return null;

    const [featured, ...rest] = items;

    /* ======================================================
       NAVIGATION
    ====================================================== */

    const handleNavigate = (slug) => {
        if (slug) navigate(`/news/detail/${slug}`);
    };

    const handleCardKeyDown = (event, slug) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleNavigate(slug);
        }
    };

    /* ======================================================
       HELPERS
    ====================================================== */

    const formatDate = (date) => {
        if (!date) return "";
        const parsed = new Date(date);
        return isNaN(parsed) ? "" : parsed.toLocaleDateString("vi-VN");
    };

    const renderExcerpt = (content = "", max = 140) => {
        const clean = String(content)
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return clean.length > max ? `${clean.slice(0, max)}...` : clean;
    };

    const getNewsImage = (item) => {
        const field = item.news_backdrop || item.news_image;
        return getBackdropUrl(field);
    };

    /* ======================================================
       FEATURED CARD
    ====================================================== */

    const FeaturedCard = ({ item }) => {
        const excerpt = renderExcerpt(item.content, 140);

        return (
            <article
                className="news-card news-card--featured"
                onClick={() => handleNavigate(item.slug)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) =>
                    handleCardKeyDown(event, item.slug)
                }
            >
                {/* IMAGE — Tối ưu cho featured (1200px) */}

                <div className="news-card__image">
                    <img
                        src={optimizeCloudinary(getNewsImage(item), 1200)}
                        alt={item.title || "News"}
                        loading="lazy"
                        decoding="async"
                        width="800"
                        height="450"
                        draggable={false}
                    />

                    <div className="news-card__gradient" />
                </div>


                {/* CONTENT */}

                <div className="news-card__content">

                    <div className="news-card__body">

                        <div className="news-card__meta">
                            <span className="news-card__meta-item">
                                <Calendar size={12} />
                                {formatDate(item.created_at)}
                            </span>

                            <span className="news-card__meta-item">
                                <Eye size={12} />
                                {item.views || 0} lượt xem
                            </span>
                        </div>


                        <h3 className="news-card__title">
                            {item.title}
                        </h3>


                        {excerpt && (
                            <p className="news-card__desc">
                                {excerpt}
                            </p>
                        )}

                    </div>


                    <button
                        type="button"
                        className="btn-news-action"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleNavigate(item.slug);
                        }}
                    >
                        <span>Xem thêm</span>
                        <ArrowUpRight
                            size={16}
                            className="btn-news-action__icon"
                        />
                    </button>

                </div>
            </article>
        );
    };

    /* ======================================================
       SMALL CARD
    ====================================================== */

    const SmallCard = ({ item }) => {
        const excerpt = renderExcerpt(item.content, 90);

        return (
            <article
                className="news-card news-card--small"
                onClick={() => handleNavigate(item.slug)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) =>
                    handleCardKeyDown(event, item.slug)
                }
            >
                {/* IMAGE — Tối ưu cho small (600px) */}

                <div className="news-card__image">
                    <img
                        src={optimizeCloudinary(getNewsImage(item), 600)}
                        alt={item.title || "News"}
                        loading="lazy"
                        decoding="async"
                        width="400"
                        height="225"
                        draggable={false}
                    />

                    <div className="news-card__gradient" />
                </div>


                {/* CONTENT */}

                <div className="news-card__content">

                    <div className="news-card__body">

                        <h4 className="news-card__title">
                            {item.title}
                        </h4>


                        <div className="news-card__meta">
                            <span className="news-card__meta-item">
                                <Calendar size={12} />
                                {formatDate(item.created_at)}
                            </span>
                        </div>


                        {excerpt && (
                            <p className="news-card__desc">
                                {excerpt}
                            </p>
                        )}

                    </div>


                    <button
                        type="button"
                        className="btn-news-action btn-news-action--sm"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleNavigate(item.slug);
                        }}
                    >
                        <span>Xem thêm</span>
                        <ArrowUpRight
                            size={15}
                            className="btn-news-action__icon"
                        />
                    </button>

                </div>
            </article>
        );
    };

    /* ======================================================
       MAIN LAYOUT — 50 / 50
    ====================================================== */

    return (
        <div className="news-magazine-layout">

            {/* LEFT — Featured */}

            <div className="news-magazine-layout__featured">
                <FeaturedCard item={featured} />
            </div>


            {/* RIGHT — 3 Small */}

            <div className="news-magazine-layout__side">
                {rest.map((item, idx) => (
                    <SmallCard
                        key={item.news_id || item.id || idx}
                        item={item}
                    />
                ))}
            </div>

        </div>
    );
};

export default NewsCard;