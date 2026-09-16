import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, MapPin, Phone, ExternalLink } from "lucide-react";
import "../styles/CinemaCard.css";

const CinemaCard = ({
    type = "movie",
    image,
    title,
    text,                          // Text mô tả (giống PromotionCard)
    buttonText = "Xem chi tiết",
    link,
    onClick,
    // Cinema props
    address,
    hotline,
    mapLink,
    // Detail props
    slug,
    detailType,                    // Vẫn giữ để navigate
    index = 0,
}) => {
    const navigate = useNavigate();

    // ==========================================================
    // HANDLE NAVIGATION TO DETAIL
    // ==========================================================
    const navigateToDetail = () => {
        if (link) {
            navigate(link);
            return;
        }

        if (slug && detailType) {
            const paths = {
                promotion: `/promotion/detail/${slug}`,
                news:      `/news/detail/${slug}`,
                blog:      `/blog-cinema/detail/${slug}`,
                cinema:    `/cinema/detail/${slug}`,
                movie:     `/movie/detail/${slug}`,
            };

            const path = paths[detailType] || `/${detailType}/detail/${slug}`;
            navigate(path);
            return;
        }

        if (link) {
            navigate(link);
        }
    };

    const handleNavigate = () => {
        if (onClick) return onClick();
        navigateToDetail();
    };

    const isCinema = type === "cinema";

    return (
        <div
            className={`cinema-card cinema-card--${type} card-animated`}
            style={{ "--card-index": index }}
            onClick={handleNavigate}
            role="button"
            tabIndex={0}
            aria-label={title}
        >
            {/* ==================================================
                IMAGE AREA
            ================================================== */}
            <div className="cinema-card__image">
                <div className="cinema-card__gradient" />

                <img
                    src={image}
                    alt={title}
                    loading="lazy"
                    draggable={false}
                />
            </div>

            {/* ==================================================
                CONTENT AREA
            ================================================== */}
            <div className="cinema-card__content">
                <div className="cinema-card__body">
                    <h3 className="cinema-card__title">{title}</h3>

                    {/* Text mô tả */}
                    {text && (
                        <p className="cinema-card__text">{text}</p>
                    )}

                    {/* Cinema info: address + hotline */}
                    {isCinema && (
                        <>
                            {address && (
                                <div className="cinema-card__address">
                                    <MapPin size={14} />
                                    <span>{address}</span>
                                </div>
                            )}
                            {hotline && (
                                <div className="cinema-card__hotline">
                                    <Phone size={14} />
                                    <span>{hotline}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="cinema-card__footer">
                    {/* Nút "Xem chi tiết" */}
                    <a
                        className="cinema-card__link"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate();
                        }}
                    >
                        {buttonText}
                        <ArrowUpRight
                            size={16}
                            className="cinema-card__link-icon"
                        />
                    </a>

                    {/* Link Google Maps (chỉ cinema) */}
                    {isCinema && mapLink && (
                        <a
                            href={mapLink}
                            target="_blank"
                            rel="noreferrer"
                            className="cinema-card__map"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink size={14} />
                            Google Maps
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CinemaCard;