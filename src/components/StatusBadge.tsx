import { CardStatus, CARD_STATUS_LABEL, CARD_STATUS_TONE } from "@/lib/program-status";
import Pill from "./Pill";

export default function StatusBadge({ status, remaining }: { status: CardStatus; remaining?: number | null }) {
  const label = status === "almost_full" && remaining != null ? `잔여 ${remaining}자리` : CARD_STATUS_LABEL[status];
  return <Pill tone={CARD_STATUS_TONE[status]}>{label}</Pill>;
}
