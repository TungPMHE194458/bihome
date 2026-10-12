package com.bihome;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.apartment.ApartmentEnums.OwnershipType;
import com.bihome.apartment.ApartmentEnums.UsageStatus;
import com.bihome.apartment.ApartmentRepository;
import com.bihome.auth.OtpNotifier;
import com.bihome.building.Building;
import com.bihome.building.BuildingRepository;
import com.bihome.building.BuildingType;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.RoleRepository;
import com.bihome.user.UserProfile;
import com.bihome.user.UserStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.dockerjava.api.model.Mount;
import com.github.dockerjava.api.model.MountType;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.oracle.OracleContainer;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class AbstractIT {

    protected static final String PASSWORD = "Matkhau@123";
    protected static final String WEBHOOK_SECRET = "it-bank-webhook-secret";

    // Datafile trên overlayfs làm crash Docker Desktop VM (WSL2) khi Oracle mở DB; đặt chúng trên volume ẩn danh.
    private static final OracleContainer ORACLE =
            new OracleContainer("gvenzl/oracle-free:23-slim-faststart")
                    .withCreateContainerCmdModifier(cmd -> cmd.getHostConfig().withMounts(List.of(
                            new Mount().withType(MountType.VOLUME).withTarget("/opt/oracle/oradata"))));
    protected static final Path STORAGE_ROOT;

    static {
        ORACLE.start();
        try {
            STORAGE_ROOT = Files.createTempDirectory("bihome-it-storage");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", ORACLE::getJdbcUrl);
        registry.add("spring.datasource.username", ORACLE::getUsername);
        registry.add("spring.datasource.password", ORACLE::getPassword);
        registry.add("bihome.storage.root", STORAGE_ROOT::toString);
        registry.add("bihome.jwt.secret", () -> "integration-test-secret-key-at-least-32-bytes");
        registry.add("bihome.scheduling.enabled", () -> "false");
        registry.add("bihome.bank-webhook.secret", () -> WEBHOOK_SECRET);
        registry.add("bihome.bank-webhook.simulation-enabled", () -> "true");
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected AppUserRepository userRepository;

    @Autowired
    protected RoleRepository roleRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected BuildingRepository buildingRepository;

    @MockitoBean
    protected OtpNotifier otpNotifier;

    protected Building createBuilding() {
        return createBuilding(unique("B").toUpperCase(), ActiveStatus.ACTIVE);
    }

    protected Building createBuilding(String code, ActiveStatus status) {
        Building building = new Building();
        building.setCode(code);
        building.setName("Tòa " + code);
        building.setProvince("Hà Nội");
        building.setWard("Phường Cầu Giấy");
        building.setAddressDetail("Số 1 Trung Kính");
        building.setType(BuildingType.BUILDING);
        building.setStatus(status);
        return buildingRepository.saveAndFlush(building);
    }

    @Autowired
    protected ApartmentRepository apartmentRepository;

    protected Apartment createApartment(Long buildingId, String code) {
        Apartment apartment = new Apartment();
        apartment.setBuildingId(buildingId);
        apartment.setCode(code);
        apartment.setName("Căn " + code);
        apartment.setFloorNo("12");
        apartment.setArea(new BigDecimal("75.50"));
        apartment.setType(ApartmentType.APARTMENT);
        apartment.setOwnershipType(OwnershipType.OWN);
        apartment.setUsageStatus(UsageStatus.OCCUPIED);
        apartment.setStatus(ActiveStatus.ACTIVE);
        return apartmentRepository.saveAndFlush(apartment);
    }

    protected static String unique(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    protected AppUser createUser(String username, String... roleCodes) {
        return createUser(username, Set.of(), roleCodes);
    }

    protected AppUser createUser(String username, Set<Long> buildingIds, String... roleCodes) {
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(username + "@test.local");
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(new HashSet<>(roleRepository.findByCodeIn(Set.of(roleCodes))));
        user.setBuildingIds(new HashSet<>(buildingIds));
        UserProfile profile = new UserProfile();
        profile.setFullName("Người dùng " + username);
        user.attachProfile(profile);
        return userRepository.saveAndFlush(user);
    }

    protected MvcResult loginResult(String username, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", username, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
    }

    protected String login(String username) throws Exception {
        return accessToken(loginResult(username, PASSWORD));
    }

    protected String accessToken(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("accessToken").asText();
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
