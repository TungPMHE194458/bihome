package com.bihome.document;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentFileVersionRepository extends JpaRepository<DocumentFileVersion, Long> {

    boolean existsByFileId(Long fileId);
}
