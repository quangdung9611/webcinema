import React, {
    useState,
    useEffect,
    useMemo,
    useRef
} from "react";

import {
    X,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Modal from "../components/Modal";
import MoviePreviewHero from "../components/MoviePreviewHero";

import "../styles/MoviePreviewModal.css";

const MoviePreviewModal = ({
    open,
    onClose,
    movies = [],
    selectedMovie: defaultMovie,
    imageBaseUrl
}) => {

    /*=====================================================
        NAVIGATE
    =====================================================*/

    const navigate = useNavigate();

    /*=====================================================
        CONSTANT
    =====================================================*/

    const VISIBLE_POSTERS = 6;

    const HERO_DURATION = 650;

    /*=====================================================
        HERO STATE
    =====================================================*/

    const [selectedMovie, setSelectedMovie] =
        useState(null);

    const [incomingMovie, setIncomingMovie] =
        useState(null);

    const [isHeroSliding, setIsHeroSliding] =
        useState(false);

    /*=====================================================
        STRIP STATE
    =====================================================*/

    const [currentIndex, setCurrentIndex] =
        useState(0);

    const [sliderIndex, setSliderIndex] =
        useState(0);

    /*=====================================================
        TRAILER
    =====================================================*/

    const [showTrailer, setShowTrailer] =
        useState(false);

    /*=====================================================
        REF
    =====================================================*/

    const scrollRef =
        useRef(null);

    const trackRef =
        useRef(null);

    const animationRef =
        useRef(null);

    /*=====================================================
        LOAD DEFAULT MOVIE
    =====================================================*/

    useEffect(() => {

        if (!defaultMovie) return;

        setSelectedMovie(defaultMovie);

        setIncomingMovie(null);

        setIsHeroSliding(false);

    }, [defaultMovie]);

    /*=====================================================
        UPDATE ACTIVE INDEX
    =====================================================*/

    useEffect(() => {

        if (!selectedMovie) return;

        const index = movies.findIndex(

            movie =>

                movie.movie_id ===
                selectedMovie.movie_id

        );

        if (index === -1) return;

        setCurrentIndex(index);

        if (index >= VISIBLE_POSTERS) {

            setSliderIndex(

                index -
                VISIBLE_POSTERS +
                1

            );

        }

        else {

            setSliderIndex(0);

        }

    }, [selectedMovie, movies]);

    /*=====================================================
        UPDATE SLIDER
    =====================================================*/

    useEffect(() => {

        if (!trackRef.current) return;

        trackRef.current.style.setProperty(

            "--slider-index",

            sliderIndex

        );

    }, [sliderIndex]);

    /*=====================================================
        LOCK BODY
    =====================================================*/

    useEffect(() => {

        if (!open) return;

        document.body.style.overflow = "hidden";

        return () => {

            document.body.style.overflow = "";

        };

    }, [open]);

    /*=====================================================
        CLEAR TIMER
    =====================================================*/

    useEffect(() => {

        return () => {

            if (animationRef.current) {

                clearTimeout(animationRef.current);

            }

        };

    }, []);
        /*=====================================================
        CHANGE HERO
    =====================================================*/

    const changeHeroMovie = (movie) => {

        if (!movie) return;

        if (isHeroSliding) return;

        if (
            selectedMovie &&
            selectedMovie.movie_id === movie.movie_id
        ) {

            return;

        }

        const index = movies.findIndex(

            item =>

                item.movie_id ===
                movie.movie_id

        );

        if (index !== -1) {

            setCurrentIndex(index);

            if (index < sliderIndex) {

                setSliderIndex(index);

            }

            else if (

                index >=
                sliderIndex + VISIBLE_POSTERS

            ) {

                setSliderIndex(

                    index -
                    VISIBLE_POSTERS +
                    1

                );

            }

        }

        setIncomingMovie(movie);

        setIsHeroSliding(true);

        if (animationRef.current) {

            clearTimeout(animationRef.current);

        }

        animationRef.current = setTimeout(() => {

            setSelectedMovie(movie);

            setIncomingMovie(null);

            setIsHeroSliding(false);

        }, HERO_DURATION);

    };

    /*=====================================================
        BOOKING
    =====================================================*/

    const handleBooking = (movie) => {

        navigate(

            `/booking/${movie.slug || movie.movie_slug}`,

            {

                state: {

                    movie: {

                        movie_id:
                            movie.movie_id,

                        title:
                            movie.title,

                        poster_url:
                            movie.poster_url,

                        age_rating:
                            movie.age_rating,

                        slug:
                            movie.slug ||
                            movie.movie_slug

                    }

                }

            }

        );

    };

    /*=====================================================
        SLIDER
    =====================================================*/

    const prevMovie = () => {

        setSliderIndex(prev =>

            Math.max(prev - 1, 0)

        );

    };

    const nextMovie = () => {

        const maxIndex = Math.max(

            movies.length -
            VISIBLE_POSTERS,

            0

        );

        setSliderIndex(prev =>

            Math.min(

                prev + 1,

                maxIndex

            )

        );

    };

    /*=====================================================
        YOUTUBE
    =====================================================*/

    const getYoutubeID = (url) => {

        if (!url) return null;

        const regExp =
            /^.*(youtu\.be\/|v\/|embed\/|watch\?v=|\&v=)([^#&?]{11}).*/;

        const match = url.match(regExp);

        return match
            ? match[2]
            : null;

    };

    const videoId = useMemo(() => {

        return getYoutubeID(

            selectedMovie?.trailer_url

        );

    }, [selectedMovie]);

    /*=====================================================
        EMPTY
    =====================================================*/

    if (!selectedMovie) {

        return null;

    }
        /*=====================================================
        RENDER
    =====================================================*/

    return (

        <>

            <Modal
                open={open}
                onClose={onClose}
                size="xl"
                type="default"
                title=""
            >

                <div
                    className="preview-scroll-wrapper"
                    ref={scrollRef}
                >

                    {/*=================================================
                        HERO STAGE
                    =================================================*/}

                    <div className="preview-hero-stage">

                        {/* CURRENT HERO */}

                        <div
                            className={`preview-hero-layer current ${
                                isHeroSliding
                                    ? "hero-slide-out"
                                    : ""
                            }`}
                        >

                            <MoviePreviewHero
                                movie={selectedMovie}
                                imageBaseUrl={imageBaseUrl}
                                onBook={handleBooking}
                                onTrailer={() => setShowTrailer(true)}
                            />

                        </div>

                        {/* NEXT HERO */}

                        {incomingMovie && (

                            <div
                                className={`preview-hero-layer next ${
                                    isHeroSliding
                                        ? "hero-slide-in"
                                        : ""
                                }`}
                            >

                                <MoviePreviewHero
                                    movie={incomingMovie}
                                    imageBaseUrl={imageBaseUrl}
                                    onBook={handleBooking}
                                    onTrailer={() => setShowTrailer(true)}
                                />

                            </div>

                        )}

                    </div>

                    {/*=================================================
                        MOVIE STRIP
                    =================================================*/}

                    <div className="preview-movie-strip">

                        <div className="preview-strip-header">

                            <h2 className="preview-strip-title">

                                PHIM ĐANG CHIẾU

                            </h2>

                            <p className="preview-strip-subtitle">

                                Chọn phim để xem nhanh thông tin

                            </p>

                        </div>

                        <div className="preview-strip-wrapper">

                            {/* LEFT */}

                            <button
                                className="preview-slider-btn preview-slider-left"
                                onClick={prevMovie}
                                disabled={sliderIndex === 0}
                            >

                                <ChevronLeft size={26} />

                            </button>

                            {/* STRIP */}

                            <div className="preview-strip-slider">

                                <div
                                    ref={trackRef}
                                    className="preview-strip-track"
                                >

                                    {movies.map((movie) => {

                                        const active =
                                            selectedMovie.movie_id ===
                                            movie.movie_id;

                                        return (

                                            <div
                                                key={movie.movie_id}
                                                className={`preview-strip-card ${
                                                    active
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    changeHeroMovie(movie)
                                                }
                                            >

                                                <img
                                                    src={`${imageBaseUrl}/posters/${movie.poster_url}`}
                                                    alt={movie.title}
                                                    className="preview-strip-image"
                                                />

                                                <div className="preview-strip-gradient" />

                                                <div className="preview-strip-info">

                                                    <span className="preview-strip-name">

                                                        {movie.title}

                                                    </span>

                                                </div>

                                            </div>

                                        );

                                    })}

                                </div>

                            </div>

                            {/* RIGHT */}

                            <button
                                className="preview-slider-btn preview-slider-right"
                                onClick={nextMovie}
                                disabled={
                                    sliderIndex >=
                                    Math.max(
                                        movies.length -
                                            VISIBLE_POSTERS,
                                        0
                                    )
                                }
                            >

                                <ChevronRight size={26} />

                            </button>

                        </div>

                    </div>

                </div>

            </Modal>

            {/*=====================================================
                TRAILER
            =====================================================*/}

            {showTrailer && videoId && (

                <div
                    className="preview-trailer-overlay"
                    onClick={() => setShowTrailer(false)}
                >

                    <div
                        className="preview-trailer-modal"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <button
                            className="preview-trailer-close"
                            onClick={() => setShowTrailer(false)}
                        >

                            <X size={22} />

                        </button>

                        <iframe
                            title="Movie Trailer"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />

                    </div>

                </div>

            )}

        </>

    );

};

export default MoviePreviewModal;