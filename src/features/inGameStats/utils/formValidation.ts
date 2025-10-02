import { z } from 'zod';
import { shouldShowLocationTempo } from '../../../constants/actionTypes';

/**
 * Zod schema for point entry validation
 */
export const pointEntrySchema = z
  .object({
    winLoss: z.enum(['Win', 'Loss'], {
      errorMap: () => ({ message: 'Please select Win or Loss' })
    }),
    category: z.string().min(1, 'Please select an action category'),
    subcategory: z.string().min(1, 'Please select a specific action'),
    locationTempo: z.string().nullable(),
    player: z.string().min(1, 'Please select a player')
  })
  .refine(
    (data) => {
      // Custom validation: location/tempo required for certain categories
      const requiresLocation = shouldShowLocationTempo(data.winLoss, data.category);
      if (requiresLocation && !data.locationTempo) {
        return false;
      }
      return true;
    },
    {
      message: 'Location/Tempo is required for this action type',
      path: ['locationTempo']
    }
  );

export type PointEntryInput = z.infer<typeof pointEntrySchema>;

/**
 * Validate point entry form data
 */
export function validatePointEntry(data: unknown) {
  return pointEntrySchema.safeParse(data);
}

/**
 * Get validation errors as a record
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}
