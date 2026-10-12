package com.bihome.audit;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.springframework.stereotype.Component;

/** Gắn {@link AuditEventListener} vào Hibernate khi khởi động. */
@Component
@RequiredArgsConstructor
class AuditListenerRegistrar {

    private final EntityManagerFactory entityManagerFactory;
    private final AuditEventListener listener;

    @PostConstruct
    void register() {
        EventListenerRegistry registry = entityManagerFactory.unwrap(SessionFactoryImplementor.class)
                .getServiceRegistry().getService(EventListenerRegistry.class);
        registry.appendListeners(EventType.POST_INSERT, listener);
        registry.appendListeners(EventType.POST_UPDATE, listener);
        registry.appendListeners(EventType.POST_DELETE, listener);
        registry.appendListeners(EventType.PRE_COLLECTION_UPDATE, listener);
        registry.appendListeners(EventType.PRE_COLLECTION_REMOVE, listener);
        registry.appendListeners(EventType.POST_COLLECTION_RECREATE, listener);
    }
}
