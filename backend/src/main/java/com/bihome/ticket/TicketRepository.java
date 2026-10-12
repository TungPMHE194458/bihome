package com.bihome.ticket;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    long countByApartmentId(Long apartmentId);

    long countByResidentId(Long residentId);

    /** Tăng bộ đếm của ngày (khoá dòng tới khi commit); trả 0 nếu ngày chưa có dòng. */
    @Modifying
    @Query(value = "UPDATE TICKET_CODE_COUNTER SET LAST_NO = LAST_NO + 1 WHERE CODE_DATE = :day", nativeQuery = true)
    int incrementCodeCounter(@Param("day") String day);

    /** Tạo dòng đếm của ngày nếu chưa có; tạo đồng thời thì Oracle bỏ qua dòng trùng thay vì báo lỗi. */
    @Modifying
    @Query(value = "INSERT /*+ IGNORE_ROW_ON_DUPKEY_INDEX(TICKET_CODE_COUNTER, PK_TICKET_CODE_COUNTER) */ "
            + "INTO TICKET_CODE_COUNTER (CODE_DATE, LAST_NO) VALUES (:day, 0)", nativeQuery = true)
    int insertCodeCounterIfAbsent(@Param("day") String day);

    @Query(value = "SELECT LAST_NO FROM TICKET_CODE_COUNTER WHERE CODE_DATE = :day", nativeQuery = true)
    long currentCodeCounter(@Param("day") String day);

    @Override
    @EntityGraph(attributePaths = {"building", "category", "apartment", "resident", "assignee", "assignee.profile"})
    Page<Ticket> findAll(Specification<Ticket> spec, Pageable pageable);
}
