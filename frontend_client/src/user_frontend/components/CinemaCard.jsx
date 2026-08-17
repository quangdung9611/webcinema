import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Phone, ExternalLink } from "lucide-react";
import "../styles/CinemaCard.css";

const CinemaCard = ({
    type = "movie", // "movie" | "cinema" | "promotion" | "news" | "blog"
    image,
    title,
    badge,
    buttonText = "Xem chi tiết",
    link,
    onClick,
    // Cinema props
    address,
    hotline,
    mapLink,
    // Detail props
    slug,
    detailType, // 'news' | 'promotion' | 'blog' | 'cinema'
}) => {

    const navigate = useNavigate();

    // ==========================================================
    // HANDLE NAVIGATION TO DETAIL
    // ==========================================================
    const navigateToDetail = () => {
        // Nếu có link custom thì dùng link đó
        if (link) {
            navigate(link);
            return;
        }

        // Nếu có slug và detailType thì điều hướng đến trang chi tiết
        if (slug && detailType) {
            const paths = {
                'promotion': `/promotion/detail/${slug}`,
                'news': `/news/detail/${slug}`,
                'blog': `/blog-cinema/detail/${slug}`,
                'cinema': `/cinema/detail/${slug}`,
                'movie': `/movie/detail/${slug}`
            };
            
            const path = paths[detailType] || `/${detailType}/detail/${slug}`;
            navigate(path);
            return;
        }

        // Fallback: nếu có link thì dùng
        if (link) {
            navigate(link);
        }
    };

    const handleActionClick = (e) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
            return;
        }
        navigateToDetail();
    };

    const handleCardClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        navigateToDetail();
    };

    // ==========================================================
    // DETERMINE BADGE COLOR & TEXT
    // ==========================================================
    const getBadgeClass = () => {
        switch (detailType) {
            case 'promotion':
                return 'badge-promotion';
            case 'news':
                return 'badge-news';
            case 'blog':
                return 'badge-blog';
            case 'cinema':
                return 'badge-cinema';
            default:
                return '';
        }
    };

    const getBadgeText = () => {
        if (badge) return badge;
        switch (detailType) {
            case 'promotion':
                return '🎁 Khuyến mãi';
            case 'news':
                return '📰 Tin tức';
            case 'blog':
                return '📝 Blog';
            case 'cinema':
                return '🎬 Rạp';
            default:
                return '';
        }
    };

    const isCinema = type === "cinema";

    return (
        <div
            className={`cinema-card ${type}`}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            aria-label={title}
        >
            <div className="cinema-card-inner">

                {/* IMAGE & HOVER OVERLAY */}
                <div className="cinema-card-image">
                    <img 
                        src={image} 
                        alt={title} 
                        loading="lazy"
                        draggable={false}
                    />

                    {(badge || detailType) && (
                        <h4 className={`cinema-card-badge ${getBadgeClass()}`}>
                            {getBadgeText()}
                        </h4>
                    )}

                    <div className="cinema-card-overlay">
                        <button 
                            className="btn-card-action"
                            onClick={handleActionClick}
                        >
                            <span>{buttonText}</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* INFO */}
                <div className="cinema-card-info">
                    <h3 className="cinema-card-title">{title}</h3>
                    
                    {isCinema && (
                        <>
                            {address && (
                                <div className="cinema-card-address">
                                    <MapPin size={14} />
                                    <span>{address}</span>
                                </div>
                            )}
                            {hotline && (
                                <div className="cinema-card-hotline">
                                    <Phone size={14} />
                                    <span>{hotline}</span>
                                </div>
                            )}
                            {mapLink && (
                                <a
                                    href={mapLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="cinema-card-map"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={14} />
                                    Xem Google Maps
                                </a>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CinemaCard;