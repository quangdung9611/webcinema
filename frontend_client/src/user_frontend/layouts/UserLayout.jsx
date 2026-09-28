import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import UserHeader from '../components/UserHeader';
import UserFooter from '../components/UserFooter';
import CustomCursor from '../components/CustomCursor';

import '../styles/UserLayout.css';

// ============================================================
// USER LAYOUT — PAGE TRANSITION EDITION
// ============================================================
// UserLayout chịu trách nhiệm:
// - Custom Cursor (chỉ desktop, có toggle)
// - Header
// - Nội dung page + PAGE TRANSITION giữa các route
// - Footer
// ============================================================

/* ============================================================
   PAGE TRANSITION VARIANTS
   ============================================================ */

const pageVariants = {
    initial: {
        opacity: 0,
        scale: 1.02,
        filter: 'blur(4px)',
    },
    enter: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
        },
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        filter: 'blur(4px)',
        transition: {
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};

const UserLayout = () => {
    const location = useLocation();

    return (
        <div className="user-site-container">

            {/* ✅ CUSTOM CURSOR — chỉ desktop, có toggle */}
            <CustomCursor />

            {/* ==================================================
                HEADER
            ================================================== */}
            <header className="user-header-section">
                <UserHeader />
            </header>

            {/* ==================================================
                MAIN CONTENT — CÓ PAGE TRANSITION
            ================================================== */}
            <main className="user-main-content">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={location.pathname}
                        className="user-page-transition"
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* ==================================================
                FOOTER
            ================================================== */}
            <footer className="user-footer-section">
                <UserFooter />
            </footer>

        </div>
    );
};

export default UserLayout;