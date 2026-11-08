import { z } from "zod";


export const projectIdSchema = z.uuid();

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(10000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(10000),
  status: z.enum([
    "PLANNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
}).strict();