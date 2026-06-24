package org.nexasphere.repository;

import org.nexasphere.model.entity.AnnouncementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<AnnouncementEntity, String> {

List<AnnouncementEntity> findAllByOrderByCreatedAtDesc();

List<AnnouncementEntity> findByExpiresAtAfterOrderByCreatedAtDesc(
        LocalDateTime now
);


}
