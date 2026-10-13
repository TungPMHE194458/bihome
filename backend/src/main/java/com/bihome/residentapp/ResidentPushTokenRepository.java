package com.bihome.residentapp;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResidentPushTokenRepository extends JpaRepository<ResidentPushToken, Long> {

    Optional<ResidentPushToken> findByToken(String token);

    @Query("select t.token from ResidentPushToken t, ResidentAccount a "
            + "where t.accountId = a.id and a.status = com.bihome.residentapp.ResidentAccount.Status.ACTIVE "
            + "and a.residentId in :residentIds")
    List<String> findTokensOfResidents(@Param("residentIds") Collection<Long> residentIds);

    @Modifying
    @Query("delete from ResidentPushToken t where t.token = :token and t.accountId = :accountId")
    int deleteByTokenAndAccount(@Param("token") String token, @Param("accountId") Long accountId);

    @Modifying
    @Query("delete from ResidentPushToken t where t.token in :tokens")
    int deleteTokens(@Param("tokens") Collection<String> tokens);
}
