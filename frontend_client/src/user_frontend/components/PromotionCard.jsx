import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
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

    const handleNavigate = () => {
        if (onClick) return onClick();
        if (slug) navigate(`/promotion/detail/${slug}`);
    };

    return (
        <div
            className="promotion-card card-animated"
            style={{ '--card-index': index }}
            onClick={handleNavigate}
        >
            <div className="promotion-card__image">
                <div className="promotion-card__gradient" />

                <img
                    src={image}
                    alt={title}
                    loading="lazy"
                    draggable={false}
                />
            </div>

            <div className="promotion-card__content">
                <div className="promotion-card__body">
                    <h3 className="promotion-card__title">{title}</h3>

                    {text && (
                        <p className="promotion-card__text">{text}</p>
                    )}
                </div>

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
    );
};

export default PromotionCard;