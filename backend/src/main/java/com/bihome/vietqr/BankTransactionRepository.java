package com.bihome.vietqr;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Long>,
        JpaSpecificationExecutor<BankTransaction> {

    Optional<BankTransaction> findByBankReference(String bankReference);
}
