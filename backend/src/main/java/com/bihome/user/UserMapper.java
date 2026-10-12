package com.bihome.user;

import com.bihome.common.security.AuthUser;
import com.bihome.common.storage.FileService;
import com.bihome.user.dto.MeResponse;
import com.bihome.user.dto.ProfileResponse;
import com.bihome.user.dto.RoleSummary;
import com.bihome.user.dto.UserResponse;
import com.bihome.user.dto.UserSummary;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring", imports = OffsetDateTime.class)
public abstract class UserMapper {

    @Autowired
    protected FileService fileService;

    @Autowired
    protected Clock clock;

    @Mapping(target = "avatarUrl", source = "avatarFileId", qualifiedByName = "fileUrl")
    public abstract ProfileResponse toProfile(UserProfile profile);

    public abstract RoleSummary toRoleSummary(Role role);

    @Mapping(target = "fullName", source = "profile.fullName")
    @Mapping(target = "avatarUrl", source = "profile.avatarFileId", qualifiedByName = "fileUrl")
    @Mapping(target = "temporarilyLocked", expression = "java(user.isTemporarilyLocked(OffsetDateTime.now(clock)))")
    public abstract UserSummary toSummary(AppUser user);

    public abstract UserResponse toResponse(AppUser user);

    public MeResponse toMe(AppUser user, AuthUser access) {
        return new MeResponse(user.getId(), user.getUsername(), user.getEmail(), user.getPhone(), user.getStatus(),
                user.isMustChangePassword(), user.getLastLoginAt(), toProfile(user.getProfile()),
                sortedRoles(user.getRoles()), access.permissions().stream().sorted().toList(),
                access.superAdmin() ? List.of() : sortedIds(user.getBuildingIds()), access.superAdmin());
    }

    protected List<RoleSummary> sortedRoles(Set<Role> roles) {
        return roles.stream().sorted(Comparator.comparing(Role::getId)).map(this::toRoleSummary).toList();
    }

    protected List<Long> sortedIds(Set<Long> ids) {
        return ids.stream().sorted().toList();
    }

    @Named("fileUrl")
    protected String fileUrl(Long fileId) {
        return fileId == null ? null : fileService.urlFor(fileId);
    }
}
