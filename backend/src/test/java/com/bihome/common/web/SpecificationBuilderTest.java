package com.bihome.common.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SpecificationBuilderTest {

    @Test
    void likePatternIsLowercasedTrimmedAndWrapped() {
        assertThat(SpecificationBuilder.likePattern("  Tòa A ")).isEqualTo("%tòa a%");
    }

    @Test
    void likeWildcardsInUserInputAreEscaped() {
        assertThat(SpecificationBuilder.likePattern("100%_a\\b")).isEqualTo("%100\\%\\_a\\\\b%");
    }

    @Test
    void emptyBuilderProducesNeutralSpecification() {
        assertThat(SpecificationBuilder.<Object>create().like("name", " ").eq("status", "")
                .in("id", java.util.List.of()).dateBetween("createdAt", null, null).build()).isNotNull();
    }
}
