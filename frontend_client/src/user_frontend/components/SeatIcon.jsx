 // ===================== SeatIcon.jsx =====================


// =========================================================
// 💺 GHẾ THƯỜNG - STANDARD
// =========================================================

export const SeatNormal = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="currentColor"
  >

    {/* Lưng ghế */}
    <rect
      x="6"
      y="4"
      width="20"
      height="10"
      rx="4"
    />

    {/* Mặt ghế */}
    <rect
      x="4"
      y="12"
      width="24"
      height="12"
      rx="4"
    />

    {/* Chân ghế */}
    <rect
      x="6"
      y="24"
      width="4"
      height="4"
      rx="1"
    />

    <rect
      x="22"
      y="24"
      width="4"
      height="4"
      rx="1"
    />

  </svg>
);


// =========================================================
// 👑 GHẾ VIP
// =========================================================

export const SeatVIP = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="currentColor"
  >

    {/* Lưng ghế */}
    <rect
      x="6"
      y="4"
      width="20"
      height="10"
      rx="4"
    />

    {/* Mặt ghế */}
    <rect
      x="4"
      y="12"
      width="24"
      height="12"
      rx="4"
    />

    {/* Tay vịn trái */}
    <rect
      x="2"
      y="10"
      width="3"
      height="10"
      rx="1"
    />

    {/* Tay vịn phải */}
    <rect
      x="27"
      y="10"
      width="3"
      height="10"
      rx="1"
    />

    {/* Điểm nhấn VIP */}
    <circle
      cx="16"
      cy="17"
      r="3"
      fill="currentColor"
    />

  </svg>
);


// =========================================================
// ✨ GHẾ DELUXE
// =========================================================

export const SeatDeluxe = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="currentColor"
  >

    {/* Lưng ghế rộng */}
    <rect
      x="5"
      y="3"
      width="22"
      height="11"
      rx="5"
    />

    {/* Đệm lưng */}
    <rect
      x="8"
      y="5"
      width="16"
      height="7"
      rx="3"
      fill="currentColor"
    />

    {/* Mặt ghế */}
    <rect
      x="3"
      y="12"
      width="26"
      height="12"
      rx="5"
    />

    {/* Tay vịn trái */}
    <rect
      x="1"
      y="10"
      width="4"
      height="12"
      rx="2"
    />

    {/* Tay vịn phải */}
    <rect
      x="27"
      y="10"
      width="4"
      height="12"
      rx="2"
    />

    {/* Điểm nhấn Deluxe */}
    <circle
      cx="16"
      cy="18"
      r="2"
      fill="currentColor"
    />

    {/* Chân ghế */}
    <rect
      x="6"
      y="24"
      width="4"
      height="4"
      rx="1"
    />

    <rect
      x="22"
      y="24"
      width="4"
      height="4"
      rx="1"
    />

  </svg>
);


// =========================================================
// 🛋️ GHẾ RECLINER
// =========================================================

export const SeatRecliner = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="currentColor"
  >

    {/* Lưng ghế ngả */}
    <path
      d="
        M7 4
        C7 2.5 8.5 2 10 2
        H22
        C24 2 25 3.5 25 5
        V14
        C25 15.5 24 16 22.5 16
        H9.5
        C8 16 7 15 7 13.5
        Z
      "
    />

    {/* Đệm ngồi */}
    <path
      d="
        M4 14
        H28
        C29 14 30 15 30 16
        V22
        C30 23.5 29 24 27.5 24
        H4.5
        C3 24 2 23 2 21.5
        V16
        C2 15 3 14 4 14
        Z
      "
    />

    {/* Tay vịn trái */}
    <rect
      x="1"
      y="12"
      width="4"
      height="11"
      rx="2"
    />

    {/* Tay vịn phải */}
    <rect
      x="27"
      y="12"
      width="4"
      height="11"
      rx="2"
    />

    {/* Chỗ để chân */}
    <path
      d="
        M7 23
        H25
        C26 23 27 24 27 25
        V27
        C27 28 26 29 25 29
        H7
        C6 29 5 28 5 27
        V25
        C5 24 6 23 7 23
        Z
      "
    />

    {/* Đường phân cách chỗ để chân */}
    <line
      x1="8"
      y1="25.5"
      x2="24"
      y2="25.5"
      stroke="currentColor"
      strokeWidth="1"
    />

  </svg>
);


// =========================================================
// 💑 GHẾ ĐÔI - COUPLE
// =========================================================

export const SeatCouple = ({ className }) => (
  <svg
    viewBox="0 0 48 32"
    className={className}
    fill="currentColor"
  >

    {/* Lưng ghế */}
    <rect
      x="4"
      y="4"
      width="40"
      height="10"
      rx="6"
    />

    {/* Mặt ghế */}
    <rect
      x="2"
      y="12"
      width="44"
      height="12"
      rx="6"
    />

    {/* Tay vịn trái */}
    <rect
      x="0"
      y="10"
      width="4"
      height="12"
      rx="2"
    />

    {/* Tay vịn phải */}
    <rect
      x="44"
      y="10"
      width="4"
      height="12"
      rx="2"
    />

    {/* Đường chia hai chỗ */}
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