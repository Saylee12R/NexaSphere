import { z } from 'zod';

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1),
  category: z.string().trim().max(50).optional().default('general'),
  pinned: z.boolean().optional().default(false),
  status: z
    .enum(['draft', 'scheduled', 'published', 'expired', 'archived'])
    .optional()
    .default('published'),
  scheduledFor: z.string().trim().nullable().optional(),
  expiresAt: z.string().trim().nullable().optional(),
  targetRole: z.string().trim().max(50).optional().default('all'),
  targetStage: z.string().trim().max(50).optional().default('all'),
  targetDepartment: z.string().trim().max(100).optional().default('all'),
  targetGraduationYear: z.number().int().positive().nullable().optional(),
  priority: z.enum(['info', 'warning', 'urgent']).optional().default('info'),
  ctaText: z.string().trim().max(100).nullable().optional(),
  ctaUrl: z.string().trim().max(2048).nullable().optional(),
});
