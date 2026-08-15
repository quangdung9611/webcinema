import React, { useState } from 'react';
import {
    Star,
    X,
    Quote,
    ChevronRight,
    ShieldCheck
} from 'lucide-react';

import LoadingButton from './LoadingButton';
import '../styles/ReviewModal.css';

const MAX_CONTENT_LENGTH = 1000;

const ReviewModal = ({
    isOpen,
    onClose,
    onSubmit,
    loading
}) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [content, setContent] = useState('');

    if (!isOpen) return null;

    // ==========================================================
    // SUBMIT REVIEW
    // ==========================================================
    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return;
        }

        onSubmit({
            content: trimmedContent,
            rating
        });
    };

    // ==========================================================
    // CLOSE MODAL
    // ==========================================================
    const handleClose = () => {
        setRating(5);
        setContent('');
        setHoverRating(0);

        onClose();
    };

    // ==========================================================
    // CONTENT CHANGE
    // ==========================================================
    const handleContentChange = (e) => {
        const value = e.target.value;

        if (value.length <= MAX_CONTENT_LENGTH) {
            setContent(value);
        }
    };

    const currentRating = hoverRating || rating;

    return (
        <div
            className="review-modal-overlay"
            onClick={handleClose}
        >
            <div
                className="review-modal-container"
                onClick={(e) => e.stopPropagation()}
            >

                {/* ==================================================
                    PREMIUM DECORATION
                ================================================== */}
                <div className="review-modal-top-line" />
                <div className="review-modal-corner review-modal-corner-tl" />
                <div className="review-modal-corner review-modal-corner-tr" />

                {/* ==================================================
                    CLOSE BUTTON
                ================================================== */}
                <button
                    type="button"
                    className="review-modal-close"
                    onClick={handleClose}
                    aria-label="Đóng"
                >
                    <X size={21} strokeWidth={1.7} />
                </button>

                {/* ==================================================
                    HEADER
                ================================================== */}
                <header className="review-modal-header">

                    <div className="review-modal-icon">
                        <Quote
                            size={25}
                            strokeWidth={1.8}
                        />
                    </div>

                    <div className="review-modal-title-wrap">
                        <span className="review-modal-eyebrow">
                            QUANG DUNG CINEMA
                        </span>

                        <h2>
                            Gửi đánh giá của bạn
                        </h2>

                        <p>
                            Chia sẻ trải nghiệm để chúng tôi
                            phục vụ bạn tốt hơn.
                        </p>
                    </div>

                    <div className="review-modal-divider">
                        <span />
                        <i />
                        <span />
                    </div>

                </header>

                {/* ==================================================
                    FORM
                ================================================== */}
                <form
                    onSubmit={handleSubmit}
                    className="review-modal-form"
                >

                    {/* ==================================================
                        RATING
                    ================================================== */}
                    <section className="review-rating-section">

                        <div className="review-section-heading">
                            <span className="review-section-number">
                                01
                            </span>

                            <div>
                                <h3>
                                    Đánh giá của bạn
                                </h3>

                                <p>
                                    Chọn mức độ hài lòng của bạn
                                </p>
                            </div>
                        </div>

                        <div className="review-stars-area">

                            <div
                                className="review-stars-input"
                                onMouseLeave={() => setHoverRating(0)}
                            >
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isActive =
                                        star <= currentRating;

                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`review-star-btn ${
                                                isActive ? 'active' : ''
                                            }`}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() =>
                                                setHoverRating(star)
                                            }
                                            aria-label={`${star} sao`}
                                        >
                                            <Star
                                                size={40}
                                                fill={
                                                    isActive
                                                        ? 'currentColor'
                                                        : 'transparent'
                                                }
                                                strokeWidth={1.4}
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="review-rating-result">
                                <strong>
                                    {currentRating}.0
                                </strong>

                                <span>
                                    / 5 sao
                                </span>
                            </div>

                            <span className="review-rating-message">
                                {currentRating === 5
                                    ? 'Tuyệt vời! Cảm ơn bạn ❤️'
                                    : currentRating === 4
                                        ? 'Rất tốt! Cảm ơn bạn.'
                                        : currentRating === 3
                                            ? 'Cảm ơn bạn đã chia sẻ.'
                                            : currentRating === 2
                                                ? 'Chúng tôi sẽ cố gắng cải thiện.'
                                                : 'Chúng tôi rất tiếc về trải nghiệm này.'
                                }
                            </span>

                        </div>

                    </section>

                    {/* ==================================================
                        CONTENT
                    ================================================== */}
                    <section className="review-content-section">

                        <div className="review-section-heading">
                            <span className="review-section-number">
                                02
                            </span>

                            <div>
                                <h3>
                                    Chia sẻ trải nghiệm
                                </h3>

                                <p>
                                    Mọi ý kiến của bạn đều rất quan trọng
                                </p>
                            </div>
                        </div>

                        <div className="review-textarea-wrapper">

                            <textarea
                                className="review-textarea-premium"
                                placeholder="Hãy chia sẻ cảm nhận của bạn về dịch vụ của chúng tôi..."
                                value={content}
                                onChange={handleContentChange}
                                rows={5}
                                maxLength={MAX_CONTENT_LENGTH}
                                required
                            />

                            <div className="review-textarea-meta">
                                <span>
                                    Nội dung đánh giá
                                </span>

                                <span>
                                    {content.length}/{MAX_CONTENT_LENGTH}
                                </span>
                            </div>

                        </div>

                    </section>

                    {/* ==================================================
                        SUBMIT
                    ================================================== */}
                    <div className="review-submit-wrapper">

                        <LoadingButton
                            type="submit"
                            loading={loading}
                            loadingText="Đang gửi..."
                            disabled={
                                loading ||
                                !content.trim()
                            }
                            className="review-submit-btn"
                            spinnerColor="#17191c"
                        >
                            <span>
                                Gửi đánh giá
                            </span>

                          
                        </LoadingButton>

                    </div>

                </form>

                {/* ==================================================
                    FOOTER
                ================================================== */}
                <footer className="review-modal-footer">

                    <ShieldCheck
                        size={16}
                        strokeWidth={1.6}
                    />

                    <span>
                        Đánh giá của bạn sẽ được duyệt trước khi
                        hiển thị công khai
                    </span>

                </footer>

            </div>
        </div>
    );
};

export default ReviewModal;