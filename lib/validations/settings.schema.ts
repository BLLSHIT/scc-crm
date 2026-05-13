import { z } from 'zod'

export const settingsSchema = z.object({
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyZip: z.string().optional(),
  companyCity: z.string().optional(),
  companyCountry: z.string().optional(),
  companyEmail: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  companyPhone: z.string().optional(),
  companyWebsite: z.string().optional(),
  taxNumber: z.string().optional(),
  ustId: z.string().optional(),
  bankName: z.string().optional(),
  bankIban: z.string().optional(),
  bankBic: z.string().optional(),
  logoUrl: z.string().optional(),
  defaultQuoteValidity: z.coerce.number().int().min(1).max(365).default(30),
  defaultInvoiceDueDays: z.coerce.number().int().min(0).max(365).default(14),
  quoteNumberPrefix: z.string().min(1).max(10).default('AN'),
  invoiceNumberPrefix: z.string().min(1).max(10).default('RE'),
})

export type SettingsInput = z.infer<typeof settingsSchema>
