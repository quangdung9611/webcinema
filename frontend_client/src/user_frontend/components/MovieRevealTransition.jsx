
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/MovieRevealTransition.css";

/* ============================================================
   MOVIE REVEAL TRANSITION
   CINEMA CURTAIN REVEAL
   ============================================================ */

const MovieRevealTransition = ({ movie, onComplete }) => {
    const [phase, setPhase] = useState("prepare");

    useEffect(() => {
        const timers = [];

        timers.push(
            setTimeout(() => {
                setPhase("lift");
            }, 40)
        );

        timers.push(
            setTimeout(() => {
                setPhase("reveal");
            }, 380)
        );

        timers.push(
            setTimeout(() => {
                setPhase("curtain-close");
            }, 720)
        );

        timers.push(
            setTimeout(() => {
                setPhase("curtain-hold");
            }, 1450)
        );

        timers.push(
            setTimeout(() => {
                setPhase("curtain-open");
            }, 1700)
        );

        timers.push(
            setTimeout(() => {
                setPhase("character");
            }, 2450)
        );

        timers.push(
            setTimeout(() => {
                setPhase("exit");
            }, 3350)
        );

        timers.push(
            setTimeout(() => {
                setPhase("complete");

                if (onComplete) {
                    onComplete();
                }
            }, 3850)
        );

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [onComplete]);

    /* ============================================================
       MOVIE DATA
       ============================================================ */

    const poster =
        movie?.movie_poster ||
        movie?.poster ||
        movie?.poster_url ||
        "";

    const backdrop =
        movie?.movie_backdrop ||
        movie?.backdrop ||
        movie?.backdrop_url ||
        poster;

    const title =
        movie?.title ||
        movie?.movie_title ||
        "Đang cập nhật";

    const ageRating =
        movie?.age_rating ||
        movie?.ageRating ||
        "T18";

    const movieId =
        movie?.movie_id ||
        movie?.id ||
        "---";

    const phaseClass = `movie-reveal movie-reveal--${phase}`;

    return createPortal(
        <div className={phaseClass}>

            {/* ====================================================
                BACKGROUND
               ==================================================== */}

            <div className="movie-reveal__background" />

            {/* ====================================================
                MOVIE BACKDROP
               ==================================================== */}

            <div
                className="movie-reveal__backdrop"
                style={{
                    backgroundImage: `url("${backdrop}")`,
                }}
            />

            <div className="movie-reveal__backdrop-vignette" />

            <div className="movie-reveal__screen-glow" />

            {/* ====================================================
                PROJECTOR LIGHT
               ==================================================== */}

            <div className="movie-reveal__projector">
                <span />
                <span />
                <span />
            </div>

            {/* ====================================================
                CHARACTER CARD
               ==================================================== */}

            <div className="movie-reveal__character">

                <div className="movie-reveal__character-shadow" />

                <div className="movie-reveal__character-card">

                    <div className="movie-reveal__character-border" />

                    <div className="movie-reveal__character-top">
                        <span>FEATURE FILM</span>

                        <strong>
                            {ageRating}
                        </strong>
                    </div>

                    <div className="movie-reveal__poster">

                        {poster ? (
                            <img
                                src={poster}
                                alt={title}
                                draggable={false}
                            />
                        ) : (
                            <div className="movie-reveal__poster-empty" />
                        )}

                        <div className="movie-reveal__poster-shine" />

                    </div>

                    <div className="movie-reveal__character-bottom">
                        <span>
                            QUANG DŨNG CINEMA
                        </span>
                    </div>

                </div>

            </div>

            {/* ====================================================
                CINEMA CURTAIN
               ==================================================== */}

            <div className="movie-reveal__curtain">

                {/* LEFT CURTAIN */}
                <div
                    className="
                        movie-reveal__curtain-side
                        movie-reveal__curtain-side--left
                    "
                >
                    <div className="movie-reveal__curtain-folds" />

                    <div className="movie-reveal__curtain-highlight" />

                    <div className="movie-reveal__curtain-edge" />
                </div>

                {/* RIGHT CURTAIN */}
                <div
                    className="
                        movie-reveal__curtain-side
                        movie-reveal__curtain-side--right
                    "
                >
                    <div className="movie-reveal__curtain-folds" />

                    <div className="movie-reveal__curtain-highlight" />

                    <div className="movie-reveal__curtain-edge" />
                </div>

                {/* TOP VALANCE */}
                <div className="movie-reveal__curtain-valance">
                    <div className="movie-reveal__valance-folds" />
                </div>

                {/* STAGE LIGHT */}
                <div className="movie-reveal__stage-light" />

            </div>

            {/* ====================================================
                CENTER CURTAIN LIGHT
               ==================================================== */}

            <div className="movie-reveal__curtain-light">
                <span />
                <span />
            </div>

            {/* ====================================================
                PARTICLES
               ==================================================== */}

            <div className="movie-reveal__particles">

                {Array.from({ length: 22 }).map((_, index) => (
                    <span
                        key={index}
                        style={{
                            "--particle-index": index,
                        }}
                    />
                ))}

            </div>

            {/* ====================================================
                FILM GRAIN
               ==================================================== */}

            <div className="movie-reveal__grain" />

        </div>,
        document.body
    );
};

export default MovieRevealTransition;

