export const HOSTEL_TYPE_LABEL: Record<string, string> = { BOYS: 'Boys', GIRLS: 'Girls', MIXED: 'Co-ed' }
export const ROOM_TYPE_LABEL = (t?: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ') + ' sharing' : '')
