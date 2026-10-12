package com.bihome.user;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, Long>, JpaSpecificationExecutor<AppUser> {

    /** Tên đăng nhập không chứa '@' nên không thể trùng với email của user khác. */
    @Query("select u from AppUser u where u.username = :login or u.email = :login")
    Optional<AppUser> findByLogin(@Param("login") String login);

    Optional<AppUser> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    @EntityGraph(attributePaths = {"roles", "buildingIds"})
    @Query("select u from AppUser u where u.id = :id")
    Optional<AppUser> findWithAccessById(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = "profile")
    Page<AppUser> findAll(Specification<AppUser> spec, Pageable pageable);

    /** Cập nhật thẳng bằng JPQL để không tăng VERSION/UPDATED_BY mỗi lần đăng nhập. */
    @Modifying
    @Query("update AppUser u set u.failedLoginCount = :count, u.lockedUntil = :lockedUntil where u.id = :id")
    int recordFailedLogin(@Param("id") Long id, @Param("count") int count,
                          @Param("lockedUntil") OffsetDateTime lockedUntil);

    @Modifying
    @Query("update AppUser u set u.failedLoginCount = 0, u.lockedUntil = null, u.lastLoginAt = :at where u.id = :id")
    int recordSuccessfulLogin(@Param("id") Long id, @Param("at") OffsetDateTime at);

    /**
     * User đang hoạt động có quyền {@code permission} (Admin hệ thống luôn có), dùng cho ô chọn người xử lý.
     * {@code buildingId} khác null: chỉ người làm việc ở tòa đó (Admin hệ thống thấy mọi tòa).
     */
    @Query("select distinct u from AppUser u join u.roles r left join r.permissions p join fetch u.profile pr "
            + "where u.status = :active and (r.code = 'SUPER_ADMIN' or (p.code = :permission "
            + "and (:buildingId is null or :buildingId member of u.buildingIds))) "
            + "order by pr.fullName")
    List<AppUser> findHandlers(@Param("permission") String permission, @Param("buildingId") Long buildingId,
                               @Param("active") UserStatus active);

    @Query("select u from AppUser u join fetch u.profile where u.id in :ids")
    List<AppUser> findWithProfileByIdIn(@Param("ids") Collection<Long> ids);

    @Query("select u from AppUser u join fetch u.profile where u.username in :usernames")
    List<AppUser> findByUsernameIn(@Param("usernames") Collection<String> usernames);
}
