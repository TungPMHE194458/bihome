package com.bihome.user;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoleRepository extends JpaRepository<Role, Long> {

    List<Role> findByCodeIn(Collection<String> codes);

    List<Role> findAllByOrderByIdAsc();

    @EntityGraph(attributePaths = "permissions")
    @Query("select r from Role r order by r.system desc, r.id")
    List<Role> findAllWithPermissions();

    @EntityGraph(attributePaths = "permissions")
    @Query("select r from Role r where r.id = :id")
    Optional<Role> findWithPermissionsById(@org.springframework.data.repository.query.Param("id") Long id);

    boolean existsByCode(String code);

    /** [roleId, số người dùng] của các vai trò đang được gán. */
    @Query("select r.id, count(u) from AppUser u join u.roles r group by r.id")
    List<Object[]> countUsersByRole();
}
