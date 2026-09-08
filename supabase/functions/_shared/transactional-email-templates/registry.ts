import type * as React from 'npm:react@18.3.1'

import { template as paymentConfirmation } from './payment-confirmation.tsx'
import { template as subscriptionCancelled } from './subscription-cancelled.tsx'
import { template as trialDay2 } from './trial-day-2.tsx'
import { template as trialDay5 } from './trial-day-5.tsx'
import { template as trialEnded } from './trial-ended.tsx'

export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: (props: any) => React.ReactElement
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'payment-confirmation': paymentConfirmation,
  'subscription-cancelled': subscriptionCancelled,
  'trial-day-2': trialDay2,
  'trial-day-5': trialDay5,
  'trial-ended': trialEnded,
}