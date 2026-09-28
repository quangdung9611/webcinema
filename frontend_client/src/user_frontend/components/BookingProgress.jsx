// ============================================================
// BOOKING PROGRESS
// Dùng chung cho: Booking → Food → Payment
// ============================================================

import React from 'react';
import { Check, MapPin, Armchair, UtensilsCrossed, CreditCard } from 'lucide-react';
import '../styles/BookingProgress.css';

const STEPS = [
    {
        number: 1,
        title: 'CHỌN SUẤT CHIẾU',
        description: 'Rạp • Ngày • Suất',
        icon: MapPin,
    },
    {
        number: 2,
        title: 'CHỌN GHẾ',
        description: 'Sơ đồ ghế',
        icon: Armchair,
    },
    {
        number: 3,
        title: 'THỨC ĂN',
        description: 'Đồ ăn • Nước uống',
        icon: UtensilsCrossed,
    },
    {
        number: 4,
        title: 'THANH TOÁN',
        description: 'Xác nhận đơn',
        icon: CreditCard,
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

                    const Icon = step.icon;

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

                                {/* Số bước / icon */}
                                <div className="booking-progress-number">
                                    {isCompleted ? (
                                        <Check size={18} strokeWidth={3} />
                                    ) : (
                                        <Icon size={18} strokeWidth={2.2} />
                                    )}
                                    <span className="booking-progress-step-label">
                                        0{step.number}
                                    </span>
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