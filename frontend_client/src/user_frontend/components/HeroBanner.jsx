import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HeroBanner.css";

const HeroBanner = ({
  // ✅ Video Cloudinary — chỉ giữ video, bỏ poster
  videoSrc = "https://res.cloudinary.com/mlznpd9x/video/upload/v1790042515/movietheater_video_dyynv5.mp4"
}) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  // ==========================================================
  // VIDEO LOADED
  // ==========================================================
  const [, setVideoLoaded] = useState(false);

  // ==========================================================
  // SCROLL PARALLAX
  // ==========================================================
  useEffect(() => {
    const handleScroll = () => {
      if (!videoRef.current) return;

      const scrollY = window.scrollY;

      const progress = Math.min(
        Math.max(scrollY / window.innerHeight, 0),
        1
      );

      const scale = 1.04 + progress * 0.08;
      const translateY = progress * 25;

      videoRef.current.style.transform =
        `scale(${scale}) translateY(${translateY}px)`;
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className="hero-banner">

      {/* ==================================================
          BACKGROUND
      ================================================== */}
      <div className="hero-banner__bg">

        <video
          ref={videoRef}
          className="hero-banner__video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        {/* Làm tối nhẹ toàn cảnh */}
        <div className="hero-banner__overlay-base" />

        {/* Gradient từ trái sang phải */}
        <div className="hero-banner__overlay-side" />

        {/* Giữ tên class để không ảnh hưởng cấu trúc */}
        <div className="hero-banner__overlay-bottom" />

        {/* Cinematic vignette */}
        <div className="hero-banner__vignette" />
      </div>

      {/* ==================================================
          CONTENT
      ================================================== */}
      <div className="hero-banner__content">

        {/* ==================================================
            MAIN CONTENT
        ================================================== */}
        <div className="hero-banner__left">

          {/* Eyebrow */}
          <div className="hero-banner__eyebrow">
            <span className="hero-banner__eyebrow-line" />

            <span>
              TRẢI NGHIỆM ĐIỆN ẢNH ĐỈNH CAO
            </span>
          </div>

          {/* ==================================================
              TITLE
          ================================================== */}
          <h1 className="hero-banner__title">

            <span className="hero-banner__title-solid">
              CHẠM
            </span>

            <span className="hero-banner__title-outline">
              ẢNH
            </span>

          </h1>

          {/* Decorative line */}
          <div className="hero-banner__divider">
            <span />
          </div>

          {/* ==================================================
              DESCRIPTION
          ================================================== */}
          <p className="hero-banner__description">
            Âm thanh vòm sống động, hình ảnh 4K sắc nét và những câu chuyện
            lay động lòng người. Mỗi suất chiếu tại Quang Dũng Cinema là
            một hành trình điện ảnh đáng nhớ.
          </p>

          {/* ==================================================
              ACTIONS
          ================================================== */}
          <div className="hero-banner__actions">

            <button
              type="button"
              className="hero-banner__btn hero-banner__btn--primary"
              onClick={() => navigate("/booking")}
            >
              <span>Đặt vé ngay</span>

              <span className="hero-banner__btn-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="hero-banner__btn hero-banner__btn--secondary"
              onClick={() => navigate("/movies")}
            >
              Khám phá phim
            </button>

          </div>

        </div>

      </div>
    </header>
  );
};

export default HeroBanner;