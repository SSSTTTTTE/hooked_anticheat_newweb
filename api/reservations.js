import { handleReservationCreate, withJsonErrors } from "./_reservationShared.mjs";

export default function handler(req, res) {
  return withJsonErrors(req, res, handleReservationCreate);
}
