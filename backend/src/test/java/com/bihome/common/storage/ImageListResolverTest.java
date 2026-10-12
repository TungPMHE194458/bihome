package com.bihome.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.Mockito.when;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.security.AuthUser;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ImageListResolverTest {

    private static final AuthUser ME = new AuthUser(1L, "me", Set.of("STAFF"), Set.of(), Set.of(), false, false);

    @Mock FileAttachmentRepository files;
    @Mock FileReferences references;

    @InjectMocks
    ImageListResolver resolver;

    private static FileAttachment file(long id, FilePurpose purpose, String owner) {
        FileAttachment f = new FileAttachment();
        f.setId(id);
        f.setPurpose(purpose);
        f.setCreatedBy(owner);
        return f;
    }

    @Test
    void firstImageBecomesCoverWhenNoneIsChosen() {
        when(files.findAllById(List.of(5L, 6L)))
                .thenReturn(List.of(file(5, FilePurpose.APARTMENT_IMAGE, "me"), file(6, FilePurpose.APARTMENT_IMAGE, "me")));

        List<EntityImage> result = resolver.resolve(List.of(new ImageRef(5L, false), new ImageRef(6L, false)),
                List.of(), FilePurpose.APARTMENT_IMAGE, ME);

        assertThat(result).extracting(EntityImage::getFileId, EntityImage::isCover)
                .containsExactly(tuple(5L, true), tuple(6L, false));
    }

    @Test
    void keepsExistingImagesUploadedBySomeoneElse() {
        when(files.findAllById(List.of(7L))).thenReturn(List.of(file(7, FilePurpose.APARTMENT_IMAGE, "colleague")));

        List<EntityImage> result = resolver.resolve(List.of(new ImageRef(7L, true)),
                List.of(new EntityImage(7L, true)), FilePurpose.APARTMENT_IMAGE, ME);

        assertThat(result).hasSize(1);
    }

    @Test
    void rejectsDuplicatesMultipleCoversWrongPurposeAndForeignUploads() {
        when(files.findAllById(List.of(8L))).thenReturn(List.of(file(8, FilePurpose.AVATAR, "me")));
        when(files.findAllById(List.of(9L))).thenReturn(List.of(file(9, FilePurpose.APARTMENT_IMAGE, "colleague")));

        for (List<ImageRef> refs : List.of(
                List.of(new ImageRef(5L, false), new ImageRef(5L, true)),
                List.of(new ImageRef(5L, true), new ImageRef(6L, true)),
                List.of(new ImageRef(8L, true)),
                List.of(new ImageRef(9L, true)))) {
            assertThatThrownBy(() -> resolver.resolve(refs, List.of(), FilePurpose.APARTMENT_IMAGE, ME))
                    .isInstanceOfSatisfying(BusinessException.class,
                            e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("images"));
        }
    }

    @Test
    void emptyInputClearsImages() {
        assertThat(resolver.resolve(null, List.of(new EntityImage(1L, true)), FilePurpose.BUILDING_IMAGE, ME)).isEmpty();
    }
}
