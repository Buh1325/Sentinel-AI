// services/legalAdvice.ts
import { LegalAdvice, IncidentCategory } from '../lib/types';

export const LEGAL_ADVICE_DB: Record<IncidentCategory, LegalAdvice> = {
  Robbery: {
    id: 'legal-robbery',
    category: 'Robbery',
    legislation_title: 'Criminal Procedure Act — Citizen Arrest',
    legislation_citation: 'Criminal Procedure Act 51 of 1977, Section 42',
    summary:
      'A private citizen may arrest without a warrant any person who commits or attempts to commit an offence in their presence, or whom they reasonably suspect of having committed a Schedule 1 offence. The arrest must be made with minimal force, and the person must be handed to SAPS immediately.',
    immediate_actions: [
      'Do not confront armed suspects — prioritise your life over property.',
      'Move to a safe, well-lit, populated area and call 10111.',
      'Record descriptions (clothing, vehicle, direction of flight) from a distance.',
      'Open a case at the nearest SAPS station within 24 hours; get a case number.',
      'Preserve any CCTV footage — request it in writing before it is overwritten.',
    ],
    resolution_pattern:
      'Most community-reported robberies are resolved when a SAPS case number is issued and the CPF shares the description with local patrols. Recovery rates improve when footage is preserved within the first 48 hours.',
  },
  Hijacking: {
    id: 'legal-hijacking',
    category: 'Hijacking',
    legislation_title: 'Criminal Procedure Act — Hijacking as Aggravated Robbery',
    legislation_citation: 'Criminal Procedure Act 51 of 1977 read with Common Law Robbery',
    summary:
      'Vehicle hijacking is prosecuted as aggravated robbery. Victims have the right to lay a charge, receive a case number, and be referred to Victim Empowerment Programme (VEP) services.',
    immediate_actions: [
      'Do not resist — release the vehicle immediately.',
      'Drive to a public place if you can safely escape.',
      'Call 10111 and 112 from a cellphone; report the vehicle’s tracking unit.',
      'Notify your insurer within 24 hours and obtain a SAPS case number.',
      'If tracking confirms recovery, wait for SAPS before approaching the vehicle.',
    ],
    resolution_pattern:
      'Community resolution typically involves the tracking company, SAPS Vehicle Crime Unit, and insurance. Roughly 40% of tracked vehicles in Gauteng are recovered within 6 hours when reported immediately.',
  },
  Kidnapping: {
    id: 'legal-kidnapping',
    category: 'Kidnapping',
    legislation_title: 'Prevention and Combating of Trafficking in Persons Act',
    legislation_citation: 'Act 7 of 2013; Criminal Procedure Act 51 of 1977',
    summary:
      'Kidnapping is a Schedule 1 offence. SAPS must open a case immediately — there is no waiting period. The Hawks (DPCI) may be assigned in trafficking-related matters.',
    immediate_actions: [
      'Call 10111 immediately — do NOT wait 24 hours.',
      'Provide last-seen location, time, clothing, and vehicle details.',
      'Contact the SAPS FCS unit for minors.',
      'Preserve phone records, social media messages, and any ransom communication.',
      'Notify the CPF and neighbourhood watch — do NOT negotiate independently.',
    ],
    resolution_pattern:
      'Resolutions require SAPS hostage negotiation or FCS intervention. Community groups should support but never act as primary negotiators.',
  },
  'Suspicious activity': {
    id: 'legal-suspicious',
    category: 'Suspicious activity',
    legislation_title: 'Protection from Harassment Act and POPIA',
    legislation_citation: 'Protection from Harassment Act 17 of 2011; POPIA 4 of 2013',
    summary:
      'Reporting suspicious activity is lawful. However, publicly identifying or accusing individuals without evidence can constitute harassment or defamation. Report to SAPS or CPF with objective observations only.',
    immediate_actions: [
      'Record factual, time-stamped observations — avoid speculation about identity.',
      'Report to SAPS 10111 or your local CPF control room.',
      'Do not publish names or photos of suspects on community groups.',
      'Use the SAPS MySAPS app for anonymous tips.',
      'Follow up within 72 hours to confirm the report was logged.',
    ],
    resolution_pattern:
      'CPF tip-offs routed through SAPS intelligence desks have historically resulted in arrests when the report includes a licence plate or address, not personal identification.',
  },
  Assault: {
    id: 'legal-assault',
    category: 'Assault',
    legislation_title: 'Domestic Violence Act & Common Law Assault',
    legislation_citation: 'Domestic Violence Act 116 of 1998; Common Law Assault (GBH)',
    summary:
      'Assault is a Schedule 1 offence when committed with intent to cause grievous bodily harm. Victims may apply for a protection order at any Magistrates’ Court without legal representation.',
    immediate_actions: [
      'Get to safety and call 10111 or 112.',
      'Seek medical attention — a J88 form from a district surgeon is admissible in court.',
      'Apply for a protection order at the nearest Magistrates’ Court (free).',
      'Report to SAPS within 72 hours to preserve forensic evidence.',
      'Contact Lifeline SA (0861 322 322) for trauma support.',
    ],
    resolution_pattern:
      'Protection orders are typically granted within 24 hours on an interim basis. Community cases resolve best when the victim is supported by an FCS officer and a court-appointed counsellor.',
  },
  'Domestic Dispute': {
    id: 'legal-domestic',
    category: 'Domestic Dispute',
    legislation_title: 'Domestic Violence Act',
    legislation_citation: 'Domestic Violence Act 116 of 1998',
    summary:
      'SAPS members are obligated to respond to domestic violence complaints, arrest where there is evidence of assault, and inform the complainant of their right to a protection order.',
    immediate_actions: [
      'Call 10111 — domestic violence calls are treated as priority.',
      'Do not attempt to mediate physical disputes yourself.',
      'Support the victim in applying for a protection order.',
      'Document injuries and any prior incidents.',
      'Refer to the GBV Command Centre (0800 428 428).',
    ],
    resolution_pattern:
      'Court-issued protection orders have been shown to reduce repeat incidents by ~60% when served promptly by SAPS.',
  },
  'Break-In': {
    id: 'legal-breakin',
    category: 'Break-In',
    legislation_title: 'Housebreaking with Intent to Steal',
    legislation_citation: 'Criminal Procedure Act 51 of 1977; Common Law Housebreaking',
    summary:
      'Housebreaking with intent to steal is a Schedule 2 offence. SAPS must attend the scene, obtain fingerprints, and issue a case number for insurance purposes.',
    immediate_actions: [
      'Do not enter if the suspect may still be inside — retreat and call 10111.',
      'Preserve the scene — do not touch entry points before SAPS arrives.',
      'Photograph damage, list stolen items, and locate proof of purchase.',
      'Notify your insurance within 30 days and quote the SAPS case number.',
      'Alert your neighbourhood watch to increase patrols on your street.',
    ],
    resolution_pattern:
      'Housebreakings that get a same-day SAPS response and neighbourhood-watch flagging see ~2x higher recovery of stolen electronics than delayed reports.',
  },
  Other: {
    id: 'legal-other',
    category: 'Other',
    legislation_title: 'General Emergency Rights',
    legislation_citation: 'Constitution of South Africa, Chapter 2 (Bill of Rights)',
    summary:
      'Every person has the right to life, safety, and to report crimes to SAPS. Emergency calls are free from any cellphone — 10111 (SAPS), 112 (mobile), 10177 (ambulance).',
    immediate_actions: [
      'Call 10111 for any safety emergency.',
      'Do not endanger yourself to gather evidence.',
      'Retain a case number for all formal reports.',
      'Report corruption in SAPS to IPID (0800 111 234).',
    ],
    resolution_pattern:
      'Community resolution success historically depends on accurate logging with SAPS and follow-up through the local CPF or IPID.',
  },
};

export function getLegalAdvice(category: IncidentCategory): LegalAdvice {
  return LEGAL_ADVICE_DB[category] ?? LEGAL_ADVICE_DB.Other;
}