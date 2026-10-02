import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    Eye,
    Calendar
} from "lucide-react";

// ❌ ĐÃ XÓA: import { optimizeCloudinary } from "../../utils/imageHelper";

import ContentRevealTransition from "./ContentRevealTransition";
import LazyImage from "./LazyImage";   // ✅ THÊM

import "../styles/NewsCard.css";

/* ==========================================================
   NEWS CARD — MAGAZINE 50/50
   + CINEMATIC CONTENT REVEAL
   + ZEPHYR HOVER
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

    const [reveal, setReveal] = useState({
        active: false,
        slug: "",
        image: "",
        title: "",
        subtitle: ""
    });

    const items = news.slice(0, 4);
    if (items.length === 0) return null;

    const [featured, ...rest] = items;

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
       NAVIGATE VỚI CINEMATIC REVEAL
    ====================================================== */

    const handleNavigate = useCallback((item) => {
        if (!item?.slug) return;

        // ✅ Dùng ảnh gốc, không optimize nữa
        const revealImage = getNewsImage(item);

        setReveal({
            active: true,
            slug: item.slug,
            image: revealImage,
            title: item.title || "",
            subtitle: renderExcerpt(item.content, 120)
        });
    }, []);

    /* ======================================================
       REVEAL COMPLETE → NAVIGATE
    ====================================================== */

    const handleRevealComplete = useCallback(() => {
        const targetSlug = reveal.slug;

        setReveal({
            active: false,
            slug: "",
            image: "",
            title: "",
            subtitle: ""
        });

        if (targetSlug) {
            navigate(`/news/detail/${targetSlug}`);
        }
    }, [navigate, reveal.slug]);

    /* ======================================================
       KEYBOARD
    ====================================================== */

    const handleCardKeyDown = (event, item) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleNavigate(item);
        }
    };

    /* ======================================================
       FEATURED CARD
    ====================================================== */

    const FeaturedCard = ({ item }) => {
        const excerpt = renderExcerpt(item.content, 140);

        return (
            <article
                className="news-card news-card--featured"
                onClick={() => handleNavigate(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => handleCardKeyDown(event, item)}
            >
                {/* IMAGE */}
                <div className="news-card__image">
                    {/* ✅ LazyImage với fill — ảnh gốc, không transform */}
                    <LazyImage
                        fill
                        src={getNewsImage(item)}
                        alt={item.title || "News"}
                        className="news-card__img"
                        draggable={false}
                        placeholderColor="#0f1115"
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
                            handleNavigate(item);
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
                onClick={() => handleNavigate(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => handleCardKeyDown(event, item)}
            >
                {/* IMAGE */}
                <div className="news-card__image">
                    {/* ✅ LazyImage với fill — ảnh gốc */}
                    <LazyImage
                        fill
                        src={getNewsImage(item)}
                        alt={item.title || "News"}
                        className="news-card__img"
                        draggable={false}
                        placeholderColor="#0f1115"
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
                            handleNavigate(item);
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
        <>
            <ContentRevealTransition
                active={reveal.active}
                image={reveal.image}
                title={reveal.title}
                type="NEWS"
                subtitle={reveal.subtitle}
                targetUrl={`/news/detail/${reveal.slug}`}
                onComplete={handleRevealComplete}
            />

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
        </>
    );
};

export default NewsCard;