package com.bihome.audit;

import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.CurrentUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.action.spi.AfterTransactionCompletionProcess;
import org.hibernate.action.spi.BeforeTransactionCompletionProcess;
import org.hibernate.collection.spi.PersistentCollection;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.event.spi.AbstractCollectionEvent;
import org.hibernate.event.spi.EventSource;
import org.hibernate.event.spi.PostCollectionRecreateEvent;
import org.hibernate.event.spi.PostCollectionRecreateEventListener;
import org.hibernate.event.spi.PostDeleteEvent;
import org.hibernate.event.spi.PostDeleteEventListener;
import org.hibernate.event.spi.PostInsertEvent;
import org.hibernate.event.spi.PostInsertEventListener;
import org.hibernate.event.spi.PostUpdateEvent;
import org.hibernate.event.spi.PostUpdateEventListener;
import org.hibernate.event.spi.PreCollectionRemoveEvent;
import org.hibernate.event.spi.PreCollectionRemoveEventListener;
import org.hibernate.event.spi.PreCollectionUpdateEvent;
import org.hibernate.event.spi.PreCollectionUpdateEventListener;
import org.hibernate.persister.entity.EntityPersister;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Ghi AUDIT_LOG cho entity có {@link AuditTrail}. Thay đổi được gom theo session rồi ghi bằng JDBC ngay trước khi
 * transaction commit (sau lần flush cuối) — cùng transaction với thao tác nghiệp vụ, rollback thì không ghi.
 */
@Slf4j
@Component
public class AuditEventListener implements PostInsertEventListener, PostUpdateEventListener, PostDeleteEventListener,
        PreCollectionUpdateEventListener, PreCollectionRemoveEventListener, PostCollectionRecreateEventListener {

    private static final Set<String> IGNORED = Set.of("createdAt", "updatedAt", "createdBy", "updatedBy", "version");
    private static final Set<String> MASKED = Set.of("passwordHash", "tokenHash", "otpHash", "idNumber");
    private static final String MASK = "***";
    private static final int MAX_VALUE_LENGTH = 500;
    private static final int MAX_COLLECTION_ITEMS = 30;
    private static final String INSERT = """
            INSERT INTO AUDIT_LOG (OCCURRED_AT, ACTOR_ID, ACTOR_USERNAME, ACTION, MODULE_CODE, ENTITY_TYPE, ENTITY_ID,
                ENTITY_LABEL, BUILDING_ID, CHANGES, IP_ADDRESS)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""";

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final Map<SharedSessionContractImplementor, Batch> batches = new ConcurrentHashMap<>();

    public AuditEventListener(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    // ---------- Sự kiện entity ----------

    @Override
    public void onPostInsert(PostInsertEvent event) {
        AuditTrail meta = meta(event.getEntity());
        if (meta == null) {
            return;
        }
        Entry entry = batch(event.getSession()).entry(event.getEntity(), event.getPersister(), event.getId(), meta, event.getSession());
        entry.action = AuditAction.CREATE;
    }

    @Override
    public void onPostUpdate(PostUpdateEvent event) {
        AuditTrail meta = meta(event.getEntity());
        if (meta == null || event.getDirtyProperties() == null) {
            return;
        }
        Entry entry = batch(event.getSession()).entry(event.getEntity(), event.getPersister(), event.getId(), meta, event.getSession());
        if (entry.action != AuditAction.UPDATE) {
            return;
        }
        String[] names = event.getPersister().getPropertyNames();
        Object[] oldState = event.getOldState();
        Object[] state = event.getState();
        for (int i : event.getDirtyProperties()) {
            String field = names[i];
            if (ignored(meta, field)) {
                continue;
            }
            if (masked(meta, field)) {
                entry.change(field, MASK, MASK);
            } else {
                entry.change(field, oldState == null ? null : format(oldState[i], event.getSession()),
                        format(state[i], event.getSession()));
            }
        }
    }

    @Override
    public void onPostDelete(PostDeleteEvent event) {
        AuditTrail meta = meta(event.getEntity());
        if (meta == null) {
            return;
        }
        Batch batch = batch(event.getSession());
        Entry entry = batch.entry(event.getEntity(), event.getPersister(), event.getId(), meta, event.getSession());
        if (entry.action == AuditAction.CREATE) {
            batch.entries.remove(entry.key);
        } else {
            entry.action = AuditAction.DELETE;
            entry.changes.clear();
            // Tra tòa ngay khi xoá: lúc commit bản ghi cha (vd tiện ích của cấu hình) có thể cũng đã bị xoá, log sẽ
            // mất BUILDING_ID và hiện cho mọi tòa.
            if (entry.buildingId == null && entry.buildingKey != null && !entry.buildingSql.isEmpty()) {
                entry.buildingId = event.getSession().doReturningWork(connection -> lookupBuilding(connection, entry));
            }
        }
    }

    @Override
    public boolean requiresPostCommitHandling(EntityPersister persister) {
        return false;
    }

    // ---------- Sự kiện collection (vai trò, tòa phụ trách, ảnh, khung giờ...) ----------

    @Override
    public void onPreUpdateCollection(PreCollectionUpdateEvent event) {
        Entry entry = collectionOwner(event);
        if (entry != null) {
            String field = role(event.getCollection());
            entry.change(field, formatSnapshot(event.getCollection(), event.getSession()),
                    formatElements(event.getCollection(), event.getSession()));
        }
    }

    @Override
    public void onPreRemoveCollection(PreCollectionRemoveEvent event) {
        Entry entry = collectionOwner(event);
        if (entry != null) {
            entry.change(role(event.getCollection()), formatElements(event.getCollection(), event.getSession()), null);
        }
    }

    @Override
    public void onPostRecreateCollection(PostCollectionRecreateEvent event) {
        Entry entry = collectionOwner(event);
        if (entry != null) {
            String field = role(event.getCollection());
            AuditChange previous = entry.changes.get(field);
            entry.change(field, previous == null ? null : previous.oldValue(),
                    formatElements(event.getCollection(), event.getSession()));
        }
    }

    private Entry collectionOwner(AbstractCollectionEvent event) {
        Object owner = event.getAffectedOwnerOrNull();
        AuditTrail meta = owner == null ? null : meta(owner);
        if (meta == null || ignored(meta, role(event.getCollection()))) {
            return null;
        }
        EventSource session = event.getSession();
        EntityPersister persister = session.getEntityPersister(event.getAffectedOwnerEntityName(), owner);
        Object id = event.getAffectedOwnerIdOrNull() != null ? event.getAffectedOwnerIdOrNull()
                : persister.getIdentifier(owner, session);
        Entry entry = batch(session).entry(owner, persister, id, meta, session);
        return entry.action == AuditAction.UPDATE ? entry : null;
    }

    private static String role(PersistentCollection<?> collection) {
        String role = collection.getRole();
        return role == null ? "?" : role.substring(role.lastIndexOf('.') + 1);
    }

    // ---------- Gom theo session và ghi trước khi commit ----------

    private Batch batch(EventSource session) {
        return batches.computeIfAbsent(session, s -> {
            Batch batch = new Batch(actor(), ipAddress());
            session.getActionQueue().registerProcess(
                    (BeforeTransactionCompletionProcess) sessionImpl -> write(batches.remove(s), sessionImpl));
            session.getActionQueue().registerProcess(
                    (AfterTransactionCompletionProcess) (success, sessionImpl) -> batches.remove(s));
            return batch;
        });
    }

    private void write(Batch batch, SharedSessionContractImplementor session) {
        if (batch == null) {
            return;
        }
        List<Entry> entries = batch.entries.values().stream()
                .filter(e -> e.action != AuditAction.UPDATE || !e.changes.isEmpty())
                .toList();
        if (entries.isEmpty()) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        session.doWork(connection -> {
            try (PreparedStatement insert = connection.prepareStatement(INSERT)) {
                for (Entry e : entries) {
                    AuditAction action = e.action == AuditAction.UPDATE && e.changes.containsKey("status")
                            ? AuditAction.STATUS_CHANGE : e.action;
                    insert.setObject(1, now);
                    setLong(insert, 2, batch.actorId);
                    insert.setString(3, batch.actorUsername);
                    insert.setString(4, action.name());
                    insert.setString(5, e.module);
                    insert.setString(6, e.type);
                    insert.setString(7, e.id);
                    insert.setString(8, truncate(e.label, 300));
                    setLong(insert, 9, e.buildingId != null ? e.buildingId : lookupBuilding(connection, e));
                    insert.setString(10, e.changes.isEmpty() ? null : json(e.changes.values()));
                    insert.setString(11, batch.ipAddress);
                    insert.addBatch();
                }
                insert.executeBatch();
            }
        });
    }

    private static Long lookupBuilding(Connection connection, Entry e) throws SQLException {
        if (e.buildingSql.isEmpty() || e.buildingKey == null) {
            return null;
        }
        try (PreparedStatement query = connection.prepareStatement(e.buildingSql)) {
            query.setObject(1, e.buildingKey);
            try (ResultSet rs = query.executeQuery()) {
                return rs.next() ? (Long) rs.getObject(1, Long.class) : null;
            }
        }
    }

    private static void setLong(PreparedStatement ps, int index, Long value) throws SQLException {
        if (value == null) {
            ps.setNull(index, Types.NUMERIC);
        } else {
            ps.setLong(index, value);
        }
    }

    private String json(Collection<AuditChange> changes) {
        try {
            return objectMapper.writeValueAsString(changes);
        } catch (JsonProcessingException ex) {
            log.warn("Không ghi được chi tiết thay đổi vào lịch sử hoạt động", ex);
            return null;
        }
    }

    // ---------- Định dạng giá trị ----------

    private static AuditTrail meta(Object entity) {
        Class<?> type = entity instanceof HibernateProxy proxy
                ? proxy.getHibernateLazyInitializer().getPersistentClass() : entity.getClass();
        return type.getAnnotation(AuditTrail.class);
    }

    private static boolean ignored(AuditTrail meta, String field) {
        return IGNORED.contains(field) || Arrays.asList(meta.ignore()).contains(field);
    }

    private static boolean masked(AuditTrail meta, String field) {
        return MASKED.contains(field) || Arrays.asList(meta.mask()).contains(field);
    }

    private static String format(Object value, SharedSessionContractImplementor session) {
        if (value == null) {
            return null;
        }
        if (value instanceof Collection<?> collection) {
            return formatAll(collection, session);
        }
        String text = simple(value, session);
        return truncate(text != null ? text : String.valueOf(value), MAX_VALUE_LENGTH);
    }

    /** Chuỗi của giá trị đơn giản hoặc entity (mã / id); null nếu là kiểu phức tạp (embeddable). */
    private static String simple(Object value, SharedSessionContractImplementor session) {
        if (value instanceof String || value instanceof Boolean || value instanceof Enum<?>) {
            return value.toString();
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().toPlainString();
        }
        if (value instanceof Number || value instanceof TemporalAccessor) {
            return value.toString();
        }
        if (value instanceof HibernateProxy proxy) {
            return String.valueOf(proxy.getHibernateLazyInitializer().getIdentifier());
        }
        EntityPersister persister = session.getFactory().getMappingMetamodel().findEntityDescriptor(value.getClass());
        if (persister != null) {
            if (Arrays.asList(persister.getPropertyNames()).contains("code")) {
                Object code = persister.getPropertyValue(value, "code");
                if (code != null) {
                    return code.toString();
                }
            }
            return String.valueOf(persister.getIdentifier(value, session));
        }
        return null;
    }

    private static String formatAll(Collection<?> elements, SharedSessionContractImplementor session) {
        List<String> values = new ArrayList<>();
        for (Object element : elements) {
            String text = element == null ? null : simple(element, session);
            if (text == null) {
                // Phần tử phức tạp (ảnh, khung giờ...): chỉ ghi số lượng.
                return elements.size() + " mục";
            }
            values.add(text);
        }
        if (values.isEmpty()) {
            return null;
        }
        values.sort(null);
        String joined = values.stream().limit(MAX_COLLECTION_ITEMS).collect(Collectors.joining(", "));
        return truncate(values.size() > MAX_COLLECTION_ITEMS ? joined + ", … (" + values.size() + ")" : joined,
                MAX_VALUE_LENGTH);
    }

    private static String formatElements(PersistentCollection<?> collection, SharedSessionContractImplementor session) {
        if (!collection.wasInitialized()) {
            return null;
        }
        return collection instanceof Collection<?> elements ? formatAll(elements, session) : null;
    }

    private static String formatSnapshot(PersistentCollection<?> collection, SharedSessionContractImplementor session) {
        Object snapshot = collection.getStoredSnapshot();
        if (snapshot instanceof Map<?, ?> map) {
            return formatAll(map.keySet(), session);
        }
        return snapshot instanceof Collection<?> elements ? formatAll(elements, session) : null;
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }

    private static AuthUser actor() {
        return CurrentUser.find().orElse(null);
    }

    private static String ipAddress() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            return request.getRemoteAddr();
        }
        return null;
    }

    // ---------- Dữ liệu gom ----------

    private static final class Batch {
        final Long actorId;
        final String actorUsername;
        final String ipAddress;
        final Map<String, Entry> entries = new LinkedHashMap<>();

        Batch(AuthUser actor, String ipAddress) {
            this.actorId = actor == null ? null : actor.id();
            this.actorUsername = actor == null ? "system" : actor.username();
            this.ipAddress = ipAddress;
        }

        Entry entry(Object entity, EntityPersister persister, Object id, AuditTrail meta,
                    SharedSessionContractImplementor session) {
            String key = meta.type() + "#" + id;
            Entry entry = entries.computeIfAbsent(key, k -> new Entry(k, meta, String.valueOf(id)));
            entry.label = label(entity, persister, meta, entry.id, session);
            if (meta.building()) {
                entry.buildingId = id instanceof Long l ? l : null;
            } else if (entity instanceof BuildingScopedEntity scoped) {
                entry.buildingId = scoped.getBuildingId();
            } else if (!meta.buildingSql().isEmpty()) {
                entry.buildingKey = meta.buildingKey().isEmpty() ? id : persister.getPropertyValue(entity, meta.buildingKey());
            }
            return entry;
        }

        private static String label(Object entity, EntityPersister persister, AuditTrail meta, String id,
                                    SharedSessionContractImplementor session) {
            String label = Arrays.stream(meta.label())
                    .map(p -> persister.getPropertyValue(entity, p))
                    .filter(Objects::nonNull)
                    .map(v -> format(v, session))
                    .filter(Objects::nonNull)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.joining(" · "));
            return label.isEmpty() ? "#" + id : label;
        }
    }

    private static final class Entry {
        final String key;
        final String module;
        final String type;
        final String id;
        final String buildingSql;
        AuditAction action = AuditAction.UPDATE;
        String label;
        Long buildingId;
        Object buildingKey;
        final Map<String, AuditChange> changes = new LinkedHashMap<>();

        Entry(String key, AuditTrail meta, String id) {
            this.key = key;
            this.module = meta.module();
            this.type = meta.type();
            this.id = id;
            this.buildingSql = meta.buildingSql();
        }

        /** Gộp nhiều lần sửa trong cùng transaction: giữ giá trị cũ đầu tiên, giá trị mới cuối cùng. */
        void change(String field, String oldValue, String newValue) {
            AuditChange previous = changes.get(field);
            String from = previous != null ? previous.oldValue() : oldValue;
            if (Objects.equals(from, newValue) && !MASK.equals(newValue)) {
                changes.remove(field);
            } else {
                changes.put(field, new AuditChange(field, from, newValue));
            }
        }
    }
}
