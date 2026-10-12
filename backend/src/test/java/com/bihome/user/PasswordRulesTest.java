package com.bihome.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PasswordRulesTest {

    @ParameterizedTest
    @ValueSource(strings = {"Admin@123", "Mật@Khẩu9x", "aB3$aB3$"})
    void acceptsPasswordsMeetingPolicy(String password) {
        assertThat(PasswordPolicy.isValid(password)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Ab@1234", "admin@123", "ADMIN@123", "Admin1234", "Admin@abc", ""})
    void rejectsPasswordsMissingARequirement(String password) {
        assertThat(PasswordPolicy.isValid(password)).isFalse();
    }

    @Test
    void temporaryPasswordsAlwaysSatisfyPolicyAndDiffer() {
        TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String password = generator.generate();
            assertThat(password).hasSize(12);
            assertThat(PasswordPolicy.isValid(password)).as(password).isTrue();
            seen.add(password);
        }
        assertThat(seen).hasSize(500);
    }
}
