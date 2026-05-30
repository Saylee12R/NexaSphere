package org.nexasphere.repository;

import org.nexasphere.model.entity.EventParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventParticipantRepository extends JpaRepository<EventParticipantEntity, Long> {
    List<EventParticipantEntity> findByEventId(String eventId);
    List<EventParticipantEntity> findByEventIdAndStatus(String eventId, String status);
}
