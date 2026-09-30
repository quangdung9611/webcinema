// src/user_frontend/components/PageTransition.jsx

import React, {
    cloneElement,
    isValidElement,
    useEffect,
    useState,
} from "react";

import { useLocation } from "react-router-dom";

import "../styles/PageTransition.css";

/* ============================================================
   PAGE TRANSITION — FADE OUT + FADE IN (NO FRAMER MOTION)
   ============================================================
   ✅ Trang cũ FADE OUT + trượt lên nhẹ (300ms)
   ✅ Trang mới FADE IN + trượt lên từ dưới (400ms)
   ✅ Không dùng framer-motion
   ✅ Kỹ thuật "freeze location":
      - Khi route đổi → giữ displayLocation cũ
      - Chạy animation exit cho trang cũ
      - onAnimationEnd → swap sang location mới + chạy enter
   ⚠️ YÊU CẦU: children phải nhận prop `location`
      và truyền vào <Routes location={location}>
============================================================ */

const PageTransition = ({ children }) => {
    const location = useLocation();

    // Location đang được HIỂN THỊ (có thể trễ hơn location thật)
    const [displayLocation, setDisplayLocation] =
        useState(location);

    // enter | exit
    const [stage, setStage] = useState("enter");

    // ==========================================================
    // DETECT ROUTE CHANGE
    // ==========================================================

    useEffect(() => {
        if (
            location.pathname !==
            displayLocation.pathname
        ) {
            // Có route mới → bắt đầu exit
            setStage("exit");
        }
    }, [location, displayLocation]);

    // ==========================================================
    // HANDLE ANIMATION END
    // ==========================================================

    const handleAnimationEnd = (e) => {
        // Bỏ qua animation của phần tử con (event bubbles)
        if (e.target !== e.currentTarget) {
            return;
        }

        if (stage === "exit") {
            // Exit xong → swap sang trang mới
            setDisplayLocation(location);
            setStage("enter");
        }
    };

    // ==========================================================
    // INJECT displayLocation VÀO CHILDREN
    // ==========================================================

    const rendered = isValidElement(children)
        ? cloneElement(children, {
              location: displayLocation,
          })
        : children;

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
        <div
            className={`page-transition__inner page-transition--${stage}`}
            onAnimationEnd={handleAnimationEnd}
        >
            {rendered}
        </div>
    );
};

export default PageTransition;