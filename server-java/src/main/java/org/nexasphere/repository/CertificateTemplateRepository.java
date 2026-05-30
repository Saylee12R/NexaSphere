package org.nexasphere.repository;

import org.nexasphere.model.entity.CertificateTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CertificateTemplateRepository extends JpaRepository<CertificateTemplateEntity, Long> {
    Optional<CertificateTemplateEntity> findByName(String name);
}
