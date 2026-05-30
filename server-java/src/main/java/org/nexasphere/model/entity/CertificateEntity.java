package org.nexasphere.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "certificates")
@Data
@NoArgsConstructor
public class CertificateEntity {

    @Id
    @Size(max = 80)
    private String certificateId;

    @NotBlank
    @Size(max = 100)
    private String eventId;

    @NotBlank
    @Size(max = 200)
    private String eventName;

    private Long templateId;

    @NotBlank
    @Size(max = 120)
    private String studentName;

    @NotBlank
    @Size(max = 200)
    private String studentEmail;

    @NotBlank
    @Size(max = 30)
    private String studentRollNumber;

    private LocalDateTime issueDate;

    private boolean revoked = false;

    @Size(max = 40)
    private String templateStyle = "default";

    @CreationTimestamp
    private LocalDateTime createdAt;
}
