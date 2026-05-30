package org.nexasphere.repository;

import org.nexasphere.model.entity.CertificateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CertificateRepository extends JpaRepository<CertificateEntity, String> {
    List<CertificateEntity> findByEventId(String eventId);
    List<CertificateEntity> findByStudentEmail(String studentEmail);
    List<CertificateEntity> findByStudentRollNumber(String rollNumber);
    boolean existsByStudentEmailAndEventId(String studentEmail, String eventId);
}
