// SeatIcons.jsx

// 💺 GHẾ THƯỜNG
export const SeatNormal = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">

    {/* Lưng ghế */}
    <rect x="6" y="4" width="20" height="10" rx="4" />

    {/* Mặt ghế */}
    <rect x="4" y="12" width="24" height="12" rx="4" />

    {/* Chân ghế */}
    <rect x="6" y="24" width="4" height="4" rx="1" />
    <rect x="22" y="24" width="4" height="4" rx="1" />

  </svg>
);

// 👑 GHẾ VIP
export const SeatVIP = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">

    {/* Lưng ghế */}
    <rect x="6" y="4" width="20" height="10" rx="4" />

    {/* Mặt ghế */}
    <rect x="4" y="12" width="24" height="12" rx="4" />

    {/* Tay vịn */}
    <rect x="2" y="10" width="3" height="10" rx="1" />
    <rect x="27" y="10" width="3" height="10" rx="1" />

    {/* Điểm nhấn VIP */}
    <circle cx="16" cy="17" r="3" fill="currentColor" />

  </svg>
);

// 💑 GHẾ ĐÔI
export const SeatCouple = ({ className }) => (
  <svg viewBox="0 0 48 32" className={className} fill="currentColor">

    {/* Lưng ghế */}
    <rect x="4" y="4" width="40" height="10" rx="6" />

    {/* Mặt ghế */}
    <rect x="2" y="12" width="44" height="12" rx="6" />

    {/* Tay vịn trái */}
    <rect x="0" y="10" width="4" height="12" rx="2" />

    {/* Tay vịn phải */}
    <rect x="44" y="10" width="4" height="12" rx="2" />

    {/* Đường chia */}
    <line
      x1="24"
      y1="12"
      x2="24"
      y2="24"
      stroke="currentColor"
      strokeWidth="1"
    />

  </svg>
);