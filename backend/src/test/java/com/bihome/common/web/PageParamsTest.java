package com.bihome.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class PageParamsTest {

    private static final Sort DEFAULT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Set<String> SORTABLE = Set.of("code", "name", "createdAt");

    @Test
    void defaultsApplyWhenNothingProvided() {
        Pageable p = new PageParams(null, null, null).toPageable(DEFAULT, SORTABLE);

        assertThat(p.getPageNumber()).isZero();
        assertThat(p.getPageSize()).isEqualTo(10);
        assertThat(p.getSort()).isEqualTo(DEFAULT);
    }

    @Test
    void parsesSortFieldAndDirection() {
        Pageable p = new PageParams(2, 20, "name,desc").toPageable(DEFAULT, SORTABLE);

        assertThat(p.getPageNumber()).isEqualTo(2);
        assertThat(p.getPageSize()).isEqualTo(20);
        assertThat(p.getSort().getOrderFor("name").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void sortDirectionDefaultsToAsc() {
        Pageable p = new PageParams(0, 10, "code").toPageable(DEFAULT, SORTABLE);

        assertThat(p.getSort().getOrderFor("code").getDirection()).isEqualTo(Sort.Direction.ASC);
    }

    @Test
    void rejectsDisallowedSize() {
        assertThatThrownBy(() -> new PageParams(0, 100, null).toPageable(DEFAULT, SORTABLE))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_PARAMETER));
    }

    @Test
    void rejectsNegativePage() {
        assertThatThrownBy(() -> new PageParams(-1, 10, null).toPageable(DEFAULT, SORTABLE))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsUnknownSortFieldSoClientCannotSortByArbitraryProperty() {
        assertThatThrownBy(() -> new PageParams(0, 10, "passwordHash,asc").toPageable(DEFAULT, SORTABLE))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsInvalidDirection() {
        assertThatThrownBy(() -> new PageParams(0, 10, "name,sideways").toPageable(DEFAULT, SORTABLE))
                .isInstanceOf(BusinessException.class);
    }
}
