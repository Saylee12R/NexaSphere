import { z } from 'zod';

export const membershipSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  collegeEmail: z
    .string()
    .trim()
    .min(1, 'College email is required')
    .email('Invalid email address')
    .refine((val) => val.endsWith('@glbajajgroup.org'), {
      message: 'Please use your official GL Bajaj email (@glbajajgroup.org)',
    }),
  rollNumber: z.string().trim().min(1, 'University roll number is required').max(30),
  course: z.string().trim().min(1, 'Course is required'),
  courseOther: z.string().trim().optional(),
  branch: z.string().trim().min(1, 'Branch is required'),
  branchOther: z.string().trim().optional(),
  section: z.string().trim().min(1, 'Section is required'),
  sectionOther: z.string().trim().optional(),
  semester: z.string().trim().min(1, 'Semester is required'),
  whatsapp: z
    .string()
    .trim()
    .min(1, 'WhatsApp number is required')
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  groups: z.array(z.string()).min(1, 'Please select at least one group'),
  whyJoin: z.string().trim().min(1, 'Motivation is required').max(2000),
});

export type MembershipPayload = z.infer<typeof membershipSchema>;
