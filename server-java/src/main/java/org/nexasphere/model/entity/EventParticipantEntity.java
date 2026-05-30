package org.nexasphere.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_certificate_participants")
@Data
@NoArgsConstructor
public class EventParticipantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    private String eventId;

    @NotBlank
    @Size(max = 120)
    private String fullName;

    @NotBlank
    @Size(max = 200)
    private String email;

    @NotBlank
    @Size(max = 30)
    private String rollNumber;

    @NotBlank
    @Pattern(regexp = "REGISTERED|ATTENDED|ABSENT")
    private String status = "REGISTERED";

    @CreationTimestamp
    private LocalDateTime createdAt;
}
