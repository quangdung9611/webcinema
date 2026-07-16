import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CinemaCard.css";

const CinemaCard = ({
    type = "movie",
    image,
    title,
    badge,
    link,
    onClick
}) => {

    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) return onClick();
        if (link) navigate(link);
    };

    return (
        <div
            className={`cinema-card ${type}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={title}
        >
            <div className="cinema-card-inner">

                {/* IMAGE */}
                <div className="cinema-card-image">
                    <img 
                        src={image} 
                        alt={title} 
                        loading="lazy"
                        draggable={false}
                    />
                </div>

                {/* BADGE */}
                {badge && (
                    <div className="cinema-card-badge">
                        {badge}
                    </div>
                )}

                {/* CONTENT - CHỈ CÓ TITLE */}
                <div className="cinema-card-content">
                    <h3 className="cinema-card-title">
                        {title}
                    </h3>
                </div>

                {/* EFFECT */}
                <span className="cinema-card-sweep"></span>
                <span className="cinema-card-glow"></span>

            </div>
        </div>
    );
};

export default CinemaCard;