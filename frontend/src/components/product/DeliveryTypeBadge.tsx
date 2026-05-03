"use client";

import { DeliveryType } from "@episto/shared";
import { StatusBadge } from "../ui/status-badge";

export function DeliveryTypeBadge({
  deliveryType,
  label,
  className = "",
}: {
  deliveryType: string;
  label: string;
  className?: string | undefined;
}) {
  return (
    <StatusBadge
      tone={deliveryType === DeliveryType.registered ? "warning" : "neutral"}
      className={className}
    >
      {label}
    </StatusBadge>
  );
}
