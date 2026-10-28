import { z } from "zod";

/** Korope+ interest form (screen 20). */
export const koropePlusLead = z.object({
  organisation: z.string().trim().min(2, "Enter your company or school name.").max(120),
  riders: z.string().trim().min(1, "Give an approximate number of riders.").max(40),
  contact: z
    .string()
    .trim()
    .min(5, "Enter a work email or phone number so we can reach you.")
    .max(120)
    .refine((v) => /@/.test(v) || v.replace(/\D/g, "").length >= 10, "Enter a work email or phone number so we can reach you."),
});
