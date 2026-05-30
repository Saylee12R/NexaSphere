package org.nexasphere.controller;

import org.nexasphere.model.entity.CertificateEntity;
import org.nexasphere.repository.CertificateRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/public/certificates")
public class PublicCertificateController {

    private final CertificateRepository certRepo;

    public PublicCertificateController(CertificateRepository certRepo) {
        this.certRepo = certRepo;
    }

    @GetMapping("/verify/{id}")
    public Map<String, Object> verify(@PathVariable String id) {
        return certRepo.findById(id).map(cert -> {
            if (cert.isRevoked()) {
                return Map.<String, Object>of(
                    "valid", false,
                    "message", "This certificate has been revoked."
                );
            }
            return Map.<String, Object>of(
                "valid", true,
                "message", "Certificate verified successfully.",
                "certificate", Map.of(
                    "certificate_id", cert.getCertificateId(),
                    "student_name", cert.getStudentName(),
                    "student_email", cert.getStudentEmail(),
                    "student_roll_number", cert.getStudentRollNumber(),
                    "event_name", cert.getEventName(),
                    "event_id", cert.getEventId(),
                    "issue_date", cert.getIssueDate() != null ? cert.getIssueDate().toString() : "",
                    "template_style", cert.getTemplateStyle() != null ? cert.getTemplateStyle() : "default"
                )
            );
        }).orElse(Map.of(
            "valid", false,
            "message", "Certificate not found."
        ));
    }

    @GetMapping("/{id}/download")
    public Map<String, Object> download(@PathVariable String id) {
        return certRepo.findById(id).map(cert -> {
            if (cert.isRevoked()) {
                return Map.<String, Object>of("error", "Certificate has been revoked.");
            }
            return Map.<String, Object>of(
                "certificate_id", cert.getCertificateId(),
                "student_name", cert.getStudentName(),
                "event_name", cert.getEventName(),
                "issue_date", cert.getIssueDate() != null ? cert.getIssueDate().toString() : "",
                "template_style", cert.getTemplateStyle() != null ? cert.getTemplateStyle() : "default",
                "download_url", "/api/public/certificates/" + cert.getCertificateId() + "/download"
            );
        }).orElse(Map.of("error", "Certificate not found."));
    }
}
