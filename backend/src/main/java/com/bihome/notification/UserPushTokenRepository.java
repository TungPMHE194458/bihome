package com.bihome.notification;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {

    Optional<UserPushToken> findByToken(String token);

    /** Chỉ thiết bị của người dùng đang hoạt động. */
    @Query("select t.token from UserPushToken t, AppUser u where t.userId = u.id "
            + "and u.status = com.bihome.user.UserStatus.ACTIVE and u.id in :userIds")
    List<String> findTokensOfUsers(@Param("userIds") Collection<Long> userIds);

    @Modifying
    @Query("delete from UserPushToken t where t.token = :token and t.userId = :userId")
    int deleteByTokenAndUser(@Param("token") String token, @Param("userId") Long userId);

    @Modifying
    @Query("delete from UserPushToken t where t.token in :tokens")
    int deleteTokens(@Param("tokens") Collection<String> tokens);
}
