// ============================================================
// BOOKING PROGRESS
// Dùng chung cho: Booking → Food → Payment
// ============================================================

import React from 'react';
import '../styles/BookingProgress.css';

const STEPS = [
    {
        number: 1,
        title: 'CHỌN SUẤT CHIẾU',
        description: 'Rạp • Ngày • Suất',
    },
    {
        number: 2,
        title: 'CHỌN GHẾ',
        description: 'Sơ đồ ghế',
    },
    {
        number: 3,
        title: 'THỨC ĂN',
        description: 'Đồ ăn • Nước uống',
    },
    {
        number: 4,
        title: 'THANH TOÁN',
        description: 'Xác nhận đơn',
    },
];

const BookingProgress = ({ currentStep = 1 }) => {
    const activeStep = Math.min(
        Math.max(Number(currentStep) || 1, 1),
        STEPS.length
    );

    return (
        <div className="booking-progress">
            <div className="booking-progress-track">

                {STEPS.map((step, index) => {
                    const isCompleted = step.number < activeStep;
                    const isActive = step.number === activeStep;
                    const isPending = step.number > activeStep;

                    return (
                        <React.Fragment key={step.number}>

                            {/* ==================================================
                                STEP
                            ================================================== */}
                            <div
                                className={`
                                    booking-progress-step
                                    ${isCompleted ? 'completed' : ''}
                                    ${isActive ? 'active' : ''}
                                    ${isPending ? 'pending' : ''}
                                `}
                            >

                                {/* Số bước */}
                                <div className="booking-progress-number">
                                    {isCompleted ? '✓' : `0${step.number}`}
                                </div>

                                {/* Nội dung */}
                                <div className="booking-progress-content">

                                    <div className="booking-progress-title">
                                        {step.title}
                                    </div>

                                    <div className="booking-progress-description">
                                        {step.description}
                                    </div>

                                </div>

                            </div>

                            {/* ==================================================
                                CONNECTOR
                            ================================================== */}
                            {index < STEPS.length - 1 && (
                                <div
                                    className={`
                                        booking-progress-connector
                                        ${
                                            step.number < activeStep
                                                ? 'completed'
                                                : ''
                                        }
                                    `}
                                />
                            )}

                        </React.Fragment>
                    );
                })}

            </div>
        </div>
    );
};

export default BookingProgress;