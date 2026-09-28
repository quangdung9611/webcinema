
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import {
    optimizeCloudinary,
    IMAGE_SIZES
} from "../../utils/imageHelper";

import TiltCard from "./TiltCard";
import ContentRevealTransition from "./ContentRevealTransition";

import "../styles/PromotionCard.css";


const PromotionCard = ({
    slug,
    image,
    title,
    text,
    index = 0,
    onClick,
}) => {

    const navigate = useNavigate();

    // ============================================================
    // CONTENT REVEAL STATE
    // ============================================================

    const [showReveal, setShowReveal] = useState(false);


    // ============================================================
    // IMAGE
    // Dùng cùng ảnh đã optimize cho card
    // ============================================================

    const optimizedImage = optimizeCloudinary(
        image,
        IMAGE_SIZES.PROMOTION_CARD
    );


    // ============================================================
    // NAVIGATION
    // ============================================================

    const handleNavigate = useCallback(() => {

        // --------------------------------------------------------
        // Nếu component cha truyền onClick riêng
        // thì giữ nguyên behavior cũ.
        // --------------------------------------------------------

        if (onClick) {
            onClick();
            return;
        }


        // --------------------------------------------------------
        // Không có slug thì không làm gì
        // --------------------------------------------------------

        if (!slug) {
            return;
        }


        // --------------------------------------------------------
        // Bắt đầu Cinematic Content Reveal
        // Chưa navigate ngay.
        // --------------------------------------------------------

        setShowReveal(true);

    }, [onClick, slug]);


    // ============================================================
    // REVEAL COMPLETE
    // Sau khi animation hoàn tất mới chuyển trang
    // ============================================================

    const handleRevealComplete = useCallback(() => {

        setShowReveal(false);

        if (slug) {
            navigate(`/promotion/detail/${slug}`);
        }

    }, [navigate, slug]);


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <>
            {/* ====================================================
                CINEMATIC CONTENT REVEAL
                ==================================================== */}

            <ContentRevealTransition
                active={showReveal}
                image={optimizedImage}
                title={title}
                type="PROMOTION"
                subtitle={text}
                targetUrl={`/promotion/detail/${slug}`}
                onComplete={handleRevealComplete}
            />


            {/* ====================================================
                PROMOTION CARD
                ==================================================== */}

            <TiltCard
                maxTilt={7}
                scale={1.03}
                glare={true}
                shadow={true}
                edgeHighlight={true}
            >
                <div
                    className="promotion-card card-animated"
                    style={{
                        "--card-index": index
                    }}
                    onClick={handleNavigate}
                >

                    {/* ==================================================
                        IMAGE
                        ================================================== */}

                    <div className="promotion-card__image">

                        <div className="promotion-card__gradient" />

                        <img
                            src={optimizedImage}
                            alt={title}
                            loading="lazy"
                            decoding="async"
                            width="400"
                            height="250"
                            draggable={false}
                        />

                    </div>


                    {/* ==================================================
                        CONTENT
                        ================================================== */}

                    <div className="promotion-card__content">

                        <div className="promotion-card__body">

                            <h3 className="promotion-card__title">
                                {title}
                            </h3>

                            {text && (
                                <p className="promotion-card__text">
                                    {text}
                                </p>
                            )}

                        </div>


                        {/* ==================================================
                            DETAIL BUTTON
                            ================================================== */}

                        <a
                            className="promotion-card__link"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNavigate();
                            }}
                        >
                            Xem chi tiết

                            <ArrowUpRight
                                size={16}
                                className="promotion-card__link-icon"
                            />
                        </a>

                    </div>

                </div>
            </TiltCard>
        </>
    );
};


export default PromotionCard;

