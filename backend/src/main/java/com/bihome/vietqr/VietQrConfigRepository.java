package com.bihome.vietqr;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VietQrConfigRepository extends JpaRepository<VietQrConfig, Long> {

    List<VietQrConfig> findByAccountNo(String accountNo);
}
