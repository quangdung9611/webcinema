import React from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    Newspaper,
    Eye,
    Calendar
} from "lucide-react";

import "../styles/BlogCinemaCard.css";

/* ==========================================================
   BLOG CINEMA CARD — MAGAZINE 50/50

   DESKTOP:

   ┌──────────────────────────────┬──────────────────────────────┐
   │                              │ ┌──────────┬───────────────┐ │
   │                              │ │          │ TITLE         │ │
   │         FEATURED             │ │  IMAGE   │ DATE          │ │
   │                              │ │  16:9    │ ĐỌC THÊM ↗    │ │
   │         IMAGE 16:9           │ └──────────┴───────────────┘ │
   │                              │ ┌──────────┬───────────────┐ │
   │         CONTENT              │ │          │ TITLE         │ │
   │                              │ │  IMAGE   │ DATE          │ │
   │         ĐỌC THÊM ↗           │ │  16:9    │ ĐỌC THÊM ↗    │ │
   │                              │ └──────────┴───────────────┘ │
   │                              │ ┌──────────┬───────────────┐ │
   │                              │ │          │ TITLE         │ │
   │                              │ │  IMAGE   │ DATE          │ │
   │                              │ │  16:9    │ ĐỌC THÊM ↗    │ │
   └──────────────────────────────┴─┴──────────┴───────────────┘

   - Layout 50 / 50
   - Featured bên trái
   - 3 Small bên phải
   - Small card nằm ngang
   - Small image GIỮ 16:9
   - Không ép image full-height
   - Không overlay CTA
   - Đọc thêm nằm dưới content
   - Hover + Nút giống Promotion
   - Small card CÓ description 2 dòng giống featured
========================================================== */


/* ==========================================================
   IMAGE URL
========================================================== */

const getBackdropUrl = (backdrop) => {
    if (!backdrop) {
        return "";
    }

    if (
        backdrop.startsWith("http://") ||
        backdrop.startsWith("https://")
    ) {
        return backdrop;
    }

    return `https://api.quangdungcinema.id.vn/uploads/blog_cinema/${backdrop}`;
};


/* ==========================================================
   MAIN COMPONENT
========================================================== */

const BlogCinemaCard = ({ blogs = [] }) => {
    const navigate = useNavigate();

    // 1 featured + 3 small = 4 bài
    const items = blogs.slice(0, 4);

    if (items.length === 0) {
        return null;
    }

    const [featured, ...rest] = items;


    /* ======================================================
       NAVIGATION
    ====================================================== */

    const handleNavigate = (slug) => {
        if (slug) {
            navigate(`/blog-cinema/detail/${slug}`);
        }
    };


    /* ======================================================
       KEYBOARD
    ====================================================== */

    const handleCardKeyDown = (event, slug) => {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            handleNavigate(slug);
        }
    };


    /* ======================================================
       DATE
    ====================================================== */

    const formatDate = (date) => {
        if (!date) {
            return "";
        }

        const parsed = new Date(date);

        return isNaN(parsed)
            ? ""
            : parsed.toLocaleDateString("vi-VN");
    };


    /* ======================================================
       EXCERPT
    ====================================================== */

    const renderExcerpt = (
        content = "",
        max = 150
    ) => {
        const clean = String(content)
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (!clean) {
            return "";
        }

        return clean.length > max
            ? `${clean.slice(0, max)}...`
            : clean;
    };


    /* ======================================================
       IMAGE
    ====================================================== */

    const getBlogImage = (item) => {
        const field =
            item.blog_backdrop ||
            item.blog_image;

        return getBackdropUrl(field);
    };


    /* ======================================================
       FEATURED CARD
    ====================================================== */

    const FeaturedCard = ({ blog }) => {
        const excerpt = renderExcerpt(
            blog.description,
            150
        );

        return (
            <article
                className="blog-card blog-card--featured"
                onClick={() =>
                    handleNavigate(blog.slug)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) =>
                    handleCardKeyDown(
                        event,
                        blog.slug
                    )
                }
            >
                {/* IMAGE */}

                <div className="blog-card__image">
                    <img
                        src={getBlogImage(blog)}
                        alt={
                            blog.title ||
                            "Blog Cinema"
                        }
                        loading="lazy"
                        draggable={false}
                    />

                    <div className="blog-card__gradient" />

                    <span className="blog-card__badge">
                        <Newspaper size={12} />
                        Nổi bật
                    </span>
                </div>


                {/* CONTENT */}

                <div className="blog-card__content">

                    <div className="blog-card__meta">
                        <span className="blog-card__meta-item">
                            <Calendar size={12} />
                            {formatDate(
                                blog.created_at
                            )}
                        </span>

                        <span className="blog-card__meta-item">
                            <Eye size={12} />
                            {blog.views || 0} lượt xem
                        </span>
                    </div>


                    <h3 className="blog-card__title">
                        {blog.title}
                    </h3>


                    {excerpt && (
                        <p className="blog-card__desc">
                            {excerpt}
                        </p>
                    )}


                    <button
                        type="button"
                        className="btn-blog-action"
                        onClick={(event) => {
                            event.stopPropagation();

                            handleNavigate(
                                blog.slug
                            );
                        }}
                    >
                        <span>Đọc thêm</span>
                        <ArrowUpRight
                            size={16}
                            className="btn-blog-action__icon"
                        />
                    </button>

                </div>
            </article>
        );
    };


    /* ======================================================
       SMALL CARD
       — CÓ DESCRIPTION 2 DÒNG giống featured

       QUAN TRỌNG:
       Image luôn giữ tỷ lệ 16:9.

       Không ép:
       height: 100%
       object-fit: cover
    ====================================================== */

    const SmallCard = ({ blog }) => {
        // 👇 THÊM: render excerpt cho small card
        const excerpt = renderExcerpt(
            blog.description,
            90
        );

        return (
            <article
                className="blog-card blog-card--small"
                onClick={() =>
                    handleNavigate(blog.slug)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) =>
                    handleCardKeyDown(
                        event,
                        blog.slug
                    )
                }
            >
                {/* IMAGE */}

                <div className="blog-card__image">
                    <img
                        src={getBlogImage(blog)}
                        alt={
                            blog.title ||
                            "Blog Cinema"
                        }
                        loading="lazy"
                        draggable={false}
                    />

                    <div className="blog-card__gradient" />
                </div>


                {/* CONTENT */}

                <div className="blog-card__content">

                    <div className="blog-card__body">

                        <h4 className="blog-card__title">
                            {blog.title}
                        </h4>


                        <div className="blog-card__meta">
                            <span className="blog-card__meta-item">
                                <Calendar size={12} />
                                {formatDate(
                                    blog.created_at
                                )}
                            </span>
                        </div>


                        {/* 👇 THÊM: description 2 dòng cho small card */}
                        {excerpt && (
                            <p className="blog-card__desc">
                                {excerpt}
                            </p>
                        )}

                    </div>


                    <button
                        type="button"
                        className="btn-blog-action btn-blog-action--sm"
                        onClick={(event) => {
                            event.stopPropagation();

                            handleNavigate(
                                blog.slug
                            );
                        }}
                    >
                        <span>Đọc thêm</span>
                        <ArrowUpRight
                            size={15}
                            className="btn-blog-action__icon"
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
        <div className="blog-magazine-layout">

            {/* LEFT — 50% */}

            <div className="blog-magazine-layout__featured">
                <FeaturedCard blog={featured} />
            </div>


            {/* RIGHT — 50% */}

            <div className="blog-magazine-layout__side">

                {rest.map((blog, index) => (
                    <SmallCard
                        key={
                            blog.blog_id ||
                            blog.id ||
                            index
                        }
                        blog={blog}
                    />
                ))}

            </div>

        </div>
    );
};


export default BlogCinemaCard;