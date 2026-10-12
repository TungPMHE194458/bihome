package com.bihome.common.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class VietnameseNumberWordsTest {

    @Test
    void readsAmountsInVietnamese() {
        assertThat(VietnameseNumberWords.money(0)).isEqualTo("Không đồng");
        assertThat(VietnameseNumberWords.money(21)).isEqualTo("Hai mươi mốt đồng");
        assertThat(VietnameseNumberWords.money(24)).isEqualTo("Hai mươi tư đồng");
        assertThat(VietnameseNumberWords.money(115)).isEqualTo("Một trăm mười lăm đồng");
        assertThat(VietnameseNumberWords.money(305)).isEqualTo("Ba trăm linh năm đồng");
        assertThat(VietnameseNumberWords.money(1_250_000)).isEqualTo("Một triệu hai trăm năm mươi nghìn đồng");
        assertThat(VietnameseNumberWords.money(1_005_000)).isEqualTo("Một triệu không trăm linh năm nghìn đồng");
        assertThat(VietnameseNumberWords.money(2_000_000_010L)).isEqualTo("Hai tỷ không trăm mười đồng");
    }
}
