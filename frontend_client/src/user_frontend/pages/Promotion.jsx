import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Gift, AlertCircle } from 'lucide-react';

import CinemaCard from '../components/CinemaCard';
import '../styles/Promotion.css';

const DEFAULT_POSTER =
    "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/default-poster.jpg";

const getImageUrl = (imageField, baseUrl = '') => {
    if (!imageField) return DEFAULT_POSTER;
    if (imageField.startsWith('http://') || imageField.startsWith('https://')) {
        return imageField;
    }
    return baseUrl + imageField;
};

const Promotion = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);

    const promotionImageBaseUrl = "https://api.quangdungcinema.id.vn/uploads/promotions/";

    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                setLoading(true);
                const res = await axios.get('https://api.quangdungcinema.id.vn/api/promotions');
                setPromotions(res.data || []);
            } catch (error) {
                console.error("Lỗi khi tải khuyến mãi:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPromotions();
    }, []);

    if (loading) {
        return (
            <div className="promotion-page">
                <div className="promotion-container">
                    <div className="promotion-loading">
                        <div className="promotion-loading-spinner"></div>
                        <p>Đang tải chương trình khuyến mãi...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="promotion-page">
            <div className="promotion-container">
                {/* Header */}
                <div className="promotion-header">
                    <div className="promotion-header-icon"><Gift size={48} /></div>
                    <h1>Khuyến Mãi &amp; Ưu Đãi</h1>
                    <p className="promotion-header-desc">Cập nhật những chương trình ưu đãi hấp dẫn nhất từ CineStar.</p>
                    <div className="promotion-header-line"></div>
                </div>

                {/* Breadcrumb */}
                <div className="promotion-breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span>Khuyến mãi</span>
                </div>

                {/* Grid */}
                {promotions.length === 0 ? (
                    <div className="promotion-empty">
                        <AlertCircle size={48} />
                        <h3>Chưa có chương trình khuyến mãi</h3>
                        <p>Hiện tại chưa có chương trình ưu đãi nào. Vui lòng quay lại sau!</p>
                        <Link to="/" className="promotion-empty-btn">Về trang chủ</Link>
                    </div>
                ) : (
                    <div className="promotion-grid">
                        {promotions.map((promo) => {
                            const imageField = promo.promotion_image || promo.image_url;
                            const imageUrl = getImageUrl(imageField, promotionImageBaseUrl);
                            return (
                                <CinemaCard
                                    key={promo.promotion_id}
                                    type="promotion"
                                    image={imageUrl}
                                    title={promo.title}
                                    link={`/promotion/${promo.slug}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Promotion;