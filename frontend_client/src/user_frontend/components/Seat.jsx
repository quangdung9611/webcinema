import {
  SeatNormal,
  SeatVIP,
  SeatDeluxe,
  SeatRecliner,
  SeatCouple
} from "./SeatIcon";

const Seat = ({
  type,
  selected,
  sold,
  maintenance,
  locked,
  number,
  onClick
}) => {
  // =========================================================
  // CHUẨN HÓA LOẠI GHẾ
  // =========================================================

  const seatType = type?.toUpperCase();

  // =========================================================
  // CHỌN ICON THEO LOẠI GHẾ
  // =========================================================

  let Icon = SeatNormal;

  switch (seatType) {
    case "VIP":
      Icon = SeatVIP;
      break;

    case "DELUXE":
      Icon = SeatDeluxe;
      break;

    case "RECLINER":
      Icon = SeatRecliner;
      break;

    case "COUPLE":
      Icon = SeatCouple;
      break;

    case "STANDARD":
    default:
      Icon = SeatNormal;
      break;
  }

  // =========================================================
  // KIỂM TRA CÓ ĐƯỢC CLICK KHÔNG
  // =========================================================

  const isDisabled =
    sold ||
    maintenance ||
    locked;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className={`
        seat
        ${seatType || "STANDARD"}
        ${selected ? "selected" : ""}
        ${sold ? "sold" : ""}
        ${maintenance ? "maintenance" : ""}
        ${locked ? "locked" : ""}
      `}
      onClick={
        !isDisabled
          ? onClick
          : undefined
      }
    >
      {/* =====================================================
          SEAT ICON
      ===================================================== */}

      <Icon className="seat-icon" />

      {/* =====================================================
          SEAT NUMBER
      ===================================================== */}

      <span className="seat-number">
        {number}
      </span>
    </div>
  );
};

export default Seat;