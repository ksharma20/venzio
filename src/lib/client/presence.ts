export type PresenceTag = 'in_office' | 'remote' | 'not_in'

/**
 * Single source of truth for user presence tag.
 * - not checked in today                   → 'not_in'
 * - checked in via wifi or gps signal      → 'in_office'
 * - checked in via any other signal / none → 'remote'
 */
export function resolvePresenceTag(
  presenceStatus: 'present' | 'visited' | 'notIn',
  matchedBy: string | null | undefined
): PresenceTag {
  if (presenceStatus === 'notIn') return 'not_in'
  if (matchedBy === 'wifi' || matchedBy === 'gps') return 'in_office'
  return 'remote'
}

export const PRESENCE_TAG_CONFIG: Record<PresenceTag, { label: string; color: string }> = {
  in_office: { label: 'In office', color: 'var(--teal)' },
  remote:    { label: 'Remote',    color: 'var(--amber)' },
  not_in:    { label: 'Not in',    color: 'var(--text-muted)' },
}
