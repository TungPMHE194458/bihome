package com.bihome.user;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    List<Permission> findAllByOrderByModuleCodeAscIdAsc();

    List<Permission> findByCodeIn(Collection<String> codes);

    @Query("select p.code from Permission p")
    List<String> findAllCodes();

    @Query("select distinct p.code from Role r join r.permissions p where r.id in :roleIds")
    List<String> findCodesByRoleIds(@Param("roleIds") Collection<Long> roleIds);
}
