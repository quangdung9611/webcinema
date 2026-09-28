import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clapperboard, Film } from 'lucide-react';
import '../styles/MovieDetailSwitchTransition.css';

/**
 * ============================================================
 * MOVIE DETAIL SWITCH TRANSITION
 * ============================================================
 * Hiệu ứng riêng cho:
 *
 * MovieDetail hiện tại
 *        ↓
 * click MovieCard ở "PHIM LIÊN QUAN"
 *        ↓
 * MovieDetailSwitchTransition
 *        ↓
 * MovieDetail mới
 *
 * KHÔNG thay thế MovieRevealTransition hiện tại.
 * ============================================================
 */

const MovieDetailSwitchTransition = ({
    movie,
    onComplete
}) => {
    const [phase, setPhase] = useState('enter');

    useEffect(() => {
        if (!movie) return;

        const timers = [
            setTimeout(() => {
                setPhase('projector');
            }, 80),

            setTimeout(() => {
                setPhase('screen');
            }, 420),

            setTimeout(() => {
                setPhase('poster');
            }, 760),

            setTimeout(() => {
                setPhase('title');
            }, 1250),

            setTimeout(() => {
                setPhase('flash');
            }, 1850),

            setTimeout(() => {
                setPhase('exit');
            }, 2150),

            setTimeout(() => {
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }, 2550)
        ];

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [movie, onComplete]);

    if (!movie) return null;

    const title =
        movie.title ||
        movie.movie_title ||
        'Bộ phim';

    const poster =
        movie.movie_poster ||
        movie.poster ||
        movie.poster_url ||
        '';

    const backdrop =
        movie.movie_backdrop ||
        movie.backdrop ||
        movie.backdrop_url ||
        '';

    const ageRating = movie.age_rating
        ? `T${movie.age_rating}`
        : 'P';

    const movieSlug =
        movie.slug ||
        movie.movie_slug ||
        '';

    return createPortal(
        <div
            className={`movie-detail-switch-overlay phase-${phase}`}
            aria-hidden="true"
        >
            {/* ==================================================
                BACKDROP CỦA PHIM MỚI
            ================================================== */}
            <div
                className="switch-backdrop"
                style={{
                    backgroundImage: backdrop
                        ? `url("${backdrop}")`
                        : 'none'
                }}
            />

            {/* ==================================================
                DARK CINEMATIC LAYER
            ================================================== */}
            <div className="switch-dark-layer" />

            {/* ==================================================
                FILM GRAIN
            ================================================== */}
            <div className="switch-film-grain" />

            {/* ==================================================
                PROJECTOR BEAMS
            ================================================== */}
            <div className="projector-beam beam-left" />
            <div className="projector-beam beam-right" />

            <div className="projector-source-light" />

            {/* ==================================================
                TOP CINEMA FRAME
            ================================================== */}
            <div className="cinema-top-frame">
                <span className="frame-line frame-line-left" />
                <span className="frame-brand">
                    QUANG DŨNG CINEMA
                </span>
                <span className="frame-line frame-line-right" />
            </div>

            {/* ==================================================
                CENTER CINEMA SCREEN
            ================================================== */}
            <div className="switch-screen-wrapper">
                <div className="switch-screen">

                    <div className="screen-reflection" />

                    {/* ==================================================
                        POSTER
                    ================================================== */}
                    <div className="switch-poster-stage">

                        <div className="poster-shadow" />

                        <div className="poster-frame">
                            {poster ? (
                                <img
                                    src={poster}
                                    alt=""
                                    className="switch-poster-image"
                                />
                            ) : (
                                <div className="switch-poster-placeholder">
                                    <Film size={54} />
                                </div>
                            )}

                            <div className="poster-gloss" />

                            <div className="poster-age">
                                {ageRating}
                            </div>
                        </div>
                    </div>

                    {/* ==================================================
                        MOVIE TITLE
                    ================================================== */}
                    <div className="switch-movie-info">

                        <div className="switch-now-showing">
                            <span className="showing-dot" />
                            NOW SHOWING
                        </div>

                        <div className="switch-title">
                            {title}
                        </div>

                        <div className="switch-meta">
                            <span>
                                <Clapperboard size={13} />
                                FEATURE FILM
                            </span>

                            {movieSlug && (
                                <span>
                                    <Film size={13} />
                                    QUANG DŨNG CINEMA
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ==================================================
                        SILVER SCAN LINE
                    ================================================== */}
                    <div className="silver-scan-line" />

                </div>
            </div>

            {/* ==================================================
                CORNER HUD
            ================================================== */}
            <div className="switch-corner switch-corner-tl" />
            <div className="switch-corner switch-corner-tr" />
            <div className="switch-corner switch-corner-bl" />
            <div className="switch-corner switch-corner-br" />

            {/* ==================================================
                CINEMA FLASH
            ================================================== */}
            <div className="cinema-switch-flash" />

            {/* ==================================================
                BOTTOM BRAND
            ================================================== */}
            <div className="switch-bottom-brand">
                <span>QD</span>
                <i />
                <strong>QUANG DŨNG CINEMA</strong>
                <i />
                <span>MOVIE EXPERIENCE</span>
            </div>
        </div>,
        document.body
    );
};

export default MovieDetailSwitchTransition;