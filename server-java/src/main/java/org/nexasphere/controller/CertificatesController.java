package org.nexasphere.controller;

import jakarta.validation.Valid;
import org.nexasphere.model.entity.CertificateEntity;
import org.nexasphere.model.entity.CertificateTemplateEntity;
import org.nexasphere.model.entity.EventParticipantEntity;
import org.nexasphere.repository.CertificateRepository;
import org.nexasphere.repository.CertificateTemplateRepository;
import org.nexasphere.repository.EventParticipantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin/certificates")
public class CertificatesController {

    private final CertificateRepository certRepo;
    private final CertificateTemplateRepository templateRepo;
    private final EventParticipantRepository participantRepo;

    public CertificatesController(CertificateRepository certRepo,
                                   CertificateTemplateRepository templateRepo,
                                   EventParticipantRepository participantRepo) {
        this.certRepo = certRepo;
        this.templateRepo = templateRepo;
        this.participantRepo = participantRepo;
    }

    // ── Templates ──────────────────────────────────────────────────────

    @GetMapping("/templates")
    public Map<String, Object> getTemplates() {
        return Map.of("templates", templateRepo.findAll());
    }

    @PostMapping("/templates")
    public ResponseEntity<CertificateTemplateEntity> createTemplate(
            @Valid @RequestBody CertificateTemplateEntity template) {
        template.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(templateRepo.save(template));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<CertificateTemplateEntity> updateTemplate(
            @PathVariable @NonNull Long id,
            @Valid @RequestBody CertificateTemplateEntity template) {
        return templateRepo.findById(id).map(existing -> {
            if (template.getName() != null) existing.setName(template.getName());
            if (template.getType() != null) existing.setType(template.getType());
            if (template.getContent() != null) existing.setContent(template.getContent());
            if (template.getPlaceholdersJson() != null) existing.setPlaceholdersJson(template.getPlaceholdersJson());
            return ResponseEntity.ok(templateRepo.save(existing));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable @NonNull Long id) {
        if (!templateRepo.existsById(id)) return ResponseEntity.notFound().build();
        templateRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Participants ───────────────────────────────────────────────────

    @GetMapping("/participants/{eventId}")
    public Map<String, Object> getParticipants(@PathVariable @NonNull String eventId) {
        return Map.of("participants", participantRepo.findByEventId(eventId));
    }

    @PostMapping("/participants/{eventId}")
    public ResponseEntity<EventParticipantEntity> addParticipant(
            @PathVariable @NonNull String eventId,
            @Valid @RequestBody EventParticipantEntity participant) {
        participant.setId(null);
        participant.setEventId(eventId);
        return ResponseEntity.status(HttpStatus.CREATED).body(participantRepo.save(participant));
    }

    @PostMapping("/participants/{eventId}/bulk")
    public Map<String, Object> bulkAddParticipants(
            @PathVariable @NonNull String eventId,
            @RequestBody List<EventParticipantEntity> participants) {
        int added = 0;
        for (EventParticipantEntity p : participants) {
            p.setId(null);
            p.setEventId(eventId);
            participantRepo.save(p);
            added++;
        }
        return Map.of("added", added);
    }

    // ── Generate Certificates ──────────────────────────────────────────

    @PostMapping("/generate")
    public Map<String, Object> generateCertificates(@RequestBody Map<String, Object> body) {
        String eventId = (String) body.get("eventId");
        String eventName = (String) body.get("eventName");
        String templateStyle = (String) body.getOrDefault("templateStyle", "default");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> students = (List<Map<String, String>>) body.get("students");

        if (eventId == null || eventName == null || students == null || students.isEmpty()) {
            return Map.of("error", "Missing required fields: eventId, eventName, students");
        }

        List<Map<String, String>> generated = new ArrayList<>();
        int skipped = 0;

        for (Map<String, String> student : students) {
            String email = student.getOrDefault("email", student.get("student_id", ""));
            String name = student.getOrDefault("name", student.get("student_name", "Unknown"));
            String roll = student.getOrDefault("rollNumber", student.get("student_id", ""));

            if (certRepo.existsByStudentEmailAndEventId(email, eventId)) {
                skipped++;
                continue;
            }

            String certId = generateDeterministicId(email, eventId);
            CertificateEntity cert = new CertificateEntity();
            cert.setCertificateId(certId);
            cert.setEventId(eventId);
            cert.setEventName(eventName);
            cert.setStudentName(name);
            cert.setStudentEmail(email);
            cert.setStudentRollNumber(roll);
            cert.setIssueDate(LocalDateTime.now());
            cert.setRevoked(false);
            cert.setTemplateStyle(templateStyle);

            certRepo.save(cert);
            generated.add(Map.of(
                "certificate_id", certId,
                "student_name", name,
                "verification_url", "/verify/" + certId
            ));
        }

        return Map.of(
            "generated", generated.size(),
            "skipped", skipped,
            "certificates", generated
        );
    }

    // ── Revoke ─────────────────────────────────────────────────────────

    @PatchMapping("/{id}/revoke")
    public ResponseEntity<Map<String, Object>> revokeCertificate(@PathVariable @NonNull String id) {
        return certRepo.findById(id).map(cert -> {
            cert.setRevoked(true);
            certRepo.save(cert);
            return ResponseEntity.ok(Map.<String, Object>of("success", true, "certificate_id", id));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── List all certificates ──────────────────────────────────────────

    @GetMapping
    public Map<String, Object> getAllCertificates() {
        return Map.of("certificates", certRepo.findAll());
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private String generateDeterministicId(String email, String eventId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((email + ":" + eventId).getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return "NS-CERT-" + hex.substring(0, 12).toUpperCase();
        } catch (NoSuchAlgorithmException e) {
            return "NS-CERT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        }
    }
}
