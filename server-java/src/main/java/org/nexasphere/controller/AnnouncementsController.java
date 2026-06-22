package org.nexasphere.controller;

import jakarta.validation.Valid;
import org.nexasphere.model.entity.AnnouncementEntity;
import org.nexasphere.repository.AnnouncementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
public class AnnouncementsController {


private final AnnouncementRepository repo;

public AnnouncementsController(AnnouncementRepository repo) {
    this.repo = repo;
}

@GetMapping("/api/admin/announcements")
public Map<String, Object> getAll() {
    List<AnnouncementEntity> announcements =
            repo.findAllByOrderByCreatedAtDesc();

    return Map.of(
            "announcements", announcements,
            "total", announcements.size()
    );
}

@PostMapping("/api/admin/announcements")
public ResponseEntity<AnnouncementEntity> create(
        @Valid @RequestBody AnnouncementEntity announcement) {

    announcement.setId(null);

    return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(repo.save(announcement));
}

@PutMapping("/api/admin/announcements/{id}")
public ResponseEntity<AnnouncementEntity> update(
        @PathVariable @NonNull String id,
        @Valid @RequestBody AnnouncementEntity announcement) {

    return repo.findById(id).map(existing -> {

        if (announcement.getTitle() != null) {
            existing.setTitle(announcement.getTitle());
        }

        if (announcement.getContent() != null) {
            existing.setContent(announcement.getContent());
        }

        if (announcement.getPriority() != null) {
            existing.setPriority(announcement.getPriority());
        }

        if (announcement.getExpiresAt() != null) {
            existing.setExpiresAt(announcement.getExpiresAt());
        }

        AnnouncementEntity saved =
                Objects.requireNonNull(repo.save(existing));

        return ResponseEntity.ok(saved);

    }).orElseGet(() -> ResponseEntity.notFound().build());
}

@DeleteMapping("/api/admin/announcements/{id}")
public ResponseEntity<Void> delete(
        @PathVariable @NonNull String id) {

    if (!repo.existsById(id)) {
        return ResponseEntity.notFound().build();
    }

    repo.deleteById(id);
    return ResponseEntity.noContent().build();
}

@GetMapping("/api/announcements/active")
public List<AnnouncementEntity> getActive() {

    return repo.findByExpiresAtAfterOrderByCreatedAtDesc(
            LocalDateTime.now()
    );
}


}
