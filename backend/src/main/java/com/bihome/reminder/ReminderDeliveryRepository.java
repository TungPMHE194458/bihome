package com.bihome.reminder;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReminderDeliveryRepository extends JpaRepository<ReminderDelivery, Long> {

    Page<ReminderDelivery> findByReminderIdOrderByIdDesc(Long reminderId, Pageable pageable);

    @Modifying
    @Query("delete from ReminderDelivery d where d.reminderId = :reminderId")
    int deleteByReminderId(@Param("reminderId") Long reminderId);

    /** [kênh, trạng thái, số lượng] của lần gửi. */
    @Query("select d.channel, d.status, count(d) from ReminderDelivery d where d.reminderId = :reminderId "
            + "and d.runNo = :runNo group by d.channel, d.status")
    List<Object[]> summarize(@Param("reminderId") Long reminderId, @Param("runNo") int runNo);
}
