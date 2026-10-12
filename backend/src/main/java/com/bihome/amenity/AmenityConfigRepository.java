package com.bihome.amenity;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AmenityConfigRepository extends JpaRepository<AmenityConfig, Long> {

    /**
     * Khoá dòng cấu hình của tiện ích (SELECT ... FOR UPDATE) khi đặt chỗ: các lượt đặt cùng tiện ích xếp hàng nên
     * phép kiểm tra sức chứa và giới hạn lượt / tuần không bị vượt khi đặt đồng thời.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from AmenityConfig c where c.amenityId = :amenityId")
    Optional<AmenityConfig> findForUpdate(@Param("amenityId") Long amenityId);
}
