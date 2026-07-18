import React, { useRef, useState, useLayoutEffect, useCallback } from "react";
import "../styles/AutoFitTitle.css";

/*==========================================================
    CONFIG
==========================================================*/

const MIN_FONT_SIZE = 40;
const MAX_FONT_SIZE = 3000;             // Tăng lên để cho phép chữ cực to
const DEFAULT_LINE_HEIGHT = 0.86;
const DEFAULT_LETTER_SPACING = 0;
const FONT_FAMILY = "Anton";            // Đổi thành Anton để khớp với CSS

/*==========================================================
    COMPONENT
==========================================================*/

const AutoFitTitle = ({
    text = "",
    className = "",
    maxLines = 2,
    letterSpacing = DEFAULT_LETTER_SPACING,  // Cho phép truyền từ ngoài
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const frameRef = useRef(null);
    const [style, setStyle] = useState({
        fontSize: 120,
        lineHeight: DEFAULT_LINE_HEIGHT,
        letterSpacing: letterSpacing,
    });

    /*==========================================================
        CANVAS
    ==========================================================*/
    const getCanvas = () => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
        }
        return canvasRef.current.getContext("2d");
    };

    /*==========================================================
        MEASURE TEXT
    ==========================================================*/
    const measureWidth = (value, fontSize, letterSpacing = 0) => {
        const ctx = getCanvas();
        if (!ctx) return 0;
        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        const metrics = ctx.measureText(value);
        return metrics.width + Math.max(0, value.length - 1) * letterSpacing;
    };

    /*==========================================================
        SPLIT LINES
    ==========================================================*/
    const splitLines = useCallback((title, fontSize, maxWidth) => {
        if (!title.trim()) return [];
        const words = title.trim().split(/\s+/);
        const lines = [];
        let current = "";
        for (const word of words) {
            const next = current === "" ? word : `${current} ${word}`;
            if (measureWidth(next, fontSize, 0) <= maxWidth) {
                current = next;
                continue;
            }
            if (current !== "") {
                lines.push(current);
            }
            current = word;
        }
        if (current !== "") {
            lines.push(current);
        }
        return lines;
    }, []);

    /*==========================================================
        CHECK FIT
    ==========================================================*/
    const canFit = useCallback((fontSize, width, height) => {
        const lines = splitLines(text, fontSize, width);
        if (lines.length === 0 || lines.length > maxLines) return false;
        const totalHeight = lines.length * fontSize * DEFAULT_LINE_HEIGHT;
        if (totalHeight > height) return false;
        return true;
    }, [text, maxLines, splitLines]);

    /*==========================================================
        FIT TITLE
    ==========================================================*/
    const fitTitle = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width <= 0 || height <= 0) return;

        let low = MIN_FONT_SIZE;
        let high = MAX_FONT_SIZE;
        let bestFont = MIN_FONT_SIZE;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (canFit(mid, width, height)) {
                bestFont = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        setStyle({
            fontSize: bestFont,
            lineHeight: DEFAULT_LINE_HEIGHT,
            letterSpacing: letterSpacing,
        });
    }, [text, canFit, letterSpacing]);

    /*==========================================================
        SCHEDULE & EFFECTS
    ==========================================================*/
    const scheduleFit = useCallback(() => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => fitTitle());
    }, [fitTitle]);

    useLayoutEffect(() => {
        scheduleFit();
    }, [text, scheduleFit]);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        resizeObserverRef.current = new ResizeObserver(() => scheduleFit());
        resizeObserverRef.current.observe(container);
        window.addEventListener("resize", scheduleFit);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
            window.removeEventListener("resize", scheduleFit);
        };
    }, [scheduleFit]);

    /*==========================================================
        RENDER
    ==========================================================*/
    return (
        <div ref={containerRef} className={`auto-fit-title ${className}`}>
        <h1
    className="hero-movie-title"
    style={{
        fontSize: `${style.fontSize}px`,
        letterSpacing: `${style.letterSpacing}px`,
        lineHeight: style.lineHeight,
        margin: 0,
        width: "100%",
        whiteSpace: "nowrap",         // Không xuống dòng
        textTransform: "uppercase",
        overflow: "visible",          // Không giấu chữ
        textOverflow: "clip",         // Không dùng dấu ...
        userSelect: "none",
        textAlign: "left",
    }}
>
    {text}
</h1>
        </div>
    );
};

export default AutoFitTitle;