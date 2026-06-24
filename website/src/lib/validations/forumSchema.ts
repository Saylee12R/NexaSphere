import { z } from 'zod';

export const forumThreadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  content: z
    .string()
    .trim()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content cannot exceed 10000 characters'),
  category_id: z.union([z.string(), z.number()]).refine((val) => val !== '', {
    message: 'Category is required',
  }),
  tags: z.array(z.string()).optional(),
});

export type ForumThreadPayload = z.infer<typeof forumThreadSchema>;
