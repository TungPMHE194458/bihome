package com.bihome.user;

import com.bihome.common.security.AuthUser;
import com.bihome.user.dto.MeResponse;
import com.bihome.user.dto.ProfileDtos;
import com.bihome.user.dto.ProfileUpdateRequest;
import com.bihome.user.dto.UserRequests;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Hồ sơ cá nhân")
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final PinnedPageService pinnedPageService;

    @Operation(summary = "Xem hồ sơ cá nhân")
    @GetMapping
    public MeResponse get(@AuthenticationPrincipal AuthUser me) {
        return profileService.get(me);
    }

    @Operation(summary = "Cập nhật hồ sơ cá nhân")
    @PutMapping
    public MeResponse update(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.update(me, request);
    }

    @Operation(summary = "Đổi ảnh đại diện", description = "Tải ảnh lên /files với purpose=AVATAR trước, rồi gửi fileId.")
    @PutMapping("/avatar")
    public MeResponse changeAvatar(@AuthenticationPrincipal AuthUser me,
                                   @Valid @RequestBody UserRequests.ChangeAvatar request) {
        return profileService.changeAvatar(me, request.fileId());
    }

    @Operation(summary = "Trang đã ghim (Truy cập nhanh)")
    @GetMapping("/pinned-pages")
    public List<ProfileDtos.PinnedPage> pinnedPages(@AuthenticationPrincipal AuthUser me) {
        return pinnedPageService.list(me.id());
    }

    @Operation(summary = "Lưu trang đã ghim", description = "Thay toàn bộ danh sách theo thứ tự gửi lên (tối đa 20).")
    @PutMapping("/pinned-pages")
    public List<ProfileDtos.PinnedPage> savePinnedPages(@AuthenticationPrincipal AuthUser me,
                                                        @Valid @RequestBody ProfileDtos.PinnedPagesRequest request) {
        return pinnedPageService.replace(me.id(), request.pages());
    }
}
