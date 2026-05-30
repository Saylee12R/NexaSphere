package org.nexasphere.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "certificate_templates")
@Data
@NoArgsConstructor
public class CertificateTemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 120)
    @Column(unique = true)
    private String name;

    @NotBlank
    @Pattern(regexp = "HTML_CSS|IMAGE_OVERLAY")
    private String type = "HTML_CSS";

    @Column(columnDefinition = "text")
    private String content;

    @Column(name = "placeholders_json", columnDefinition = "text")
    private String placeholdersJson;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
