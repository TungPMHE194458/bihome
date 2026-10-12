package com.bihome.ticket;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class TicketEnums {

    private TicketEnums() {
    }

    /**
     * Trạng thái yêu cầu và luồng chuyển hợp lệ:
     * Mới → Đã tiếp nhận / Đang xử lý / Huỷ; Đã tiếp nhận → Đang xử lý / Chờ phản hồi / Huỷ;
     * Đang xử lý ⇄ Chờ phản hồi; Đang xử lý / Chờ phản hồi → Hoàn thành / Huỷ;
     * Hoàn thành → Đóng hoặc mở lại (Đang xử lý). Đóng và Huỷ là trạng thái cuối.
     */
    public enum TicketStatus {
        NEW, RECEIVED, IN_PROGRESS, WAITING, DONE, CLOSED, CANCELLED;

        private static final Map<TicketStatus, Set<TicketStatus>> NEXT = Map.of(
                NEW, EnumSet.of(RECEIVED, IN_PROGRESS, CANCELLED),
                RECEIVED, EnumSet.of(IN_PROGRESS, WAITING, CANCELLED),
                IN_PROGRESS, EnumSet.of(WAITING, DONE, CANCELLED),
                WAITING, EnumSet.of(IN_PROGRESS, DONE, CANCELLED),
                DONE, EnumSet.of(CLOSED, IN_PROGRESS),
                CLOSED, EnumSet.noneOf(TicketStatus.class),
                CANCELLED, EnumSet.noneOf(TicketStatus.class));

        /** Còn phải xử lý (tính quá hạn SLA). */
        public static final Set<TicketStatus> OPEN = EnumSet.of(NEW, RECEIVED, IN_PROGRESS, WAITING);

        public Set<TicketStatus> next() {
            return NEXT.get(this);
        }

        public boolean canMoveTo(TicketStatus target) {
            return NEXT.get(this).contains(target);
        }

        public boolean isFinal() {
            return this == CLOSED || this == CANCELLED;
        }
    }

    public enum TicketPriority {
        LOW, MEDIUM, HIGH, URGENT
    }

    public enum TicketChannel {
        APP, HOTLINE, DIRECT
    }

    public enum EntryType {
        CREATED, STATUS_CHANGE, ASSIGNMENT, COMMENT, RATING
    }

    /** PUBLIC: cư dân xem được (app cư dân); INTERNAL: chỉ ban quản lý. */
    public enum Visibility {
        INTERNAL, PUBLIC
    }
}
