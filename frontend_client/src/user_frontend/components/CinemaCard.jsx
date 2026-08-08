import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import "../styles/CinemaCard.css";

const CinemaCard = ({
    type = "movie",
    image,
    title,
    badge,
    buttonText = "Xem chi tiết",
    link,
    onClick
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

                    {/* BADGE - dùng h4 */}
                    {badge && (
                        <h4 className="cinema-card-badge">
                            {badge}
                        </h4>
                    )}

                    {/* OVERLAY LÀM MỜ VÀ HIỆN NÚT XEM CHI TIẾT (GIỐNG DEMO INDEX.HTML) */}
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

                {/* TITLE - dùng h3 */}
                <h3 className="cinema-card-title">{title}</h3>

            </div>
        </div>
    );
};

export default CinemaCard;