import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Phone, ExternalLink } from "lucide-react";
import "../styles/CinemaCard.css";

const CinemaCard = ({
    type = "movie", // "movie" | "cinema"
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
}) => {

    const navigate = useNavigate();

    const handleActionClick = (e) => {
        e.stopPropagation();
        if (onClick) return onClick();
        if (link) navigate(link);
    };

    const handleCardClick = () => {
        if (onClick) return onClick();
        if (link) navigate(link);
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

                    {badge && (
                        <h4 className="cinema-card-badge">
                            {badge}
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