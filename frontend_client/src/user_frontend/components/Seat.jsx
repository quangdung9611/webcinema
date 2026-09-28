import {
    SeatNormal,
    SeatVIP,
    SeatDeluxe,
    SeatRecliner,
    SeatCouple
} from "./SeatIcon";

// ✅ Import CSS riêng cho Seat
import '../styles/Seat.css';

const Seat = ({
    type,
    selected,
    sold,
    maintenance,
    locked,
    heldByOther,
    number,
    onClick,
    adminMode = false,

    // ✅ Props mới cho hover preview (couple seat)
    highlighted = false,
    onMouseEnter,
    onMouseLeave,
}) => {

    const seatType = type?.toUpperCase();

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

    const isDisabled =
        sold ||
        locked ||
        heldByOther ||
        (maintenance && !adminMode);

    // ✅ Build className gọn hơn với array + filter
    const classNames = [
        'seat',
        seatType || 'STANDARD',
        selected ? 'selected' : '',
        sold ? 'sold' : '',
        maintenance ? 'maintenance' : '',
        locked ? 'locked' : '',
        heldByOther ? 'held-by-other' : '',
        highlighted ? 'highlighted' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classNames}
            onClick={!isDisabled ? onClick : undefined}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            role="button"
            aria-label={`Ghế ${number}`}
            aria-pressed={selected}
            aria-disabled={isDisabled}
        >
            <Icon className="seat-icon" />

            <span className="seat-number">
                {number}
            </span>
        </div>
    );
};

export default Seat;