package com.bihome.document;

import com.bihome.common.entity.ActiveStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DocumentCategoryRepository
        extends JpaRepository<DocumentCategory, Long>, JpaSpecificationExecutor<DocumentCategory> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    List<DocumentCategory> findByStatusOrderByNameAsc(ActiveStatus status);
}
