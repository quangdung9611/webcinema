// SeatIcons.jsx

// 💺 GHẾ THƯỜNG
export const SeatNormal = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    {/* lưng ghế */}
    <rect x="6" y="4" width="20" height="10" rx="4" />

    {/* mặt ghế */}
    <rect x="4" y="12" width="24" height="12" rx="4" />

    {/* chân */}
    <rect x="6" y="24" width="4" height="4" rx="1" />
    <rect x="22" y="24" width="4" height="4" rx="1" />
  </svg>
);


// 👑 GHẾ VIP
export const SeatVIP = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    {/* lưng ghế */}
    <rect x="6" y="4" width="20" height="10" rx="4" />

    {/* mặt ghế */}
    <rect x="4" y="12" width="24" height="12" rx="4" />

    {/* tay vịn */}
    <rect x="2" y="10" width="3" height="10" rx="1" />
    <rect x="27" y="10" width="3" height="10" rx="1" />

    {/* điểm nhấn VIP */}
    <circle cx="16" cy="17" r="3" fill="#fff" />
  </svg>
);


// 💑 GHẾ ĐÔI (SOFA DÀI - CAO CẤP)
export const SeatCouple = ({ className }) => (
  <svg viewBox="0 0 48 32" className={className} fill="currentColor">

    {/* lưng ghế dài */}
    <rect x="4" y="4" width="40" height="10" rx="6" />

    {/* mặt ghế dài */}
    <rect x="2" y="12" width="44" height="12" rx="6" />

    {/* tay vịn trái */}
    <rect x="0" y="10" width="4" height="12" rx="2" />

    {/* tay vịn phải */}
    <rect x="44" y="10" width="4" height="12" rx="2" />

    {/* đường chia nhẹ */}
    <line 
      x1="24" 
      y1="12" 
      x2="24" 
      y2="24" 
      stroke="rgba(255,255,255,0.35)" 
      strokeWidth="1"
    />
  </svg>
);