import { z } from 'zod';

export const bookingSchema = z.object({
  salonSlug: z.string().trim().min(3).max(60).optional(),
  serviceIds: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid service selection.')).min(1, 'Select at least one service.').max(10, 'You can select up to 10 services per appointment.'),
  staffId: z.union([z.literal('any'), z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid barber selection.')]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const parsed = new Date(`${value}T00:00:00Z`); return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; }, 'Enter a valid calendar date.'),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().transform((value) => value.replace(/[\s-]/g, '')).pipe(z.string().regex(/^(?:\+?8801|01)[3-9]\d{8}$/, 'Enter a valid Bangladesh mobile number')),
  email: z.string().email().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().default(''),
  notificationConsent: z.boolean().optional().default(false),
}).strict();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(10).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});
