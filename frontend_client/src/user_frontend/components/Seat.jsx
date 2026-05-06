import { SeatNormal, SeatVIP, SeatCouple } from "./SeatIcon";

const Seat = ({ type, selected, sold, number, onClick }) => {
  const seatType = type?.toUpperCase(); // 🔥 FIX CHÍNH

  let Icon = SeatNormal;

  if (seatType === "VIP") Icon = SeatVIP;
  else if (seatType === "COUPLE") Icon = SeatCouple;

  return (
    <div
      className={`seat ${seatType} ${selected ? "selected" : ""} ${sold ? "sold" : ""}`}
      onClick={!sold ? onClick : undefined}
    >
      <Icon className="seat-icon" />

      {/* HIỂN THỊ SỐ GHẾ */}
      <span className="seat-number">{number}</span>
    </div>
  );
};

export default Seat;