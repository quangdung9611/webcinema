import React from 'react';

import {
    Search,
    Plus,
    LayoutDashboard
} from 'lucide-react';

import '../styles/AdminPage.css';

const AdminPage = ({

    /* =========================================================
        HEADER
    ========================================================= */
    title,
    subtitle,
    icon,

    /* =========================================================
        SEARCH
    ========================================================= */
    searchValue = '',
    onSearchChange,
    searchPlaceholder = 'Tìm kiếm...',

    /* =========================================================
        ACTION BUTTON
    ========================================================= */
    buttonText = 'Thêm mới',
    onAdd,

    /* =========================================================
        EXTRA ACTIONS
    ========================================================= */
    extraActions,

    /* =========================================================
        CONTENT
    ========================================================= */
    children

}) => {

    // ================================
    // ICON FALLBACK (MÌNH THÊM)
    // ================================
    const renderIcon = icon ? icon : <LayoutDashboard size={22} />;

    return (

        <div className="admin-page">

            {/* =====================================================
                HERO HEADER
            ===================================================== */}

            <div className="admin-page-hero">

                <div className="admin-page-hero-left">

                    <div className="admin-page-icon-box">
                        {renderIcon}
                    </div>

                    <div className="admin-page-hero-content">

                        <h1 className="admin-page-title">
                            {title}
                        </h1>

                        {
                            subtitle && (
                                <p className="admin-page-subtitle">
                                    {subtitle}
                                </p>
                            )
                        }

                    </div>

                </div>

                <div className="admin-page-hero-right">

                    {extraActions}

                    {
                        onAdd && (
                            <button
                                className="admin-page-add-btn"
                                onClick={onAdd}
                            >

                                <Plus size={18} />

                                <span>
                                    {buttonText}
                                </span>

                            </button>
                        )
                    }

                </div>

            </div>

            {/* =====================================================
                TOOLBAR
            ===================================================== */}

            {
                onSearchChange && (
                    <div className="admin-page-toolbar">

                        <div className="admin-page-search">

                            <Search
                                size={18}
                                className="admin-page-search-icon"
                            />

                            <input
                                type="text"
                                value={searchValue}
                                onChange={(e) =>
                                    onSearchChange(e.target.value)
                                }
                                placeholder={searchPlaceholder}
                                className="admin-page-search-input"
                            />

                        </div>

                        <div className="admin-page-toolbar-actions">

                            {extraActions}

                        </div>

                    </div>
                )
            }

            {/* =====================================================
                CONTENT
            ===================================================== */}

            <div className="admin-page-content">

                {children}

            </div>

        </div>

    );

};

export default AdminPage;