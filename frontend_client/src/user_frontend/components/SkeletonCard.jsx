import React from "react";
import "../styles/Skeleton.css";

/* ============================================================
   SKELETON CARD — Loading placeholder
   ============================================================
   ✅ Shimmer chạy qua khung xám
   ✅ 4 variant: movie, cinema, promotion, news, blog
   ✅ Tự match kích thước card thật
============================================================ */

const SkeletonCard = ({ variant = "movie", count = 1 }) => {
  const cards = Array.from({ length: count });

  return (
    <>
      {cards.map((_, i) => (
        <div
          key={i}
          className={`skeleton-card skeleton-card--${variant}`}
          aria-hidden="true"
        >
          {/* Ảnh */}
          <div className="skeleton-card__image skeleton-shimmer" />

          {/* Body */}
          <div className="skeleton-card__body">
            <div className="skeleton-line skeleton-line--title skeleton-shimmer" />
            <div className="skeleton-line skeleton-line--text skeleton-shimmer" />
            <div className="skeleton-line skeleton-line--text-short skeleton-shimmer" />
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;