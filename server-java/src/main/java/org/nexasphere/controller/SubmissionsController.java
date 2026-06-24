package org.nexasphere.controller;

import jakarta.validation.Valid;
import org.nexasphere.model.entity.MembershipSubmissionEntity;
import org.nexasphere.model.entity.RecruitmentSubmissionEntity;
import org.nexasphere.repository.MembershipSubmissionRepository;
import org.nexasphere.repository.RecruitmentSubmissionRepository;
import org.nexasphere.util.Sanitizer;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionsController {

    private final MembershipSubmissionRepository membershipRepo;
    private final RecruitmentSubmissionRepository recruitmentRepo;
    private final Sanitizer sanitizer;

    public SubmissionsController(MembershipSubmissionRepository membershipRepo, 
                                 RecruitmentSubmissionRepository recruitmentRepo,
                                 Sanitizer sanitizer) {
        this.membershipRepo = membershipRepo;
        this.recruitmentRepo = recruitmentRepo;
        this.sanitizer = sanitizer;
    }

    @PostMapping("/membership")
    public ResponseEntity<Object> submitMembership(@Valid @RequestBody MembershipSubmissionEntity submission) {
        if (membershipRepo.existsByCollegeEmail(submission.getCollegeEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A submission with this email already exists."));
        }
        submission.setId(null);
        submission.setStatus("applied");
        submission.setSubmittedAt(LocalDateTime.now());

        // Sanitize string fields
        submission.setFullName(sanitizer.clean(submission.getFullName()));
        submission.setCollegeEmail(sanitizer.clean(submission.getCollegeEmail()));
        submission.setRollNumber(sanitizer.clean(submission.getRollNumber()));
        submission.setCourse(sanitizer.clean(submission.getCourse()));
        submission.setBranch(sanitizer.clean(submission.getBranch()));
        submission.setSection(sanitizer.clean(submission.getSection()));
        submission.setSemester(sanitizer.clean(submission.getSemester()));
        submission.setWhatsapp(sanitizer.clean(submission.getWhatsapp()));
        submission.setGroupsSelected(sanitizer.clean(submission.getGroupsSelected()));
        submission.setWhyJoin(sanitizer.clean(submission.getWhyJoin()));

        return ResponseEntity.status(HttpStatus.CREATED).body(membershipRepo.save(submission));
    }

    @PostMapping("/recruitment")
    public ResponseEntity<Object> submitRecruitment(@Valid @RequestBody RecruitmentSubmissionEntity submission) {
        if (recruitmentRepo.existsByCollegeEmail(submission.getCollegeEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A submission with this email already exists."));
        }
        submission.setId(null);
        submission.setStatus("applied");
        submission.setSubmittedAt(LocalDateTime.now());

        // Sanitize string fields
        submission.setFullName(sanitizer.clean(submission.getFullName()));
        submission.setCollegeEmail(sanitizer.clean(submission.getCollegeEmail()));
        submission.setWhatsapp(sanitizer.clean(submission.getWhatsapp()));
        submission.setYear(sanitizer.clean(submission.getYear()));
        submission.setBranch(sanitizer.clean(submission.getBranch()));
        submission.setSection(sanitizer.clean(submission.getSection()));
        submission.setRole(sanitizer.clean(submission.getRole()));
        submission.setInterests(sanitizer.clean(submission.getInterests()));
        submission.setSkills(sanitizer.clean(submission.getSkills()));
        submission.setWhyJoin(sanitizer.clean(submission.getWhyJoin()));

        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentRepo.save(submission));
    }
}
