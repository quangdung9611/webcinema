
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "../styles/ContentRevealTransition.css";

/**
 * ============================================================
 * CONTENT REVEAL TRANSITION
 * ============================================================
 *
 * Universal cinematic page transition.
 *
 * Không hình ảnh.
 * Không text.
 * Không content.
 *
 * Chỉ tập trung vào:
 * - Darkness
 * - Silver light
 * - Scan line
 * - Cinematic frame
 * - Particles
 * - Energy core
 * - Silver flash
 *
 * Timeline hiện tại:
 * ~1.6s
 */

const ContentRevealTransition = ({
    active = false,
    targetUrl = "",
    onComplete,
}) => {
    const [phase, setPhase] = useState("idle");

    useEffect(() => {
        if (!active) {
            setPhase("idle");
            return;
        }

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        /*
         * ======================================================
         * CINEMATIC TIMELINE
         * ======================================================
         *
         * 0.00s  → Prepare
         * 0.22s  → Dark
         * 0.48s  → Scan
         * 0.78s  → Reveal
         * 1.04s  → Energy
         * 1.32s  → Flash
         * 1.60s  → Navigate
         */

        const startTimer = setTimeout(() => {
            setPhase("prepare");
        }, 20);

        const darkTimer = setTimeout(() => {
            setPhase("dark");
        }, 220);

        const scanTimer = setTimeout(() => {
            setPhase("scan");
        }, 480);

        const revealTimer = setTimeout(() => {
            setPhase("reveal");
        }, 780);

        const energyTimer = setTimeout(() => {
            setPhase("energy");
        }, 1040);

        const flashTimer = setTimeout(() => {
            setPhase("flash");
        }, 1320);

        const completeTimer = setTimeout(() => {
            setPhase("complete");

            if (onComplete) {
                onComplete(targetUrl);
            }
        }, 1600);

        return () => {
            clearTimeout(startTimer);
            clearTimeout(darkTimer);
            clearTimeout(scanTimer);
            clearTimeout(revealTimer);
            clearTimeout(energyTimer);
            clearTimeout(flashTimer);
            clearTimeout(completeTimer);

            document.body.style.overflow = previousOverflow;
        };
    }, [active, targetUrl, onComplete]);

    if (!active) {
        return null;
    }

    return createPortal(
        <div
            className={`content-reveal ${phase}`}
            aria-hidden="true"
        >
            {/* ==================================================
                BACKGROUND
            ================================================== */}

            <div className="content-reveal__background" />

            <div className="content-reveal__vignette" />

            <div className="content-reveal__grain" />

            {/* ==================================================
                CINEMA BARS
            ================================================== */}

            <div className="content-reveal__bar content-reveal__bar--top" />

            <div className="content-reveal__bar content-reveal__bar--bottom" />

            {/* ==================================================
                AMBIENT LIGHT
            ================================================== */}

            <div className="content-reveal__ambient-light" />

            <div className="content-reveal__ambient-light content-reveal__ambient-light--left" />

            <div className="content-reveal__ambient-light content-reveal__ambient-light--right" />

            {/* ==================================================
                MAIN PORTAL
            ================================================== */}

            <div className="content-reveal__portal">

                <div className="content-reveal__frame">

                    <span className="content-reveal__corner content-reveal__corner--tl" />
                    <span className="content-reveal__corner content-reveal__corner--tr" />
                    <span className="content-reveal__corner content-reveal__corner--bl" />
                    <span className="content-reveal__corner content-reveal__corner--br" />

                </div>

                {/* Horizontal energy */}
                <div className="content-reveal__horizontal-light" />

                {/* Main scan */}
                <div className="content-reveal__scan-line" />

                {/* Vertical energy */}
                <div className="content-reveal__vertical-light" />

                {/* ==================================================
                    PARTICLES
                ================================================== */}

                <div className="content-reveal__particles">

                    <span className="content-reveal__particle particle-1" />
                    <span className="content-reveal__particle particle-2" />
                    <span className="content-reveal__particle particle-3" />
                    <span className="content-reveal__particle particle-4" />
                    <span className="content-reveal__particle particle-5" />
                    <span className="content-reveal__particle particle-6" />
                    <span className="content-reveal__particle particle-7" />
                    <span className="content-reveal__particle particle-8" />
                    <span className="content-reveal__particle particle-9" />
                    <span className="content-reveal__particle particle-10" />
                    <span className="content-reveal__particle particle-11" />
                    <span className="content-reveal__particle particle-12" />

                </div>

                {/* ==================================================
                    ENERGY CORE
                ================================================== */}

                <div className="content-reveal__core">

                    <div className="content-reveal__core-outer" />

                    <div className="content-reveal__core-ring" />

                    <div className="content-reveal__core-ring content-reveal__core-ring--inner" />

                    <div className="content-reveal__core-glow" />

                    <div className="content-reveal__core-dot" />

                </div>

            </div>

            {/* ==================================================
                CROSS LIGHT
            ================================================== */}

            <div className="content-reveal__cross-light">

                <span className="content-reveal__cross-line content-reveal__cross-line--horizontal" />

                <span className="content-reveal__cross-line content-reveal__cross-line--vertical" />

            </div>

            {/* ==================================================
                SILVER FLASH
            ================================================== */}

            <div className="content-reveal__flash" />

            {/* ==================================================
                FINAL SWEEP
            ================================================== */}

            <div className="content-reveal__sweep" />

        </div>,
        document.body
    );
};

export default ContentRevealTransition;

