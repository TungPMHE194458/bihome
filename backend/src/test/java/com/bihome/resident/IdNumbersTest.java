package com.bihome.resident;

import static org.assertj.core.api.Assertions.assertThat;

import com.bihome.resident.ResidentEnums.IdDocumentType;
import org.junit.jupiter.api.Test;

class IdNumbersTest {

    @Test
    void masksAllButTheFirstFourAndLastThreeCharacters() {
        assertThat(IdNumbers.mask("001099012123")).isEqualTo("0010*****123");
        assertThat(IdNumbers.mask("C1234567")).isEqualTo("C123*567");
        assertThat(IdNumbers.mask(null)).isNull();
    }

    @Test
    void shortValuesStillHideMostCharacters() {
        assertThat(IdNumbers.mask("AB1234")).isEqualTo("****34");
    }

    @Test
    void normalizesAndValidatesByDocumentType() {
        assertThat(IdNumbers.normalize(" c 123 4567 ")).isEqualTo("C1234567");
        assertThat(IdNumbers.normalize("  ")).isNull();
        assertThat(IdNumbers.validate(IdDocumentType.CCCD, "001099012123")).isNull();
        assertThat(IdNumbers.validate(IdDocumentType.CCCD, "00109901212")).isEqualTo("Số CCCD gồm 12 chữ số");
        assertThat(IdNumbers.validate(IdDocumentType.PASSPORT, "C1234567")).isNull();
        assertThat(IdNumbers.validate(IdDocumentType.PASSPORT, "C12")).isNotNull();
        assertThat(IdNumbers.validate(null, "C1234567")).isEqualTo("Vui lòng chọn loại giấy tờ");
        assertThat(IdNumbers.validate(null, null)).isNull();
    }
}
