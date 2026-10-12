package com.bihome.user;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.user.dto.ProfileDtos;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trang ghim ("Truy cập nhanh") của từng người dùng, lưu theo thứ tự. Không ghi lịch sử hoạt động (tuỳ chọn cá nhân).
 */
@Service
@RequiredArgsConstructor
public class PinnedPageService {

    static final int MAX_PAGES = 20;

    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<ProfileDtos.PinnedPage> list(Long userId) {
        return jdbc.query("SELECT PATH, TITLE FROM USER_PINNED_PAGE WHERE USER_ID = ? ORDER BY LINE_NO",
                (rs, i) -> new ProfileDtos.PinnedPage(rs.getString("PATH"), rs.getString("TITLE")), userId);
    }

    /** Thay toàn bộ danh sách (bỏ trùng đường dẫn, giữ thứ tự gửi lên). */
    @Transactional
    public List<ProfileDtos.PinnedPage> replace(Long userId, List<ProfileDtos.PinnedPage> pages) {
        if (pages.size() > MAX_PAGES) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "pages", "Ghim tối đa " + MAX_PAGES + " trang.");
        }
        Set<String> seen = new HashSet<>();
        List<ProfileDtos.PinnedPage> unique = new ArrayList<>();
        for (ProfileDtos.PinnedPage p : pages) {
            String path = p.path().trim();
            if (!path.startsWith("/") || path.startsWith("//")) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "pages", "Đường dẫn trang không hợp lệ.");
            }
            if (seen.add(path)) {
                unique.add(new ProfileDtos.PinnedPage(path, p.title().trim()));
            }
        }
        jdbc.update("DELETE FROM USER_PINNED_PAGE WHERE USER_ID = ?", userId);
        for (int i = 0; i < unique.size(); i++) {
            jdbc.update("INSERT INTO USER_PINNED_PAGE (USER_ID, LINE_NO, PATH, TITLE) VALUES (?, ?, ?, ?)",
                    userId, i, unique.get(i).path(), unique.get(i).title());
        }
        return unique;
    }
}
