package com.bihome.accesscard;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class AccessCardEnums {

    private AccessCardEnums() {
    }

    public enum CardType {
        ELEVATOR, DOOR, PARKING, MULTI;

        /** Thẻ gửi xe / đa năng mới liên kết được với hạng mục xe. */
        public boolean allowsVehicle() {
            return this == PARKING || this == MULTI;
        }
    }

    /**
     * Trạng thái thẻ: Trong kho → (cấp thẻ) Đang dùng ⇄ Khoá → Báo mất / Thu hồi; Thu hồi / Báo mất (tìm lại) →
     * Trong kho. Đang dùng / Khoá luôn gắn căn hộ; Trong kho / Thu hồi không gắn ai; Báo mất giữ người đã làm mất.
     */
    public enum CardStatus {
        IN_STOCK, IN_USE, LOCKED, LOST, REVOKED;

        private static final Map<CardStatus, Set<CardStatus>> NEXT = Map.of(
                IN_STOCK, EnumSet.of(IN_USE, LOST),
                IN_USE, EnumSet.of(LOCKED, LOST, REVOKED),
                LOCKED, EnumSet.of(IN_USE, LOST, REVOKED),
                LOST, EnumSet.of(IN_STOCK),
                REVOKED, EnumSet.of(IN_STOCK));

        /** Thẻ đang được gắn cho căn hộ / cư dân. */
        public static final Set<CardStatus> ASSIGNED = EnumSet.of(IN_USE, LOCKED);

        public Set<CardStatus> next() {
            return NEXT.get(this);
        }

        public boolean canMoveTo(CardStatus target) {
            return NEXT.get(this).contains(target);
        }
    }

    public enum HistoryAction {
        CREATED, ISSUED, STATUS_CHANGE, REASSIGNED
    }
}
