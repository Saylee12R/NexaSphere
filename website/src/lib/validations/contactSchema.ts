import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  subject: z.string().trim().max(200).optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message cannot exceed 5000 characters'),
});

export type ContactPayload = z.infer<typeof contactSchema>;
