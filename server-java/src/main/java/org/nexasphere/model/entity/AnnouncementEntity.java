package org.nexasphere.model.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
@Data
@NoArgsConstructor
public class AnnouncementEntity {

@Id
private String id;

@NotBlank
@Size(max = 200)
private String title;

@NotBlank
@Size(max = 5000)
private String content;

@Pattern(regexp = "low|normal|high|urgent")
private String priority = "normal";

private LocalDateTime expiresAt;

@CreationTimestamp
private LocalDateTime createdAt;

@UpdateTimestamp
private LocalDateTime updatedAt;

@PrePersist
public void generateId() {
    if (this.id == null || this.id.isEmpty()) {
        this.id = slugify(this.title);
    }
}

private String slugify(String text) {
    if (text == null) {
        return "announcement-" + System.currentTimeMillis();
    }

    String slug = text.toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");

    return slug.isEmpty()
            ? "announcement-" + System.currentTimeMillis()
            : slug;
}

}
