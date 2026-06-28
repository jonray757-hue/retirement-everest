window.CHECKLIST_DEFAULTS = {
  shared: [
    { id: 'date-set', label: 'Set event date in planner', offsetDays: -56, phase: 'Planning' },
    { id: 'venue-hold', label: 'Confirm venue hold & room capacity', offsetDays: -42, phase: 'Planning' },
    { id: 'invites', label: 'Send guest invitations / RSVP link', offsetDays: -28, phase: 'Outreach' },
    { id: 'menu-lock', label: 'Lock menu selections with kitchen', offsetDays: -14, phase: 'Operations' },
    { id: 'headcount', label: 'Export final headcount & meal report', offsetDays: -7, phase: 'Operations' },
    { id: 'day-of-kit', label: 'Prepare day-of kit (signage, guest list, AV)', offsetDays: -3, phase: 'Day-of' },
    { id: 'doors', label: 'Doors open — welcome guests', offsetDays: 0, phase: 'Day-of' },
    { id: 'debrief', label: 'Post-event debrief & thank-yous', offsetDays: 2, phase: 'Follow-up' }
  ],
  screening: [
    { id: 'banquet-coord', label: 'Confirm banquet service & plated dinner timing', offsetDays: -21, phase: 'Operations' },
    { id: 'theater-check', label: 'Theater AV & seating walkthrough', offsetDays: -10, phase: 'Operations' }
  ],
  preorder: [
    { id: 'bar-tab', label: 'Confirm bar package & drink preorder list', offsetDays: -21, phase: 'Operations' },
    { id: 'arrival-bites', label: 'Share arrival bite counts with kitchen', offsetDays: -10, phase: 'Operations' }
  ],
  retreat: [
    { id: 'room-block', label: 'Confirm room block & check-in instructions', offsetDays: -28, phase: 'Planning' },
    { id: 'spa-schedule', label: 'Coordinate hot springs / spa access windows', offsetDays: -14, phase: 'Operations' },
    { id: 'checkout', label: 'Confirm late checkout policy with front desk', offsetDays: -7, phase: 'Operations' }
  ]
};