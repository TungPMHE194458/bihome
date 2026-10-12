package com.bihome.amenity;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.AuditableEntity;
import com.bihome.common.entity.HhmmTimeConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * Cấu hình đặt chỗ của một tiện ích (khoá chính = AMENITY_ID). Khung giờ, giá và ngày bảo trì là danh sách giá trị:
 * luôn gán danh sách mới khi lưu (thay toàn bộ).
 */
@Getter
@Setter
@AuditTrail(module = "AMENITY", type = "AMENITY_CONFIG",
        buildingSql = "SELECT BUILDING_ID FROM AMENITY WHERE ID = ?")
@Entity
@Table(name = "AMENITY_CONFIG")
public class AmenityConfig extends AuditableEntity {

    public enum DayType { WEEKDAY, WEEKEND }

    public enum PriceUnit { PER_BOOKING, PER_PERSON }

    @Id
    @Column(name = "AMENITY_ID")
    private Long amenityId;

    @Column(name = "SLOT_MINUTES", nullable = false)
    private int slotMinutes = 60;

    @Column(name = "MAX_BOOKINGS_PER_WEEK")
    private Integer maxBookingsPerWeek;

    @Column(name = "MAX_ADVANCE_DAYS", nullable = false)
    private int maxAdvanceDays = 7;

    @Column(name = "FREE_CANCEL_HOURS", nullable = false)
    private int freeCancelHours = 2;

    @ElementCollection
    @CollectionTable(name = "AMENITY_SLOT", joinColumns = @JoinColumn(name = "AMENITY_ID"))
    @BatchSize(size = 50)
    private List<Slot> slots = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "AMENITY_PRICE", joinColumns = @JoinColumn(name = "AMENITY_ID"))
    @BatchSize(size = 50)
    private List<Price> prices = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "AMENITY_MAINTENANCE", joinColumns = @JoinColumn(name = "AMENITY_ID"))
    @BatchSize(size = 50)
    private List<Maintenance> maintenances = new ArrayList<>();

    /** Khung giờ theo thứ (1 = Thứ 2 … 7 = Chủ nhật); {@code capacity} null = sức chứa của tiện ích. */
    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Slot {
        @Column(name = "DAY_OF_WEEK", nullable = false)
        private int dayOfWeek;

        @Convert(converter = HhmmTimeConverter.class)
        @Column(name = "START_TIME", nullable = false, length = 5)
        private LocalTime startTime;

        @Convert(converter = HhmmTimeConverter.class)
        @Column(name = "END_TIME", nullable = false, length = 5)
        private LocalTime endTime;

        @Column(name = "CAPACITY")
        private Integer capacity;
    }

    /** Lượt bắt đầu trong [startTime, endTime) của loại ngày thì áp giá này. */
    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Price {
        @Enumerated(EnumType.STRING)
        @Column(name = "DAY_TYPE", nullable = false, length = 10)
        private DayType dayType;

        @Convert(converter = HhmmTimeConverter.class)
        @Column(name = "START_TIME", nullable = false, length = 5)
        private LocalTime startTime;

        @Convert(converter = HhmmTimeConverter.class)
        @Column(name = "END_TIME", nullable = false, length = 5)
        private LocalTime endTime;

        @Column(name = "PRICE", nullable = false)
        private BigDecimal price;

        @Enumerated(EnumType.STRING)
        @Column(name = "PRICE_UNIT", nullable = false, length = 20)
        private PriceUnit priceUnit;
    }

    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Maintenance {
        @Column(name = "START_DATE", nullable = false)
        private LocalDate startDate;

        @Column(name = "END_DATE", nullable = false)
        private LocalDate endDate;

        @Column(name = "REASON", length = 500)
        private String reason;
    }

    public static DayType dayType(LocalDate date) {
        DayOfWeek d = date.getDayOfWeek();
        return d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY ? DayType.WEEKEND : DayType.WEEKDAY;
    }

    /** Giá của lượt bắt đầu lúc {@code start} ngày {@code date}; rỗng = miễn phí. */
    public Optional<Price> priceFor(LocalDate date, LocalTime start) {
        DayType type = dayType(date);
        return prices.stream()
                .filter(p -> p.getDayType() == type && !start.isBefore(p.getStartTime()) && start.isBefore(p.getEndTime()))
                .findFirst();
    }

    public boolean isUnderMaintenance(LocalDate date) {
        return maintenances.stream().anyMatch(m -> !date.isBefore(m.getStartDate()) && !date.isAfter(m.getEndDate()));
    }
}
