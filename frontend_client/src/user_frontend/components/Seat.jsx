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
    heldByOther,
    number,
    onClick,
    adminMode = false
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

    return (
        <div
            className={`
                seat
                ${seatType || "STANDARD"}
                ${selected ? "selected" : ""}
                ${sold ? "sold" : ""}
                ${maintenance ? "maintenance" : ""}
                ${locked ? "locked" : ""}
                ${heldByOther ? "held-by-other" : ""}
            `}
            onClick={!isDisabled ? onClick : undefined}
        >
            <Icon className="seat-icon" />

            <span className="seat-number">
                {number}
            </span>
        </div>
    );
};

export default Seat;