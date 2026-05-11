import { SeatNormal, SeatVIP, SeatCouple } from "./SeatIcon";

const Seat = ({ type, selected, sold, maintenance, number, onClick }) => {
  const seatType = type?.toUpperCase();

  let Icon = SeatNormal;

  if (seatType === "VIP") Icon = SeatVIP;
  else if (seatType === "COUPLE") Icon = SeatCouple;

  return (
    <div
      className={`seat ${seatType} ${selected ? "selected" : ""} ${sold ? "sold" : ""}   ${maintenance ? "maintenance" : ""} `}
      onClick={!sold ? onClick : undefined}
    >
      <Icon className="seat-icon" />

      <span className="seat-number">
        {number}
      </span>
    </div>
  );
};

export default Seat;