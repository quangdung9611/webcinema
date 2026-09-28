import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    Eye,
    Calendar
} from "lucide-react";

import { optimizeCloudinary, IMAGE_SIZES } from "../../utils/imageHelper";

import TiltCard from "./TiltCard";
import ContentRevealTransition from "./ContentRevealTransition";

import "../styles/BlogCinemaCard.css";

/* ==========================================================
   BLOG CINEMA CARD — MAGAZINE 50/50 + 3D TILT
   + CINEMATIC CONTENT REVEAL
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

    // ============================================================
    // CONTENT REVEAL STATE
    // ============================================================

    const [reveal, setReveal] = useState({
        active: false,
        slug: "",
        image: "",
        title: "",
        subtitle: ""
    });

    // 1 featured + 3 small = 4 bài
    const items = blogs.slice(0, 4);

    if (items.length === 0) {
        return null;
    }

    const [featured, ...rest] = items;


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

    const renderExcerpt = (content = "", max = 150) => {
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
        const field = item.blog_backdrop || item.blog_image;
        return getBackdropUrl(field);
    };


    /* ======================================================
       ✅ NAVIGATE VỚI CINEMATIC REVEAL
    ====================================================== */

    const handleNavigate = useCallback((blog) => {
        if (!blog?.slug) return;

        const rawImage = getBlogImage(blog);

        // ✅ Optimize ảnh lớn để reveal đẹp hơn
        const revealImage = optimizeCloudinary(
            rawImage,
            IMAGE_SIZES.BLOG_FEATURED
        );

        setReveal({
            active: true,
            slug: blog.slug,
            image: revealImage,
            title: blog.title || "",
            subtitle: renderExcerpt(blog.description, 120)
        });
    }, []);


    /* ======================================================
       ✅ REVEAL COMPLETE → NAVIGATE
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
            navigate(`/blog-cinema/detail/${targetSlug}`);
        }
    }, [navigate, reveal.slug]);


    /* ======================================================
       KEYBOARD
    ====================================================== */

    const handleCardKeyDown = (event, blog) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleNavigate(blog);
        }
    };


    /* ======================================================
       FEATURED CARD
    ====================================================== */

    const FeaturedCard = ({ blog }) => {
        const excerpt = renderExcerpt(blog.description, 150);

        return (
            <TiltCard
                maxTilt={6}
                scale={1.02}
                glare={true}
                shadow={true}
                edgeHighlight={true}
            >
                <article
                    className="blog-card blog-card--featured"
                    onClick={() => handleNavigate(blog)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => handleCardKeyDown(event, blog)}
                >
                    {/* IMAGE */}
                    <div className="blog-card__image">
                        <img
                            src={optimizeCloudinary(
                                getBlogImage(blog),
                                IMAGE_SIZES.BLOG_FEATURED
                            )}
                            alt={blog.title || "Blog Cinema"}
                            loading="lazy"
                            decoding="async"
                            width="800"
                            height="450"
                            draggable={false}
                        />

                        <div className="blog-card__gradient" />
                    </div>

                    {/* CONTENT */}
                    <div className="blog-card__content">

                        <div className="blog-card__meta">
                            <span className="blog-card__meta-item">
                                <Calendar size={12} />
                                {formatDate(blog.created_at)}
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
                                handleNavigate(blog);
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
            </TiltCard>
        );
    };


    /* ======================================================
       SMALL CARD
    ====================================================== */

    const SmallCard = ({ blog }) => {
        const excerpt = renderExcerpt(blog.description, 90);

        return (
            <TiltCard
                maxTilt={5}
                scale={1.015}
                glare={false}
                shadow={true}
                edgeHighlight={true}
            >
                <article
                    className="blog-card blog-card--small"
                    onClick={() => handleNavigate(blog)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => handleCardKeyDown(event, blog)}
                >
                    {/* IMAGE */}
                    <div className="blog-card__image">
                        <img
                            src={optimizeCloudinary(
                                getBlogImage(blog),
                                IMAGE_SIZES.BLOG_SMALL
                            )}
                            alt={blog.title || "Blog Cinema"}
                            loading="lazy"
                            decoding="async"
                            width="400"
                            height="225"
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
                                    {formatDate(blog.created_at)}
                                </span>
                            </div>

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
                                handleNavigate(blog);
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
            </TiltCard>
        );
    };


    /* ======================================================
       MAIN LAYOUT — 50 / 50
    ====================================================== */

    return (
        <>
            {/* ==================================================
                ✅ CINEMATIC CONTENT REVEAL
            ================================================== */}

            <ContentRevealTransition
                active={reveal.active}
                image={reveal.image}
                title={reveal.title}
                type="BLOG CINEMA"
                subtitle={reveal.subtitle}
                targetUrl={`/blog-cinema/detail/${reveal.slug}`}
                onComplete={handleRevealComplete}
            />


            {/* ==================================================
                BLOG MAGAZINE LAYOUT
            ================================================== */}

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
        </>
    );
};


export default BlogCinemaCard;