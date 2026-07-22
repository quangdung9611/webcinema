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

                {/* BADGE - dùng h4 */}
                {badge && (
                    <h4 className="cinema-card-badge">
                        {badge}
                    </h4>
                )}

                {/* TITLE - dùng h3, không có div thừa */}
                <h3 className="cinema-card-title">{title}</h3>

            </div>
        </div>
    );
};

export default CinemaCard;