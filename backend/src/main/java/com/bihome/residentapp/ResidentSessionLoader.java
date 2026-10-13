package com.bihome.residentapp;

import com.bihome.common.security.AuthUser;
import com.bihome.resident.ApartmentResident;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentSessionLoader {

    private static final int MAX_NAME = 60;

    private final ResidentAccountRepository accounts;
    private final ResidentRepository residents;

    /** Rỗng nếu tài khoản không còn / bị khoá, hoặc token được cấp trước lần đổi mật khẩu gần nhất. */
    public Optional<ResidentSession> load(Long accountId, Instant tokenIssuedAt) {
        return accounts.findById(accountId)
                .filter(a -> a.getStatus() == ResidentAccount.Status.ACTIVE)
                .filter(a -> a.getPasswordChangedAt() == null
                        || !tokenIssuedAt.isBefore(a.getPasswordChangedAt().toInstant().truncatedTo(ChronoUnit.SECONDS)))
                .flatMap(a -> residents.findById(a.getResidentId()).map(r -> toSession(a, r)));
    }

    static String actorName(String fullName, String phone) {
        String name = fullName.length() > MAX_NAME ? fullName.substring(0, MAX_NAME) : fullName;
        return name + " (cư dân " + phone + ")";
    }

    private ResidentSession toSession(ResidentAccount account, Resident r) {
        List<ResidentSession.ApartmentRef> apartments = r.activeLinks().stream()
                .sorted(Comparator.comparing((ApartmentResident l) -> l.getApartment().getCode()))
                .map(l -> new ResidentSession.ApartmentRef(l.getApartmentId(), l.getApartment().getCode(),
                        l.getApartment().getName(), l.getApartment().getFloorNo(), l.getApartment().getBuildingId(),
                        r.getBuilding().getName(), l.getRole(), l.isHouseholdHead()))
                .toList();
        AuthUser actor = new AuthUser(null, actorName(r.getFullName(), account.getPhone()), Set.of("RESIDENT"), Set.of(),
                Set.of(r.getBuildingId()), false, false);
        return new ResidentSession(account.getId(), r.getId(), r.getCode(), r.getFullName(), account.getPhone(),
                r.getBuildingId(), account.isMustChangePassword(), apartments, actor);
    }
}
