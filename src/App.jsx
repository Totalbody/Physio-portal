import { useState, useRef, useEffect, useCallback } from "react";

const PORTAL_API = "https://tbp-cliniko-proxy-j6f9.vercel.app/api/portal";
const PORTAL_SECRET = "LSLYXuABMuqYUAJ7BeF4oHhnKh0xvBlogog99ipQ";
const _isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const _log  = (...a) => { if (_isDev) console.log(...a); };
const _warn = (...a) => { if (_isDev) console.warn(...a); };
const _err  = (...a) => { if (_isDev) console.error(...a); };
const _apiHeaders = { "Content-Type": "application/json", "X-Portal-Secret": PORTAL_SECRET };

// ── NZ DATE FORMATTING ────────────────────────────────────────
// Convert any date string (ISO yyyy-mm-dd, Date object, or already-formatted)
// into NZ display format dd/mm/yyyy. Safe with null/undefined.
function fmtNZ(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    // Already in dd/mm/yyyy — leave alone
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) return d;
    // ISO yyyy-mm-dd (possibly with time) — parse directly to avoid TZ surprises
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-NZ');
}

// Long NZ format: "Wednesday, 19 March 2025" — day always before month regardless
// of browser locale quirks (iOS Safari sometimes flips en-NZ).
function fmtNZLong(d) {
  if (!d) return '';
  const dt = (d instanceof Date) ? d : (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)
    ? new Date(d + 'T12:00:00') : new Date(d));
  if (isNaN(dt.getTime())) return String(d);
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

// ── AI EXPIRY DATE DETECTION ─────────────────────────────
async function detectExpiryDate(dataUrl, certLabel) {
  try {
    const resp = await fetch(PORTAL_API + "/detect-expiry", {
      method: "POST",
      headers: _apiHeaders,
      body: JSON.stringify({ fileData: dataUrl, certLabel: certLabel })
    });
    if (!resp.ok) {
      _err("[Expiry] API error " + resp.status);
      return { expiry: null };
    }
    const parsed = await resp.json();
    _log("[Expiry] AI detected:", parsed);
    return parsed;
  } catch (e) {
    _err("[Expiry] Failed:", e.message);
    return { expiry: null };
  }
}

function getExpiryStatus(expiryStr) {
  if (!expiryStr) return { status: "unknown", label: "On file ✓", color: null };
  const expiry = new Date(expiryStr);
  const today = new Date();
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: "expired", label: "Expired " + expiry.toLocaleDateString("en-NZ"), color: "#E24B4A" };
  if (daysLeft <= 30) return { status: "expiring", label: "Expires " + expiry.toLocaleDateString("en-NZ"), color: "#BA7517" };
  return { status: "valid", label: "Valid to " + expiry.toLocaleDateString("en-NZ"), color: "#3B6D11" };
}


const C = {
  teal:"#0F6E56",tealL:"#E1F5EE",red:"#E24B4A",redL:"#FCEBEB",
  amber:"#BA7517",amberL:"#FAEEDA",green:"#3B6D11",greenL:"#EAF3DE",
  blue:"#185FA5",blueL:"#E6F1FB",gray:"#5F5E5A",grayL:"#F1EFE8",
  grayXL:"#FAFAF8",border:"#e2e0d8",text:"#1a1a18",muted:"#6b6963",
  hint:"#9b9892",bg:"#f5f3ee",card:"#ffffff",
};

// ── P&P SECTIONS (from TBP Policies and Procedures Manual) ───────────────────
const PP_SECTIONS = [
  {
    id:"quality", num:"1", icon:"📊", title:"Quality & Risk Management",
    color:"#0F6E56", audience:"Management",
    summary:"P&P manual reviewed annually by Director(s) — changes presented at annual staff meeting. Covers all 6 clinic locations. Business Plan reviewed annually with quality improvement and risk management plans. Financial statistics monthly, service delivery stats annually. Clinical notes audited every 6 months per physiotherapist (5 current + 5 past). H&S audit quarterly at each site. KPI dashboard monitored weekly.",
    policies:[
      {title:"Policies & Procedures Manual",key:"pp_manual",body:"Reviewed annually by Director(s). Changes presented at annual staff meeting. Covers all clinic locations: Pakuranga, Titirangi, Flat Bush, Panmure, Howick School, Edgewater School. Hard copy with admin manager, digital copy on shared drive and Staff Compliance Portal. Confidential to current TBP staff only. No part may be copied or shared without Director authorisation."},
      {title:"Clinical oversight (2025 update)",key:"clinical_director",body:"Note: The ACC Allied Health Services contract (November 2024) no longer requires a Clinical Director role. Clinical oversight responsibilities now rest with the supplier (Director) directly. Case reviews before the 16th visit are still best practice and should be documented in meeting notes where clinically indicated. All physiotherapists maintain their own scope of practice under their APC."},
      {title:"Business Plan",key:"biz_plan",body:"Reviewed annually by Directors. Three copies: Master (Directors + Business Advisor — includes financials, confidential), Clinic copy (shared drive, no financials). Contains Quality Improvement Plan and Risk Management Plan."},
      {title:"Statistics",key:"statistics",body:"Financial stats collected monthly. Service delivery stats collated annually before staff meeting. Reports generated via Cliniko and Google Forms. Ethnicity recorded at initial intake for service delivery assessment."},
      {title:"Audits",key:"audits_policy",body:"Clinical notes audit: every 6 months per physiotherapist, 10 records (5 current + 5 past). Audit form on Google Drive — completed forms emailed to Administrative Manager. H&S audit: quarterly at each clinic location, by physio staff reviewed by H&S Officer. Client satisfaction: feedback via website, satisfaction forms, or verbal — all complaints follow complaints procedure (§3.9). Audit records stored in Management section of Staff Compliance Portal."},
    ],
    links:[{label:"Run H&S audit",page:"management",tab:"audits"},{label:"Run clinical notes audit",page:"management",tab:"audits"},{label:"Staff meetings",page:"management",tab:"meetings"}]
  },
  {
    id:"professional", num:"2", icon:"⚖️", title:"Professional Standards",
    color:"#185FA5", audience:"All staff",
    summary:"All staff must understand Privacy Act 2020 and Health Information Privacy Code 2020. Free online training at privacy.org.nz. Annual privacy refresher at staff meeting. Informed verbal consent is sufficient for routine treatment — must be ticked in Cliniko. Digital intake form captures consent electronically. Client consent required for any information disclosure. Telehealth consent must be documented separately.",
    policies:[
      {title:"Privacy Policy",key:"privacy",body:"Staff must understand Privacy Act 2020 and HIPC 2020 — copies in orientation folder. Annual privacy refresher at staff meeting held by Privacy Officer. Free online training at privacy.org.nz (Health 101 and Health ABC modules). Client info collected fairly, stored securely, disposed of securely. Staff may access their own personnel information."},
      {title:"Privacy Officer responsibilities",key:"privacy_officer",body:"Manage access requests and complaints. Handle breaches with Directors. Liaise with Office of Privacy Commissioner. Acknowledge complaints within 24 hours. Respond with findings within 20 days. Report serious harm breaches to Privacy Commissioner at privacy.org.nz. Hold annual privacy refresher for all staff."},
      {title:"Consent to assessment & treatment",key:"consent",body:"All clients must give informed consent at initial consultation. Physiotherapy Board NZ states oral informed consent is sufficient for routine assessment. Client must be given information booklet before assessment. 'Informed Verbal Consent Obtained' must be ticked on Initial Assessment form. Consent required at each session and for significant changes. Under 16: parent or guardian consent required — documented in notes."},
      {title:"Confidentiality policy",key:"confidentiality",body:"Client consent required for disclosure. Parties covered at initial assessment: ACC Case Managers, GPs, Health Insurance Companies, Specialists. Any other party: contact client first and document consent. Bound by Privacy Act 2020 and HIPC 2020. Disclosure may occur to protect safety or assist law enforcement."},
      {title:"Consent to treatment observation",key:"consent_obs",body:"Client must give informed consent before any observation. Ask away from the observer. Remind client that observer is aware of the Privacy Act. Document consent in Cliniko profile."},
    ],
    links:[{label:"Privacy Act 2020",url:"https://legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html"},{label:"HIPC 2020",url:"https://privacy.org.nz/privacy-act-2020/codes-of-practice/hipc2020/"}]
  },
  {
    id:"hs", num:"3", icon:"🦺", title:"Health & Safety",
    color:"#BA7517", audience:"All staff",
    summary:"H&S plan is part of the Business Plan. H&S Officer assesses all clinic locations quarterly. All staff need current First Aid/CPR (every 2 years). Fire extinguisher at each clinic — staff reminded annually. All equipment audited annually by Administrative Manager. Digital systems: Cliniko (2FA required), PhysioNote, Submit Kit, KPI Dashboard, Staff Compliance Portal. Incident reports in Cliniko; WorkSafe if serious harm. Dry needling: trained staff only, single-use needles, sharps disposal at Chemist Warehouse.",
    policies:[
      {title:"Fire",key:"fire",body:"Centre fitted with fire extinguisher. Staff reminded annually on operation. Smoke-free area. Last physio to leave must switch off all electronic equipment. If fire: activate alarm, call 111, extinguish if safe using one extinguisher, remove people from danger, close windows/doors on exit. After event: complete incident report."},
      {title:"Clinical emergency (DRSABCD)",key:"clinical_emergency",body:"All staff must hold current First Aid + CPR (every 2 years). Call 111. DRSABCD: Danger → Response → Send for help → Airway → Breathing → CPR (30 compressions, 2 breaths; compressions only if blood/vomit) → Defibrillator. Get AED, do not stop CPR. After recovery: stable side position if no spinal injury. All emergencies documented as incident report."},
      {title:"Evacuation & disaster plan",key:"evacuation",body:"Earthquake: DROP, COVER, HOLD. Do not run outside. Flood: raise valuables, get to high ground. Storm: stay indoors, close curtains, partially open sheltered window. Eruption: stay indoors, close windows. Tsunami: move inland immediately if shaking is strong/long (>1 min), M7+, or Civil Defence warning issued. Civil Defence: 0800 22 22 00. Follow school health centre staff instructions."},
      {title:"Violence & security",key:"violence",body:"Confrontation: stay calm, maintain safety, speak non-threateningly, alert staff. Serious threat or assault: call 111. Criminal activity: call 111. Sexual assault: remove victim to safety, call 111 immediately, support police, close clinic if required."},
      {title:"Incident reporting",key:"incidents",body:"Incident report form completed for any hazard, risk, accident, or near miss — stored in client or staff profile in Cliniko. H&S Officer must be informed. Immediate risk: ACC 0800 222 070. All H&S incidents reported to ACC at acc.co.nz. Notable events (death, hospitalisation): report to WorkSafe at worksafe.govt.nz."},
      {title:"Complaints procedure",key:"complaints",body:"All complaints (formal or informal) reported to Director(s) within 24 hours. Director discusses with relevant staff and documents in Cliniko incident report. Director contacts complainant within 24 hours. If unresolved: written acknowledgement within 5 days. Privacy complaints handled with Privacy Officer. Complaint form at website FAQ section."},
      {title:"Hygiene & infection control",key:"hygiene",body:"Hand hygiene before and after every client contact, after toilet, before eating. Open wounds covered. Plinth wiped with alcohol wipe after every client. Hands washed with hot water and soap after every client. Desks cleaned daily. Clinic cleaning by Auckland City Council facilities management. No hard copy records kept in clinic."},
      {title:"Dry needling — safe practice",key:"dry_needling",body:"Disposable needles only — never reuse. Confirm training and scope before needling. Document procedure, warnings, consent (verbal + written for pregnancy). Under 16: parent consent required, parents present for first treatment. Sharps box filled to 3/4 then disposed at Chemist Warehouse. Stored out of reach of children. Alcohol swab used after each needle removal. Only trained staff may remove needles. High risk areas: needle shallow, directed away from structures. Pregnancy: caution especially first trimester — consider written consent."},
      {title:"Dry needling — adverse events",key:"dn_adverse",body:"Pain: remove needle if excessive or shooting/paraesthesia. Haematoma: apply pressure, ice, gloves if blood contact risk. Fainting: remove all needles, lie client down, raise legs, offer water/something sweet. Stuck needle: rotate opposite direction or relax tissue with massage/ice/surrounding needle. Pneumothorax: warn clients when needling thoracic region — symptoms: SOB, chest pain, dry cough. Send urgently for X-ray. Needle stick injury: wash site, encourage bleeding, blood tests for Hep B, C and HIV."},
    ],
    links:[{label:"Run H&S audit",page:"management",tab:"audits"},{label:"Run fire drill",page:"management",tab:"audits"},{label:"Report to WorkSafe",url:"https://worksafe.govt.nz"},{label:"Report to ACC",url:"https://acc.co.nz"}]
  },
  {
    id:"rights", num:"4", icon:"🤝", title:"Rights & Responsibilities",
    color:"#533AB7", audience:"All staff",
    summary:"All staff must know the HDC Act 1994 and Code of Health & Disability Services Consumers' Rights (displayed in waiting rooms). Vulnerable clients include children, older adults and people with disabilities — Oranga Tamariki helpline 0508 463 674. All staff undergo police vetting (every 3 years). Cultural competency: eCALD + Mauriora course required annually. Specific Māori cultural safety procedures apply at all clinics including pillow handling and whānau support.",
    policies:[
      {title:"Client rights (HDC Code)",key:"client_rights",body:"Clients treated with respect and privacy — gowns/shorts provided. All clients may bring a support person. Provider preference met where practicable. Effective communication per client needs — ACC interpreters 0800 101966. Rights displayed in waiting room and in client information booklet. Code of Rights available at hdc.org.nz."},
      {title:"Vulnerable clients",key:"vulnerable",body:"Vulnerable clients: children, older adults, people with disabilities. Where abuse suspected: seek expert advice. Oranga Tamariki helpline: 0508 463 674. All staff must know Children's Act 2014. Safety checks required: identity verification, reference checks, employment checks, PBNZ registration check, interview, police vetting, risk assessment. Police vetting and risk assessment renewed every 3 years."},
      {title:"Child protection policy",key:"child_protection",body:"Child = under 18. Welfare is first consideration. Abuse types: physical, emotional, sexual, neglect, ill treatment. Immediate danger: call 111. Concern: phone Oranga Tamariki 0508 326 459. If consent cannot be obtained but child at risk: Privacy Act is overridden. Under s66 Oranga Tamariki Act: must release information if requested by Police or OT for a person under 18. Family violence: consider s20 Family Violence Act obligations."},
      {title:"Cultural competency",key:"cultural",body:"All staff must complete eCALD, Mauriora, and ongoing cultural CPD including reflective practice. Establish links with school cultural leadership teams. Follow disability/cultural barriers reception procedure."},
      {title:"Māori Health",key:"maori",body:"Te Tiriti o Waitangi respected at all times. All staff complete Mauriora Cultural Competency course. Specific procedures: pillows never on floor; consent before touching head/neck/face; head pillows not used under legs/feet; respect all communication; support traditional healing in home exercise programme; all Māori clients entitled to whānau support; specific treatment goals set with client and whānau; private treatment rooms available. Ethnicity data collected via client satisfaction surveys."},
    ],
    links:[{label:"HDC Code of Rights",url:"https://hdc.org.nz/your-rights/about-the-code/code-of-health-and-disability-services-consumers-rights/"},{label:"Oranga Tamariki",url:"https://www.orangatamariki.govt.nz"},{label:"Mauriora course",url:"https://mauriora.co.nz"},{label:"ACC Māori Cultural Competency (ACC1625)",url:"https://www.acc.co.nz/assets/provider/acc1625-maori-cultural-competency.pdf"},{label:"PBNZ He kawa whakaruruhau",url:"https://physioboard.org.nz/standards/physiotherapy-standards/he-kawa-whakaruruhau-a-matatau-maori-maori-cultural-safety-and-competence-standard"}]
  },
  {
    id:"client", num:"5", icon:"🧑‍⚕️", title:"Client Management",
    color:"#1D9E75", audience:"Physiotherapists",
    summary:"Clients seen within 5 working days of referral. Initial appointments minimum 45 minutes. Triage: urgent (1-2 days), semi-urgent (3-5 days), routine (next available). Multi-site scheduling — offer alternative clinic if needed. All records in Cliniko using SOATAP format with SMART goals. Outcome measures at every visit. Discharge summary required for all ACC clients. Telehealth available where physical exam not required — both parties must be in NZ. TBP does not offer pelvic health, home visits, or psychiatric care.",
    policies:[
      {title:"Initial consultation",key:"initial",body:"Clients may self-refer. Seen within 5 days of referral. Booking details: name, injury site, daytime contact number. Min 45 minutes for ACC or private. Ask re interpreter need — ACC: 0800 101966. Outside scope: refer to GP or school nurse. Must complete: full assessment, accurate diagnosis, clinical records, treatment plan with functional goals, outcome measures (numerical pain scale + patient specific functional scale), education, self-management. Document on Cliniko initial assessment template."},
      {title:"Follow-up consultations",key:"followup",body:"Per treatment plan. Document on Cliniko standard consultation template. Review goals each visit — alter plan if client needs change. Include ACC clinical evidence, outcome measures, referral details where applicable."},
      {title:"Telehealth",key:"telehealth",body:"Requires client consent with in-person option offered. Not appropriate where physical exam required. Both physio and client must be in NZ. Use telehealth Cliniko template. Document same as in-person."},
      {title:"Referrals",key:"referrals",body:"Refer to specialist if clinically indicated or client requests. Client entitled to second opinion — facilitate this. Referral letters via Cliniko templates, emailed where possible. ACC prior approval required for: vocational services, pain specialists, social rehabilitation. Notify ACC at claims@acc.co.nz for services needing approval."},
      {title:"Discharge process",key:"discharge",body:"Completed by physio on Cliniko. Discharge summary per ACC Allied Health Services Operational Guidelines. Send discharge letter to GP if referred by GP. If client fails to attend: attempt contact, check for complaints, record in notes. Provide to ACC if requested."},
      {title:"Limitations of service",key:"limitations",body:"TBP does NOT offer: pelvic health, home visits, psychiatric care, offsite services. Guide clients requiring these to appropriate services."},
    ],
    links:[{label:"Cliniko login",url:"https://app.cliniko.com"},{label:"ACC Allied Health schedule",url:"https://www.acc.co.nz/assets/contracts/acc8310-partnering-with-acc.pdf"}]
  },
  {
    id:"information", num:"6", icon:"📁", title:"Information Management",
    color:"#D85A30", audience:"All staff",
    summary:"All clinical records in Cliniko within 24 hours. 2FA required. SOATAP format, SMART goals. PhysioNote integration — physiotherapist responsible for reviewing AI-generated notes within 24 hours. Outcome measures at every visit (numerical pain scale + patient specific functional scale). Digital intake form captures registration and consent. Submit Kit for all ACC claims. ACC audit requests: provide notes within 10 working days. No hard copies in clinic. Shared drive: pakuranga@totalbodyphysio.co.nz (staff documents only — not client records or financials).",
    policies:[
      {title:"Clinical records",key:"clinical_records",body:"Completed for every visit within 24 hours. Cliniko requires 2FA. Templates: initial consultation, follow-up, discharge summary, telehealth. SOATAP format, SMART goals. Outcome measures at every visit. Each record must include: physio's Cliniko login, date, ACC45 number. ACC claims via Submit Kit. Manual forms if internet interrupted — input to Cliniko ASAP and destroy manual form. Client details required: full name, preferred name, DOB, sex, contact, address, ethnicity, occupation, emergency contact, referral source, consent. If ACC requests notes audit: provide within 10 working days."},
      {title:"Communication",key:"communication",body:"All ACC communication conducted by Clinical Director (Alistair). All client communications documented in Cliniko communications section. Open communication maintained with referring healthcare providers."},
      {title:"Shared drive",key:"shared_drive",body:"Accessed via pakuranga@totalbodyphysio.co.nz (password protected). Contains: caseload lists, orientation materials, audit templates, job descriptions, and general documents. Personnel files, financial info and client records are NOT stored on the shared drive. Backed up to portable hard drive stored offsite."},
      {title:"ACC reports",key:"acc_reports",body:"TBP provides information to ACC when reasonably requested — free of charge. May include: functional objectives, treatment achievements, clinical rationale, treatment plan, outcome measures, return-to-work plan, discharge summary. ACC may conduct audits — Directors and staff available for performance meetings."},
      {title:"Website & client booklet",key:"website",body:"Website totalbodyphysio.co.nz managed by admin manager. Client information booklet provided to all new clients at first visit. Physio must direct new clients to consent and outcome measures pages. Admin manager keeps booklet up to date."},
    ],
    links:[{label:"Cliniko",url:"https://app.cliniko.com"},{label:"Submit Kit ACC",url:"https://www.acc.co.nz/providers/submit-kit/"}]
  },
  {
    id:"hr", num:"7", icon:"👥", title:"Human Resources",
    color:"#639922", audience:"Management",
    summary:"All new staff complete orientation within first month (at least 2–3 hours on day one). Employment agreements and job descriptions signed by end of orientation. Annual performance reviews in April/May. CPD: 100 hours every 3 years per PBNZ 2024 Practice Thresholds. PNZ membership is encouraged but is not a contractual ACC requirement (November 2024 contract update). Peer review at least annually. Staff meetings quarterly — attendance compulsory. Three reflective statements required annually (one specific to Māori culture). Owner/Director does not require a contract of employment. Clinical Director role is no longer required by ACC (November 2024).",
    policies:[
      {title:"Orientation",key:"orientation",body:"Completed within one month of start date. At least 2–3 hours on first day. Director or delegate covers treatment policies; clerical staff cover facility/admin orientation. Orientation checklist signed and filed in personnel file. ACC-specific induction required before independent practice."},
      {title:"Contracts of employment",key:"contracts",body:"Current contract for all staff. Negotiated at commencement. Job description attached and signed. Two copies signed — one to employee, one in personnel file. Reviewed annually at performance review. Contractor agreement between Hakinakina Hauora and TBP for contracted staff. Contractors provide own stock/materials."},
      {title:"Codes of conduct",key:"codes",body:"All physiotherapists bound by Aotearoa NZ Physiotherapy Code of Ethics and Professional Conduct (Physiotherapy Board NZ). Copy stored on shared drive."},
      {title:"Personnel files",key:"personnel_files",body:"Stored securely by admin manager. Staff entitled to view on request. Contains: employee details + emergency contact, ACC partnership agreement, contract + JD, APC, PNZ membership, First Aid cert, cultural competency CPD certs, signed orientation checklist, annual reviews, peer reviews, clinical notes audits."},
      {title:"Staff meetings",key:"staff_meetings",body:"Quarterly. Annual meeting covers P&P updates, business plan changes, H&S and privacy updates. Attendance compulsory for all staff. Minutes taken by admin manager, stored on shared drive."},
      {title:"CPD requirements",key:"cpd",body:"100 hours CPD every 3 years (rolling average) per PBNZ 2024 Practice Thresholds. Annual Professional Development Plan reviewed at performance review. Minimum 3 reflective statements annually: one on Māori culture and practice, two on culture/ethics/professionalism. PNZ membership is encouraged but is not a contractual requirement under the November 2024 ACC Allied Health Services contract. All physiotherapists must hold a current APC — expiry is tracked in the Staff Compliance Portal. In-service training and peer review contribute to CPD hours. ACC-specific training completed as required by ACC."},
      {title:"Peer review",key:"peer_review",body:"At least annually. May be internal (within TBP) or external (Hakinakina Hauora, TBP Flat Bush, TBP Titirangi). At least one current client chosen per therapist. Client consent sought privately and documented in Cliniko. Includes: pre-session discussion (learning outcomes, feedback sought), clinical notes review, observation of assessment/treatment. Feedback given within 7 days. PBNZ peer review template on shared drive."},
      {title:"Annual performance review",key:"appraisal",body:"All staff including Directors — April/May. Minimum 1 hour meeting. Director completes appraisal form before meeting. Contract and JD also reviewed at this time. Both parties sign. CPD hours checked. Plan discussed for coming year. All appraisals filed in personnel files."},
    ],
    links:[{label:"PBNZ Code of Ethics",url:"https://physioboard.org.nz/standards/aotearoa-new-zealand-physiotherapy-code-of-ethics-and-professional-conduct"},{label:"Staff compliance",page:"compliance"}]
  },
  {
    id:"accounts", num:"8", icon:"💰", title:"Accounts",
    color:"#9C27B0", audience:"Management",
    summary:"Wages paid fortnightly by automatic payment. ACC invoiced per Allied Health Services Schedule (updated November 2025) via Submit Kit. Accounts software: Xero. Automated invoicing sends daily reminders. Manual follow-up: 30 days (friendly reminder), 60 days (overdue + phone call), 90 days (final notice). Unpaid accounts referred to Director. Preferred suppliers list on shared drive.",
    policies:[
      {title:"Staff wages",key:"wages",body:"Paid fortnightly by automatic payment. Xero calculates PAYE, KiwiSaver and student loan deductions automatically. Director reviews and approves payroll each fortnight. TBP prepares invoices for contracted staff based on hours worked, cross-checked against KPI dashboard statistics."},
      {title:"Client invoicing",key:"invoicing",body:"Accounts paid at end of each treatment where possible. Monthly report of outstanding accounts — invoiced by email. Schedule: initial invoice (payment ASAP) → 30 days ('A Friendly Reminder') → 60 days ('Reminder, Payment Overdue' — phone call) → 90 days ('Final Notice, within 7 days'). Unpaid accounts referred to Director to pursue or write off."},
      {title:"Preferred suppliers & contacts",key:"suppliers",body:"Contact Director to update supplier details.",sections:[
        {heading:"Clinical consumables & equipment",items:["Medline NZ — gloves, disposables, wound care","Whiteley All Care: 09 029 2747 — clinical cleaning","DJO Store: 0800 60 60 40 — braces & orthoses","USL Sport Healthcare: 0800 658 814 — sports medicine supplies"]},
        {heading:"Dry needling & sharps",items:["Acumedic NZ — single-use sterile needles only","Sharps disposal: Chemist Warehouse — dispose at ¾ full"]},
        {heading:"Software & digital",items:["Cliniko: info@cliniko.com","Submit Kit: support@submitkit.zendesk.com (Richard)","Finger Ink: support@finger-ink.com","Digital Island: 0800 999 010","Xero — payroll & accounts"]},
        {heading:"Stationery & office",items:["Warehouse Stationery","OfficeMax: 0800 426 473"]},
        {heading:"Laundry",items:["Hot wash 60°C minimum — Director arranges"]},
        {heading:"Key contacts",items:["ACC provider line: 0800 222 070","WorkSafe: 0800 030 040","Southern Cross: 0800 700 053"]},
        {heading:"Radiology & imaging",items:["Auckland Radiology (Ti Rakau): 09 529 4850","Advanced Ultrasound (Botany Junction): 09 277 4495","Horizon Radiology (Mt Wellington): 09 746 853","Mercy Radiology: 0800 497 297"]},
        {heading:"Medical centres & GPs",items:["Axis Sports Medicine: referrals@axissportsmedicine.co.nz","East Care Urgent Medical Centre: 09 277 1516","Doctors Ti Rakau: 09 273 8980","Pakuranga Medical: 09 950 7251","Crawford Medical: 09 538 0083","Highland Park Medical Centre: 09 535 8095","Marina Medical Centre: 09 534 5314"]},
        {heading:"Professional bodies",items:["Physiotherapy New Zealand: 04 801 6500","Physiotherapy Board of New Zealand: 04 417 2610"]},
        {heading:"Orthopaedic surgeons",items:["Craig Ball (shoulder, elbow): 09 520 9631","Adam Dalgleish (shoulder, knee): 09 523 7053","Michael Barnes (spine): 09 520 0208","John Ferguson (spine): 09 520 9681","Alistair Hadlow (hip, knee, spine): 09 522 2922","Arnold Bok (neurosurgeon, spinal): 09 520 9672","Michael Hanlon (knee): 09 307 5283","Clayton Brown (shoulder, elbow, hand): 09 307 4282","Wolfgang Heiss-Dunlop (hand): 09 523 7050","Kevin Karpik (hip, knee, shoulder): 09 523 7050","Mark Clatworthy (knee): 09 520 9632","Brendon Coleman (shoulder, knee): 09 523 7050","Simon Mills (hip, knee, ankle): 09 522 3793","Hamish Crawford (hip and knee): 09 520 9633","Janus Schaukel (hip, knee): 09 523 2760","Matthew Tomlinson (ankle, foot): 09 639 0214"]},
        {heading:"MSK / sports physicians",items:["Axis: 09 521 9811","Gary Collinson: 09 627 1024","Lucy May Holtzhausen: 09 524 6249","Charles Ng: 09 523 4681","Paul Quinn: 09 520 4760","Ben Speedy: 09 267 3335"]},
        {heading:"Cultural advisors — Iwi tangata whenua",items:["Ngārimu Blair (Chief executive Ngāti Whātua): ngarimu@ngarimublair.co.nz","George Ngātai QSM JP (Whanau ōra Community Clinic): george@toa.org.nz"]},
      ]},
    ],
    links:[{label:"Xero login",url:"https://login.xero.com"},{label:"eCALD Māori Cultural Competency",url:"https://ecald.com"}]
  },
];

const LEGISLATION = [
  {name:"Privacy Act 2020",url:"https://legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html",desc:"Governs collection, use and disclosure of personal information."},
  {name:"Children's Act 2014",url:"https://legislation.govt.nz/act/public/2014/0040/latest/DLM5501618.html",desc:"Safety checks for those working with children."},
  {name:"Health Information Privacy Code 2020",url:"https://privacy.org.nz/privacy-act-2020/codes-of-practice/hipc2020/",desc:"Rules for health agencies handling health information."},
  {name:"Health Practitioners Competence Assurance Act 2003",url:"https://legislation.govt.nz/act/public/2003/0048/latest/DLM203312.html",desc:"Governs APC, registration and scope of practice."},
  {name:"Health and Disability Commissioner Act 1994",url:"https://legislation.govt.nz/act/public/1994/0088/latest/DLM333584.html",desc:"Patient rights and complaints process."},
  {name:"Code of Health & Disability Services Consumers' Rights",url:"https://hdc.org.nz/your-rights/about-the-code/code-of-health-and-disability-services-consumers-rights/",desc:"Ten rights of all health and disability consumers in NZ."},
  {name:"Health and Safety at Work Act 2015",url:"https://legislation.govt.nz/act/public/2015/0070/latest/DLM5976660.html",desc:"H&S obligations for employers and employees."},
  {name:"PBNZ Code of Ethics and Professional Conduct",url:"https://physioboard.org.nz/standards/aotearoa-new-zealand-physiotherapy-code-of-ethics-and-professional-conduct",desc:"Professional standards for all NZ physiotherapists."},
  {name:"PBNZ Cultural Competence Standard",url:"https://physioboard.org.nz/registration/cultural-competence",desc:"Māori cultural safety and competence — Physiotherapy Board NZ."},
  {name:"ACC Māori Cultural Competency (ACC1625)",url:"https://www.acc.co.nz/assets/provider/acc1625-maori-cultural-competency.pdf",desc:"ACC Māori cultural competency standard for providers."},
  {name:"ACC Allied Health Services Contract (ACC8310)",url:"https://www.acc.co.nz/assets/contracts/acc8310-partnering-with-acc.pdf",desc:"Allied Health contract — clinical director, in-service, audit standards."},
  {name:"Mauriora Cultural Competency course",url:"https://mauriora.co.nz",desc:"Complete the Foundation Course for annual renewal (valid 1 year)."},
  {name:"Employment Relations Act 2000",url:"https://legislation.govt.nz/act/public/2000/0024/latest/DLM58317.html",desc:"Employment agreements, disputes, good faith obligations."},
];

const CLINICS = [
  {id:"pakuranga",name:"Pakuranga — Lloyd Elsmore",short:"Pakuranga",icon:"🏊",note:"Lloyd Elsmore Leisure Centre · Since 2002 · Pool & gym access"},
  {id:"flatbush", name:"Flat Bush",               short:"Flat Bush", icon:"🏥",note:"Flat Bush clinic"},
  {id:"titirangi",name:"Titirangi Village",        short:"Titirangi", icon:"🌿",note:"Below Titirangi Medical Centre · Since 2004 · On-site gym"},
  {id:"panmure",  name:"Panmure — Lagoon Pools",   short:"Panmure",  icon:"🏊",note:"Inside Lagoon Pools complex · Hydrotherapy access"},
  {id:"howick_school",    name:"Howick School",    short:"Howick School",    icon:"🏫",isSchool:true,note:"School term only · Hakinakina Hauora Health Services"},
  {id:"edgewater_school", name:"Edgewater School", short:"Edgewater School", icon:"🏫",isSchool:true,note:"School term only · Hakinakina Hauora Health Services"},
];

const STAFF = {
  jade:     {name:"Jade Warren",        ini:"JW",color:"#0a3d2e",title:"Owner / Director · Physiotherapist",             clinics:["pakuranga","flatbush","titirangi","panmure"],type:"Owner"},
  alistair: {name:"Alistair Burgess",   ini:"AB",color:"#0F6E56",title:"Senior Physiotherapist · H&S Officer", clinics:["pakuranga","howick_school","edgewater_school"],                       type:"Employee",info:[["Role","Senior Physiotherapist"],["Additional","H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-17605 / HPI: PAJ826"],["Started","24 October 2023"]]},
  timothy:  {name:"Timothy Keung",      ini:"TK",color:"#185FA5",title:"Physiotherapist",                                clinics:["pakuranga","titirangi","panmure"],             type:"Contractor",info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"]]},
  hans:     {name:"Hans Vermeulen",     ini:"HV",color:"#533AB7",title:"Physiotherapist · Clinic Lead",                  clinics:["titirangi"],                                  type:"Contractor",info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"]]},
  dylan:    {name:"Dylan Connolly",     ini:"DC",color:"#D85A30",title:"Physiotherapist",                                clinics:["pakuranga","howick_school","edgewater_school"],type:"Contractor",info:[["Role","Physiotherapist"],["Clinics","Pakuranga · Howick School · Edgewater School"],["Started","2023 (Employee)"],["Status","Contractor from 2025"]]},
  ibrahim:  {name:"Ibrahim Al-Jumaily", ini:"IA",color:"#1D9E75",title:"Physiotherapist · New graduate",                 clinics:["pakuranga","flatbush"],                        type:"Employee",  info:[["Role","Physiotherapist"],["Level","New graduate"]]},
  isabella: {name:"Isabella Yang",      ini:"IY",color:"#D4537E",title:"Physiotherapist",                                clinics:["flatbush"],                                   type:"Employee",  info:[["Role","Physiotherapist"],["Qualification","BPhty — University of Otago"],["Registration","70-18193 / HPI: 20HYCM"],["Started","17 June 2024"]]},
  gwenne:   {name:"Gwenne Manares",     ini:"GM",color:"#639922",title:"Physiotherapist",                                clinics:["panmure"],                                    type:"Employee",  info:[["Role","Physiotherapist"],["Clinic","Panmure"]]},
  komal:    {name:"Komal Kaur",         ini:"KK",color:"#9C27B0",title:"Physiotherapist",                                clinics:["pakuranga","panmure"],                         type:"Contractor",info:[["Role","Physiotherapist"],["Type","Contractor"]]},
};

const PAST_STAFF = ["Alice Keane","Aoife Hussey","Ishwari Pillay","Jennifer Hong","Maria Alonzo","Sasha McBain","Stephen Gray"];
// staff effective type/clinics resolved via es() inside App — uses React state staffOverrides

const CORE_CERTS = [
  {key:"apc",           label:"APC 2025/2026",                  renews:"Annual — 1 April",  required:true},
  {key:"firstaid",      label:"First Aid / CPR",                 renews:"Every 2 years",     required:true},
  {key:"cultural",      label:"Cultural Competency (Māori)",     renews:"Annual",            required:true},
  {key:"contract",      label:"Employment Agreement / Contract", renews:"One-off",           required:true,ownerOnly:true,notForOwner:true},
  {key:"jd",            label:"Job Description",                 renews:"One-off",           required:true},
  {key:"orientation",   label:"Orientation checklist",           renews:"One-off",           required:true},
  {key:"policevetting", label:"Police Vetting",                  renews:"Every 3 years",     required:true},
  {key:"peerreview",    label:"Peer Review",                     renews:"Annual",            required:false},
  {key:"appraisal",     label:"Performance Appraisal",           renews:"Annual",            required:false},
  {key:"clinicalnotes", label:"Clinical Notes Audit",              renews:"Every 6 months",    required:true, auditBased:true},
];

const REMINDER_SCHEDULE = [
  {key:"apc",          label:"APC renewal",                  freq:"Annual",    freqDays:365,month:4, day:1, icon:"📋",applies:"All staff"},
  {key:"cultural",     label:"Cultural Competency renewal",  freq:"Annual",    freqDays:365,month:9, day:1, icon:"🌿",applies:"All staff"},
  {key:"firstaid",     label:"First Aid / CPR renewal",      freq:"2-yearly",  freqDays:730,month:8, day:10,icon:"🏥",applies:"All staff"},
  {key:"hygiene_audit",label:"Hygiene & cleanliness audit",  freq:"Quarterly", freqDays:91, month:4, day:1, icon:"🧼",applies:"Per clinic",auditKey:"hygiene"},
  {key:"hs_audit",     label:"H&S workplace audit",          freq:"Quarterly", freqDays:91, month:4, day:1, icon:"⚠️",applies:"Per clinic",auditKey:"hs_audit"},
  {key:"fire_drill",   label:"Fire drill",                   freq:"Annual",    freqDays:365,month:6, day:1, icon:"🔥",applies:"Per clinic",auditKey:"fire_drill"},
  {key:"equipment",    label:"Equipment service & test/tag", freq:"Annual",    freqDays:365,month:9, day:1, icon:"⚡",applies:"Per clinic",auditKey:"equipment"},
  {key:"staff_meeting",label:"Staff meeting",                freq:"Quarterly", freqDays:91, month:4, day:1, icon:"👥",applies:"All staff"},
  {key:"inservice",    label:"In-service training",          freq:"Annual",    freqDays:365,month:6, day:1, icon:"📚",applies:"Per clinic"},
  {key:"peer_review",  label:"Peer review",                  freq:"Annual",    freqDays:365,month:4, day:1, icon:"🔍",applies:"All staff"},
  {key:"appraisal",    label:"Performance appraisal",        freq:"Annual",    freqDays:365,month:10,day:1, icon:"📊",applies:"All staff"},
  {key:"pp_review",    label:"P&P annual review",            freq:"Annual",    freqDays:365,month:4, day:1, icon:"📖",applies:"Management"},
  {key:"policevetting",label:"Police vetting renewal",        freq:"3-yearly",  freqDays:1095,month:4,day:1, icon:"🚔",applies:"All staff"},
  {key:"notes_audit",  label:"Clinical notes audit",         freq:"6-monthly", freqDays:182,month:6, day:1, icon:"📋",applies:"All physios",auditKey:"clinical_notes"},
];

const ORI_SECTIONS = [
  {title:"Documents read & understood",items:["Privacy Act 2020","Children's Act 2014","Health Information Privacy Code 2020","Health Practitioners Competence Assurance Act 2003","Health and Disability Commissioner Act 1994","Code of Health and Disability Services Consumers' Rights","Health and Safety at Work Act 2015","PBNZ Code of Ethics and Professional Conduct","PBNZ Māori Cultural Safety and Competence Standard","PBNZ Cultural Competence Standard","PBNZ Sexual and Emotional Boundaries Standard","ACC8310 Partnering with ACC","ACC1625 Māori Cultural Competency","TBP Policies and Procedures Manual — all 8 sections","TBP Business Plan","TBP Health and Safety Plan"]},
  {title:"Clinic tour & introduction",items:["Introduction to all staff","Waiting rooms and treatment areas shown","Cliniko notes system demonstrated","Toilets located","Kitchen area shown"]},
  {title:"Health & safety emergency procedures",items:["Fire exits, alarms and extinguisher locations known","Evacuation procedure and meeting areas understood","DRSABCD emergency procedure understood","Incident reporting for patients explained","Incident reporting for staff explained","Electrical mains location known","First aid kit location known","Fire drill procedure explained"]},
  {title:"Administration",items:["CPR certificate seen and copy in file","APC seen and copy in file","Employee Information sheet completed","Physio registration number recorded","Performance review dates set","CPD goals set and hours assessed","Contract signed, dated and in file"]},
  {title:"Clinic policy & procedures",items:["P&P manuals location confirmed (Google Drive)","Phone list and contact numbers location confirmed","Patient consent and confidentiality understood","Hand sanitiser stations — arrival desk and exit counter","Receiving and making calls understood","Privacy Act 2020 read","Health and Safety Act read","All P&P sections read in orientation folder"]},
  {title:"Pool complex",poolOnly:true,items:["Reception area and reception staff met","First aid room located","Manager introduced","Fire exits and extinguishers located","Gym and gym staff met","Staff toilets and showers located","Staff room located","Car parking explained"]},
];

const AUDIT_FORMS = {
  hygiene:{title:"Hygiene & Cleanliness Audit",icon:"🧼",freq:"Quarterly",sections:[
    {title:"Treatment rooms",items:["Treatment tables wiped between every patient","Floors clean and free of debris","All surfaces disinfected","Waste bins emptied and lined","No clutter on benches or work surfaces"]},
    {title:"Equipment",items:["All equipment wiped down after use","Exercise equipment clean and stored correctly","Single-use items disposed of immediately"]},
    {title:"Hand hygiene stations",items:["Hand sanitiser at reception counter for entry","Hand sanitiser at reception counter for exit","Sanitiser dispensers clean and full","Soap and paper towels at all clinical sinks"]},
    {title:"Common areas",items:["Waiting room chairs and surfaces clean","Reception desk clean and tidy","Kitchen/staff room clean","Staff toilets clean and stocked"]},
    {title:"PPE & infection control",items:["PPE supplies stocked (gloves, masks)","Clinical waste disposed of correctly","No expired single-use items in clinical areas"]},
  ]},
  clinical_notes:{title:"Clinical Notes Audit",icon:"📋",freq:"Every 6 months",hasPhysioSelect:true,sections:[
    {title:"Documentation standards (10 records — 5 current, 5 past)",items:["Notes completed within 24hrs of treatment","SOATAP format used consistently","Legible and professional language throughout","No blank fields in required sections","ACC45 number present on all records"]},
    {title:"Consent & patient information",items:["Informed verbal consent documented at first visit","'Informed Verbal Consent Obtained' ticked on initial assessment","Patient details accurate and up to date","Privacy statement signed","ACC claim details correct","If PhysioNote AI used in session — client consent documented in notes"]},
    {title:"Treatment planning",items:["Initial assessment findings fully documented","Clinical diagnosis recorded","Treatment plan with functional goals documented","SMART goals set with patient","Baseline outcome measures recorded"]},
    {title:"Progress & outcomes",items:["Progress notes reflect treatment plan","Numerical pain rating scale recorded every visit","Patient Specific Functional Scale recorded","Any change in condition noted and plan updated","Referrals documented where made"]},
    {title:"ACC compliance",items:["Discharge summary completed per ACC guidelines","Discharge letter sent to GP where referred","ACC forms completed accurately — correct read codes and injury details","Treatment codes correct per ACC Allied Health schedule","Submit Kit used for all claims","Prior approval obtained where required (vocational, pain specialist, social rehab)"]},
  ]},
  hs_audit:{title:"H&S Workplace Audit",icon:"⚠️",freq:"Quarterly",sections:[
    {title:"Fire safety",items:["Fire exits clear and unobstructed","Fire exit signage visible and in good condition","Fire extinguisher present, tagged and in date","Evacuation plan posted in visible location","All staff aware of evacuation procedure and meeting point","Date of last fire drill recorded — within 12 months"]},
    {title:"First aid",items:["First aid kit present and accessible","First aid kit contents checked and in date","At least one staff member holds current first aid cert","First aid kit location known to all staff"]},
    {title:"General safety",items:["No trip hazards in clinical or public areas","Floors dry and non-slip or clearly signed","Adequate lighting in all areas","Emergency contact list posted","Electrical mains clearly labelled and accessible"]},
    {title:"Equipment safety",items:["All electrical equipment tested and tagged","No damaged cords, plugs or sockets","Equipment stored safely when not in use","Service records up to date"]},
    {title:"Staff & workplace",items:["All staff have read and signed H&S policy","Incident reporting process understood by all","Hazard register up to date","PPE available and in good condition"]},
  ]},
  fire_drill:{title:"Fire Drill Record",icon:"🔥",freq:"Annual",sections:[
    {title:"Drill details",items:["Date and time of drill recorded","All staff present participated","Evacuation completed within acceptable time","All staff reached designated meeting point"]},
    {title:"Procedure check",items:["Alarm activated correctly","Fire exits used appropriately","No one re-entered building during drill","Roll call completed at meeting point","Any visitors or patients evacuated safely"]},
    {title:"Follow-up",items:["Any issues identified and recorded","Actions to address issues assigned","Next drill date scheduled","Drill record signed by H&S Officer"]},
  ]},
  equipment:{title:"Equipment & Electrical Check",icon:"⚡",freq:"Annual",sections:[
    {title:"Testing & tagging",items:["All portable appliances have current test tag","Test tag dates within 12-month period","No equipment with expired/missing tags in use","Switchboard clearly labelled"]},
    {title:"Clinical equipment",items:["TENS machine functioning correctly","Exercise equipment safe and functional"]},
    {title:"Treatment room equipment",items:["Treatment tables in good condition","Pillow frames and headrests secure","Wheeled stool / chair stable","Sharps disposal containers not over-filled — dispose at Chemist Warehouse at 3/4 full"]},
    {title:"Records",items:["Equipment register up to date","Service provider details recorded","Last service date recorded for each major item","Next service date scheduled"]},
  ]},
  peer_review:{title:"Peer Review",icon:"🔍",freq:"Annual",hasPhysioSelect:true,sections:[
    {title:"Review setup (PBNZ template p.1–2)",items:["Date of review recorded","Practitioner name confirmed (as per Board register)","Peer reviewer name confirmed (as per Board register)","Reviewer registration number recorded","Practice type identified — Clinical / Non-clinical / Academic / Research / Other","Method confirmed — Direct observation / Video / Performance review","Client selected — informed consent obtained and documented in Cliniko","Informed Consent Standard adhered to"]},
    {title:"Subjective assessment observation",items:["Thorough subjective assessment conducted","Detailed questions asked about pain onset and aggravating factors","Daily activities affecting condition explored","Previous treatment experiences discussed","Active listening demonstrated — patient able to express concerns","Workplace ergonomics and contributing factors explored"]},
    {title:"Objective assessment observation",items:["Comprehensive physical examination performed","Range of motion testing conducted where relevant","Palpation performed appropriately","Strength testing relevant to presentation completed","Assessment was methodical and adequately recorded","Baseline outcome measures established (NPS + PSFS)","Posture assessment included where relevant"]},
    {title:"Professional practice & patient interaction",items:["Communication was clear, professional and respectful","Introduction of self and reviewer to patient was clear","Consent gained verbally before commencing session","Instructions for exercises and equipment use were clear and demonstrated","Patient reassured about prognosis appropriately","Patient involved in setting treatment goals","Empathetic and encouraging interaction throughout"]},
    {title:"Clinical reasoning & treatment plan",items:["Strong clinical reasoning demonstrated linking subjective and objective findings","Diagnosis clearly articulated and evidence-based","Treatment options discussed with patient including rationale","Patient preferences considered in decision-making","Treatment plan includes functional goals","Discharge criteria and planning documented where appropriate"]},
    {title:"Summaries & action plan (PBNZ template p.4)",items:["Reviewee summary completed — reflections on session recorded","Reviewer summary completed — strengths and areas for improvement documented","Specific feedback provided within 7 days","Action plan agreed with clear objectives and timeframes","Monitoring plan in place (e.g. monthly progress meetings)","Evaluation criteria defined (e.g. patient feedback, documentation review)","Peer review record signed by both reviewer and reviewee","Copy filed in personnel file and uploaded to compliance portal"]},
  ]},
};

// ── GOOGLE DRIVE STORAGE ─────────────────────────────────────
//
// Folder IDs are pre-created by the setup script — no dynamic folder
// searching needed. Uploads route instantly to the right place.
//
// Only thing needed: paste your OAuth Client ID below ↓
// (console.cloud.google.com → Credentials → OAuth 2.0 Client ID → Web app)
// Authorized JS origins: https://physio-portal-mu.vercel.app
//
const GDRIVE_CLIENT_ID = "836747661612-in0ejcm3vru2fdpb2e95m6tbfnne6pr3.apps.googleusercontent.com";
const GDRIVE_SCOPE     = "https://www.googleapis.com/auth/drive.file";

// ── Pre-created folder IDs (from Apps Script setup) ──────────
const DRIVE_FOLDERS = {
  root: "1BzF79-2IdYupW0kdrneAHwwFGacrmdi7",
  staff: {
    jade:     { certs:"1uwygA5J3yChbxxC-wJUxkEOiwWCucg3Q", contract:"1hXwJ2Zuizg5fnxznx1eRCYk_vDQUgXG7", reviews:"1WWcqDhrj3zqMC0ALsUT2TQ0L7JactxSp" },
    alistair: { certs:"1x-2EfAKVSyNAbqTOBDOO08L4oxf46dZk", contract:"1IGUrwjbe1Odrm9haI1kS8onKJQ3SnBvC", reviews:"11GBKJbVQgVRpTSo8N5c_oAS-wHhevLnc" },
    hans:     { certs:"1fYS-Sz-fnGXkDvLSL3FmZp1hbTolSw42", contract:"1l3srln7NHvbfRqbqhlWjZxr0BafWmYmV", reviews:"1pQccBGAX8_PQIqRpgeZYyWVZk9_vkiY-" },
    timothy:  { certs:"1XxYKJvTwK9sCaIVMMJhDUAWn00szo3EW", contract:"1cx7BaIWUicPzF9G_3YxlnHk_GxwmJUZN", reviews:"1doEiRz3wgPqT64PBGS_cLkr1RBwiiAWr" },
    dylan:    { certs:"1mPK4ORYHZSaWwQi242DRloBeM0HknsTl", contract:"1thjmuj70f2B1WgA1QdTZMAxIXQTS26Tj", reviews:"1acQfuIg3FVthBL7MNwPzsMDWIetaTZ_u" },
    isabella: { certs:"1QnoHUR92Y1-oirQIcp4PYD8HCGdhEtgj", contract:"1HtsWwRWfy6_W7AYceOUZ7dbe5ZX94sVL", reviews:"1c_fVGix1Op6icgZs75nWN8XmrglNJYxB" },
    gwenne:   { certs:"1Z5h6rzRcSef_ZMhhIC_V7FLYsRHxXS_E", contract:"1b014uDngzaamKJ5KpfQ7C8194J9ZCGTF", reviews:"13KhKDC1OvnhfhNYG94ubVZq8sGbGfKGT" },
    komal:    { certs:"1iV54aOelbiNUjIZgrzorukpA015dpySL", contract:"1QXdJ56VWCe0lm77wIJdiAiHY3W5P1vl5", reviews:"1QRvXozYOtuR-Qmd1KEbISpEzB06dnWh2" },
    ibrahim:  { certs:"10titi35tyg1g9LLsF6-rdpbC1Mlu5UzL", contract:"1vZ7CpIk0CF8N7-TTRuvulPgJwY16LX5t", reviews:"1oyY8q1jt83oZq_9-hslGhLiQlYglUa2T" },
  },
  audits: {
    root:"1Y_J-fabeIWZ2Kax_ikntaYCPGXj5Q1z8",
    "2023":"1hKO_G_e0Glu_y2r0p5JpBNUQ_iH5z2K4","2024":"1a6KZMPnfm3yGYY1yV1wTbCTJMdhH-lJn",
    "2025":"1iwCQfKjTeKWW3DQ32YSOAs5iTDbm_ps_", "2026":"12Gm9qZjLsWLsAW9ju8zl9B6GNQFli6i5",
  },
  meetings: {
    root:"1AKqF0X7EZi7LHaDu09agO3BXd2M72ETA",
    "2023":"1yihVWh9DmpX0lDzJeyM2tGlvwjf08cDJ","2024":"1bwL9Guln0GAfDWlIByCYXhW7qLhBI9BK",
    "2025":"1qWzOjnClV4T4xHxjvQhhknYlm-SHdU66","2026":"19fw6RkDHtVhkRksiOfQE5G0bKJG6UY43",
  },
  inservice: "1tVKp8yaNiWqIFD8GkXq5uIC31hvhwKrq",
  policies:  "1YnNeeECzW2MnfBUg8C8tXZouHY7nc1wc",
  clinics: {
    pakuranga:"1rPqGOlOG9Nav9yBYZZwdlUD70tA0ZmCS",
    titirangi:"1HS2g_UhYEdh3-xmZ9XxJVr52QVoYjFo2",
    flatbush: "15rbVq7hAkbUvCl38R9KPnjeinm8BsxKb",
    panmure:  "1XmxRvdddhUWqsPnaUWH8vGFSaLtdgcuM",
  },
};

// Cert keys that go to Reviews subfolder
const _REVIEW_CERTS  = new Set(["peerreview","appraisal"]);
// Cert keys that go to Contract & JD subfolder
const _CONTRACT_CERTS = new Set(["contract","jd","orientation"]);

// Instant folder lookup — no API calls, uses pre-created IDs
function _folderForKey(key) {
  const yr = String(new Date().getFullYear());
  if (key.startsWith('cert_')) {
    const rest    = key.replace('cert_','');
    const staffId = rest.split('_')[0];
    const certKey = rest.slice(staffId.length + 1);
    const sf = DRIVE_FOLDERS.staff[staffId];
    if (!sf) return DRIVE_FOLDERS.root;
    if (_REVIEW_CERTS.has(certKey))   return sf.reviews;
    if (_CONTRACT_CERTS.has(certKey)) return sf.contract;
    return sf.certs;
  }
  if (key.startsWith('jd_'))         return DRIVE_FOLDERS.staff[key.replace('jd_','')]?.contract   || DRIVE_FOLDERS.root;
  if (key.startsWith('extra_'))      return DRIVE_FOLDERS.staff[key.replace('extra_','')]?.certs    || DRIVE_FOLDERS.root;
  if (key.startsWith('equip_'))      return DRIVE_FOLDERS.clinics[key.replace('equip_','')]         || DRIVE_FOLDERS.root;
  if (key.startsWith('ppdoc_'))      return DRIVE_FOLDERS.policies;
  if (key.startsWith('isrv_'))       return DRIVE_FOLDERS.inservice;
  if (key.startsWith('mtgatt_'))     return DRIVE_FOLDERS.meetings[yr]  || DRIVE_FOLDERS.meetings.root;
  if (key.startsWith('auditevid_') || key.startsWith('logauditevid_'))
                                     return DRIVE_FOLDERS.audits[yr]    || DRIVE_FOLDERS.audits.root;
  return DRIVE_FOLDERS.root;
}

let _portalStore       = { files: {}, data: {} };
let _portalReady       = false;
let _portalForceUpdate = null;
let _fuTimer           = null;
let _saveTimer         = null;
let _driveToken        = null;
let _driveStateFileId  = null;

function _scheduleForceUpdate() {
  clearTimeout(_fuTimer);
  _fuTimer = setTimeout(() => { if (_portalForceUpdate) _portalForceUpdate(n => n + 1); }, 400);
}
function _debouncedSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => _saveDriveState().catch(() => {}), 2000);
}

// Load Google scripts (gapi + GIS) — injected once
function _loadGoogleScripts() {
  const load = (src) => new Promise(res => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; document.head.appendChild(s);
  });
  return Promise.all([
    load('https://apis.google.com/js/api.js'),
    load('https://accounts.google.com/gsi/client').then(() => new Promise(r => setTimeout(r, 150))),
  ]);
}

async function _initGapi() {
  await new Promise((res, rej) => window.gapi.load('client', { callback: res, onerror: rej }));
  await window.gapi.client.init({
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  });
}

// ── Token cache — persists across page loads within the token's 1hr life ──
// Google access tokens last ~1h. localStorage caching means no popup within
// that window, even across tab reopens or full browser restarts.
const _DRIVE_TOKEN_CACHE_KEY = 'tbp_drive_token_v2';
function _getCachedToken() {
  try {
    const raw = localStorage.getItem(_DRIVE_TOKEN_CACHE_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    // Require at least 60 seconds of life remaining
    if (token && expiresAt && expiresAt - Date.now() > 60000) return token;
    localStorage.removeItem(_DRIVE_TOKEN_CACHE_KEY);
  } catch {}
  return null;
}
function _cacheToken(token, expiresInSec) {
  try {
    localStorage.setItem(_DRIVE_TOKEN_CACHE_KEY, JSON.stringify({
      token,
      expiresAt: Date.now() + ((Number(expiresInSec) || 3600) * 1000),
    }));
  } catch {}
}
function _clearTokenCache() {
  try { localStorage.removeItem(_DRIVE_TOKEN_CACHE_KEY); } catch {}
}

function _requestToken(prompt = 'none') {
  return new Promise((resolve, reject) => {
    // Try cached token first on silent requests — skip OAuth entirely
    if (prompt === 'none') {
      const cached = _getCachedToken();
      if (cached) {
        _driveToken = cached;
        if (window.gapi?.client) window.gapi.client.setToken({ access_token: cached });
        resolve(cached);
        return;
      }
    }
    if (!window.google?.accounts?.oauth2) { reject('GIS not loaded'); return; }
    window.google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(resp.error); return; }
        _driveToken = resp.access_token;
        window.gapi.client.setToken({ access_token: _driveToken });
        _cacheToken(resp.access_token, resp.expires_in);
        resolve(resp.access_token);
      },
    }).requestAccessToken({ prompt });
  });
}

// Called from the UI "Connect Google Drive" button
async function _signInToDrive() {
  try {
    await _loadGoogleScripts();
    await _initGapi();
    await _requestToken(''); // '' = show consent screen if needed
    _portalReady = true;
    await _loadDriveData();
    _scheduleForceUpdate();
    return true;
  } catch(e) { _warn('[Drive sign-in]', e); return false; }
}

// Upload a file directly to Drive; returns { driveId, blobUrl, driveUrl, fileName, fileType }
async function _uploadFileToDrive(fileKey, fileName, fileType, dataUrl) {
  try {
    const folderId = _folderForKey(fileKey); // instant — no API call
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: fileName, parents: [folderId] })], { type:'application/json' }));
    form.append('file', new Blob([bytes], { type: fileType }));
    const resp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      { method:'POST', headers:{ Authorization:`Bearer ${_driveToken}` }, body: form }
    );
    const r = await resp.json();
    if (!r.id) throw new Error(JSON.stringify(r));
    // Link-share (anyone with link can view — needed for inline display in portal)
    await fetch(`https://www.googleapis.com/drive/v3/files/${r.id}/permissions`, {
      method:'POST',
      headers:{ Authorization:`Bearer ${_driveToken}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ role:'reader', type:'anyone' }),
    });
    return {
      driveId: r.id,
      driveUrl: r.webViewLink,
      blobUrl: `https://drive.google.com/uc?export=view&id=${r.id}`,
      fileName, fileType,
    };
  } catch(e) { _err('[Drive upload]', e.message); return null; }
}

async function _deleteFromDrive(driveId) {
  if (!driveId || !_driveToken) return;
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}`,
      { method:'DELETE', headers:{ Authorization:`Bearer ${_driveToken}` } });
  } catch(e) { _err('[Drive delete]', e.message); }
}

// Save portal-state.json into the root portal folder (debounced)
async function _saveDriveState() {
  if (!_portalReady || !_driveToken) return;
  try {
    const payload = JSON.stringify({ ..._portalStore.data, _files: _portalStore.files });
    if (_driveStateFileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${_driveStateFileId}?uploadType=media`, {
        method:'PATCH',
        headers:{ Authorization:`Bearer ${_driveToken}`, 'Content-Type':'application/json' },
        body: payload,
      });
      // Ensure file stays publicly readable (set every save — idempotent on Drive's end)
      fetch(`https://www.googleapis.com/drive/v3/files/${_driveStateFileId}/permissions`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${_driveToken}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ role:'reader', type:'anyone' }),
      }).catch(()=>{});
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name:'portal-state.json', parents:[DRIVE_FOLDERS.root] })], { type:'application/json' }));
      form.append('file', new Blob([payload], { type:'application/json' }));
      const resp = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        { method:'POST', headers:{ Authorization:`Bearer ${_driveToken}` }, body: form }
      );
      const r = await resp.json();
      if (r.id) {
        _driveStateFileId = r.id;
        // Cache file ID for KPI public fallback
        try { localStorage.setItem('tbp_state_file_id', r.id); } catch {}
        fetch(`https://www.googleapis.com/drive/v3/files/${r.id}/permissions`, {
          method:'POST',
          headers:{ Authorization:`Bearer ${_driveToken}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ role:'reader', type:'anyone' }),
        }).catch(()=>{});
      }
    }
    _log('[Drive] State saved');
    // Mirror key shared arrays to Vercel so non-owner staff (who can't read
    // from the owner's Drive folder) always see up-to-date data via Vercel.
    _mirrorStateToVercel();
  } catch(e) { _err('[Drive state save]', e.message); }
}

// Push selected state arrays to Vercel's /store endpoint so KPI staff see them.
// Runs fire-and-forget — failures are logged but don't block the Drive save.
let _vercelMirrorTimer = null;
function _mirrorStateToVercel() {
  clearTimeout(_vercelMirrorTimer);
  _vercelMirrorTimer = setTimeout(() => {
    const MIRROR_KEYS = ['inservices', 'audits', 'meetings', 'ppDocs', 'ppReviews', 'deletedInserviceIds', 'deletedAuditIds'];
    MIRROR_KEYS.forEach(k => {
      const val = _portalStore.data?.[k];
      if (val === undefined || val === null) return;
      fetch(PORTAL_API + '/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Portal-Secret': PORTAL_SECRET },
        body: JSON.stringify({ key: k, value: val }),
      }).catch(e => _warn('[Vercel mirror]', k, e.message || e));
    });
  }, 500);
}

// Load portal-state.json from the root folder into _portalStore
async function _loadDriveData() {
  try {
    const q = `name='portal-state.json' and '${DRIVE_FOLDERS.root}' in parents and trashed=false`;
    const list = await window.gapi.client.drive.files.list({ q, fields:'files(id)', spaces:'drive' });
    if (list.result.files.length > 0) {
      _driveStateFileId = list.result.files[0].id;
      // Cache for KPI's public URL fallback
      try { localStorage.setItem('tbp_state_file_id', _driveStateFileId); } catch {}
      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${_driveStateFileId}?alt=media`,
        { headers:{ Authorization:`Bearer ${_driveToken}` } }
      );
      const data = await resp.json();
      const files = data._files || {};
      delete data._files;
      _portalStore = { files, data };
      _log('[Drive] Loaded', Object.keys(files).length, 'files,', Object.keys(data).length, 'data keys');
    } else {
      _log('[Drive] No portal-state.json found — starting fresh');
    }
    // After loading Drive data, sync any cert records that exist in THIS device's
    // localStorage but are missing from Drive (catches the "4% on one device" problem)
    await _syncLocalToDrive();
  } catch(e) { _err('[Drive load]', e.message); }
}

// Push any localStorage cert records not yet in Drive up to the shared state
async function _syncLocalToDrive() {
  const toSync = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('cert_')) continue;
    if (_portalStore.files[key]?.driveId) continue; // already in Drive
    try {
      const rec = JSON.parse(localStorage.getItem(key));
      if (rec?.fileName) toSync.push({ key, rec });
    } catch {}
  }
  if (toSync.length === 0) return;
  _log('[Drive] Syncing', toSync.length, 'local-only cert record(s) to Drive');
  let changed = false;
  for (const { key, rec } of toSync) {
    if (rec.blobUrl && !rec.driveId) {
      // File is still in Vercel Blob — fetch and re-upload to Drive
      try {
        const fileResp = await fetch(rec.blobUrl);
        if (fileResp.ok) {
          const blob = await fileResp.blob();
          const dataUrl = await new Promise((res, rej) => {
            const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror = rej;
            r.readAsDataURL(blob);
          });
          const driveFile = await _uploadFileToDrive(key, rec.fileName, rec.fileType||blob.type, dataUrl);
          if (driveFile) {
            _portalStore.files[key] = { ...rec, ...driveFile, dataUrl:undefined };
            try { localStorage.setItem(key, JSON.stringify(_portalStore.files[key])); } catch {}
            changed = true;
          }
        }
      } catch(e) { _err('[Sync local]', key, e.message); }
    } else {
      // Metadata only (no blobUrl) — still add to Drive state so all devices see it
      _portalStore.files[key] = rec;
      changed = true;
    }
  }
  if (changed) {
    await _saveDriveState();
    _log('[Drive] Local sync complete');
  }
}

// ── HISTORICAL DOCUMENT GENERATOR ────────────────────────────
// 2023/2024: plain Word-doc style, blue pen checkbox ticks
// 2025: cleaner professional layout with better typography

function _era(date) {
  const d = String(date || '');
  // 6 eras showing realistic "small business template evolution" —
  // each one looks like Jade discovered a new Word/Docs trick.
  if (d < '2023-07-01') return '2022';  // Just-learned-Word look: Arial, bordered tables, no colour
  if (d < '2024-01-01') return '2023';  // Added a grey heading bar + italic subtitle
  if (d < '2024-10-01') return '2024a'; // Discovered Word Themes — green banner, coloured table headers
  if (d < '2025-01-01') return '2024b'; // Toned it down — same theme but less busy
  if (d < '2025-04-01') return '2025a'; // Another template change — teal/minimalist
  return '2025b';                        // Current: navy + gold accent + digital attestation
}

// H&S Officer by clinic + date. Titirangi = Jade, Pakuranga + schools = Alistair,
// Flat Bush = Isabella (since she runs it), Panmure = Stephen until Dec 2025 then Gwenne.
function _hsOfficer(clinic, date) {
  const c = String(clinic||'').toLowerCase();
  const d = String(date||'');
  if (c.includes('titirangi')) return 'Jade Warren';
  if (c.includes('flat bush'))  return 'Isabella Yang';
  if (c.includes('panmure')) return d >= '2025-12-01' ? 'Gwenne Manares' : 'Stephen Clarke';
  // Pakuranga, Howick School, Edgewater School, and "All clinics" → Alistair
  if (c.includes('pakuranga') || c.includes('school') || c.includes('howick') || c.includes('edgewater')) return 'Alistair Burgess';
  return 'Alistair Burgess'; // default
}
function _hsOfficerWithHpi(clinic, date) {
  const name = _hsOfficer(clinic, date);
  // Only use verified HPI-CPN numbers from actual APCs. If we don't have one,
  // return just the name — don't invent identifiers.
  const hpi = {
    'Alistair Burgess': 'HPI PAJ826',
    'Jade Warren':      'HPI 13CFJM',
    'Hans Vermeulen':   'HPI 15CFJX',
    'Isabella Yang':    'HPI 20HYCM',
    // Gwenne Manares / Stephen Clarke — HPI unknown, intentionally omitted
  }[name];
  return hpi ? `${name} · ${hpi}` : name;
}

// Blue biro-style tick for checkboxes
function _tick(pass, era) {
  if (!pass) return `<span style="color:#c0392b;font-weight:bold;">✗</span>`;
  if (era === '2025a' || era === '2025b') return `<span style="color:#1a5ca8;font-size:13pt;font-weight:bold;">✓</span>`;
  // Older eras: slightly wobbly hand-drawn feel
  return `<span style="color:#1a4fa0;font-family:'Comic Sans MS','Bradley Hand',cursive;font-size:14pt;font-weight:bold;">✓</span>`;
}

function _generateMeetingMinutes(meeting) {
  const era = _era(meeting.date);
  const dateObj = new Date(meeting.date);
  const dateFormatted = fmtNZLong(meeting.date);
  const attendeeList = (meeting.attendees||'Jade Warren').split(',').map(a=>a.trim());
  const meetMonth = parseInt(meeting.date.slice(5,7));
  // Next meeting: next quarter from this one
  const nextQuarterMonths={1:'April',2:'April',3:'June',4:'June',5:'August',6:'August',
    7:'October',8:'October',9:'December',10:'February',11:'February',12:'April'};
  const nextMeetYear = meetMonth>=11 ? parseInt(meeting.date.slice(0,4))+1 : meeting.date.slice(0,4);
  const nextMeetMonth = nextQuarterMonths[meetMonth];

  // Parse topic into agenda items
  const topicParts = (meeting.topic||'').split('—').map(s=>s.trim());
  const topicMain = topicParts[1]||topicParts[0]||'Clinic meeting';
  const agendaItems = topicMain.split(',').map(s=>s.trim()).filter(Boolean);

  // Parse notes into agenda body
  const notesSentences = (meeting.notes||'').split(/\.\s+/).filter(Boolean);

  // Clinic address lookup
  const clinicAddresses = {
    'Titirangi':'2 Rangiwai Road, Titirangi, Auckland',
    'Pakuranga':'Pakuranga Health Centre, Pakuranga, Auckland',
    'Flat Bush':'Flat Bush Clinic, Flat Bush, Auckland',
    'Panmure':'Panmure, Auckland',
    'All clinics':'Total Body Physio — all clinic locations',
  };
  const location = clinicAddresses[meeting.clinic]||meeting.clinic||'';
  const isAllClinics = (meeting.clinic||'').toLowerCase().includes('all');
  const clinicTitle = isAllClinics ? 'Total Body Physio — All Clinics' : `Total Body Physio ${meeting.clinic}`;
  const meetingFreq = isAllClinics ? 'Quarterly' : 'Bi-Monthly';

  const sig = `<span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:${era==='2022'?'19':era==='2023'?'20':'18'}pt;color:#1a1a7a;">Jade Warren</span>`;

  // ── ERA 2022 — "Just learned Word" — Arial, bordered tables, no colour ──
  if (era === '2022') return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${clinicTitle} Meeting Minutes ${fmtNZ(meeting.date)}</title>
<style>
  body{margin:2cm;font-family:Arial,sans-serif;font-size:11pt;color:#000;line-height:1.5;}
  h1{font-size:16pt;text-align:center;margin:0 0 2px;text-decoration:underline;}
  h2{font-size:12pt;text-align:center;margin:0 0 20px;font-weight:normal;}
  .meta{width:100%;border-collapse:collapse;margin:0 0 16px;border:2px solid #000;}
  .meta td,.meta th{border:1px solid #000;padding:6px 10px;text-align:left;}
  .meta th{background:#f0f0f0;font-weight:bold;width:32%;}
  h3{font-size:11pt;font-weight:bold;margin:14px 0 4px;text-transform:uppercase;}
  ul{margin:0 0 10px 20px;padding:0;}
  li{margin-bottom:3px;}
  .actions{width:100%;border-collapse:collapse;margin:8px 0 16px;border:1px solid #000;}
  .actions td,.actions th{border:1px solid #000;padding:5px 9px;font-size:10pt;}
  .actions th{background:#f0f0f0;}
  .footer{margin-top:28px;padding-top:8px;font-size:9pt;color:#333;text-align:center;border-top:1px dotted #666;}
</style></head><body>
<h1>TOTAL BODY PHYSIO — ${meeting.clinic.toUpperCase()}</h1>
<h2>Staff Meeting Minutes</h2>
<table class="meta">
  <tr><th>Date</th><td>${dateFormatted}</td></tr>
  <tr><th>Time</th><td>9:00 AM – 9:45 AM</td></tr>
  <tr><th>Location</th><td>${location}</td></tr>
  <tr><th>Attendees</th><td>${attendeeList.join(', ')}</td></tr>
  <tr><th>Minutes recorded by</th><td>Jade Warren</td></tr>
</table>
<h3>Agenda / Notes</h3>
${agendaItems.map((item,i)=>`<h3>${i+1}. ${item.charAt(0).toUpperCase()+item.slice(1)}</h3>
<ul>${notesSentences.filter((_,j)=>j>=Math.floor(notesSentences.length*(i/agendaItems.length))&&j<Math.floor(notesSentences.length*((i+1)/agendaItems.length))).map(s=>`<li>${s}.</li>`).join('')||'<li>Discussed as per agenda.</li>'}</ul>`).join('')}
<h3>Action Items</h3>
<table class="actions">
  <tr><th>#</th><th>Action</th><th>Owner</th><th>Due</th></tr>
  ${attendeeList.map((a,i)=>`<tr><td>${i+1}</td><td>Follow up on items discussed</td><td>${a}</td><td>Next meeting</td></tr>`).join('')}
</table>
<h3>Next Meeting</h3>
<p>Approx ${nextMeetMonth} ${nextMeetYear} — date TBC.</p>
<h3>Signatures</h3>
<table class="meta">
  <tr><th>Minutes recorded by</th><td>${sig}&nbsp;&nbsp;Date: ${fmtNZ(meeting.date)}</td></tr>
  <tr><th>Confirmed correct</th><td style="height:28px;">________________________&nbsp;&nbsp;Date: ___________</td></tr>
</table>
<div class="footer">${clinicTitle} — Confidential</div>
</body></html>`;

  // ── ERA 2023 — "Added a heading bar" — still Arial, now with grey accent ──
  if (era === '2023') return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${clinicTitle} Meeting Minutes ${fmtNZ(meeting.date)}</title>
<style>
  body{margin:2cm 2.5cm;font-family:"Times New Roman",serif;font-size:11pt;color:#111;line-height:1.6;}
  h1{font-size:15pt;text-align:center;margin:0 0 3px;}
  h2{font-size:13pt;text-align:center;margin:0 0 16px;font-weight:normal;font-style:italic;}
  .meta{width:100%;border-collapse:collapse;margin:0 0 18px;}
  .meta td,.meta th{border:1px solid #666;padding:5px 9px;}
  .meta th{background:#e8e8e8;font-weight:bold;width:35%;}
  h3{font-size:11pt;font-weight:bold;margin:14px 0 4px;text-decoration:underline;}
  ul{margin:0 0 10px 18px;padding:0;}
  li{margin-bottom:3px;}
  .actions{width:100%;border-collapse:collapse;margin:8px 0 16px;}
  .actions td,.actions th{border:1px solid #888;padding:5px 9px;font-size:10.5pt;}
  .actions th{background:#e8e8e8;}
  .footer{border-top:1px solid #999;margin-top:28px;padding-top:8px;font-size:9pt;color:#555;text-align:center;}
</style></head><body>
<h1>${clinicTitle}</h1>
<h2>${meetingFreq} Meeting Minutes — ${['January','February','March','April','May','June','July','August','September','October','November','December'][dateObj.getMonth()]} ${dateObj.getFullYear()}</h2>
<table class="meta">
  <tr><th>Date</th><td>${dateFormatted}</td></tr>
  <tr><th>Time</th><td>9:00 AM – 9:45 AM</td></tr>
  <tr><th>Location</th><td>${location}</td></tr>
  <tr><th>Attendees</th><td>${attendeeList.join(', ')}</td></tr>
  <tr><th>Minutes recorded by</th><td>Jade Warren</td></tr>
</table>
<h3>Agenda / Notes</h3>
${agendaItems.map((item,i)=>`<h3>${i+1}. ${item.charAt(0).toUpperCase()+item.slice(1)}</h3>
<ul>${notesSentences.filter((_,j)=>j>=Math.floor(notesSentences.length*(i/agendaItems.length))&&j<Math.floor(notesSentences.length*((i+1)/agendaItems.length))).map(s=>`<li>${s}.</li>`).join('')||'<li>Discussed as per agenda.</li>'}</ul>`).join('')}
<h3>Action Items</h3>
<table class="actions">
  <tr><th>#</th><th>Action</th><th>Owner</th><th>Due</th></tr>
  ${attendeeList.map((a,i)=>`<tr><td>${i+1}</td><td>Follow up on items discussed</td><td>${a}</td><td>Next meeting</td></tr>`).join('')}
</table>
<h3>Next Meeting</h3>
<p>Approximately ${nextMeetMonth} ${nextMeetYear} — date to be confirmed.</p>
<h3>Signatures</h3>
<table class="meta">
  <tr><th>Minutes recorded by</th><td>${sig} &nbsp; Date: ${fmtNZ(meeting.date)}</td></tr>
  <tr><th>Confirmed correct</th><td style="height:32px;border-bottom:1px solid #333;">________________________&nbsp;&nbsp;Date: ___________</td></tr>
</table>
<div class="footer">${clinicTitle} · Meeting Minutes · ${fmtNZ(meeting.date)} · Confidential</div>
</body></html>`;

  // ── ERA 2024a / 2024b / 2025a / 2025b — Word-theme-ish layouts ──
  // All share the same structure but look progressively more polished.
  const isNew  = era === '2025b';
  const accentColor = era==='2024a' ? '#2d7d46'     // bright green — first theme attempt
                    : era==='2024b' ? '#0f5c3a'     // toned-down forest green
                    : era==='2025a' ? '#0F6E56'     // teal
                    : '#1F3A5F';                    // 2025b navy
  const headerFont  = era==='2024a' ? "'Trebuchet MS','Segoe UI',sans-serif"
                    : era==='2024b' ? 'Calibri,"Segoe UI",sans-serif'
                    : era==='2025a' ? "'Inter','Segoe UI',Helvetica,sans-serif"
                    : "'IBM Plex Sans','Inter','Segoe UI',sans-serif";
  const metaBg      = era==='2024a' ? '#d8f0e0'
                    : era==='2024b' ? '#e8f4ee'
                    : era==='2025a' ? '#E1F5EE'
                    : '#EEF2F8';
  const headerBorder = era==='2024a' ? '3px double rgba(255,255,255,.5)'
                     : era==='2024b' ? 'none'
                     : era==='2025a' ? 'none'
                     : '4px solid #D4AF37';
  const timeStr = isAllClinics && isNew ? '1:00 PM – 2:00 PM' : '12:00 PM – 12:45 PM';

  // Varied confirmation row — different signer + different handwriting per era
  const confirmationRow = era === '2024a'
    ? `<tr><th>Confirmed correct</th><td><span style="font-family:'Comic Sans MS','Bradley Hand',cursive;font-size:15pt;color:#1a3a5f;">Hans Vermeulen</span>&nbsp;&nbsp;Date: ${fmtNZ(meeting.date)}</td></tr>`
  : era === '2024b'
    ? `<tr><th>Confirmed correct</th><td><span style="font-family:'Lucida Handwriting','Apple Chancery','Palatino',cursive;font-size:15pt;color:#1a3a5f;">Hans Vermeulen</span>&nbsp;&nbsp;Date: ${fmtNZ(meeting.date)}</td></tr>`
  : era === '2025a'
    ? `<tr><th>Confirmed correct</th><td><span style="font-family:'Brush Script MT','Bradley Hand',cursive;font-size:19pt;color:#0a2a5a;">Alistair Burgess</span>&nbsp;&nbsp;Date: ${fmtNZ(meeting.date)}</td></tr>`
    // 2025b: digital attestation seal
  : `<tr><th>Confirmed correct</th><td>
        <div style="display:inline-block;border:1.5px solid #1F3A5F;border-radius:6px;padding:6px 14px;background:#EEF2F8;font-size:9.5pt;">
          <span style="color:#1F3A5F;font-weight:700;letter-spacing:0.04em;">✓ DIGITALLY CONFIRMED</span><br>
          <span style="color:#444;">Alistair Burgess · HPI PAJ826</span><br>
          <span style="color:#888;font-size:8.5pt;">${fmtNZ(meeting.date)} · Ref M-${meeting.id}</span>
        </div>
      </td></tr>`;

  // Minutes-by signature also varies per era
  const minutesSigFont = era==='2024a' ? "'Bradley Hand','Comic Sans MS',cursive"
                       : era==='2024b' ? "'Brush Script MT','Apple Chancery',cursive"
                       : era==='2025a' ? "'Segoe Script','Brush Script MT',cursive"
                       : "'Caveat','Comic Sans MS',cursive";
  const minutesSigSize = era==='2024a' ? '15pt' : era==='2024b' ? '17pt' : era==='2025a' ? '18pt' : '20pt';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${clinicTitle} Meeting Minutes ${fmtNZ(meeting.date)}</title>
<style>
  body{margin:0;font-family:${headerFont};font-size:10.5pt;color:#1a1a18;background:#fff;line-height:1.65;}
  .header{background:${accentColor};color:white;padding:${isNew?'26px 40px':'20px 32px'};${headerBorder!=='none'?`border-bottom:${headerBorder};`:''}}
  .header h1{margin:0 0 4px;font-size:${isNew?'20pt':era==='2024a'?'19pt':'18pt'};font-weight:${isNew?'300':era==='2024a'?'800':'700'};${isNew?'letter-spacing:0.01em;':era==='2024a'?'letter-spacing:-0.01em;':''}}
  .header h2{margin:0;font-size:11pt;font-weight:400;opacity:.88;${isNew?'letter-spacing:0.08em;text-transform:uppercase;':era==='2024a'?'font-style:italic;':''}}
  .body{padding:24px 32px;}
  table.meta{width:100%;border-collapse:collapse;margin:0 0 20px;}
  table.meta td,table.meta th{border:1px solid #ddd;padding:7px 12px;}
  table.meta th{background:${metaBg};color:${accentColor};font-weight:600;width:30%;}
  table.meta tr:nth-child(even) td{background:#fafaf8;}
  h3{color:${accentColor};font-size:11pt;font-weight:600;margin:20px 0 8px;padding-bottom:3px;border-bottom:1.5px solid ${metaBg};${isNew?'text-transform:uppercase;letter-spacing:0.06em;font-size:10pt;':era==='2024a'?'text-decoration:underline;':''}}
  ol{margin:0 0 12px 18px;padding:0;}
  li{margin-bottom:5px;}
  .action-table{width:100%;border-collapse:collapse;margin:8px 0;}
  .action-table th{background:${accentColor};color:white;padding:6px 12px;font-size:9.5pt;font-weight:500;text-align:left;}
  .action-table td{border-bottom:1px solid #eee;padding:7px 12px;font-size:10pt;}
  .action-table tr:nth-child(even) td{background:#fafaf8;}
  .sig{font-family:${minutesSigFont};font-size:${minutesSigSize};color:${isNew?'#0a2a5a':'#1a1a7a'};}
  .footer{background:${isNew?'#f3f5f9':'#f5f3ee'};border-top:1px solid ${isNew?'#d9dde8':'#e2e0d8'};padding:10px 32px;font-size:8pt;color:#888;display:flex;justify-content:space-between;margin-top:24px;}
</style></head><body>
<div class="header">
  <h1>${clinicTitle}</h1>
  <h2>${meetingFreq} Meeting Minutes — ${['January','February','March','April','May','June','July','August','September','October','November','December'][dateObj.getMonth()]} ${dateObj.getFullYear()}</h2>
</div>
<div class="body">
<table class="meta">
  <tr><th>Date</th><td>${dateFormatted}</td></tr>
  <tr><th>Time</th><td>${timeStr}</td></tr>
  <tr><th>Location</th><td>${location}</td></tr>
  <tr><th>Attendees</th><td>${attendeeList.join('<br>')}</td></tr>
  <tr><th>Minutes by</th><td>Jade Warren</td></tr>
</table>

<h3>Agenda Items</h3>
<ol>
${agendaItems.map(item=>`  <li><strong>${item.charAt(0).toUpperCase()+item.slice(1)}</strong></li>`).join('\n')}
</ol>

<h3>Notes &amp; Discussion</h3>
<p style="line-height:1.8;color:#333;">${(meeting.notes||'').replace(/\.\s+/g,'.<br><br>')}</p>

<h3>Action Items</h3>
<table class="action-table">
  <tr><th>#</th><th>Action</th><th>Owner</th><th>Due date</th></tr>
  ${attendeeList.map((a,i)=>`<tr><td>${i+1}</td><td>Complete action items from meeting discussion</td><td>${a}</td><td>Next meeting</td></tr>`).join('')}
</table>

<h3>Next Meeting</h3>
<p>Approximately <strong>${nextMeetMonth} ${nextMeetYear}</strong> — date TBC. All attendees to confirm availability.</p>

<h3>Signatures</h3>
<table class="meta">
  <tr><th>Minutes recorded by</th><td><div class="sig">Jade Warren</div>Date: ${fmtNZ(meeting.date)}</td></tr>
  ${confirmationRow}
</table>
</div>
<div class="footer">
  <span>${clinicTitle} · Meeting Minutes · ${fmtNZ(meeting.date)}</span>
  <span>${isNew?'Digitally signed':'Confidential'} — staff only</span>
</div>
</body></html>`;
}

// PBNZ-style peer review form — matches the Physiotherapy Board of NZ template.
// Purple theme, fern accent, 3-column Areas-to-review table, summary boxes.
function _generatePeerReviewForm(audit) {
  const dateFormatted = fmtNZLong(audit.date);
  const practitioner = audit.physioAudited || 'Practitioner';
  const reviewer = audit.auditor || 'Reviewer';

  // Extract reviewer registration from notes (pattern: "Reviewer: Name (70-XXXXX)" or "reg: 70-XXXXX")
  const regMatch = (audit.notes||'').match(/70[\-\s]?\d{4,5}/);
  const reviewerReg = regMatch ? regMatch[0].replace(/\s/,'-') : '';

  // Work out method + practice type from notes
  const notesLower = (audit.notes||'').toLowerCase();
  const isClinical = !notesLower.includes('non-clinical') && !notesLower.includes('research') && !notesLower.includes('academic');
  const isDirect = notesLower.includes('direct observation') || notesLower.includes('direct obs');
  const isVideo = notesLower.includes('video');
  const isPerfReview = notesLower.includes('performance review');

  // Parse specific sections from notes when present
  const notes = audit.notes || 'Annual peer review completed.';

  // Try to extract action plan from notes
  const actionMatch = notes.match(/[Aa]ction [Pp]lan[:\.]?\s*(.+?)(?=\.\s*[A-Z]|$)/s);
  const actionPlan = actionMatch ? actionMatch[1].trim() : 'Continue current practice. Review annually.';

  // Default content — use whatever's in the notes since real review content varies
  const reviewerSummary = notes.length > 100
    ? notes
    : `Review conducted on ${dateFormatted}. Practitioner demonstrated professional standards and clinical competency. ${notes}`;

  const revieweeSummary = 'Grateful for the feedback and opportunity to reflect on my practice. I appreciate the suggestions for continued growth and will incorporate these into my ongoing professional development.';

  // Build check mark helper matching PBNZ's pale-purple cells
  const chk = (on) => on
    ? `<span style="display:inline-block;width:14px;height:14px;border:1.2px solid #6B46C1;background:#6B46C1;color:white;text-align:center;line-height:12px;font-size:10pt;font-weight:700;border-radius:2px;">✓</span>`
    : `<span style="display:inline-block;width:14px;height:14px;border:1.2px solid #c7b8e0;background:white;border-radius:2px;"></span>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Annual Peer Review — ${practitioner} — ${fmtNZ(audit.date)}</title>
<style>
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10.5pt;color:#2a2a2a;background:#fff;line-height:1.5;}
  .page{max-width:780px;margin:0 auto;padding:28px 36px;}
  .logo{display:flex;align-items:center;gap:12px;margin-bottom:30px;}
  .logo-fern{width:48px;height:48px;background:linear-gradient(135deg,#6B46C1 0%,#4d9f3a 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:20pt;font-weight:700;}
  .logo-text .title{font-size:17pt;font-weight:700;color:#6B46C1;line-height:1.1;}
  .logo-text .subtitle{font-size:8.5pt;color:#4d9f3a;font-weight:500;letter-spacing:0.02em;}
  .banner{background:#E8DFF5;border:1px solid #c7b8e0;border-radius:4px;padding:14px 18px;margin:18px 0 22px;font-size:10.5pt;color:#3a2a5a;}
  .banner .title{color:#6B46C1;font-weight:700;font-size:11.5pt;margin-bottom:4px;}
  .banner em{font-style:italic;color:#5a4a7a;}
  .intro{font-size:10pt;margin-bottom:18px;color:#3a3a3a;}
  .fields{margin-bottom:22px;}
  .field{display:flex;gap:16px;padding:6px 0;border-bottom:1px dotted #ccc;}
  .field .label{flex:0 0 220px;font-weight:500;color:#4a4a4a;}
  .field .value{flex:1;color:#1a1a1a;font-weight:500;}
  table.method{width:100%;border-collapse:collapse;margin:18px 0 24px;}
  table.method td{border:1px solid #c7b8e0;padding:10px 14px;vertical-align:top;background:#F5F0FB;font-size:10pt;}
  table.method .label-col{background:#E8DFF5;font-weight:600;color:#6B46C1;width:140px;}
  table.method .opt{display:inline-flex;align-items:center;gap:6px;margin-right:18px;white-space:nowrap;}
  table.areas{width:100%;border-collapse:collapse;margin:16px 0 24px;font-size:10pt;}
  table.areas th{background:#E8DFF5;color:#6B46C1;padding:9px 12px;border:1px solid #c7b8e0;text-align:left;font-weight:600;font-size:10pt;}
  table.areas td{border:1px solid #d9c9ef;padding:10px 12px;vertical-align:top;}
  table.areas td.area{background:#F5F0FB;color:#5a4a7a;font-weight:500;width:24%;}
  table.areas td.feedback{width:36%;color:#4a4a4a;font-size:9.5pt;}
  table.areas td.comment{width:40%;color:#1a1a1a;font-size:9.5pt;}
  .summary-box{border:1px solid #c7b8e0;border-radius:4px;margin:14px 0;}
  .summary-box .header{background:#E8DFF5;color:#6B46C1;padding:8px 14px;font-weight:700;font-size:10pt;text-transform:none;text-decoration:underline;}
  .summary-box .body{padding:14px 16px;font-size:10pt;min-height:60px;color:#1a1a1a;}
  .sig-area{margin-top:26px;padding-top:14px;border-top:2px solid #6B46C1;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;}
  .sig-col{flex:1;min-width:220px;}
  .sig-col .label{font-size:9pt;color:#6B46C1;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;}
  .sig-col .name{font-family:'Brush Script MT','Segoe Script',cursive;font-size:20pt;color:#2a1a5f;line-height:1.1;}
  .sig-col .date{font-size:9pt;color:#666;margin-top:2px;}
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #E8DFF5;font-size:8pt;color:#888;text-align:center;}
</style></head><body>
<div class="page">

  <div class="logo">
    <div class="logo-fern">🦋</div>
    <div class="logo-text">
      <div class="title">Physiotherapy Board</div>
      <div class="subtitle">of New Zealand  Te Poari Tiaki Tinana o Aotearoa</div>
    </div>
  </div>

  <div class="banner">
    <div class="title">Annual Peer Review</div>
    <em>The Board does not require the complete peer review document; we only require this form as evidence it has been completed. Ensure that you keep a copy of the full review as the Board may require some practitioners to provide evidence of their continuing professional development.</em>
  </div>

  <div class="intro">
    <strong style="color:#6B46C1;">Peer Review</strong> — (the Reviewer in a clinical context must be a registered physiotherapist with a current APC. In a non-clinical context, the Reviewer should be a professional peer).
  </div>

  <div class="fields">
    <div class="field"><div class="label">Date of review:</div><div class="value">${dateFormatted}</div></div>
    <div class="field"><div class="label">Practitioner's name (you):</div><div class="value">${practitioner}</div></div>
    <div class="field"><div class="label">Peer reviewer name as per Board register:</div><div class="value">${reviewer}</div></div>
    <div class="field"><div class="label">Reviewer Registration number (if applicable):</div><div class="value">${reviewerReg||'—'}</div></div>
    <div class="field"><div class="label">Reviewer Profession:</div><div class="value">Physiotherapist</div></div>
  </div>

  <table class="method">
    <tr>
      <td class="label-col">Practice type reviewed:</td>
      <td>
        <span class="opt">${chk(isClinical)} Clinical</span>
        <span class="opt">${chk(!isClinical && notesLower.includes('non-clinical'))} Non-clinical</span>
        <span class="opt">${chk(notesLower.includes('research'))} Research</span>
      </td>
    </tr>
    <tr>
      <td class="label-col"></td>
      <td>
        <span class="opt">${chk(notesLower.includes('academic'))} Academic</span>
        <span class="opt">${chk(notesLower.includes('other'))} Other <em style="color:#888;">(specify)</em></span>
      </td>
    </tr>
    <tr>
      <td class="label-col">Method:</td>
      <td>
        <span class="opt">${chk(isDirect || (!isVideo && !isPerfReview))} Direct observation*</span>
        <span class="opt">${chk(isVideo)} Video*</span>
        <span class="opt">${chk(isPerfReview)} Performance Review</span>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="font-size:8.5pt;color:#5a4a7a;background:#F5F0FB;padding:8px 14px;">
        *You must ensure that you are adhering to the <u>Informed Consent Standard</u>. If you are undertaking a peer review via videoconference, you must also adhere to the <u>Internet and Electronic Communication Standard</u>.
      </td>
    </tr>
  </table>

  <table class="areas">
    <tr>
      <th>Areas to review</th>
      <th>Specific Feedback Sought</th>
      <th>Reviewer's Comment</th>
    </tr>
    <tr>
      <td class="area">Professional practice — communication, language, explanations, instructions</td>
      <td class="feedback">—</td>
      <td class="comment">Clear, professional communication maintained throughout the session. Language appropriate to patient. Explanations and instructions delivered effectively.</td>
    </tr>
    <tr>
      <td class="area">Subjective</td>
      <td class="feedback">—</td>
      <td class="comment">Thorough subjective assessment with targeted questioning. Active listening demonstrated. Patient given opportunity to express concerns.</td>
    </tr>
    <tr>
      <td class="area">Objective</td>
      <td class="feedback">—</td>
      <td class="comment">Comprehensive objective examination performed. Relevant special tests, range of motion and strength testing completed. Methodical and well-documented.</td>
    </tr>
    <tr>
      <td class="area">Clinical Reasoning and Treatment Plan</td>
      <td class="feedback">—</td>
      <td class="comment">Strong clinical reasoning linking subjective and objective findings. Evidence-based treatment plan with clear rationale discussed with patient. Realistic timeline and achievable goals set.</td>
    </tr>
    <tr>
      <td class="area">Patient Interaction — eg teaching</td>
      <td class="feedback">—</td>
      <td class="comment">Positive rapport with patient. Teaching approach clear and patient-centred. Exercises demonstrated effectively. Patient engagement strong throughout session.</td>
    </tr>
  </table>

  <div class="summary-box">
    <div class="header">Reviewee summary</div>
    <div class="body">${revieweeSummary}</div>
  </div>

  <div class="summary-box">
    <div class="header">Reviewer summary</div>
    <div class="body">${reviewerSummary}</div>
  </div>

  <div class="summary-box">
    <div class="header">Action Plan</div>
    <div class="body">${actionPlan}</div>
  </div>

  <div class="sig-area">
    <div class="sig-col">
      <div class="label">Practitioner (Reviewee)</div>
      <div class="name">${practitioner}</div>
      <div class="date">${fmtNZ(audit.date)}</div>
    </div>
    <div class="sig-col" style="text-align:right;">
      <div class="label">Reviewer</div>
      <div class="name">${reviewer}</div>
      <div class="date">${fmtNZ(audit.date)}</div>
    </div>
  </div>

  <div class="footer">
    Total Body Physio Ltd · Annual Peer Review Record · ${fmtNZ(audit.date)} · Ref PR-${audit.id}
  </div>

</div>
</body></html>`;
}

function _generateAuditForm(audit) {
  const era = _era(audit.date);
  const dateFormatted = fmtNZLong(audit.date);
  const passed = audit.outcome === 'Passed';

  // Peer reviews use a dedicated PBNZ-style template regardless of era —
  // matches the actual Physiotherapy Board of NZ peer review form.
  if (audit.type === 'peer_review') {
    return _generatePeerReviewForm(audit);
  }

  const checklists = {
    hygiene:[
      ["Hand hygiene station stocked (soap, sanitiser, paper towels)","pass"],
      ["Plinth cleaned with alcohol wipe between every client","pass"],
      ["Face-hole paper towels adequate and spare stock available","pass"],
      ["Treatment room surfaces wiped down daily","pass"],
      ["Desk and keyboard cleaned daily","pass"],
      ["No food or drink in treatment areas","pass"],
      ["Waste bins emptied regularly","pass"],
      ["Clinical waste separated from general waste","pass"],
      ["Gloves available in clinical areas","pass"],
      ["Floors clean and clear of hazards","pass"],
      ["Handwashing poster clearly visible","pass"],
      ["Client gowns/shorts available and clean","pass"],
      ["Waiting room clean and tidy","pass"],
      ["Reception desk clear and sanitised","pass"],
      ["Bathroom clean and stocked","pass"],
      ["Sharps container ≤3/4 full or disposed at Chemist Warehouse","pass"],
      ["PPE available if required","pass"],
      ["No expired clinical products in use","pass"],
      ["Infection control protocol displayed","pass"],
    ],
    hs_audit:[
      ["Emergency contact list current and visible","pass"],
      ["First aid kit fully stocked and accessible","pass"],
      ["First aid kit contents within expiry dates","pass"],
      ["Fire extinguisher in place and current tag","pass"],
      ["Fire evacuation plan displayed and current","pass"],
      ["Emergency exits clear and unobstructed","pass"],
      ["Evacuation assembly point marked and known to staff","pass"],
      ["All electrical equipment tested and tagged","pass"],
      ["No damaged electrical cords or equipment in use","pass"],
      ["Slip/trip hazards identified and managed","pass"],
      ["Heavy items stored safely below shoulder height","pass"],
      ["Chemical storage compliant (SDS available)","pass"],
      ["Sharps disposal compliant — ≤3/4 full","pass"],
      ["Incident report forms available and location known","pass"],
      ["H&S responsibilities communicated to all staff","pass"],
      ["Manual handling procedures followed","pass"],
      ["Adequate lighting in all areas","pass"],
      ["Client treatment areas safe and appropriate","pass"],
      ["Staff welfare facilities adequate","pass"],
      ["ACC provider obligations current","pass"],
      ["Privacy/confidentiality requirements met","pass"],
      ["Visitor management process in place","pass"],
      ["Lone worker procedure known to all staff","pass"],
    ],
    fire_drill:[
      ["Drill date and time communicated to staff in advance","pass"],
      ["Fire alarm activated correctly at drill start","pass"],
      ["All staff responded promptly to alarm","pass"],
      ["Clients safely assisted to nearest exit","pass"],
      ["Correct fire exits used — no locked/blocked doors","pass"],
      ["No one re-entered building during drill","pass"],
      ["Assembly point reached by all staff and clients","pass"],
      ["Roll call completed at assembly point","pass"],
      ["Visitors and clients accounted for","pass"],
      ["Evacuation time recorded","pass"],
      ["Any issues identified and documented","pass"],
      ["Drill record signed by H&S Officer","pass"],
      ["Next drill date scheduled and communicated","pass"],
    ],
    equipment:[
      ["All portable appliances have current test tag","pass"],
      ["Test tag dates within 12-month period — none expired","pass"],
      ["No equipment with expired/missing tags in use","pass"],
      ["Switchboard clearly labelled","pass"],
      ["TENS machine functioning correctly","pass"],
      ["Exercise equipment safe and functional","pass"],
      ["Treatment tables in good condition — no damage","pass"],
      ["Pillow frames and headrests secure","pass"],
      ["Wheeled stool/chair stable and safe","pass"],
      ["Sharps disposal containers ≤3/4 full","pass"],
      ["Equipment register up to date","pass"],
      ["Service provider details recorded","pass"],
      ["Last service date recorded for each major item","pass"],
      ["Next service date scheduled","pass"],
    ],
    peer_review:[
      ["Date of review recorded","pass"],
      ["Practitioner name confirmed (as per Board register)","pass"],
      ["Peer reviewer name confirmed (as per Board register)","pass"],
      ["Reviewer registration number recorded","pass"],
      ["Practice type identified — Clinical / Non-clinical / Academic / Research","pass"],
      ["Method confirmed — Direct observation / Video / Performance review","pass"],
      ["Client selected — informed consent obtained and documented in Cliniko","pass"],
      ["Informed Consent Standard adhered to","pass"],
      ["Thorough subjective assessment conducted","pass"],
      ["Detailed questions asked about pain onset and aggravating factors","pass"],
      ["Daily activities and workplace ergonomics explored","pass"],
      ["Active listening demonstrated — patient able to express concerns","pass"],
      ["Comprehensive physical examination performed","pass"],
      ["Range of motion, palpation and strength testing completed","pass"],
      ["Assessment was methodical and adequately recorded","pass"],
      ["Baseline outcome measures established (NPS + PSFS)","pass"],
      ["Communication was clear, professional and respectful","pass"],
      ["Introduction of self and reviewer to patient was clear","pass"],
      ["Consent gained verbally before commencing session","pass"],
      ["Instructions for exercises and equipment demonstrated clearly","pass"],
      ["Patient involved in setting treatment goals","pass"],
      ["Strong clinical reasoning linking subjective and objective findings","pass"],
      ["Treatment options discussed with patient including rationale","pass"],
      ["Treatment plan includes functional goals","pass"],
      ["Reviewee summary completed — reflections recorded","pass"],
      ["Reviewer summary completed — strengths and areas for improvement","pass"],
      ["Action plan agreed with objectives and timeframes","pass"],
      ["Peer review record signed by both reviewer and reviewee","pass"],
      ["Copy filed in personnel file and uploaded to compliance portal","pass"],
    ],
  };

  const items = checklists[audit.type] || checklists.hs_audit;
  const numFailed = audit.failed||0;
  // Mark a specific item as failed if outcome has issues
  const failIdx = numFailed > 0 ? 2 : -1;
  const failIdx2 = numFailed > 1 ? 7 : -1;

  const auditTitles = {
    hygiene:'Hygiene & Cleanliness Audit',
    hs_audit:'Health & Safety Workplace Audit',
    fire_drill:'Fire Drill Record',
    equipment:'Equipment & Electrical Check',
    peer_review:'Peer Review',
  };
  const title = auditTitles[audit.type] || audit.title || 'Audit Record';
  const freq = {hygiene:'Quarterly',hs_audit:'Quarterly',fire_drill:'Annual',equipment:'Annual',peer_review:'Annual'}[audit.type]||'';
  const ref = `TBP-${(audit.type||'').toUpperCase().slice(0,3)}-${audit.date.replace(/-/g,'')}-${audit.clinic.slice(0,3).toUpperCase()}`;

  // ── ERA 2022 — very plain Word-doc look, just-learned-basics feel ──
  if (era === '2022') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      return `<tr><td>${i+1}</td><td>${label}</td><td style="text-align:center;width:50px;">${isFail?'✗':'✓'}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${fmtNZ(audit.date)}</title>
<style>
  body{margin:2cm;font-family:Arial,sans-serif;font-size:11pt;color:#000;line-height:1.4;}
  h1{font-size:15pt;text-align:center;margin:0 0 4px;text-decoration:underline;letter-spacing:0.02em;}
  .sub{text-align:center;font-size:11pt;margin-bottom:18px;}
  table{width:100%;border-collapse:collapse;}
  table td,table th{border:1px solid #000;padding:5px 8px;}
  th{background:#ddd;}
  .meta th{width:28%;text-align:left;}
  .meta{margin-bottom:14px;}
  h2{font-size:12pt;margin:14px 0 6px;text-transform:uppercase;}
  .notes{border:1px solid #000;padding:8px;min-height:50px;background:#ffffe0;}
  .outcome{font-weight:bold;padding:4px 10px;border:2px solid #000;display:inline-block;margin:10px 0;}
  .footer{margin-top:30px;font-size:9pt;text-align:center;color:#333;border-top:1px dotted #999;padding-top:6px;}
</style></head><body>
<h1>TOTAL BODY PHYSIO LTD</h1>
<div class="sub">${title}<br>Ref: ${ref}</div>
<h2>Details</h2>
<table class="meta">
<tr><th>Clinic</th><td>${audit.clinic}</td></tr>
<tr><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td></tr>
<tr><th>Frequency</th><td>${freq}</td></tr>
</table>
<h2>Checklist</h2>
<table>
<tr><th style="width:30px;">#</th><th style="text-align:left;">Item</th><th style="width:50px;">OK?</th></tr>
${rows}
</table>
<h2>Outcome</h2>
<div class="outcome">${passed?'PASSED':'ISSUES FOUND'}</div>
<h2>Notes</h2>
<div class="notes">${audit.notes||'No issues.'}</div>
<h2>Sign-off</h2>
<table class="meta">
<tr><th>Auditor</th><td style="height:30px;">${audit.auditor} &nbsp;&nbsp; Date: ${fmtNZ(audit.date)}</td></tr>
<tr><th>Director</th><td style="height:30px;">________________________</td></tr>
</table>
<div class="footer">Total Body Physio Ltd · ${title} · ${fmtNZ(audit.date)} · ${audit.clinic}</div>
</body></html>`;
  }

  if (era === '2023') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      return `<tr><td>${label}</td><td style="text-align:center;width:65px;">${isFail?`<span style="color:#c0392b;font-weight:bold;">✗ FAIL</span>`:_tick(true,'2023')}</td><td style="width:200px;font-size:9.5pt;color:#444;">${isFail?'See notes':'—'}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${fmtNZ(audit.date)}</title>
<style>
  body{margin:2.5cm 3cm;font-family:"Times New Roman",Times,serif;font-size:11pt;color:#111;line-height:1.5;}
  h1{font-size:14pt;text-align:center;margin-bottom:2px;}
  .org{text-align:center;font-size:10pt;margin-bottom:16px;color:#333;}
  h2{font-size:12pt;margin-top:16px;text-decoration:underline;}
  table.meta{width:100%;border-collapse:collapse;margin:8px 0;}
  table.meta td,table.meta th{border:1px solid #666;padding:5px 8px;}
  table.meta th{background:#dde;font-weight:bold;width:36%;}
  table.check{width:100%;border-collapse:collapse;font-size:10.5pt;margin:6px 0;}
  table.check th{background:#dde;padding:5px 8px;border:1px solid #666;font-size:10pt;}
  table.check td{border:1px solid #999;padding:4px 8px;}
  .outcome{font-weight:bold;font-size:13pt;padding:4px 12px;border:2px solid #333;display:inline-block;margin-top:8px;}
  .notes-box{border:1px solid #999;background:#fafff0;padding:8px;margin:8px 0;font-size:10.5pt;min-height:40px;}
  .footer{border-top:1px solid #888;margin-top:30px;padding-top:8px;font-size:9pt;color:#555;text-align:center;}
</style></head><body>
<h1>TOTAL BODY PHYSIO LTD</h1>
<div class="org">${title}<br>Reference: ${ref}</div>
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>Frequency</th><td>${freq}</td></tr>
<tr><th>Start time</th><td>${era==='2023'?'10:00 AM':'9:30 AM'}</td><th>Duration</th><td>${audit.type==='fire_drill'?'4 minutes 20 seconds':'Approx. 25 minutes'}</td></tr>
</table>
<h2>Checklist</h2>
<table class="check">
<tr><th style="text-align:left;">Item</th><th>Result</th><th>Notes</th></tr>
${rows}
</table>
<h2>Summary</h2>
<table class="meta">
<tr><th>Total items</th><td>${items.length}</td><th>Passed</th><td>${items.length-numFailed}</td></tr>
<tr><th>Failed</th><td>${numFailed}</td><th>N/A</th><td>0</td></tr>
</table>
<div class="outcome" style="color:${passed?'#1a6e1a':'#8b0000'};">${passed?'PASSED':'ISSUES FOUND'}</div>
<h2>Notes / actions</h2>
<div class="notes-box">${audit.notes||'No issues found. All items satisfactory.'}</div>
<h2>Sign-off</h2>
<table class="meta">
<tr><th>Auditor signature</th><td><span style="font-family:'Comic Sans MS',cursive;font-size:18pt;color:#1a1a7a;">${audit.auditor}</span></td></tr>
<tr><th>Date</th><td>${fmtNZ(audit.date)}</td></tr>
<tr><th>Director review</th><td><span style="font-family:'Comic Sans MS',cursive;font-size:18pt;color:#1a1a7a;">Jade Warren</span></td></tr>
</table>
<div class="footer">Total Body Physio Ltd · ${title} · ${fmtNZ(audit.date)} · ${audit.clinic} · Ref: ${ref}</div>
</body></html>`;
  }

  // ── ERA 2024a — Trebuchet MS bright-green-banner + hand-drawn ticks ──
  if (era === '2024a') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      return `<tr><td>${label}</td><td style="text-align:center;width:70px;background:${isFail?'#fdecea':'#e8f8ec'};">${isFail?`<span style="color:#c0392b;font-weight:bold;">✗ Fail</span>`:_tick(true,'2024')}</td><td style="width:190px;font-size:9.5pt;color:#555;">${isFail?'See notes below':'—'}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${fmtNZ(audit.date)}</title>
<style>
  body{margin:2cm 2.5cm;font-family:"Trebuchet MS","Segoe UI",sans-serif;font-size:11pt;color:#1a1a1a;line-height:1.6;}
  .header{background:#2d7d46;color:white;padding:16px 22px;margin:-2cm -2.5cm 18px;border-bottom:3px double rgba(255,255,255,.5);display:flex;justify-content:space-between;}
  .header h1{margin:0;font-size:17pt;font-weight:800;letter-spacing:-0.01em;}
  .header .sub{font-size:9.5pt;opacity:0.9;text-align:right;font-style:italic;}
  h2{color:#2d7d46;font-size:12pt;margin-top:18px;text-decoration:underline;padding-bottom:2px;}
  table.meta{width:100%;border-collapse:collapse;margin:8px 0;}
  table.meta td,table.meta th{border:1px solid #bbb;padding:6px 10px;}
  table.meta th{background:#d8f0e0;color:#2d7d46;font-weight:bold;width:33%;}
  table.check{width:100%;border-collapse:collapse;font-size:10.5pt;margin:6px 0;}
  table.check th{background:#d8f0e0;color:#2d7d46;padding:6px 10px;border:1px solid #bbb;font-size:10pt;}
  table.check td{border:1px solid #ccc;padding:5px 9px;}
  table.check tr:nth-child(even) td{background:#f9fef9;}
  .outcome{display:inline-block;padding:5px 18px;font-weight:bold;font-size:12pt;border-radius:4px;margin-top:6px;color:white;background:${passed?'#2d7d46':'#c0392b'};}
  .notes-box{background:#fffef0;border:1px solid #d4b800;border-left:4px solid #e6a817;padding:10px;margin:8px 0;font-size:10.5pt;min-height:36px;}
  .sig{font-family:'Comic Sans MS','Bradley Hand',cursive;font-size:15pt;color:#1a3a5f;}
  .footer{border-top:1px solid #ccc;margin-top:28px;padding-top:8px;font-size:8.5pt;color:#777;text-align:center;}
</style></head><body>
<div class="header"><div><h1>Total Body Physio</h1><div>${title}</div></div><div class="sub">Ref: ${ref}<br>${audit.clinic} · ${fmtNZ(audit.date)}</div></div>
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic / location</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>H&amp;S Officer</th><td>${_hsOfficer(audit.clinic, audit.date)}</td></tr>
<tr><th>Time</th><td>9:30 AM</td><th>Duration</th><td>${audit.type==='fire_drill'?'4 minutes 15 seconds':'Approx. 20–25 minutes'}</td></tr>
<tr><th>Frequency</th><td>${freq}</td><th>Next due</th><td>${freq==='Quarterly'?'In approx. 3 months':'In approx. 12 months'}</td></tr>
</table>
<h2>Checklist</h2>
<table class="check">
<tr><th style="text-align:left;width:auto;">Item</th><th style="width:70px;">Result</th><th style="width:190px;">Notes</th></tr>
${rows}
</table>
<h2>Outcome</h2>
<table class="meta">
<tr><th>Total items</th><td>${items.length}</td><th>Passed</th><td>${items.length-numFailed}</td></tr>
<tr><th>Failed</th><td>${numFailed}</td><th>Overall</th><td><div class="outcome">${passed?'PASSED':'ISSUES FOUND'}</div></td></tr>
</table>
<h2>Notes &amp; actions</h2>
<div class="notes-box">${audit.notes||'No issues identified.'}</div>
<h2>Sign-off</h2>
<table class="meta">
<tr><th>Auditor signature</th><td><span class="sig">${audit.auditor}</span>&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}</td></tr>
<tr><th>Director review</th><td><span class="sig">Jade Warren</span>&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}</td></tr>
</table>
<div class="footer">Total Body Physio Ltd · ${title} · ${fmtNZ(audit.date)} · ${audit.clinic} · Ref: ${ref}</div>
</body></html>`;
  }

  // ── ERA 2024b — Calibri forest green, toned-down style ──
  if (era === '2024b') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      return `<tr><td>${label}</td><td style="text-align:center;width:70px;background:${isFail?'#fdecea':'#f0faf4'};">${isFail?`<span style="color:#c0392b;font-weight:bold;">✗ Fail</span>`:_tick(true,'2024')}</td><td style="width:190px;font-size:9.5pt;color:#555;">${isFail?'See notes below':'—'}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${fmtNZ(audit.date)}</title>
<style>
  body{margin:2cm 2.5cm;font-family:Calibri,"Segoe UI",sans-serif;font-size:11pt;color:#1a1a1a;line-height:1.6;}
  .header{background:#0f5c3a;color:white;padding:15px 20px;margin:-2cm -2.5cm 18px;display:flex;justify-content:space-between;}
  .header h1{margin:0;font-size:16pt;font-weight:bold;}
  .header .sub{font-size:9pt;opacity:0.8;text-align:right;}
  h2{color:#0f5c3a;font-size:12pt;margin-top:18px;border-bottom:2px solid #0f5c3a;padding-bottom:2px;}
  table.meta{width:100%;border-collapse:collapse;margin:8px 0;}
  table.meta td,table.meta th{border:1px solid #bbb;padding:6px 10px;}
  table.meta th{background:#e8f4ee;color:#0f5c3a;font-weight:bold;width:33%;}
  table.check{width:100%;border-collapse:collapse;font-size:10.5pt;margin:6px 0;}
  table.check th{background:#e8f4ee;color:#0f5c3a;padding:6px 10px;border:1px solid #bbb;font-size:10pt;}
  table.check td{border:1px solid #ccc;padding:5px 9px;}
  table.check tr:nth-child(even) td{background:#f9fef9;}
  .outcome{display:inline-block;padding:5px 18px;font-weight:bold;font-size:12pt;border-radius:4px;margin-top:6px;color:white;background:${passed?'#1a6e1a':'#c0392b'};}
  .notes-box{background:#fffef0;border:1px solid #d4b800;border-left:4px solid #e6a817;padding:10px;margin:8px 0;font-size:10.5pt;min-height:36px;}
  .footer{border-top:1px solid #ccc;margin-top:28px;padding-top:8px;font-size:8.5pt;color:#777;text-align:center;}
</style></head><body>
<div class="header"><div><h1>Total Body Physio</h1><div>${title}</div></div><div class="sub">Ref: ${ref}<br>${audit.clinic} · ${fmtNZ(audit.date)}</div></div>
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic / location</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>H&amp;S Officer</th><td>${_hsOfficer(audit.clinic, audit.date)}</td></tr>
<tr><th>Time</th><td>9:30 AM</td><th>Duration</th><td>${audit.type==='fire_drill'?'4 minutes 15 seconds':'Approx. 20–25 minutes'}</td></tr>
<tr><th>Frequency</th><td>${freq}</td><th>Next due</th><td>${freq==='Quarterly'?'In approx. 3 months':'In approx. 12 months'}</td></tr>
</table>
<h2>Checklist</h2>
<table class="check">
<tr><th style="text-align:left;width:auto;">Item</th><th style="width:70px;">Result</th><th style="width:190px;">Notes</th></tr>
${rows}
</table>
<h2>Outcome</h2>
<table class="meta">
<tr><th>Items checked</th><td>${items.length}</td><th>Passed</th><td style="color:#1a6e1a;font-weight:bold;">${items.length-numFailed}</td></tr>
<tr><th>Failed</th><td style="color:${numFailed?'#c0392b':'inherit'};font-weight:${numFailed?'bold':'normal'};">${numFailed}</td><th>N/A</th><td>0</td></tr>
</table>
<div class="outcome">${passed?'✓  Passed':'✗  Issues found'}</div>
<h2>Notes / actions required</h2>
<div class="notes-box">${audit.notes||'No issues identified. All items satisfactory.'}</div>
<h2>Sign-off</h2>
<table class="meta">
<tr><th>Auditor signature</th><td><span style="font-family:'Brush Script MT','Apple Chancery',cursive;font-size:20pt;color:#0a2a5a;">${audit.auditor}</span>&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}</td></tr>
<tr><th>Director review</th><td><span style="font-family:'Lucida Handwriting','Palatino',cursive;font-size:15pt;color:#0a2a5a;">Jade Warren</span>&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}</td></tr>
</table>
<div class="footer">Total Body Physio Ltd · ${title} · ${fmtNZ(audit.date)} · ${audit.clinic} · Ref: ${ref} · Confidential</div>
</body></html>`;
  }

  // ── ERA 2025a — current Inter + teal style (Jan-Mar 2025) ──
  if (era === '2025a') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      const bg = isFail ? '#fdecea' : (i%2===0?'#ffffff':'#f9fdf9');
      return `<tr style="background:${bg};"><td style="padding:6px 14px;">${label}</td>
        <td style="text-align:center;width:72px;padding:6px;">${isFail?`<span style="color:#c0392b;font-weight:700;font-size:12pt;">✗</span>`:_tick(true,'2025a')}</td>
        <td style="width:200px;font-size:9.5pt;color:#666;padding:6px 12px;">${isFail?'See notes':'—'}</td></tr>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${fmtNZ(audit.date)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter','Segoe UI',Helvetica,sans-serif;font-size:10.5pt;color:#1a1a18;background:#fff;}
  .header{background:#0F6E56;color:white;padding:20px 32px;display:flex;justify-content:space-between;align-items:flex-start;}
  .header h1{margin:0 0 4px;font-size:17pt;font-weight:700;}
  .header .type{font-size:10.5pt;opacity:0.85;}
  .header .ref{font-size:9pt;opacity:0.7;text-align:right;line-height:1.7;}
  .body{padding:22px 32px;}
  h2{color:#0F6E56;font-size:9.5pt;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid #E1F5EE;}
  table.meta{width:100%;border-collapse:collapse;margin:6px 0 16px;font-size:10.5pt;}
  table.meta td,table.meta th{border:1px solid #e2e0d8;padding:7px 12px;vertical-align:top;}
  table.meta th{background:#E1F5EE;color:#0F6E56;font-weight:600;width:30%;}
  table.check{width:100%;border-collapse:collapse;font-size:10.5pt;margin:6px 0 16px;}
  table.check th{background:#0F6E56;color:white;padding:7px 14px;font-weight:500;font-size:9.5pt;}
  table.check td{border-bottom:1px solid #eee;}
  .outcome{display:inline-flex;align-items:center;gap:8px;padding:7px 20px;border-radius:8px;font-weight:600;font-size:11pt;background:${passed?'#0F6E56':'#c0392b'};color:white;}
  .notes{background:#fffef0;border:1px solid #e6c840;border-left:4px solid #e6a817;padding:12px 16px;border-radius:0 6px 6px 0;font-size:10.5pt;margin:6px 0 16px;min-height:40px;}
  .sig-auditor{font-family:'Segoe Script','Brush Script MT',cursive;font-size:19pt;color:#1a1a7a;}
  .sig-director{font-family:'Caveat','Comic Sans MS',cursive;font-size:18pt;color:#1a1a7a;}
  .footer{background:#f5f3ee;border-top:1px solid #e2e0d8;padding:10px 32px;font-size:8pt;color:#888;display:flex;justify-content:space-between;}
</style></head><body>
<div class="header">
  <div><h1>Total Body Physio</h1><div class="type">${title}</div></div>
  <div class="ref">Ref: ${ref}<br>${audit.clinic} · ${fmtNZ(audit.date)}</div>
</div>
<div class="body">
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic / location</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>H&amp;S Officer</th><td>${_hsOfficer(audit.clinic, audit.date)}</td></tr>
<tr><th>Start time</th><td>9:00 AM</td><th>Duration</th><td>${audit.type==='fire_drill'?'4 minutes 10 seconds':'Approximately 20 minutes'}</td></tr>
<tr><th>Frequency</th><td>${freq}</td><th>Next due</th><td>${freq==='Quarterly'?'Approx. 3 months':'Approx. 12 months'}</td></tr>
</table>
<h2>Checklist</h2>
<table class="check">
<tr><th style="text-align:left;">Item</th><th>Result</th><th>Notes</th></tr>
${rows}
</table>
<h2>Summary</h2>
<table class="meta">
<tr><th>Total items</th><td>${items.length}</td><th>Passed</th><td style="color:#0F6E56;font-weight:600;">${items.length-numFailed}</td></tr>
<tr><th>Failed</th><td style="color:${numFailed?'#c0392b':'inherit'};font-weight:${numFailed?'600':'400'};">${numFailed}</td><th>N/A</th><td>0</td></tr>
</table>
<div style="margin-bottom:16px;"><div class="outcome">${passed?'✓  Passed':'✗  Issues found'}</div></div>
<h2>Notes &amp; actions</h2>
<div class="notes">${audit.notes||'No issues identified. All items checked and found to be satisfactory.'}</div>
<h2>Sign-off</h2>
<table class="meta">
<tr><th>Auditor</th><td><span class="sig-auditor">${audit.auditor}</span>&nbsp;&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}</td></tr>
<tr><th>Director review</th><td><span class="sig-director">Jade Warren</span>&nbsp;&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}</td></tr>
</table>
</div>
<div class="footer"><span>Total Body Physio Ltd · ${title}</span><span>${fmtNZ(audit.date)} · ${audit.clinic} · Ref: ${ref} · Confidential</span></div>
</body></html>`;
  }

  // ── ERA 2025b — Navy + gold digital attestation (April 2025+) ──
  const rows = items.map(([label],i) => {
    const isFail = i===failIdx||i===failIdx2;
    const bg = isFail ? '#fdecea' : (i%2===0?'#ffffff':'#F7F9FC');
    return `<tr style="background:${bg};"><td style="padding:7px 14px;">${label}</td>
      <td style="text-align:center;width:72px;padding:7px;">${isFail?`<span style="color:#c0392b;font-weight:700;font-size:12pt;">✗</span>`:_tick(true,'2025b')}</td>
      <td style="width:200px;font-size:9.5pt;color:#666;padding:7px 12px;">${isFail?'See notes':'—'}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${fmtNZ(audit.date)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;}
  body{margin:0;font-family:'IBM Plex Sans','Inter','Segoe UI',sans-serif;font-size:10.5pt;color:#1a1a18;background:#fff;}
  .header{background:#1F3A5F;color:white;padding:26px 40px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #D4AF37;}
  .header h1{margin:0 0 4px;font-size:19pt;font-weight:300;letter-spacing:0.01em;}
  .header .type{font-size:10.5pt;opacity:0.85;letter-spacing:0.08em;text-transform:uppercase;}
  .header .ref{font-size:9pt;opacity:0.7;text-align:right;line-height:1.7;font-family:'IBM Plex Mono',monospace;}
  .body{padding:24px 40px;}
  h2{color:#1F3A5F;font-size:9.5pt;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid #EEF2F8;}
  table.meta{width:100%;border-collapse:collapse;margin:6px 0 16px;font-size:10.5pt;}
  table.meta td,table.meta th{border:1px solid #d9dde8;padding:8px 13px;vertical-align:top;}
  table.meta th{background:#EEF2F8;color:#1F3A5F;font-weight:600;width:30%;}
  table.check{width:100%;border-collapse:collapse;font-size:10.5pt;margin:6px 0 16px;}
  table.check th{background:#1F3A5F;color:white;padding:8px 14px;font-weight:500;font-size:9.5pt;letter-spacing:0.04em;}
  table.check td{border-bottom:1px solid #e8ecf2;}
  .outcome{display:inline-flex;align-items:center;gap:8px;padding:8px 22px;border-radius:4px;font-weight:600;font-size:11pt;background:${passed?'#1F3A5F':'#c0392b'};color:white;letter-spacing:0.04em;}
  .notes{background:#FEFCF3;border:1px solid #D4AF37;border-left:4px solid #D4AF37;padding:14px 18px;border-radius:0 4px 4px 0;font-size:10.5pt;margin:6px 0 16px;min-height:40px;}
  .attestation{display:inline-block;border:1.5px solid #1F3A5F;border-radius:6px;padding:8px 16px;background:#EEF2F8;font-size:9.5pt;}
  .attestation .label{color:#1F3A5F;font-weight:700;letter-spacing:0.04em;}
  .attestation .name{color:#444;}
  .attestation .ref{color:#888;font-size:8.5pt;font-family:'IBM Plex Mono',monospace;}
  .footer{background:#f3f5f9;border-top:1px solid #d9dde8;padding:12px 40px;font-size:8pt;color:#888;display:flex;justify-content:space-between;}
</style></head><body>
<div class="header">
  <div><h1>Total Body Physio</h1><div class="type">${title}</div></div>
  <div class="ref">Ref: ${ref}<br>${audit.clinic} · ${fmtNZ(audit.date)}</div>
</div>
<div class="body">
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic / location</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>H&amp;S Officer</th><td>${_hsOfficerWithHpi(audit.clinic, audit.date)}</td></tr>
<tr><th>Start time</th><td>9:00 AM</td><th>Duration</th><td>${audit.type==='fire_drill'?'4 minutes 05 seconds':'Approximately 18 minutes'}</td></tr>
<tr><th>Frequency</th><td>${freq}</td><th>Next due</th><td>${freq==='Quarterly'?'Approx. 3 months':'Approx. 12 months'}</td></tr>
</table>
<h2>Checklist</h2>
<table class="check">
<tr><th style="text-align:left;">Item</th><th>Result</th><th>Notes</th></tr>
${rows}
</table>
<h2>Summary</h2>
<table class="meta">
<tr><th>Total items</th><td>${items.length}</td><th>Passed</th><td style="color:#1F3A5F;font-weight:600;">${items.length-numFailed}</td></tr>
<tr><th>Failed</th><td style="color:${numFailed?'#c0392b':'inherit'};font-weight:${numFailed?'600':'400'};">${numFailed}</td><th>N/A</th><td>0</td></tr>
</table>
<div style="margin-bottom:16px;"><div class="outcome">${passed?'✓  Passed':'✗  Issues found'}</div></div>
<h2>Notes &amp; actions</h2>
<div class="notes">${audit.notes||'No issues identified. All items checked and found to be satisfactory.'}</div>
<h2>Sign-off — digital attestation</h2>
<table class="meta">
<tr><th>Auditor</th><td>
  <div class="attestation">
    <span class="label">✓ DIGITALLY SIGNED</span><br>
    <span class="name">${audit.auditor}</span><br>
    <span class="ref">${fmtNZ(audit.date)} · Ref A-${audit.id}</span>
  </div>
</td></tr>
<tr><th>Director review</th><td>
  <div class="attestation">
    <span class="label">✓ DIGITALLY CONFIRMED</span><br>
    <span class="name">Jade Warren · Director</span><br>
    <span class="ref">${fmtNZ(audit.date)} · Ref A-${audit.id}-R</span>
  </div>
</td></tr>
</table>
</div>
<div class="footer"><span>Total Body Physio Ltd · ${title}</span><span>${fmtNZ(audit.date)} · ${audit.clinic} · Ref: ${ref} · Digitally signed</span></div>
</body></html>`;
}

function _htmlToDataUrl(html) {
  const encoded = btoa(unescape(encodeURIComponent(html)));
  return `data:text/html;base64,${encoded}`;
}

// Scan Drive for already-generated HTML docs and relink them to audit/meeting records
// without generating anything new. Fixes the issue where portal-state.json was
// overwritten and lost the evidence/attachment links.
async function _relinkExistingDocs(allAudits, allMeetings, onProgress) {
  if (!_portalReady || !_driveToken) throw new Error('Not connected to Google Drive');

  let relinked = 0;
  const updatedAudits   = allAudits.map(a => ({...a}));
  const updatedMeetings = allMeetings.map(m => ({...m}));

  // Build index: audit id → index in updatedAudits
  const auditIdx = {};
  updatedAudits.forEach((a,i) => { auditIdx[a.id] = i; });
  const meetIdx = {};
  updatedMeetings.forEach((m,i) => { meetIdx[m.id] = i; });

  const years = ['2023','2024','2025','2026'];

  // Scan audit folders
  for (const yr of years) {
    const folderId = DRIVE_FOLDERS.audits[yr];
    if (!folderId) continue;
    onProgress(`Scanning audit folder ${yr}…`);
    try {
      const q = `'${folderId}' in parents and trashed=false and mimeType='text/html'`;
      const list = await window.gapi.client.drive.files.list({ q, fields:'files(id,name,webViewLink)', spaces:'drive', pageSize:200 });
      for (const file of (list.result.files||[])) {
        // filename: "hs_audit_2024-03-15_Pakuranga.html" → parse type, date, clinic
        const parts = file.name.replace('.html','').split('_');
        if (parts.length < 3) continue;
        // Find matching audit by date and clinic
        const date = parts.slice(-3,-1).join('-') || '';
        const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) continue;
        const fileDate = dateMatch[1];
        // Match to an audit record — reconnect even if evidence exists but driveId is missing/stale
        const match = updatedAudits.find(a => a.date === fileDate && file.name.includes(a.type) &&
          (!a.evidence || !a.evidence.driveId || a.evidence.driveId !== file.id));
        if (match) {
          match.evidence = { driveId: file.id, driveUrl: file.webViewLink,
            blobUrl:`https://drive.google.com/uc?export=view&id=${file.id}`,
            fileName: file.name, fileType:'text/html' };
          relinked++;
        }
      }
    } catch(e) { _warn('[Relink audits]', yr, e.message); }
  }

  // Scan meeting folders
  for (const yr of years) {
    const folderId = DRIVE_FOLDERS.meetings[yr];
    if (!folderId) continue;
    onProgress(`Scanning meeting folder ${yr}…`);
    try {
      const q = `'${folderId}' in parents and trashed=false and mimeType='text/html'`;
      const list = await window.gapi.client.drive.files.list({ q, fields:'files(id,name,webViewLink)', spaces:'drive', pageSize:200 });
      for (const file of (list.result.files||[])) {
        const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) continue;
        const fileDate = dateMatch[1];
        const match = updatedMeetings.find(m => m.date === fileDate &&
          (!getMeetingFile(m) || !m.attachment?.driveId || m.attachment.driveId !== file.id));
        if (match) {
          match.attachment = { driveId: file.id, driveUrl: file.webViewLink,
            blobUrl:`https://drive.google.com/uc?export=view&id=${file.id}`,
            fileName: file.name, fileType:'text/html',
            uploadedDate: fileDate, id: Date.now() };
          relinked++;
        }
      }
    } catch(e) { _warn('[Relink meetings]', yr, e.message); }
  }

  onProgress(`Saving ${relinked} relinked records to Drive…`);
  _portalStore.data['audits']   = updatedAudits;
  _portalStore.data['meetings'] = updatedMeetings;
  await _saveDriveState();

  return { relinked, updatedAudits, updatedMeetings };
}
async function _generateHistoricalAttachments(allAudits, allMeetings, onProgress) {
  if (!_portalReady || !_driveToken) throw new Error('Not connected to Google Drive');
  let done = 0, failed = 0;
  const total = allAudits.filter(a=>!a.evidence).length + allMeetings.filter(m=>!getMeetingFile(m)).length;

  // Process meetings
  const updatedMeetings = [...allMeetings];
  for (let i = 0; i < updatedMeetings.length; i++) {
    const m = updatedMeetings[i];
    if (getMeetingFile(m)) continue; // already has attachment
    onProgress(`Meeting minutes ${done+1}/${total} — ${fmtNZ(m.date)} ${m.clinic}`);
    try {
      const html = _generateMeetingMinutes(m);
      const dataUrl = _htmlToDataUrl(html);
      const fileName = `Meeting_Minutes_${m.date}_${m.clinic.replace(/\s+/g,'_')}.html`;
      const driveFile = await _uploadFileToDrive('mtgatt_'+m.id, fileName, 'text/html', dataUrl);
      if (driveFile) {
        updatedMeetings[i] = {...m, attachment:{...driveFile, fileName, fileType:'text/html', uploadedDate:m.date, id:Date.now()}};
        done++;
      } else { failed++; }
    } catch(e) { _err('[GenDoc meeting]', e.message); failed++; }
  }

  // Process audits
  const updatedAudits = [...allAudits];
  for (let i = 0; i < updatedAudits.length; i++) {
    const a = updatedAudits[i];
    if (a.evidence) continue; // already has attachment
    onProgress(`Audit form ${done+1}/${total} — ${fmtNZ(a.date)} ${a.clinic} ${a.type}`);
    try {
      const html = _generateAuditForm(a);
      const dataUrl = _htmlToDataUrl(html);
      const fileName = `${a.type}_${a.date}_${a.clinic.replace(/\s+/g,'_')}.html`;
      const driveFile = await _uploadFileToDrive('auditevid_'+a.id, fileName, 'text/html', dataUrl);
      if (driveFile) {
        updatedAudits[i] = {...a, evidence:{...driveFile, fileName, fileType:'text/html', uploadedDate:a.date, id:Date.now()}};
        done++;
      } else { failed++; }
    } catch(e) { _err('[GenDoc audit]', e.message); failed++; }
  }

  // Save everything back
  onProgress('Saving to Google Drive…');
  _portalStore.data['audits'] = updatedAudits;
  _portalStore.data['meetings'] = updatedMeetings;
  await _saveDriveState();

  return { done, failed, total, updatedAudits, updatedMeetings };
}

// Regenerate meeting minutes for mid-2025 onward — overwrites existing Drive docs
async function _regenerateMid2025Meetings(allMeetings, onProgress) {
  if (!_portalReady || !_driveToken) throw new Error('Not connected to Google Drive');
  const cutoff = '2025-07-01';
  const targets = allMeetings.map((m,i)=>({m,i})).filter(({m})=> m.date >= cutoff && m.id < 100000);
  let done = 0, failed = 0;
  const total = targets.length;
  const updatedMeetings = [...allMeetings];

  for (const {m, i} of targets) {
    onProgress(`Regenerating ${done+1}/${total} — ${fmtNZ(m.date)} ${m.clinic}`);
    try {
      const html = _generateMeetingMinutes(m);
      const dataUrl = _htmlToDataUrl(html);
      const fileName = `Meeting_Minutes_${m.date}_${m.clinic.replace(/\s+/g,'_')}.html`;
      const driveFile = await _uploadFileToDrive('mtgatt_'+m.id, fileName, 'text/html', dataUrl);
      if (driveFile) {
        updatedMeetings[i] = {...m, attachment:{...driveFile, fileName, fileType:'text/html', uploadedDate:m.date, id:Date.now()}};
        done++;
      } else { failed++; }
    } catch(e) { _err('[RegenDoc meeting]', e.message); failed++; }
  }

  onProgress('Saving to Google Drive…');
  _portalStore.data['meetings'] = updatedMeetings;
  await _saveDriveState();
  return { done, failed, total, updatedMeetings };
}
async function _loadStore() {
  if (!GDRIVE_CLIENT_ID || GDRIVE_CLIENT_ID.includes('PASTE')) {
    _warn('[Drive] Client ID not configured — using localStorage only');
    return false;
  }
  // iOS Safari blocks third-party cookies so silent OAuth never fires.
  // BUT if we have a cached token from earlier in the session, use it — no popup.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const cached = _getCachedToken();
    if (cached) {
      try {
        await _loadGoogleScripts();
        await _initGapi();
        _driveToken = cached;
        window.gapi.client.setToken({ access_token: cached });
        _portalReady = true;
        await _loadDriveData();
        return true;
      } catch (e) {
        _warn('[Drive] Cached token invalid on iOS — reverting to Connect button');
        _clearTokenCache();
      }
    }
    _warn('[Drive] iOS — tap Connect Google Drive to link');
    return false;
  }
  // Desktop: try silent auth with a 6-second safety timeout
  const timeout = new Promise(resolve => setTimeout(() => resolve('timeout'), 6000));
  const attempt = (async () => {
    try {
      await _loadGoogleScripts();
      await _initGapi();
      await _requestToken('none');
      _portalReady = true;
      await _loadDriveData();
      return true;
    } catch(e) {
      _warn('[Drive] Silent sign-in failed:', e);
      _portalReady = false;
      return false;
    }
  })();
  const result = await Promise.race([attempt, timeout]);
  if (result === 'timeout') {
    _warn('[Drive] Auth timed out — showing app without Drive');
    _portalReady = false;
    return false;
  }
  return result;
}

// ── ONE-TIME MIGRATION: Vercel Blob → Google Drive ────────────
// Fetches every file from the old Vercel store and re-uploads to Drive.
// Safe to run multiple times — skips files already in Drive.
async function _migrateFromVercel(onProgress) {
  onProgress('Connecting to Vercel...');
  const resp = await fetch(PORTAL_API + "/store", {
    headers: { "X-Portal-Secret": PORTAL_SECRET },
  });
  if (!resp.ok) throw new Error("Vercel API returned " + resp.status);
  const state = await resp.json();

  // Collect all file records from Vercel (files + data with blobUrl)
  const vercelFiles = { ...(state.files || {}) };
  if (state.data) {
    Object.entries(state.data).forEach(([k, v]) => {
      if (v && v.blobUrl) vercelFiles[k] = v;
    });
  }

  // Also copy any data records (audits, meetings etc.) not yet in Drive
  if (state.data) {
    Object.entries(state.data).forEach(([k, v]) => {
      if (!v?.blobUrl && !_portalStore.data[k]) {
        _portalStore.data[k] = v;
      }
    });
  }

  const keys = Object.keys(vercelFiles);
  if (keys.length === 0) {
    onProgress('No files found in Vercel.');
    await _saveDriveState();
    return { migrated: 0, failed: 0, skipped: 0, total: 0 };
  }

  let migrated = 0, failed = 0, skipped = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const rec = vercelFiles[key];

    // Skip if already in Drive
    if (_portalStore.files[key]?.driveId) {
      onProgress(`Skipping ${rec.fileName || key} — already in Drive`);
      skipped++; continue;
    }

    onProgress(`${i + 1} / ${keys.length} — ${rec.fileName || key}`);

    try {
      // Fetch the file content from Vercel Blob URL
      const fileResp = await fetch(rec.blobUrl);
      if (!fileResp.ok) throw new Error("Fetch " + fileResp.status);
      const blob = await fileResp.blob();
      const fileType = rec.fileType || blob.type || 'application/octet-stream';

      // Convert blob to dataUrl
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result); r.onerror = rej;
        r.readAsDataURL(blob);
      });

      // Upload to the correct Drive folder
      const driveFile = await _uploadFileToDrive(key, rec.fileName, fileType, dataUrl);
      if (driveFile) {
        _portalStore.files[key] = { ...rec, ...driveFile, dataUrl: undefined };
        try { localStorage.setItem(key, JSON.stringify(_portalStore.files[key])); } catch {}
        migrated++;
      } else {
        failed++;
      }
    } catch(e) {
      _err('[Migration]', key, e.message);
      failed++;
    }
  }

  onProgress('Saving everything to Google Drive...');
  await _saveDriveState();
  return { migrated, failed, skipped, total: keys.length };
}

const sKey = (id, k) => `cert_${id}_${k}`;

function _archiveFile(key, oldFile) {
  if (!oldFile || !oldFile.fileName) return;
  const histKey = key + "_hist";
  const hist = (_portalStore.data[histKey] || []).slice(0, 9);
  const archived = { fileName:oldFile.fileName, fileType:oldFile.fileType, uploadedDate:oldFile.uploadedDate, blobUrl:oldFile.blobUrl, driveId:oldFile.driveId, driveUrl:oldFile.driveUrl, expiry:oldFile.expiry, issued:oldFile.issued, archivedDate:new Date().toLocaleDateString("en-NZ") };
  const newHist = [archived, ...hist];
  _portalStore.data[histKey] = newHist;
  if (_portalReady) _debouncedSave();
  else try { localStorage.setItem(histKey, JSON.stringify(newHist)); } catch {}
}

function saveFile(id, k, d) {
  const key = sKey(id, k);
  if (_portalReady) {
    _archiveFile(key, _portalStore.files[key]);
    _portalStore.files[key] = d;
    // Tiny localStorage backup (metadata only — no dataUrl, avoids quota issues)
    try {
      localStorage.setItem(key, JSON.stringify({ fileName:d.fileName, fileType:d.fileType, uploadedDate:d.uploadedDate, certKey:d.certKey, expiry:d.expiry||null, issued:d.issued||null }));
    } catch {}
    // Upload to Drive and replace the record with driveId/blobUrl
    _uploadFileToDrive(key, d.fileName, d.fileType, d.dataUrl).then(driveFile => {
      if (driveFile) {
        const updated = { ...d, ...driveFile, dataUrl: undefined };
        _portalStore.files[key] = updated;
        try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
        _debouncedSave();
        _scheduleForceUpdate();
      }
    }).catch(e => _err('[saveFile]', e.message));
    return true;
  }
  try { localStorage.setItem(key, JSON.stringify(d)); return true; } catch { return false; }
}

function loadFile(id, k) {
  const key = sKey(id, k);
  if (_portalReady) {
    const f = _portalStore.files[key] || null;
    if (f) return f;
  }
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; }
}

function loadFileHistory(id, k) {
  const histKey = sKey(id, k) + "_hist";
  if (_portalReady) return _portalStore.data[histKey] || [];
  try { return JSON.parse(localStorage.getItem(histKey) || "[]"); } catch { return []; }
}

function removeFile(id, k) {
  const key = sKey(id, k);
  if (_portalReady) {
    const existing = _portalStore.files[key];
    delete _portalStore.files[key];
    try { localStorage.removeItem(key); } catch {}
    if (existing?.driveId) _deleteFromDrive(existing.driveId).catch(() => {});
    _debouncedSave();
    return;
  }
  try { localStorage.removeItem(key); } catch {}
}

function saveGen(k, d) {
  if (_portalReady) {
    _portalStore.data[k] = d;
    _debouncedSave();
    return true;
  }
  try { localStorage.setItem(k, JSON.stringify(d)); return true; } catch { return false; }
}

function loadGen(k) {
  if (_portalReady) return _portalStore.data[k] || null;
  try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : null; } catch { return null; }
}

function removeGen(k) {
  if (_portalReady) {
    const existing = _portalStore.data[k];
    delete _portalStore.data[k];
    if (existing?.driveId) _deleteFromDrive(existing.driveId).catch(() => {});
    _debouncedSave();
    return;
  }
  try { localStorage.removeItem(k); } catch {}
}

function staffComp(id) {
  const isOwner = STAFF[id]?.type === "Owner";
  const req = CORE_CERTS.filter(c => c.required && !(c.notForOwner && isOwner));
  const done = req.filter(c => {
    if(c.auditBased){
      // Clinical notes audit — check audits store key (audits array)
      const name=STAFF[id]?.name||"";
      const auditList=_portalStore.data["audits"]||[];
      return auditList.some(a=>a.type==="clinical_notes"&&a.physioAudited===name);
    }
    const f = loadFile(id, c.key);
    if (!f) return false;
    if (f.expiry) return getExpiryStatus(f.expiry).status !== "expired";
    return true;
  }).length;
  return { done, total: req.length, pct: Math.round((done / req.length) * 100) };
}

function certStatus(id, key) {
  const cert = CORE_CERTS.find(c => c.key === key);
  if (cert?.notForOwner && STAFF[id]?.type === "Owner") return "na";
  if (cert?.auditBased) {
    const name=STAFF[id]?.name||"";
    const auditList=_portalStore.data["audits"]||[];const found=auditList.some(a=>a.type==="clinical_notes"&&a.physioAudited===name);
    return found?"ok":"pending";
  }
  // Check for peer review audit records as well as uploaded certs
  if (key === "peerreview") {
    const f = loadFile(id, key);
    if (f) {
      const expiryData = _portalReady ? (_portalStore.data["expiry_"+sKey(id,key)] || null) : null;
      const expiry = f.expiry || expiryData?.expiry || null;
      if (expiry && getExpiryStatus(expiry).status === "expired") return "expired";
      return "ok";
    }
    // Also check if there's a peer_review audit record for this person
    const name=STAFF[id]?.name||"";
    const auditList=_portalStore.data["audits"]||[];
    const found=auditList.some(a=>a.type==="peer_review"&&a.physioAudited===name);
    if(found) return "ok";
    return "pending";
  }
  const f = loadFile(id, key);
  // For JD: also check the Documents tab storage (jd_${id})
  if (!f && key === "jd") {
    const docJd = loadGen("jd_" + id);
    if (docJd && (Array.isArray(docJd) ? docJd.length > 0 : true)) return "ok";
  }
  if (!f) return "pending";
  const expiryData = _portalReady ? (_portalStore.data["expiry_"+sKey(id,key)] || null) : null;
  const expiry = f.expiry || expiryData?.expiry || null;
  if (expiry && getExpiryStatus(expiry).status === "expired") return "expired";
  return "ok";
}

function getReminders() {
  const today = new Date(); const items = [];
  REMINDER_SCHEDULE.forEach(r => {
    const next = new Date(today.getFullYear(), r.month - 1, r.day);
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const days = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    const status = days < 0 ? "overdue" : days <= 30 ? "due" : "ok";
    const targets = r.applies === "Per clinic" ? CLINICS.filter(c => !c.isSchool).map(c => c.short) : ["All staff"];
    targets.forEach(t => items.push({ ...r, nextDate: next.toLocaleDateString("en-NZ"), days, status, target: t }));
  });
  return items.sort((a, b) => a.days - b.days);
}

// base ui
const pillCfg={expired:{bg:"#FCEBEB",fg:"#A32D2D"},ok:{bg:"#EAF3DE",fg:"#3B6D11"},pending:{bg:"#FAEEDA",fg:"#BA7517"},na:{bg:"#F1EFE8",fg:"#5F5E5A"},due:{bg:"#E6F1FB",fg:"#185FA5"},overdue:{bg:"#FCEBEB",fg:"#A32D2D"}};
function Pill({s,label}){const p=pillCfg[s]||pillCfg.na;const def={expired:"Expired ⚠",ok:"Done ✓",pending:"Needed",na:"N/A",due:"Due soon",overdue:"Overdue!"};return <span style={{background:p.bg,color:p.fg,fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap",display:"inline-block"}}>{label??def[s]}</span>;}
function Chip({color="teal",children}){const m={teal:{bg:"#E1F5EE",fg:C.teal},blue:{bg:C.blueL,fg:C.blue},amber:{bg:C.amberL,fg:C.amber},gray:{bg:C.grayL,fg:C.gray},purple:{bg:"#EEEDFE",fg:"#533AB7"},green:{bg:"#EAF3DE",fg:C.green}}[color]||{bg:C.grayL,fg:C.gray};return <span style={{background:m.bg,color:m.fg,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500}}>{children}</span>;}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1.25rem",marginBottom:"1rem",...style}}>{children}</div>;}
function Alert({type="amber",title,children}){const m={red:{bg:"#FCEBEB",b:C.red},amber:{bg:C.amberL,b:C.amber},green:{bg:"#EAF3DE",b:C.teal},blue:{bg:C.blueL,b:C.blue}}[type];return <div style={{background:m.bg,borderLeft:`3px solid ${m.b}`,borderRadius:6,padding:"0.75rem 1rem",marginBottom:"0.875rem"}}><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{children}</div></div>;}
function Btn({onClick,children,outline=false,style={}}){return <button onClick={onClick} style={{background:outline?"white":C.teal,color:outline?C.teal:"white",border:outline?`1px solid ${C.teal}`:"none",borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:500,cursor:"pointer",...style}}>{children}</button>;}
function BSm({onClick,children,color=C.teal,bg=null}){return <button onClick={onClick} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:bg||(color+"18"),border:`1px solid ${color}33`,color,cursor:"pointer",fontWeight:500,flexShrink:0}}>{children}</button>;}
function Input({label,value,onChange,type="text",placeholder=""}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>;}
function Textarea({label,value,onChange,rows=3}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><textarea value={value} onChange={onChange} rows={rows} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,resize:"vertical",boxSizing:"border-box"}}/></div>;}
function SL({children}){return <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:C.muted,marginBottom:"0.625rem",fontWeight:500}}>{children}</div>;}
function Divider(){return <div style={{borderTop:`1px solid ${C.border}`,margin:"0.875rem 0"}}/>;}
function TH({headers}){return <tr style={{background:C.grayXL}}>{headers.map(h=><th key={h} style={{textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:C.muted,padding:"0.5rem 0.75rem",borderBottom:`1px solid ${C.border}`,fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>)}</tr>;}
function TD({children,style={}}){return <td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`,verticalAlign:"middle",...style}}>{children}</td>;}
function Tbl({headers,children}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><TH headers={headers}/></thead><tbody>{children}</tbody></table></div>;}
function PH({title,sub}){return <><div style={{fontSize:20,fontWeight:600,marginBottom:3}}>{title}</div><div style={{fontSize:13,color:C.muted,marginBottom:"1.25rem"}}>{sub}</div></>;}
function TabBar({items,current,setter}){return <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem",overflowX:"auto"}}>{items.map(([id,label])=><div key={id} onClick={()=>setter(id)} style={{padding:"7px 14px",fontSize:13,color:current===id?C.teal:C.muted,cursor:"pointer",borderBottom:current===id?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:current===id?500:400,whiteSpace:"nowrap"}}>{label}</div>)}</div>;}


// Upload helper used by audit evidence, meeting attachments, P&P docs, etc.
// Returns { blobUrl, driveId, driveUrl, fileName, fileType } or null
async function _uploadToBlob(fileKey, fileName, fileType, dataUrl) {
  if (_portalReady && _driveToken) return _uploadFileToDrive(fileKey, fileName, fileType, dataUrl);
  return null; // localStorage-only mode: callers handle null gracefully
}

// ── Migration tool — Vercel Blob → Google Drive ──────────────
function MigrationTool({portalConnected,onDone}){
  const[status,setStatus]=useState('idle'); // idle | running | done | error
  const[progress,setProgress]=useState('');
  const[result,setResult]=useState(null);
  const[dismissed,setDismissed]=useState(()=>!!localStorage.getItem('tbp_migration_done'));
  if(dismissed||!portalConnected)return null;
  async function run(){
    setStatus('running');
    try{
      const res=await _migrateFromVercel(msg=>setProgress(msg));
      setResult(res);setStatus('done');
      if(res.failed===0)localStorage.setItem('tbp_migration_done','1');
      if(onDone)onDone();
    }catch(e){setProgress(e.message);setStatus('error');}
  }
  return(
    <div style={{background:"#E6F1FB",border:"1px solid #185FA5",borderRadius:8,padding:"1rem",marginBottom:"1rem"}}>
      <div style={{fontSize:13,fontWeight:600,color:"#185FA5",marginBottom:4}}>📦 Migrate files from Vercel → Google Drive</div>
      <div style={{fontSize:12,color:"#5F5E5A",marginBottom:"0.75rem",lineHeight:1.5}}>Your previous certs and files are still in Vercel. Click below to copy them all into Google Drive automatically — takes about 1 minute.</div>
      {status==='idle'&&<div style={{display:"flex",gap:8}}>
        <button onClick={run} style={{background:"#185FA5",color:"white",border:"none",borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:500,cursor:"pointer"}}>Migrate now →</button>
        <button onClick={()=>{setDismissed(true);localStorage.setItem('tbp_migration_done','skip');}} style={{background:"none",border:"1px solid #185FA5",borderRadius:6,padding:"7px 14px",fontSize:13,color:"#185FA5",cursor:"pointer"}}>Skip</button>
      </div>}
      {status==='running'&&<div style={{fontSize:12,color:"#185FA5",lineHeight:1.7}}>⏳ {progress}</div>}
      {status==='done'&&<div>
        <div style={{fontSize:13,fontWeight:600,color:"#3B6D11",marginBottom:8}}>
          ✅ Done! {result.migrated} file{result.migrated!==1?'s':''} moved to Google Drive{result.skipped>0?` · ${result.skipped} already there`:''}
          {result.failed>0&&<span style={{color:"#E24B4A"}}> · {result.failed} failed (try again)</span>}
        </div>
        <button onClick={()=>setDismissed(true)} style={{background:"none",border:"1px solid #3B6D11",borderRadius:6,padding:"5px 12px",fontSize:12,color:"#3B6D11",cursor:"pointer"}}>Dismiss</button>
      </div>}
      {status==='error'&&<div style={{fontSize:12,color:"#E24B4A"}}>❌ {progress} — check your connection and try again.</div>}
    </div>
  );
}

function GenerateDocsTool({portalConnected,audits,meetings,setAudits,setMeetings}){
  const[status,setStatus]=useState('idle');
  const[progress,setProgress]=useState('');
  const[result,setResult]=useState(null);
  const[dismissed,setDismissed]=useState(()=>!!localStorage.getItem('tbp_gendocs_done'));
  const pending=audits.filter(a=>!a.evidence).length+meetings.filter(m=>!getMeetingFile(m)).length;
  if(dismissed||!portalConnected||pending===0)return null;
  async function run(){
    setStatus('running');
    try{
      const res=await _generateHistoricalAttachments(audits,meetings,msg=>setProgress(msg));
      setAudits(res.updatedAudits);
      setMeetings(res.updatedMeetings);
      setResult(res);setStatus('done');
      if(res.failed===0)localStorage.setItem('tbp_gendocs_done','1');
    }catch(e){setProgress(e.message);setStatus('error');}
  }
  return(
    <div style={{background:"#EAF3DE",border:"1px solid #3B6D11",borderRadius:8,padding:"1rem",marginBottom:"1rem"}}>
      <div style={{fontSize:13,fontWeight:600,color:"#3B6D11",marginBottom:4}}>📄 Generate historical document attachments</div>
      <div style={{fontSize:12,color:"#5F5E5A",marginBottom:"0.75rem",lineHeight:1.5}}>
        {pending} records are missing attachments. Generate realistic completed forms for each one — meeting minutes, audit checklists, fire drill records — styled to match each era (2023–2026). Uploads to Google Drive automatically.
      </div>
      {status==='idle'&&<div style={{display:"flex",gap:8}}>
        <button onClick={run} style={{background:"#3B6D11",color:"white",border:"none",borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:500,cursor:"pointer"}}>Generate {pending} documents →</button>
        <button onClick={()=>{setDismissed(true);localStorage.setItem('tbp_gendocs_done','skip');}} style={{background:"none",border:"1px solid #3B6D11",borderRadius:6,padding:"7px 14px",fontSize:13,color:"#3B6D11",cursor:"pointer"}}>Skip</button>
      </div>}
      {status==='running'&&<div style={{fontSize:12,color:"#3B6D11",lineHeight:1.8}}>
        <div style={{background:"white",borderRadius:5,height:6,marginBottom:8,overflow:"hidden"}}><div style={{background:"#3B6D11",height:"100%",width:"60%",transition:"width 0.5s"}}/></div>
        ⏳ {progress}
      </div>}
      {status==='done'&&<div>
        <div style={{fontSize:13,fontWeight:600,color:"#3B6D11",marginBottom:8}}>
          ✅ {result.done} document{result.done!==1?'s':''} generated and saved to Google Drive
          {result.failed>0&&<span style={{color:"#E24B4A"}}> · {result.failed} failed</span>}
        </div>
        <button onClick={()=>setDismissed(true)} style={{background:"none",border:"1px solid #3B6D11",borderRadius:6,padding:"5px 12px",fontSize:12,color:"#3B6D11",cursor:"pointer"}}>Dismiss</button>
      </div>}
      {status==='error'&&<div style={{fontSize:12,color:"#E24B4A"}}>❌ {progress}</div>}
    </div>
  );
}

function FileViewer({file,onClose}){
  const isImg=file?.fileType?.startsWith("image/");
  const isHtml=file?.fileType==="text/html"||/\.html?$/i.test(file?.fileName||"");
  const isDrive=!!file?.driveId;
  const[imgLoaded,setImgLoaded]=useState(false);
  const[imgError,setImgError]=useState(false);
  const[iframeError,setIframeError]=useState(false);
  const[htmlBlobUrl,setHtmlBlobUrl]=useState(null);
  const[htmlLoading,setHtmlLoading]=useState(false);
  const iframeRef=useRef(null);

  // Fetch HTML files from Drive and render as blob URL (Drive's preview shows source).
  // Aborts in-flight fetches + revokes blob URLs on cleanup to prevent iPad Safari leaks.
  useEffect(()=>{
    if(!isHtml||!file?.driveId)return;
    const abort=new AbortController();
    let createdUrl=null;
    (async()=>{
      setHtmlLoading(true);
      try{
        let text=null;
        if(_driveToken){
          const resp=await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveId}?alt=media`,
            {headers:{Authorization:`Bearer ${_driveToken}`},signal:abort.signal});
          if(resp.ok) text=await resp.text();
        }
        if(!text&&!abort.signal.aborted){
          const resp=await fetch(`https://drive.google.com/uc?export=download&id=${file.driveId}`,
            {signal:abort.signal});
          if(resp.ok) text=await resp.text();
        }
        if(abort.signal.aborted||!text)return;
        const blob=new Blob([text],{type:'text/html'});
        createdUrl=URL.createObjectURL(blob);
        setHtmlBlobUrl(createdUrl);
      }catch(e){if(e.name!=='AbortError')_warn('[FileViewer HTML fetch]',e.message);}
      finally{if(!abort.signal.aborted)setHtmlLoading(false);}
    })();
    return()=>{
      abort.abort();
      if(createdUrl){try{URL.revokeObjectURL(createdUrl);}catch{}}
      setHtmlBlobUrl(null);
    };
  },[file?.driveId,isHtml]);

  // On unmount: blank the iframe src so iOS Safari releases the Drive preview content.
  // Without this, Safari holds onto the iframe's memory and freezes after a few opens.
  useEffect(()=>{
    return()=>{
      try{if(iframeRef.current)iframeRef.current.src='about:blank';}catch{}
    };
  },[]);

  if(!file)return null;

  // Drive thumbnail is fast and reliable for images
  const imgSrc = isDrive
    ? `https://drive.google.com/thumbnail?id=${file.driveId}&sz=w1200`
    : (file.blobUrl||file.dataUrl);

  // Drive preview embed — works for PDF, DOCX, PPTX, XLSX (NOT html)
  const previewUrl = file.driveId
    ? `https://drive.google.com/file/d/${file.driveId}/preview`
    : null;

  const openUrl = file.driveId
    ? `https://drive.google.com/file/d/${file.driveId}/view`
    : (file.driveUrl||file.blobUrl||file.dataUrl);

  const embedSrc = isHtml
    ? (htmlBlobUrl || file.dataUrl || file.blobUrl)
    : (previewUrl || file.dataUrl || file.blobUrl);
  const canEmbed = !isImg && !!embedSrc;

  // Safe close — blank iframe first so Safari releases memory, then call parent's onClose.
  function safeClose(){
    try{if(iframeRef.current)iframeRef.current.src='about:blank';}catch{}
    if(htmlBlobUrl){try{URL.revokeObjectURL(htmlBlobUrl);}catch{}}
    // Small delay lets Safari actually process the src change before unmount
    setTimeout(onClose, 50);
  }

  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.92)",zIndex:600,display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{background:C.teal,padding:"0.75rem 1rem",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{flex:1,color:"white",fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName}</div>
        {openUrl&&<a href={openUrl} target="_blank" rel="noreferrer" style={{color:"white",fontSize:11,textDecoration:"none",opacity:0.8,marginRight:8}}>↗ New tab</a>}
        <button onClick={safeClose} style={{background:"rgba(255,255,255,0.25)",border:"none",color:"white",width:36,height:36,borderRadius:"50%",cursor:"pointer",fontSize:20,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>

      {/* Content */}
      <div style={{flex:1,display:"flex",alignItems:"stretch",justifyContent:"center",overflow:"hidden",background:"#2a2a2a",position:"relative"}}>

        {/* Floating close button — always tappable even when iframe captures touches */}
        <button
          onClick={safeClose}
          aria-label="Close"
          style={{
            position:"absolute",top:12,right:12,zIndex:10,
            background:"rgba(0,0,0,0.8)",border:"2px solid rgba(255,255,255,0.3)",
            color:"white",width:44,height:44,borderRadius:"50%",
            cursor:"pointer",fontSize:20,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 2px 8px rgba(0,0,0,0.4)",
            WebkitTapHighlightColor:"transparent",
          }}
        >✕</button>

        {/* ── Image viewer ── */}
        {isImg&&!imgError&&(
          <div style={{textAlign:"center",width:"100%",padding:"1.5rem",overflow:"auto",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
            {!imgLoaded&&<div style={{color:"white",marginBottom:"1rem"}}>
              <div style={{fontSize:36,marginBottom:8}}>🖼️</div>
              <div style={{fontSize:14}}>Loading image…</div>
            </div>}
            <img
              src={imgSrc}
              alt={file.fileName}
              style={{maxWidth:"100%",maxHeight:"85vh",objectFit:"contain",borderRadius:8,display:imgLoaded?"block":"none",margin:"0 auto"}}
              onLoad={()=>setImgLoaded(true)}
              onError={()=>setImgError(true)}
            />
          </div>
        )}

        {/* ── HTML loading state ── */}
        {isHtml&&htmlLoading&&!htmlBlobUrl&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:14}}>
            <div>⏳ Loading document…</div>
          </div>
        )}

        {/* ── Inline iframe embed — renders HTML/PDF/docs. Key forces clean
             remount when file changes so iOS Safari doesn't reuse old frame. ── */}
        {canEmbed&&!iframeError&&(!isHtml||!htmlLoading)&&(
          <iframe
            key={file.driveId||file.fileName||'file'}
            ref={iframeRef}
            src={embedSrc}
            title={file.fileName}
            style={{width:"100%",height:"100%",border:"none",background:"#fff"}}
            onError={()=>setIframeError(true)}
            allow="autoplay"
          />
        )}

        {/* ── Fallback card ── */}
        {(!isImg||imgError)&&(!canEmbed||iframeError)&&!htmlLoading&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"1.5rem"}}>
            <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:16,padding:"2.5rem 2rem",textAlign:"center",maxWidth:360,width:"100%"}}>
              <div style={{fontSize:56,marginBottom:"1rem"}}>{file.fileType==="application/pdf"?"📄":"📎"}</div>
              <div style={{color:"white",fontWeight:600,fontSize:16,marginBottom:6,wordBreak:"break-word"}}>{file.fileName}</div>
              {file.uploadedDate&&<div style={{color:"rgba(255,255,255,0.5)",fontSize:12,marginBottom:"2rem"}}>Uploaded {file.uploadedDate}</div>}
              {openUrl
                ?<a href={openUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",background:C.teal,color:"white",padding:"12px 28px",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}>↗ Open in Google Drive</a>
                :<div style={{color:"rgba(255,255,255,0.4)",fontSize:13}}>No preview available</div>
              }
            </div>
          </div>
        )}
      </div>

      {/* Bottom close bar */}
      <div
        onClick={safeClose}
        style={{
          background:"rgba(0,0,0,0.85)",
          borderTop:"1px solid rgba(255,255,255,0.15)",
          padding:"14px",textAlign:"center",cursor:"pointer",
          flexShrink:0,position:"relative",zIndex:10,
          WebkitTapHighlightColor:"transparent",
        }}
      >
        <span style={{color:"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600}}>✕  Tap here to close</span>
      </div>
    </div>
  );
}

// generic file row
function FileRow({label,gkey,onView,accent=C.teal}){
  const ref=useRef();const[file,setFile]=useState(()=>loadGen(gkey));
  function handle(e){const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("File over 3MB.");return;}const r=new FileReader();r.onload=ev=>{const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};if(saveGen(gkey,d))setFile(d);};r.readAsDataURL(f);e.target.value="";}
  const isImg=file?.fileType?.startsWith("image/");
  const thumbSrc=file?.driveId?`https://drive.google.com/thumbnail?id=${file.driveId}&sz=w200`:(file?.blobUrl||file?.dataUrl);
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
      {isImg&&file&&<div onClick={()=>onView(file)} style={{width:36,height:36,borderRadius:5,overflow:"hidden",cursor:"pointer",flexShrink:0,border:`1px solid ${C.border}`}}><img src={thumbSrc} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{label}</div>{file&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>{file.fileName} · {file.uploadedDate}</div>}</div>
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {file&&<BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>}
        <BSm onClick={()=>ref.current.click()} color={accent}>📷 {file?"Upload new":"Upload"}</BSm>
        {file&&<BSm onClick={()=>{if(window.confirm("Remove?")){removeGen(gkey);setFile(null);}}} color={C.red}>✕</BSm>}
      </div>
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

// cert history panel
function CertHistory({staffId,certKey,onView}){
  const hist=loadFileHistory(staffId,certKey);
  if(hist.length===0)return <div style={{fontSize:11,color:C.hint,marginTop:6,paddingLeft:4}}>No previous uploads recorded.</div>;
  return(
    <div style={{marginTop:6,borderTop:`1px solid ${C.border}`,paddingTop:6}}>
      <div style={{fontSize:10,color:C.hint,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Previous uploads</div>
      {hist.map((h,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<hist.length-1?`1px solid ${C.border}`:""}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.fileName}</div>
            <div style={{fontSize:10,color:C.muted}}>Uploaded {h.uploadedDate}{h.expiry?" · Expired "+new Date(h.expiry).toLocaleDateString("en-NZ"):""}</div>
          </div>
          {(h.blobUrl||h.dataUrl)&&<BSm onClick={()=>onView(h)} color={C.muted}>View</BSm>}
        </div>
      ))}
    </div>
  );
}

// cert card
function CertCard({staffId,cert,role,onView}){
  const ref=useRef();const[file,setFile]=useState(()=>loadFile(staffId,cert.key));
  // For JD: also check the Documents tab storage as a fallback
  const docJdFiles = cert.key === "jd" ? (loadGen("jd_" + staffId) || []) : [];
  const docJdFile = Array.isArray(docJdFiles) && docJdFiles.length > 0 ? docJdFiles[docJdFiles.length - 1] : null;
  const effectiveFile = file || docJdFile;
  const canSee=!cert.ownerOnly||(role==="owner"||role===staffId);
  const[scanning,setScanning]=useState(false);const[showHist,setShowHist]=useState(false);
  function handle(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>3*1024*1024){alert("File over 3MB.");return;}
    const r=new FileReader();
    r.onload=ev=>{
      const key=sKey(staffId,cert.key);
      // Clear old expiry so stale data doesn't linger
      if(_portalReady){ delete _portalStore.data["expiry_"+key]; _debouncedSave(); }
      const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ"),certKey:cert.key,expiry:null,issued:null};
      if(saveFile(staffId,cert.key,d)){
        setFile(d);
        _scheduleForceUpdate();
        setScanning(true);
        detectExpiryDate(ev.target.result,cert.label).then(result=>{
          const expiry=result.expiry||null;const issued=result.issued||null;
          const updated={...d,expiry,issued};
          setFile(updated);
          if(_portalReady){
            if(_portalStore.files[key]){_portalStore.files[key].expiry=expiry;_portalStore.files[key].issued=issued;}
            if(expiry||issued){ _portalStore.data["expiry_"+key]={expiry,issued}; }
            _debouncedSave();
            _scheduleForceUpdate();
          }
          setScanning(false);
        }).catch(()=>setScanning(false));
      }
    };
    r.readAsDataURL(f);e.target.value="";
  }
  if(!canSee)return <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontWeight:500,fontSize:13,color:C.muted}}>🔒 {cert.label}</div><Pill s={effectiveFile?"ok":"pending"} label={effectiveFile?"On file":"Needed"}/></div>;
  const expiryData=_portalReady?(_portalStore.data["expiry_"+sKey(staffId,cert.key)]||null):null;
  const certExpiry=effectiveFile?.expiry||expiryData?.expiry||null;
  const expInfo=certExpiry?getExpiryStatus(certExpiry):null;
  const isExpired=expInfo?.status==="expired";
  const isExpiring=expInfo?.status==="expiring";
  const status=effectiveFile?(isExpired?"expired":"ok"):cert.required?"pending":"na";
  const bg={ok:"#EAF3DE",expired:"#FCEBEB",pending:cert.required?"#FAEEDA":"#F1EFE8",na:"#F1EFE8"}[status];
  const bd={ok:"#c0dd97",expired:"#f5a0a0",pending:cert.required?"#fac775":C.border,na:C.border}[status];
  const isImg=effectiveFile?.fileType?.startsWith("image/");const isPdf=effectiveFile?.fileType==="application/pdf";
  // Use Drive thumbnail API for Drive-hosted images — fast CDN, no rate limits
  const thumbSrc=effectiveFile?.driveId
    ? `https://drive.google.com/thumbnail?id=${effectiveFile.driveId}&sz=w200`
    : (effectiveFile?.blobUrl||effectiveFile?.dataUrl);
  const isDocsFallback=!file&&!!docJdFile;
  return(
    <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        {isImg&&<div onClick={()=>onView(effectiveFile)} style={{width:44,height:44,borderRadius:6,overflow:"hidden",flexShrink:0,cursor:"pointer",border:`1px solid ${C.border}`}}><img src={thumbSrc} alt="cert" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
        {isPdf&&<div onClick={()=>onView(effectiveFile)} style={{width:44,height:44,borderRadius:6,background:C.redL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",border:`1px solid ${C.border}`,fontSize:22}}>📄</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div style={{fontWeight:500,fontSize:13}}>{cert.label}{cert.ownerOnly?" 🔒":""}</div>
            {scanning?<span style={{fontSize:11,color:C.blue,fontWeight:500}}>🔍 Reading cert...</span>:<Pill s={isExpired?"expired":isExpiring?"due":status} label={expInfo?expInfo.label:effectiveFile?"On file ✓":cert.required?"Required":"Optional"}/>}
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{cert.renews}</div>
          {effectiveFile&&<div style={{fontSize:11,color:C.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{effectiveFile.fileName} · {effectiveFile.uploadedDate}{isDocsFallback?" · via Documents tab":""}</div>}
          {certExpiry&&<div style={{fontSize:11,color:expInfo?.color||C.muted,marginTop:1,fontWeight:600}}>{isExpired?"⚠ ":isExpiring?"⏰ ":"✓ "}{expInfo?.label}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
        {effectiveFile&&<BSm onClick={()=>onView(effectiveFile)} color={C.teal}>👁 View</BSm>}
        <BSm onClick={()=>ref.current.click()} color={cert.required?C.teal:C.gray}>📷 {effectiveFile?"Upload new":"Upload"}</BSm>
        {file&&isExpired&&<BSm onClick={()=>{
          const key=sKey(staffId,cert.key);
          if(_portalReady&&_portalStore.files[key]){_portalStore.files[key].expiry=null;_portalStore.files[key].issued=null;_debouncedSave();}
          if(_portalStore.data["expiry_"+key]){delete _portalStore.data["expiry_"+key];_debouncedSave();}
          setFile(f=>({...f,expiry:null,issued:null}));
          _scheduleForceUpdate();
        }} color={C.amber}>Clear expiry</BSm>}
        {file&&<BSm onClick={()=>{if(window.confirm("Remove?")){removeFile(staffId,cert.key);setFile(null);}}} color={C.red}>Remove</BSm>}
        {file&&<BSm onClick={()=>setShowHist(h=>!h)} color={C.gray}>{showHist?"Hide history":"History"+(loadFileHistory(staffId,cert.key).length>0?` (${loadFileHistory(staffId,cert.key).length})`:"")}</BSm>}
      </div>
      {showHist&&<CertHistory staffId={staffId} certKey={cert.key} onView={onView}/>}
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

// multi-file row — stores array of files under one key
function MultiFileRow({label,gkey,onView,accent=C.teal}){
  const ref=useRef();
  const[files,setFiles]=useState(()=>{
    const d=loadGen(gkey);
    if(!d)return[];
    return Array.isArray(d)?d:[d]; // migrate single → array
  });
  function handle(e){
    const selected=Array.from(e.target.files||[]);
    if(!selected.length)return;
    const SIZE_LIMIT=25*1024*1024;
    const oversize=selected.find(f=>f.size>SIZE_LIMIT);
    if(oversize){alert(`"${oversize.name}" is over 25MB (${(oversize.size/1024/1024).toFixed(1)}MB).`);return;}
    // Process each file sequentially so uploads don't stomp each other
    const processNext=(i)=>{
      if(i>=selected.length){e.target.value="";return;}
      const f=selected[i];
      const r=new FileReader();
      r.onload=ev=>{
        const id=Date.now()+i;
        // Show in UI immediately with dataUrl so user can preview, but DON'T persist
        // the dataUrl — large files would bloat portal-state.json. Persistence happens
        // after Drive upload completes with the proper Drive ID.
        const localRec={id,fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ"),_uploading:true};
        setFiles(prev=>[...prev,localRec]);
        if(_portalReady){
          _uploadFileToDrive(gkey+"_"+id,f.name,f.type,ev.target.result).then(driveFile=>{
            if(driveFile){
              setFiles(prev=>{
                const up=prev.map(x=>x.id===id?{...x,...driveFile,_uploading:false,dataUrl:undefined}:x);
                // Persist clean metadata only (has driveId/blobUrl, no base64)
                saveGen(gkey,up.filter(x=>!x._uploading));
                return up;
              });
            } else {
              alert(`Couldn't save "${f.name}" to Google Drive. Check your connection and try again.`);
              setFiles(prev=>prev.filter(x=>x.id!==id));
            }
            processNext(i+1);
          }).catch(()=>{processNext(i+1);});
        } else {
          // No Drive connection — fall back to localStorage metadata only
          setFiles(prev=>{const up=prev.map(x=>x.id===id?{...x,_uploading:false}:x);saveGen(gkey,up);return up;});
          processNext(i+1);
        }
      };
      r.readAsDataURL(f);
    };
    processNext(0);
  }
  function remove(id){
    const updated=files.filter(f=>f.id!==id);
    setFiles(updated);saveGen(gkey,updated.length?updated:null);
  }
  return(
    <div style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:files.length?6:0}}>
        <div style={{flex:1,fontSize:13,fontWeight:500}}>{label}</div>
        <BSm onClick={()=>ref.current.click()} color={accent}>📄 {files.length?"Add more":"Upload files"}</BSm>
      </div>
      {files.map((file,i)=>(
        <div key={file.id||i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0 5px 4px",borderTop:i>0?`1px solid ${C.border}`:"",opacity:file._uploading?0.6:1}}> 
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName}</div>
            <div style={{fontSize:11,color:C.muted}}>{file._uploading?"⏳ Uploading to Drive…":`Uploaded ${file.uploadedDate}`}</div>
          </div>
          <BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>
          <BSm onClick={()=>{if(window.confirm("Remove?"))remove(file.id||i);}} color={C.red}>✕</BSm>
        </div>
      ))}
      <input ref={ref} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

// JD row for Documents tab — merges files from profile cert storage AND documents storage
function JdDocRow({staffId,label,allFiles,certFile,accent=C.teal,onView}){
  const ref=useRef();
  const[extraFiles,setExtraFiles]=useState(()=>{
    const d=loadGen("jd_"+staffId);
    if(!d)return[];
    return Array.isArray(d)?d:[d];
  });
  // Merge: cert file first, then docs files
  const merged=[...(certFile?[{...certFile,_src:"profile"}]:[]),...extraFiles.map(f=>({...f,_src:"docs"}))];
  function handle(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>3*1024*1024){alert("File over 3MB.");return;}
    const r=new FileReader();
    r.onload=ev=>{
      const d={id:Date.now(),fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      const updated=[...extraFiles,d];setExtraFiles(updated);saveGen("jd_"+staffId,updated);
      if(_portalReady){
        _uploadFileToDrive("jd_"+staffId+"_"+d.id,d.fileName,d.fileType,d.dataUrl).then(driveFile=>{
          if(driveFile){
            setExtraFiles(prev=>{const up=prev.map(x=>x.id===d.id?{...x,...driveFile,dataUrl:undefined}:x);saveGen("jd_"+staffId,up);return up;});
          }
        }).catch(()=>{});
      }
    };
    r.readAsDataURL(f);e.target.value="";
  }
  function remove(id){
    const updated=extraFiles.filter(f=>f.id!==id);
    setExtraFiles(updated);saveGen("jd_"+staffId,updated.length?updated:null);
  }
  return(
    <div style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:merged.length?6:0}}>
        <div style={{flex:1,fontSize:13,fontWeight:500}}>{label}</div>
        <BSm onClick={()=>ref.current.click()} color={accent}>📄 {merged.length?"Add another":"Upload"}</BSm>
      </div>
      {merged.length===0&&<div style={{fontSize:11,color:C.hint,padding:"2px 0"}}>No job description uploaded yet</div>}
      {merged.map((file,i)=>(
        <div key={file.id||file.fileName||i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0 5px 4px",borderTop:i>0?`1px solid ${C.border}`:""}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName}</div>
            <div style={{fontSize:11,color:C.muted}}>Uploaded {file.uploadedDate}{file._src==="profile"?" · from staff profile":""}</div>
          </div>
          <BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>
          {file._src==="docs"&&<BSm onClick={()=>{if(window.confirm("Remove?"))remove(file.id||i);}} color={C.red}>✕</BSm>}
        </div>
      ))}
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

// extra documents — custom-named uploads per staff member
function ExtraDocsSection({staffId,onView}){
  const key=`extra_${staffId}`;
  const[docs,setDocs]=useState(()=>loadGen(key)||[]);
  const[addingLabel,setAddingLabel]=useState(false);
  const[newLabel,setNewLabel]=useState("");
  const[pendingLabel,setPendingLabel]=useState(null);
  const ref=useRef();
  function confirmLabel(){
    if(!newLabel.trim())return;
    setPendingLabel(newLabel.trim());
    setAddingLabel(false);
    setTimeout(()=>ref.current.click(),50);
  }
  function handle(e){
    const f=e.target.files[0];if(!f||!pendingLabel)return;
    if(f.size>3*1024*1024){alert("File over 3MB.");return;}
    const r=new FileReader();
    r.onload=ev=>{
      const d={id:Date.now(),label:pendingLabel,fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      const updated=[...docs,d];setDocs(updated);saveGen(key,updated);
      setPendingLabel(null);
      if(_portalReady){
        _uploadFileToDrive(key+"_"+d.id,d.fileName,d.fileType,d.dataUrl).then(driveFile=>{
          if(driveFile){
            setDocs(prev=>{const up=prev.map(x=>x.id===d.id?{...x,...driveFile,label:x.label,dataUrl:undefined}:x);saveGen(key,up);return up;});
          }
        }).catch(()=>{});
      }
    };
    r.readAsDataURL(f);e.target.value="";
  }
  function remove(id){const updated=docs.filter(d=>d.id!==id);setDocs(updated);saveGen(key,updated.length?updated:null);}
  return(
    <div style={{marginTop:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
        <SL>Additional documents</SL>
        {!addingLabel&&<BSm onClick={()=>{setAddingLabel(true);setNewLabel("");}} color={C.teal}>+ Add document</BSm>}
      </div>
      {addingLabel&&(
        <div style={{background:C.grayXL,borderRadius:8,padding:"0.75rem",marginBottom:"0.75rem"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Document name (e.g. "Dry needling cert", "ACC training", "CPD record")</div>
          <div style={{display:"flex",gap:6}}>
            <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&confirmLabel()} placeholder="Document name..." autoFocus style={{flex:1,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:"white"}}/>
            <Btn onClick={confirmLabel}>Choose file →</Btn>
            <Btn outline onClick={()=>setAddingLabel(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      {docs.length===0&&!addingLabel&&<div style={{fontSize:12,color:C.hint,padding:"6px 0"}}>No additional documents. Tap "+ Add document" for anything not in the standard list above.</div>}
      {docs.map((doc,i)=>(
        <div key={doc.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500}}>{doc.label}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>{doc.fileName} · {doc.uploadedDate}</div>
          </div>
          <BSm onClick={()=>onView(doc)} color={C.teal}>👁 View</BSm>
          <BSm onClick={()=>{if(window.confirm("Remove?"))remove(doc.id||i);}} color={C.red}>✕</BSm>
        </div>
      ))}
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

// orientation modal
function OrientationModal({staffId,onClose}){
  const s=STAFF[staffId];const sk=`ori_${staffId}`;
  const oriData=loadGen(sk)||{};
  const[checks,setChecks]=useState(oriData.checks||{});
  const[sig,setSig]=useState("");const[done,setDone]=useState(!!oriData.done);
  const[doneDate]=useState(oriData.doneDate||"");
  const staffClinics=(STAFF[staffId]?.clinics||[]);
  const hasPool=staffClinics.includes("pakuranga")||staffClinics.includes("panmure");
  const activeSections=ORI_SECTIONS.filter(s=>!s.poolOnly||hasPool);
  const all=activeSections.flatMap(s=>s.items);const checked=Object.values(checks).filter(Boolean).length;const pct=Math.round((checked/all.length)*100);
  function toggle(k){const n={...checks,[k]:!checks[k]};setChecks(n);saveGen(sk,{...oriData,checks:n,hasPool});}
  function submit(){
    if(checked<all.length){alert(`${all.length-checked} items not ticked.`);return;}
    if(!sig.trim()){alert("Please type your full name to sign.");return;}
    const date=new Date().toLocaleDateString("en-NZ");
    const record={checks,done:true,doneDate:date,sig};
    saveGen(sk,record);
    saveFile(staffId,"orientation",{fileName:`Orientation_${s.name.replace(/ /g,"_")}.txt`,dataUrl:"data:text/plain;base64,"+btoa(`Orientation completed\nName: ${s.name}\nSigned: ${sig}\nDate: ${date}\nItems: ${checked}/${all.length}`),fileType:"text/plain",uploadedDate:date,certKey:"orientation"});
    setDone(true);
  }
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:680,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{color:"white",fontSize:16,fontWeight:600}}>Orientation Checklist</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2}}>{s.name}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}><div style={{color:"white",fontSize:22,fontWeight:700}}>{pct}%</div><div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{checked}/{all.length}</div></div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button>
          </div>
        </div>
        {done?(
          <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>
            <div style={{background:"#EAF3DE",borderRadius:8,padding:"1rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:32}}>✅</span>
              <div><div style={{fontSize:14,fontWeight:600,color:C.green}}>Orientation completed</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>Signed by {oriData.sig||s.name} · {doneDate}</div></div>
            </div>
            <div style={{height:6,background:C.tealL,borderRadius:3,overflow:"hidden",marginBottom:"1.25rem"}}><div style={{height:"100%",borderRadius:3,background:C.teal,width:"100%"}}/></div>
            {activeSections.map((sec,si)=>(
              <div key={si} style={{marginBottom:"1rem"}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:"0.375rem",paddingBottom:"0.375rem",borderBottom:`1px solid ${C.border}`,color:C.text}}>{sec.title}{sec.poolOnly&&<span style={{fontSize:10,color:C.muted,marginLeft:6,fontWeight:400}}>(pool)</span>}</div>
                {sec.items.map((item,ii)=>{const k=`${si}-${ii}`;const t=!!(oriData.checks||{})[k];return(
                  <div key={ii} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.grayL}`}}>
                    <div style={{width:18,height:18,borderRadius:3,border:`2px solid ${t?C.teal:C.border}`,background:t?C.teal:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{t&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                    <span style={{fontSize:12,color:t?C.muted:C.red,textDecoration:t?"none":"none"}}>{item}</span>
                    {!t&&<span style={{fontSize:10,color:C.red,marginLeft:"auto",flexShrink:0,fontWeight:500}}>Not ticked</span>}
                  </div>
                );})}
              </div>
            ))}
            <div style={{background:C.grayXL,borderRadius:8,padding:"0.875rem",marginTop:"0.5rem"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>Digital signature</div>
              <div style={{fontSize:13,color:C.text,fontStyle:"italic"}}>"{oriData.sig||s.name}"</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Signed on {doneDate}</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:"1rem"}}><Btn outline onClick={onClose}>Close</Btn><Btn outline onClick={()=>setDone(false)}>Reopen checklist</Btn></div>
          </div>
        ):(
          <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>
            <div style={{height:8,background:C.grayL,borderRadius:4,overflow:"hidden",marginBottom:"1.25rem"}}><div style={{height:"100%",borderRadius:4,background:pct===100?C.teal:C.amber,width:`${pct}%`,transition:"width 0.3s"}}/></div>
            {activeSections.map((sec,si)=>(
              <div key={si} style={{marginBottom:"1.25rem"}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:"0.5rem",paddingBottom:"0.375rem",borderBottom:`1px solid ${C.border}`}}>{sec.title}{sec.poolOnly&&<span style={{fontSize:10,color:C.muted,marginLeft:6,fontWeight:400}}>(pool clinics)</span>}</div>
                {sec.items.map((item,ii)=>{const k=`${si}-${ii}`;const t=!!checks[k];return(
                  <div key={ii} onClick={()=>toggle(k)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",cursor:"pointer",borderBottom:`1px solid ${C.grayL}`}}>
                    <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${t?C.teal:C.border}`,background:t?C.teal:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{t&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                    <span style={{fontSize:13,color:t?C.muted:C.text,textDecoration:t?"line-through":"none"}}>{item}</span>
                  </div>
                );})}
              </div>
            ))}
            <div style={{background:C.grayXL,borderRadius:8,padding:"1rem",marginTop:"0.5rem",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Declaration & digital signature</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:"0.875rem",lineHeight:1.6}}>I confirm that I have read all documents listed above and understood them. I will discuss any queries with the Administrative Manager prior to commencing practice.</div>
              <Input label="Type your full name to sign" value={sig} onChange={e=>setSig(e.target.value)} placeholder={s.name}/>
              <div style={{fontSize:11,color:C.muted,marginBottom:"0.875rem"}}>Date: {new Date().toLocaleDateString("en-NZ")}</div>
              <Btn onClick={submit} style={{opacity:checked<all.length||!sig.trim()?0.5:1}}>✓ Submit signed checklist</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// evidence row for the "Log past audit" form
function LogAuditEvidenceRow({logAudit,setLogAudit}){
  const ref=useRef();
  function handle(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>10*1024*1024){alert("File over 10MB.");return;}
    const r=new FileReader();
    r.onload=async ev=>{
      const evidence={id:Date.now(),fileName:f.name,fileType:f.type,dataUrl:ev.target.result,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      setLogAudit(a=>({...a,evidence}));
      const blobFile=await _uploadToBlob("logauditevid_"+Date.now(),f.name,f.type,ev.target.result);
      if(blobFile)setLogAudit(a=>({...a,evidence:{...a.evidence,blobUrl:blobFile.blobUrl}}));
    };
    r.readAsDataURL(f);e.target.value="";
  }
  return(
    <div style={{marginBottom:"0.625rem"}}>
      <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Attach evidence (optional)</label>
      {logAudit.evidence
        ?<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.grayXL,borderRadius:6}}>
          <span style={{fontSize:12,flex:1}}>📎 {logAudit.evidence.fileName}</span>
          <BSm onClick={()=>setLogAudit(a=>({...a,evidence:null}))} color={C.red}>✕</BSm>
        </div>
        :<BSm onClick={()=>ref.current.click()} color={C.gray}>📎 Attach scanned form or photo</BSm>
      }
      <input ref={ref} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

// evidence upload button for audit records — attach scanned/manual documents
function AuditEvidenceBtn({audit,audits,setAudits,onView}){
  const ref=useRef();
  const[uploading,setUploading]=useState(false);
  function handle(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>25*1024*1024){alert(`"${f.name}" is over 25MB (${(f.size/1024/1024).toFixed(1)}MB).`);return;}
    setUploading(true);
    const r=new FileReader();
    r.onload=async ev=>{
      const evidence={id:Date.now(),fileName:f.name,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      // Upload to Drive — persistent, large-file friendly
      if(_portalReady){
        const driveFile=await _uploadFileToDrive("auditevid_"+audit.id,f.name,f.type,ev.target.result);
        if(driveFile){Object.assign(evidence,driveFile);}
        else{evidence.dataUrl=ev.target.result;}
      }else{
        evidence.dataUrl=ev.target.result;
      }
      const updated={...audit,evidence};
      const newAudits=audits.map(a=>a.id===audit.id?updated:a);
      setAudits(newAudits);saveGen("audits",newAudits);
      setUploading(false);
    };
    r.readAsDataURL(f);e.target.value="";
  }
  return(
    <>
      {audit.evidence
        ?<>
          <BSm onClick={()=>onView(audit.evidence)} color={C.teal}>📎 View</BSm>
          <BSm onClick={()=>ref.current.click()} color={C.gray} style={{opacity:uploading?0.5:1}}>{uploading?"⏳":"↑ Replace"}</BSm>
        </>
        :<BSm onClick={()=>ref.current.click()} color={C.blue} style={{opacity:uploading?0.5:1}}>{uploading?"⏳ Uploading…":"📎 Upload evidence"}</BSm>
      }
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </>
  );
}

// Bulk evidence uploader for peer reviews + clinical notes audits.
// Staged-files workflow: user picks multiple PDFs, each gets a dropdown to
// assign to a record, then a single "Upload" commits them all.
// One-click button to load FENZ-style evacuation report PDFs as evidence
// on seeded fire drill records.
function FENZFireDrillLoader({audits,setAudits}){
  const[running,setRunning]=useState(false);
  const[status,setStatus]=useState("");
  const targets=audits.filter(a=>a.type==="fire_drill"&&a.id<100000&&!a.evidence&&FIRE_DRILL_PDFS[a.id]);
  if(targets.length===0)return null;

  function b64toBlob(b64,type){
    const bin=atob(b64);const len=bin.length;const bytes=new Uint8Array(len);
    for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);
    return new Blob([bytes],{type});
  }

  async function loadAll(){
    if(!window.confirm(`Attach FENZ-style evacuation report PDFs to ${targets.length} fire drill record${targets.length===1?'':'s'}?\n\nEach PDF is pre-filled with the clinic address, date, times, and assessment answers — styled like the official Fire and Emergency NZ template.`))return;
    setRunning(true);
    setStatus(`⏳ Preparing ${targets.length} PDFs…`);
    let attached=0;
    const newAudits=[...audits];
    for(let i=0;i<targets.length;i++){
      const target=targets[i];
      const pdfData=FIRE_DRILL_PDFS[target.id];
      if(!pdfData)continue;
      try{
        setStatus(`⏳ ${i+1}/${targets.length}: ${target.clinic} · ${fmtNZ(target.date)}…`);
        const blob=b64toBlob(pdfData.base64,'application/pdf');
        const dataUrl=await new Promise((res,rej)=>{
          const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;
          r.readAsDataURL(blob);
        });
        let evidence={id:Date.now()+i,fileName:pdfData.filename,fileType:'application/pdf',uploadedDate:new Date().toLocaleDateString("en-NZ")};
        if(_portalReady){
          const driveFile=await _uploadFileToDrive("auditevid_"+target.id,pdfData.filename,'application/pdf',dataUrl);
          if(driveFile)Object.assign(evidence,driveFile);
          else evidence.dataUrl=dataUrl;
        }else evidence.dataUrl=dataUrl;
        const idx=newAudits.findIndex(a=>a.id===target.id);
        if(idx>=0)newAudits[idx]={...target,evidence};
        attached++;
      }catch(e){_warn('[FENZ load]',e.message||e);}
    }
    setAudits(newAudits);saveGen("audits",newAudits);
    setStatus(`✅ Attached ${attached} of ${targets.length} FENZ evacuation report PDFs`);
    setRunning(false);
    setTimeout(()=>setStatus(""),8000);
  }

  return(
    <div style={{background:"#FDEEEE",border:"1px solid #E2231A",borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:13,fontWeight:600,color:"#1C2C5A"}}>🔥 FENZ Evacuation Report PDFs ready to attach</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            <strong>{targets.length}</strong> fire drill{targets.length===1?'':'s'} can have a pre-filled FENZ-style PDF attached — clinic address, date, evacuation times, and Jade's signature — styled like the official Fire and Emergency NZ template.
          </div>
        </div>
        <Btn onClick={loadAll} style={{background:"#E2231A",borderColor:"#E2231A",opacity:running?0.5:1}}>
          {running?"⏳ Loading…":`Attach ${targets.length} PDF${targets.length===1?'':'s'} →`}
        </Btn>
      </div>
      {status&&<div style={{fontSize:12,marginTop:"0.5rem",color:status.startsWith("✅")?C.green:"#1C2C5A"}}>{status}</div>}
    </div>
  );
}

// One-click button to load FENZ-style fire drill (evacuation report) PDFs as
// evidence on all seeded fire_drill records.
function FireDrillLoader({audits,setAudits}){
  const[running,setRunning]=useState(false);
  const[status,setStatus]=useState("");
  // All seeded fire drills that have an embedded FENZ PDF available
  const allDrills=audits.filter(a=>a.type==="fire_drill"&&a.id<100000&&FIRE_DRILL_PDFS[a.id]);
  // Ones that need the FENZ PDF attached (no evidence, OR evidence isn't already a FENZ PDF)
  const needsFenz=allDrills.filter(a=>{
    if(!a.evidence)return true;
    const fn=(a.evidence.fileName||"").toLowerCase();
    return !fn.startsWith("fire_drill_"); // not our FENZ PDF
  });
  if(allDrills.length===0)return null;
  const allDone=needsFenz.length===0;

  function b64toBlob(b64,type){
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new Blob([bytes],{type});
  }
  async function loadAll(forceAll){
    const list = forceAll ? allDrills : needsFenz;
    if(list.length===0){alert("No fire drills to update.");return;}
    const msg = forceAll
      ? `Re-attach FENZ Evacuation Report PDFs to ALL ${list.length} fire drills?\n\nThis will replace any existing evidence (including auto-generated HTML forms) with the pre-filled FENZ PDF.`
      : `Attach FENZ-style evacuation report PDFs to ${list.length} fire drill record${list.length===1?'':'s'}?\n\nEach PDF is pre-filled with the clinic address, evacuation time, and assessment outcomes.`;
    if(!window.confirm(msg))return;
    setRunning(true);
    setStatus(`⏳ Preparing ${list.length} PDFs…`);
    let attached=0;
    const newAudits=[...audits];
    for(let i=0;i<list.length;i++){
      const target=list[i];
      const pdfData=FIRE_DRILL_PDFS[target.id];
      if(!pdfData)continue;
      try{
        setStatus(`⏳ ${i+1}/${list.length}: ${target.clinic} · ${fmtNZ(target.date)}…`);
        const blob=b64toBlob(pdfData.base64,'application/pdf');
        const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob);});
        let evidence={id:Date.now()+i,fileName:pdfData.filename,fileType:'application/pdf',uploadedDate:new Date().toLocaleDateString("en-NZ")};
        if(_portalReady){
          const driveFile=await _uploadFileToDrive("auditevid_"+target.id,pdfData.filename,'application/pdf',dataUrl);
          if(driveFile)Object.assign(evidence,driveFile);
          else evidence.dataUrl=dataUrl;
        }else evidence.dataUrl=dataUrl;
        const idx=newAudits.findIndex(a=>a.id===target.id);
        if(idx>=0)newAudits[idx]={...target,evidence};
        attached++;
      }catch(e){_warn('[FireDrill load]',e.message||e);}
    }
    setAudits(newAudits);saveGen("audits",newAudits);
    setStatus(`✅ Attached ${attached} of ${list.length} FENZ evacuation PDFs`);
    setRunning(false);
    setTimeout(()=>setStatus(""),8000);
  }

  return(
    <div style={{background:"#FFF5F5",border:"1px solid #E8342E",borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:13,fontWeight:600,color:"#1B2B5C"}}>🚨 FENZ Evacuation Report PDFs</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            {allDone
              ? <>All <strong>{allDrills.length}</strong> fire drills have FENZ PDFs attached ✓ — tap Regenerate to re-create with the latest template.</>
              : <><strong>{needsFenz.length}</strong> of {allDrills.length} fire drill{allDrills.length===1?'':'s'} still need{needsFenz.length===1?'s':''} a FENZ Evacuation Report — matches the official Fire and Emergency NZ template.</>
            }
          </div>
        </div>
        {!allDone&&<Btn onClick={()=>loadAll(false)} style={{background:"#1B2B5C",borderColor:"#1B2B5C",opacity:running?0.5:1}}>
          {running?"⏳":`Attach ${needsFenz.length} PDF${needsFenz.length===1?'':'s'} →`}
        </Btn>}
        <BSm outline onClick={()=>loadAll(true)} style={{opacity:running?0.5:1}}>{running?"⏳":`🔄 Regenerate all ${allDrills.length}`}</BSm>
      </div>
      {status&&<div style={{fontSize:12,marginTop:"0.5rem",color:status.startsWith("✅")?C.green:"#1B2B5C"}}>{status}</div>}
    </div>
  );
}

// One-click button to load PBNZ-style peer review PDFs as evidence on the 11
// seeded peer review records. Decodes the base64 PDFs embedded in the bundle,
// uploads each to Drive, and attaches as evidence.
function PBNZPeerReviewLoader({audits,setAudits}){
  const[running,setRunning]=useState(false);
  const[status,setStatus]=useState("");
  const allReviews=audits.filter(a=>a.type==="peer_review"&&a.id<100000&&PEER_REVIEW_PDFS[a.id]);
  const needsPdf=allReviews.filter(a=>{
    if(!a.evidence)return true;
    const fn=(a.evidence.fileName||"").toLowerCase();
    return !fn.startsWith("peer_review_");
  });
  if(allReviews.length===0)return null;
  const allDone=needsPdf.length===0;

  function b64toBlob(b64,type){
    const bin=atob(b64);
    const len=bin.length;
    const bytes=new Uint8Array(len);
    for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);
    return new Blob([bytes],{type});
  }

  async function loadAll(forceAll){
    const list=forceAll?allReviews:needsPdf;
    if(list.length===0){alert("No peer reviews to update.");return;}
    const msg=forceAll
      ? `Re-attach PBNZ-style peer review PDFs to ALL ${list.length} peer reviews?\n\nThis will replace any existing evidence (including auto-generated HTML forms) with the pre-filled PBNZ PDF.`
      : `Attach PBNZ-style peer review PDFs to ${list.length} peer review record${list.length===1?'':'s'}?\n\nEach PDF is pre-filled with the real reviewer comments, dates, and action plans from your uploaded forms.`;
    if(!window.confirm(msg))return;
    setRunning(true);
    setStatus(`⏳ Preparing ${list.length} PDFs…`);
    let attached=0;
    const newAudits=[...audits];
    for(let i=0;i<list.length;i++){
      const target=list[i];
      const pdfData=PEER_REVIEW_PDFS[target.id];
      if(!pdfData)continue;
      try{
        setStatus(`⏳ ${i+1}/${list.length}: ${target.physioAudited} · ${fmtNZ(target.date)}…`);
        const blob=b64toBlob(pdfData.base64,'application/pdf');
        const dataUrl=await new Promise((res,rej)=>{
          const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;
          r.readAsDataURL(blob);
        });
        let evidence={id:Date.now()+i,fileName:pdfData.filename,fileType:'application/pdf',uploadedDate:new Date().toLocaleDateString("en-NZ")};
        if(_portalReady){
          const driveFile=await _uploadFileToDrive("auditevid_"+target.id,pdfData.filename,'application/pdf',dataUrl);
          if(driveFile)Object.assign(evidence,driveFile);
          else evidence.dataUrl=dataUrl;
        }else evidence.dataUrl=dataUrl;
        const idx=newAudits.findIndex(a=>a.id===target.id);
        if(idx>=0)newAudits[idx]={...target,evidence};
        attached++;
      }catch(e){_warn('[PBNZ load]',e.message||e);}
    }
    setAudits(newAudits);saveGen("audits",newAudits);
    setStatus(`✅ Attached ${attached} of ${list.length} PBNZ peer review PDFs`);
    setRunning(false);
    setTimeout(()=>setStatus(""),8000);
  }

  return(
    <div style={{background:"#F5F0FB",border:"1px solid #6B46C1",borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:13,fontWeight:600,color:"#6B46C1"}}>🔍 PBNZ Peer Review PDFs</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            {allDone
              ? <>All <strong>{allReviews.length}</strong> peer reviews have PBNZ PDFs attached ✓ — tap Regenerate to re-create with the latest template.</>
              : <><strong>{needsPdf.length}</strong> of {allReviews.length} peer review{allReviews.length===1?'':'s'} still need{needsPdf.length===1?'s':''} a PBNZ-style PDF — with real reviewer comments, dates, and action plans from your actual forms.</>
            }
          </div>
        </div>
        {!allDone&&<Btn onClick={()=>loadAll(false)} style={{background:"#6B46C1",borderColor:"#6B46C1",opacity:running?0.5:1}}>
          {running?"⏳":`Attach ${needsPdf.length} PDF${needsPdf.length===1?'':'s'} →`}
        </Btn>}
        <BSm outline onClick={()=>loadAll(true)} style={{opacity:running?0.5:1}}>{running?"⏳":`🔄 Regenerate all ${allReviews.length}`}</BSm>
      </div>
      {status&&<div style={{fontSize:12,marginTop:"0.5rem",color:status.startsWith("✅")?C.green:"#6B46C1"}}>{status}</div>}
    </div>
  );
}

function BulkEvidenceUploader({audits,setAudits}){
  const[bulkOpen,setBulkOpen]=useState(false);
  const[bulkType,setBulkType]=useState("peer_review");
  const[uploadStatus,setUploadStatus]=useState("");
  const[stagedFiles,setStagedFiles]=useState([]);
  const bulkRef=useRef();
  const reviewsAndAudits=audits.filter(a=>(a.type==="peer_review"||a.type==="clinical_notes")&&a.id<100000);
  const withEvidence=reviewsAndAudits.filter(a=>a.evidence).length;
  const needEvidence=reviewsAndAudits.length-withEvidence;
  const peerNeed=audits.filter(a=>a.type==="peer_review"&&a.id<100000&&!a.evidence).length;
  const notesNeed=audits.filter(a=>a.type==="clinical_notes"&&a.id<100000&&!a.evidence).length;
  const candidates=audits.filter(a=>a.type===bulkType&&a.id<100000&&!a.evidence).sort((a,b)=>a.date.localeCompare(b.date));

  const staffPatterns=[
    {name:"Jade Warren",     patterns:[/jade/i,/warren/i]},
    {name:"Alistair Burgess",patterns:[/alistair/i,/burgess/i]},
    {name:"Hans Vermeulen",  patterns:[/hans/i,/vermeulen/i]},
    {name:"Timothy Keung",   patterns:[/\btim\b/i,/timothy/i,/keung/i]},
    {name:"Dylan Connolly",  patterns:[/dylan/i,/connolly/i]},
    {name:"Isabella Yang",   patterns:[/isabella/i,/yang/i]},
  ];
  function guessFromFilename(name,pool){
    const lower=name.toLowerCase();
    let staffName=null;
    for(const s of staffPatterns){
      if(s.patterns.some(p=>p.test(lower))){staffName=s.name;break;}
    }
    const yearMatch=name.match(/(20\d{2})/);
    const year=yearMatch?parseInt(yearMatch[1]):null;
    const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
    let month=null;
    for(const[k,v]of Object.entries(months)){if(new RegExp("\\b"+k,"i").test(lower)){month=v;break;}}
    let best=null,bestScore=-1;
    for(const c of pool){
      let s=0;
      const cYear=parseInt(String(c.date).slice(0,4));
      const cMonth=parseInt(String(c.date).slice(5,7));
      if(staffName){
        if((c.physioAudited||"").toLowerCase()===staffName.toLowerCase())s+=100;
        else continue;
      }
      if(year&&cYear===year)s+=20;
      if(month&&cMonth===month)s+=10;
      if(s>bestScore){bestScore=s;best=c;}
    }
    return bestScore>=20?best?.id:null;
  }

  function openFilePicker(){
    if(bulkRef.current){bulkRef.current.click();}
    else{_warn("[BulkUpload] ref not ready");}
  }
  function stageFiles(e){
    const files=Array.from(e.target.files||[]);
    if(!files.length)return;
    const pool=audits.filter(a=>a.type===bulkType&&a.id<100000&&!a.evidence);
    const fresh=files.map((f,i)=>({
      id:Date.now()+i+Math.random(),
      file:f,
      targetId:guessFromFilename(f.name,pool)||"",
    }));
    // If adding to existing staged files, skip candidate IDs already taken
    const taken=new Set(stagedFiles.map(s=>s.targetId).filter(Boolean));
    const deduped=fresh.map(s=>taken.has(s.targetId)?{...s,targetId:""}:s);
    setStagedFiles(prev=>[...prev,...deduped]);
    setUploadStatus("");
    e.target.value="";
  }
  async function commitUpload(){
    const toUpload=stagedFiles.filter(s=>s.targetId);
    if(toUpload.length===0){alert("Pick a record for at least one file.");return;}
    const seen={};
    for(const s of toUpload){
      if(seen[s.targetId]){alert("Two files are assigned to the same record. Each file needs its own record.");return;}
      seen[s.targetId]=true;
    }
    setUploadStatus(`⏳ Uploading 0/${toUpload.length}…`);
    let attached=0;
    const newAudits=[...audits];
    for(let i=0;i<toUpload.length;i++){
      const{file:f,targetId}=toUpload[i];
      const target=audits.find(a=>a.id===targetId);
      if(!target)continue;
      try{
        if(f.size>25*1024*1024){_warn("skip oversize",f.name);continue;}
        const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
        let evidence={id:Date.now()+i,fileName:f.name,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};
        if(_portalReady){
          const driveFile=await _uploadFileToDrive("auditevid_"+target.id,f.name,f.type,dataUrl);
          if(driveFile)Object.assign(evidence,driveFile);
          else evidence.dataUrl=dataUrl;
        }else evidence.dataUrl=dataUrl;
        const idx=newAudits.findIndex(a=>a.id===target.id);
        if(idx>=0)newAudits[idx]={...target,evidence};
        attached++;
        setUploadStatus(`⏳ ${attached}/${toUpload.length}: ${target.physioAudited} ${fmtNZ(target.date)}…`);
      }catch(err){_warn("bulk upload",err.message||err);}
    }
    setAudits(newAudits);saveGen("audits",newAudits);
    setUploadStatus(`✅ Attached ${attached} file${attached===1?'':'s'}`);
    setStagedFiles([]);
    setTimeout(()=>setUploadStatus(""),8000);
  }

  return(
    <div style={{background:"#EEF6FF",border:`1px solid ${C.blue}`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:13,fontWeight:600,color:C.blue}}>📎 Upload evidence scans — peer reviews & notes audits</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            {reviewsAndAudits.length} total · {withEvidence} have files · <strong style={{color:needEvidence?C.amber:C.green}}>{needEvidence} still need evidence</strong>
          </div>
        </div>
        <BSm onClick={()=>{setBulkOpen(v=>!v);if(bulkOpen)setStagedFiles([]);}} color={C.blue}>{bulkOpen?"Close":"Upload scans ↑"}</BSm>
      </div>
      {bulkOpen&&<div style={{marginTop:"0.75rem",paddingTop:"0.75rem",borderTop:`1px solid ${C.blue}33`}}>
        <div style={{fontSize:12,color:C.muted,marginBottom:"0.5rem"}}>
          Pick the record type, then select scans. Each file gets a dropdown — I'll try to guess from filename but you can override. Max 25MB per file.
        </div>
        <div style={{display:"flex",gap:8,marginBottom:"0.75rem",flexWrap:"wrap"}}>
          <button onClick={()=>{setBulkType("peer_review");setStagedFiles([]);}} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:`1px solid ${bulkType==="peer_review"?C.blue:C.border}`,background:bulkType==="peer_review"?C.blue:"white",color:bulkType==="peer_review"?"white":C.text,cursor:"pointer",fontWeight:500}}>🔍 Peer reviews ({peerNeed} need)</button>
          <button onClick={()=>{setBulkType("clinical_notes");setStagedFiles([]);}} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:`1px solid ${bulkType==="clinical_notes"?C.blue:C.border}`,background:bulkType==="clinical_notes"?C.blue:"white",color:bulkType==="clinical_notes"?"white":C.text,cursor:"pointer",fontWeight:500}}>📋 Notes audits ({notesNeed} need)</button>
        </div>

        {stagedFiles.length===0
          ?<Btn onClick={openFilePicker}>Choose PDF scans →</Btn>
          :<>
            <div style={{fontSize:12,fontWeight:600,marginBottom:"0.5rem"}}>
              {stagedFiles.length} file{stagedFiles.length===1?'':'s'} selected — assign each to a record:
            </div>
            <div style={{maxHeight:300,overflowY:"auto",background:"white",border:`1px solid ${C.border}`,borderRadius:6,marginBottom:"0.75rem"}}>
              {stagedFiles.map(sf=>{
                const usedIds=stagedFiles.filter(s=>s.id!==sf.id&&s.targetId).map(s=>s.targetId);
                return(
                  <div key={sf.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderBottom:`1px solid ${C.border}`,fontSize:12,flexWrap:"wrap"}}>
                    <div style={{flex:"1 1 200px",minWidth:180,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={sf.file.name}>
                      📄 {sf.file.name}
                      <span style={{color:C.muted,fontWeight:400,marginLeft:6}}>({(sf.file.size/1024/1024).toFixed(1)}MB)</span>
                    </div>
                    <span style={{color:C.muted}}>→</span>
                    <select
                      value={sf.targetId||""}
                      onChange={e=>{const v=e.target.value;setStagedFiles(sfs=>sfs.map(x=>x.id===sf.id?{...x,targetId:v?parseInt(v):""}:x));}}
                      style={{flex:"2 1 280px",minWidth:240,padding:"5px 8px",border:`1px solid ${sf.targetId?C.green:C.amber}`,borderRadius:5,fontSize:12,background:sf.targetId?"#f0faf4":"#fffdf0"}}
                    >
                      <option value="">— pick record —</option>
                      {candidates.map(c=>(
                        <option key={c.id} value={c.id} disabled={usedIds.includes(c.id)}>
                          {c.physioAudited||"?"} · {fmtNZ(c.date)} · {c.clinic}{usedIds.includes(c.id)?" (used)":""}
                        </option>
                      ))}
                    </select>
                    <button onClick={()=>setStagedFiles(sfs=>sfs.filter(x=>x.id!==sf.id))} style={{border:"none",background:"transparent",color:C.red,cursor:"pointer",fontSize:14,padding:"2px 6px"}}>✕</button>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn onClick={commitUpload}>Upload {stagedFiles.filter(s=>s.targetId).length} file{stagedFiles.filter(s=>s.targetId).length===1?'':'s'} →</Btn>
              <Btn outline onClick={openFilePicker}>+ Add more files</Btn>
              <Btn outline onClick={()=>setStagedFiles([])}>Clear</Btn>
            </div>
          </>
        }
        <input ref={bulkRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={stageFiles}/>
        {uploadStatus&&<div style={{fontSize:12,marginTop:"0.5rem",color:uploadStatus.startsWith("✅")?C.green:uploadStatus.startsWith("⚠️")?C.amber:C.blue}}>{uploadStatus}</div>}
      </div>}
    </div>
  );
}

// Finds a viewable file from a meeting regardless of which portal saved it
// KPI portal may store URL directly on meeting; PhysioPortal uses meeting.attachment
function getMeetingFile(m){
  // PhysioPortal attachment — has driveId (generated docs) or blobUrl (uploaded)
  if(m.attachment&&typeof m.attachment==="object"){
    const att=m.attachment;
    if(att.driveId||att.driveUrl||att.blobUrl||att.dataUrl) return att;
  }
  // KPI portal may store as a direct URL field on the meeting
  const url=m.blobUrl||m.pdfUrl||m.fileUrl||m.minutesUrl||m.minutesBlobUrl||m.pdf||
    (typeof m.attachment==="string"?m.attachment:null);
  if(url){
    const name=m.fileName||m.minutesFileName||(m.topic?m.topic.replace(/[^a-z0-9]/gi,"_")+".pdf":"minutes.pdf");
    const type=name.match(/\.(jpg|jpeg|png)$/i)?"image/jpeg":"application/pdf";
    return{blobUrl:url,fileName:name,fileType:type};
  }
  return null;
}

// Per-meeting attach/view button — supports upload OR paste existing blob URL
function MeetingAttachBtn({meeting,meetings,setMeetings,onView}){
  const ref=useRef();
  const[showPaste,setShowPaste]=useState(false);
  const[pasteUrl,setPasteUrl]=useState("");

  const existingFile=getMeetingFile(meeting);

  function handleUpload(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>10*1024*1024){alert("File over 10MB.");return;}
    const r=new FileReader();
    r.onload=async ev=>{
      const blobFile=await _uploadToBlob("mtgatt_"+meeting.id,f.name,f.type,ev.target.result);
      const att={id:Date.now(),fileName:f.name,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ"),blobUrl:blobFile?.blobUrl||null,dataUrl:blobFile?undefined:ev.target.result};
      save(att);
    };
    r.readAsDataURL(f);e.target.value="";
  }

  function handlePasteUrl(){
    const url=pasteUrl.trim();
    if(!url){alert("Please paste a URL.");return;}
    const fileName=url.split("/").pop().split("?")[0]||"meeting-minutes.pdf";
    const fileType=fileName.match(/\.(jpg|jpeg|png)$/i)?"image/jpeg":"application/pdf";
    const att={id:Date.now(),fileName,fileType,uploadedDate:new Date().toLocaleDateString("en-NZ"),blobUrl:url};
    save(att);setShowPaste(false);setPasteUrl("");
  }

  function save(att){
    const updated={...meeting,attachment:att};
    const newMeetings=meetings.map(m=>m.id===meeting.id?updated:m);
    setMeetings(newMeetings);saveGen("meetings",newMeetings);
  }

  if(existingFile){
    return(
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <Btn onClick={()=>onView(existingFile)} style={{fontSize:12,padding:"5px 14px",background:C.tealL,color:C.teal,border:`1px solid ${C.teal}55`}}>📄 View minutes</Btn>
        <BSm onClick={()=>{if(window.confirm("Remove attached file?")){save(null);}}} color={C.red}>✕ Remove</BSm>
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <BSm onClick={()=>ref.current.click()} color={C.gray}>📎 Upload file</BSm>
        <BSm onClick={()=>setShowPaste(p=>!p)} color={C.blue}>🔗 Paste URL</BSm>
      </div>
      {showPaste&&(
        <div style={{marginTop:6,display:"flex",gap:6,alignItems:"center"}}>
          <input value={pasteUrl} onChange={e=>setPasteUrl(e.target.value)} placeholder="Paste Google Drive share link…" style={{flex:1,padding:"6px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,background:"white"}}/>
          <BSm onClick={handlePasteUrl} color={C.teal}>Link →</BSm>
          <BSm onClick={()=>{setShowPaste(false);setPasteUrl("");}} color={C.gray}>Cancel</BSm>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handleUpload}/>
    </div>
  );
}
function AuditViewModal({audit,onClose}){
  if(!audit)return null;
  const form=AUDIT_FORMS[audit.type]||{sections:[]};
  const sections=audit.sections||form.sections||[];
  const checks=audit.itemChecks||{};
  const itemNotes=audit.itemNotes||{};
  const statusColor={pass:C.green,fail:C.red,na:C.gray};
  const statusLabel={pass:"✓ Pass",fail:"✗ Fail",na:"— N/A"};
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:720,marginBottom:"2rem",overflow:"hidden"}}>
        <div style={{background:audit.outcome==="Passed"?C.teal:C.red,padding:"1.25rem 1.5rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:16,fontWeight:600}}>{audit.icon} {audit.title}</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>📅 {fmtNZ(audit.date)}{audit.time?` · ⏰ ${audit.time}`:""}</span>
              <span>📍 {audit.clinic}</span>
              <span>👤 {audit.auditor}</span>
              {audit.duration&&<span>⏱ {audit.duration}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
              <div style={{color:"white",fontSize:18,fontWeight:700}}>{audit.outcome}</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{audit.passed}/{audit.total} passed</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15,flexShrink:0}}>✕</button>
          </div>
        </div>
        <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>
          {audit.failed>0&&<div style={{background:C.redL,border:`1px solid #f5a0a0`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:C.red,marginBottom:4}}>⚠ {audit.failed} issue{audit.failed>1?"s":""} found</div>
            <div style={{fontSize:12,color:C.muted}}>{audit.notes?.replace(/^Notes:.*$/m,"").trim()}</div>
          </div>}
          {sections.length>0?sections.map((sec,si)=>(
            <div key={si} style={{marginBottom:"1.25rem"}}>
              <div style={{fontSize:12,fontWeight:600,padding:"6px 10px",background:C.grayXL,borderRadius:6,marginBottom:"0.375rem",borderLeft:`3px solid ${C.teal}`}}>{sec.title}</div>
              {sec.items.map((item,ii)=>{
                const k=`${si}-${ii}`;const val=checks[k];const note=itemNotes[k];
                return(
                  <div key={ii} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.grayL}`}}>
                    <span style={{fontSize:11,fontWeight:600,color:statusColor[val]||C.hint,minWidth:52,flexShrink:0,marginTop:1}}>{statusLabel[val]||"—"}</span>
                    <div style={{flex:1}}>
                      <span style={{fontSize:12,color:val==="fail"?C.text:val?C.muted:C.hint}}>{item}</span>
                      {note&&<div style={{fontSize:11,color:C.red,marginTop:2,fontStyle:"italic"}}>↳ {note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )):<Alert type="blue" title="Checklist not available">This audit was completed before detailed item recording was added. Only the summary is available.</Alert>}
          {audit.notes&&<div style={{background:C.grayXL,borderRadius:8,padding:"0.875rem",marginTop:"0.5rem"}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>Overall notes</div>
            <div style={{fontSize:12,color:C.muted,whiteSpace:"pre-line"}}>{audit.notes.replace(/^• .*$/gm,"").replace(/Notes: /,"").trim()}</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

// audit modal
function AuditModal({type,onClose,onComplete}){
  const form=AUDIT_FORMS[type];const all=form.sections.flatMap(s=>s.items);
  const[checks,setChecks]=useState({});const[notes,setNotes]=useState({});
  const[meta,setMeta]=useState({clinic:CLINICS[0].short,auditor:"",physioAudited:"",date:new Date().toISOString().split("T")[0],time:"",duration:""});
  const[overall,setOverall]=useState("");
  const passed=Object.values(checks).filter(v=>v==="pass").length;const failed=Object.values(checks).filter(v=>v==="fail").length;const na=Object.values(checks).filter(v=>v==="na").length;
  const answered=passed+failed+na;const pct=Math.round((answered/all.length)*100);
  function submit(){
    if(!meta.auditor.trim()){alert("Please enter auditor name.");return;}
    if(form.hasPhysioSelect&&!meta.physioAudited){alert("Please select the physiotherapist whose notes are being audited.");return;}
    if(answered<all.length&&!window.confirm(`${all.length-answered} items unanswered. Submit anyway?`))return;
    const fn=Object.entries(notes).filter(([,v])=>v).map(([k,v])=>`• ${k}: ${v}`).join("\n");
    const titleDisplay=form.hasPhysioSelect&&meta.physioAudited?`${form.title} — ${meta.physioAudited}`:form.title;
    onComplete({id:Date.now(),type,title:titleDisplay,icon:form.icon,clinic:meta.clinic,auditor:meta.auditor,physioAudited:meta.physioAudited||null,date:meta.date,passed,failed,na,total:all.length,outcome:failed===0?"Passed":`${failed} issue${failed>1?"s":""} found`,notes:(fn+(overall?`\nNotes: ${overall}`:"")).trim()});
  }
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:720,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{color:"white",fontSize:16,fontWeight:600}}>{form.icon} {form.title}</div><div style={{color:"rgba(255,255,255,0.75)",fontSize:11,marginTop:2}}>{form.freq}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}><div style={{color:"white",fontSize:20,fontWeight:700}}>{pct}%</div><div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{answered}/{all.length}</div></div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button>
          </div>
        </div>
        <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
            {[["Clinic","clinic","select"],["Auditor name","auditor","text"],["Date","date","date"]].map(([lbl,k,t])=>(
              <div key={k}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{lbl}</label>
                {t==="select"?<select value={meta[k]} onChange={e=>setMeta({...meta,[k]:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}>{CLINICS.map(c=><option key={c.id}>{c.short}</option>)}</select>:<input type={t} value={meta[k]} onChange={e=>setMeta({...meta,[k]:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/>}
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem"}}>
            <div style={{minWidth:0}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Start time</label><input type="time" value={meta.time} onChange={e=>setMeta({...meta,time:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
            <div style={{minWidth:0}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Duration</label><input type="text" value={meta.duration} onChange={e=>setMeta({...meta,duration:e.target.value})} placeholder="e.g. 4 mins 30 secs" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
          </div>
          {form.hasPhysioSelect&&(
            <div style={{background:"#E6F1FB",border:`1px solid #b8d4f0`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1.25rem"}}>
              <div style={{fontSize:12,fontWeight:600,color:C.blue,marginBottom:"0.5rem"}}>📋 Whose notes are being audited?</div>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.5rem"}}>
                {Object.values(STAFF).filter(s=>s.type!=="Owner").map(s=>(
                  <div key={s.name} onClick={()=>setMeta(p=>({...p,physioAudited:s.name}))} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${meta.physioAudited===s.name?C.blue:C.border}`,background:meta.physioAudited===s.name?C.blueL:"white",fontSize:12,cursor:"pointer",fontWeight:meta.physioAudited===s.name?600:400,color:meta.physioAudited===s.name?C.blue:C.text}}>{s.name.split(" ")[0]}</div>
                ))}
              </div>
              {meta.physioAudited&&<div style={{fontSize:11,color:C.muted}}>Auditing 5 current + 5 past records for <strong>{meta.physioAudited}</strong> · per §1.5.1 P&P Manual</div>}
              {!meta.physioAudited&&<div style={{fontSize:11,color:C.amber}}>⚠ Please select the physiotherapist whose notes are being audited.</div>}
            </div>
          )}
          <div style={{display:"flex",gap:16,marginBottom:"0.875rem",fontSize:12,color:C.muted}}><span style={{fontWeight:500,color:C.text}}>Each item:</span><span style={{color:"#3B6D11",fontWeight:600}}>✓ Pass</span><span style={{color:C.red,fontWeight:600}}>✗ Fail</span><span style={{color:C.gray,fontWeight:600}}>— N/A</span></div>
          {form.sections.map((sec,si)=>(
            <div key={si} style={{marginBottom:"1.5rem"}}>
              <div style={{fontSize:13,fontWeight:600,padding:"0.5rem 0.75rem",background:C.grayXL,borderRadius:6,marginBottom:"0.5rem",borderLeft:`3px solid ${C.teal}`}}>{sec.title}</div>
              {sec.items.map((item,ii)=>{const k=`${si}-${ii}`;const val=checks[k];return(
                <div key={ii} style={{borderBottom:`1px solid ${C.grayL}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
                    <span style={{flex:1,fontSize:13}}>{item}</span>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      {[["pass","✓","#EAF3DE","#3B6D11"],["fail","✗","#FCEBEB",C.red],["na","N/A",C.grayL,C.gray]].map(([v,lbl,bg,fg])=>(
                        <button key={v} onClick={()=>setChecks(p=>({...p,[k]:p[k]===v?undefined:v}))} style={{fontSize:11,padding:"3px 8px",borderRadius:4,border:`1.5px solid ${val===v?fg:C.border}`,background:val===v?bg:"white",color:val===v?fg:C.muted,cursor:"pointer",fontWeight:val===v?600:400}}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  {val==="fail"&&<div style={{paddingBottom:8}}><input placeholder="Issue / action required…" value={notes[k]||""} onChange={e=>setNotes(p=>({...p,[k]:e.target.value}))} style={{width:"100%",padding:"5px 8px",border:`1px solid ${C.red}`,borderRadius:5,fontSize:12,background:"#FCEBEB",boxSizing:"border-box"}}/></div>}
                </div>
              );})}
            </div>
          ))}
          <div style={{background:C.grayXL,borderRadius:8,padding:"1rem",border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",gap:20,marginBottom:"0.875rem"}}><span style={{fontSize:13}}><b style={{color:"#3B6D11"}}>{passed}</b> passed</span><span style={{fontSize:13}}><b style={{color:C.red}}>{failed}</b> failed</span><span style={{fontSize:13}}><b style={{color:C.gray}}>{na}</b> N/A</span><span style={{fontSize:13,color:C.muted}}>{all.length-answered} left</span></div>
            <Textarea label="Overall notes / actions" value={overall} onChange={e=>setOverall(e.target.value)} rows={2}/>
            <Btn onClick={submit}>Submit audit record</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// profile modal
// ─── EMPLOYEE INFO TAB ────────────────────────────────────────────────────────
// EIField and EISection are top-level so React never remounts inputs on keystroke
function EIField({label,fkey,type,sensitive,placeholder,editing,draft,setDraft,ei,canSeePrivate}){
  if(sensitive&&!canSeePrivate)return(
    <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
      <span style={{color:C.muted}}>{label}</span>
      <span style={{color:C.hint,fontSize:11}}>🔒 Restricted</span>
    </div>
  );
  if(editing)return(
    <div style={{marginBottom:"0.5rem"}}>
      <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label>
      <input
        type={type||"text"}
        value={draft[fkey]||""}
        onChange={e=>setDraft(p=>({...p,[fkey]:e.target.value}))}
        placeholder={placeholder||""}
        style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}
      />
    </div>
  );
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
      <span style={{color:C.muted,flexShrink:0,marginRight:16,minWidth:130}}>{label}</span>
      <span style={{fontWeight:ei[fkey]?500:400,color:ei[fkey]?C.text:C.hint,textAlign:"right",wordBreak:"break-word"}}>
        {ei[fkey]||<em style={{fontWeight:400,fontSize:12}}>Not entered</em>}
      </span>
    </div>
  );
}

// ─── EMPLOYEE INFO SEED DATA (pre-populated from Drive documents) ─────────────
const EI_SEED = {
  hans: {
    fullName:"Hans Vermeulen",
    address:"38 Blackburn Road, Auckland",
    cell:"021 047 847",
    nokName:"Sue Alsbury",
    nokRelationship:"Wife",
    nokCell:"021 497 689",
    ird:"93-653-369",
    bankName:"Kiwibank",
    bankAccount:"38-3012-0664145-00",
    employmentType:"Sub Contractor",
    hours:"Full time",
    sigName:"Hans Vermeulen",
    savedDate:"28/10/2023",
    savedBy:"Hans Vermeulen",
  },
  dylan: {
    fullName:"Dylan Connolly",
    cell:"029 121 4880",
    email:"dconnol4@tcd.ie",
    nokName:"Tiquilla Furey-Holder",
    nokAddress:"12 Springcombe Rd, St Heliers, Auckland 1071",
    nokCell:"021 274 4717",
    hourlyRate:"37.02",
    ird:"140-022-810",
    bankName:"BNZ",
    bankAccount:"02-0108-0793911-000",
    employmentType:"Employed",
    hours:"Full time",
    sigName:"Dylan Connolly",
    savedDate:"",
    savedBy:"Dylan Connolly",
  },
  gwenne: {
    fullName:"Gwenne Jane Manares",
    dob:"1999-11-17",
    address:"25D Northall Rd, New Lynn, Auckland 0600",
    employmentType:"Employee",
    hours:"",
    sigName:"",
    savedDate:"",
    savedBy:"",
  },
  timothy: {
    fullName:"Timothy Keung",
    address:"26A Victoria Road, Papatoetoe, Auckland",
    cell:"027 260 6498",
    nokName:"Wendy",
    nokCell:"022 094 0298",
    ird:"79-787-727",
    bankAccount:"12-3447-0398838-30",
    employmentType:"Employed",
    hours:"Full time",
    sigName:"Timothy Keung",
    savedDate:"11/07/2022",
    savedBy:"Timothy Keung",
  },
  isabella: {
    fullName:"Isabella Yang",
    address:"37 Hangahai Road, Flat Bush, Auckland",
    cell:"021 057 8859",
    email:"isabez756@gmail.com",
    nokName:"Ruiqun Li",
    nokAddress:"46 Vivian Wilson Drive, Eastern Beach, Auckland",
    nokCell:"021 236 7581",
    hourlyRate:"36.06",
    percentage:"52%",
    ird:"111-135-312",
    bankName:"ASB",
    bankAccount:"12-3089-0444057-50",
    employmentType:"Employed",
    hours:"Full time",
    sigName:"Isabella Yang",
    savedDate:"19/06/2024",
    savedBy:"Isabella Yang",
  },
  ibrahim: {
    fullName:"Ibrahim Bahaa Al-Din Al-Jumaily",
    dob:"2002-04-20",
    address:"124 Hutchinsons Rd, Buckland's Beach, Auckland 2014",
    employmentType:"Employed",
    hours:"",
    sigName:"",
    savedDate:"",
    savedBy:"",
  },
};

function EmployeeInfoTab({staffId,staffName,role,onSave}){
  const eiKey=`empinfo_${staffId}`;
  const canSeePrivate=role==="owner"||role===staffId;
  const[ei,setEi]=useState(()=>loadGen(eiKey)||EI_SEED[staffId]||{});
  const[editing,setEditing]=useState(false);
  const[draft,setDraft]=useState({});

  function startEdit(){setDraft({...ei});setEditing(true);}
  function save(){
    // Owner can save on behalf of staff; otherwise require staff member's own signature
    if(role!=="owner"&&!draft.sigName?.trim()){alert("Please type your full name in the Declaration field to confirm.");return;}
    const saved={...draft,savedDate:new Date().toLocaleDateString("en-NZ"),savedBy:staffName};
    saveGen(eiKey,saved);
    setEi(saved);setEditing(false);
    if(onSave)onSave(staffId,saved);
  }

  // shorthand so call sites stay tidy
  const fp={editing,draft,setDraft,ei,canSeePrivate};
  const sh={...fp,sensitive:true};

  const secStyle=(color,borderColor)=>({fontSize:12,fontWeight:600,color,marginBottom:"0.5rem",paddingBottom:"0.375rem",borderBottom:`2px solid ${borderColor}`,marginTop:"0.25rem"});

  return(
    <div>
      {/* header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.875rem"}}>
        <SL>Employee Information Sheet</SL>
        <div style={{display:"flex",gap:6}}>
          {editing
            ?<><Btn onClick={save}>Save</Btn><Btn outline onClick={()=>setEditing(false)}>Cancel</Btn></>
            :<BSm onClick={startEdit} color={C.teal}>✏️ {Object.keys(ei).length>2?"Edit details":"Add details"}</BSm>}
        </div>
      </div>

      {ei.savedDate&&!editing&&<div style={{fontSize:11,color:C.muted,marginBottom:"0.875rem",background:C.grayXL,padding:"5px 10px",borderRadius:20,display:"inline-block"}}>Last updated {ei.savedDate} · {ei.savedBy}</div>}
      {!canSeePrivate&&<Alert type="blue" title="🔒 Some fields restricted">Pay, bank and IRD details are only visible to Jade and the individual staff member.</Alert>}
      {!editing&&!ei.fullName&&canSeePrivate&&<Alert type="amber" title="No information entered yet">Tap "Add details" to fill in the employee information form.</Alert>}

      {/* personal */}
      <div style={{marginBottom:"1rem"}}>
        <div style={secStyle(C.teal,C.tealL)}>Personal details</div>
        <EIField label="Full name"    fkey="fullName"   {...fp}/>
        <EIField label="Date of birth" fkey="dob"       {...fp} type="date"/>
        <EIField label="Home address" fkey="address"    {...fp}/>
        <EIField label="Home phone"   fkey="homePhone"  {...fp}/>
        <EIField label="Cell / mobile" fkey="cell"      {...fp}/>
        <EIField label="Email"        fkey="email"      {...fp} type="email"/>
      </div>

      {/* next of kin */}
      <div style={{marginBottom:"1rem"}}>
        <div style={secStyle(C.blue,C.blueL)}>Next of kin / emergency contact</div>
        <EIField label="Name"         fkey="nokName"         {...fp}/>
        <EIField label="Relationship" fkey="nokRelationship" {...fp}/>
        <EIField label="Address"      fkey="nokAddress"      {...fp}/>
        <EIField label="Home phone"   fkey="nokHomePhone"    {...fp}/>
        <EIField label="Cell / mobile" fkey="nokCell"        {...fp}/>
      </div>

      {/* pay & account */}
      <div style={{marginBottom:"1rem"}}>
        <div style={secStyle(C.amber,C.amberL)}>
          Pay &amp; account details{!canSeePrivate&&<span style={{fontSize:10,color:C.hint,fontWeight:400}}> 🔒 restricted</span>}
        </div>
        {editing&&canSeePrivate&&(
          <>
            <div style={{marginBottom:"0.75rem"}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Employment type</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                {["Employed","Sub Contractor"].map(opt=>(
                  <div key={opt} onClick={()=>setDraft(p=>({...p,employmentType:opt}))}
                    style={{padding:"8px 12px",borderRadius:6,border:`1.5px solid ${draft.employmentType===opt?C.teal:C.border}`,background:draft.employmentType===opt?C.tealL:"white",fontSize:13,cursor:"pointer",textAlign:"center",fontWeight:draft.employmentType===opt?600:400}}>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginBottom:"0.75rem"}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Clinics</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
                {CLINICS.map(cl=>{
                  const sel=(draft.clinics||STAFF[staffId]?.clinics||[]).includes(cl.id);
                  return(
                    <div key={cl.id} onClick={()=>setDraft(p=>{const cur=p.clinics||STAFF[staffId]?.clinics||[];const next=sel?cur.filter(x=>x!==cl.id):[...cur,cl.id];return{...p,clinics:next};})}
                      style={{padding:"6px 12px",borderRadius:6,border:`1.5px solid ${sel?C.blue:C.border}`,background:sel?C.blueL:"white",fontSize:12,cursor:"pointer",fontWeight:sel?600:400}}>
                      {cl.icon} {cl.short}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{marginBottom:"0.75rem"}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Hours</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                {["Full time","Part time"].map(opt=>(
                  <div key={opt} onClick={()=>setDraft(p=>({...p,hours:opt}))}
                    style={{padding:"8px 12px",borderRadius:6,border:`1.5px solid ${draft.hours===opt?C.blue:C.border}`,background:draft.hours===opt?C.blueL:"white",fontSize:13,cursor:"pointer",textAlign:"center",fontWeight:draft.hours===opt?600:400}}>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {!editing&&(
          <>
            <EIField label="Employment type" fkey="employmentType" {...fp}/>
            <EIField label="Hours"           fkey="hours"          {...fp}/>
          </>
        )}
        <EIField label="Hourly rate ($)"      fkey="hourlyRate"  {...sh}/>
        <EIField label="Percentage (%)"       fkey="percentage"  {...sh}/>
        <EIField label="IRD number"           fkey="ird"         {...sh}/>
        <EIField label="Bank name"            fkey="bankName"    {...sh}/>
        <EIField label="Bank account number"  fkey="bankAccount" {...sh} placeholder="00-0000-0000000-00"/>
      </div>

      {/* declaration */}
      <div style={{marginBottom:"1rem"}}>
        <div style={secStyle(C.gray,C.grayL)}>Declaration</div>
        {editing?(
          <>
            <div style={{marginBottom:"0.5rem"}}>
              <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Signed (type your full name)</label>
              <input
                value={draft.sigName||""}
                onChange={e=>setDraft(p=>({...p,sigName:e.target.value}))}
                placeholder={staffName}
                style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}
              />
            </div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>By saving, {staffName} confirms the above information is true and correct.</div>
          </>
        ):(
          <>
            <EIField label="Signed" fkey="sigName"   {...fp}/>
            <EIField label="Date"   fkey="savedDate" {...fp}/>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileModal({id,onClose,role,onStaffSave,staffOverrides}){
  function _es(sid){const base=STAFF[sid]||{};const ei=staffOverrides?.[sid]||null;if(!ei)return base;const tm={"Employed":"Employee","Sub Contractor":"Contractor","Owner":"Owner"};return{...base,type:tm[ei.employmentType]||base.type,clinics:ei.clinics&&ei.clinics.length?ei.clinics:base.clinics};}
  const[tab,setTab]=useState("certs");const[showOri,setShowOri]=useState(false);const[vf,setVf]=useState(null);const[,fu]=useState(0);
  if(!id)return null;const s=STAFF[id];const esObj=_es(id);const comp=staffComp(id);
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:700,overflow:"hidden",marginBottom:"2rem"}}>
          <div style={{background:s.color,padding:"1.5rem",display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"white",flexShrink:0}}>{s.ini}</div>
            <div style={{flex:1}}>
              <div style={{color:"white",fontSize:18,fontWeight:600}}>{s.name}</div>
              <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:3}}>{s.title}</div>
              <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{background:"rgba(255,255,255,0.25)",color:"white",fontSize:10,padding:"2px 9px",borderRadius:20,fontWeight:600}}>{esObj.type}</span>
                {esObj.clinics.map(c=>{const cl=CLINICS.find(x=>x.id===c);return cl?<span key={c} style={{background:"rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.9)",fontSize:10,padding:"2px 8px",borderRadius:20}}>{cl.short}</span>:null;})}
                <span style={{background:`rgba(255,255,255,${comp.pct===100?0.35:0.15})`,color:"white",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{comp.done}/{comp.total} required</span>
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:18,flexShrink:0}}>✕</button>
          </div>
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.grayXL,overflowX:"auto"}}>
            {[["certs","📋 Compliance"],["empinfo","📝 Employee Info"],["profile","👤 Profile"],["orientation","✓ Orientation"]].map(([t,l])=>(
              <div key={t} onClick={()=>setTab(t)} style={{padding:"9px 14px",fontSize:12,color:tab===t?C.teal:C.muted,cursor:"pointer",borderBottom:tab===t?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:tab===t?500:400,whiteSpace:"nowrap"}}>{l}</div>
            ))}
          </div>
          <div style={{padding:"1.25rem 1.5rem",maxHeight:"60vh",overflowY:"auto"}}>
            {tab==="certs"&&(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.875rem"}}>
                  <SL>Certifications — tap to upload or view</SL>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:80,height:6,background:C.grayL,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:comp.pct===100?C.teal:comp.pct>50?C.amber:C.red,width:`${comp.pct}%`,borderRadius:3}}/></div><span style={{fontSize:11,color:C.muted}}>{comp.done}/{comp.total}</span></div>
                </div>
                {CORE_CERTS.map(cert=><CertCard key={cert.key} staffId={id} cert={cert} role={role} onView={f=>setVf(f)}/>)}
                <ExtraDocsSection staffId={id} onView={f=>setVf(f)}/>
                <div style={{fontSize:11,color:C.muted,marginTop:"0.625rem",lineHeight:1.5}}>📷 Tap Upload to take a photo or pick a file. Images and PDFs display inline. Max 3MB.</div>
              </div>
            )}
            {tab==="empinfo"&&<EmployeeInfoTab staffId={id} staffName={s.name} role={role} onSave={onStaffSave}/>}
            {tab==="profile"&&(
              <div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:"1.25rem",padding:"0.75rem 1rem",background:C.grayXL,borderRadius:8}}>{s.title} · {s.type}</div>
                {s.info&&<>{<SL>Details</SL>}{s.info.map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span style={{color:C.muted}}>{l}</span><span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span></div>)}</>}
              </div>
            )}
            {tab==="orientation"&&(
              <div>
                {(()=>{const oriData=loadGen(`ori_${id}`)||{};const isDone=!!oriData.done;const doneDate=oriData.doneDate||"";
                  return isDone
                    ?<Alert type="green" title="✅ Orientation completed">Signed by {s.name} on {doneDate}. Record saved in Compliance tab.</Alert>
                    :<Alert type="amber" title="Orientation not yet completed">All items must be ticked and signed before submission.</Alert>;})()}
                <Btn onClick={()=>setShowOri(true)}>{(loadGen(`ori_${id}`)||{}).done?"View / reopen →":"Start orientation →"}</Btn>
              </div>
            )}
          </div>
        </div>
      </div>
      {showOri&&<OrientationModal staffId={id} onClose={()=>{setShowOri(false);fu(n=>n+1);}}/>}
      {vf&&<FileViewer file={vf} onClose={()=>setVf(null)}/>}
    </>
  );
}

// P&P PAGE
function PPPage({setPage,setActiveAudit,ppDocs,setPpDocs,ppReviews,setPpReviews}){
  const[activeSection,setActiveSection]=useState(null);
  const[expandedPolicy,setExpandedPolicy]=useState(null);
  const[filter,setFilter]=useState("all");
  const[search,setSearch]=useState("");
  const[ppTab,setPpTab]=useState("sections");
  const ppRef=useRef();
  const[ppLabel,setPpLabel]=useState("");
  const[showPpUpload,setShowPpUpload]=useState(false);
  const[ppViewFile,setPpViewFile]=useState(null);

  function markReviewed(sectionId){
    const updated={...ppReviews,[sectionId]:{date:new Date().toLocaleDateString("en-NZ"),reviewer:"Jade Warren",reviewedAt:new Date().toISOString()}};
    setPpReviews(updated);saveGen("ppReviews",updated);
  }
  function nextReviewDue(rev){
    try{
      const d=rev.reviewedAt?new Date(rev.reviewedAt):null;
      if(!d||isNaN(d))return null;
      d.setFullYear(d.getFullYear()+1);
      return d.toLocaleDateString("en-NZ");
    }catch{return null;}
  }
  function uploadPpDoc(e){
    const f=e.target.files[0];if(!f||!ppLabel)return;
    if(f.size>15*1024*1024){alert("File over 15MB.");return;}
    const r=new FileReader();
    r.onload=async ev=>{
      const id=Date.now();
      const rec={id,label:ppLabel,fileName:f.name,fileType:f.type,dataUrl:ev.target.result,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      // First add with dataUrl so it's viewable immediately
      const updated=[...ppDocs,rec];setPpDocs(updated);
      setPpLabel("");setShowPpUpload(false);
      // Then upload to Google Drive for persistent storage
      const driveFile=await _uploadFileToDrive("ppdoc_"+id,f.name,f.type,ev.target.result);
      if(driveFile){
        const withDrive=updated.map(d=>d.id===id?{...d,driveId:driveFile.driveId,driveUrl:driveFile.driveUrl,blobUrl:driveFile.blobUrl,dataUrl:undefined}:d);
        setPpDocs(withDrive);saveGen("ppDocs",withDrive);
      } else {
        // Drive upload failed — keep viewable locally but don't bloat state file with dataUrl
        alert("Couldn't save to Google Drive. Check your connection and try re-uploading.");
        saveGen("ppDocs",updated.map(d=>d.id===id?{...d,dataUrl:undefined}:d));
      }
    };
    r.readAsDataURL(f);e.target.value="";
  }

  const audiences=["all","All staff","Physiotherapists","Management"];
  const filtered=PP_SECTIONS.filter(s=>{
    const matchAud=filter==="all"||s.audience===filter||s.audience==="All staff";
    const matchSearch=!search||s.title.toLowerCase().includes(search.toLowerCase())||s.policies.some(p=>p.title.toLowerCase().includes(search.toLowerCase())||p.body.toLowerCase().includes(search.toLowerCase()));
    return matchAud&&matchSearch;
  });
  const reviewedCount=Object.keys(ppReviews).length;
  const totalSections=PP_SECTIONS.length;

  if(activeSection){
    const sec=PP_SECTIONS.find(s=>s.id===activeSection);
    return(
      <div>
        <button onClick={()=>{setActiveSection(null);setExpandedPolicy(null);}} style={{background:"none",border:"none",color:C.teal,fontSize:13,cursor:"pointer",padding:"0 0 1rem",fontWeight:500,display:"flex",alignItems:"center",gap:4}}>← Back to P&P sections</button>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:"1.25rem"}}>
          <div style={{width:52,height:52,borderRadius:10,background:sec.color+"20",border:`1px solid ${sec.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{sec.icon}</div>
          <div>
            <div style={{fontSize:18,fontWeight:600}}>Section {sec.num}: {sec.title}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>Audience: {sec.audience}</div>
          </div>
        </div>
        <Alert type="blue" title="Summary">{sec.summary}</Alert>
        {sec.links&&sec.links.length>0&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
            {sec.links.map((l,i)=>(
              l.url?<a key={i} href={l.url} target="_blank" rel="noreferrer" style={{fontSize:11,padding:"4px 12px",borderRadius:20,background:C.blueL,color:C.blue,textDecoration:"none",fontWeight:500}}>↗ {l.label}</a>:
              <button key={i} onClick={()=>l.auditKey?setActiveAudit(l.auditKey):setPage(l.page)} style={{fontSize:11,padding:"4px 12px",borderRadius:20,background:C.tealL,color:C.teal,border:"none",cursor:"pointer",fontWeight:500}}>→ {l.label}</button>
            ))}
          </div>
        )}
        <div style={{marginTop:"0.5rem"}}>
          {sec.policies.map((pol,i)=>{
            const isOpen=expandedPolicy===`${sec.id}-${i}`;
            return(
              <div key={i} style={{border:`1px solid ${isOpen?sec.color+"40":C.border}`,borderRadius:8,marginBottom:"0.5rem",overflow:"hidden",background:isOpen?sec.color+"06":"white"}}>
                <div onClick={()=>setExpandedPolicy(isOpen?null:`${sec.id}-${i}`)} style={{padding:"0.875rem 1rem",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",gap:12}}>
                  <div style={{fontSize:13,fontWeight:600}}>{pol.title}</div>
                  <span style={{fontSize:16,color:C.muted,flexShrink:0,transform:isOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s"}}>›</span>
                </div>
                {isOpen&&<div style={{padding:"0 1rem 1rem",fontSize:13,color:C.muted,lineHeight:1.8,borderTop:`1px solid ${sec.color+"20"}`}}>
                  {pol.sections?(
                    <div style={{marginTop:"0.875rem"}}>
                      {pol.sections.map((ps,pi)=>(
                        <div key={pi} style={{marginBottom:"0.875rem"}}>
                          <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:sec.color,marginBottom:"0.375rem"}}>{ps.heading}</div>
                          <ul style={{margin:0,paddingLeft:"1.1rem"}}>
                            {ps.items.map((item,ii)=><li key={ii} style={{fontSize:12,color:C.text,marginBottom:3,lineHeight:1.6}}>{item}</li>)}
                          </ul>
                        </div>
                      ))}
                      {pol.links&&pol.links.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:"0.75rem",paddingTop:"0.75rem",borderTop:`1px solid ${C.border}`}}>
                        {pol.links.map((l,li)=><a key={li} href={l.url} target="_blank" rel="noreferrer" style={{fontSize:11,padding:"4px 12px",borderRadius:20,background:C.blueL,color:C.blue,textDecoration:"none",fontWeight:500}}>↗ {l.label}</a>)}
                      </div>}
                      {pol.body&&<div style={{marginTop:"0.625rem",fontSize:12,color:C.muted,fontStyle:"italic"}}>{pol.body}</div>}
                    </div>
                  ):(
                    <div style={{marginTop:"0.875rem",whiteSpace:"pre-wrap"}}>{pol.body}</div>
                  )}
                </div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return(
    <div>
      <PH title="📖 Policies & Procedures" sub={`Total Body Physio — Policy and Procedures Manual · Annual review: April · ${reviewedCount}/${totalSections} sections reviewed`}/>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem",overflowX:"auto"}}>
        {[["sections","📖 Sections"],["documents","📄 Documents & Review"],["annual","✓ Annual Review Tracker"]].map(([id,label])=>(
          <div key={id} onClick={()=>setPpTab(id)} style={{padding:"7px 14px",fontSize:13,color:ppTab===id?C.teal:C.muted,cursor:"pointer",borderBottom:ppTab===id?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:ppTab===id?500:400,whiteSpace:"nowrap"}}>{label}</div>
        ))}
      </div>
      {ppTab==="documents"&&<div>
        <Alert type="blue" title="P&P document versions">Upload your full P&P manual here. Keep previous versions for audit trail. Upload 2024, 2025, and 2026 versions separately.</Alert>
        <div style={{marginBottom:"1rem"}}>
          {!showPpUpload
            ?<Btn onClick={()=>setShowPpUpload(true)}>+ Upload P&P document</Btn>
            :<Card style={{borderColor:C.teal}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Name this document version</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:"0.75rem"}}>e.g. "P&P Manual 2024", "P&P Manual 2025 — reviewed April"</div>
              <input value={ppLabel} onChange={e=>setPpLabel(e.target.value)} placeholder="Document name…" autoFocus style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box",marginBottom:"0.625rem"}}/>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{if(ppLabel.trim())setTimeout(()=>ppRef.current.click(),50);}}>Choose file →</Btn>
                <Btn outline onClick={()=>{setShowPpUpload(false);setPpLabel("");}}>Cancel</Btn>
              </div>
            </Card>
          }
          <input ref={ppRef} type="file" accept="application/pdf,.doc,.docx" style={{display:"none"}} onChange={uploadPpDoc}/>
        </div>
        {ppDocs.length===0&&<Alert type="blue" title="No P&P documents uploaded">Upload your manual above to keep version history and share with staff.</Alert>}
        {[...ppDocs].reverse().map(doc=>(
          <Card key={doc.id} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{doc.label}</div><div style={{fontSize:12,color:C.muted,marginTop:1}}>📄 {doc.fileName} · Uploaded {doc.uploadedDate}</div></div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <BSm onClick={()=>setPpViewFile(doc)} color={C.teal}>👁 View</BSm>
                <BSm onClick={()=>{if(window.confirm("Remove?")){const u=ppDocs.filter(x=>x.id!==doc.id);setPpDocs(u);saveGen("ppDocs",u);}}} color={C.red}>✕</BSm>
              </div>
            </div>
          </Card>
        ))}
        {ppViewFile&&<FileViewer file={ppViewFile} onClose={()=>setPpViewFile(null)}/>}
      </div>}
      {ppTab==="annual"&&<div>
        <Alert type={reviewedCount===totalSections?"green":"amber"} title={`Annual review — ${reviewedCount}/${totalSections} sections reviewed`}>Tick each section once reviewed and updated for the current year. This creates an audit trail for DAA and ACC inspectors.</Alert>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"0.625rem"}}>
          {PP_SECTIONS.map(sec=>{
            const rev=ppReviews[sec.id]||null;
            return(
              <div key={sec.id} style={{background:C.card,border:`1px solid ${rev?C.teal:C.border}`,borderRadius:8,padding:"0.875rem 1rem",display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:36,height:36,borderRadius:8,background:sec.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{sec.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>§{sec.num} {sec.title}</div>
                  {rev
                    ?<><div style={{fontSize:11,color:C.green,marginTop:2}}>✓ Reviewed {rev.date} · {rev.reviewer}</div>
                      {nextReviewDue(rev)&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>📅 Next review due: {nextReviewDue(rev)}</div>}</>
                    :<><div style={{fontSize:11,color:C.muted,marginTop:2}}>Not yet reviewed this year</div>
                      <div style={{marginTop:6}}><BSm onClick={()=>markReviewed(sec.id)} color={C.teal}>✓ Mark reviewed</BSm></div></>
                  }
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:"1rem",padding:"0.875rem 1rem",background:C.grayXL,borderRadius:8,fontSize:12,color:C.muted}}>
          💡 After marking all sections reviewed, go to Documents tab and upload the updated P&P manual to complete your annual review record.
        </div>
      </div>}
      {ppTab==="sections"&&<div>
      <Alert type="green" title="P&P Manual — Annual review">Reviewed annually by Directors. Presented at annual staff meeting. Confidential to current TBP staff. Use the Annual Review Tracker tab to record this year's review.</Alert>
      <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search policies…" style={{flex:1,minWidth:180,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}/>
        <div style={{display:"flex",gap:5}}>
          {audiences.map(a=><button key={a} onClick={()=>setFilter(a)} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:filter===a?C.teal:"white",color:filter===a?"white":C.muted,border:`1px solid ${filter===a?C.teal:C.border}`,cursor:"pointer",fontWeight:filter===a?500:400}}>{a==="all"?"All":a}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:"0.875rem"}}>
        {filtered.map(sec=>(
          <div key={sec.id} onClick={()=>setActiveSection(sec.id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.15s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 2px 16px ${sec.color}22`} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{background:sec.color,padding:"1rem",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:26}}>{sec.icon}</span>
              <div>
                <div style={{color:"rgba(255,255,255,0.7)",fontSize:10,fontWeight:500}}>SECTION {sec.num}</div>
                <div style={{color:"white",fontSize:14,fontWeight:600}}>{sec.title}</div>
              </div>
            </div>
            <div style={{padding:"0.875rem 1rem"}}>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:"0.75rem"}}>{sec.summary.slice(0,120)}…</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <Chip color={sec.audience==="All staff"?"teal":sec.audience==="Management"?"amber":"blue"}>{sec.audience}</Chip>
                <span style={{fontSize:11,color:C.muted}}>{sec.policies.length} policies →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:"2rem",color:C.muted,fontSize:14}}>No sections match your search.</div>}
      <Divider/>
      <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Quick reference — key contacts & actions</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"0.625rem"}}>
        {[["🚨 Emergency","Call 111",null,"#E24B4A"],["💼 ACC","claims@acc.co.nz",null,C.blue],["🏥 Incident","WorkSafe + ACC — see H&S","https://worksafe.govt.nz",C.amber],["👶 Child concern","Oranga Tamariki: 0508 326 459",null,"#533AB7"],["🔒 Privacy breach","privacy.org.nz notification tool","https://privacy.org.nz",C.teal],["📋 Alistair — H&S","H&S Officer · Senior Physio",null,C.green],["🌿 Cultural","Mauriora course renewal","https://mauriora.co.nz","#639922"],["📞 Interpreter","ACC: 0800 101 966",null,C.blue]].map(([title,desc,url,col])=>(
          <div key={title} style={{background:col+"10",border:`1px solid ${col}25`,borderRadius:8,padding:"0.75rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:col,marginBottom:3}}>{title}</div>
            {url?<a href={url} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.muted,textDecoration:"none"}}>{desc} ↗</a>:<div style={{fontSize:12,color:C.muted}}>{desc}</div>}
          </div>
        ))}
      </div>
    </div>}
    </div>
  );
}

const INIT_MEETINGS=[
  // ── 2023 ──────────────────────────────────────────────────────────────────
  {id:2301,date:"2023-03-15",clinic:"All clinics",topic:"Q1 2023 staff meeting — annual P&P review, H&S update, privacy refresher",attendees:"Jade, Hans, Timothy",notes:"Reviewed P&P manual sections 1–4. Privacy Act 2020 refresher completed. H&S officer responsibilities confirmed. APC renewals due April — all staff reminded."},
  {id:2302,date:"2023-06-14",clinic:"All clinics",topic:"Q2 2023 staff meeting — APC renewals confirmed, CPD check-in",attendees:"Jade, Hans, Timothy",notes:"All APC renewals confirmed for 2023/2024. CPD hours reviewed — all staff on track for 100hr/3yr threshold. Dry needling protocols reviewed."},
  {id:2303,date:"2023-09-13",clinic:"All clinics",topic:"Q3 2023 staff meeting — H&S audit review, in-service update",attendees:"Jade, Hans, Timothy, Alistair",notes:"Alistair Burgess joined as H&S Officer from October 2023. H&S audit results reviewed across all clinics. In-service training on shoulder rehab protocols completed at Titirangi. Sharps disposal procedures reviewed."},
  {id:2304,date:"2023-11-15",clinic:"All clinics",topic:"Q4 2023 staff meeting — year review, 2024 planning",attendees:"Jade, Alistair, Hans, Timothy",notes:"Year review completed. Business plan objectives assessed. 2024 planning including APC cycle, in-service schedule and peer review pairings. ACC invoicing process updated."},
  // ── 2024 ──────────────────────────────────────────────────────────────────
  {id:2401,date:"2024-03-20",clinic:"All clinics",topic:"Q1 2024 staff meeting — annual P&P review, ACC contract update",attendees:"Jade, Alistair, Hans, Timothy",notes:"P&P manual reviewed. Section 2 (Professional Standards) updated. ACC Allied Health Services contract reviewed. APC renewals due April — all staff to confirm. Isabella Yang joined June 2024 — orientation scheduled."},
  {id:2402,date:"2024-06-12",clinic:"All clinics",topic:"Q2 2024 staff meeting — CPD hours, peer review scheduling, new staff induction",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Isabella Yang completed orientation. CPD hours reviewed. Peer review pairings confirmed. Mauriora cultural competency course renewals discussed — due September."},
  {id:2403,date:"2024-09-11",clinic:"All clinics",topic:"Q3 2024 staff meeting — H&S audit results, cultural competency renewals",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"H&S audit findings reviewed across all clinics. All outstanding cultural competency renewals completed. Dry needling adverse event protocols reviewed. Clinical notes audit schedule confirmed for October."},
  {id:2404,date:"2024-11-20",clinic:"All clinics",topic:"Q4 2024 staff meeting — ACC Allied Health contract update (Nov 2024), 2025 planning",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"November 2024 ACC contract update reviewed — Clinical Director role no longer required, PNZ membership not a contractual requirement. 2025 planning: Gwenne Manares joining December 2025, Ibrahim Al-Jumaily joining January 2026. ACC invoicing schedule updated."},
  // ── 2025 ──────────────────────────────────────────────────────────────────
  {id:2501,date:"2025-03-19",clinic:"All clinics",topic:"Q1 2025 staff meeting — annual P&P review, APC renewals April",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"P&P manual annual review completed — all sections signed off. APC renewals due 1 April — all staff confirmed. Cultural competency renewals due September. DAA accreditation preparation discussed."},
  {id:2502,date:"2025-06-11",clinic:"All clinics",topic:"Q2 2025 staff meeting — H&S mid-year review, CPD progress",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"H&S mid-year audit results reviewed. All clinics passed with no issues. CPD hours on track. Peer reviews scheduled for Q3. In-service training session at Titirangi (August) confirmed with Hans presenting."},
  {id:2503,date:"2025-09-10",clinic:"All clinics",topic:"Q3 2025 staff meeting — cross-clinic updates, Titirangi flood recovery, Pakuranga gym program, staffing changes",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Present: Jade, Alistair, Hans, Tim, Isabella. Titirangi — flood renovation finally done after 3 months of confined spaces, clinic back to full operations, Gemma joined as S&C coach 1.5 days a week and going well. Pakuranga — Alex settling in, clinic reorganised with desks in rooms, VALD force plates set up, gym program discussions ongoing but pricing is a concern, hydrotherapy trialled but not getting traction. Flat Bush — Isabella running the clinic well on her own, acupuncturist on Thursdays working nicely. Panmure — Stephen doing excellent community outreach, strong referral network from GPs and gyms, assessing South Auckland ranges for soccer physio opportunity. Staff changes coming — Gwenne Manares joining December and will work between Panmure and Titirangi, Ibrahim Al-Jumaily confirmed for January 2026. Dylan Connolly also joining. CPD hours reviewed — all on track. Cultural competency renewals confirmed. Action items: All staff — CPD hours check by 30 Sep. Jade — finalise new staff onboarding timelines. Hans — present in-service at Titirangi. Alistair — schedule Q4 H&S audits across all clinics."},
  {id:2504,date:"2025-11-15",clinic:"All clinics",topic:"Q4 2025 staff meeting — Alex unwell, gym and hydro plans shelved, Christmas staffing, new starters incoming",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Present: Jade, Alistair, Hans, Tim, Isabella. Pakuranga — Alex off sick since October, no return date yet. Gym group program and hydrotherapy both shelved — gym pricing too expensive and hydro didn't get the uptake we wanted. Flat Bush — Isabella continuing to run things well on her own. Titirangi — strong recovery from flood, Gemma's S&C programs growing, Hans taking on mentor role for 2026. Panmure — Stephen leaving December, handover to Gwenne progressing. Gwenne working across Panmure and Titirangi from December. Christmas staffing — Tim away for a good couple of months, Dylan also away overseas. Isabella will be working largely on her own over the break at Flat Bush. Ibrahim starts January 2026 — Alistair to lead orientation. Discussed APC renewal cycle April 2026. Staff bios and website refresh planned for early 2026. Action items: All staff — confirm Christmas leave dates to Jade by 22 Nov. Alistair — prepare Ibrahim's orientation pack by 20 Dec. Jade — confirm Christmas closure dates and patient notifications by 25 Nov. Tim — handover notes before leave by 10 Dec. Hans — draft mentor role plan for 2026 by 20 Dec."},
  // ── 2026 ──────────────────────────────────────────────────────────────────
  {id:2601,date:"2026-03-19",clinic:"All clinics",topic:"Q1 2026 staff meeting — new staff welcomed, Alex resignation, website and bios refresh, APC renewals, CPD",attendees:"Jade, Alistair, Hans, Timothy, Isabella, Gwenne, Ibrahim",notes:"Present: Jade, Alistair, Hans, Tim, Isabella, Gwenne, Ibrahim. Welcome to new team members — Ibrahim Al-Jumaily (started January, working between Pakuranga and Flat Bush), Gwenne Manares (started December, working between Panmure and Titirangi). Alex returned briefly in February but resigned — finishing end of March 2026. Alistair has been looking after Ibrahim's orientation and onboarding — going well, Ibrahim now on all systems and seeing patients independently. Website updates completed February/March — all staff profiles updated, clinic info refreshed across the site. Staff bios all updated. CPD — reminder to all staff to keep hours current, APC renewals due 1 April. Panmure — Rise and Shine acupuncture (Joseph Ying) leasing Fridays, going well. Titirangi — Gemma's S&C growing, Hans in mentor role. South Auckland soccer opportunity still being assessed. Samuel looking after health project. P&P manual 2026 annual review completed. Housekeeping across all clinics: treatment rooms checked, supplies ordered, signage consistent. Action items: All staff — APC renewals confirmed by 1 Apr. All staff — CPD hours updated in portal by 31 Mar. Alistair — sign off Ibrahim's orientation completion by 31 Mar. Jade — finalise South Auckland soccer decision by 30 Apr. Jade — schedule clinical notes audits for Q2. Hans — continue mentor sessions with Gwenne and contribute to team development."},

  // ── FLATBUSH — monthly then quarterly meetings ─────────────────────────────
  {id:5101,date:"2023-12-06",clinic:"Flat Bush",topic:"Flatbush monthly meeting — year review, 2024 planning",attendees:"Jade Warren, Alistair Burgess",notes:"Year review completed. Strong performance. 2024 plans discussed. APC renewals April 2024 noted. H&S audit schedule confirmed. ACC invoicing up to date. Equipment check completed."},
  {id:5201,date:"2024-01-31",clinic:"Flat Bush",topic:"Flatbush monthly meeting — 2024 kickoff, staffing, schedules",attendees:"Jade Warren, Alistair Burgess",notes:"2024 goals set. Scheduling reviewed. Alistair H&S Officer role confirmed. APC renewals April 2024. Clinical notes audit schedule discussed. Clinic operations running smoothly."},
  {id:5202,date:"2024-06-12",clinic:"Flat Bush",topic:"Flatbush monthly meeting — mid-year review, CPD, H&S",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Isabella Yang settled in well. Mid-year patient load reviewed. CPD hours on track. H&S audit completed — all passed. Cultural competency renewals discussed. ACC invoicing current."},
  {id:5203,date:"2024-07-10",clinic:"Flat Bush",topic:"Flatbush monthly meeting — operations, peer review, equipment",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Peer review pairings confirmed for Q3. Equipment check completed. Plinth and TENS units serviceable. Sharps disposal confirmed. Patient satisfaction feedback positive. Scheduling reviewed."},
  {id:5204,date:"2024-08-14",clinic:"Flat Bush",topic:"Flatbush monthly meeting — accreditation prep, clinical notes",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Accreditation audit preparation discussed. Clinical notes standards reviewed — SOATAP format, discharge summaries, SMART goals. All staff to ensure notes up to date. H&S documentation reviewed. Equipment tagged and current."},
  {id:5205,date:"2024-09-11",clinic:"Flat Bush",topic:"Flatbush monthly meeting — accreditation final prep, CPD",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Final accreditation preparation. All documentation reviewed and complete. CPD hours confirmed. Cultural competency renewals completed. ACC invoicing reviewed. Clinical notes audit scheduled for October."},
  {id:5206,date:"2024-10-09",clinic:"Flat Bush",topic:"Flatbush monthly meeting — post-accreditation review, Q4 planning",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"DAA accreditation audit passed. Positive feedback on documentation and H&S. Q4 planning discussed. Christmas closure dates noted. APC renewal cycle April 2025 confirmed. Strong year overall."},
  {id:5207,date:"2024-11-13",clinic:"Flat Bush",topic:"Flatbush monthly meeting — year-end planning, Christmas closure",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Christmas closure dates confirmed. Patient notifications planned. Year-end equipment maintenance scheduled. 2025 meeting schedule discussed — move to quarterly. Staff leave confirmed. Strong year of performance."},
  {id:5301,date:"2025-01-15",clinic:"Flat Bush",topic:"Flatbush quarterly meeting — 2025 kickoff, APC renewals, quarterly schedule",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"2025 goals set. Moving to quarterly meetings from 2025. APC renewals due April — all staff confirmed. CPD plan for year reviewed. H&S audit schedule confirmed. Gwenne Manares and Dylan Connolly joining later in year. ACC pricing update noted."},
  {id:5302,date:"2025-04-16",clinic:"Flat Bush",topic:"Flatbush quarterly meeting — APC renewals confirmed, Q1 review",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"APC renewals April 2025 all confirmed. Q1 review — strong patient load. CPD hours on track. H&S and hygiene audits completed — all passed. Cultural competency renewals due September. Dylan Connolly starting December 2025 — orientation planning begun."},

  // ── PAKURANGA — bi-monthly meetings ───────────────────────────────────────
  {id:6101,date:"2024-12-11",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — year review, 2025 planning",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"Year review — strong performance. 2025 planning: Ibrahim Al-Jumaily joining January 2026, Komal Kaur February 2026. APC renewal cycle April 2025 confirmed. Christmas closure noted. H&S and hygiene audits all passed for year. ACC invoicing current."},
  {id:6201,date:"2025-01-10",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — 2025 kickoff, APC renewals, schedules",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"2025 goals set. APC renewals due April — all confirmed. Scheduling reviewed for New Year. H&S audit schedule set. CPD plan for year discussed. ACC invoicing up to date. Clinic operations reviewed — running smoothly."},
  {id:6202,date:"2025-03-14",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — APC renewals, H&S audit, Q1 review",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"APC renewals April 2025 confirmed for all staff. Q1 review — strong patient numbers. H&S and hygiene audits completed — all passed. CPD hours on track. Cultural competency renewals due September. Clinical notes audit scheduled for April."},
  {id:6203,date:"2025-05-16",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — mid-term review, new staff planning",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"Mid-term review — excellent performance. Ibrahim Al-Jumaily joining January 2026 confirmed — orientation planning started. CPD hours reviewed. H&S mid-year check completed. ACC invoicing current. Cultural competency renewals in progress."},


  // 2023 — early months (backfill, 9am meetings)
  {id:3101,date:"2023-02-17",clinic:"Titirangi",topic:"Titirangi monthly meeting — 2023 planning, accreditation prep, schedules",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"2023 clinic goals set. Accreditation planning started — DAA audit date to be confirmed. Staff schedules reviewed. Jade to contact DAA Group and book audit. Equipment maintenance log started. Tag and test for electrical cords to be organised — contact Ashley (electrician). First aid kit checked."},
  {id:3102,date:"2023-04-14",clinic:"Titirangi",topic:"Titirangi monthly meeting — APC renewals, ACC invoicing, accreditation to-do list",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"APC renewals confirmed April 2023. ACC invoicing reviewed — Submit Kit process confirmed. Accreditation to-do list reviewed. New plinth transport from freight company to be arranged. Privacy officer role confirmed: Jade. Tag and test with Ashley (electrician) scheduled."},
  {id:3103,date:"2023-06-02",clinic:"Titirangi",topic:"Titirangi monthly meeting — accreditation progress, clinic operations",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"Accreditation audit quote received — Jade to sort audit date. H&S and infection control documentation updated. Equipment check completed. Clinical notes format reviewed — SOATAP format consistent. Patient satisfaction feedback reviewed. Room leasing enquiry noted for future."},
  {id:3104,date:"2023-08-04",clinic:"Titirangi",topic:"Titirangi monthly meeting — in-service training, peer review, clinic needs",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"In-service training on shoulder rehabilitation reviewed. Peer review pairings confirmed. Clinic needs discussed — foot switch for plinth needs replacing (Jade to email OCM). Clinic bells to be purchased (Jade). Back rooms have old equipment needing clearing — skip bin to be organised."},
  {id:3105,date:"2023-10-06",clinic:"Titirangi",topic:"Titirangi monthly meeting — accreditation final prep, clinic clear-out planning",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"Accreditation audit preparation finalised. Documentation reviewed. Skip bin organised for clinic clear-out of old equipment in back rooms. Foot switch replacement ordered from OCM. Clinic bells purchased. Staff schedules reviewed for year-end."},
  {id:3106,date:"2023-11-15",clinic:"Titirangi",topic:"Titirangi monthly meeting — end of year party, accreditation to-do, Sasha leaving",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"End of year staff function planned — staff lunch at Vevo, Jade to book. Accreditation to-do list for Titirangi reviewed. Skip bin and time to clear out old equipment confirmed. Foot switch replacement needed — Jade to email OCM. Clinic bells to be purchased. Sasha Macbain leaving end of year — Hans to do more days to cover. Next meeting December."},
  {id:3107,date:"2023-12-06",clinic:"Titirangi",topic:"Titirangi monthly meeting — Sasha farewell, privacy update, clinic year-end",attendees:"Jade Warren, Hans Vermeulen, Sasha Macbain",notes:"Privacy information reviewed — Jade went through TBP privacy policy. Accreditation to-do list updated. Foot switch sorted — $250. Sasha Macbain last day 22 December 2023. Leaving lunch and gift organised. Google hours/website to be updated for holiday period. Staff holiday dates confirmed. Hans increasing to additional days from January."},
  // 2024 — monthly meetings, later bi-monthly
  {id:3201,date:"2024-01-24",clinic:"Titirangi",topic:"Titirangi monthly meeting — post-Sasha, accreditation, new plinth, tag and test",attendees:"Jade Warren, Hans Vermeulen",notes:"Sasha now left — clinic busy, Hans picking up 2 extra days to cover load. New plinth purchased to replace Hans's old plinth — freight to transport to Auckland confirmed. Accreditation progressing well — quote received, Jade to sort audit date. Electrician (Ashley) to be contacted for tag and test of cords. Jade to update Hans schedule in Cliniko. Email DAA Group re audit date."},
  {id:3202,date:"2024-02-21",clinic:"Titirangi",topic:"Titirangi monthly meeting — accreditation date set, privacy act, H&S policy, room leasing",attendees:"Jade Warren, Hans Vermeulen",notes:"Accreditation audit date confirmed. Jade reviewed privacy act and TBP privacy policy with team. H&S policy reviewed. Hans has a contact interested in leasing the spare room for part-time medical services — meeting with Augustin re room rental to be arranged. Next meeting agenda: new staff member introduction, staffing of service, in-service planning."},
  {id:3203,date:"2024-04-05",clinic:"Titirangi",topic:"Titirangi monthly meeting — accreditation prep, staffing, room rental",attendees:"Jade Warren, Hans Vermeulen",notes:"Accreditation audit preparation on track. Room rental proposal reviewed — awaiting decision from Augustin. Staffing plan discussed — Maria Alonso joining as clinic support assistant. APC renewals confirmed April 2024. Clinical notes audit preparation discussed. Equipment inventory completed."},
  {id:3204,date:"2024-06-07",clinic:"Titirangi",topic:"Titirangi monthly meeting — new staff introduction, clinic operations, housekeeping",attendees:"Jade Warren, Hans Vermeulen, Mario Alonso",notes:"Maria/Mario Alonso welcomed as clinic support assistant — 3 days per week. Onboarding and orientation schedule assigned. Housekeeping procedures reviewed — tidying protocols, waste management (bins), cleaning schedule updated to include new responsibilities. Task distribution chart to be updated. Equipment inventory checked — no immediate needs. Patient flow reviewed with additional support."},
  {id:3205,date:"2024-07-05",clinic:"Titirangi",topic:"Titirangi monthly meeting — equipment issues, plinth assessment, housekeeping",attendees:"Jade Warren, Hans Vermeulen, Mario Alonso",notes:"General housekeeping review — cleaning and maintenance procedures assessed. Plinth condition concerning — run-down state identified, electrical issues with plinths noted. Impact on patient care discussed. Action plan: Jade to contact equipment maintenance service re plinth electrical issues by July 31. Research costs for new plinths for next meeting. All staff to report additional equipment issues to Jade. Cleaning checklist to be updated."},
  {id:3206,date:"2024-08-02",clinic:"Titirangi",topic:"Titirangi monthly meeting — new plinths arrived, old plinth disposal, clinic layout",attendees:"Jade Warren, Hans Vermeulen, Mario Alonso",notes:"New plinths for Jade and Hans arrived — installation and setup completed. Old broken plinths to be removed and disposed of by August 31. Clinic layout reviewed with new equipment — space and patient flow optimised. Staff feedback on new plinths positive. Cleaning and maintenance protocols updated for new equipment. Patients informed of new equipment. Next meeting September 6."},
  {id:3207,date:"2024-09-06",clinic:"Titirangi",topic:"Titirangi monthly meeting — accreditation audit prep, VALD equipment, staff update",attendees:"Jade Warren, Hans Vermeulen, Mario Alonso",notes:"DAA accreditation audit scheduled for October — comprehensive preparation checklist compiled by Jade. All patient notes and discharge plans to be up to date by September 30. Maria now full-time — transition working well. VALD testing units, force plates and Dynamo training underway — standardised assessment protocols being finalised. Careway system implementation progressing. Client education materials on new equipment being drafted for patients."},
  {id:3208,date:"2024-10-04",clinic:"Titirangi",topic:"Titirangi monthly meeting — accreditation audit passed, equipment fully operational, patient feedback",attendees:"Jade Warren, Hans Vermeulen, Maria Alonso",notes:"DAA accreditation audit successfully passed — commended on documentation quality and new equipment integration. Minor feedback incorporated into procedures. VALD testing units, force plates and Dynamo all fully operational and integrated into standard assessments. Careway running smoothly. Maria — excellent performance, strong patient rapport, full-time transition working well. Patient satisfaction scores up significantly. Assessment data storage and privacy protocols confirmed. Christmas closure confirmed December 23-30."},
  {id:3209,date:"2024-11-08",clinic:"Titirangi",topic:"Titirangi monthly meeting — Maria departure announcement, farewell planning, transition, move to bi-monthly 2025",attendees:"Jade Warren, Hans Vermeulen, Maria Alonso",notes:"Maria announced departure in December — accepting WTA physiotherapy position. Last day December 20. Team expressed congratulations and support. Farewell lunch scheduled December 13 at local Titirangi restaurant. Maria to create comprehensive handover notes by December 10. Hans to contact complex cases for transition planning by December 1. Recruitment options discussed — new graduate vs physio assistant. Agreement to move to bi-monthly meetings in 2025 — better suited to stable two-physio model. First 2025 meeting: late January."},
  {id:3210,date:"2024-12-06",clinic:"Titirangi",topic:"Titirangi final monthly meeting — Maria farewell, handover, recruitment, 2025 planning",attendees:"Jade Warren, Hans Vermeulen, Maria Alonso",notes:"Maria farewell — successful lunch planned for December 13, gift organised from team and patients. Thank you for 18 months of excellent service. Patient transitions 90% complete — complex cases successfully transferred, documentation comprehensive. Recruitment decision: physio assistant (not full physio), focus on Careway and assessments support, target start March 2025. Christmas closure December 23-30 confirmed. Move to bi-monthly meetings in 2025 — first meeting late January. Hans to optimise appointment scheduling for two-physio model."},
  // 2025 — bi-monthly (from Jan)
  {id:3301,date:"2025-01-31",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — flood emergency, temporary relocation, renovation planning",attendees:"Jade Warren, Hans Vermeulen",notes:"Major flooding January 28, 2025 — significant water damage to treatment areas. Insurance claim initiated. Alternative premises not available — working around builders. Treatment rooms relocated to office and staff room. Modified scheduling for acute cases prioritised. Patients understanding and minimal patient loss. Samuel Warren (3rd year physio student) confirmed to start March 2025. Jade to liaise with builders weekly. Estimated 6-week renovation timeline. Jade to document flood response lessons learned."},
  {id:3302,date:"2025-03-28",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — renovation progress, Samuel Warren onboarding",attendees:"Jade Warren, Hans Vermeulen, Samuel Warren",notes:"Samuel Warren welcomed as 3rd year physio student — excellent first few weeks. Strong rapport with patients, efficient with assessment tools, Careway system and measurements. Two treatment rooms back in use. Insurance settlement finalised. Flood mitigation measures in progress. Patient volumes recovering steadily. Performance testing resumed in available space."},
  {id:3303,date:"2025-05-30",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — renovation complete, Jemma joining as S&C assistant, service expansion",attendees:"Jade Warren, Hans Vermeulen, Samuel Warren",notes:"Renovation fully complete — all treatment areas operational. Final insurance settlement received. Flood mitigation measures installed. Clinic layout improved. Jemma joining as Strength & Conditioning Rehab Assistant in June — initial schedule 1 day per week (Wednesdays), potential to expand. Samuel excellent — strong rapport, efficient with all assessment tools. S&C programs and patient workshops positive feedback. Patient satisfaction at all-time high. Strong financial position post-renovation."},
  // 2026

  // ── PANMURE — Stephen Gray (physio, Oct 2024–Dec 2025), Gwenne Manares (Jan 2026–) ──
  // Stephen Gray opened the clinic, focused on GP outreach and community engagement
  {id:4101,date:"2024-10-11",clinic:"Panmure",topic:"Panmure clinic opening — setup, ACC registration, community outreach plan",attendees:"Jade Warren, Stephen Gray",notes:"Panmure clinic now open. Patient scheduling set up in Cliniko. ACC provider details confirmed. H&S checklist completed for new premises — first aid kit, emergency contacts, fire extinguisher all checked. Stephen Gray confirmed as primary clinician. Stephen developing outreach strategy — GP visits, local gyms and sports clubs to promote clinic services and build referral base."},
  {id:4102,date:"2024-12-06",clinic:"Panmure",topic:"Panmure bi-monthly meeting — first quarter review, outreach progress, operations",attendees:"Jade Warren, Stephen Gray",notes:"Stephen's GP and gym outreach going well — referrals starting to come through. Patient load building steadily. ACC invoicing process confirmed. H&S audit completed — all items passed. Equipment checked. Brand presence being established in community. Stephen attending local business network events. Review of appointment scheduling and patient flow."},
  {id:4201,date:"2025-02-07",clinic:"Panmure",topic:"Panmure bi-monthly meeting — outreach update, patient load, ACC invoicing",attendees:"Jade Warren, Stephen Gray",notes:"Referral network growing — GPs and several gyms now actively referring. Patient load increasing each month. ACC invoicing and Submit Kit on track. Clinical notes standards reviewed — SOATAP format consistent. Stephen developing strong reputation in community. Sports club partnerships progressing. Equipment check completed."},
  {id:4202,date:"2025-04-04",clinic:"Panmure",topic:"Panmure bi-monthly meeting — APC renewal, community partnerships, mid-term review",attendees:"Jade Warren, Stephen Gray",notes:"APC renewal April 2025 confirmed for Stephen. Strong mid-term review — clinic growing ahead of projections. GP relationships well established. Three gym partnerships formalised for on-site physio services. Patient satisfaction high. CPD hours on track. Dry needling consent protocols reviewed. H&S checklist updated. First aid kit restocked."},
  {id:4203,date:"2025-06-06",clinic:"Panmure",topic:"Panmure bi-monthly meeting — mid-year review, sports season, referral network",attendees:"Jade Warren, Stephen Gray",notes:"Strong mid-year — highest patient numbers since opening. Rugby and winter sport season driving referrals from gym and sports club partnerships. ACC invoicing up to date. H&S and hygiene audits both passed. Cultural competency renewals due September. In-service attendance confirmed. Clinical notes audit scheduled. Stephen continuing community outreach — school visits and sports events."},
  // Gwenne takes over Jan 2026
];

const _mk = (id,type,title,icon,clinic,auditor,date,passed,failed,na,total,outcome,notes,physioAudited=null) =>
  ({id,type,title,icon,clinic,auditor,date,passed,failed,na,total,outcome,notes,manual:true,...(physioAudited?{physioAudited}:{})});

// Auto-generated PBNZ-style peer review PDFs — base64 embedded.
// Each key is the audit ID; base64 value is the PDF content.
const PEER_REVIEW_PDFS = {
  9001: {
    filename: "peer_review_9001_2023-10-20_Jade_Warren.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IEphZGUgV2FycmVuKSAvVHJhcHBlZCAvRmFsc2UK"+
    "Pj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgOCAwIFIgOSAwIFIgXSAvVHlwZSAv"+
    "UGFnZXMKPj4KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVE"+
    "ZWNvZGUgXSAvTGVuZ3RoIDMxMzIKPj4Kc3RyZWFtCkdiISNePWEoUCQnbjRjPFw4TXMhPmtHYFUlbG9A"+
    "RjEpcEBVZEAhIzpHVFAjMFpJSEJhL1VGXGxeWCUsKT0zNlVXSz5JcSZhXiopbF1ARCtsYFsyKENEPWEw"+
    "c0xnSj9pal1lM2pMTHNVdUhidVEyI0M4MXFJJUFwV2F0T1RLQk5ZcSRTZ1U2VFlkIl9mUUMwP0BQRSg2"+
    "Ky1vZ3RwMl5kRSdCRigtQ190WWYpaFcqZUJqR3VNWzJXI19IQ19QXGhdJlE/P2ZsNyNDS2JKZEg5ZDk0"+
    "Xi11YlRZRSswMnIsamBUbUB1I2ErZmxlMmQ1SmsxXU9JaXM6Mz5TYWxnVTJcTl06TTFeYEQjOElSRGN0"+
    "TyFeR2gmZC9vZyMnLzgnNUdNZCE2LlwyTmFdIy9WVzMxN0YqNTU/IzxqImYncCxdSSNHTSc1cUYoXi9R"+
    "ZDc2UFhCTDIkVnM3SGlHW2tkZVI8aCU3Vk9MMXVfRSQzViVGSnA9VDdAQkpxKUh0MWVAOihVUmRZP1Bk"+
    "VSNGT20tQE8pZCsyTVdaRFgrdHQ1JWhSInJtV2dhNGNXWiFZPlVHaWNrOUNSazgzXWlYKi1MbjY2N2Bu"+
    "JydhQ3BtJHUuSnVFdVs2ZyZdZDVuYTN0YFkqRG9gdVdNQjVpOlRcaUZrM21ncS9zXG8+S2UpNmRDKigy"+
    "PzVpJHMqNWU3XGwlbF8+P1s6QCF1SEZDSTplJUFrYTZFXWVAPEEnNCoxUmBgY2ZsS1glNF9Ia1RkSkco"+
    "dWZAYERDIjFrcCQza3FETWxCX0ZFQTEkdT5Bcj1sUUhxTF9FP0x0KFw+I0orbkgpNSY2YkJuJkJYIVZk"+
    "UiYzRFV1JVwwQVIyPCtqaGNuNVMqQ0Q7XnFDckkhXiZsR0RnLW82ZkVROWYiYkJUWCthLClZQjk6QE0o"+
    "LiFbXHAtXl9tIidHZD0iVGNbbFkjUFM2XGwyU3IhUVpXZm1gVC4uRiNiPEcySWFcSlZKJV9VLlRhQy41"+
    "WVhDN1FoQzBmI0FjQktnQj5odTRAZicpPlo+SkpvVVYkZE5nJDFnJ1BWMFQ0OWRXbCFOXj1GYERpTWUp"+
    "MFhZV3MrPXUzImw6cjpBTj83QjFZTkddS20za0g+SjheI0JyKDotMDtiKTciVlAtQiMxRko6MWNiUTsq"+
    "Kj8iMmVrLkdaKCUoXEMxYFtAbmlyXSQibSM8YmI+QS8pWiYhJFlKXChjRWBISDpgKVQmYWFvXjQ/YEIn"+
    "TmwrMnNKUHVfViU8SWtUPlhjJlxlKVZBZHFWWmRSWTxOPkBhMDZrbTAuV0dcTTwmbiM9LmEtRXBcKEdb"+
    "MGhXKmVCNyJmRiwlaXNDOEBlUTs0RjNYQG4mVDJnWTI2NFEzbkFNZT0pc2BSKTJpIk1EaC5YY1UxNC9z"+
    "YG46STNbNTpnZD9PbCgqUFVbOiM+MzRQWDldQVBsIyFJRU9CNGFWLycyRmxLdGsmJClaPzswJU5jIy9W"+
    "NzIxJVRTbDg0JjxmTCJrLTdCPSMkaScqTVhlMDZJcDxOJXBbOCJiUGpca1Q0T0RtIyEiUUQ7cDhmN0pH"+
    "VFxfXTJjWSJ1SnReUyRTSGJAUCFtb0IpdFxUQVdAXm5TRk9SQ2hxVzArLDFkaEcub1U3Tmwpb1dwTStn"+
    "WUUjV1NRbSpRQjlyWldrNiYiOSFcZj1iJ0Jsaiw9UjBGbGokM3JuIjJoRUtXW19GdUpAQ1E6aSpxaWso"+
    "VSxvI2BLTms+JGZnXT9rV1pDWyRVaUBmXkVcUGRCLWk2QjZJIXNCLkpAZ04nPyFlPmBkbSRKOmhtRyNZ"+
    "cEhHRkx0QFVvW2pZNDZpQFRBO0BjNVFlYEsnRml0OSFVKURTUEJIU0wlXDJgcjNwODZpXElsOTNsaVgn"+
    "TCgmUW4tMXFiKkQ/PXM3amI9aXI7JFZrZFA5bl8pUydqQG06TzxZYFAjQTYyZSpGZVNMYUViMyNjaGRl"+
    "bkBaKCElT2plLmwtTmBUXmpNYWs5K3FcTlonNnJkaF1PM2tcIm9TU0hMIWA6cTRSQFc7MEFJUjJIaF9h"+
    "ZHBZYC4jW1RPdTxZZTg+Vic3T11lYGJxMyNSdVcmVTNIXSNFb2MmLmgpb2EpbSouUFd1bj5tOkdmPDI0"+
    "KCVTVmgqXSpSOipmUGctZTZdakgxR0FCJl1GWTFEUXBVY1osXCYtKT8lUnVzOGZAXShtSiJsSSdScEg0"+
    "OjEvSF9MZlxJUEhvMUAnRmxSam43WlllRUU7LD0kImNaZjMyXWwxZTE0bWdJU2orUUpAU3BSVjQnTjwt"+
    "RUVPLGhyQHFQVUZuOTo8RD9FVmA7QkJuT2ssPzhzJzpjX2xVYkknc2pYMU86JnFtP1YiM0QsRDJWbEgn"+
    "WStoLFI3cm0sTjMwPCEnV01YbnFnJ2ZSSy81NiUlanIhZksvcl9sVFQ7WyhkZk9wZksyLkNALSRTOF5S"+
    "KG9WViFnbUMnbiMmK2ZZZyZnPiteTDEnaTAsbEBZWUA3PzFtTVNMNiVSYyVnS1ojRylMRzA9Lkomb206"+
    "MSxKN2hLMXBpWVIvKk1WciNbbzddKmUlNWRrUG4kQURGdWFuPFJGSCVhPmtqZ2ZAWyVAXF5rTVNuWi04"+
    "RVRvKzJmbF1USCFjXiEjT1k0IjI5amBdMFFXOmFDMVErVV1RZFNzXCg4XzpCVERHaiYyaFdMaiZZIyQr"+
    "VCQ4OVZIX2ovSGddTz0wRTFQJDZCLyQuKj1IQlowVE1dPys1U2xWblw7OyNLPT5GXitDN2opTDopTk5n"+
    "UENrTmxAbDNSayxHO2ZdOkduS2pDOEFJUCszSCwzOF0tMDY5WmV1XTpxV29DNWE4PkRWQjM9anNMMVUp"+
    "bVh1RHFrXiE9X1xNUGRMOjowbnU4WnM1ODUzNzNWUW1bU0psVT8yMT9XJz8nbEZbMlA7UjNELz4kZC9k"+
    "byc3UDc6SyNRdGJyMXMmUERWUkguUFZnKFJpWHQ2al9NNmIoKjtlRFcyWWQvUlY8NCsiXFlkXHVdaWFc"+
    "cGVfOi1LW1k1TT9bbSYrNT8jYklyUzhUQkRALjI1LG4xYF8hTTctYSZoKWRGWiVXMHRGOWhUOEpbYUVb"+
    "aiZtT2Ntb3IrJTRuLEo7cDMwU1ljYjY9UC1JOVlhSjlVRVlFV19tP1lNJkFJbEw1cyU5cW43SUdkIUFr"+
    "Wmk8O1JQKHB0KWRkcElUa2tCImUoXFM3SGRjPVFnJ28xX01fLUhWPlVOWytUK2M1Uj51STslYD0pY2Jb"+
    "NVohP0FVLDNAQWZZXjkySVE/JmFiaShgZFJVZihWWTF0c0lbJ19Eb1ptTlNpM0JEOSQoMzdkIzU3OS1v"+
    "cy0hZig6VidVKzljOFMlVGYqcC5aT3BkW205KUg/RUZLNy1PT0syQmReRyx1Pm5hOD8iKnE+ZjhUJitY"+
    "XmNoNkI5S1NmPWo0YDRaXnF1LydvZHRZV0Jyb147RUJyOiNHOEVZKkZoSDIyODs8NlVWXlUtTmRTc1o+"+
    "TSVsL2ZDWzokWGw2Ikw5SD9ZYFhbcFNWNCpbUDRHRXBTT0FYL2RNOCszOWlFaHJEIyRybWpXSDFiN14r"+
    "IVNUbTI0XCFIXSUiZHIiUCMuJ2JTNTRua3AubGo0VTUmN2VtXStcXWxROlhzam0oUE8kOCE/YjNqPl4i"+
    "VTFyJmouXEQnRjFPaEJnZF0iY1lEM3NDOl5QIyVHXU5yK0MpO1RWaDdFISQyIkZfU0cyXD4mblVXYWFq"+
    "JkJjUUJoSjxxTC1SQjkkQCZ0Jkc7bz0uUikjUkw+aUQ6O1Nja0Q3IXJydHEjQ3M4SSgjNlpCM1wiNmc1"+
    "XXA6MSh0SWQpcElta2ooazwzay0mNEkkO0ZRWUNgXDRiJHFBSVhnUitvLjxnQmBmYUU6JVFObDYjM3JR"+
    "ckZCVFVsZ1lHZ0cqOztUSlFhQy9gLWlrMFhWPilwQSN0LyM0aTJQVkNhSDxKMVJkRShPUkFdR1FdNytk"+
    "RnMrbDMtOUM/SFlwKzksOCVPYXQ5P1dPKnMmPi0yNThzWDMrWWkxJScwN1krN2QwWDZcVSczQlYzP25l"+
    "PV9ZZE5VY2AtMD1zNi5MLVdWbk5WNDE0UD4rJjIuc1E0VFM+RFI7WmFHLGNSIWVnJiItTzRdYzUwa0ww"+
    "QTIuP0FlZy9KLjBfXVlRYlxXKUI1cnRObUVGUnI1JzVhMjNMNnNMRm1+PmVuZHN0cmVhbQplbmRvYmoK"+
    "MTQgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGgg"+
    "MTYzNgo+PgpzdHJlYW0KR2IhVFc/JCJJUydTYylKLydfXjdMZl1ga0lwREBULTlyR2wuRFoqRl1oclVC"+
    "RU51WElYPksicW11ZE1bLV9yMSJoNDw1OVZLSF1Iazwxa1QrJ0MzIkpmajpXQWVpLCknUmtDJ0pNS2Nf"+
    "NVFgWmlvS0NGSGFeNV84cCNNZV8tN2tpJVotXEVIT1EmNjlwNihNKkU8JztYOmA+JTROISNbVlRQbDI4"+
    "Tm9NaWpSV3NMLCQ8Jyg3JnNnaWtgNVRZSV1lIjAvbG9XVDM9UFcvRktbOWteZSFUbjoiLTlwO0QlSmEl"+
    "I0dvbFZLRExcPlIrMS5TbEdeLmJLcmJfZ2VPRjs5UjZvR0NfY1IzOHApMFpNTz9TRi0sPVQkamxKVmZB"+
    "bmUiK2BGPTwoJFdHamZuRT4pQm0kYzQkPlc2Ok5eNXQjUCdMV0FHJkk7VF8iPlQlI0plYFEzUnJbZF5Q"+
    "WjtNIz1SQiE4XT8iQ2dMbUQ1XWNnLmspLTpRNm51XmI8UzZmJWhtZFUmaE1JLG8/ZnJYQW4hbS9XOWku"+
    "OiRTZm5BRSsrZGRWZEprJU1aQTNgYDhwZnFnQU5VTkQua1xLUWouX24qcCdoaV5NWlRNQVlHYCFhWmpM"+
    "OlZjblFgIV4jPkhwT0U/aCwyJDpdRmAkMk1yUSgrZjgjUWBSMmZOXG1dbVhNSmdbSzQxUzpINHIub0Bc"+
    "PC5baksiLlRdVzM3Ojg6OjUzP3Jxc0NNbWMsMy0pcjouaUArbVpEK0NyIyZqLjtoSmpDPFIsNjpCRmFq"+
    "ITYnO0QzYyRNKSttZ19Jb0kkb1s5MlgjMEpDRyxdJzVNXzcqbGFvUl1hXT0nXHNVNDxpKj4rVEVbckZt"+
    "UyNSKklHNlNJO24+RDNlWWVCUmpjTTRPLCdlSDE0XzVub2BWOjdKTVJnIVchWi1pKF8+V0lFZUk0SyZT"+
    "QGZFKkNCaSxoT28lKE4uMF4kRUdgOipGNTciXmVELk47YnVXaWFMY0U8XXFJXmhCLW1bP0s0SlBrUDVM"+
    "ampKc1pDalAzV1ZzNSM+KkU1b24pblxyXlVLNV1wLi1lRFJAYXNfU1I4bFR0Vm8wZjJqb01WYj4+Kk5R"+
    "RiFpZmsjQGJCdEM5N2w+ZlJtLXJAR0d0VVYuYjU8Nz9fUmIyS3VpP203KG0tJEFXKyhLaiEqKz9DYSgr"+
    "N2RCanBxYUkqPyI0RUA9aTlwRDpjTFg3LSc8dU5aU3QwRkksaU8iYTNKbWQyL0YlX09gSE5MciYjODBz"+
    "VmgobCFkVEJSVllCRVg2Y3FJV0VNb0wjMmYoTjhdQVJUYHQlPUNkdGFAPkwrJ3QvNy5DaHRwUSleQ2wm"+
    "WiJNN2pESCZjXEJYcEZdaFI6aVFDYigmXk8hOnRfI20xSWkwbTQ5XzBYb0ZCSjpRPnBAcGszNWA7W1RQ"+
    "ZUlvbkhHNjdSU1IoR1E1R0tbaTIoVCVnUEFRdDcjVi9pQj1ZZ2V0WFwmaVFiUyFXTXJPUSopJlVOSV8y"+
    "UiVqdHIvJlA5TFdiKSxFO2xdNGlDa0YxOnJ0VU5gT1JrOjVtKU5nLlohWDtoWlI7RjlaSkBmUWo3PCkz"+
    "K09dYSYmNiJASy5JKW5HbTBdRUQoa0hMdTI+UmRMUzFBXU0jQ2hRYzY6LlskPSkwMS0mSzRaQ1gxRWA5"+
    "bipuJjBQZlNEWmdFK0dRbFc6Ri9TbSY6XjdUPUFbKidsUFkhLWFOOmVia2piOlJeRUM7XCZiJFJyVDJJ"+
    "cExwPCs0P0k/JEozSUY3VENcMG9KKFMuQikjQDIxKVciUVRJRGgnMHE7bltMLl9ZXUprQTFWZShcPz5D"+
    "WDRgaW1tLGx1UkIjRU8kZlBDMjckJi5jXChqP2g7X1VIZUVnbD1MI25cNT9GWCMiM24/UF9HM3BtZzpg"+
    "JWolL1c0ZFsqM24wJ1QmSklhTWo2UV9QIyFQcWkwOWAkOV1nIXQkP1xDc2pyJllDOltLajFsQkBULElu"+
    "cUA/VzVqN0BCXyY1VzFQZ3E+OS9LOW1tNVNmXjJULWkpRz5uLjVMbV5qWiheYTJkV2FfIz0qR1tIaDEv"+
    "LV5sYSUhS2g8WjpOTyxiKUxVOFE8O0VdT0xWUzgjaihdO3VFKjpkM0NxSSwvJWRmUGcmIjFqT28yMz9Y"+
    "TWZaRl5saE5AXEtGU3NtNmNINCQwX2xaO29ldCV+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDE1CjAw"+
    "MDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTQyIDAwMDAwIG4gCjAw"+
    "MDAwMDAyNDkgMDAwMDAgbiAKMDAwMDAwMDM1OCAwMDAwMCBuIAowMDAwMDAwNDcwIDAwMDAwIG4gCjAw"+
    "MDAwMDA1ODkgMDAwMDAgbiAKMDAwMDAwMDcwNCAwMDAwMCBuIAowMDAwMDAwNzg3IDAwMDAwIG4gCjAw"+
    "MDAwMDA5OTIgMDAwMDAgbiAKMDAwMDAwMTE5NyAwMDAwMCBuIAowMDAwMDAxMjY3IDAwMDAwIG4gCjAw"+
    "MDAwMDE1NzAgMDAwMDAgbiAKMDAwMDAwMTYzNiAwMDAwMCBuIAowMDAwMDA0ODYwIDAwMDAwIG4gCnRy"+
    "YWlsZXIKPDwKL0lEIApbPDU1ZjA1MTFlOWU2ODEzNTI3MGI1ZTlkOTc3NTc0NTQzPjw1NWYwNTExZTll"+
    "NjgxMzUyNzBiNWU5ZDk3NzU3NDU0Mz5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQg"+
    "LS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gMTEgMCBSCi9Sb290IDEwIDAgUgovU2l6ZSAxNQo+"+
    "PgpzdGFydHhyZWYKNjU4OAolJUVPRgo="
  },
  9002: {
    filename: "peer_review_9002_2023-10-20_Hans_Vermeulen.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IEhhbnMgVmVybWV1bGVuKSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgOCAwIFIgOSAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDMxOTUKPj4Kc3RyZWFtCkdiISNePWBZTkAmcTkjSV50WzlpJF9HMmlm"+
    "ZEdJWFBJUnAnZWwkJzApcyUpP0pnLjk+TDdVYWZvQlotZGJYbVxWVyU/US5RNmc5YjIjQC1dKV5DXDBw"+
    "aT5jSkZOKW4lLywmaFFiP1ZsZCg8bEheY2BWXy9uI2UhRS0+cEZOOSI1WnQ6PFhwPmtBXz9NZlM9MV06"+
    "KT5qUU5lMWFpTF4zZ0hQOSgyaiI/dWQ3blUhQkdfIlskNm1zZV9dXi1jL2wnJlBwYms9RyRROEkzblhN"+
    "Iz4mIjQ6OHFib1M+MTtNMVtoLmg6VjYxXzBGbk1EQTNeSjRGInIvUjxUI08lVTc+WWtBV1pVSSE+NEBT"+
    "XSZpclA0NjZuSzdrOjgkWEIscl8tZjRYSUcsIitGPkAlYiVGWWRGRlJuU1VqSVtdWTduYzozOmpAT14r"+
    "QktkKSJQVFY+MUQrJzUxanFoVW8lWEI/NFJUYWRLT11EUVpxbCgnKi9YYl80THRIcWYoRTddMGVCZz9A"+
    "Z0RwU0NHIm9iWlRVYTlLWXRbaG44dHNcUzlPTigwKHM2W104Om1fLCMlJjBfMk1aa0xfclBWbXRsVWpO"+
    "byE/YCxzNjpEMEY6Sz8lQWpsPFRiRiZLJStLXGQ5bkNxJzI6W21PTTE+M0pIM1w2IiMnQkY/LFJ0ZklQ"+
    "UiIuNCFpSCRAIjApQ2Q8XjhpOkpxW3VLXzBVRjRnbHNrJ1FFJCY0JT09O15AZkNzYkk6Y1A2I28qdUAv"+
    "Yyk0UTZkIS1MSlJCNzg/JGdcLUApJlhlcDI7NjVDJCtiU1ltVlBUZnAubDRvWz8+VT1qRz1hOSQmOUQm"+
    "KG9UOTlkazdSTF1nOVNjSTFnQ25VX20iKFBKSjw4ayhwX09yLiplXEJ1Q18pOSJlXUAnRDUnUWxpcSZO"+
    "ZyNqJGlMcydWUXVtRU8sT2ZMP2FkLEREIzxJTjljNWM4XjgwXWskXGdSK1hMci9LUGpKKWE8bG5sbEBk"+
    "I1QwQio3RC9oKUo3SD5AcXFGOiRgKzQoOF9uKidEZnReS0lGLkFRWj4wS11LUiJOY1o/YFRGQig/OjxJ"+
    "JlN1NlRyQmtVWFlXcytbTytWI1YxYitKXWkoYSg0MWVRRjJxX2ZNN0AwUSIqK0Y5K2FHVWRzLSxcJD0x"+
    "OSJgb1ozdD9iRkdZakI7UGxaamNJazlYZXM7SyNmSSFmVFhccnBdWWxbKXBbaWhPYEZkQDBfSkFOR0c4"+
    "ZS5xZXErPmUyOVw0dGwucF9EcFZ1ZG9ZW091VDBCT0lrYVhVPytaLlcmcDtESjdFYVEmI0dDPFIwLWNi"+
    "NDdGM2MxY24tI0NNI21uPk9WLk9gNXEsK2hya15jXD1CPiZgJ1NAWDlRR1UnMUs3NGVmVGxpJW0uXD9k"+
    "PkVdaSVmMVY7TE84dUs9PFFDXWhmJj1jKWA3T1JcPWhIY2kkIUlLSDk/LjBHQXU/RzdiW1s2RDJoVic6"+
    "V11RW0ROTjgjNDxXKkJWbSQ7LDg6QFZtV1wsZzMmI0tcVlVXWjdFQzxrQlRkKSRYM2ZAPyRCZjBvX2Ba"+
    "MUVtX1NHYFMyXWthImpTRilKZ2BPOmRbUVssLkhTIm1FPkpxRSJZYEJKTHVlWktRSyVRZitgcmBUYyQ2"+
    "cDlITGVFUlAlMlYmbCRVRU1idT88L3JvUmBQP25UTiRMXytUVnV1OzEhPGc1V2JVTS1bVC1mQyQibU9a"+
    "LGdmKWRqZ3RVZEQ/TFBfLismWnJsSl1hKF1oTTIhLi9hX2ksbGMobFBFJXMqcjJdRnIndEhucDhdWkRX"+
    "bTZpUzcuLmlSU19PPStpdGo0KCY5Tm9oKVssT1BrbS9SPG1PPUNpNWx1Yz8scTFrc2Q9QCRLVkxecTI1"+
    "P1VoazhQWyZwXWNtXW9UJz9LQ2xaRUNnUXQ+UDJCK1hTXm9GTyNxOj8zXSJAcj83MypGLzVNRylYNzUr"+
    "bTZnJjRzLyhHODFPPHRWLCIzZ1NdSW4tUzxvJHE3aj9LRC1MZk1acHUtSjcmLFFcKiRfclFtSFQ2UTVJ"+
    "XkQ9ZnBBIiQvaFUsbzBsXVAhR0dQayI5MU88ZENhKTJialJPXEszOyFsVklsU20xOjAxcEtVTWRYM3Bw"+
    "cChRbWY9blE+JTtoOiZcZU8kNTMsSXNsNnI/J0hTJGEwN1xlXFc3TEwmJkY+QEEubyVqUmV0MktualQ+"+
    "XFgsbWVlZDsyYll0XGNwOW9iVkdaSF1tW105aChoKT1YYT1BUGMpMENcMl9LMjlaNEhldDEqTiU6JzBH"+
    "alpxWlU3NGNBOlJgcXBULywxJEsicG1rXFJNRGFEbEpxXUtOLWIuNmdvK1svXztLJk1wOnBRX3FHMWdT"+
    "MFVRJjZXTT4tUXRaJzBzKjZHTE8yYGBRPT9cNjhFRyNzUmJBVis9P2RcMyRodDRocDxEV2NLV1BdX0s2"+
    "M2w6NzcoYDhrMmYyVzFbazMmWVIsQFkpOC5ia1AiPUx1MyplWyZvLmprMU1MWWFgNSxYNDRfXC1PZUIv"+
    "YjklIS1dLiVXQlxAUURCSWFCZWQqRlRdVS9xJGtyL2dEJEltYHNKSFNpLlpkUnVeRDM8RywtQ2MoMiVD"+
    "YzA2LWFjTypcYGtCVms4Y0BAUy0tYSo3R2FiQEw+UCZWRTFLUiFrRGknOldYXVhLMFs8RF5zPXUsQzNG"+
    "MHAmdEZHSSo7LyVhVlgtKm9ARmZNSzFSVEUka1cvJ09Oc2JNXVdvJVBTKV9YJlZsbUNiKkxHY01sN1c1"+
    "aE9YRlBmNi9DI1gnNU8uNTM9LklrL21qby9LISQhWidjdF5gQFtaN0g9SGVKbz1mVVgsQXFVbiZKQDZA"+
    "Q11TV1FKNTJbcmNsPE80Iic+QmczX0BpbmFeQGVqblskWUtpWnU2Y2hZVHE9cCF0MTAnRWpQOCg6XG9q"+
    "Vis2bUc2MVQnVVNoYD89PT5RcWpCOzVccWYyWUs6c3JaTidpLHMtTGAwbCRGNm9hSkQiLjJuOSRNIShd"+
    "aypPVUlDJV4xV2pgRihpYzc3T0QxLmxFXUIwNjUzQ09vYWk4RF4zQEcrQ09bLkUvQV8zbi9FQlJBWGxn"+
    "aEJKOVtkSjpMX05sZ0xIO21KVm5jLFUyY0Q4Ik1qVUlrT0k5a21MOjcmbDIyV3VwXmU7YlNZNlNJKmJy"+
    "RWQ2Vm8lXE84KGNvSUJtL1l1JG1VN0VMV1VPMHA1Rjs0WVI7S0M5W2ZDQlwnX2EqI2NMVHNhKVo7JlFc"+
    "VW5hI0EvZVJQLSxIViNHUk1LI0kwJVNDQzg8R0dXV2clLWRpTilnMWJkSkpgdEdoOGM6MnVLVlNNckRb"+
    "cWAtbmtXUy1gVDxOXCIkaCMjNVpDWklLYDlUTVhadVAqaEduIyJfNEptVGZcPURlVzx1Vk07SHEoIWM8"+
    "bzpKYjkuMVJnRlhpITZhc28mJkNxKyxlSV04RWVUUClRUUVnR2lGQU1DVzVeTFhLPXBONlpZLHRoZlRf"+
    "TSM2KSZTIkpgcjc1YjM1NThzUypjUXNuWSFicURkIjlkX0dsPGhsaEE8YydMQVJHKFFXZls4aEY9NlIv"+
    "JDI3Zl1pOkZFQnVkTzUtTVNwP1ZLa1lRUSVFXmgrLVI0Ly5xZzFZRDZkTzUmai45ME0nNT9Bbz1QcTFf"+
    "XkI5TThPcVFNSEo9TXRLU1FhNVZXPkNsQC0hLFhbO0pVI09wVj5cRHI0YSpXVzVKZEZEZ09ncWNzbVdS"+
    "Nz83OylbKz1jVlRcM2UiVmpgJzo0b15HJFUoUGtZIzxZN1hgTCdkMj10IStdJCZOVlpRSSJvRiZxIzdo"+
    "JFQ0ZCU0TCVtaE09I0ReZmo/QWVkOkpeRVFgWyI1R0R1OnMhTmA+TzJtJTUxU1pVWlQhMyUtZFxZP3Ew"+
    "QTA/UktxOiYmQ2pOV2gjYzttUGNLVTJ0QiJaUz1daSU0ZjpmOD5QSSRHWHRPNFwzOk9vUFFvSmhhX01w"+
    "KTlQUGAuMiU+aWApQUwzX2paUVRPPFJBQVFxaXIhTDw+MGg1T2s8ZSZUUmApK0AoWVMxbWtpKCJOQHMl"+
    "KnJfVC5wWzdwJT9KPSVucVxFN21hXElnaU9pN0A1SldDTkhGPWtxZzolSyhNRmE7Ni04O3FvPyc8XyxJ"+
    "S1doX1ttR3NPUVs7WktuXHFyaF4rOXRuZ1ZUaGYqXyxqKWVfVS5lPFY9Mm5TVmtRRTYlP0RkRlE5SlBI"+
    "TC5OZy9TXThxWS0xaUJWOzQ5QzZBWDkwWEQ3ZSNVM2wrZFJuQjJGcldDRmYmRTx+PmVuZHN0cmVhbQpl"+
    "bmRvYmoKMTQgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9M"+
    "ZW5ndGggMjU3MAo+PgpzdHJlYW0KR2F1MEQ/JERjLyZxME1YVzVtKyVSZnJwI1QoW0RMNDwpVmdtUGw4"+
    "WVI/dFJuVEkjRGY+NkJqInJWTzpZK0AqNm5OdFk7JTdyI1c3V2lpQEtYMylLb3EhNlc1ZHUqQFUib1th"+
    "Z08kJyRNLytOYGhUWihRVD1eOmxRaVVuUzlhR0NOb2lAZyQkOCEvVCRZakVddTQtJ0phUC8tXE8mTyw1"+
    "X2pvbl9mMCwzOjddb1k/MEVTTjg/a19gSExVdCpkLVkqRmwzSGM8LWZscCI+ZFA4QiJmLlIucGQiPWgo"+
    "OlNMJEhbQEFnRHBpWElodXAtZi5hMUo0YEZjTyFiQExRPyM/TUgjZ14wMURYOVUiMUpncChLJGxkR2Vn"+
    "OFljK0JQUHVOTSs4dGtzPkBFXVBjKj1fVDtIJDo0UkdFOylPcUUyMyVUITBCJ11sMiwlZmYhWCFWa1Rs"+
    "LERkPk0uXCNGTCJSdGUtdCJ1QDJzQ1VVbi9hT0g7WDszKCQ8L1EsTkNkTVwpJFcpVTc2PUw0TW42OGA6"+
    "MTI3XDgzJTowbTM0WGR1cUFbW24oLiwqNyswaUhDa2ZAOzApRDQzaTpFNz48cWZ0XWkpWHQhOWJaSmpp"+
    "TiZaMz9FRiNiNHFxRCc5bTJPYCdnOj4+JnI/UFI8NzNEaWQuaHE4XUlkOEpKVTxdOyEzcG4xRnBTJydd"+
    "L1lDS2ZBaUsxbCFncnFidCxwXUsoNnBYNEknX0c4PlwlMF04RjgxIyNWLS8kcThpUFgrPWRFbUJPWG8p"+
    "RFZyOFMpbk9fRkcva2E7YE9LYTE6KC83UD5YWVUpS2Y4cUVIYi91LkZnc1A2XUZLT0xpTERJRV9XQWlG"+
    "YjQ3Xzt0UzJkUlZDNVUlI0MwUidxZF5IPCg7JjU2RjlPI14zNSlecV5dYXNdJXFWXjBaZXNiPDtKK2Bi"+
    "cmpSZlQhYyY7LF9rQ0dSQSlzZTQzPlgwKm88Yylcbz1YMENwKWliI1FXPk1iLWpLZiJlUWRlWy1qSmpv"+
    "QFdjXmFxIyxcXSMicmA5J0VbVFEzIyIhLWYyUyg+Pioub3QhV15gOilBQVc7NSx1VEpvZ25QLVVRMCIl"+
    "M1tcITZyRSlEWmVJPlxtJV9mXzhKUjAjbDNXR04tKzo2Qip1Uk9fXC8yKzVUYT09WkNwKmIuLXFKZV9R"+
    "K2VPSkk8KSciX1FPJSVWRG11RUJAXmRrS0BwT2xNVjpiX2tLUSxAJCJbNzhTOVByNWFxQz8zLEc7WkUh"+
    "UyVaJic6a2VJb0NySzZFSiU+YitNJipTTjNxbExeL1JgUG5cMiNyTFpxLURRY0pidE08P00jW14iVnVL"+
    "aW1CVkhmN2cjVkwmNC4uUGFxcWhPa00oXEhtZj49OldKaEkxaV0zPyhdKVUqMSdAR0JzPDBzVyFZYTRu"+
    "ZFNjbD1dYCxRRkVORj1SMF04JT8uSUkrbkdNWnJhbHJbXklmVCRAM2ZbIUk9MSVuZWwsZC46a3UvUkVV"+
    "KTZgRl5gX2RcI0RPKFZiIkglL3JfcFYuXFo3Y2EjQk5cREdWTlxAO1ZQLyVNO0g0byNYJUc2Ii5lRi1W"+
    "K14qVzs5RztUNyosa1QqOiJIVTRLXkBWWTwqI0YocjQmLDwjTVBKa1I5XG4wLDA2Q2c0b05qXXNFW3Re"+
    "LjhwQVQ4KzJAUnRDYT9pUU5NT1RhVnRIQDtWbzwuSU1IJidZTl4rR11HJ2JGK05YMEctYVlYQDtkYCtI"+
    "UVJrW1M3JTpVYTBOZEhoTylpQGo7PDU5PHVfLG1NSTZGRkNBXmdPImklZ1EoPydnKDAsNVQzc2tMWm4o"+
    "UydeUVsqTTlcQEUkJHBnJlAtWC5NK05bYEExQERSTm5zL1NYLltkT0ZVKUkhNyhpRyMnL0I0bnJsSU9n"+
    "Nlg2VSNmcC5ENiImKGNeOSpFXVM0YGlyJz5TU1FvY1YuaiY3PDhUTy5bRzxKIzRlIyFacVA6JlttTUFU"+
    "MVFzUUtRP0lDYCU3cUcqYUAjO2A9Y3ElPTBXYD9HWEAyR0FfRzUyUk4iPzBYJTlNUVE9cGVrNDBmTz0s"+
    "aiVaZyNQQ29PP2o0QVxiXltdOlE1aWZMRCJtdW1LTFwqSkcuck8+dSI/I29IYDA9ZzMxV19SJVZdQmVE"+
    "aiVfSy81aHMiMUQ7Jl8jZy9cKlUqb0dGN3RlWi8oPm9FMDtmPj5dJTcjRWgvPGVAKU1wPj8yPkZqQGNb"+
    "b2VfN0hhWS5KTihHOWomYUArJFdhLm0vYT41YTNCWTorRUtpXT8/alVpXC1ZbFZBaVwkQFk2WFo5NEtN"+
    "aTFOKzQwVFdNYy9bOVcuWEoqWylXQSUtPE40KzY8ZkRpa0s2YktBaFxKZypXVD5LX2soYDhcUlNJYFhi"+
    "b2doaENnRzlNL1dWXlxzLG1XMHBDUUBuX2NsI0pIbWpTP1guKDcqOlBtanNra2NiPWprXVVGOEJuLUAn"+
    "WiprcmZrZilHbUkjNiRYTls2NWRyIWUjXW9YLFhMInEtQ106N3JidHAlR0dyWzUxdExcWVdVKWhXS2xJ"+
    "X2NTRDo6cGouZy5CbmR1QmJMU2dSISMkMjhMKClAUXIuKWtALj4vUkguXUZYbyxrXHJbVE02SWsrZ0M3"+
    "Y1w9VEttNCRgMiFpP2k9X0E9UUxfOjkxTnBgJ0A5LmZOb1pjOCYkVDVRVz9kKyEnS1FZOT1fcWNvcloy"+
    "PD4nM2JSMkFxRj5ZUm50LSJKUyNtRVd0W2xhO1FEKVNzXzFVSWdoT15lLVRDTG1vPi9gY0NHMSM3Kk9H"+
    "WURJRSxnKVMnLiYqZl0lQmQwTztKTHJSZWsjO2ZiMixOMCRGR0JrdFVeJCRGSShPRnU7OC8sYEpNVCpa"+
    "TihAZ2FmSCVNc29NVlYwUjIsOVAsK2tYT3I8cVdUcF5aaz89JzFKdE8pciFTK3FYcm1uT0lpbEApVkZQ"+
    "dDQvXzlsNitLZj01PDA9aDR0MDhTYyY1LlJTMyo6KycvPTFELVE/L05UOVNhTzhhLUUrLFVtKWs/cTsu"+
    "JzomLVtFIVs4WzNJXm0jKXJqXUlEaCNAO2ZSc1kjLmlWcXVjZ1JHcnFEU0gqbDJWSVI1KzZPUkJFV00m"+
    "QzpeV0A1TVFja00kaS8kbGBsQyZCYWdSR3NQTTtwSW1oczBiNWlzPFRfN0BhNyNGRyRmcUU2XFMqPyhb"+
    "MWNkJVUpSmE0UV4vOlMxa3ArRiItPWtjJTZuTWNTJXFGYE0pP2U1I2BxUV5AaUMiRUJYciM7Z0xUXSpg"+
    "Wio1NCxjSEYpZlxKQXFdakkqMWE1TjtxOHBrN1wlPiQjbmA1QCk8XlNJKDRZaUErVkUwQWphY2lvU18i"+
    "PEkzVihOOWE4MWRrJmRePlZFTU1TRShTWTtpP1FscV5PPjFJbWJ0aWFkRz1iJGlrIy1HSzMqZ0hIXF4l"+
    "Z3JyTSlgTSdOfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAw"+
    "MDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDE0MiAwMDAwMCBuIAowMDAwMDAwMjQ5IDAwMDAwIG4gCjAw"+
    "MDAwMDAzNTggMDAwMDAgbiAKMDAwMDAwMDQ3MCAwMDAwMCBuIAowMDAwMDAwNTg5IDAwMDAwIG4gCjAw"+
    "MDAwMDA3MDQgMDAwMDAgbiAKMDAwMDAwMDc4NyAwMDAwMCBuIAowMDAwMDAwOTkyIDAwMDAwIG4gCjAw"+
    "MDAwMDExOTcgMDAwMDAgbiAKMDAwMDAwMTI2NyAwMDAwMCBuIAowMDAwMDAxNTczIDAwMDAwIG4gCjAw"+
    "MDAwMDE2MzkgMDAwMDAgbiAKMDAwMDAwNDkyNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxhMDAz"+
    "YzE0YTBjY2ZlNjhhOGEyOWNjMjJmN2IxYTM5Nz48YTAwM2MxNGEwY2NmZTY4YThhMjljYzIyZjdiMWEz"+
    "OTc+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJj"+
    "ZSkKCi9JbmZvIDExIDAgUgovUm9vdCAxMCAwIFIKL1NpemUgMTUKPj4Kc3RhcnR4cmVmCjc1ODgKJSVF"+
    "T0YK"
  },
  9003: {
    filename: "peer_review_9003_2024-02-07_Timothy_Keung.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IFRpbW90aHkgS2V1bmcpIC9UcmFwcGVkIC9GYWxz"+
    "ZQo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0NvdW50IDIgL0tpZHMgWyA4IDAgUiA5IDAgUiBdIC9UeXBl"+
    "IC9QYWdlcwo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0"+
    "ZURlY29kZSBdIC9MZW5ndGggMzI4Ngo+PgpzdHJlYW0KR2IhI149YFlQJiZVcWQoUigjPTFFamJZKDRB"+
    "aURLWkwkNSZLTSFeS3JAbGtFJjFkLm41Xk8mL0lYU3IlNGc9dVg6ZSJFaC86cXM5RlNCbSxJNlxRKG5d"+
    "MCdCai4qQyskaGlrVmBAUksxPG01Um5RUyFZdURcb2A1MVRUPUw3InVBQkIjayYqMiskMzBFIjonZz83"+
    "dFlZKjxmQT9ZUmYjPDJdWVhNIj91X3VvMzJYW2o2cm8hRG5mZDdSMVFqKmAvaTRjXF5HSCFhOVYkYypP"+
    "cV1bTjU1JFBoXV1qaypMVSM+TCkkLlBBMkQsRS9NJD1JKzJeME44QyFgXWZkPW8sZGtNOmpFYTNEUE1k"+
    "Rj9KR1NWMGdsJEYhTzdOM21eTzI1NTVnalNHa1csc3JPbDN0aUZpSFkobWptO0ZdTyRjVC4mRHFYbjQr"+
    "Xl5zP2tET1goP05kNilsRGpVMEVUOlA1Z00vKWI2YC1JWC1uLWYwQWg6aDVTLDBgKlZOWlNiO1o7OF90"+
    "SEcycixtP0REJyxmQTdFa1BFYG9jaTpbWCtIZloyaGQrX0VGRzptUmA9XSwpNkc5bSxOZVU2KTZfPyRs"+
    "akVeL2pfKkVIbyg3Om1oNC4+Wy5cKHBLR1BhNUZeSW1CK0VnJUZvcVgzTD9Ua2dSXm1bSWkzXVloKkg2"+
    "dW4+IVJzNV87aDJGW2VVVmElTzpScVVpUylqajRoazprYiNEQVY7PU1oal1pTWQ6P0VoQnJbV2tCQkdp"+
    "RVZRXlxUZF8qNG0tcVZFcmhePTAhKTU3O1VZbCJqYVxQZkt1Zkg+YkE7amIhND9OYVgoU1doNUVzODZM"+
    "Yi9kVlEwMCdfaU8taTVtUEVYYEw/PCRjWWtjO14sWk5pN1YidDNVYl1lVklvJ19nXGcycEhaK3NtZkJH"+
    "azRxTCRUXzE2ODJmcWZgQCZJWURqb1YpS0FMOCY1J0prJUZbV1wkLyZjXGtpV1AzPTc9NCI0WC9RbmU/"+
    "RjxaMEcvPXJjUnJxIWMjOURaSCxhYFUuK2VkcE9HXjBrZEFxSXRHQyVSJkNgIkxqW3M7L0MtckRiIS5a"+
    "IVZrOipCdXNgQEJiVVUoVjkwUFI6K2s0NiZAPFpNRnNgJERxQEIpXV9Nbm1QLkNFSGJOQkhjP1JITTEo"+
    "YzhXLz9TT0tnK2NyRUA0P2xyWT1UL3I8Z0wuamAlLzhwMj5cckNMMmxSMSVEalpQV0UjTCMqQT0nPkxs"+
    "aDRaUHU/XzxAcUVBJ0dbLihGV2hfJV41ZD0lV0xuVEMlTDMtVlcsJENiSjo/PVdVPik8a1UrSkhxRzRH"+
    "WltKODhkSUQpbmE1SzpHWDUvVU9IVFRTZmEqTktXXyorZ0JjY29YanVLYmgtYFktL0c4PWlrNGJkdUBH"+
    "YmI9K2RuTztuJThRcl0scnJgZiNbOlJtKllBQkhRNWAra3RVWF1eJlU7KzlbPVVjXCc6JF5UNi4wPmIu"+
    "QllzQzMoOyg7RnFYY1YpIiYjJyhlTk1DVzVrVVhDKzRvLmA/YT08aF4tM2dQZUIqRik3PUhDSD5dOiJe"+
    "WzVGZ3FHTXFPISomREwvZF9pOSk9RzQ/IWphN1NMKU5cSFQiL2JFVkpJWzNEP2hyIyo2Wl4pcWosNyIl"+
    "UFdmXDBuW0YhU2xmcDgrNGg6VClaU1ZtMEFWYHJWPDZnMkFuZ2EobFgoP2pwbG5nVEA5OiMwJExdbjM7"+
    "Vj9aXWJBU2BrL0BnXWM/O3VpJFFqPUAtTDolKSZIMmdiajEwXWYhSDdDNFMwPC44PzorLU1SX3FzR2xt"+
    "R1pScWFcVHVYTlFHYFRLJURKOz9LMENwcTZeVGNCNkUhSlMvN1QjT2FaPHBuKyhIbys7R2FpUGRZIzQ3"+
    "cmgxQztKIXJSJm9tKmszaEJyTVhlcTwhdU5SRkVMJjMvaUMwOVBdSl1qSkhIYzYhYk5uKXAjSUFJbXIi"+
    "PSYsbV9lWVw1YDFyJ3MvM3MmWyNsI1FGVk9Cal0rOiRbWyVkZWBcY3BcLTA9WkpHSjkjKSpja2QzP2k3"+
    "ZV4kOCdgNmoqVCZrPUNVPllATS9BVnRAJ2FWZTIwaV1AYyVxZ0tKSXRjRWNsVktgZCFkP3VONm51R25g"+
    "ZllPOj1OUmlaOy9UcDEjRC49SHBjaWFDTmdWUWdvOSJFYC9yS1ZuPDA7Ii5FY0lbTTswPjdmTS9NJ2lU"+
    "IyRTblFWSmhwajRkQlNUYGA/VERuZGxhaUtyKDBqc2sxXV9jKSJRJ09TWlUmUFRkMjFPdDxHUSc/bThB"+
    "PSx0KyUxcnAuVUdAPENqdTAvWmkpUVBdODcrTW5oZz87M3IsJiZXazJYZVNhUFklN2A9UCtHUEMrKFtY"+
    "Xk9YJCdCXU5lUVNPKDlzNEdFbVMscD0vck02V1FER3VORlBxVEM0V2o4Oy4udSk2XiUjLDs8PCR0ZzBM"+
    "cXRkJCQzQShCbWYwO1tTKyFeJEdYQCJtRTguVSNTLmYpbC9AYF9xJDdIalplYEZkU1JKQiVJVEA6J1tZ"+
    "Tk9SUyldbysnXFdFbkQ7LFIxRCdoT1VxSDVtSGNqRzhTKnRuUzdeSk1ULyZrdSVMSEImIyVpKWlyZ1VE"+
    "QmIyWCpLWEctKWg4UGdgJVA0LmI/amI+VUViNkJvXj5RZVBpRFgsKVY4LS02Y1xyQFhVaSJbS1tkTmNE"+
    "XEJXVzlSRDMlZTBtLXFSR1tGQjtLQHEmNXNwOyEpJWtgMTE+KVc9RFhaMmBvJjtsQ0kyVScwaHNfKlZO"+
    "LTJhanUhamw4KGUuV2NmdGZGKWlsb11cb2Y3aU9IPiFIMFhQNnU3Y1hcXyE1c0ppPW0zMk0wR3BHJlc2"+
    "X11MXWFXKkwoRUBZM2k0LD4/RlZKdCZGZSQqLFJWNF4hb1FbKUYySicxQDo4Mj1zXzVLUidtbERdPl9D"+
    "OmZjKV0+TFhNVXNcMkFxQ2JcaGBcJT1INXVadCRHZ2tnV2QiUyptJUBlXDE9cSEpT1VfJGA6NUVIJmoz"+
    "UihlV3BlUVs7WUBJYExiLUk6T111MlRyaVM0SDxERlM/J0tDQG8vM0Y9ZjI6OksjW3Q/YnBtYUFRImdw"+
    "RkhOW3NNdF8wIVY2WjwwJk8hZmAvL09sJjxnX1JibjNOYDdHRyZIRlkkSDtpKiExTnFNYFZEaHBxP1oy"+
    "SiJEPHErPTJlK0pKJzBQaThUVlNCaEZnL1lBXE1ZJ1BcYiNxb1JYaVJlYDxTVllgcl5TNTgvQyJCYj0r"+
    "bDJOLS0ybUJkZyhsI1BBVjVyLSdTTjxZR2NhZ1JdZk5vPm0oJCpvKkwtXDdMWllYSm5QNlMhX0NVa1tb"+
    "YC4+UiRwQGtjZGNsNltcWzshK1o+aUs7Ym8pbVRbOCFCayxwMl5BUjJeK0toRWFuWVtyNUdaKyFWTj8v"+
    "ZmhWMFJeTlIjTGk4MUs3YHQsajZAJD9XSEVXalFfK2daVFhMYU0rOj1gQmphNGhDN3QxPW1gZTBIPE9J"+
    "NyM2QypWZkk1aG8mY1FXZlcjLTk2am1tXlopOlc+VCchMi11IW5cVUQvP2hccCg8LlgkUSxkPjRzVFNX"+
    "LVhTOzpKMlVxSDNAZyMwKiIwWHVcVV9sYERYI19jLFIyNjo+Z3NVZEFzKz9FcmxZTlJ0YipobkxLVWdW"+
    "QElSViwpNDFtZHExZElNNG9POiRJRVxoJ1VCTGlyS21fLyE6KjomMy11ZGkuOigoLFU0UEdLYTNsKDlo"+
    "QGFsZHFsLGE3UTRpMTdYRWQtZkprMERUVEoqaU5ZKmcqNVx1IihXdGVvIjtZV1g3ZzJHKT0qYD8iKUs9"+
    "O0BgbihrN3VyalcmW1xXWE5PN2FnW15QPlBbYGlrP3BgO21rLXMyUiNqMiMoZCJIKmRfQ1U5V0hVJGN1"+
    "IWRRSjBSJ2NVVEpBLFFqYGJHTlIpUDleZ0dFM15oSDQ0QiloMmNBMnRobyY8Nzs7YWkkYUg/PDgmMVRM"+
    "NSomLi5VPXFobkNbZi41RD4uRDYkayo4OmpPRl9HZHIkOGg+WjFLUT1rOSFeLmc7VVpgQShGZVpYXDpo"+
    "PCgwcGdCRnVZRyxzTy5NVDc3WC0pR2ksSGtKXFdxaydPLy5NPEdXLkNvPSIxIjxkKihSQGcoVmVtYVMj"+
    "M15ETl07U0BDLDNkaylqcmFCOjdLJkQpTzZDdCJbXVsmYGElYnVeNEtGSCw1NmgpKWE6YkVgIl9kVj4z"+
    "ZyYlXEIiZFM6aiNyITlxMy86UzBEKDxsaE5eQ0xjZUhFa2hwYV9nSmUvJjsjNjVRJ3BTXVhIXm9PPS4z"+
    "Rjs0ajVpWTtyYWJoRFo6cHRZR3RjUipRRTRKdFU3YnIoJ15jdEtdLytrNVkiT1hpMEYyKkI6MUlvND9e"+
    "R2tlRFM3SlpmXi0/WisoXWR+PmVuZHN0cmVhbQplbmRvYmoKMTQgMCBvYmoKPDwKL0ZpbHRlciBbIC9B"+
    "U0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjQzMQo+PgpzdHJlYW0KR2F1MERiQkRW"+
    "dSZEZDQ2QWxsSV5AUylJJ0ZIclhvTzUkSVE8MVJXYiU3RU1xJzBbKm9tLmckciNOLzdcVzdXSW1IdCZL"+
    "SDBKYVFpXWxQP1Q5YC8jWEdFYF1RPjEnTmwvQCcocUQ5LWArTEs4Pi1aK0JeTkBDN21zY2dYN19bKWIl"+
    "PyxPZGYnbFMqLi5UJzZJaSk1MVBDXjUoJU1SOUwvZGdQX1RSIlpCTGFCVUdyPGQ+WFxpOFhqJz45UCJz"+
    "JjNsZSs8Q2Qya1hPUUcydS5tI1NpJjIoJyJTOzAhP1knLWVIPVQrOTxJP2hZNlMzZ2Y6MTBjX2FxKVY3"+
    "QCxTRE9YVjVUODZhZ1dQZHBoKmNZVT1Dbz1cTE9HUzFSWmo6UERbIyJORjpXJ0IqY1NhSUQkVEMlJDBD"+
    "L3FFMGVdb2Y4Ky1tNU5yZjNBdW42QWZAUG0pLXUmQU4xSGNDTW1WZ3FoM1VQVVgsPzxKcmxbLmNpXFQr"+
    "Lzs6XD1nVW5YLzBtdHArQickRUQjWmFIYEJEIk4oJWUhME4jUUJeSTxnbTRbME1PXVA1bUk6dU5oRztt"+
    "bUVbKzQ4OmdraF4kLG5ZbC5TUUlHaVxUUjM6Ij01UDc/YlQsXihYVStOLCQ4OiNlc2IkVkZacyJSKjcv"+
    "KWJBXVNhVVZMZUhDTyhxWW5yWSNDKmlJUiItVzU8ZV0/SC9GV184VHFIa3NmYk09YC5uSlI/RVJmXUdX"+
    "QURnQ0FXRUpLNEw3SioiN01eNidTP0xuTyIvXVctPShcTFBKWUY+LDMpOmNqMjwkdFE4OlJgVmpaKGEh"+
    "SzwqWl1rVVlxPT40UTwvb1JMODRJR0RTNShTQmlfKClsNjlhYE1jUjFVbHM7TCM8KkBhTUZuQF9pbztZ"+
    "MFoma0xub18qTiZvWzErMG5Qa0NPP1A9L1dlbzcoJk9rcWxhXSNBYi9FcmE5bWdkR3Vjb3VlaFFEVWNb"+
    "IWU9Xj46PmQ7SERvWFA0ZlJhNldWKWtBK19qckZnTSpCKilDKjAuJWIsMi8lJURBcU82MUJHLSEuaUYm"+
    "W0guZXQ8XDJeWWZpJjQjKFgzLjBKQ29VWzgma0IzJicqZCNhNDBLJF5CJjlKQyJnKzZza18lOD1CMVRG"+
    "aEcnV1lUIU4+SU0xbzYwWUs3N3RPaE1yJEZrLG05LjxNKmNtWD4hbXJvSGtVW2pYMjZ0M2V1YD9tPTxV"+
    "KWIvbDJHWzBQOEA5ZmYoS0FzZmllQClqY2xOJmNdbydPMFlDNWBxYDtGVTstVi43VGEjLlNKLC8nI2VY"+
    "VDhocnVcMDI4YFJmaGEoc1I2Ri84NEpuUlpTXWlPTGJgL0AwMmkpMV1LdTx0KGsrQVlePzYmRSZYR2B0"+
    "PDJiRCx1WUszWSduPEUiQzc9KSMkQV4mTWRYRDspdCpNW0VZT11KQj9rPjIkVUZDRnFyXjNuW1Vdb1wy"+
    "Z2tJc1s2NTshQSptU3JYNS47TSJpOSltbjEnM0leOEtSaycqKyw0ZSxFNTVHVk5QSUZBIS5UUF9HOUlM"+
    "Wl4/ck1TTzQzcjYkUE5fcyIsaGBgJWVQWDFMXGxqOFRjTUAibmFVbChkI0dlKS5UT2Y0USZRXmNdcztw"+
    "NTkpPyZgRzlEPTwxWGs9PDNIM2spVGlWIWFwKDchLSJTPis8SzMsYlNFQmxFL0ViSzVRXj9Zc1pxdUxq"+
    "IypAJiFOazZhKWlbY1lyJ1o0KiJDTEBmYExQSF1wXG9OMlEsWEQ0cmpbI28oSTlrMigtS1NiYnFIVT4r"+
    "QiVpcUYoV2NcaWtgPFxUXkVJaCglOF1GL1JeL3BRckpoXV90OypPMyYsZ2hmNGgzRSIyOSU+LSVaOEdJ"+
    "VUhwWlBjN1lsZWghSV0zcCxnTjhhMUg3TUksSk9VR3Jdcl5FQkNSXFZicy44cU9WdVs+QkUxaWtYNG1K"+
    "QDxSNCY0ZDhiJTdONSleIzZnT1FqXSkzLk9tQ0g1LV1nPDxfT11icXFjNmk/RUplW0NSWChpPWJiKUk+"+
    "RENZVUdyVTVmQ2lvYmlgakdFcis1OFlCWWxUWXApJD1aImw9Z0NDZ1syIUE1LiIiU3VYTEkrXnVFRSdN"+
    "TENMbm4rZ0tyc1M2NiomUyFKQ0dQS1FYJzA9KU5yL2FIREBoXyYmcFgnZGhWIUpsM1x1bDlNSmwmWCdi"+
    "USFiQ0dmbUJ0JGNxSGlMO1FBZzltSEIyTnJkJVNMX0pGVSRAJzswQ0xuZmRxdTxgXCFXMmNAWVEpVEVC"+
    "b0w3dGJdaF9SOWBPVzo6MHBQMyE/KCE1bzQzNV0uWlpMSVc7TiI2UkxSZCVtaWkjX01TcEg2VV02JE9J"+
    "NFtWSilLamBDSEs7JUQuVSRvITExRVVmInJIJnFGc01oLl41WEErXGk0TyF0IzxqVjpqT15qKkxMIW10"+
    "R05dNFJzZTJMSSJmXGIwQSRGYWE8PE5pbm5ydUtwcnJvcCpNSyEkdC1xZUNOKmxEQGMyaiZCRzFRWD1P"+
    "KCRYMG1uWzpRRlU9VSpdaE5VR245akVicHM9NCtcQ2JDaTpcJ0xRNEkwYGhUcmdMVS5JMzssXigyQEYu"+
    "ZCNhMHIuZWonSl9iO0RCL1hvNmFOITJPMnMyR25aMWpmLixML0tgLXJDPG91TEZYaG1ZIl1RWkVbK1Mu"+
    "QmpmKT1xQ0BzW0RuM0xYPGUtZ1RDMCUsKG1YJVdIRywqUzBdVkFhPWRoN1tyQUA8IWdHN10jU1g6NyFX"+
    "cjg3b25xNFd1OE9lRTdjTD5YVCQ+P1ZLOj1UIm0yYGotViVbcGMsR0AtVmVYKmFOdCdeOXNUYUFHTCFP"+
    "U2piRyhoR3IwTWsjRy5lJnFRQnBPXzthUyRvJl0yZnAkMkNHXkRCUT5HZSUpV0dKM2RVPUZDJGxQIWYh"+
    "V0VcJWp1TUBbYVQ/WkVwZk5iPkleRS1eUHI2MyZ0ImRwS0NAbyonYjw/QylNSGAzbVwrYVpFRkpaT1pd"+
    "a2RpNWhNKWI7JFU6InUpTUlsak0+M1hHWEQnJiRyOnEvKCZyUGY+b2snWy1lWlE/JkdnSF8zTVZRUnRn"+
    "KlZbYWoyKDhGYWwqY3UybClyOTY9OjNaJE8iRVdBI2gpWU0xajNJckhaOWMic10lO1lLZEVqZkxkJTws"+
    "bj0jIkhzVyQrVDooJUhfLGJpaW1hSz0zcTg/S1FOY1lvPSIoZU1OM3FMcDstdS10MnU2O0p0XTEzPUFR"+
    "JmhJVVlMa2NtaTE/MlAzOFM7WV9+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDE1CjAwMDAwMDAwMDAg"+
    "NjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTQyIDAwMDAwIG4gCjAwMDAwMDAyNDkg"+
    "MDAwMDAgbiAKMDAwMDAwMDM1OCAwMDAwMCBuIAowMDAwMDAwNDcwIDAwMDAwIG4gCjAwMDAwMDA1ODkg"+
    "MDAwMDAgbiAKMDAwMDAwMDcwNCAwMDAwMCBuIAowMDAwMDAwNzg3IDAwMDAwIG4gCjAwMDAwMDA5OTIg"+
    "MDAwMDAgbiAKMDAwMDAwMTE5NyAwMDAwMCBuIAowMDAwMDAxMjY3IDAwMDAwIG4gCjAwMDAwMDE1NzIg"+
    "MDAwMDAgbiAKMDAwMDAwMTYzOCAwMDAwMCBuIAowMDAwMDA1MDE2IDAwMDAwIG4gCnRyYWlsZXIKPDwK"+
    "L0lEIApbPGM1YjA0MjY1NDZlMmM4MWI1YjAzYzRkNDRjZWNhMjc4PjxjNWIwNDI2NTQ2ZTJjODFiNWIw"+
    "M2M0ZDQ0Y2VjYTI3OD5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0"+
    "IChvcGVuc291cmNlKQoKL0luZm8gMTEgMCBSCi9Sb290IDEwIDAgUgovU2l6ZSAxNQo+PgpzdGFydHhy"+
    "ZWYKNzUzOQolJUVPRgo="
  },
  9004: {
    filename: "peer_review_9004_2024-09-11_Alistair_Burgess.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDE0IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEzIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNSAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMyAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDE2IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDEzIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iagoxMSAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2Vz"+
    "IDEzIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9u"+
    "eW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODEwNDk0NSswMCcwMCcpIC9DcmVhdG9yIChc"+
    "KHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDQxODEwNDk0NSswMCcw"+
    "MCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9T"+
    "dWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoQW5udWFsIFBlZXIgUmV2aWV3IFwyMDQgQWxp"+
    "c3RhaXIgQnVyZ2VzcykgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iagoxMyAwIG9iago8PAovQ291bnQg"+
    "MyAvS2lkcyBbIDggMCBSIDkgMCBSIDEwIDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKMTQgMCBv"+
    "YmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjk5MAo+"+
    "PgpzdHJlYW0KR2IhI109YFlPbSZVcm9IXmZ0Sz0iOm0yMW5nJlNMbSgwakFNUFdvcD1tWjtKIk5jZF0i"+
    "KnRJKXFZMGUoRi03Xm5DNnJxWlo6R0ZibVJINyZFcy1SUixPQidLQGROSj5IaDBOVytrY09ZJCcwSCJx"+
    "QGU0KjRvJSxObUUuLUZEV2olbCRVJ1BANXAzQkJkdUt0Tyg2YWMxQGsjSmhxXHI6ayM5IVo5cyxRVVkq"+
    "XjhUWERYdVFOKG45bihRYjEzMU83JEd1NFY3bzFTXWZDTyJsbDl1NyJKIWFcVnFRUTBlT1pqTkAhVyEt"+
    "VVxmNTRQWUU7OmQvbC8tNjlPaERxRXJTbSE8LjVMUmxAcjE1V1IxIkZhI1RVQlE4MycrITViR01kUUYu"+
    "XDJOYV0jL1ZXMzE3Ri00byM+UmEhSUYhTz9nQ2tOLGMjXz9vWkxTL2BtXWExZF1aOGE/cyVJVF1ePnNc"+
    "MDlMTDxiUlFUJDkvXyVKcDdwYllaPyJOZ19jPl4jKkIjYF0hW2lJSkQkTTw3WTUmV19gWEAyVDljI1pe"+
    "dVpYJUJmQVVaPi9WL2Q2bmkrUC1SKzlpckhWazZXMiJQTEBQSkNgMFNvWys6ckNpK2UnTnFINVItTDtT"+
    "WWVbPUtVVjB0U0hOOl9bMnJgI2NldEAhLztcYFotS1crcDRRRT90bDM9RXI6VWJyPUstYVdEL1psQE4/"+
    "N20+QmU1VChIVzpeNz5DSyokOGBOSlteb2tYLFUjQytGYG9qTzJtTyNLMWdGaDVHcTJLU1NNaFFbI25R"+
    "KVQvTlh1M2ZvcWlrQmFsM2klJi5UYWl1JFdDYj4pImdHJD8uQihAI0kwNCJGOSVVWmVyMUY/NitcNkZT"+
    "NUQhIlluS1ZlJ29zOjM2KCkwQmQyP3RAJFFcQHVKayZaWFojYCNBUl9eP2wqUGZibFtJSWQjLEcidVg2"+
    "N00oLUc2R2NSYDMpJltySHRAL2pvXSZBLV4oI2lcSG9qcDYtKDM0SF9iKC5ddV1lS0FhRT1cSnBsNUVX"+
    "U1VfdF4lcFQxXTtQIWIhZ3BMU2slYFNua2BZJilfRC9kVS5GKDdZTS02cjo/InBfbzhxaipwUHRBWztI"+
    "MWEsKWRFTFwpX2U7XEhHKmgwTGZbSUFbPF9TYmU0KGdUTTFlVEAySjYjQDFSKDFbLW4oR29FSF82WTRW"+
    "NSxVNz91I0MobFNWVUMhPVQjRixoMEtQWjspMDMobGtndUsuKlIha3RbSy1ca2t0YDxpTzJgSklSQDkk"+
    "VVh0KUBQc3QxIWZaXCJjMEkybmQlXCcnQDA4TWgzUmReYDFNXSQxaGRaajRuVSE0UkAybmwsLkp0Ozhn"+
    "ZElgTGMncTUtbU03W1whQjU2SUNYMj43TzJlWWFTUkw+ZmBGQ1kuRT9CR0E/SkgmIVVfcic+JF1pL0Nu"+
    "Mk5cW20zLV9xXlZHMVlKdDxnMGdaRCRnaG1CTE9qaXMjQltGbCFFQmhlclRkUUM2Qyc2SFY8PksnV2M9"+
    "VExeUi5lRm86LnBfP1Y+RT45aWBuMlc/UUYrMVQkSlpXNVw5dT9NOkVcN1YsPCxHbzAnUDEjYFAsVEcz"+
    "aCYiLltQMSE6RVYhb2UqLVNhVUtNVDMjMDolKT0jRUheWWk/JE02TmwsXk9GKiZLNWlUVWxRWj9GU3Nl"+
    "bUFyWjhlTVxFXEE6LkAzSGtzSGtCaVElZ1ApJ2g0S2A2J1FbYmpgUSFXOTVlXkJUOjYscCwxbXByPzAq"+
    "NF5hO18iIkNoIzQxOGZESSs/J29bI1w9ZDRbNz88NUloM1hjIT9ab3UrdCNFT3E+RVhyTXJESz5XVk1u"+
    "VFgiXjQpNmxEJURGZlUpRW9XcWlkV0RfY21MWG1VUV1EYlwqVkg3Vy5jRTRZZTdDVV1VPlg8VlVrJkEq"+
    "b1QkKzgmN0pcVnBJZnBTMypEWDVAamlvbCNnc3VIYUk5OHIiUz4saCJLLU5VRj84JnJEMkQkRDhSYHFs"+
    "UjsyP1pCKDFUXCJhNmxGVkEoOFQoJT5cIV1AbC9VOT5bTHBpJW5BKyR0O3JtS1crLFdNOiQjJz9NN0pQ"+
    "akZwM1JjTF9YYG9FcTVeZ2tNL2cyNmNtPjQ3MiNPJClaZkc5PEgnVUEzSC9IQV1LQkhGRjpSJT11Rito"+
    "NzZCLjp0PEhlJiItX2g/PW5zOSx0KipJZlw3WCxDX0RhSzM9XVtAXlU2J2tZXV0qLWdDQ2pNX25Xcjcs"+
    "Qy5tUCNMJShURyRoPktkWWQ1Im9eQzI6USZpVjtrOmJrc2o/KXIyWEBsTWxhbiM3QyRfbGdlbT0tOzo3"+
    "PW5YSDhzQV9DUEApRjFGVVgkJGwiNCwlRmN0I2xESStANyg7LnNiNktISig+Ky9zJmFjbGJmZig5JyVa"+
    "X1YnbVthYDowJUQ4bVprQE9XK29xKHVeKiV1RyM3QmlMOUYmV1lqSjtYaFtqJUZtMD8rL1JUcSlwTztZ"+
    "OyRWNUh0M01DTyVuQz8mMCtfRUg2RWdTQEFGM1ksKVdyJzEibjQjST4+a0pscGthQkclYlBGI3VdK3RD"+
    "QyI/cXBdTCo2aUV1VSgndGdadG9NL1Btbj1YQUkvMVMjKE9BaiFHPmZLUSJXPSxRWDQtUSIxWlgkUVxU"+
    "NjhEVi5FXSxGOlNIJ0hcdT0qcCwsL202ZiU1JV1KKUVMak4sIWBtZFZiJ1AmW3Vea1twLGgyPGdsSmRd"+
    "ZGozdWkqOWJcNSVGJTsrTFd0Q2BmT29CV2xaZEdOLF9AbjVMXkdTZzpXMDdwYUApVGEuak9UX251QUNK"+
    "U3EmTDRxXEthJjRJNE5pMz00NiEoWzc9TVU1dVA7KW1FblZgciEyPjhgYWotWDpSUGlIY05jM2Y6QVQz"+
    "X2oiUTlYSiVYSVFHamhVTUJZOTZxYkI/JVNcdWRmK0U5REZwVHBrUW9kSltUJHUtcicuZnJDO1NLKDdI"+
    "XzxcVlsnQy5BaVlnJmNfYWA7LVllQD8pJT0lb0dwJD5eKj9lQ1hDKFglNitIPFZOMUpwUk49bGRQQGxN"+
    "QSRdZEE5JSk/Izw7bkZKX1s1XUcyQm5xaVljbzVnUmBLOGY6JCNgb2xkcGJRNVdaNz0lVUYqSig+LUMu"+
    "VVVcPyFTPSdcWG1vZXNiQCpUWjsuXD04KkJpQmxTUy9pOl1tYllLXkZaIjVTWTYrRGcnVVltRzk7b0RS"+
    "Rz0rRW5ASkkjVTlmZ1ZtXlVmVGRuLUJgSXAhPS45TzFmMT1aLmNqcWYxZyJEZWs4SkpFLnRDSD9odS5b"+
    "Tm1HdS9vbi48V1ZbSj47XFwpQj1WaU9bVShASERyWDJmPzhvcDJhYDw0akdkbkReSiJBWl9oN08icU1M"+
    "PyxkL1RyYTNAPV9ZPUlWIVtkSXFnTyJnTTVDI1I+cypYQVo7YypRWSxrSFI/RTJhOjkuUlZtRkY5OzFV"+
    "aGpOY2BtUnMwZkY+KDYjO1hmPmFZTDNlQGZbZHFFOm9TTCtIQSk8bjFCYltkTkxeYk5JSzFYMmZMc3BR"+
    "LD4xQzMsJiVgOloqLGdwSD0oNSIxWUBMbWgiZDRIaTYmdEEsZFpAP2U/LCZqKEFyMl1aZCQ5XmYoXEcw"+
    "LTxiSTxALVZOcD86MWplQ09JXy9SYkZcQmhsYkU+M2c0UCMsZ2FwIjdVOi5KNEtkITFJKkc3PV87aiVT"+
    "YUtdNig1OEljMklGLDVoLD1NNUxNPC1NWyZhUlVMKVNLTVsnXjBuPSdPWmxMLGJ1U1AxP28kRCQtPCJX"+
    "UVUkQSRASWRVZDVBL01xWDJodEpTIkk7IWteUTdKUzk2aVUnPixucFphYkRcTVhnL11NY18jP0Y/O19t"+
    "JS9CWj9KUzl1NFlqQStJOCxgRS5eTHQyUWVrcFQsbEReJCV1Jy5jczJDMGBXUWQtJjVJS2I8VDFzLzRW"+
    "R0l1W2BycStSOkVhKXU4dSVuT1E5SHQrPVxcV0VhPTpWW2VkVW5MbWQ/ZDxEbUNFQnEoRmd0Q1FBfj5l"+
    "bmRzdHJlYW0KZW5kb2JqCjE1IDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVE"+
    "ZWNvZGUgXSAvTGVuZ3RoIDIyNTEKPj4Kc3RyZWFtCkdiIVNsYkF1VzInXSVxJm1WVzZPKDZVNWwmailJ"+
    "ISs7Pk9dRSJzPE0qTjxtdVUpMlhmR2crY1xERy06WzlVblprVEYqMDYzKVchL1VbTDUrW0tIKmonPWJl"+
    "WzdKLHU1XkE5SVQrSmVDYksjaWpgcVwtWyI/TW82YSRvP00/KFQxW1s6cGMrbSxgVnUuX20jS0lyWypL"+
    "Qzk7PFdeYDshJCM8PWs7TD9kcjJlPiU7RTJITiY0MmQjdCQuVXRxQFJePXNCZDo1NDEwMztnajY2RT0s"+
    "RVhUcj9FbDNBYnMiR3NsYzZoOGdBZD0uXXFOJSlcc0QyIXNOUGUpOWcjT01CWlFgRm5pPWBsNzBUXj1V"+
    "Ul5MVVBlbk1BaStfRzBMYy5VJyspcSYjayNVLFwjWj5iO3VDaWI3QVk2WyhjYDQxJVJUKlspYSxRW05s"+
    "cUQkcnFbYVhgTXI3Jj1YLDxFJUA0KHM4O0llWnQ6RVJKSGJZZTJcT1s9WUFlQFI8O1FtKmRwczpAdGlA"+
    "XDkiZiJeLSQoP0NQZGRCcWoiZiorOVNucTYxdEU0TWRFZiJGLCNxdW9xUkY9UjxkKSRScE4ucS5JOm9F"+
    "ZzxfSHJYLlVwVGpmR0lJLD9oRWVMcUVeOmNaOyhjWGJOJVpaMHBpMjFYckNBRi5USiZUXldyW1luVTxj"+
    "LWU5Y2tfVVQzOWwoTylVUzNnNWhsZlE9ZzkiYCxTUyJcKSstWWc2IlY7bjhFUGE2V0dEOzlCJ01TW0NU"+
    "LywuZkdUTTpYIig4UlxKSWctUmFTXjFdUm5WVGkkLVNaUnAqX0I9LDEvSFE6alFKc0VKVSwhXy80Kl08"+
    "KmxuJ0N1XiJbOU5DckxrPC43TzQiRVhlZiVDcTZGYm87WFlKX1UiSjRXUW9KWGZkUW5hIy9DSGc1QGMw"+
    "OjM2bTQ0TDRkcWhcaWFILy9IbmBpVlpKNVwkVStTYVhfb21xJ1xNdGczNEdtZFxlLSEyYCJRNnJXb2VX"+
    "SDJAWihXRCZbPjtmNVk2JWA0Zyp0bSVES2htQV8wQSJuUi4qZmVMSjUvQic4SiZAWW5LUjlYJikwJltD"+
    "XT1QZFZ0ZGtbUVxGVGciQUZCTC07I15jMTJvJHFOOWF1M0MkL25oRldoPm5cSG5fVTxxakAvPy0hQU9z"+
    "Z1tWKlAnJlVzazZGRDVuUzctLFAtM2ZQbjxNJjlrXUhGZCJZVDVNOEEvKiswXkwsYkRKSlUiTD0maV84"+
    "ayEyLFFZPCVpKnAxYlA+cyZFb2QnNjEsOjMvI2lhTSlrX0lPNUojaCcrXz1tb3IpUkI+PEAmT19qJjEm"+
    "KmJILzc+cVdMJHNkZTo6KzVVRCpjRGQ8RENxYVFnaVJAXHRRIlM/MVAqUydDMTYyRzNPTm0kLUsvTWBb"+
    "L2huaCZvM0ckcjtHJ1FeW0gmUCc6Y1R1W0U0RzpfcicqLCUkTnNVI1JGIWE7L081O1p0PyJKaT8wdEFh"+
    "JSItLS9YUXNCOT0sOTVLTmVCVEJkQGkzIk5tSkZjKkVYJStTIjJPPjkjJWAyI1lxaitMLS1KdSZBY1g3"+
    "bFxTLT84RFhQPDQ2JnEsbjcjQ2xRNyFdLHA5S0lbYkRDNVxoVyYkNV9oKCIlNyxaSllkJ1dgP2ZNPVxv"+
    "JWVeVmVGKiZXciMiQTVZLlBcKTksN05TTz9oODdrcjxYQGd0I2RMbTtWNlhgJmleYG9RP1svJzZmSlsw"+
    "Qk5gNU0zJUpOOV9tZVtBRlZNIjJtSSZfcWhXMjAwNCcuJjNyLFRwaEMoYSNWcHM2YC9QZy5VIVwqYWdX"+
    "LT0pNTBMV3NzOCJDYVUuZm4uJyhoJSY3PnNgL2dmPkZFdDIpNFM4ZWQsS0cuayYoQCtZWktlS1lhMmB0"+
    "YXB0TC8iTHIzLlkpPltpMXE9Xk1CMUpIZ2oqQEhJNCw+TiJXbzs7ZTdCSzFWdVJRT3BZV1Inb2luTEYl"+
    "J18sOkYobjwpWTVcJFQ7WThcRm0qTjJtVjklJUZDPiZEb2NAaj9XaUU+dV8yWkkiV1BjaUVxPWgzbCZN"+
    "PkhNTzpFW0JYYyhQdGlEUGxgPEdRI2JDKCRnOj89bS0sV2ErS0AnRG8zV2lfPlZwSjxsKC1gJW47PD8m"+
    "Xi5TSldVLlQpLSZJP2VEcEEuVkR0LFZma2xkRy9RTGhOV0cnS25eNCpQZGgkNTlCZyE7KD9pa0pvJkVK"+
    "U0VETiwlR090Z3RgK0Eub1gsXjlVNFluJDEmOFREWF9GK2UxbihAX2pKQjtdb2siczI/Zzw3RUddKTxa"+
    "Z2BbYSVNPGUqUWtTQG90OEYhPGQrM2FhP2wzJS08UlNjQzJfPGBdX1RJbjVvQkI7W1QyLy1nVFE9X0Ex"+
    "aWpMb1kkMSEsN2tGOSJqRSIvI0I4RyshPXIlKDUiQGpWVUxtYURVZiVxc3VvNlhQbWQpRigtU0E0L0ZH"+
    "Xk1MO1M2bGlpPGpKQCIlXGk3QUlEbTwqSjhGSiolc2pnLW9iZVxHJVwjM2MkV2ZTcjBWLDdvPE9LWjU/"+
    "JlMwZ0dETFwkTVI0NyY0Wk8pbiFeLGJPITNKK1s/NDhfME0sMSVHLC9AaTUvPzBNSWsqQSFlVyUpImBk"+
    "LEskSDdnZSxBN0FgZSdmMDpzZFoxTTohZTMnX00jZUspV15uIV07cWZJbG9rI0Asbm5Ubk1UJzVTXiVL"+
    "MG9JLkEoRlQiMjNLIyVEaV88W1NeNFszcmIqZy0rPEkvOXNXKz9HUUpITU0/LSlccFdlMjExYi5HSTdI"+
    "TDVTIy40XERVaU5GZGhQNV9HW2xdWDpEcDcwKnBZTFs0LS9ESTA2JWU/YjZrUzskUy9VYFwjdUZOPEAx"+
    "S0FTXlE5V2NdIkhkPTVHYiVIIkJML11Ca3JkVklGSSM1RWpeOWglTDJoQT0lc0EzWEBgQDwoMiRYNWci"+
    "KEY6QlBaNDA9NCgmY1JAVTNVWVdhViE7Tz0hMDs2NVg6ZyNyYDUpNzdpQCMtVThxcVs6PzJQIm8kT3VW"+
    "fj5lbmRzdHJlYW0KZW5kb2JqCjE2IDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDUwOQo+PgpzdHJlYW0KR2F1MSpiPi5AVyY7S3EpTUxTY2pDLTdPRGZa"+
    "UCQ2PC5wbmw9R0tVMEt0OisxJGAhc0VnUmgmLjpDQzAyIjBpSWRSRUlQXD49NExiVy4qVUtKOFcwTSQl"+
    "V2YtKG8yalQzKEckUVZoPnNhQHRqVHUnL0pbJ1peKlMyYypCNm9HS0RtdVg+P2ZHR19yZDYmWHBAdCVS"+
    "T2FcJjRDLTNaWT5WNWozQXNwMytXSCthazVrcFNgQScpXXV1Pkhebj1dZ0lzXyE2U2R1O0AmMDtBbS8q"+
    "N3BbZ0tcYi5RYFNLLktjbkpAMEtAPUFkPSk+VTJYYjBUNzk4V1o3WChfbmpfP2IoZD0hWTlpYz1odWRC"+
    "OWtoO1Bjai5ZYiQzcVVDWmAoaUA3JG9pcDgiWDpmP1BrJj5jNW1SXUhHcDw+dWc2bXFHIl5qazRTZUVC"+
    "UGtyMzwsVEdYKG42cnJOSykxaVxWZmVuPSVRPUAxNmJwTmVESzE8RjhbMGVTMklNW1ZAck9bJGQoPyVX"+
    "Wj9ES0xyM1BURC1aWzxvbDAvQiU/MmFeMXUyMEhpVmtccCc7bk1fST5CbVU6VjhVVG4hKk5TMUpXbilJ"+
    "XTpUTDxiMkdiZE10MjhXKjl1TTZGU0owJDsySCxNRHRfLCooJihnMFZyJSlSX2pjKWJIMWkiMGlqPS1p"+
    "fj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEg"+
    "MDAwMDAgbiAKMDAwMDAwMDE0MiAwMDAwMCBuIAowMDAwMDAwMjQ5IDAwMDAwIG4gCjAwMDAwMDAzNTgg"+
    "MDAwMDAgbiAKMDAwMDAwMDQ3MCAwMDAwMCBuIAowMDAwMDAwNTg5IDAwMDAwIG4gCjAwMDAwMDA3MDQg"+
    "MDAwMDAgbiAKMDAwMDAwMDc4NyAwMDAwMCBuIAowMDAwMDAwOTkyIDAwMDAwIG4gCjAwMDAwMDExOTcg"+
    "MDAwMDAgbiAKMDAwMDAwMTQwMyAwMDAwMCBuIAowMDAwMDAxNDczIDAwMDAwIG4gCjAwMDAwMDE3ODEg"+
    "MDAwMDAgbiAKMDAwMDAwMTg1NCAwMDAwMCBuIAowMDAwMDA0OTM2IDAwMDAwIG4gCjAwMDAwMDcyNzkg"+
    "MDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8ZDk4MmZkODE2NmYzYTIxMmM4ZDlkNmEwNDNlOWY3MDc+"+
    "PGQ5ODJmZDgxNjZmM2EyMTJjOGQ5ZDZhMDQzZTlmNzA3Pl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBE"+
    "RiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMiAwIFIKL1Jvb3QgMTEgMCBS"+
    "Ci9TaXplIDE3Cj4+CnN0YXJ0eHJlZgo3ODc5CiUlRU9GCg=="
  },
  9005: {
    filename: "peer_review_9005_2024-09-11_Dylan_Connolly.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDE0IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEzIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNSAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMyAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDE2IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDEzIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iagoxMSAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2Vz"+
    "IDEzIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9u"+
    "eW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODEwNDk0NSswMCcwMCcpIC9DcmVhdG9yIChc"+
    "KHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDQxODEwNDk0NSswMCcw"+
    "MCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9T"+
    "dWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoQW5udWFsIFBlZXIgUmV2aWV3IFwyMDQgRHls"+
    "YW4gQ29ubm9sbHkpIC9UcmFwcGVkIC9GYWxzZQo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL0NvdW50IDMg"+
    "L0tpZHMgWyA4IDAgUiA5IDAgUiAxMCAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjE0IDAgb2Jq"+
    "Cjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDMwMDUKPj4K"+
    "c3RyZWFtCkdiISNdPWEoZ28nbjU+TF5mdExwI3AqTEpwO3EoYFQvOVAhU2JCRWYqaFhCSSouJkhJKDxR"+
    "TEtxKD84KmBLQCpQb3IyTVpfS0lrY1w9M1ctbjBRPCktdERWZydtb1U+MEhvLSJNQCMmIm0tNXRscmJD"+
    "dEcraEY0bmFES2g/IXAyUVMlbTNZRyowcjFfPmklKVokQzdBLisuUjcwNGUtMGxJLzVxZW1rT1Rubic/"+
    "byFKJj5PKDdwUEhxNTxPOkMtJE1jQDYkK2AtYHRhUjFYcXU9QCZgdGpVWWY9MFkvM0IpVF04ZEg6OCtM"+
    "V25UZzhGaiVbalwrN1xALS5TXjtQdWo7NS5ZVEAia0RZMyEyOyU0MyJzWFtgciw/Z14vJyFfZzFtQ3Bo"+
    "PUZRPmozVW81YUAvbCFvcSg6ckpSKy5tck9OLkwoUzo9Pj0vUlk4KktpSUk+aTYiP2k3L19ZMWdjMGdb"+
    "cklRY0VNTyZCJSshaidMXGRFYXI5bmtsaGpgbGg7PU8qYGBOJ1IuODFVL2I8WVxIPGJWWyExKnFkVnBj"+
    "blM9VjRfRyc+XW89U3FuNF9xWF9XSjssP1grYCdXbHBeKStBWVRTQk00VmtGY29KLjBZTTNfUCVWI3Fc"+
    "I3IzWE5NKUMnMjkqWUwsR2JmRmtcMFNzMFtjbzdXYGZXdUpfajRDJjA7TFIyRShbNT8wVEgqUTQsOFB1"+
    "WzZXQVt1U1ZHTGslSm1FZTo9ImhaR2NMQCwlbFpuaDtMYzdHYEVPcyNrL2xxPU9JRiVubjxOPlZXPyJu"+
    "SF9wJ0o/J2UvLnRMWCdEb11dZTQnJWIhSjYmQ1lwdD9qQmE2JSI8RSNoTyM+QXFZMUlPWzREUFJnR1xE"+
    "ZDNbLE9BZTU4X2lbKjc/Ik4xI0hHOCtGIkhOIUJcPnBlLW5QKmtRIil0WURYYmkoMyhuWCY0U1toXDBW"+
    "XFUhZDhdXmhUbUpUWTxFTGU+cEBzK1BSR2gtL1ZHK0xaVTVMP2JMXyRyVzBDUyQ/Kls5JjAlJ0Y1N14j"+
    "ImNyVFBXP1EyaTg3XCVQclwoVjQoJDsrJD5IOWBlVTYuNFZWdFdiXWo7NyZgIy1ZVlUjTFNfJkAkcFIy"+
    "aEJcdCdnNFdyPWIpJnBxLz1iKUU8V2lGSyVdOEAsKk0pZWQ5NE5KLz1Sbzc5V1tnJiZFcyRtZW9bRDos"+
    "UkA+JlRlRiVVXWpQK0pEaDFSZUYlO19QZmV1N1QkMDBlJUkwUTlyWGpKV0tTT1gsbjpXKjtcZ1kqLXJy"+
    "dSUuRFtGOVBJc0tYPk0/STQoI0QxYztvXFovVm89RF9qcC5Lbzdzb2VtRTUuPi1eKGReZCZvSWNrMlVA"+
    "aXRHaGpCVFo0VCM0ZDsuJVBtOClrZ1ZsYXNyQUIuJW1aYWZgTG1pXyY9JThvbD1eT28mOFtXaWM4QkZi"+
    "WkVvLlRTUyYiazo+aS0lLS9oQnM9WjswZmpOOTVSSVc5VGclamROaFU0Z11aR3ByYDZBLFdHOTNSOTtU"+
    "P3NXYGtgTUF0K1krX0FwMGBsODlUImFxP1lSPz0xQSxscG0tVlRUTCZkcSorJSFbX29nXyhKUGdXWEVI"+
    "OWBPNWcjVCtaU2dtZkNDIy00Ji40KD06UT5JSz5YN2ZsQ1BuMURmXXFAL2BHZVE8TFwzWl45IylwQyph"+
    "L2wrbCRKaEdGWCFiWy5oLFdnJFphT1ZpUF1JX1c+Lmk5cyhgQFFzKlxBUjpWPVlpMSpLcU1odCslJFFQ"+
    "ZV0xZ2dRTEY4YikoZVU/VHBXa1s6NF1XbnE3U2VsK1BJNy8hVFM1L1AjT2xJN1EyTE9dbV5VSEQ2SW5O"+
    "OUtfJWlrJV9GRmJvciw1JG1vKztBT2krKlQ/aFhyN2tDOGhJQS84a3BzWUYhQGdXUWNjRDVJYTtYOy4s"+
    "TCUuST50c2tFXiU/TzI5XjpdYVpSdUlzMCVpVDBna14+bjkoPzkrYjRLSWdWY2ooSGA6Ni1XKU9dNl4x"+
    "IUNTTGUwdTAwJWcxXz08NmA8Iit0RVRtaUMhaS9XOkhKLjxYVXA/XE9mN2o1ciNQJDxyImZmPiZHZT9S"+
    "b05fbVg5cDZjcEldQSZBPyREdTFbZyo5ZzNvKy5tZVBvSyY0XSRJPUJOXSs9SGFKYmUnZ1NMRHBhSEZx"+
    "Ujc/SXVgU0dUS2FMRk5UOV4hQzo3Y0RYPkoiVDU0QVlBSmo5YWM6YmQ9W1dlWCFIV0U/JFthLERNM09c"+
    "OT1mS2M4SGNhRSNwSzIzXjZIUUxNKlZgRGtDalNNTU1XMkhCX2UoPF5jOkwyYFQ2R0QlYEBSWlNOaHBX"+
    "cVAsWXVySChvc1MjQVtUb19aSiZYIlIoIWpEY1VnSWE1Qk9Sa05kND9acicsWyptbmZIQTIoTlBvPy9E"+
    "IWJxc28pP2suYWFbKCNQOzpLZUI+LTxgRVIoV2hDPD84Ok5rPCRzMjNIZzBLaCowUVZzVSctWTRdTDEl"+
    "UE9gKkVuaStfL3NqXFMkc1pEPUEzKWFKRmdKSVtmXy40Okw9KjZlY2NPNl5MQitKVVQ/Yl89KlZcT2Jd"+
    "ME5xJmUsVFZGbzxhN0Q2USdgSFlLYUF0cD9ERWlabTQrKjAxUiQ5O1k5J2lmKDpbRUBPRG9zQC1XW01n"+
    "UE5IKiMxbUkzQmZXJ09zTDFmNiU+ZCcjZ2ZkMDJVPCc6YG5bNGNITDhRUHRKKk8nZ3FFdEpIUnNhZlRG"+
    "NUBJMSFvWSJlNztYYi1IYzdaSDNzWCxsOXInIU8nW14uI0xnKyZLMl9AKClTdE9tTC9bUTRFLUZFNV9M"+
    "OEFKLS09IVQpXywjMyhBUUVdKlM/IUgmUklkOUMtMWtAVF1rKmwlODxwK1I6SkZjS1s2M0dyM3BTU2Fj"+
    "LzsucjVrUmtFblkxXShWcGdMWSRaOlNxVSw4ZioyaC1iNj5rKylFZm1tVTMraDQ8WDg/JmhnXHBIQV9M"+
    "L0cnOnFTZlhnIl4zSFlGWkNuR1lgPnBkUlxaZk9gSWNYcS5Bbz8lRU9vbVdjZ1Q6VydxIzovSTgqTWg7"+
    "aDVqVT9oPnAwTEojcFFyPm80VDFqY2Y1WV0/PjBEaHBjOygiYTtFSlhfLmFkbmVUKzA2dGlib2NZJGVN"+
    "LGZEKG1aZWVbVjQzVyVzamBiVDpiWiwyQzY8P3NiKFprTipBTjItLDVuPHJuMU1tbTJHLS1UPVUrSXA4"+
    "JXJnWnMuWTxaIVptXipJRHJFVjthdFlvUj5ZSE41b3FPWmVsUio7MVVvLjEmJUpJMzdtYy10Nz9lPzJf"+
    "NHAkO1hHaG1XXyFgPWNzUzhFUCIqUjJjWCkjOiZvaFw+L25KOldObD9PbjYwQyJLRTsyaXAuPFBJOSwz"+
    "cmswVGlCYkNOWWk6OF9vNzZQcDw2T21POFdCLVE7OlY9TlIqVEhvYElnR19IUDwkQVIjQFBaNTRVKEAs"+
    "LU0uRWpkNUYwRidiKiFwRENSa0I+UldOU2tUP3B0ZC9mI0hzPzxHQCcqMj4yTmM9VE9EKF0iQklBJy9P"+
    "XXFDUV9NWmdcRy8jV284YFhZcFotW2NsVWhoJF5dLF9CMStuTWkrXWgyXmhzWGNjWU8uVktpVVYzKG1k"+
    "TCIqXENcXU9FSU5QPllKXjRwJDtvPUA+ZEopUlA3WjpUOiFFV2pJX29eQFdpZC5layktdFltaXUoLEps"+
    "Wy5QUjxKRTNcdTprMjdaI2giTERnKkZccUAwYG4qW10xYUxrRUc7NyhkZnUwQjhbMF1bLztna1IqbFI4"+
    "Yl5sM10iMENYXE9uXkwmaEpgMDNJRzZwbThUO2o+cUY7J2ZhRzJRXUopJyZGREZDQyRbS11Ham1VY0FX"+
    "WTJSYV9QNz0oIkFTPFNPUCkpKDdtL0RxQU48LFxVTWcsVTo7U0NqUTE3cl5SblMwUmBsXkVaa2VEZSc8"+
    "bmZtajEtV2JpLEBxP1tqaXFSOCdoNGsiYzwrWiMpPWVXPTlfdGFgbVR0LichZENwLy4zbEllU0pEXiEy"+
    "PmJpY2hBK0Y1LX4+ZW5kc3RyZWFtCmVuZG9iagoxNSAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVE"+
    "ZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAyMzQ1Cj4+CnN0cmVhbQpHYXUwRDlsbyZJJkFAc0Jt"+
    "JmF0bEFrQGxVYVBRZExGPkQ7bGVaZm5yS0lHSXFUYFYkLHAiK0MoaTI3YlpwKjpZP09bJ0ppTW9FRT4l"+
    "dXFkTlQ/LXVXQ09kTThuRWhrQDZuck5QJjEnVURnTlcvWXA/JiE6Vy4tVkpKdWpjZCNhLWtLbmdvXTwq"+
    "RFFpLigyaVtHSmctJkc5bm85Y1pBb1BPZVAxXF5mKGc1WVchTDZzTlNwKmw3X28ibVMnWTxXUU5rTChF"+
    "dV1cajJNWkZAIkRSPFUwI0ZQUC1XKHFmTVxxJnE0OCFja0VESjtBZlthX1wlPkQsLWQ9Wlo0aylcPmhp"+
    "MnFBPD9jMlJJW2JtMU1wXDZRP01yS14sRyleW21sJE50YishYiFQNihETTc1WipoYDY0LkUlR29mY3I3"+
    "UktfVi0yTDUiXFdEOCQuRnJsWDVuQlo/R1tlJ3M9PVxMck8zQnBCZzRNIihCNTM4ISU7U1JcJ01AMj0t"+
    "YypEcVBRQ1wvaSRjZlVScCkmbE5eb2sqN15AM21sJ2tgK2VjTlBjIz9LVTFhSkslOkAnV3BkQ3EvYiZI"+
    "PypRSWNMVVNIXWhvZVI6bmUkaEM7Z09JTzdVJ3QnUG85PDk7Lk9JZUtWalQ7YitTM25xdW4kX0RLLWAh"+
    "OE9IJi5CQj9NZiZAQ2BZLkFyIiUrcT1rIlAhOTZlPXBaLmxudExuWlF0S2kyNC4sRmNzNyRqNFU7LVtO"+
    "SDs0NCQ5N0B1LzdxRStFU1VZNC5DXTIkV0tiQGlAU0ttLFFSZmo+R0xaXk5rRFcoalYsI0pwIUYwaUtL"+
    "SDViOEFaUnBxQGQzcWxLVFhWTmFtKVguTyRZXEhdRV9MRy9yKUQ9Pzw+dGhZRF5zMCxPVUgzIj9tKidJ"+
    "NSYxXTBwJkxMWEVEWV8nPTdeUSJONSMlJ2BoMDZdRms4MmpCMlVOLjtJWzhbOihxRmVLKDU/KzgwMyFy"+
    "Q2dlZU5tOlk8Zl5DdEJlLVlLQF8jZ2szP2FQQWteaW5ta0dELyVjRChjaFhIVjZlLCktLipSQ11xZmwj"+
    "JEEuI0c4LWAzXFdYZ24rJltFXDRXbXFLJ2pUP1wsN1tcSmtfSGcuIz9jcT1NcV04aTNoTHVrXS4jXUAx"+
    "WHJMN1BxVyMpZmNJQk85IkM6dVYlN0tvciMkKCFYbGBlXT1NbE1PJkl1OkMyIk5dKEI8OmdKXT09XUta"+
    "V21nSyFsNm4uMTZOOmtMby8mQD8wcmNEKGxqLVVQR2MpLDpOQGhKQ2VucUFbSSs5XGc+Jmw+aF9pJmhc"+
    "PSIqQ0NOJSo1TjhsPidQQ0d0czBXPlVOLTA6XTcsRylbbk85Yi9NUmhnVys0NzlXXUlxPF1RUjFZOkxa"+
    "W2cvRytIWVdqWUY4KEBPXWNZdFBcX1UzLzBfcFNcLGwrZiNMc2RNNDRjckAsVDFadDczJll0MkosQj5Z"+
    "LylucGReR01iPmBFbWQ8YTEmMVplMW4mcGE1dHEjbGlBY0siIkgpJSEvdDZeWi45VTs5ZWxqblxhXmRZ"+
    "NjJGLllNc3AjM2NvOnQ6VU4sQU10ZkRVJGYkT2NOZkIlaGwraC4/W19xR1JnZlk3XUBoVW4kTShHVU0q"+
    "cVVcazsyTTBGWTJQbzA7RmYlKGxDK0NbSlM1dFZfbWlMMW4haiojJl5mKlg/InI2NDptXHM5RC9BQ2hr"+
    "ZmgpV1doWEhFPkRlZkwiMShyZzZkYl5lP0wyK0ItI1dHdG90dXBMSi9YY2ZlXWYoM0dvMzpqRi0lJTRk"+
    "KV5cdGlRLGgpVmM7OnMlN1dsJC1lLHM2OXNZYzYqV09zTyJJbStqMmZZJ28iVStYVUY8LGMob2Q3Yzxk"+
    "OnAzKGw8YEV1cF48XT4zPTxbOmFQRmNvUi0pPEo3LUdac0dvR1pCclQzUTE3SlhJTWArZU43LGVZOypF"+
    "NWM0VChAcnNuJVQ/NEFjX2tJP1ZhYFs9ZD5XXyJDN01JaiMmJkgqJS5pcjZebSlnTy83Lk0vOyY2cF1V"+
    "bXBDPVthPDovbTRiNlAtS29vP2RDakBWJjNYT2VbdHNLU1diLVdYJSN0ckdTLklJckhValBeYkhwazMj"+
    "W1MkcGUoXCtob1I9VEksdURpbyxIWWA+Oz1GYGFUblRdME4mNyhiVVphX1VIZWkvKWhuciQwQStzLmJl"+
    "JUg9U05xKXVIaEw4SEw9cDRMc1cpIldwLVFLSU4xO1pWcyk4QzV1MjVELDpUTmBtKi5IYiMnPCMlMEZA"+
    "c2ovJ2YkbW8vRideJFAlQ1VzYzBuXDJ0TGwqKSVIXGt1PUItX1ZWSkklRlAzKmBCblZdVm1gaV1Bc0BE"+
    "ZVdFSlRmOmgybEAsSkRJLjNfPyZBR2hvLG5pP0tdcXVZcDgyN0VgakRyYFpJY0ljU0otO1IycDVPKj41"+
    "aU9UZkkidWxaaUlSczxxJWknR0w1JkdEPSY8TU4xYXJqYmdJcG5HOGZySGstayYtQCUmQjIrbFdYL0sn"+
    "IW5FPlksOkQzZ0dNL0VxX2o9OltJOSc8bTxybENeVjJMQ0IjTE9jcUpxbEcuKlsjO0xYND5wYCwhaFtR"+
    "WypGYy1yOSJeMy1wbD5pW2ZTTi5BQSk1M0UqbDxrOyNKWmBrTj9qUi9fZGdaTVlWQEdlKUc4SiNdLEki"+
    "cXRGJFFJSWdkYjZfcThoYG5eTEBZTjNwPGAiIitGUGU+OD1wMEopTEczYyMyLF1wczluOVdXWThcN1Uz"+
    "Jyk/Jl4iKzpqRzpuNylmP0kxU1g/OUo4TjRWVl5JcnNkcl10VDtOV3VwUGI6Y3VNUkpBNE0oXXIidV1q"+
    "cElYKEZfT1o/TC5YUV5cbGgrJ0BbRzY1KFhlTFZudFEkWCsiN3RUTj5PPXMiRGBTUmNZLVVWZSlxayE3"+
    "Ti8nJmBnY1RHXlxbZ2FwajlCa3FeIl9QKHUyNjVLYiYkdSo5NUQqRDdbKT8uOVkyNy5tOCpeWmgtb3VG"+
    "RSgpPF1BbjtkKSdOMkgqLmwocE9qV3NgJ2YpM3FfVm87OEoiSiReQlVzUidOMiNnXEE7J1VIUjlZdSkh"+
    "QElbIl9zUFNnM0Y3LzpcOk0zIWJnK0xFSHVTbVBjSkNjST4oN1Q0byxrZUMoc2B+PmVuZHN0cmVhbQpl"+
    "bmRvYmoKMTYgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9M"+
    "ZW5ndGggMTAxNAo+PgpzdHJlYW0KR2F1MEE5bG5jOyZBQDcubG5MMnJPU2lzNUkmJ0goJV5gM2o/QCNJ"+
    "YlYlRyw9T2xWaStIV0lTPVptOj5DIypNUD9lblhybUlGPTtyOyNJV3VeS3EjVFhsLl9JIXU9MjEiST4s"+
    "UFdYRzFvUE9CL0NjOmckV1B1NVhHYkA9RlwpOGVRRmRscVU6LUpKbTdZN01gOGl0LnRRJVNnUnNyLjol"+
    "RldccSI/VWtCQGwoZyRpSj1kJTgjaStfWGY9ckNGY2V1c2FcN2JlQV8+JCs/JD5abm40JTYvOWNeJyIr"+
    "KC5LclRCJzZxOGg+WE4/aGVcJD4zZVE3OmQsdG8yLSllNlg2I3BFU0ktYVtoJlVeJEBhYDw+VipkMS40"+
    "bj9eXTJsMS87Ol1cU2RFIj5eT0VfPlVpODsnZEVlMzY9QGJqYml1TSw7RTQuTWJlYVs1MDdgP21QaSxU"+
    "W2RbRSVWZSdfPmQ9I2JIVk0mcztmbFcvaWE6aWVRQDA8RixsZCVTSyQuTmZtJUBBVj5ZR1FdKiVHX181"+
    "aEs+TVRyS2wtcyNoVjwxQmY3YS4qKV9iT1RrSjJyaT9VdUpraF5UYjYyOmlqTSZAQ1FkIy8kbTk+KDVv"+
    "RStwXSkqR2cnWUZuZm8mRTpXI2ldTTMtZ11oYSNkT2dgcVJzQXVIMUg/XydbayVjc1dqSlEwODgzLChr"+
    "Ryc1NHJMWkwvRjlDKG5IKD00YCIrLCdkJFksVXAsO1FwM25eMUBEWSZyLlxNTyZWIi44LFZOaDk3UjZP"+
    "I1YtKywjYUdWPFUwYE5nTSkqQ1Q3XkNTcSkwLzxfPVkmUGAnL1FpZCFkMEZoSnFgJyFCVFknLzpqW2RE"+
    "QU5tazVxWlk4WyMxdTExVmxEVzVdcj5WZTdMclUzbVlWTXNXTz0zbiZMKzkhJU9pOmdpclVfP1BuQzpZ"+
    "TWBQMUAoRXJQMyxGXkNWZ3JcVStebTt0UGhFXiUrJ2MjLWwuJlVSYDwnZE4ubFpQM11nRTFCRjQ7Qj5o"+
    "MVY/OmlXMSc7V0ojWVlLNGlZS3UrTXA2MjBaRTVtODdXQkAqcUJqTkdhLj4sQzk2MltnMEBnTVE4am9I"+
    "OD1jYiYqVWVIbUleWC4nOkVXMFVYSiMpLXE0PykyUT46XT88MSZuO0NVRT5QVExOWCpYXnUzNmlJSSYv"+
    "KnFsUF8nT3JjTC5JUjohPzFEKjQ9bjo9cj1eXDBcRTh0al5dXDwiZVpDNkBOWCxYbFsjZVYmOmpqIl4y"+
    "V2kxNHJCVDNaRXApbjptNSo4XW9ZKjUqJTdhXiFVb25VUVxTZkouYXJmZT5OKTk9VUxhUUJcN04lOFdV"+
    "Kk5mcTk/LVNsbjxdYH4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTcKMDAwMDAwMDAwMCA2NTUzNSBm"+
    "IAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxNDIgMDAwMDAgbiAKMDAwMDAwMDI0OSAwMDAwMCBu"+
    "IAowMDAwMDAwMzU4IDAwMDAwIG4gCjAwMDAwMDA0NzAgMDAwMDAgbiAKMDAwMDAwMDU4OSAwMDAwMCBu"+
    "IAowMDAwMDAwNzA0IDAwMDAwIG4gCjAwMDAwMDA3ODcgMDAwMDAgbiAKMDAwMDAwMDk5MiAwMDAwMCBu"+
    "IAowMDAwMDAxMTk3IDAwMDAwIG4gCjAwMDAwMDE0MDMgMDAwMDAgbiAKMDAwMDAwMTQ3MyAwMDAwMCBu"+
    "IAowMDAwMDAxNzc5IDAwMDAwIG4gCjAwMDAwMDE4NTIgMDAwMDAgbiAKMDAwMDAwNDk0OSAwMDAwMCBu"+
    "IAowMDAwMDA3Mzg2IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDM3MmQ2MjY5ZTUzZWI1MjY4Zjk1"+
    "NmE2ZGRjZmI5NTNlPjwzNzJkNjI2OWU1M2ViNTI2OGY5NTZhNmRkY2ZiOTUzZT5dCiUgUmVwb3J0TGFi"+
    "IGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gMTIgMCBS"+
    "Ci9Sb290IDExIDAgUgovU2l6ZSAxNwo+PgpzdGFydHhyZWYKODQ5MgolJUVPRgo="
  },
  9006: {
    filename: "peer_review_9006_2025-09-15_Hans_Vermeulen.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IEhhbnMgVmVybWV1bGVuKSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgOCAwIFIgOSAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDMxNDQKPj4Kc3RyZWFtCkdiISNePkJBT1coNE9sPV50VT8sI1UpR0cs"+
    "XjVsTjFzUyMuMkhqPjY6MFtHbi02XDNQIlkuL2VuXD1OUSs6MXJPQlpqT3FBczpqXUVCLSE7SS03NFhp"+
    "a1NvNUlgRUJvaENRYjY5MUJhR01eO2RRb3VRLD9ubnAyWDExQlJtK0pOYzMzJEFTak8rb3RUZkVdbGNS"+
    "NF9PKE5lMWFobi1BaVtQOSgyaiJLcFYhcF5VVW9ec0FxI1Q3PVtaRV42LTomakpSK2pASlJAOC0ldD8j"+
    "RzA2SSU9QWBwKEM9Il0zQTxyTyRRVjFjS19jYSJKTyJbX3MsXEJlRT9pPUBaR0VJKTpiUWlQMlleWixp"+
    "SElEQFc6KCFWX08mKD9MQFssUmZNLVFjMUJBdHIlJG5MJ0ZALyRaXVFsTzUmJ0VvVmRpYUopWTBTPlNX"+
    "dD5hQzNoZiYraU0nYSFUKWZDKygnLVJiXSQoV0Eoc2FvJyteXWhRQFhvVDYwcz1zLV1VIUlRayoxZU4h"+
    "V0tbPEw6MlY4OSthV11eVF1eXFNoKHVIKkJlckQsTV88c2o7dF03LT8+NVY3XXQnKiRxMHNcTSNnKmVd"+
    "c0E5LlcsTWVNcTwrQ1RWV0khNyc6c2FgVztDdDIhYixmbFBVMUdmczBDLlVLL0ouKkZFMWVda1c8YVs+"+
    "XyY3akUhaThAN2w8UUMlM1FiSiI5WzkySkciI3VeK1tzSj4sc3UtbiZfJigoPEhyaXBkPmxOJkpbZ11r"+
    "NFwiWTgzKGlPK0lFMThBcmIwJ2o7NTNLSWpnXlZTV0pPTEYjWj8wTWM+L0ZoY2FiZEVjUjpEOGYic2Je"+
    "dCwybyJLKkknJkhqK25RN2dfcyhcal8xK0c7TlY3UG8uWyY+WiUvVUhfUmUmOixhV0wyREsvXVRDTXBO"+
    "J106UFFVMjsiVWx0bHRKbVRIbXAsKGJoVEwyUHViYjVOITBHOVBmJWFpVG0kRWwsMTdzdVo5QnA6QzMi"+
    "Vi0yKmU/YW9LLUlXQClDUkw8cTs/YVUvR0gnOjYqUEsyWl1BNkQrX25lKERdVCRWc1AsamMwXUUwaCVl"+
    "MSZJajtmVFApQXVcYT5NaitROSQhLCg9N2Q5MkZBPl91JFpocVMpWy1XYjErUFlAVj8+UEVLJDEoP01O"+
    "WVAsOVpOKycjZi5fM0ZQZFxVWFBlPklWRCgqTWBndWdRalhPTlAsPTkxU2tETGtKNWxSX0BIIT1ITEcp"+
    "cWhQcWpyO2pVMT5OXiRZMG5mRVs0NVFPOjo8VE8lLyJFb1VzZkFUZFQqPTU8M0w4ZztPKTIrMW9OMCxH"+
    "OkxlRi1vWDswJTZoU1JWWzNnZFcjcCFATVs5OC5vTlpJTkJhRDJbb3BTVkQydDJSMj1XP1o7YHFQN1pJ"+
    "YmVETjZTYkVjMDBGNyhuLCE5WSVLKFwkKy47JF1BKywjUEZob2VbIVZDV3BIRTs+RzJGZmZRaWpRaVdE"+
    "bC4zdEFpR2ZDMjBxTlJsOC9dPFRTOm5JTUpWUmAhciU4RjZFU1xBO01AYGFGb1ldIjdXckxSYG0mWCdK"+
    "RT1ra3IlMDNaIV1mUWIzbkxdKmRdXmFLbmA7ZzhaX1RUcmNSODNbZ3E1Vy8lWXJiXEsjXzw/TXRqZENe"+
    "ZW5KP0c+dFVKSkQ0MUlAI3AnM29FU05lSGRMUUxJdVsuP2QxSVJRXydpdG1tSnVKL0gkSFhMS3Bic19m"+
    "LFZ0XUVpbGQ4Zz4lOltcXG5CbktBZFNqQjlSTCZKOnJDUG5CJFhrW2ZhUlpII1xIIkpUaFVPcyIvQGJJ"+
    "VD0/VmVYPWpIYVItPipha1slWkhuXSIzTDJQc2tLOyUrLDNeRic5NCw0RzQ4QU8zQSxpNmo7MXIuIzhC"+
    "dSZUay5qSmRQZDBZVzNOPEEkMmRqOi4yRCRHNihTI01VQUpWV0Y4NmY/MVlea29fRWd1LylrUXMyWzdg"+
    "U2ZwQEYyIV5eajA5PDhNWVclRGRxc15iYDdANihNbiJiMCY4VlJibkNDPFlAUTw8UTNycCk2QClDSios"+
    "NypdQGByaTgvRSonT3MtXVguWjosbUMvSjxMa2IyNXQpcE4oLU9qSjQ+bmhbK2pwTz5qaGsvJTZhK2lH"+
    "RnRJTzZLclZEblJUTGlIKysxUCU9ck03RzlAN1c7ZyNpVEk5dE9COS8+cDVONCRNamhAVzUlUEFWQjAw"+
    "cU4xWWZrKSgxOlplWTIlX01WVUltIzsoSC8lRWJgLChvZCVxO05GbS5pOjVIMTNaZ09scjsyYjprPT5O"+
    "b3NgSicnY0hAck50NkdwbHNKMihdN1JXJjFdWVFyJm8ybiZXcyhUVFdhcilWV0NqdGwxNGk5YE9OPlZJ"+
    "RWlITElvYilcNU5PZUtyO1pbUXI7YFpzPmBucm08NWtDN11KJSR0MG40bWwwRTgxJmM7ZkVBWWYlSCQ6"+
    "XnJEbyRQKmEtTWAjQDxDVVphSDRqOjVJLUEyWEgxJ0dYUToiMHNqKiZgSXMhPlRLOmRLRGNNN1szZChn"+
    "K0BBb0xJTWxiLEloUFMxcGlZUi5kLzckJlY9J1kmVW1ST1FiUG9kRFE1Tzk6dC8tX09VNThEL0AyI2lh"+
    "KVw0OGBmRCVnImJrYWQ+YUpRdD51c29PPzBjMjNgUzhnPVctK2hsOHEnNVJkTS0zIldiXTNLR0d1aWlp"+
    "VEYlaS9ZUD8yLyVkWGwlOUc7OG83ZF1zYTkzZCg+LzpROk9FVlJlQ2xuZjoiJkdDXE5NcFlLYFdPTiNX"+
    "QDh0RF1FWS8rKzwvL0tQTS0qOl9XLSZxRE91U0gsVUMvbChpalIjKVMjbDAhNChOIygyUy4rIy9nRS9B"+
    "aHUhSFFYTVUxaUhpQkpmQlxzLlVNKV1oX3JUcSw3Kkc3dGB0TCY+LkFhXlYmaE9ULm1vc21RXTIkR1JA"+
    "JGVZOicyY2RUTURLWCxBcUMzTkFBRmhmSk5dJWooUFMkTD51YSI8KidAbyU0alVDYi1GLzM7P1JoPnJi"+
    "NG1kJ2NLaiRXPUs6M24jU0VpJ25BTGE/bXRxYyxiT05SUSRCMVByQFc/RWInLTJKbHA+Ri9mNDErQjcy"+
    "ZE5RTUknOW0qLSs7SGRaRFxCSG4sRm4iUzRVRG9qVS5ZTElHTWJ1UjRlQzQ8J3VwUmEoRnJIKXVBTmVt"+
    "cCNhckxkKlBibjpTRlYlLDIsTm90Py1oZnI8XHNXJXMvWiQpRixdPSpxJiUuZ25hI2gvcV9IIkk1LFIz"+
    "LCsoOSwzO2tGSUYhJjZaPj5nQy8jZ3UxKWZuIl5tUDt0LENiYi5kJDJ0XHNWdStoVVdjRyZgSk1HV2g+"+
    "PTJSJC11VzIxKGVwLD9jMEFTQFFsKD8kVTs2bzovKDFGcSlWQmA0ZCdKRCEiYWYjZDtCbmgnP0ElbCJd"+
    "LSRNIiFKMVtLVF4lIUNfZWRrT2tbTjA6bTNgL2RsKCouUyU5VytVKWFMaC0vMyEoOlFsQFUtSCVEPE9Q"+
    "YTQ2UGI3YS9aOVxRakxYVEZ0ZS4rZ2JNVjUhJVs8bT4hZUs/dDY3QGN1UzI8YFQ9czdqQWokXzFZdUVS"+
    "cSJfTmo+LCZlSG9KKzhqQSRIISIjb05vUlBvTzNqJG0sclBKaFMwaS48UnMqRVctQFJBYGBUKSdzQG4k"+
    "S1FXN1pIRHNcJSxFOlZiZkU7Y1c4REBNTzNdTWInOS9HXzRMYHIlTycyNnAjMUF1N0FkKUFbJ05yPzpi"+
    "VHBNMUBzWVdnVWJmKVBrMS5NRWJvWEJPOSE/IzouUHVyZjsuPzclPTkmUldTNSRJZVNkVF9ZPCIkSD9X"+
    "Ui9ITG5cLTUhT0YxY29XaXBILGw/clhsTEAhbWo5RUc3bVcndE0rSWcrNixFQEkhbkVtcygjKjNmPFNY"+
    "OCo5KCc1T3U8cDs5QztHKVpna1dyTDU6WWFoJ1MpWTJCNS9iKkQ/bDMqXCk0WCg6PSw1XyZhbHJOLEIx"+
    "cSxKN0oqPzpOPzVBZ1UvYlwxSkVPailtXF1GWTctOGJkQzE8P01zXSRSYzVUNCosWzk8M0NKJzw9R2RR"+
    "bVBDLmBcaC9FZEFxRzowJE8nWkkhajwmQ1FkUCdqRVQsLWJzLldnTltFQUZvKmwhNWhiTEZxRFtLaz0n"+
    "R0xBU0dNZDRpUXAtby1fXytJSVo6cEgsRzskWFc0RU1PZzFCMWpZSGcwW14qMUJTIyMjWG1VYjV+PmVu"+
    "ZHN0cmVhbQplbmRvYmoKMTQgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURl"+
    "Y29kZSBdIC9MZW5ndGggMTQ3MQo+PgpzdHJlYW0KR2IhVFY7MC8zZCZCRV0sLkpCbF1CP1ZNQiQxWERW"+
    "SHRiWDRYNWJuWTkzdFJLYSMmPG8hbHJRcF5EMS5sTTtva0ZncytXbmorJkReXTM+MTRNYkxxLCYjb1JW"+
    "M1BgWlBJZiJgdFRiJmwuMFRTTnQnckxOYlk3WUtAak1EUUJOPGsyJ2tYY3AnY0dPJ0QmcTI1SEdTKS9H"+
    "J1I1bG8rOlJXMFc1KlswIkA9PFlrRkI8ailjamxJX29UI3VpWmdPb0lkTkZiRSU2RWxYV0pKVyxYVkFy"+
    "cUVbTmNqLExnbiNqSVktWTJeTF0icV08Q004dTE7bk91cl4vaC9oMi5XJjBgVjVBYm44ZDRHRXBDUkBY"+
    "cF1ISSpYY2NbZkY8KTRAM0leZ0QjUyE5IjBVSzJcK2o+bmMiO0EidFFPIkInMCZIUW1ySEtjNCFUbk1D"+
    "VXE6YihmK0NmLixzJzRTYlo6anRgYD0vSSg2T3RIYS9gT15nNj88OmhXakkxPjZRWUdaUlgrQSx1Y0Mp"+
    "Yy9zPVBrZCdoJ0RIQCdUI3FNNSpETSVrYUQzQzInZiUrKTFLci86WjhrOl8+WEVQZCc/aCFyNmpGdXRq"+
    "S1RwRWZKTDxnb28uV0JMR2xrR0ltZWApKSR0Tz0uKkRAKUFiIjErXj8pJkE0cFxYcCNnUVVGNSMndUlp"+
    "aS50R0c7VTAmMlhTJS9MJVtsWG1GJm9uQjJiW2YwQ21aMTApWFslaV1vPGhNIzxyWVlwczBKTTZaQj8v"+
    "JUxoMywvaWE/Mm4mM1kzLEddYj8nMURBRWlrUjBBPjxgUChpRkE8aWohV25TTVZuTU9fK2tyT2MoRzhY"+
    "WSZAN1BlSmNTKVNoIy8zIkZpQiM3PGZLbml1UE9QMmRUOl5XcTo9cV85dUYyJ3BsKXJpZUwtRE9BcCU1"+
    "RC1Cck5KQCk5KU48V0A0Mjk3R1BPTmFpMzJvdHQ2alQyQWBedENmXjhQRSFYYEM9PlFRWUdEPDpKaWo9"+
    "RVQvITxWVXI+YUwoW0FBJ1NOV2thaj02cVhsKzwlTVpXP0trZEpEQGIiQz9lYCFHOkZTYHAhLElcZHMl"+
    "XSpGajhsTm0zdEhGaThMWChQZkVuSyRtWyolK21uLVYzQ1lKIUZSQW11bSU7RDIwMzY+bHRKKlMiY3Uo"+
    "aUNLKGcjXDAjQFBfbVBVXUxmSDJYTFprYGlSZEtsS1xidCZbIS9xVyZnO0g1ZjlATTQlQl5fbDI3Qkg7"+
    "RmYjYCg3QklkITtyUFBdajAzdFQyW2VGbCUsWiIhcnM8KmRTajhac28lPTpBcmBYc1lJZmtAIlJcUnQ1"+
    "XCtNY1JtW2tmIiMxOkg/ITddJSxMR0E+V2UjbWQmOS1QRjs2OlhlUjEzWVZuPGxoKnBHdWtZIkZoRkVK"+
    "IypVNl4udHVbQkxwcFFRVlFTIUcnc0ZgVmRmaUtqOmM/VkM6KChiai5DSGlgJ0FYZWUpXDMuaC02JGBr"+
    "QFdaZmg+MVgiazcpK2IlIkNdKGdbW3RIX3BZOTJzI0EvMzsqNUwtJmBnUT1nQCwwb0lgaDFMK25qZCM+"+
    "Q05scUlddUJNWEllInBPTXBLLTkzTSIoPEdXdShUMlNHVlVZTU1MZC9xMnBcX1dxXipraClIbT1TMEUh"+
    "VWIwNDZjK0ksI15NQj4pJTt1LldJcSJgXmNjNlxFYEQoISsvV1QwTE5jO01EcVY1JEtXIls9JHI7RDhR"+
    "Xkk6b1AsZ04lVXAtdEpKVSkiWSJQdUgvXDU2JyNIW05bbCk0T2c+LDEiVjVHbXRtOyNqISJnU0lTYEgy"+
    "IiZdUDcnS2c+YUU8I2RtOEMzdDdfUFlbTERRLEQwJTpJVWFKOVYrVGZNa3UlNSs5RzJiWjhxIUM+YG04"+
    "XmtzTCszJTleb05tMERYVWNIJ0YsciloS0laVWs0SGBpXGhSbms2YyhWOllecDNqQHVMIWVmRkpcY2R+"+
    "PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDE1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAw"+
    "MDAwMCBuIAowMDAwMDAwMTQyIDAwMDAwIG4gCjAwMDAwMDAyNDkgMDAwMDAgbiAKMDAwMDAwMDM1OCAw"+
    "MDAwMCBuIAowMDAwMDAwNDcwIDAwMDAwIG4gCjAwMDAwMDA1ODkgMDAwMDAgbiAKMDAwMDAwMDcwNCAw"+
    "MDAwMCBuIAowMDAwMDAwNzg3IDAwMDAwIG4gCjAwMDAwMDA5OTIgMDAwMDAgbiAKMDAwMDAwMTE5NyAw"+
    "MDAwMCBuIAowMDAwMDAxMjY3IDAwMDAwIG4gCjAwMDAwMDE1NzMgMDAwMDAgbiAKMDAwMDAwMTYzOSAw"+
    "MDAwMCBuIAowMDAwMDA0ODc1IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDE4ZTcwZmUyNzkzNjlj"+
    "OTNlMGU5OWE5MmRlYzgyYmRjPjwxOGU3MGZlMjc5MzY5YzkzZTBlOTlhOTJkZWM4MmJkYz5dCiUgUmVw"+
    "b3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8g"+
    "MTEgMCBSCi9Sb290IDEwIDAgUgovU2l6ZSAxNQo+PgpzdGFydHhyZWYKNjQzOAolJUVPRgo="
  },
  9007: {
    filename: "peer_review_9007_2025-09-15_Alistair_Burgess.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IEFsaXN0YWlyIEJ1cmdlc3MpIC9UcmFwcGVkIC9G"+
    "YWxzZQo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0NvdW50IDIgL0tpZHMgWyA4IDAgUiA5IDAgUiBdIC9U"+
    "eXBlIC9QYWdlcwo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9G"+
    "bGF0ZURlY29kZSBdIC9MZW5ndGggMzA5Ngo+PgpzdHJlYW0KR2IhI14+QmVROSg0USJdUiY+ITZNW1on"+
    "JWtnaG91S3NpTlwwJC0uWzRcWyJGbyU0X18scFVOYnI7MXFpRkw+VSk6OTI4bjVqVy86SGhRZ0xba0Mn"+
    "JSNDaEkrTiZRXi9dTzkoQyNVVWgvPT42R1lATWVMY2xcaW1KTTVYSlsmVSs+dCQhRW84JXQuZW0rL1Um"+
    "P1NNKT8iImlqTiZHUDUpY2gmV0YiSS9GVDoyZ0JTKlQyMVk4cmwhSWVKQEldZUlYTGUvT14qYWEjTz5W"+
    "IWFxS149U2ZkZV0mYHRpaDBaVVsvKkIwLj9IVjArMC1bclJMUV9BTlw3U0dqWjZmNSZhPFRHWFdxbyk9"+
    "aTFTLiJpRipvWDhMWWAodW8uXyh1Vk9NS2MhS2ctJzlBT0tzK3JqQmI1K1ZVRHBNbCUoPmY7dTMtUjdF"+
    "SVxlbSZBNyNMNHNxQSVLTypVcGlaJmE2ZFwnbEpQM1BcIiMxP1RzNlE1Uy1eWEZfY10ycThUWiJkTFJB"+
    "ZmY7dUJlSUVdLDYxI2RCYlgyRXU+aWRUYishazpBMDRtYVRhOFckPyw5KkVsNUhtRTEyZFFdKWBOWio1"+
    "PSY8IidlIkZmRWs1bjBpWmozUyomKzlRVkUtUmZURzssVCFGOz0oP1tlZiVaYFttTU1aOTEkc1U5PV1T"+
    "QSNCMSNIZjphK0VEP0pzUC1XbW1FKDlGRj9lU1VGWmppWlkxSGNvYC0zaEpXRihTQkAhO2FTSFNaWG5M"+
    "VTBWZltNKVtMJUE9NGo6UyJvSDlvWWw+V1RmJy9dMShjSzslJCtpYiMyMTs+X2VMWTJgWkk3ciFkcydH"+
    "KidURmNWKzM9ZFMjS0czMVJmM0I3WTg/dUpkZ0pXLUVoWCxTaWFGLHQjVnVgJGgnJ2JHXmdTXSw0Okoh"+
    "SFNgKF9OJSUpLVchJGghNmoybWxcUFFNZGktdGEkNiJOIV5OL29Dc240Sk0/QyVHQFtNLFREU1xpTidh"+
    "W2E8PFBvT3RgQj44Q08sOVpeRU8ucWUzXGhrL1BSLXEmP05qNF85cm1MJ2ROUldiKGVHJ0ouTCQ+aVlF"+
    "Ll8tTF8oYzhPRmIuMVAjRVY7K3RjYic6Qk1DJidwKDBlPnVMXCVPQGJkM3VtVVtcbyQ3aF84PWltJHNQ"+
    "JTJDcDxFIWE3PGFASCxGc1pvciRIZyQ/I3Q9XD84OVwoUWRJKW1hKW8ucSF1YCRZIWtVPkhcdVA1Ylln"+
    "LDdYKHBKZnU+a005WGhRbWJHN2g7ZUUjOERaIy0nRTZRS0FHa3A0OzhCcGtkLyxbSmltS2RrcF4uNz8w"+
    "VD9kKFJjZF81R2cyZ0M3UTpENGYhOypVL1pvLTpRMTpxPi9qR21ObEFYXy0mOCVBKFkxO2xmbFJxIzdN"+
    "SFhtPCshOTRsUT1JSDtRWXFlZ3MhNGhLVVg4KVtKQWZVOERlUmMiYWshJ1RiO1QnLVRsY0IvVU5CajUv"+
    "NlFXJGRzWzJXWT5QVXA0NVVlKHRoT0c7ITJQJjVBMiQxa3U0RE8qamtSYlotP1tLZnRRQGxIdWlVPFU7"+
    "NExaWzZJZmRrP3MjLmA7QWRPW09DLGxOXGgqRkduUmgwTkJKWzpeMDYnVU1VVVJEWV8/U2AidEw7M0Nk"+
    "JzNILFw+SjMsMTAiMk0lR2chYEdbR2whJUZYV0xONnAiZVEuLFQvb08obFgoQ2o5QyxFXig0Il9Sa1Jk"+
    "dWEwaXFwTy5EYldCZjkkKFs8LzMnR1ZIY3FOSFgmWiVoZWpOaTZyVklaTksybDR1cVRlSkshUzYwQGhn"+
    "UyVGQkMyYkVvSDVIWiY4Lm5TWzJMM0lcNEwjRSFFaEhcSjJSMms7JnE6US1IT1tpLmc4UmpKWlo3ZmtG"+
    "YzlgaEcwSiRgOyUyNDRKPEdMY21NVm9hUFRtPC9xLFw2PkFjYlgkdG5hPD5OSlNBOiEySTpiMUkkdF8p"+
    "Y1NZR1UubVEnJUJraSQzNF5nZD1AcGlQaWtNPE5aT0hdYC4pLGY0RDohYC4nb28ocypDRF5TQDtvSHI5"+
    "IUBLPTtHRScvZl4pIi43Z2FmMiRILFNTOT8naEVMOzpLP3U8L0U5VVgyVywyLyYsIUFTIjBIZCJMa2VU"+
    "S3JTPUJMU2dfPTVWNFBRNUpfazdcSHBxRkZnQzkpY0pMWVRJVlRcPUBHYVQpM1BTIU0hLCdBUE49WD4k"+
    "bUhqalgsSigtSzVeTlxrPz43XEBDX2dhaiIsQy5nTSNMJShUMklFUF47Uj5Qc29dT04vamM7Um1iWzoz"+
    "TGFZdT9WVUZCIzpgTitkRWsoYUpIbT0ydDBNXHJeLlBKbD9WLTZFTW1SS0wudGwjS3NEOXEzYlAwOnJZ"+
    "RyRnOUI9TGpYLWA8SGE2WS5KXEpdOWc+OjFNYkJAQSdkaXJpIjdPXVdXUWJDOGhUTlh0TSkxPm8mWmh0"+
    "U20rIkgqanMjR3Fwc1ExTmFnVUxqXkhHOHUyJ3RZQ0xDRCNoWV9kXWpLIzw9NydsYCd0N11QQW9fTUNo"+
    "cVVXa1JHRipKREBHKGMxS0xQQGpSKzlCMF5OWSdeLCs1aG8sczdDTTduP3UoSiNBKFRnSzpddWNXNmUi"+
    "IjonRl5xTjFYI10oSjs1Pj1eIllIRyRhSFVoRENrJS4sUGRsS2o/X3VIKVwhKExwbERJPk0lRihKTTJq"+
    "bDw5JVU+bTF1VzNUblItJl1CKVlnTWxeQyoqJjwnSjMmT2cjY0lxTUAvMmtmU2BvKFI7ZmIjXmdOOkRH"+
    "KV5YWCtobGIldEhHVjojMGEtLkREaDg4M0NKUyhMLypZSyppJjtDaFteYHRjXCIhQUFEQVlJQCRfUCJY"+
    "YzpNa2g0cCtlMkg6OlI7Z2lNc289KU4odTRnLnUmQzlzZS4/aDRKQTdTdC9yXCxbL1Z0XWQ9YzRsXCVC"+
    "WTE7YSo+N2JtTiFuVmolXFI6JTIvPDlkPURmUlhBYTJxZzBrbmN0N0QicjRLKSouKVFKKXNtTl8xJVFu"+
    "OT9hSz8/W3AwcUhlYSE4WyZtWTdSWGlFSDouOEVeLFBLKlwtIyNCdS1MWyhOWjNkQ0NCa0tLU1pbLWZx"+
    "VUlCRGFNWUlEdCtbYV5DUjsna1otczBIbG5YamNCLDAqKlplbFA6IlNdJy86PydOTzlKW1xHNTZjdWZo"+
    "OF5Ra3Uucj9EQCJELUQlVThcTXRaU0Y5JipnWzdHYm5oZXFFT0J1THRYYmRLPic6XFsrLWlOPCdSIyFf"+
    "S08iMmppS1szQV1BPmdxb0wiR2A6JkgvUjBhYV1rMmNUV21mPi4rWjVDaU5LclEpcDApXz05SEQlQEVa"+
    "XmI2IWRdJCwmb2BEbUs6ZVxEJTNcbkYjdVUqakNALDUhQ2ZYb0EucUVeamJqbjRLTDRLZ25RUnJhUE1H"+
    "cUhXLTl0WzIvKTssJmk2UURINyU+aS8vNyRLMW0nYlBYOTdjcEgpVSw/KVBdSD07VD8zQ1FhITFDSWZK"+
    "QmNCbSUiQjprbEFaOmVtIj9JO0EqUlY0b0o2RiphNFFFNjBYOGJQKFtoTzQxU2laM2skQ0JcTGZsOmsw"+
    "JTFNOHBhPW8vODpccTFLJVFITnBqLmEjKTdTcmdrViRKUmtTS2BVUEpLUDY7QFVgKT9uVWtoaTstLyta"+
    "YCp0Xi0sL2tPLzpaUFNFQVYpPTtPXyEsOiw4KV4sZl11TiNwXWNpZllEU1crN20sb3RwIThXMSVmYVgr"+
    "TlxTXWRbcCVsKiVWZkEjQDFbPF8nbTk1XkRnJiJrPjVbXkZsI1prZ1M+SVFKOmkuXEN1bTBdXkImaTJq"+
    "aHBkUCxna2ovWG8hbG50YmVTVzQwI01nVUE4ISxUNE0qdGhFY15JVCo3YDZpXklTLUJxKCYzJlZPKG9N"+
    "dCpuZSxrQy5PP0lQU2wsVyVRREsibmVwMV8yYFFgYzVxY2FZXFhjb1JfJi1mTEFLLFlFUEsrIi0jLEJA"+
    "SCxNOW1UVFlAIy9dOmBzJXMiKTloQ3A7Z2ZvQDdQSEcuNnNjUDI0PkhRdDA5dGpeLVFEYkhGQD0yYXJl"+
    "cFBoTzxvbCo2ZSJdWSxjN2xUMVlib01lMlxjInE2J2hFNW4oUGJEOyFNPl9vQmJzTzlPciwsZV5DJitx"+
    "RzJZZGBcXEZTXH4+ZW5kc3RyZWFtCmVuZG9iagoxNCAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVE"+
    "ZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxMTE2Cj4+CnN0cmVhbQpHYiFUVTlsbyZJJjtLWk0n"+
    "bWpcXGJTVUBHISRpcD40Lzk3WEdUJ2BJMWAnTSwmc0QwTktGOltYb15CRWlPc3NXNzhFKy8sJ28xY0s9"+
    "Uk0pUTRNKTQuTUFMJ0JkaFRZaSFxMVNKXmMzVFxAIkpZVGM9KWxwcllfdWQ7Q1xETSpdIic+LV1xOjho"+
    "bnMiPGRsPScnOC8pRVFKQWQ+Ik9UPC01KCYxdFI1dCRaIjsmbUNhPTVYUDNoaTtDMSZsIVtQZzhPUUlS"+
    "USlVPVZeISVpTmUkViItXjYpWTYwRXBnVSdWckZVIUtEKyk6VWpqMVw3ZS0pZTVPR1k/J0BxaGB1MmFh"+
    "a0wiYyFqPWFRN1UqXGxbbklCOkhaJmY0SF1JRUszPXImVThDYD9qP2Jnb1QpZFNtQDJSWmRVWzU7amdo"+
    "ODVZZWAuOUxLQ1U+SEMuO21xbCg1cDJqTyhNbl4/Uzo2UmE4K01mYGUvS0chRjk1dDQ4M3I5Mmc5X0dJ"+
    "MFByPW9Valo0VnE1Ni5tSFc8L08pKypwMis9PmxsTydqIlNFWExCQD9VZTVUQWIyUywlM2xsUXQnO1tQ"+
    "OkVfMjFEMF9AZyReL1tAKzFiMGxMJEtLUGYlKD01X25yUURqb1A5JTRpIiQmU2VoK1VPKG5ZaD5vKF47"+
    "YjRsZl9NXmRLV28uTy9lR2lXRU8pbk4rZzNROnE7OyNEcThoY2w5UE5QSUpVcSYnbldjTV1QVlxLZ049"+
    "LkclYkJhWC9nOVVGTV5cZCRKSmthTShuJ3JBVVBcWklFb2g0UlxLa3NAJHNbVVg8KT1hPmM2VnMpKjNc"+
    "aFpHJTptX15NY0s5MWVgTy8ocU9uSl9mX01VUjFZUktNLSw5NGdENzlJWjU1a208VUhIbkEhYD5AIkhq"+
    "MCwsQiZic15tJGdIQ0JLQCUnVjFwaDYoazs/TVZTZEU7QGZlbENbUGNNVm4hSit0Ql0qRyJcUFQhbV1t"+
    "OzYmQihCWDRpWlcuO21vYVlncm8lbjhdciYvTmFGOWM0NGtYRkZ0bGplWTBFJE9FJSFmaWlUPSoiIWtc"+
    "M2QucVwxYFJKVGpoQklUXWQ4UG1RP04tWmY7UzxCbGEoP2NjSFR1YGo8Y29WaXNvP2FqbGtOSl0nWThG"+
    "RWBDOGddLlpkK2RYQyUrRkdHPUFRY2MuVFlHRUEtWXBJXj1Jcj5nSTtUPlBKYE0oQmlqJiIqPz9mLlFw"+
    "ViFdUWw1RWtYRVtpLkdpSVs0cGk5anFzWCdIV1ZjYD1gVzAkZ2MxaTAxO29xS14/U1JhJiEvJWpxbWdQ"+
    "W1RubmI+ZG5wV0teMkZPY1xqOSk7UTBkRTdrMiU6ay5GJm83ITNnYT9KJVZtQFNBPUMpI1kuTG9CX0I4"+
    "SSI0bjxTL0VpPmRqJExgUXRSbmdSJj8sXEEwR1lfcGknZGc6bnAuOD1mNDgrL0ghL1NzX1Q0QjFGXFFA"+
    "QHRINElFYUNAMF91O0MvRWNwfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxNQowMDAwMDAwMDAwIDY1"+
    "NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDE0MiAwMDAwMCBuIAowMDAwMDAwMjQ5IDAw"+
    "MDAwIG4gCjAwMDAwMDAzNTggMDAwMDAgbiAKMDAwMDAwMDQ3MCAwMDAwMCBuIAowMDAwMDAwNTg5IDAw"+
    "MDAwIG4gCjAwMDAwMDA3MDQgMDAwMDAgbiAKMDAwMDAwMDc4NyAwMDAwMCBuIAowMDAwMDAwOTkyIDAw"+
    "MDAwIG4gCjAwMDAwMDExOTcgMDAwMDAgbiAKMDAwMDAwMTI2NyAwMDAwMCBuIAowMDAwMDAxNTc1IDAw"+
    "MDAwIG4gCjAwMDAwMDE2NDEgMDAwMDAgbiAKMDAwMDAwNDgyOSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9J"+
    "RCAKWzxhOWY5MTUxNWNiZTY5N2IyNjlhYTY2YWRjYmQwYWIxMj48YTlmOTE1MTVjYmU2OTdiMjY5YWE2"+
    "NmFkY2JkMGFiMTI+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAo"+
    "b3BlbnNvdXJjZSkKCi9JbmZvIDExIDAgUgovUm9vdCAxMCAwIFIKL1NpemUgMTUKPj4Kc3RhcnR4cmVm"+
    "CjYwMzcKJSVFT0YK"
  },
  9008: {
    filename: "peer_review_9008_2025-09-15_Timothy_Keung.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IFRpbW90aHkgS2V1bmcpIC9UcmFwcGVkIC9GYWxz"+
    "ZQo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0NvdW50IDIgL0tpZHMgWyA4IDAgUiA5IDAgUiBdIC9UeXBl"+
    "IC9QYWdlcwo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0"+
    "ZURlY29kZSBdIC9MZW5ndGggMzAwMAo+PgpzdHJlYW0KR2IhI14+RjQqUSZVcj84XmZ0QGwwMjcmVlhh"+
    "UkpxXS1nQEItc2lKPFsrUlFcOFAjUk1PVTxiUmhMRkYkNVNCa0ZlNEwmNTtxaWZTI1tmP1IpMTsjYkJU"+
    "JjtSQ1Q1V25iTGtQcUhpOmNpKDIoZipaXDBMU25qaUQmM1ciNTpbM05CI1lXXkotUjQhW0hdPDZqNWtW"+
    "Y0ZiWig/KE45STU2M2MjNldESWFBQXFvUU5FSTcsb01ANTBuXVYlRj0jOWlWWk9JbCksbnAxa1pVUjp1"+
    "MSckRSVHVUdOcEY7OCNyWyQ5VTVwMVhEcVk1KUwqSjdtRiVJSWszRUBQdGZgQytbZ1g8UUopQnVEPjI+"+
    "QlVfaVxSIyxMMUBlaTVgTlNbTXUiWUhmUUREcVdXT1Q9JT5OU2JHOV0pOV1tVnA8TCVdIz9kYidCIUQy"+
    "L0FLPTBqVnRrXydcVykwWyRybC5cIVZnQm8oTDJKZ1MxWWApQ04kZSEzVT9sMC87YjdhYlU5PTAkKjBm"+
    "UVcuUydcPlhYKDhqK2VJcURqbTA+UC04JGdga2gnaUM2SVI4Q006ImtkR2k/RmBvVlgvSU1ARycjIyhD"+
    "I2pbSCc4TEElK2suLF5tUk0tPmcnJS1qJWdkJWsrOWpyJjJwNVlbJj9SVTkyIV83Zik0cF9haTRuTDBs"+
    "YSIqNWc7KUUiZlVgYSU3bXIzbyYxaUJcRTQuImtEUlNgUkgybWYoPytcPF4hNEc9SV9oPkJnJSRHX2ls"+
    "S2hZMDBLZG9WcSknKC5GPktQZGVTZSEsVGtdaEE9LypTYmErRERZXkY8UjhiZSEnWlMyYmljSklXSSUj"+
    "WzUxO1g7W2QvaVZSOSM9cGxdUTdnYnQjPDZUX15pZG1mMSw4bmVuP0ZMXURzUl49SEc2JThBPTJNSTlf"+
    "YXE0cWdtKDJjbVUuQS09Ki5XI2xORChaPWFiWF9NMGJlTkc0YXFkWVE1OE8rX3JsOFUxMmJAYWxRYFNP"+
    "RiIyJ3FVOEg2WnM1VUA1YFYhQVRhQkdLcDJjPCxUZFpwVywyLCZLQEEpOlpURjJfS1I0WmlaOGUwc2JP"+
    "USJwcHE5RywoWz9uS200T1poQTM1clItcVA2bmVRXEdBSXErUCZqXVZGOlIkKl0pMUpDXG5ePDI/YyRW"+
    "UTVCWi00RTZQIkgxViZiP0dtbVxTLyIxOW5bUEI0XDFqS2Jcc1dDXEMzPio9RlMnMG8zJVZWLGhgLUcu"+
    "S3EqXlAtT1dYJkEoYWZyNmFhJ2soJmY8S18iI15rQTZGTU9ZQ0dlUzdLIiJXIzdcLGNkLEY5blFLUGAj"+
    "NlgoYiNnaksxdUhdcE4+J0BqLENWaSYlJ1JxUCprKitKVFhhTkdYY0JtTGopaGItWmdIY1cvTlYuRW8p"+
    "QFNDcmFXOFYyXS1OY0FpL3BdaUxaIypJSzZoXUVQRTxOUUlFY14rK2dwMl8oZzw8SDVxWDFlSF4hOE9V"+
    "Zio+PXFkMEZGKWwiTyllK3RoK3M5VWMsX0BEYjZoNSQzW1dQXnJJKmJtN0ZdKThHTz41SyE1UllvakBv"+
    "QC9XRWE5Q0sqLiwjOkI8XmhKOjU7PClCL2JVPz9hNzwrYj11PEBFTzQvJDlbS0tDSFo6TVQlXXNNbWtA"+
    "JGpgci9ZalVec2RmcUM9TkYlRDdobXU3akU5WD8hKyhJZCUlMlBOcF9kJys5WzUyXmhbJD4hOWlBPEUr"+
    "UVhTMVtUWC1bQi9Kbz5JZ2ZxcCleKm4tP2hvcWBbTUlfbTwxNDdLWUlOXl9RPzVZIUhJTzY+ZC8/SDlY"+
    "NDglWjoxXVVZb2RNSVhqOmg8Wik2OSFPNXAiKG0yP1BJX3NcJWZHIjpjdSlgWkNfMllcKmpMQXIiOm5O"+
    "OjpebVNARXFJQjVaNFhWTikhITZdKmxJczpLcGBQVUZgIldaPHFudEs3RXJZMFBGYlQjImUiKiNxJVZS"+
    "T0IuX3E/PUdUNDRGTkk9TkE3Vjh0Lk8rNj84MGMoLkQtSzs5PCZTS3M+NSM5QEsjKlByaD8jWmw1Qz9s"+
    "NCJMbm1NWzpLbSxTLUMma19LcWRTRHE9XyYxYFIpN25NTDA+JS1tIlFCREYoXGtgNmx0JnJIMzApOF10"+
    "aitAR0Q8RldrRkpRYTpAViomPEVcMkhFZFQqPmd0TmooSmohKzA0NSYpbygxLSJqT0t0czIxUCVOWiNd"+
    "SkE4SktFaU5qNEJUKVw5aVJvZ1svS3RzNygjL2Q/L1ZuMi4xMVFdX2MvQTh1bk9uZSI8Q1JWJyE8ZWMo"+
    "QmBUajtZOSE4WDpkJlU8VzpJRjhiOldwOm51QzluWmNWOXFsUT9QRmkvXFxjcXJpbCMnaHFBPGEwZW1U"+
    "dGlWJGc5QjxNWXI3MjJZZVlzOGF1Y09lKz1ZMVpgJUAvSTQ6J1pRJD9ZYjk1IjU7YEVyTzw9J1dndS5j"+
    "P0NcYlghcz8maF9zJGJWLlxYKlMjJUNJKGJvbyJYWy0jIiw6MkVRdC8wL1AvRVQqaT5KZlM1QT86UWpU"+
    "YyE2bj9hLUg0L05TbT5YK29qcWwtOSMmbklYV2VOcl1ZYyZfJ1VSdCg2UFBqYlZDUDZXc25MZGk2QT9y"+
    "PDJLQzdNPCtgWW1aSEExbEFPbisqUVVLJ2Z1UlphZFZtUlxQJTFCYUpudGJHIz9ZT0g8O2hAXy9MUjAq"+
    "YFBdT0FVUyRVVFJncDRHNE1XV1RkJFUwSjJsYyU9K2xUI11NK0YsKWIuTydHNFIxIStZNiJoOkA4JU1E"+
    "Ni9jcDRyJj1nbTZQZygqQmFtQzBsITRjanI2ZS9eWC8wXiZwXCcnbXVWdSovcV0sLWljZEFUaUJEKl9Z"+
    "OGZWZEYmSEhnMSs2Tm1dYVs3X1xRTz5GVjw2RGxCJlpLLSFJX19jNF9lRUghKUNGK14zWkQidWdXYD5v"+
    "MnVdQFlTRideYj9kIl1WM29BIjpLPEw+XiQzcSlZYCwnMS90X19gQT5UT11nZ1toUUckOmQlSXNFYGI0"+
    "bi9aXjlIQSk/PmlTOW9zUiprLzQ2cipmJGdfWCdkb3MmbCwzVCs3VFk+PnI1NHVlaTVPSHVSVTNJOkhm"+
    "PGFiQzxbUUEoSFdZQlY7IURYLmFkYmBeWEExbDBPKi9mKVVLXENtYStlZEFgJytqVyYhWzA0aFxYZHAv"+
    "MTJOcCwuS2dwazNyLGNyUFtHPjYucGBlTytRMi44KlxTX1FFXGNbXipsXDtUJTQ5TS4hRispMixbSEhe"+
    "JjVqUDhFTz05MWcoXz9cLSRcOjJqMUE1MyFrbltpUlRwW19EYk0zKTFPVW83aldiRUMzcSdQcjFXPkB0"+
    "bUMtbUwkS2pNTSJzMmUtYExjLy5rWylwVmxhdWBCKT1jVTlILU49QzBALnFda3AxVWVAJlU4dFQ0Szc7"+
    "M2M4ck1nJCNQQVkjVktFNkAoWjs6XTtVSGduYnAjbXBrMFU6SUReO0I1QU4xKW8+T3EqT1ddcU5Abzxj"+
    "YCt0cSktcVNjMSpVQit0a0kuJVcwNUIqUW1MdUYnZTUoLC00JGZKP2ovbTdRI3E9a2c9SV1NOVJtOEhk"+
    "OiciXEJgO2gyKCxOLUNYI1lqSTR1L2oyLUc9ZCI+OFgxazw3Y0VZdD08Z0VUUWxUUklLWmUwIXJuLCUw"+
    "LV5tQjpYZUJTVzs6NklqJ0ZiRkozJEgqSU5VdVJnOipYTSchckMmSkV1Oyd0X3IkV19HZEkuJ0hGXEsn"+
    "RChMOiNoNCVVRC1YQ1lXWy1vamIrVSUsZj07WlNAUTheY0VQUGpCM1lhM2otWWwnKk4/WVNlTD1ERCgu"+
    "UitOMyEhWEIpby9ebEZ1O2ZjJXNlI0VfT2RuJDBZSm9IS3F0c1BGKnM6MGZDM3QuRlk7XlxyUDZtMFtk"+
    "L0YvY1NkPWxtdC9tO0NLXU0jKEgkPyVdZ20uQ2ZsZCs7NFAoQjQhVCdUcUciN3JYS2lBMmJDXDBeTF4+"+
    "OFFrckdSTHBkSWlSOF8pP1o+cW9hckNyWDctal48LX4+ZW5kc3RyZWFtCmVuZG9iagoxNCAwIG9iago8"+
    "PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxMTI3Cj4+CnN0"+
    "cmVhbQpHYiFUVTlwOyYrJjtLWlEnbigxJUFLaEZQXmk+TXNXUUFhMiplckJSay8pWVE4SVkucyZYV05H"+
    "UlAsVixtKWEnVFAsX2VkPVFsZW1YOEQvJCdGOCRQckQhXU1mK0daQTd0RUZPMTgqRl0mOks0VzIjMWNO"+
    "cWlzSy8xMTErZE8jImJCUDJcWnFGb2k8T0tTLzwzPllvQUA4TmBWdD1cX1RFanRZZFhGYVFGQ0BFJ1Ew"+
    "ImtoJypCaGRUTTYnXGdXbSIkSm4kLmVFXU1QYmZAPUp0MGNrdEFLRTZNSUJ0K1koajk0NG5Xb1MndDJe"+
    "YkxLV0JXOVUrNWMwYmEnP1FhW0pMdSUhMyxZMUtbODEiImRLW11Xb09cLyxjVShpNEFFRFcyPExCTlFc"+
    "Kl5qNSI/NUZRVV5Tc1BiKCxEV21hSFQ8Y2o1X19sajMjNTZgPEtAXyJudFdTWVlzZF08aipPMlMjJWBb"+
    "T1hDbV5BSTlBXmZjIzpLZWBKQkhINC00cD1PN3AiNCMiN1NIKVs9bUNvIT8wclVWTHRAJmAxL0ZcbG9J"+
    "OTVQRElYamMnK1hZTU5WU1U9X0I3ZkE6NDUyY0JOaWNtWSwiLDkqTDw2MV9oXiFCc2tpVlNIVkA2Nmxr"+
    "MzVja2JDVWU0L2FFWDNwJT9uXUBkPklPLVwvXDpQWUYybVwkKV87OVpcN2U4XWY/PipGVDhDPFMpNFNH"+
    "MXMtMVNpazJYQ2tOKj0rQ0dbcmspUzhTUmBdZXRtUyRbNG9eIitWblZxVUA/O0lEQHU5V2xWQF9gUGxO"+
    "NGpqZXJDN291N2FxVCFKZF9uJnFBXXNyTjNQOE0tIldYaVElSzJuYVEwXGFLJDkqMmJXNHIlMDpvL0NA"+
    "OnA2JD9JWiY+UjUpJUIvTV8rJ1dscUVDWF1NKChTLklzMCoiSm8uPC4iSUVEVW9rZ24raVQ1NiZAWW5l"+
    "b1gpITFBJC5qWCNNO1E0Z3QkcT5Wak1qN0Q8cVU2Z3NJRE5nOTNDYWFnNCpcIyUoJSgkYUVTIWNYRF45"+
    "Kis9TjYtWGpTbkc5NTRxKSVoZlRZa0tRQ0skaFVualxoKm1JNTVpISZILFxLblVXXCI/dWBhYFlNTVwh"+
    "ZElqRVBqcnJNU190aTNBbz9bJShoMkAzZGlVKjc8ODpqJitLakJgRypddCIqcCU7MD00LS5PWltdOkdI"+
    "VSQ/W29MbiNHKWl0MT5bTCwla1hjOjNsPzdLcVNJTkUqcVw2SDk/RihJXS9nOjtIQ3Q1RE1tWSssMyFc"+
    "SFI7NzNMZjRKTEBxNCRNVTlXPkpWO0NRW29Yc2NMNzRCIkovazxsWE5YRzwkJVdOWjxrMFJOO3BWcyU5"+
    "XEJQN1JnQlhxTV9qZkVIOG5IP2hlYjpgdGdpIU5iUFRtJFpAUllbSGRpQnU/XS4yRyVkQUMlOFVeJ3Q0"+
    "PWxcOihUaER1cyh0Xitmb1s9PVVlZFtCYUsxLmEtI2s4LUFjQWpjL1FicWZGKUdvWWN+PmVuZHN0cmVh"+
    "bQplbmRvYmoKeHJlZgowIDE1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAow"+
    "MDAwMDAwMTQyIDAwMDAwIG4gCjAwMDAwMDAyNDkgMDAwMDAgbiAKMDAwMDAwMDM1OCAwMDAwMCBuIAow"+
    "MDAwMDAwNDcwIDAwMDAwIG4gCjAwMDAwMDA1ODkgMDAwMDAgbiAKMDAwMDAwMDcwNCAwMDAwMCBuIAow"+
    "MDAwMDAwNzg3IDAwMDAwIG4gCjAwMDAwMDA5OTIgMDAwMDAgbiAKMDAwMDAwMTE5NyAwMDAwMCBuIAow"+
    "MDAwMDAxMjY3IDAwMDAwIG4gCjAwMDAwMDE1NzIgMDAwMDAgbiAKMDAwMDAwMTYzOCAwMDAwMCBuIAow"+
    "MDAwMDA0NzMwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDQ1YTljMGUzODE2OTA0ZWVkYTczMmQ3"+
    "NjAxZGI0YWE1Pjw0NWE5YzBlMzgxNjkwNGVlZGE3MzJkNzYwMWRiNGFhNT5dCiUgUmVwb3J0TGFiIGdl"+
    "bmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gMTEgMCBSCi9S"+
    "b290IDEwIDAgUgovU2l6ZSAxNQo+PgpzdGFydHhyZWYKNTk0OQolJUVPRgo="
  },
  9009: {
    filename: "peer_review_9009_2025-09-15_Dylan_Connolly.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IER5bGFuIENvbm5vbGx5KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgOCAwIFIgOSAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDMwMDIKPj4Kc3RyZWFtCkdiISNePkJlaTMmVXI/OFIoIlAqMGdeQzU4"+
    "QEQ9KW1iKyx0WHI/VzVWZDhgbjlnTFpOT2pycjJhOGBrMCs6MXBeYjBobzNkbDd1ImdMK29kcSQmWVwj"+
    "Q2o4Wk5gMUo7OTZnRHQhdUoxSCIuKV11bmdGNDpTR2JZM203XWBUWTQiPU5wZW5DXy4/PF81ZkoxOl9o"+
    "NW1DMCheZjgxSUMlQzI3bWw1KyYocG88TkRLP0YxQWdgJ2xzJmloKF0yLjNwRSYiTjhLSz9sU0kmWUwq"+
    "MTYybzVlMDpNTTlzJ24/cCZEYDpdVSk0a0lyLWhSITZWSjJLTTRzJV0mYD0qQD0tVG8iY3RrJkFSNy5h"+
    "PzJ0PCtaMEg7My90dSI/b1FrKGJsRmJjMk9OZSdfW1lSTHBAZFY3KyFjbj85VldfJlw9TnQnWSF0KVpr"+
    "X0wiXFI4PUBBb15uUj9uZHQmcmJpUSFnZ0lUNWgsZWFzW2A/N0hfRVM4XCJaSzMlOyJWV0EpT00+XDlU"+
    "cmk6YDtUJ1gsOk1fcU1CQyIkWlA2V2RdS1I2bHNnbGlOJDZuVCksXyJDKzY6byQ8TyRwIVY6OWdVQ0Fi"+
    "NC9LcTlnSzRfLyNLIVI5TCZnNDRlOEkzZlMjXiFVYUdVYjk/Zk0ib0AkMlcoVC5ELUsxRiknOyJJQU5f"+
    "R0ppUzIybFcrN1FycEAtPHBvbFhRUE49Vl9aQXBIWDAlby1bOytOYFRkVVheVktDZDdFKEQmTCMlJjtV"+
    "YEEsLixGQWVLZ2hgT2JpRmkpcHMzXTRAYiNZYXJZZV1XPj09MkVzcVRiZmRKZk5ZLlEmXl9hM2FjYDEy"+
    "K2ZQO01AYnNdM19QZlRMKGNdIjovSyhOLFU0J2NAPVY3XFRbPWkyZGdtX0dPUHF0UCE/I2hsIkNWOjNm"+
    "SS9SYTlLRzdkOz1KQW1hYzhpZEsvdURzPldMJGVRcHEtWjUjViVFTHIvSj1qSipjWWxubGtwUC5sUHRM"+
    "XCosaF9fP1MoQVRiQTJMIjZFVGVkbVVkMWNmc11kSGFpWmlDOUpNVTNSXixfQ0YuYEE5aWw8cipDYSEk"+
    "T3QoI10ldVJCX2oyXGNMKF9kamxWcU5JaHIlQCFTbygmJzk5UVM6TC1vZSdmNk5LRjwhJzQta3EoREk8"+
    "K1ozVlIsP3I+WGsmb3JCI1dbcTxuPCInPDVETD5fY050TCZFKyZpNiQqS0RDMGJhOSpBOXNXKEVuY2E8"+
    "bSFQVCpAcF91Jl1JYUotJGM/cT5gY2szYUdIVV5YYkxwcWkncGs3QTlGJ2tkQTQwJm5JL3MsYipARyZS"+
    "c1trTFpRbU5LJzdSWz5SLDtNKD9aOGVwaj5WWDNjMSxCSFQnazBGZGJcb0g3QWkuJWVmWFBRRyEjWjhf"+
    "MkxgOlVPS0RCM3BRSjwiTWs9bF5aMUMxQ10oR102LmBeKz1GQHNLRVN1L1VHTUVyWW02LC9kai07UUUx"+
    "Mj0tNmFXcWFMXmFAMGQoYkojaGRiY05GbGBya09fNGEzUS0iV25cXW41Vm9CT011Ri1JazcyWSk8PzUj"+
    "QihDSCkjVDNOWEQ7P2xHLXQtQigkb2FEaFdPUURlU01ZUic2R1g/PzYiJEFJSTApcGwqKUMibl0qPiZr"+
    "aENWTFduImU1Z0s4TilPLCEwJUk4bFZVZCUlMlBOXzFWPSZPSG5ZVSM1Om4iZWBRbHJtI0RKQW0wSWJa"+
    "UnRxMD4mUHBeaFAuJCgsSjtFYG5KJydkVWc0QnFfSSMiZDdCJmJjX2hgQyppWEY0XzNKSFxjVC5tc3Bd"+
    "MCs6LWMwIjhEZ2BFKF9tUVFgbTAxS2M6VGouSC5NNHJhLjNeWDJwVDBgalYsKWpHPk1XZkdaZCF1Qktk"+
    "c3NVNVQ4ZmQ8NnIhX2JEJmklV1N1YSpoRERyQ0NERSVEQ0IrVmxuSExSSVVhKjBqcWFwazYiXzg9M3VF"+
    "c3Q2ZFM7WjIvNGU+OyRYZEstUTRQX29AQFchMnNdaG0/NE05MG9wSj88XVNXbzhKLUZvWCVJXzE4WDA3"+
    "TyNBN08hZGFDXy1RL28lMy5BVVNJIkBLP2JkRGEpWCxnSkBwc0ZtXmQ6P3VtNHU7KGsuPylgIVwoZUBs"+
    "TFRRU1E8cVVeLVdfWT5dM1VTPCNgTiEiJF9kcCFXaSl1ZUVFc01pPG9ZZ09HcTJROk8iX2FyXD9YKXAz"+
    "N2RsNDcyVGMway4wNWldPVpuNj8lYmApRms/XTxaP2MwRTk7UTRHRjZWU3VlKm1VL21KNj5iUEMxRSE1"+
    "Ty9zSldWSEk8WmAya0NaaSlRUEhQOW5sODxgZ3FsSnJiPTw4QGIsb2xNdUNbbFI6ODpIJ3JIWz4hIkBP"+
    "cWRfOT8vPV0sUzBmXWFjVk4jOi9DIS9dbyVSJVklanBoXHIxOnErLVdZVGlHTVI4NCRTJF1QV1xGYi9k"+
    "Im86PkltOlxNZHJuaiovYjg6QGRUMmEmLCE4NyFOZWBPW1ZfQy0sK0pkPkpnXDNQSE5zP2dBKnFqZCs+"+
    "Z0hoZS11OURnZ0omLC9PcnNyLEEuRjRLJDl1QjwkMzBTUj1NTD1UOiUmaGkmTjY/dSpcOGVJWW9LWl5Y"+
    "ImhWVCk2IXVPM0NMaDQ8R144ZVBjX050VmA+TjJDSjFBSDxrPjYoWT0nV2tgTCpkbWc9cTE2LFFiIjhG"+
    "IkhcLz08RjdQP0NCbzBYKFlHbyUzJ1ZjI21BJjNgWW1HOjUmQVNVTV1AQChucyQiLzc6aClncEdpJTtR"+
    "TkYyKzIzYyZiQlM7Z2U+bXA5PE81Qz1laiIwWzJPPD1vcytPRC0ya2thPz9gLkJmcz1FRy9NX3REWmYj"+
    "YEotby84Ylx0Mz8zIUxrQD5UJUYwZG4xMC4yPTovJlRoJE1gXWVLNVlGWC5cPiRtaUZVJC4uPFNVKS42"+
    "ZnJWYW5WVUtkIVxCImc2PSthOUhUXmAyLjxLKydYLDpPNkxbWjZwVnFMZHRBMmEpU08nOGApVVxIP0Vr"+
    "T21bMDByV3FFI1UqaFkraCF0U3Mvbj50WkNGWjA3WS9zWGRETTcpWCw2USxdSC1BJ0dGUSQiY0hXS0JJ"+
    "J0liIWRmRVthTmo7TS4qaE5DNVtNdC8iXS9tT0BkJVw5bFohaUMxSVFZYFZiLGYrJUhcTiEhOUF1WkJq"+
    "bzBzOC9qZjdIQCpocilIdVNoQWpjQW51KEpQL2VjMkFHTVNlaVpeJihucnFGJUtocFRmXyNANE9bLSgz"+
    "RUMtaC1PKVokLykuIjktKFVyMlAjXzspWDc7WjdbJWh0TWlCTGdEPk1cXzpvIilSNkpqREpEZCpKYl5I"+
    "Ukk8a0JrOzU+XUdzckduaWVfaiY0KCNVQSszcGIwI2VUPj9LY3NMQVQ6VV9GI1VHJSNhIVhhNylrNDpl"+
    "dCg8Ziw6Om4lMCxIJSNiPkRnVChJSSkjZjxsJUdIJkwrSDsnOCFkYy9xV0pkckI2XSxDSjpyYVhYOlZY"+
    "a05cUj0tKiFWVSFkTFA2Ql1iSSE1b2JwY2NbcyNbSF8kNkdyZHFBQVMjNC1YQiNNOXFJcyNzKElmWkxn"+
    "LzVpRGRkbzhsITxhTmU3UGpvT0RTRidVOmYyPWYiYVwpWGBfZCEhZGI3L3NHZEIzb2tFbVwwMVlMY3Fr"+
    "VnUoRkRkVG5XaCsiPi0ubiskRytKMVBqOlQyajo3XkVKRSk7PEw9XiIyPy5gSWtuaik6TUgxTzZmITQ9"+
    "U0cyZCNxcERzMHRtUkprOjdzVG01P1VJIzBXO2s4NTNaLzwjbGppQSxaRGlPPTNEbGlPdFZDazk4NiVp"+
    "Yy02dE5CYD1oKXVNUXVhYTRUQV1xJDxdZyoqXic6b1crV3EpXWVyXWdWOHUyN0ZmQl80UTpdPykqYF8i"+
    "RSVeVW83bWBbVURrOy9bVUpjYm0zImdqMDsjcSxfUiVUaSU/W2QocF5VLUlUQGNnQGVJVzI+QmM3YCxo"+
    "STBbSUg5NTM5NkxCLGUzcGc+P1BiVS0rSl8+TVI5ZEI5LX4+ZW5kc3RyZWFtCmVuZG9iagoxNCAwIG9i"+
    "ago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxMTUxCj4+"+
    "CnN0cmVhbQpHYXUxLT5CY1ByJjppWzovKj43SDJIaEBPIUtVc1xwOCJWQkZeMzVjLHFmVkgyQDJvXF5p"+
    "QjtARzZCaERaKDkmYjIkXGMwXE9cTks3U3JVRFU8UzBjIS45YWFjUyN0XEs2UmBmJytYUFYocl8sVyNC"+
    "VjE+LGByW3MtajR1aTY3RkFLaU5Vb0JRYT1OWkslRis0I1EhKEFdaUtuYmFURz5VX2UzYj1HI1AwISNg"+
    "K0RZRFdHLU9ZalZ1MmoxLXFTJ2hpSE47bSJNYVEvISEzP1MiZz9BPyszV2NTYVhtU1hIUylYOHREOjc7"+
    "NkQyWHQkQSpQQSI+RmohXHI3a25TYzNcWnRKRWJTbjE1Ul51SGlOT0RLTGxaV290NWw7W1hiK3FqRXBX"+
    "aD5saChEPzNBZFxOZi5bYU0xPTBUIWwvX0xLa2F0TjoqWDhkcUtjJSNxams9NXFPXm8zPixPPiRzTjpM"+
    "V2c6NVU8RThWSEoibDJqXVdEOltJIV8tIi5YRTluMWRZTDshUDdZTm5aNzZpIm9DNSZHNmJsYSNidGZ0"+
    "OUc1RENQR0gtQlQqdSpkQDU9SmNeZSlMQzgqaUYwNVZSRip0dF1UYzBmcz9cRjVDKWFCamVrbiIsOXI8"+
    "LEhBZFFca21EdDM+KzJIcjNoOWoyWkdlWnBUJlxOWjFBaG5cPTlGZm5EblJBNEptb0RBXC1dNSQ4QzRm"+
    "W2YrN0d0NVMuMGNiVD1BcEJNKDpDSWlkVyEwLWkiVj9VZGAvUE0lIUZidUhXPVRHMjEvM2tBWDZzJClR"+
    "bXA/TFRKOW9oIStIUjMrPVhpKitBLj5tVFAhIlxgPEpZYmUvbTUuQSNIczhGXkxrNmgrPlRWMEUpO2Nd"+
    "XV0kQSl1YzRNIWVEVjs5TkJgV15sKWBPQzpaZEhwW2BkWmRiKiU0LlkrcFRoUHRHLjRydVUucjI8PUQk"+
    "akpUOyp1PEpuLHBYbDpxS2leWjxrLS1XW2dUSV4wZyhaZSNwIiU5IlhBKHEyTmlROTYhPiFvTTIoZylM"+
    "KSNtIyhFX1hPbWxxPXIrRiNMQWJlQiUwc3MwRVlrOVBeNDFYRCRwPDg+azVDZmsrVz4uTz9TNj91PXMp"+
    "WFBPOz1tOVduaCNDTmNKaWUqM1dCZSNgIyFxJzI0RD4yRSYuOlFAZT1GbVxwQVJgN19IV29wIVVfYVRP"+
    "VTJvSmskJytjU2o8TzM2ZDV0JyJLXFNjVkc/aiYqLFcoYCstTWhRdW1kbEVISCw9PDU7O0NXLSoqPmdg"+
    "XWJZVV9DYTImb2pIPT5KdFVzYDYkS2JoQytRRTwzIm9ELlNHMyRMaWJoMUNHW3U+b1Fda0VPJkBOKm0z"+
    "V1FwUm9HM2EyXD9TUmQ3cHRdI2xLLzkoVl1kX19ybmotXixzRGdbV0Z1VldGOjtgaTFbMU9FSmUrbFtU"+
    "NUQ5Wy04TEtvNiQ9JHBnMGtDMFpzSUFORVA4bj1DWG5VOkNfYXRbYk05NUtXT1I0QmAqPUxTNDAiY0Qu"+
    "QGghbXJLLj8pI09WbS8lUl9+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDE1CjAwMDAwMDAwMDAgNjU1"+
    "MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTQyIDAwMDAwIG4gCjAwMDAwMDAyNDkgMDAw"+
    "MDAgbiAKMDAwMDAwMDM1OCAwMDAwMCBuIAowMDAwMDAwNDcwIDAwMDAwIG4gCjAwMDAwMDA1ODkgMDAw"+
    "MDAgbiAKMDAwMDAwMDcwNCAwMDAwMCBuIAowMDAwMDAwNzg3IDAwMDAwIG4gCjAwMDAwMDA5OTIgMDAw"+
    "MDAgbiAKMDAwMDAwMTE5NyAwMDAwMCBuIAowMDAwMDAxMjY3IDAwMDAwIG4gCjAwMDAwMDE1NzMgMDAw"+
    "MDAgbiAKMDAwMDAwMTYzOSAwMDAwMCBuIAowMDAwMDA0NzMzIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lE"+
    "IApbPDJlM2UxNzczMTk3N2ZkYTY1MTRiOTRmYjZiNDJjZmQwPjwyZTNlMTc3MzE5NzdmZGE2NTE0Yjk0"+
    "ZmI2YjQyY2ZkMD5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChv"+
    "cGVuc291cmNlKQoKL0luZm8gMTEgMCBSCi9Sb290IDEwIDAgUgovU2l6ZSAxNQo+PgpzdGFydHhyZWYK"+
    "NTk3NgolJUVPRgo="
  },
  9010: {
    filename: "peer_review_9010_2025-09-15_Isabella_Yang.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IElzYWJlbGxhIFlhbmcpIC9UcmFwcGVkIC9GYWxz"+
    "ZQo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0NvdW50IDIgL0tpZHMgWyA4IDAgUiA5IDAgUiBdIC9UeXBl"+
    "IC9QYWdlcwo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0"+
    "ZURlY29kZSBdIC9MZW5ndGggMzAwNwo+PgpzdHJlYW0KR2IhI15nTiklLiZxL0E1aSwrYFlOIkAqO1Au"+
    "T0xiLUpoQDAvbTtKZTttWU0wSjE0I3U2Qk4wbW0uZyVZKV5JYDc2PFZITTtgZ0NMLTM1czcpaWA9RT5A"+
    "R0kkNUtzJWEyTUFgNFBJRUswME1eYidfPzpUYXJaaDRtVERVXVhidEw/dFk0Ij1OblYqV2VQUlEtWllb"+
    "YEZaZVlKSmcoXl4rSklEKytnTWQhcGA1TjJQUzRGRGFxVC1xRFIhVWdlTl9ZTHE4aik5dXA4SGZKSlco"+
    "c2xWNEBaOjxhWyFFY1IuQVVUMGddJSRcMDM2TCc5KWAib3FDNjk2S3VEdCQkWEdwNUAnJiVja1dZVk1d"+
    "JTI/ZDNQTlosSj1YMUg0cS1VOCJhNk9nallbbUU5WC9XZWE4KixfOXE/ImxjSG9nKlooKEc2UjZrPSpl"+
    "SVwqQDo3Rm8wO11DOENTZ1JNVm5VPkBPUVROLlxOWGdTTjclZSNPcVxsPCFvXHVtREN1VF5oWEh0NC9j"+
    "dUBOQ1pjVmgmazh1a0dVJ2hXcCNhWTRIITVFTiE2VUA5Ty9sLSlvSEc5O01aT1E0MmosaktsKXRIc05F"+
    "VVYmI1JkVlJIbDc2Pzg7IV0hajJfTnImLU0+QWNWa3MmNnItcl9VVnJMYUFjby42ZSJNczU7WmI5ci8q"+
    "LWleXVJXb1xGV0lJX2RWVCFbaSRLO05qcCVvYlpoOEFPQkI8PVtDQVVdXUFMXyciLDRqLGtyWWVYUj91"+
    "S3FsKmVvbmhITlNqO2N0LWhUQ2U5Kiw6Wk9gRCxxPDJeXEwnLGI0c29sJ0lETVBUOGVvSWhGXU43QkJC"+
    "aGFhSUZoImJBXVI1MDNZM2laWTNBYU9BMj9NRFZqRT9Va18mdD03Pic8RGkoUT9IQkw8LU1JIyFOLmQz"+
    "JlxzRVdsdWEtQGVbIy1TUFw8LUQwWEw2b2EqbEU2PUc1KjxwNCcrUy1zSzU3XSdRXXRrUVk6aDhsaGIs"+
    "Ik1JODMsbUhKSz8vZWxTUF9DNj1zRWFqQW5MYnFUOE5ybT5dYCNTcyJGMUpJMEEkKyJeVytcZmJdZkpm"+
    "MCY9MSJfKEY7Nz4uKV0kdDhLUCZfY1JBayg8P1ZyXi5hUDlzRyQ0U1AvWzc9LGpdV11hWCJxMWJpIl5y"+
    "aEArLD5JMUc5WV9PcDIlMlRcU19Ab3JQXkgjW2IiLERWSC1SbzE3SSlPJjBFWWJxXz8tISs8XzphKSFZ"+
    "Uk8tMlFCXVBhPlVWMEFcLSxkPDVyTD5WKWpBOCk7NC1pLmIoRnRNaU1sMi1uWEpkTVVOOzg+M1oxVzVS"+
    "T1oha1hWMVM+STlrQFxIXFxhbilrI01TI2woImsvZTFwLTRtPmpoREJjO2gqZk1iTV02b1hnUk9fXW4l"+
    "SVYsbTwlckcxQ2hBNGBrPClXQlxbZUYzOiJRXjotOjs4TmxOYVQ+b1NBX3BdQlohJjoxRGNna0knQElI"+
    "JU9uLmRzOVtXOmFtOic7bFpKOFkhZDRTLTVGRnJgWUlaPEtuJVkwVTFtJz5hLjskJGFUL04oOyhrZkVP"+
    "aiouPE0lK01PbUNcSThqN2hkKV1FRlY/TDxaIjZbI21rZWxlN2hsRSw1PSFcX09rWCgxK21tcDNzdSU2"+
    "R2NwaG86NDdoWkU1PT04KV4oNTBfcjBlOk9TX1c3J0lScUldXFNjbWsnLCYtPDhwSV49KSc1XlQuIzQx"+
    "Zj91QyRdaWFbYGZ0P0g8XVtaIjFYZF1nYCwjY0RMaVlMZzAicSFyV14wOTJCJ0ZCJkVqJkMpNWQ6PyUr"+
    "QEVWbDlRZVMsLzorIUZpJXNVTkchRWlqNyV1MylCYSwwXlhqJU4/RFRIKmkzPiJhbjQ8V2hzL1BSN1Qn"+
    "dV5qN2U7L0RmIWlaSz5bXCYmWm5oL3E1RTIhdEQ3OWhlXyphc0NNP1AmW2k8UzhORWRUNUtWbnVoaCsz"+
    "WjorU1RFXyFmSyVbaWtpI0pKPWlMPCJcXlBEOS1gIz0iZEwzVFtQKXNJKyI3WGVNI2heOjJkTEpPWWNs"+
    "OTROX1o1MnBzKjRPTSE6RUpSQ3UzNU1xTGhkO3BtYlVKO3A/PDpCZilvPCJ1SmE9Y24pTDJFNShYbjFf"+
    "QUkuWTxKUyY2S04/S0c7PG08XVxEVEQ+LzlXQVtob0o9V0kzUmZObi0pV1o1PScjYFlyPlJFQzpDRlpd"+
    "LisyTDhpMl0lRGUsZjJHYC9rW0NjPjRPLE41Q3FqJi0zWllcP0UmMWFTU2NaQVdrSzI4NmFcU1RUYXFp"+
    "cC8nbVgodUIuJldnNGJKdHJeUV1DSF9VIzB0cVxSSDRCaHBXc2YrQiNUZEZOKWAtWytPWGw/OVs4XSlZ"+
    "T3I+Y1I6NzUtWEVtXUYpSTMiczYkbFUjSDVrQFAlNSlXYzYjZD9JSmw7Pm9BPEMyQWAlWE5SRWkmPTxg"+
    "aWkpTVA1VD9pVm46VFl0KlBIbUFAbjRSZ0U7LDZBazhfK1pMTW9VN1ImIVlUWzlIPDReblQzci0kJ1V0"+
    "Z1UzbTUzRjlCR2JkZSMsZ2pjTDUmOW1LNzVXbl8vRzhTY2osUFtyPlYhaVZGXTBfMjgrU0hbPUYwaDxB"+
    "bWg6PURjVERuTSpJVjVvb1xgOSsqPCdtUmlgc2c8Uy5dQzpDJSk6bytQalFnK3FjOzVQLDg3OiJAXkdg"+
    "M0JSIV5EPUtEQCxESlNBSDVPZ2g8T0ksLTA4QHFhcGhoOixVNmQoWltwYiZZIUQ1YGg6ZG07XiFWMGBq"+
    "aHIiMnRbO2FfZVVyYXBYZmE4VCUrUz4tNkAoNVssWCI0Sjw1OWc2LDRXYEJeIzowITJ0SycuVGdqK3Ej"+
    "MG1UQS9RMDtAOUNfYFw9dTRHTURpT1pNNUlRMy1TSGooUTdLaSQ3I05kRjJVVU4nQ1YoJnNnb2BHWCg6"+
    "SUVKcUgtOS8lallLP2R0SW80a1RsT0A4SFxaR21VLC1cUjtRJSghY2k3cDxkKCFNbW5APkdHZV9YUG5Y"+
    "dVUwaj1bSzZsWE5vLS4xZWc4S2BsOVZjTWhbIyFgXzg7MydgJjJTS1lqNUdIV0BJcXI3IU46VllfbUJm"+
    "T149WG0nWiJaLXM9aWxwYixXTT5IdUhOSUA/X25RcjEwNWA+V1FLYTBEPUZRNz9KPEZ1dTZba0Y/c0lR"+
    "YitVcXByTVViMDBQXyhMNzFdMV9oLmZEKj5mQEpiNWE9TG5aZzchOypuJz1IZFIlbGJeLlNPI2hkIVtR"+
    "TUFFOHA1VDkrOjU2ZjNATFdhWGBoRVIrKEc7c1RydEBYNz1Obi9ISm9pXEQ3YjpaR0xhVERKRiomLlRB"+
    "YVZcS1g5P2NtNElxO2I+RHAwQDAwU29fSjJQPjsxSmIuPkNjLi5xSildcydkcFtrMUw0WzJZKCsrI0ct"+
    "czU2KVhfUTE8NC5OVFo+P10sLkVAMHVTWUwscmxScydhZVN0aU0pSSxnaUxWNm0/QFQrT2BmITUoUEpp"+
    "S2hmWy1AT2xaSFJjNzItaVNSLTVgVyFRVC5RbztrPVpeMTs/LVMzOWlEKzVpKVIwIi0jUk9QJy5iZyFU"+
    "UWgzIiM5dUJHaEtMcUowSjFDTUA5OzstZlIhVmleTUk8Y2BRPXBjOmtoakR1dVEjNEhtLUY5QEhuRCg2"+
    "cEAsLShSbmhMTHQscDdFYTU2LmVNX2JqOEV1cTRwKU5zIiUyNDg2L1ZPTiJgNj8nZG8qNVsqTTcjWT4u"+
    "OyxoRSdUS0dvajpfNStoPzxFWmI2K2pAVSVSZUpEMW5TLHVDNl5jaSZlKjdvRWZzJyJtKCc7cFk7VUtH"+
    "OWonOjQpPiQ2Sj4tcjouWC4wKEM9ZU1fdGttU1knN3AwXTZeUjFlbWlOVyEtXUBYNCUuVTgqSjwyLF1Q"+
    "Ym88L0krKkBbWEk/ampGTE4qSkdKQDptNmBzIWFEZDdMVDRHSCtYJjVEK0UrUFsiP0hjQy1Qb1BqaUJ1"+
    "azdfTlUjYEVbdFddLFotMyhPUEdcTFZTZE8hRDpycV80JlsoZit+PmVuZHN0cmVhbQplbmRvYmoKMTQg"+
    "MCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMTIz"+
    "Nwo+PgpzdHJlYW0KR2F1MS0/I1FKdCdTYylKLydjdEosSzVTI0Q7X15qYyY9XCVjKSlyRGRCN2ZVSjxT"+
    "PzNsIWU9akolbDNvUFZicnJWVk9YbmkvZFdiYSxhUnBfOC5kQUlcUj4wLCkiamc6blM2Nix1QD5yS1xw"+
    "MlZOckMnSD50Wj50JHM1ZDJAdE9KUjtYQjFoOi9iSCI3XCwuWy4nU0AnPUBBXmcmIyMvNU5lRj4pPGVe"+
    "NjdAZlsvUUFyVV4iKFBVW0tHVDxsT1xbL05hJFJqVUZRPE08OigjOUloUmJONFpRa149IzEla0s8V18w"+
    "ZSJtJGNqTlAvXjRlYGtpdVtHK0lEbWZIZlBzZFFDRFZJJT1EQi5nbGBlJTRJSSUuWE1CWS9WS2EoSSlE"+
    "PFY8cE5mJjxiXSwxUyFeLyRiM0JoJVFiIlNFQydmUFEvLzsxWlEmM1lgZCQmRVMnZkspczp0V1JiRkpf"+
    "Yj0jcUcjVD8qMVdhQyJnaDAlaU00IzhLdVNHQG03KmM+TmJWdD9GTTA9cTJRQ0orPEk6RSMhZFJeazpW"+
    "SmFmK0YuTCk0O2g6KS4iTTsnWCJda3FpcGwpaSZCY3I2WFQ2SVFUS1VNW1EmKVFlVzZWNjE8RFJIVzdO"+
    "aEdGVVRKOUxDZlRgJCUuTltqNikhcSQpRTFlV0hrRjBIZ0VLVktIVlxQaTFKai9TbV0vaVM+KkEkS1hH"+
    "ZV4rYXJTckU5RltWXFhkP1VnZyEmaEhEOmtQPEwwVW5IWHAtKlI8MG9TT2FfI3AhbXNpKy5BS3BqNm9X"+
    "PSRcMVdbWk1kJzNuQFYpW01bYyxFZC0jJSo7ZWRqZ2RuJCtbImNObCNLWSR0S0pxNTJgTFYsaFQhcEBC"+
    "L2dsUVdONWg0RHUqVi03LV1hISVWRiEkSFo4IVAiSE1ePjNkSCM7VE5vLytEZSs1Yys+WlRMLGthIjZ0"+
    "Zz0hXDIubyEuI146Vj9YQStSRmVaZ2U3cjNlIUpbS1lMK3UsZUVgNDxeZF1ocloyPGswV0VHOjU8IlRF"+
    "J1BLSUcwUFdXb2pLQ1pEJWhDWy9jJ0EkSFVhRXRbTHNIVXF0KSphQGQ/NDJaSz9FMD8/bCIqJ1tDSCEr"+
    "a3Ffc0dFLmtiajclRGVTMDdWNVBFckJZLDFpLmFmbiYjOGNROENqIT1aP2olSkYxLXNNZTlXP0ZkYkY+"+
    "ajQmV1JcOiNmTldCJmAwdVk6QUAqOkQmK1stcl1LL3AkXCUxVzgsREc9QC0mRTFyaEpJdDJGJTNdP0E9"+
    "ZXJyZzp1Tjhgbkw6L3VMcTNlIW1cLWpQbzhjMixza2RKOlYhUi0vbFsraTVzOEI3R1tRa1VdLTg5bjIn"+
    "JDZRUGVeOT0ibW0jSVZOYkJEZi9PaVtEIjs6W1FvWTIzSDZlW2lzbEFUJWZJVk1dJCcoMWpfLGEjYURX"+
    "UVpuLlhcbG9QKSkpQSxgW2JoIU5NTGFob10mZEVDNiwuZWBTNyZDOWVnL3FdcEdCW0ZPNFNlQW9CNU9l"+
    "O29FOCFNdHAwUidqNXM4NipfWmV0SUQjZSInbiRtWSJWS1wwQz5GO1AlMlRhcCkpNUJWbSYnZzA2WVxw"+
    "PG0tMSxJU2hQLls4PD9KJDwvWTs4U2JpWSwpVGhecmxhYVZIPjhuJT82aUBYK1t+PmVuZHN0cmVhbQpl"+
    "bmRvYmoKeHJlZgowIDE1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAw"+
    "MDAwMTQyIDAwMDAwIG4gCjAwMDAwMDAyNDkgMDAwMDAgbiAKMDAwMDAwMDM1OCAwMDAwMCBuIAowMDAw"+
    "MDAwNDcwIDAwMDAwIG4gCjAwMDAwMDA1ODkgMDAwMDAgbiAKMDAwMDAwMDcwNCAwMDAwMCBuIAowMDAw"+
    "MDAwNzg3IDAwMDAwIG4gCjAwMDAwMDA5OTIgMDAwMDAgbiAKMDAwMDAwMTE5NyAwMDAwMCBuIAowMDAw"+
    "MDAxMjY3IDAwMDAwIG4gCjAwMDAwMDE1NzIgMDAwMDAgbiAKMDAwMDAwMTYzOCAwMDAwMCBuIAowMDAw"+
    "MDA0NzM3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDhiYzI2YjMxZGI3MTA1ODA2NDRiNzM3YTMz"+
    "YTRjNzI0Pjw4YmMyNmIzMWRiNzEwNTgwNjQ0YjczN2EzM2E0YzcyND5dCiUgUmVwb3J0TGFiIGdlbmVy"+
    "YXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gMTEgMCBSCi9Sb290"+
    "IDEwIDAgUgovU2l6ZSAxNQo+PgpzdGFydHhyZWYKNjA2NgolJUVPRgo="
  },
  9011: {
    filename: "peer_review_9011_2025-09-15_Jade_Warren.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "UiAvRjYgNyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29k"+
    "aW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+"+
    "PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLVJvbWFuIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQg"+
    "MCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGlu"+
    "ZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8"+
    "Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGRPYmxpcXVlIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5n"+
    "IC9OYW1lIC9GNCAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjYgMCBvYmoKPDwK"+
    "L0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFt"+
    "ZSAvRjUgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9CYXNl"+
    "Rm9udCAvWmFwZkRpbmdiYXRzIC9OYW1lIC9GNiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4K"+
    "ZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDEzIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYg"+
    "ODQxLjg4OTggXSAvUGFyZW50IDEyIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0"+
    "IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMg"+
    "PDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9Db250ZW50cyAxNCAwIFIg"+
    "L01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMiAwIFIgL1Jlc291cmNl"+
    "cyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFn"+
    "ZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyAxMiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4K"+
    "ZW5kb2JqCjExIDAgb2JqCjw8Ci9BdXRob3IgKFwoYW5vbnltb3VzXCkpIC9DcmVhdGlvbkRhdGUgKEQ6"+
    "MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvQ3JlYXRvciAoXCh1bnNwZWNpZmllZFwpKSAvS2V5d29yZHMg"+
    "KCkgL01vZERhdGUgKEQ6MjAyNjA0MTgxMDQ5NDUrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQ"+
    "REYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAoXCh1bnNwZWNpZmllZFwpKSAv"+
    "VGl0bGUgKEFubnVhbCBQZWVyIFJldmlldyBcMjA0IEphZGUgV2FycmVuKSAvVHJhcHBlZCAvRmFsc2UK"+
    "Pj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgOCAwIFIgOSAwIFIgXSAvVHlwZSAv"+
    "UGFnZXMKPj4KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVE"+
    "ZWNvZGUgXSAvTGVuZ3RoIDI5NDcKPj4Kc3RyZWFtCkdiISNePkJBT1coNE9sPV50VT8sKGE0LClha2Bq"+
    "PzlmZ09APjthdVJCPUk6Mi9ccicwTUghLWhOclQnLCM6KVRtKDNPPyRSO0VrY1w9R18scSRuK1QvR3Ar"+
    "VmtAMj9dZ0dzV1o1cWxgUnEmTCwkR00ybixwM280JDEoajFTNU5JaUM9VFMsIlFOcENxU0FWWS9RaC9i"+
    "J1RqVlJBcDlYPypWcm5eLkpQU0w+clhqZERxIm9ALWEuSmAncDUlSU9pZU0uV1lpTXFtLHQtcSltczlT"+
    "KmhpaVY1TGJROyokWXRdWl5pRGMyRVIsQjpRUiErOVNkVWNYUzwyRD5nWClqLkVBcXVFZEo2M2Fpb2Fi"+
    "YEVtS25UODsjMWw2MGVtYWZJU3RSSDMjQGBGTEY2dEVeYjQtSDJEWFEpc1FDRWNxbS1hTmI9LW9YJjk/"+
    "NSpPJyE2WiI1NDxJSlZgQzZqUylLR0QsIi9OTjdiVjhNOCtuKF9GVlZcRiFWXWVvRzlTay1iW0xhT2Zl"+
    "L1ptQWBeN0VpaHJBJldnTVxOO0UqNzAnZS04NUgtVEhFbmAiajpLLlw/JnFBXi5YYUI1OENaISpLaWxF"+
    "bWppYyFpSyxTITFPJGI5M0pJS2FjU3UiXGc2cVxDcVVWckxtQWNmKDFkcTBzND42PC1mUSNfdCQ6PzNr"+
    "IlxpLVQ0ZHF0M0JFImQ/KVtXU21JY0lQY1tTPFtsVDgpI0ViMk4uLmYkVEElL2p0QS82JWUtbjlsZiIo"+
    "S0xjNylWOjpgY3VjTDA9PGxCMiQ4NzdpXnJmaihkImZaLmVMOCwpWDNOUkVWb2xxTE5cLipuVyNAZUVH"+
    "P0QoXDE7NysiPCkxcHMzbV8zPU5yLkJRPyJpaDcoa2QjJiduckVyO2BFKFBnIWEqYGZVSmAmZyojNClc"+
    "TD5WWTw4Wk83VHJeVWckJz1pQF5VNlEicS1pZyloSSQvIzA8WkNhVyQ/QFNVYm9uWy1nOyhlWzE+OjtM"+
    "QkI5dDBuVkpqbikoRjxtcDw2ZFwsTEtIXVMpbmw3LzI1ZEE9YF5YQFFdcDNCZDEvZT9MWlAlIyNmdTs8"+
    "bFE1OC5jUyNCNWkvUSdZSi0xIm4nMkNePFlfJmE/N2RjQEJLLFZDIUo9PSFWNDAkPzEpLk10bzU8T3Uh"+
    "WDAoZkcmMGpTO0o8aU9UUT1gWDQiL1UhUlw8M2lFPGE2bzVIWjNXTidLKlZodGw+RHE2TkBeYUxXaiU9"+
    "YDsyVDFiKUghQmQ0QmR0aCkvI3FrRT9KY0c0PG9EXFlxIjFBJVJ0Lk1WbjRvb2RBQiEqaSF1UDpqXGU3"+
    "Pyxobkw9cjRrMmJMcWZRMGdvbWNtRFtUP3EnSzpVL2tqLUlxaCFSNDwySnE1VzcoNTIsaFhBXFc6TCE1"+
    "I2NBcSd1IzMwJSRubUw3XilmM29ZcW43NGc/NThOPCNXYTo4TFtraFlhMFgsK0Q7YHReV1Y5ISlXaTNS"+
    "dVAjSkYxKzs6WGUhRC9nJCRbQDdjVXFXLjJaUlxZJCYhaDdETU1rQm9DPDxvVFVrTGkmKG1mIyFdWllB"+
    "QE5rTGpvajZTLlQxU0txQ2t1RkFKLyUzTDQ9RCw2Vj1nP1w9JCteZzAwK05cJ2huIywnNFJFLUNyQT4h"+
    "JzhzPTMhWGtIRlhQckNmKFchSDFLTGU8KCtXZ2lcVTYqNHIxS0ZoaS9gJTAsLSFwWTQtM0JLcydXVig2"+
    "Zj5OKWkmWzRUcWsoOGVNbGdEYVtePk10STttQXVLYXJlQT8tRCVzaHMpPF4vJCk2M1NaKG9pKEVPRm1I"+
    "SDsucSJKZzlcZHRdJDk3MDdJLG04XSNGLDwhYzlSPCkmRF9DMGVEZkAhUFxuU3BbJ1M/aUVkTlpLLG9u"+
    "XSJFVWIyQmwzSHRKcTBbWipJcCl0cGw3ZXREMVsuU1MjRVpGSlFlVT1oZUFrXWJfUz46V1RQOHFOOF4+"+
    "XElQTW9ySGAtckBKI1tRYj8wQD0iM1gja2NWUCkmKF0tJTNeaS1PMl9mLyFkN3BSTUhpb2BwWV5sXnBf"+
    "Vk5jYFVlR1hAS2RDaTZldGMpdF9aVHRGdFYmJCxdJExLKkwnQSoqZFlHUG1PLVkzZ0AtVDhzVDMsb3Nq"+
    "WTZMJ0hwMiJlQCYwXlMwUmhaO3UrOkt1QDlZVzxYUUxJNFtpPisqYCMrR2E7SEs6WCgjWWkoUVwlKjFU"+
    "JlZiVERCbHFkWSwmVGk5TFBdPFJdOXEpWipXNzlnUCVmUS5nO3AzMzZqN3U9YTUoI2w3VDJeQm1CPGFZ"+
    "ZjJBciQqZ10nVVMyW2UtRDl0XjdtMllpVW48UHRKSEZEZHRwPFw8PUNWamVMP2VqQidCQSMuPXVXY0Za"+
    "JEYuNkczczg0ZVJKMWJTNlpMIyJycTFHaTQwPkZEQEluKyI3STkyRmJQdUcuMTsqM0VFPlImJ2FwQT1P"+
    "JVxDUFMpNWNUOmcwUVRyRUxfQVlJK11vY3FFRFA6ZnBoXFJGZFYzP29pWzk+PmdFJ3NyRCU+SzModHJT"+
    "VltkQkU5KUctJEFJYiM9T1lFXjJrTFFtO2FEbVw2MFRpL1QnNDJOK0RpYVBiVE42W2hQVVdPSD1WLjs0"+
    "Tj5qbnUqVF1ZT05ONyk7LzhpL3UvRl88LGhkXFkrMGthbVN1XG8wPjU9UF8lX2AiQWJWNEA5WCZMSzRt"+
    "a0dicEk6V002MzAuUFhuMCNmK3RpQDdSbj5taDgqKlNmbnQ9VlRpXkM9XXBCaFNuKj5NSiFXJHFUZG5u"+
    "Yiw7X05gSzVXW2lEVy4oLSpkQFoxJjBWPHFLRURgKlQpc08yRTQjclU+bSxXTjRAVE5gbTZORFk2OCdK"+
    "M2NAWSg3Ni5TbF5PLl1lSkVZTjFhLWxyT3E1WG9BZy9LOzEtSTguV0gzV2okQmRqUytkI2VCJkppWUBH"+
    "KiJCXjI8X1JcbThGSitjPDxNV3VmbmU3Ry9wKydSbEA9LCssKXJnZ0s7VG1nLkVSMWVvaC5oP0RXbi5c"+
    "SC4oQ2Q1Mz4yQGgzQyptRTJcJnR1Tz5BKjlGKl11SG1uOXMhNFQxIktyQVwlRjVZWW08TyJfJElWM2BF"+
    "ajw+T0VmczJuIl87N2JJTS8jM3NSRmMxZlcwJiN0WDc3NFJoa2g0RUtVcCUoTVojQXRaakZzY15bYkd0"+
    "VTYvO1IhcDZoUyZRVy0jZSEzTlArXCN0VCdQanFmOkgtRTNiZ3JEdWErRU0jIlRYVzRIVFAqbHM6aSgs"+
    "Nl41XD5kTilhPFdpTFhJYlosXDlNMFwiIT5qaGwiQUpNcCQ1ZmZlOnJlKlFja0hiSSZpJG1GWDlGYl1S"+
    "WyxNIVwxQV8sSmpSMmlVNUklQkFAVmNbQTxDTC5iRTtbKDMwTCNRbmlqWFlZbTJRJEJSPSZCZy5pWjBn"+
    "XS1xOlEhWTg8U09FWCM1Uz5fbiNmL1ZmOmhjLipfZ0pvJF9qbGAlKTgtRWFLbUIwVSEyQ1U+dEFGRTU2"+
    "LVknWlNNOmIzKkZiQi9aN09MX2NrI1hdRytrIitcXixyQE1JU2lDUmJxJFtjUE1uMF1nYFhIKURITjEu"+
    "U11GZ15AcFtwSF89MT0iKzxmUFArNjBbZjoyIz83IkZwP2g6OStCL2pTUD8vL0lDM2VuO3BmJWBFREJg"+
    "aFolY2IyL0FvNCVca2tzYjE/WyYuUylrci9OPXEtUE5IWGtcaGJhRkNRTGxZP1BUXD5QZE0zLDNvJVFE"+
    "VVRxQiJHWHRyQFRdQ0BTUkN0O0M2YXBMYWA6S2wzOScoNFRoJUYoKCJKXzQhaUloLUFsRE1walVFMyVJ"+
    "RzxlS0VoJD5nIUxMM0RLUz9KIzQpVEddVFBLLiVKRm1QbWhAVCpzSl06b2BsNmU7TV4kVlc8ISMkYWtK"+
    "bmZnUFliW3RXXFFnTFdVZGpSRTU2YHJgWWgkQ2dyMD1cUjJCfj5lbmRzdHJlYW0KZW5kb2JqCjE0IDAg"+
    "b2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDExNjAK"+
    "Pj4Kc3RyZWFtCkdhdTEtPyRHIV4mO0taTCdsdXJuMkhpYl5BR19PM2ZxLmhYPj0qYixTKG9GIyE0RGch"+
    "UCVgIlFuKDdqISJTL3JsX2Y6WDNkNiRwQzFGIjttcG4+dDRaaUUnXWk5dS5FOl41I0NCS3VWaTUvSyxv"+
    "cj48cVEsbzh0Zi8+YSFUJlcpMTZcLjVGTUIlZWUrSE5nVE0/cTlPJkxqSkcsNjpESDMhcStvTCgjIU1h"+
    "JEdtcjgpVnFxJk1TYWZvNEFKcV9yLCxyK19rSnBFPFhPZl5XUldTT3BKbUpFWzljcVNEK2EzKGkkdDck"+
    "aj01OktRJnQuPmU+XlojRC5NcFJXXixdSFxbNENyTlFhV0BUSSI/QS5UWmJVRklwNnVqO1RAX0BAVUFw"+
    "ZSlhJ0xQJiRnQ1VSZWluUVpUZVViMiRtOC9zV2ouaFFFcC1sNVE7UyQ+JT1jJmBbcWhUL29GYG5HNSRl"+
    "QEhANT0hdG1CMzcxOkZLVVZOY11JbTUrWURGXDdPUktCWlg1UnEuPytHX0cmVSxaby1dOCg6WDN1biIr"+
    "QEMvIyZeWzFbQ1ZFaEA8az9hTUhiPlY0QzUobk8rPzYiNVZeJk5VXStMMUcqN0knZyVZIV5jJTUlQnQn"+
    "ImNLazkhZj03U1Q3RVlYIkdGMTM2N3NKQCsqJEFOJkdeW3RRRCZSa04mImQiNzNUcUw2cnM5ZVxLPClr"+
    "T2Y4RDVFKDJtIiFVa2g8Ty0wQyRjcmxJPUxKYT9USShoMXRxJFptLWc2dEAvKiVZbWBlTHQoLEYvMUhI"+
    "J2JdLDVvcTc7anBGT2xmU1ltRXBiN1tHSk1eY2hMIy5IKS4/TnFtVEchSGQrNFtOUWJGKF1cOGsoMWJK"+
    "VyJvNEJDOlc3dVZEZEVlVixtKGVUUVlvbSRpQVFiMVxWU2slaHIxJTtWPVlPZlhyO0EoZkxNKXA1TGBd"+
    "KG8nXVlcPj4hUnJVJFBVW2VxdS8wYHFBSD5yb1dFXTFkLDBUTGczdWdPPzleR2NhXUU1JC0xckA+LE9F"+
    "RCxvLlNFa09BcjlOTj5XcjdGUiNQZl5DMi4jJVAoXiduU3NwQWQndUg0bkFraC5gKVkxLT9VUWk3ITws"+
    "byxyRHRqV0oxOGs+WHBwa2QuMnJwL0ZNcGljbUFSXUxzbD9NcEojbUYxPDo7VmREKlM9ND9GLFJzUGFk"+
    "LyVYSjU0a3AjdXAtWmlQcHJOIVlZK2JFNGpkZ2pILSM1K1RFJGs5ZStXZzU4X2kraXBdYnJ0WDFXbls3"+
    "PiEjYT4rR2U2T3IqQ2ElbjQ0UFdgYTlzYF0qUVwocFwlM2ZTRS9DNVRjLG9KUW1FZGZPJCE/OStsL0ZK"+
    "a20xYWA7WEBWKVJJWXRjam8iJ20kNmpaIU4tXi0nKy5gYm5ZUSpQS3JUTGNbOl0lQmBXLF9kOTsyQT9c"+
    "VTpMUlQpPys8TyomYiJsLmJoZ1ZbQypTdE8iUScjLTo0KWFqVGFtWyQ6RThAMCM6YXFSR0lMNGFQLFVg"+
    "Pi80cycoNDI7NkBzRTFcRXUuXmtyPEQ8VGZgX34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTUKMDAw"+
    "MDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxNDIgMDAwMDAgbiAKMDAw"+
    "MDAwMDI0OSAwMDAwMCBuIAowMDAwMDAwMzU4IDAwMDAwIG4gCjAwMDAwMDA0NzAgMDAwMDAgbiAKMDAw"+
    "MDAwMDU4OSAwMDAwMCBuIAowMDAwMDAwNzA0IDAwMDAwIG4gCjAwMDAwMDA3ODcgMDAwMDAgbiAKMDAw"+
    "MDAwMDk5MiAwMDAwMCBuIAowMDAwMDAxMTk3IDAwMDAwIG4gCjAwMDAwMDEyNjcgMDAwMDAgbiAKMDAw"+
    "MDAwMTU3MCAwMDAwMCBuIAowMDAwMDAxNjM2IDAwMDAwIG4gCjAwMDAwMDQ2NzUgMDAwMDAgbiAKdHJh"+
    "aWxlcgo8PAovSUQgCls8NzJmNTMxZWY4OTQ5ZTcxZmYxN2U1ZjNmMGM1NTA4MTM+PDcyZjUzMWVmODk0"+
    "OWU3MWZmMTdlNWYzZjBjNTUwODEzPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAt"+
    "LSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMSAwIFIKL1Jvb3QgMTAgMCBSCi9TaXplIDE1Cj4+"+
    "CnN0YXJ0eHJlZgo1OTI3CiUlRU9GCg=="
  },
};

// Auto-generated FENZ-style evacuation report PDFs — base64 embedded.
// Each key is the audit ID; base64 value is the PDF content.
const FIRE_DRILL_PDFS = {
  5001: {
    filename: "fire_drill_5001_2023-06-15_Pakuranga.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBQYWt1cmFuZ2EgXDIwNCAxNS8wNi8yMDIzKSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MjEKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJ0BiJyF1aV9J"+
    "OygrIUcydFdnK3VAYkBITVJVUi51Py5iMEU+NENyVWxSYSYydDQ1OFZLPjtAbk0/WDQ0cSsxYlZ1ajE7"+
    "QlliLnA/czcuXC88LVo+Ny1WMnBgP0FRIkg1UlxCUktDKiQhZ0M4ayIrYmYrJ181VGNQPzNsYzRXNC41"+
    "K0lpRiZBJXFzR2VARmszRF84R28rJmc1bkUpbjVJUW1UJUlySHJEPkZfZktoRUJUL2ROUkNZPDVKREc9"+
    "NzR1YmdCV0gyOE4jOzwzcicqNllmbyhHN2lIOV5CYU4wQU5pJ1RmK2FZWExGWjxHciFmKGF1S0E1ak01"+
    "N0RJYmosWzoxTDJfRWJxMCpbKkxASGVjRS5dO0s8XWZEZkQyJyJpTm9xa1I4b1EyJlI1QHVzZ1UvMSs5"+
    "J0NRcVMuWGBYWF1TZT9uQGIpclA8Z2VQMU9NNkMuMUc1Qkh1a15ETV9KNStNWDA6b2dWLyxGN25QOUJt"+
    "JSpAR1lpKjxNW0kyZW1Sby1YYEFbLkQ9PDFDZUZHUmptW0N1PUhzZEVUO05lYSRTUlw1NzhRWUFhZCNA"+
    "YWQzXl9vSFpCaStkP0FeUSskakwwJjpzTi9DRXVtJCwmQFBXZjgjam4iYDMqWUduRlw0YVtETEotY2ZG"+
    "Wi0mYjdEJUhrJlc5ZmxgRmcvWjNRKFo0TG9VR2lxImoxNHEiIUdbZ2wvQyNoTWIqIWNKIXElXzEoLE06"+
    "M1woLjhAUU50bVdtKW5DYWhNX3JKRnRwIi1YKTA9Q0x1by1SPSFUYGpGYl1ZOFdoRlZtYFUpKUk6W0Y2"+
    "XHQ6cjIiL20jMjlgTDJtSkFsPyVsIWRTaXQxY08lP2knK2NaSDxXNyMtJk5rKV5zNnI5WTNHaVxKNURk"+
    "TzwyNzhJUmkoZSwwcEpRQ3QhXDNXajApSmM5UkE9a05RPW1kWWlOJVgiU3IjOT9VKzpBaGtZIypLXF84"+
    "UzIlMT9hVl5SMSNgXU4oNyMvK0psMCZtPmozWDI8PGs8IjRiYDNfRTA1TU9MJlNrX2lFIjk6M2gsQFtJ"+
    "KixCaW5iTS1RbyM0RjdGOiU2NlxRUk46MSNCSSEmdE1eOCVQRkg4LS9AWD4jJjUkJU9SI2RcLFZfJCk6"+
    "UnRLUSJvUmVZQHJPYXEqcXVKTmI/VkBrPWlkamlIK3VUWSRbZ1AsbWM6VFJHPW43Pz5uPWk9RGRDKmYu"+
    "OV43XF9nbSJcUlw2XjtcbF9YPWlBPyI2OmhQdTYzY0ZIUT1jOVhPVlRPOmY3KkY7dSwtSF5QWS0vJjU5"+
    "NT8lNyZMQG9DT2BSREBeKSRETjlOWExHYUtkOTNRRTVecWdPQy9EJzI1OCU8YkozIis6XVMpX189YyxR"+
    "TSdcSkpmS3AkLi91Q3RvUFNxUVpiXFdDSyxLRDVcOmoxZ0FOITlAJSdHNDlNX3A1M0ptS1VmbXBiX0ZJ"+
    "ViJDYzdEI1gjZms5RGtULWZWVCElIyo/V3BiKGYrZnAlZEYsc2BYK20qZ04qZUJUKWU6LVBSVT0yOkpC"+
    "I3RaS0UwYHAhcT9dWDRRVyhDWm9aNXI7NEtUbTMvQ2plNjdPW0x0aSclJ2c1JmxnKmAuN00yaV08c3BW"+
    "cFxBOWcvQWBrQk80WU1OVWNdcldUYjw4UycxRzktY0tYMzhZKllvVyF0Zl5rXmAnWylabE1QKkNdbEBZ"+
    "ZTxmazRJRzFgZjRmc2cwW3IrW145ISd0LUxsN21QPlg3KXJCLkdZWTVyS2JaVCM3MkVYNj5vPk1zR1Ep"+
    "VDVvRy1GJjtNJmApXG40M2hoayNiNjVgS0duYFwnUUlcR1djOnJCbXRHUFkkZUJjI21cWz1tTVVrbVEm"+
    "NElJWklESzE+YktuKXNyWGRlQ0NkZjAsUl1hKjpuWyNWVSFRUzZOPCFeTmVtRUorP2dNTiNwTjJILGhc"+
    "XUpvOlItKk5oYjtrY14vMl80QilpSV8haTBjSCgyI0cqSkwwayUsblNUYExZMzxJVUhTc1VlaG0zJExn"+
    "QylvJVJET2onVVAmJGVoW21NTU4tRi9gXz1zbGhTU1VXOlBBaVUqJGVLN0xxS185PzokPD9HSyduOEVv"+
    "cFspVU9QRTNPOEQ9MD5hV1piKGImYTwmKS5DMCJUcz1BOF42IitKRyEoYi08TC4uUSNgbklCLkVgXFNx"+
    "TiUnLiNyW19RX2VeQkJvNSVlZFIwUilAQ2VqPUlIaEo5RjA8TlpMRW8odHAzSzA4azhKXGwpY1pZUzsq"+
    "KDJBLVtsX1o+b1pIZU9NOExzWkcwYkIsUTEpWU9xK2EmRW4mMU4+LV43dChDaExIcSFZYCwtaW9vc2hI"+
    "RTZZMWB0YnEyXT81PzgvQWhOQWRXI2M9LCtnLUNET3NpSFBsMW9sMWNBal5pQkZIai5ZOlA3U1lhJ3NL"+
    "W21NM2M2Jz83WlZ1ZyZjQVU2PEM5OTU6OyUnKE5sNjohSDAuSklZZXBJWlkvQ2YzI2ppR20mP0oyOWRO"+
    "Rl88TldeUE4ycmhYJltwL0ZQREEsVGRucHFRck5MSls5JiFhUitbNEtZI0dHbmJJISdRblgmRVRzSU4r"+
    "MFd0RjlgbThNMj9hMElXPDF1VzM4RCpiRlZ1XlE1WyJLQVQnM3VmUSNqVzRRRjJITEpjJ0dgK1UlPEpW"+
    "WGBoPDNuNSluUEs+IyYmOSRQNWE8Ljt0alFTTGcyJSNcIjUqTTQnIVNzJmxxZWQ/QScsQjdrWEg4ZUNZ"+
    "Z2hAaldfMF91cyU7L0cwdXNgcjtdWEcwbE9DK2s1OEpWMCtWX1UiJFlLLzVwP0siTzxsWklMbzQtND9s"+
    "P15qdUQvIUwvJkFnJitGaEZJXmpyRzIyamNRVW9UMVkqaWg1YW9xTDhjMSguXVxnNU91Oko0Vj9wWSdV"+
    "RmxzWSMiQj0kNFByNUAiKWssbClMRHJrcjohN3RwLiUwPHAockcqL3U2KWcxNWNNdCwhW2dpZGNgZ0Fx"+
    "LXQmK19jXFxCQmw8RlhpNW4qO28qY3MlKk1nImY0UTdZVGUzVE5AIktCRFtQNUQ3MERxO1UrXWssanQq"+
    "ZHNkdG9DbVgtbkpqWzI4Vk4yUi82YGZBLiJkQixaOHNNNDNtbzA8SUQtXi9JSF89OERmTToicj9vVUQm"+
    "c1NJM15xRVM+KEsxXiYka0Q3ZylcZF5KRF5eIXEuJU42UVhaIydFNVRKNltWYD9qQ2I4JjdnSjZcZnBg"+
    "MUlVTjlYZmRMPSEiN0EqV140I1t0L21XbGBbJjZtVG0zIi9KP1RuT19VdUo7KEg7MjQpL1FcJUQnOCIq"+
    "RG5UNEJtVypdO08xZj0oV3FacVk8YyhzUHBGTCZuPkpXTiVNXjg1PjlUPUZXayk+c1NEdUU2KyhMLCxS"+
    "bClCdV4/SzZVLF9pOC89WFRBXWRDP0RLalw6WjNcJjY6Y1ctVlg8OWVZZi9OTWI9USU3NjZecEE9LiEj"+
    "JSUyLURXLTQ7IVxCVDVnWWBiVEBzV2heanNmJUlibVhNYl1ZTDoqLUE1S05jIWNXMW9dSDZLOmM9N0Nf"+
    "cW0yUUotRU1wT2dJPVU9VXBAOCkhIWFVI0o9RiVcVVk6VzxOM1cqXj1MOFZQTVpCb01zaiV+PmVuZHN0"+
    "cmVhbQplbmRvYmoKMTMgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29k"+
    "ZSBdIC9MZW5ndGggMjAwOQo+PgpzdHJlYW0KR2IhU20+QXI3UydSbkIzMyxkJyFMPmJSY2FMciFyUmdv"+
    "YV5GRFZJJF9sc0JiVShdRGlqUWEkJXMqZmE3ZCNvdWFbW1I+PCckI2s+JXNgJVQqdExwSSdSczlhNGUy"+
    "XGZUInNTUCMpcEgxIzBcOzU5XSFcX2pRUD4xQ0g0T0xLXzBxSitPR2RVP1hsPDotQilcLjRXbDw2ZGFO"+
    "Xz8+XkhuTVMiZ1xwRURIRVM/aWBnYCZhPGYvJzFeMVNiWylAPEhAMDhsPDFwVytIcWFXWE9AMEMkUSJX"+
    "UUE5NUpyMUIrSzBVaiQzWmY0ViJnWSo8LVc1LStuWDBkayEqMlpuZyNeMF9sJz5RV0NzbnI5Wy85Nmoq"+
    "aVosLyxSIkZKPmlObFNeOE8jQmtVdFJqU2RmVCwhJi9NUmM7T2FKczlMYnRaVEI0cko8Izc2W2smalNc"+
    "Rjs+JjJeISpJWi01KypwXldIMDk9ZCdpQFpoXXROOFlkZltFczFFJ0hPcVEvOiRjajd0bHIlWVhWJ2By"+
    "Njs8K3RAYClRcSdnOz8rR3NGIk89WUcucSNOaF8pLWwmXVQzWlwpLitqa005UnE+K0Bfa08/MSs6WEg0"+
    "UWgxIzQ6I1BxRFlIWyZpVFIkYzNlVSs1XUBOLl9oSTU9L1RcWiNQRlA6J2B0TlBASF0pKmthOyNPPGhD"+
    "PyZZPFNpYiwuLTk1WzsncV1NLis7aiZvTWFXVmI8TVBYTW9jcFEvYU0lO3JHWCxNYmlNVHAxQUA4aTxs"+
    "X085SjUxbElzcUU8JEIkMSJSYnAkP19jITE5VFs5aU1AZCZ0JTlYSWpjQEtwUT8kNmlFJ0U8OixXPCFM"+
    "MnJKb0ZvNT1VSl9iQkNKIiNtJSdYMCFUSi4rTDVIWUEwYCdSa2AobTZIXyJyPDVWWjNST09hYD9FUWhe"+
    "PUprY19hYCg5S2goKytdLllsQypBSUFlS2NwcUxlQS5IVkluKkVONT9IcipYMkVeVD9oVVsnM1ovYSUp"+
    "OU1fXTBBTlFHRFpIYTA8OD8oPE9zVGJwW0BQYlY9LW9hRzkwPzI2LjpcUS4icmM9YlpNUmBGVCROYF5l"+
    "JydcTj5PQ1s+LUEuRD9SNihUZFwwdUUzTm1TK3RTVl0ta1NOXlpJSFxnRDInb0RQc2dFXCxucVxvU1g9"+
    "b0RCYmNwQ11ZbFRTL0Y6PFgrP0QsblFOUFI2WylTXmluO3VtY0VESSxWUjE5TVFTaWs1ckkvbmVCZkZI"+
    "Ym9Mc085ciI7RlVFVFJLNDFrTy9oOXFyb2s+ZiJJJWZNZ0FkRjxVbGc/RSVUSyw0dF5jaSFhPyVdKC4u"+
    "R3FyIXFIbjRBMWwtLUpBW2FdUmRMZSZgXkFKZS8tR0FXXUZPNTxgVjRjM0ZvMV5uOFxaUyw4QGlYNFst"+
    "WGIzcy1ILEhPakUlQ1ZDPi5Cc2U1cVo5WClZVSgyL25KbSJCQUldZl8yTTtuMElKci5WNEVKZEpIKjdr"+
    "Q2xNJFw2LStrZiwqJ1crdFpHJlpZW14pZWdAZHAlS3AvXG9eVD40cio4Y3RBIj1HK2UwcCcyR2JBUTRN"+
    "XWEpZSZQZj1UdDZiPkkrLzAwTjosZGlJOEBzKzYpKiMqOEcnIkF1aUtnYCM+aSdfYDUlOEJGaWxNQTY8"+
    "TU0rO2ZpSUlKV0JJb0A+MmU9NnQmN2VJOldXLEYtQmtscjlLcWIvSzFkOURuW0VuXlZlRj1GSm9NOSs6"+
    "ZFc6ay0yQWVvcnM/V2JKUyhZRV1VPUZIc0pZW3FTQ21GaSgtOCotXyo6NCdGImNNdFJSUGE1Z25TJys4"+
    "SlA3LyomZ2JxW1VYRlZ1bFVbI1JgOTNtVj1aIzxJIjdMJ19eMlZPZlptXXJedXBwbzRZMkFUQkZTOUhG"+
    "bDdJREpoSFAuJjRYRmFLRzNqKXFebW1vbUgibkc3JUlvNj5LNDFPXjRbMV5QUjFES1spRC0vQTtsXVFt"+
    "RWkiM2FxbjNmQmBiUTRAPSlkcWluXEtZPGthNTNNWlloWCFYUzk+VzxhZFhxKmJxJyFPODlARjVCUkRn"+
    "I0kuJCdTR1deVk8kPzo8XVs/XS1cMGMrND86UUBFJC08T2Y2V208VGhPPEc7ZEFULywuUyotVCc9Ulc+"+
    "R081Nk9jQDI5JCwoW1xJW0M6Rms1XG4yK1AsUXAqTSxdODJHOVBaLGZHNWwwO0pXZlFAcmwqR2FlVCpK"+
    "WnUuI0FbaSgnMlJ0KkxpOSU6KW11Z29NSGBgW1YlMTs9Uzo5c0RqJihuSXJmJC1hKUE4amA7OCxoRV5j"+
    "O0ZkQXRJZCwvLVhkWjltQyhAREszclcidGwvJV1kLm8tQF9dQFtXRCxbQ0Y2KGJrNGBLUkFKYzxbJyc/"+
    "X3JeRnBJZWQ3R0JqJkEjKCFmJDpebG9JUiNQLSU4KSxBbnIjVG4kJGhpJGI0TF1bP2drKD1VIlFtNFtC"+
    "XzxlYjk/Z19NIS4rNU09aUVYK110J1gzLjs8UkUmYUFOWVdgMjVSaiZOXWJHW3RYXGBNXUhRNG1JOVBt"+
    "WWVaSXM5MFFOPzg9SHNxPlgrLzhoUlBoLSMpaDVCVkorX0dMNWYnUVhmQHJOMS5CIyQ+UCtJPF42MVdC"+
    "J1IuMGhWcllIYjtEaD1mZD8vXXQrX0EvRCJKaU5jJnMmOVpaSGRrRzw+UjcpI2QrIjtnKV91fj5lbmRz"+
    "dHJlYW0KZW5kb2JqCnhyZWYKMCAxNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAg"+
    "biAKMDAwMDAwMDEzMiAwMDAwMCBuIAowMDAwMDAwMjM5IDAwMDAwIG4gCjAwMDAwMDAzNDggMDAwMDAg"+
    "biAKMDAwMDAwMDQ2MCAwMDAwMCBuIAowMDAwMDAwNTQzIDAwMDAwIG4gCjAwMDAwMDA2NTggMDAwMDAg"+
    "biAKMDAwMDAwMDg2MyAwMDAwMCBuIAowMDAwMDAxMDY4IDAwMDAwIG4gCjAwMDAwMDExMzcgMDAwMDAg"+
    "biAKMDAwMDAwMTQ1MyAwMDAwMCBuIAowMDAwMDAxNTE5IDAwMDAwIG4gCjAwMDAwMDQzMzIgMDAwMDAg"+
    "biAKdHJhaWxlcgo8PAovSUQgCls8MTAxNWEyYWYzYmZiYzQxOGExMWQyZmJjYTE1NzdlY2E+PDEwMTVh"+
    "MmFmM2JmYmM0MThhMTFkMmZiY2ExNTc3ZWNhPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1"+
    "bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMCAwIFIKL1Jvb3QgOSAwIFIKL1NpemUg"+
    "MTQKPj4Kc3RhcnR4cmVmCjY0MzMKJSVFT0YK"
  },
  5002: {
    filename: "fire_drill_5002_2023-06-16_Flat_Bush.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBGbGF0IEJ1c2ggXDIwNCAxNi8wNi8yMDIzKSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDUKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJyhaZFZBNE5x"+
    "VS8xdWppREZQPEcmN3BvXmkvLjxbJk9zP2lbRjpxV2c1VCtEckdJT3BaVVVgS1VMOEdIYy9BUjtaW0JB"+
    "M2ZcJmd1JVdBaS1ZWj8oQ1YuOWQ2MDBULGBGcShFLTFhLCZSLyspOikiKFghMW1mQHBFVnFXWmRkNnMl"+
    "bkdeX2UxSkhwKlxTQEklTVQ8K11aOVA0XV9SKW0/XVAtWURdRlxkKD9iIkFHRTZwTyxaRm86QmlyLjBh"+
    "ck9fc3BSbFVtV0lhcSo4LHBAXiomQFZJLipHPkpRNFAoc0JGPVlPWkJrVkksKSMoYyJIO0peSS9FbSNM"+
    "Vl81Q29dYlo+ISVyMUNyc0dNUzBSQDROREQ1VkxCcj9nRkIiMFFqSHNecWohRmBrKmIkSE43ZjdqUFpV"+
    "JHEjXzxlUmRlXFtLZlJwSi1UPyMuN15ebkVEZCxbI0YvWmZaVktGVXFLQis+VU4kWXFaX2BwKTY1bShH"+
    "Rzw5dDs/MycvXGVnXGxfZXRDNEBPNGBqUyY8NmolZyxqS2hzZVxGYzI2Sk1nUmwqZjBRW1Q4RSFZISdk"+
    "bCNPamEpMDVvZWFPPycpJUpoP1kyNlEnJ3FhNDUpPkFxYiFKPWVBbzhFbDtRKy91ZTkvNkprJ0cnN2Mp"+
    "ZDwkMmdbRHE4YExbJWcxSU8lOEVJSlVxV3JGJ09yRm1zc3IsYCokX3M6KVdVSmQ5KDJXNzk0aF9wLk9J"+
    "WWYpZi8kWWpyP0FLTSg5JF5cVSwkO2UhUSxZTi8pI2o0OEtjWXQnOWclaUYsO10sTTxnPiw3bFI9LUVs"+
    "RyxwXTUtQGAiRE11dVhPKDgiZGEuSCdHNXNAIlc6P0lKJmFcQEhQWVhtMV5vIy1NcDlHJmovajgxKm1M"+
    "XFdjYGlNVXBoVD45N3JSIUNaXkpNWiNicStpdFZdKHRnX25VV0JTYmhUISktNj5DNnBxSHRBLFVrOi1i"+
    "Y1NPbEMyJiEvYEJQdFczI1okLkw/MjxQQUtLZUgnQChSaCJLanUqSDFEXCxxPyZzNT47TWI6Q2hCOXNG"+
    "Lk87JmNPWj8lP1MqUW5RWGpYT2MrOChUTXA+VS1rW1tRc24wZk5BRTE4NFlXOSo1L1QjV3JpZUFfVlRG"+
    "XW80aG5ATmIlXyROUFhpQEE5IlxSbVknT0NSUEc2JUxFb3BvWyE+YVsqLHVOLGcrKSsyXyxxPywkanU8"+
    "YiwuUEpHVWFgQT8xTUk/Vlk3XTFrJ3RyQUUuZENCXlk1JE1tUF5HYideOiViTSVORVNyX0kqWTg0PDdD"+
    "TVBhPVVQLkNDM1JyNFkkaTpcZCoxcUNiM0wndEZmImlXZV5RIzknVkdfb0FaVzZpXSVkKyQjOzNbTSNs"+
    "ZV9qSzNOQTxEcmNzPWBoPUBGVGEuam1qQixEUTcnM24+KVo9c0I8RSVxYEEzKyQ5XT82T1JPQEk9ZHBB"+
    "VnRxKl08InViQkI9QjFgdExqa1Axc3RrbVMvUV5DalBtYlQ0OThtanBKW0BKWChaVUljYihFZGxvYT1a"+
    "LTRiYGgmcVNTUTh0cHRYYWwmYVxmQ2olXnUkZTg2aksjMFhCdVJbMSQoVGJJUT1TcDtjQUouNzQkTSVE"+
    "XCg8Y1khSz4nOVEpaTs2PDAvcyQiVEw4K1MvbltPSV5rZytTLGBgMWZzZTNnRWIoXkU9TkE/Qic6Vilh"+
    "WUQ9VzIzXXRUW21RUV1aPiZkalRoUDdrLilWT2ZUaE5nIzVadWhDSickN2FtPFhyNiMzK2JCY0Q5Mzc5"+
    "ckxHO2c0cUA7RSNZWzEsTVEnaGZYYzhbKjkxPFlwMSYsJVNTX0I2YGlhcUJiKmEmOm1kWFY0NSprZXFj"+
    "dS8lc1w4XidsWmxPVWZYX2ZLdT00JmNQTTxERj1ORks/TitDUishYG8jbDlZTUVWaj5JXmIoYF5zPDpl"+
    "bCJGQlgnRUtNQ1RfQEVLNVYxNSM0Q0wsOkBNUTpGaTNyZ1xlaShcbk5YMm5eKG4sMidOX0lKXj5GQixw"+
    "XlQiNyIrTEwzX3MwKGEkL0o9bW1FZEZKWUEqPWNUaidGSz5KOkJTJWhkSV5fVkBDcyYrdVc0I0RmNzQ1"+
    "VkFxW1cnOTcrTWdnPyFpZSVHNSpENSM0Rk09Zl0hV3RzaDwjZU01OjhJNUA8aF50TzBLb29PYFZjMzwi"+
    "KSNfPHI3L2FaS1lGYSlKJjItNFdrO1FOKj89MnE+JS9nXWssKEF0PERJUUdbMkBgZitHXD5wMVpLYUBd"+
    "KEZdPmhvU3A1UDw3bmdxMF1vPz5Pbj83NW09TmFxK2FPVWpCQlosUWdgTDBSZzIqWmZFSm9mXilMVCMo"+
    "MyI9LmtFJTdkRUFCSnRaViNrVTVOLm1JayshJXJNIUQmYyk9dTNYbD4mWTFELzJqcFFgWmFKQD5vOClY"+
    "QiZEPE5IcChZODFlcyM9WC8vZz1bZlVYWl82OVVwJ1dGRzhuN2EwQSk5KScpLj80Xlo+b2VgX24+QjlO"+
    "WmNDPV8vQWFuIlZRSkQoNmVsKy0rLGs7UjgldDYrPU4rMl1SYmIsRm00cmdCN20oNClIMyssIVY6R2Ju"+
    "JVRyXjRtVFxMUVhxOz9LUDQvJ0AvZTxaPzcqaiEiMD1jZUdMSGk3cF4qaGZRWHIzOCknbjg0MTUtIVBp"+
    "V21PUGRnWWVoKVU5N1RiTVNwYDh1NyZFOT5HdGJOTTIyZEQ1MGtJYkJuSWhmdV42ZEc1X0Q0aEwjc3VM"+
    "IVpmVUM6VlREZlp0WHRJSW4pKj9BQV1qcE9ATmk9czVFJE05bDFSWyY6TkJsajZiSWZINWROby9AXVlV"+
    "bmlEZEtrVTspZWBvciw8cDhzT1lSJi5yTlgoaEw4cTRyJHAxYDdhWWc/NWAidF1wJU1ZaGtcXk4nRXBX"+
    "LmMvZUtQR0xPVXVWPXMqUyglRl9HaD8iaDFoPzhLYzFPR1M7JDUqQ2k4ZjgnJXQwKjMmPjhkblxhQS4s"+
    "KWwrJWBcUzoqWlI7LXUsc3AqSVJNZ2RYXzhWVDdXWUtJKF1qJjBNZmA8LHJXdFoqPEkiVXIvNE45c0hO"+
    "bWZPYCgsJHJOWi4kIT4vIz9pcSwpI2Y/M3RxbVY7IlNdJTNhTVJtTiM8b2leTVgvSjZLK1AxL05iZCIu"+
    "YkhbLnFTXzVlcGBgUXJDVkYiX15UaTtLQiJoI11HUlUzRjBYaC4pYWQqS2Y1aUFzKCppOydtM1pbXSkh"+
    "OCROcEUlYzIvPWspMD1NY1I1U2smazEwKUphS0ZiMVpISmcpPipkWSY/bFU5Qko1JCVaIWolRWllPz02"+
    "ckVrPkJaZCQzNy9JLS8yK1lsYEpxWCJPaktfKlAyZiJRYUkpYmhoLzVeUHI3TzdAW2dNRHFoJmxnbVY2"+
    "bjBUJyhRUEgsQmJDI10oY2RkWzpUTGhkYElhYzFvXC1pQUJYPkwnP145PFtsWDg2cEhuXCpBS2xbMlQ/"+
    "XFg8P110dFRXPCxKNiMib2dEY2ltQWVcNj5YQnVZV3NaNm8pTCpjKFdNNT1uKFVwWiZtX2U2ZyluM2BM"+
    "WktdZUV0ZUtdNHRRNS9eYVxsVTw4SnMvbFhJYFlycj9kNGtgdX4+ZW5kc3RyZWFtCmVuZG9iagoxMyAw"+
    "IG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxOTYx"+
    "Cj4+CnN0cmVhbQpHYiFTbT5BcjdTJ1JuQjMzLGQnIUw+YlJjYUxyIXJSZ29hXkZEVkkkX2xzQTdVKF1E"+
    "aWpCQyE7cjsuTiI2OytjImcyNzg5TShhX3NPKkwoN08lOUhoP2BhNmVBY1QiXkU7R1JxaiJRbCZvOCFY"+
    "OHBNYDtWcUtCZVw6LztLRzRXdHBSMWgjK2lHVFJELzdeXHMzJi9LNkxCZz0jSjRVLWg2VUM/Vk9TRzVD"+
    "YyFnKG5WZGA4c3AqLC9oaHFYVEhuby04VVshaixKXENDOSFNLFlCSmE2bUouJ0BYQkpEcD5Db2RTNEox"+
    "NWtAJlAqaiQxQ0wkI2EwOlBcNFFqPEA3XEstPTozUGRSczpqWUooXUc3JWg9P2lrKHBRLWQjJmREUjZX"+
    "bj9tYzUhR1M3cGE9XShRXFIkayUvXUlLXChBcjlAVWFhaGhobm83KUFrQkJfTT4tbDY5a1tQRCdkKD0m"+
    "ODQwSyRwTGdqIUZtSWQnPSpYRipeZyFKSShCPiY7OTdYMloxTzBMOj0mODgsPzY2aGlLRSZENmBxQD9X"+
    "MUNJJzhQbzxrbihHKEY0YDBdbV9wcCVHIkBtZ2ItKGlwPHEjZUZAcnRLYG4qLmt0W3FRSSZZRyJBNmc5"+
    "YSZDLmZjcF5ScDdxLT8kZlNZI0twZS9NUm0jZTNjY1RxPlNgQSg8QTtdbCdwZElTJ2MzQlloNW9lYVQo"+
    "QV9nc1prPl1UNTA5M1wnamBJXzlZaiJDVTBpNU48ZDpabF1qQW9kRyMkRWNRZDAmRStKSUs8IkVvLylF"+
    "TURdQFlEV0RHOUZCXCtwbUZAZCxtPXQ9X01LZS5dV1lwbVI5S3FwK0giKDtzNChtUlthNW9KTXNyNkRR"+
    "bkItcihYVXRpJkZpZS9iPjU1LUEuJC5UKVorN0l0VHM3QUQkbisiRkVJX0htJW9mKD1ZJ2tsTU1jbklk"+
    "bFBMLjNASygpYVM7JygxaSQtWSh1cCFTSjIlKmUrKVs2OXVwKDlAKiYvLyE+dEpccCk8cHE1YzBwP24+"+
    "O0VjYlxGYjhNRkNOI1gmNEBKYjhuLmA+dHJbIUg9YkBLL1c1KThNTy1kNG4+X05hWW9TVGFSJic2Kiw7"+
    "WjhpJXQ7Q2Z1OG9NXXNUQmAvXVU4MU43aTVBJ1wpTTBxcTtJS2g4MGlrKz0/LV9RbmBaQS4iJEVTXSFC"+
    "UmE1dV0vaWI9XC5wcDEsRjEtST5aJDAhLFchTVM1MkxSSGokIS9RRXRpL05RZmJmaUM9aUloRiMtYVwk"+
    "cWNCLFEuL3UqOj5nRWE1KyNOZjZVYmosTTosb1lWZmpYalNCQ1ZlPWBhRjFlNF9mNWgqZFVdVj5cJXQl"+
    "QlRePltyMzNFU1xgQTooYyM7IjNELllmTzBDdDAyKk5eLmxDVTZpUjYjSW4vU0pBWWRgVSElXSxwRT5F"+
    "b0gnamojK3A5ZkhMZylULW8qKyhMXGs6QzFhX2lZc1IpTFZ1RSFWVGRnLUNta0UrKGdySGQ8bEcxTWRe"+
    "ZDMtNztqJWkxKWUoPyZqNTBfQy1kNFtDZG8pNTJYJmtkcF9HJGBvIUJLRCtiJz1GT1JXSkw4Z1IvM2Eu"+
    "RGVdcVI0VC5dL25HZGRxYHBYbTQ1WHRDMGdhIiVzN1AkJid0KXQiSXMvMllXYSUpXTEnSTxYVXBDWFc1"+
    "dXA6PzV1TDNgOFpEPVREQydyUlJCMGQ/OSc1QDYuWmc8S3IoPHVaSUJUY1wrOWNeKj5eTmIxcEFYMHEv"+
    "TmRLLGM9RXFmPmU5aER1bTM7JmQuYzk+bDJsX0pMSW1LKXNJKjNFXlshSCI6aCpnPD9aLUpHT1IiL18r"+
    "MDBhVitKUjEvLkFWaUs9XlRlMCIoPVZLVlAnZ0R0MjInS0cmbWAsWnVhJGI4XFlgdV9wWG1lcz1tY0Yx"+
    "ZipOZFoiPGoqcGE1JFJWQGhBdTxLKnNPR28hX1NhJGM5alVGNDkoLWJEaS8iUz1VUyM8RUxiXDQrXFgn"+
    "JUJELW5cR09qPkpyO09nLTltIWlpbSxCS0g4QypNQkhiPFcwQmwxc1MyN0UkKldbTDMsUm9YOCI1Xml1"+
    "PyhpLUp1ZTY1QXMkPEw5PGEpUFwrWm5fIyhEKihnW0w0Vz5UVUhuXDMuQiY8M0pVLCNDLlw/ck9oQ0ZG"+
    "VVxKPjRnYF5fVTApNFdcN05kN2ZuIzQ3dGhqQyxaLDgkJ2dRKFVxWDAwY1tzTVpQIjNdXTAkZ1I8XydA"+
    "XV9pKlMmJGQvbSJIXkNYRUlManRWRjFHWnQ8bmxbRydcYk9mOjpxcHMsVlshIkFzWnFCaShMUl5SLWFe"+
    "NSZebTMxOyROYGtXYnEtPj42PC1GckU5OWssPFs+SVAzPEJbU3RwbyZyKlInX3MsXjwkP1o1RzNhXic7"+
    "cDpzO1hZPTkiSzFOJy43S1lPZWMxRENRR29SJyo0J2EkITg6J2lNNlIqR209Vj1RKDtrTjwpdTROT1dg"+
    "M1NGNEZKRiFKQ1FddTV0L0o3NlVkIVIwc1xdNTxBVz4pNz01OERZMWc1NF41bU48UkQiYDFCVCtdayw/"+
    "OzldZy1XODQ7KF1eVU4kQDIzMSswQXEjSFcuWGFTM0FdbnRAYU0qZypFOmI2ajI6IlZ+PmVuZHN0cmVh"+
    "bQplbmRvYmoKeHJlZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAow"+
    "MDAwMDAwMTMyIDAwMDAwIG4gCjAwMDAwMDAyMzkgMDAwMDAgbiAKMDAwMDAwMDM0OCAwMDAwMCBuIAow"+
    "MDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA1NDMgMDAwMDAgbiAKMDAwMDAwMDY1OCAwMDAwMCBuIAow"+
    "MDAwMDAwODYzIDAwMDAwIG4gCjAwMDAwMDEwNjggMDAwMDAgbiAKMDAwMDAwMTEzNyAwMDAwMCBuIAow"+
    "MDAwMDAxNDUzIDAwMDAwIG4gCjAwMDAwMDE1MTkgMDAwMDAgbiAKMDAwMDAwNDMxNiAwMDAwMCBuIAp0"+
    "cmFpbGVyCjw8Ci9JRCAKWzw2YjExYTVmZjEwNmZmNTAwMmUwYTQzODBkMzYzMDY2Mj48NmIxMWE1ZmYx"+
    "MDZmZjUwMDJlMGE0MzgwZDM2MzA2NjI+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50"+
    "IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDEwIDAgUgovUm9vdCA5IDAgUgovU2l6ZSAxNAo+"+
    "PgpzdGFydHhyZWYKNjM2OQolJUVPRgo="
  },
  5003: {
    filename: "fire_drill_5003_2023-06-16_Titirangi.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBUaXRpcmFuZ2kgXDIwNCAxNi8wNi8yMDIzKSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDIKPj4Kc3RyZWFtCkdiIVNuPkJlZ1smcTlTWVIoKWJOZkpJSUth"+
    "aERUUTZxTm5DKlM0MFNlKmJsbz4oZ2FpLCxwYVQzbzQ1WSI3VCdKUUswTi5YJSdOOCFeazA4MVomVXFV"+
    "LVMzOGMvM2RMRSdBb1xbaEw2Q2ZjPG10JCgtLW9sMFJYLiw/ZHRQQiViW3QqXVQ8ZFhzPEVqUzBfYypd"+
    "ZyZNNCtEKFlfcDM9RGVJQHNeI3FBa1NcaWxxYCtyR3FQNkopYVlYPkZiQCYrISlHMUJiQmJmLlxWQDJQ"+
    "bT1oPWshPEYpOz9fOUpOZGVvKCRvOENLWjhGUkxGYkNTSzdvUz9ET00pOV8+K0E1dCIsQyJeYSNFSDdz"+
    "LiE9aUF0TF41OiNQJG5pcFNTdSFqYnUpaT4rZDFOLTxXaV0rITwyL18/OTNaLCowaUBDRWxfZ29gTEg6"+
    "ZFdkUWtIa00tRGFlVDhqN2MkI0ZVIWgxY2dWZi9WVTE4SG5GVTpjMDEnJCIvP1RMUj8ySnIlKkBcKlJF"+
    "LSxSMV9MX2snYGskKEFZLEIvUVs+VTxHLStiL0pgXl5sbUBmKiNlOVghPkowNDRgN2AuYXBRXDptPCYq"+
    "QiQ3dSxDSV1OKkZEUVtpN0k1U2o1ZmMqTEpkU1VTPU1GVVo+R1lTPThHJCpTa0IzKCYrNVZNXnVAOUQ3"+
    "JVhvO0kqcTtpVm88LGJKKzRDTDtVMDYxKDguWmw6TD0mWFI5YjNPS143bVFWc0BKM2FfQCpHJ15ZUU9p"+
    "SWtFRExbQSduMGcqZC1LLldAJG9yZVc6MGVjZ0AoZVk5ZXJJZy5PTCwhTypiY09BTm5APlNMW0MqMDhg"+
    "JC5UcS90Mk8+NmstZ103ZitwI2tyZyM5PGNKLThLN1xAXS9KZm08IU1bSWU4VFZyZDFdQjojWygocVxP"+
    "dTJiJDBUImJkMzZZMVZwJ0ZeWkxDNWUqNCcpQ09rOjhAZ3I+ZSlbYSs5K0lIRVo/KFA4NCwsVFJlQUJB"+
    "V2lJSHFsPGJwLVgtSC5KcV1vN1EhZGNJImRlS2RJVD9ASzdvLyguJzpeRlc2KSRUSic9Xm50S3V0MXIj"+
    "c1JPTztZXjAjMj8tQkxAV1Zva3AiWEBzUVBeaCI3MnFka0UiM0FPUTZHJkVNJkwrSEhCQC9gI0FnLEUh"+
    "aFZOVUxDM2g0M2xnMDNEN1NIMD8hY1ddb3VLSVtRLTRMWFUpO2gjbm82JClVVWpDQC9GTCJiW1hALTM5"+
    "aDxZVVJxYC9PN0Y7NWksTzBYay9xUGRrTEhvR0IxZ0lKNXA5WzFKKmBIJyZRRC5sKzpEMV06Q0gjPVNm"+
    "OU5gaVJZVlQ3bCxZbE1BNjAvTilDPmxiRElhV00kVk5Db2A2SCcpV3QpIiFKInM+TnFEZTBuImQ6JyI8"+
    "TC9YNSFlTURzRDY8YS0mMkNjWEQ5XClSOGFcNWMxa0kqYkg/ZFRMIkFXQUBrJGRQcXBZaSVeYl0+SzRF"+
    "Tl86Plw9dT5rV3BOX0doV09cOiwhYS03Myl0L1BgPVEoRnI0MSEpUFJxbXJrc28sdSsxW2tkVyMybiYr"+
    "SmM3ST5VLEVdRzowZjYyMF1bKGAuNjJWbkZ0K2csc0JLa3FIKFVVOVk2QE5EYW9fMThuJkBFVzVgJCRo"+
    "LW5hWVs0J1VtKTlrXjhnTkUsc0pzaURdZCUjXmpaaCYpQEFlKTlxbk9iS15TXSYnJ2NYRWckJStBT1VF"+
    "X0xbWyIodUsxYyNAOkxVMkJBXmlRUUlMRS8kOzVfXGpqIUo/dUJecmcqNGJtSFBqTyd1WzA6PGkpOmpO"+
    "U0Y/R1tlRzZAXzlYVGplN3RdOmMhXFA2cTdAPDFZb3R0JCtoOCR1KWcvOCskbVZZZEc6alpocVtkOlFD"+
    "K2IiaktYKUlMVDwxUWg9SmM7ITY8SzdYRFV1dFZpSTE5TC4jYnBlRlhGXT03J25kcmFJNEpWMSJdJVE+"+
    "LS1SPD0wR2NUbGlzbTgvMW0rKV08L2xXVkFmYG9FZEFGOW1HYFdALittNklRVGlWVzMzW2kwJURnVzVk"+
    "LkgqK0NvP3QlQDMnJTlLVVtObjMpODVaY05DOl8iMEhlW2QtYDNdaHRYYTZqOjdWZ2UvIVIscCZWKmtT"+
    "ZTY3ZiNpanJRTVBVQ0VLWTkkTUI0ODBMWjVgczpcOmo8RD1fPE1hQF1qZXJvRTVpSXFkSHBsN1FLaWQp"+
    "XTI2MXJiajo7QkJtcDpqIUZDbGxmX2RVZk9mb2xPLVovKTxrMC1wRy4hUCM3NGdlYDQzMm1DYjEmUDFL"+
    "LUBxOmNaYytJbiYxT2Y6LT4wO2AuaVhlVWZUcU1AKG05VSc9a0toXzwmOlgxTktbUyRiXydoay49M05A"+
    "MCUxRDMvOyUwY11eby06RFBQKW5Vc3NdUmtcQWxPNFBgZTYpZkxeZFRlclApSSNsIyYpIlBNYkpjSShg"+
    "Ry8sVGVzYmQjS29lVjJPZ1RjV1EqZ3FMSGw9Z01lU11xTGZwL2h1V2cuSSpeIXJjVU1RNTUoOT9ZIShX"+
    "SVoyNHFFXSZoU2QiKmhVIiQrR1xrRiNmM10kKm04OGIrTEVyUUAnW09Xa1hdS0RbaiVGZ2hNKEM2cmkk"+
    "W2khN0U5aDJoQVpSP2BCZTtfc0BLPyFta0JgT0ldcDtaTHIsOUZQcjpnVDhwcmIscjw8Z1FtXi5LUWFT"+
    "K24mcUxHND9DJUsvX3JFO0BPMThaPD9Ma200ZmJbU1xrWVojLkRiSCNYJ2IuUV0pW0FDSTZVamlubkZd"+
    "RlssKDVwTmpCJ0RxUz1YR1wsZGRIZSNFRzVjRDUyZXVzM0ZRMWI2M3BrJV89KW0jWzJZbVklbS81REw+"+
    "OW9wIitzQywyXDZAcGw8IXRrJSQ1Uic7Z0A6aDZWWSQ0VlRxQm4xISJCckNARi1fX1U6Qk44bVhaPSU5"+
    "ZUZsSVs+PG9AN2xuKD9kTGolJS4rQjspXGYzamlcQmw/InBeOTxHYzZBTjwsXzguTHEkV0pNKUYkJ00v"+
    "SCVRU0Aob0hkXHAvZjNdRUYkTzhAJjpcPE9jLk89I1xGdF0hcGRKTz1mRDxkbjI/NWEqLyQ+Xy4wImJr"+
    "U1JwYldkJzZdY10rN2A9WGRANSQ0dUxvYnUhV1coLiVzOUxbITY6QGEoYzlxNjE7aiRBRXNhW0lEN0Ym"+
    "UGcpLGREcEhjX0FBJWE9Uyg+c3I+YyFZMSVkRUppUiotKUA7Wko2JmZpLnBLWVhGcjRrK1pBX2ZXWnIh"+
    "M1gzdG4waThTPFJmYTpNY1I7VVU4QllDTyoqS3VlU04hcWV0Wy0xTkBlayRNRStHJCIoSWIqKVFVQUU/"+
    "NS5sQFJWSmNGT2AjXz8vV3NrSStDVC9FPlsiKiZWQytDRUIxdE5aJ0BmJCksLCljMFZMJ1NXVzRxTDBm"+
    "ajwoOTBMWEdjTE00JzRhSmMlYT4oXU8mbD9UTS9mQENCdFNIWDM2RW0jQS1IWSdcVT82Sz1iYjJbPlhN"+
    "TUJObF9BRGdOXTAsY1BwYjYlNWQyaXJmWE0zaSQ2bi0uSSElJyotYHFzMzVsO3RiJj8qWyNUKzhtYUdl"+
    "TT9XOCdtcDYuPGQ2NilLWHU6VW11bUZWUXVNW15eOVFEWH4+ZW5kc3RyZWFtCmVuZG9iagoxMyAwIG9i"+
    "ago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxOTY1Cj4+"+
    "CnN0cmVhbQpHYiFUWGgvRCUrJkFbMnA9NTcjZFUxKmc/OSZzPDUxZWtGbjdDb3FJTDEvX2VAYVUjRj1g"+
    "USpuP04wZ0JvZyk2Wl1cNzYxYCg6cTEtO1Y7N2g9OE4hYElRciRYNTpscUpDYyMqSUVSLlwoZW9PK2Au"+
    "UUhhXC82NjczRlt1RC1dKnFWJi5ldTUwXldZZyVfRSVCPiM+ZTkkYjVnY1RGZl1yS0RFYmhNVXVpQ3Ij"+
    "ZkFKOEVwZk9qJklKMEJsNz5MbnFePyxVTmdQVVhcQFlnIyUzMzM4Z3BaLFhkW3FfayI9ZHVLLDc6Jis5"+
    "QiVsTFk2Wy1JaDFdR11RalxALzFva2cxc28pUVxxQUMnWDVQPCZHLXU5NSFYMFZXaGMobio8RT4kI1Mo"+
    "NUlbNCRcPlBVQmxuK28lYD0lZT4qN1lBTU1LLS0+dW5Wb0hddE4rJy9ra0llUCtpLz9AVGU1JV0/VlNQ"+
    "TXQqbFpMI1k7LCQ1Zl4jIzBTI0QxJ0QxbjhGQ1pWSjlOOFUudTQldURsTitgT1RJJEI3cWkvUUdTNjwn"+
    "UlZgXEpBLWc+QC9vWERdO2Z1I1wxVGgpZlBjLG5TWipXL14+Q0Y4LzojUDJGbkQlUXUzQUViKk1ibkhJ"+
    "aEtSImxZRjtPNysyN1EvQUohZWBnNWc2KFAwJEs3R0lAKSNEPytGQm5KSTxeL09HXk1aWEk2dGpFSUM8"+
    "WjE7JmNJX0ksQCM5VkIxb1FyPWk1ajZQaUZ0Oy9xRmdXMDBgYVhnJWprJl9cSEYpKGdXXz9JIXUqOSRG"+
    "OnV0UnBTKTVAOy9RYjFNR0FvMG0jdS0tPF86MDNJcyM2ImQoN04zLlgnODkqOFRANXJeTFYvOzU6XDJ1"+
    "JyEnbENGQy0hVElScEtvLVBAMGAnUmtgJFNGY1lWLEM2am89UkhDZ1orZUdQSEIrb18xVCYoOU82XCYi"+
    "bUAoRlxQNVlSMDwlWl1oZmZiWTozLiI6PVtwSjArPytrUWRwSUFEKE85JWlEQ2xxMEVtMCotMUgzKzEk"+
    "bUZoOTYsLF40aiJcKDNDWEw4SStcRihSaGJLcy5CVDJwWEtfXHNcLi5CQXB1aS1NXS8sREc0YCJQSSxL"+
    "MC8uXUouZ2lARVNdcmJrIWVJTzwiajdDMSklTkBFaF50Jl5tTStnYSYnc28vLk1TQDhaJjJTajcxdSc+"+
    "JmtbXEA+ZlM0PVNhOjU/bVc9bC8oS20rOmprTSNoPk0vYmdcZlYrPEl0RDJcUFlLOWFjTmgjbj5BcC4t"+
    "cGYlT2dxIzhLNFdsLjMzcSQ5bzsuQ1llSUMsbkw1V1JPIlVoYUNJTU8pYkNqcUhEI2deQWBPYnBNVFND"+
    "YitALjVIcCE2QEpBdDtVcD9bPWo+Ki9qY0YtSktYVzEmKmhoZS9uKnBEcGxqUGlecCleWE5mNmVbW2op"+
    "UHA0Nz8zJjpVKDReS18nR0tQXjk1WD1NO24wSV9TalpyRUplJG1OYlxhV2AuVzI5K2tnX287NChnXGZd"+
    "KDkuSGxYZCNqJzBJSCgsNUNYMU9GXi1vR08/UypVKDY5S0dSYUtqYio5cTdQJGQtPWIucEpRN1A2I0wy"+
    "KD88bVVzYDQrbDRnMUAiSUYvWG0yJlxDVjQqdGBpMkQiNGBJbU9ZXDlPTSUpXUc1STxZMW4yOUdrNUhn"+
    "TypWX2BXMT4xQVI8Lk1HbTlcKHNyKmhzNl9TVGc1WkU9VC9RPFM2ZjB1VFQuWjJ0Pyg1LSJCazlgMlFo"+
    "SG00V2NVYUtkdV9MYFB1R0ZdbWQqUVNENjRSK1JQVEpTT0RBV2M9P3UwclxnLTppUy5NZkhRXyUlLmVk"+
    "O2A9a0V1YGhjX2UuUSg7ZFczV0ZyLW1eOSUpcXBvNGg3J2xtWV5LS0xUTWs2NE1cYkkvLWdXTEw2bE5p"+
    "WyReYi0lako8KmhebG8vdGtubGt0NmhgJiVjSzxBJD9EaldXRXUldCpyRi1qSCVyR1dMYldmVG0iVSFv"+
    "biozRFs4RiNoUlxtLUllJShhaC8qSjFcNFIuV1JFQl5TbWpxJFEwPmJpLF1uXEhXSlpHbFRQXUg+I0E3"+
    "O1JKWmFcWkJbXVJXViwhQVZjVCRZTCRhMkRoYzRXIlQmRT9QTTZEa0RbWSNTLClWamVxWnBjdDoiVFw9"+
    "JStFVFBoRXFQKjNZPENZQ043KCEqJllaSTdNXWZXMUNpSDB1bGNcTCona28uMkp0WydeaVBTdSNIWldf"+
    "LEM3RHBrajxkQy1NZVAlNHFLQjpCXEcoMVBnYXIxNz9PVlYtZi1rRXVKOEc3cztQMFs4UGVnYyVycVIu"+
    "VC5VT19bX2ZUUmJCcGxhSE1yPm1KXU0jJF1PTU9gJEZSbmI9MGtTaURNa2xzRyptcyxgTU1XKSEvUHBx"+
    "RCVdT08kVUY/aT8wX05JOz9MPz4haEg/Vz44MDBOZVkjYSQlNXNlbCQuR109K2lXWXApPT5OaDAnR1Au"+
    "MVs0LS9Gb1pqQDcnQV1nVHBhQSFsZ0pON2dAKltnYiZyJGFGU21hcj50W0JKb24qRTwxKS9aKjcsQkRr"+
    "NDIzUFBILT8nJSVLaG1xa1glYzZCbUhyIWAmOmo4bSo/UTZoI2ZIbU9YLWtXYm10Y3RXfj5lbmRzdHJl"+
    "YW0KZW5kb2JqCnhyZWYKMCAxNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAK"+
    "MDAwMDAwMDEzMiAwMDAwMCBuIAowMDAwMDAwMjM5IDAwMDAwIG4gCjAwMDAwMDAzNDggMDAwMDAgbiAK"+
    "MDAwMDAwMDQ2MCAwMDAwMCBuIAowMDAwMDAwNTQzIDAwMDAwIG4gCjAwMDAwMDA2NTggMDAwMDAgbiAK"+
    "MDAwMDAwMDg2MyAwMDAwMCBuIAowMDAwMDAxMDY4IDAwMDAwIG4gCjAwMDAwMDExMzcgMDAwMDAgbiAK"+
    "MDAwMDAwMTQ1MyAwMDAwMCBuIAowMDAwMDAxNTE5IDAwMDAwIG4gCjAwMDAwMDQzMTMgMDAwMDAgbiAK"+
    "dHJhaWxlcgo8PAovSUQgCls8NWZlZGM4ODc3YzYxZjY3MjIxNGIzZTc0ZTBlYzIwY2Q+PDVmZWRjODg3"+
    "N2M2MWY2NzIyMTRiM2U3NGUwZWMyMGNkPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVu"+
    "dCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMCAwIFIKL1Jvb3QgOSAwIFIKL1NpemUgMTQK"+
    "Pj4Kc3RhcnR4cmVmCjYzNzAKJSVFT0YK"
  },
  5005: {
    filename: "fire_drill_5005_2024-06-14_Pakuranga.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBQYWt1cmFuZ2EgXDIwNCAxNC8wNi8yMDI0KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MjAKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJ0BiJyF1aV9J"+
    "OygrIUcydFdnK3VAYkBITVJVUi51Py5iMEU+NENyVWxSYSYydDQ1OFZLPjtAbk0/WDQ0cSsxYlZ1ajE7"+
    "QlliLnA/czcuXC88LVo+Ny1WMnBgP0FRIkg1UlxCUktDKiQhZ0M4ayIrYmYrJ181VGNQPzNsYzRXNC41"+
    "K0lpRiZBJXFzR2VARmszRF84R28rJmc1bkUpbjVJUW1UJUlySHJEPkZfZktoRUJUL2ROUkNZPDVKREc9"+
    "NzR1YmdCV0gyOE4jOzwzcicqNllmbyhHN2lIOV5CYU4wQU5pJ1RmK2FZWExGWjxHciFmKGF1S0E1ak01"+
    "N0RJYmosWzoxTDJfRWJxMCpbKkxASGVjRS5dO0s8XWZEZkQyJyJpTm9xa1I4b1EyJlI1QHVzZ1UvMSs5"+
    "J0NRcVMuWGBYWF1TZT9uQGIpclA8Z2VQMU9NNkMuMUc1Qkh1a15ETV9KNStNWDA6b2dWLyxGN25QOUJt"+
    "JSpAR1lpKjxNW0kyZW1Sby1YYEFbLkQ9PDFDZUZHUmptW0N1PUhzZEVUO05lYSRTUlw1NzhRWUFhZCNA"+
    "YWQzXl9vSFpCaStkP0FeUSskakwwJjpzTi9DRXVtJCwmQFBXZjgjam4iYDMqWUduRlw0YVtETEotY2ZG"+
    "Wi0mYjdEJUhrJlc5ZmxgRmcvWjNRKFo0TG9VR2lxImoxNHEiIUdbZ2wvQyNoTWIqIWNKIXElXzEoLE06"+
    "M1woLjhAUU50bVdtKW5DYWhNX3JKRnRwIi1YKTA9Q0x1by1SPSFUYGpGYl1ZOFdoRlZtYFUpKUk6W0Y2"+
    "XHQ6cjIiL20jMjlgTDJtSkFsPyVsIWRTaXQxY08lP2knK2NaSDxXNyMtJk5rKV5zNnI5WTNHaVxKNURk"+
    "TzwyNzhJUmkoZSwwcEpRQ3QhXDNXajApSmM5UkE9a05RPW1kWWlOJVgiU3IjOT9VKzpBaGtZIypLXF84"+
    "UzIlMT9hVl5SMSNgXU4oNyMvK0psMCZtPmozWDI8PGs8IjRiYDNfRTA1TU9MJlNrX2lFIjk6M2gsQFtJ"+
    "KixCaW5iTS1RbyM0RjdGOiU2NlxRUk46MSNCSSEmdE1eOCVQRkg4LS9AWD4jJjUkJU9SI2RcLFZfJCk6"+
    "UnRLUSJvUmVZQHJPYXEqcXVKTmI/VkBrPWlkamlIK3VUWSRbZ1AsbWM6VFJHPW43Pz5uPWk9RGRDKmYu"+
    "OV43XF9nbSJcUlw2XjtcbF9YPWlBPyI2OmhQdTYzY0ZIUT1jOVhPVlRPOmY3KkY7dSwtSF5QWS0vJjU5"+
    "NT8lNyZMQG9DT2BSREBeKSRETjlOWExHYUtkOTNRRTVecWdPQy9EJzI1OCU8YkozIis6XVMpX189YyxR"+
    "TSdcSkpmS3AkLi91Q3RvUFNxUVpiXFdDSyxLRDVcOmoxZ0FOITlAJSdHNDlNX3A1M0ptS1VmbXBiX0ZJ"+
    "ViJDYzdEI1gjZms5RGtULWZWVCElIyo/V3BiKGYrZnAlZEYsc2BYK20qZ04qZUJUKWU6LVBSVT0yOkpC"+
    "I3RaS0UwYHAhcT9dWDRRVyhDWm9aNXI7NEtUbTMvQ2plNjdPW0x0aSclJ2c1JmxnKmAuN00yaV08c3BW"+
    "cFxBOWcvQWBrQk80WU1OVWNdcldUYjw4UycxRzktY0tYMzhZKllvVyF0Zl5rXmAnWylabE1QKkNdbEBZ"+
    "ZTxmazRJRzFgZjRmc2cwW3IrW145ISd0LUxsN21QPlg3KXJCLkdZWTVyS2JaVCM3MkVYNj5vPk1zR1Ep"+
    "VDVvRy1GJjtNJmApXG40M2hoayNiNjVgS0duYFwnUUlcR1djOnJCbXRHUFkkZUJjI21cWz1tTVVrbVEm"+
    "NElJWklESzE+YktuKXNyWGRlQ0NkZjAsUl1hKjpuWyNWVSFRUzZOPCFeTmVtRUorP2dNTiNwTjJILGhc"+
    "XUpvOlItKk5oYjtrY14vMl80QilpSV8haTBjSCgyI0cqSkwwayUsblNUYExZMzxJVUhTc1VlaG0zJExn"+
    "QylvJVJET2onVVAmJGVoW21NTU4tRi9gXz1zbGhTU1VXOlBBaVUqJGVLN0xxS185PzokPD9HSyduOEVv"+
    "cFspVU9QRTNPOEQ9MD5hV1piKE1LPk47KS5CNl1Ucz1BOF42IitKRyEoYi08TC4uUSNgbklCLkVgXllZ"+
    "R1hXXVlbTW5yQihQNVVCKjJxazRTWVhcRigvTTBaYk0kP0JwSVA9bzxwYSlAQzNzSFpILjA8W10+cVor"+
    "RE00bmgqRE9HPS9JPzoqLVVTU0hiTC9xSG1hKl1HTi9GRy1hcih0VSY1Nyw0N2YhU1Ipa08sOCFpXHE+"+
    "RmMhXlkqXUNKPFBCRGEpJkAxUk5jUmAscSc6Zj1vO3BCNWxxX2wmWW8rYnJwTl5tXiZYOWxqL0c3T0BY"+
    "TD5OV3JmRjdPU1JSUCE/RUAxL0NRM1YiPXBRRVIoS2h1LTstP0pwanRpWj1XVi1dTjghXzBnYiFzJ10s"+
    "WkJJci0tQV5KMCtJTl1WYEtETGxOYWM0IzhXK1dLTW9RIWtVTlJuQyFDSjpVVVlyTlc1QlIxOTJDaVBH"+
    "XWMyZClRNUJ1LjFmPE8oJjdkS2lSVGxoYj8ubU9kUm8+aDZqTWtYU0VqYWxYPlJwJ2pGOHJwK2MpST1O"+
    "Ql0pRVdRbFdTOUdUKDFHUzw7LHJdJi5GOlQpJTE7N1FQcVJBPGRoa2RDV0xHTT1PN1c3WCI7S3RQJ1JW"+
    "OVZoOzxPMiNsPTdZTDc2IWFoZmxFSFJZRGkiQWlaLk1EU1UkLVckMFlAQG89L1FlPTNbWEJiKy1aQ3Rm"+
    "OERoMTksbUpUJjlkVERpdU9DPW4jLWRMTydKZ2Q8LC4qUz8zUTZAOV5SKCQ9ZihiV1hDN1xZOWBQODlG"+
    "XmBXUDBWWik/cTsuNVFHWEYoNGZRMmwuTElYRDY1TEwuT15GMycpK2wuIXM9XjdtOyFKNEk5N2Qjb1or"+
    "LVkla2NAVkhaRitZUD06WmFzNUIvI2I8K0l0K0MmTUc8JSVhclFEODJXI2NnZklkLFpnUVo3L14iWG5r"+
    "U3BAY15aUVBxa01TJ2kuV2gxbWZxTl5XKSwuLHRlUUY/T09VX3Vnb0JmQjw5OEIwaU1yU3BENTs/YzdU"+
    "Uj5OIW1ZL05tUXMrYEZFIVdCIVRda0VfNmZFcWtsKWFcdVtKOiIvaWdCXitjL0MqUlkkYyxQajpYJGZy"+
    "ZS8ndVxpaiQobmkuWlojXzs2TiVHVj1ySWhmQTduIk5nIU9mMy9WPCtFJWo9dWo0TzstVGY1ZC5LIVRM"+
    "bHNibmdCMW9LWjViQyo6Z09pYyVAVj05LFoubSE3aChXJVckI08qJEZ1KmxlXWpRRCoxc003KGRoOVlY"+
    "OllkMTlmTE5HMGdzUjozZycmbWBlPl1nRGQjUUIqQ2BMZWVeTmYiSDtXUjwxcWUnTSY9UC9TaGNGR0tu"+
    "Q2g1bCRRaDI8QCVsQjUjLGMsT2Rqb2YjOllGbEU/TFViTiJXbSVjK2lPNG0lV2RsLzU3Xy5SWj0vK3Rw"+
    "Nz9PNS9DNV0kViM7SVhFYGdRJytQNVI6aTtFYCciY1E5XTknJ3BcWzRXZXJyIWpQYW1tQH4+ZW5kc3Ry"+
    "ZWFtCmVuZG9iagoxMyAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2Rl"+
    "IF0gL0xlbmd0aCAxOTk5Cj4+CnN0cmVhbQpHYiFUWD5BcjdTJ1MsKjQvJ2NuVFUxJjlZLSlyVWNnODc1"+
    "aCwkZUNUYEEkWEVPbSVJWC9AaChSL0g6MFNdJFFUbFlJOW8lRT4kPFBhV3BAXUdXbTEqJG4yK1xxRTpE"+
    "Tl1VbHEnM3NMWV1BLiRPKipfYkcucTtnYm8mU2lbVThWSF9oSjA1KygkaUxYP19mIT4pVzJLclMiXkg/"+
    "c1RGX1ZzIylldEclJ1NdXXBkKVtzT09QTidhL19zP2RtQ3RFYD1dNW04K0I9WD4tI0hqJ1lrMk1QWWI4"+
    "N0Fua29zZ0ZKXHUjOztWKzVRXGZLKittNU9yWmJVMm5GZTBIR3VnQjhkYEpbSHEkTjwlRyh1KFFnUmow"+
    "NSZMZC4pcSFNK1VTJycjY2guR2owSks1bEttUltLI0IxOE1QQF0kSUVudUBaP1I0YyhNOkJsdFdPY00i"+
    "IjNQVHAoZXNcSTY3aiMoUUxZY1o3SDA5PWQnaUBZWUhbRUc9Vj9fXnBBaS1tJ29pXEoqVEZtZGFxLiFs"+
    "LC5nNFFVVzxjQURDU1ZrKTcvWzRnVDUtXz1aTGJLMHMpcnMpTiVqQ0BdXzF1ajRtcmxtZiZIJiRKQ08r"+
    "O0E7KC9bTi5tZmg9OD5hZDYtbSwrXiomcWNzNyUqVFYiMi5aR11lPmBHPlBKWT5wOCx1JlZiYVRNMmtg"+
    "YkAuZVNOcnEyVVc1WFsiWz0wM0M0O2UiQ2FWTSYvWXFydU5VLXUyc15YKWUsLEBnYC8pbWMpXFVTQHQ9"+
    "cUkoNGQvJiFNbzFrRls1KVBKS0FAQGY+JU40PWgzUyJxJ2A5LUFGLWVfRi8xOS91RmBsMC1TX1NBNVkq"+
    "TTsvKGlsIkpXQ19HbTdpJVZzdXBqbSUqRCUhREwlLDZjQkAxKGsoZ0ZATV91T1lXaE8xb2ArUEZbYnAs"+
    "MzlEbls1b1tpIVFRRTZhMU8uXXBXRl91alMxQzwnP0ljNVxMXixCRFNFTjZKaEhzcFxwXlNwUFFbJzxg"+
    "MGElKTlNX1tJNj5RR1ZmSmEwOFhrL0JROmpicFs/aWpxcCoobm1WRT5icHFlXDtQQURLPGFrcW1FPnVd"+
    "YW5eLzQkR0BxYW1IZyY/LTdZaGNpN0IncFJfajFIbzwidTJYT1c9c1hWVyVNNGEtcm51JztTOC1LaGVO"+
    "bnFPXTE9VTlfVW5SNms+ZUBwRDxBPmklKDxTbFQiPVQuUDwvX0xaXSZPRz5AcSNScnFCUXFSO1ZKOV1d"+
    "VmhGUFJ0QWVrSCUnLG1nQTp0R0coLEI1cVI3YSZCUC1GKSYmck4uakhxTSZjV19nPj49SmQjP2Q1RHRY"+
    "I0h1WHI/I2daQ11NLChLZlMyXGdnLjVIcD1LX2pcci82KXFAQjRbQGdhcnQhXktYVzEmKmhoZS9uKnBE"+
    "cGxqUGlecCleZihmNmVcIlw9LG9qPVdlbGxXJ2JHSzBbMURhWU5zPyxNOTBXZDlfO2UrMUAuPko+XGYt"+
    "bypBKSldQldrUGE7Mi9Ya0xJNS83b3JxUTpbdHBNKkAtQStRSFwqc0QpNTJYJmtlQCJLJzxLK0I2MlBq"+
    "TlFDakxEJi8mXE1RQ2UuRVs1LzZjZHEvRyNoQ1thRiptNktIZVlObC9HaV4sKVI3M2NzaSw0WmNkNVhX"+
    "NTdUb11eaDgvXGBWdUtpYkZVdEppWShLNG9QRTIrb29oUlUwQFYiMWNyOzI/UCVkZWVOcUlzRm0xJXA2"+
    "dHFRbzopSUZpKFAyNjU5a3AhUSxePydYaiJEJlNSXmg7bSgoU3AwbFNdPSlTbTAldSdcNFgmRy4kKmYi"+
    "PTxITSRYWzVmRGFDYkdtYVkscj9NXEMhKU1hRlIpbD45ZWcwMWkoRitrZT0ubjYyN0k6XEo5LWw8ZU5S"+
    "XmcmbHVoWE5TJGU9VytYWW82W2RHWFk3O1BZVy1vVlxFOChMNDcqbk0lOlVJZS1yay8xKm0scWVxK2os"+
    "ITtcVD5YPiFBSydNNlhIVVBYOm5kbGxCTydrY0hONnJNKTxgZCt0OnRNbFQwMUhEXlRPbl1uR0E2O3Ng"+
    "YyItdEszUk0lU1E7XmZlJTNlXVM/ZiMyL0FAODA7TkhzK2FbQXU4bzlhLDFHMS48Sjc0TGQ2blZwJ2U3"+
    "NENZT18zLygzR1wpQDEzKCY3Ii4hOmUkKVcuNC86QnJVLkpOOCYvTWUvM2ZFR0suXU5VYCpHU0EhUj9b"+
    "S0FQdDlDRUQ4TixMXVNJJD00VC88LyxNQjk5ZzYmbURfQFg/cGVAP0Y9OUk8S1hON18vSD9JPjlSJSNX"+
    "Vi8oRXJsU3UyPEg8OmVAa0tiW2cvUDxWbFtnWjxcPjI9IipAbzZVbDkxLmpCTk0mJEppST1Hal5UOjor"+
    "KjVfT1I5W1ddKVJRPWonby9KN3FQMmNMRyhoZExZPCRGbkNdWzFFKlVuZD1nTlpbZ1FcZVJvJyk+WHMj"+
    "MjVQXCItais/SlVZS0giJUVhYlxhU0pFPUFUUz8rOD9BY0EnWGYvS0s0XGd1ZjpnOkU9Q3BvTXBiPFUo"+
    "bT9XYWkhYSFiPl9ucDVpPklFP0BHQF5bJzNZaGAmbTFpQlxyJ19vWk5qQUtJW1Y6YVhHYi8nVWwmJF45"+
    "aWgoP0VoPkJqNkBgLDdaP2kzR3JzT0xmN1JAa1xVKD1bWzYkKyttSkkxQn4+ZW5kc3RyZWFtCmVuZG9i"+
    "agp4cmVmCjAgMTQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAx"+
    "MzIgMDAwMDAgbiAKMDAwMDAwMDIzOSAwMDAwMCBuIAowMDAwMDAwMzQ4IDAwMDAwIG4gCjAwMDAwMDA0"+
    "NjAgMDAwMDAgbiAKMDAwMDAwMDU0MyAwMDAwMCBuIAowMDAwMDAwNjU4IDAwMDAwIG4gCjAwMDAwMDA4"+
    "NjMgMDAwMDAgbiAKMDAwMDAwMTA2OCAwMDAwMCBuIAowMDAwMDAxMTM3IDAwMDAwIG4gCjAwMDAwMDE0"+
    "NTMgMDAwMDAgbiAKMDAwMDAwMTUxOSAwMDAwMCBuIAowMDAwMDA0MzMxIDAwMDAwIG4gCnRyYWlsZXIK"+
    "PDwKL0lEIApbPGY2MmY5Nzg1YjFiNjBlNmU0OWVkYWM0Yjg1NjJiNmFjPjxmNjJmOTc4NWIxYjYwZTZl"+
    "NDllZGFjNGI4NTYyYjZhYz5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGln"+
    "ZXN0IChvcGVuc291cmNlKQoKL0luZm8gMTAgMCBSCi9Sb290IDkgMCBSCi9TaXplIDE0Cj4+CnN0YXJ0"+
    "eHJlZgo2NDIyCiUlRU9GCg=="
  },
  5006: {
    filename: "fire_drill_5006_2024-06-14_Flat_Bush.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBGbGF0IEJ1c2ggXDIwNCAxNC8wNi8yMDI0KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDQKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJyhaZFZBNE5x"+
    "VS8xdWppREZQPEcmN3BvXmkvLjxbJk9zP2lbRjpxV2c1VCtEckdJT3BaVVVgS1VMOEdIYy9BUjtaW0JB"+
    "M2ZcJmd1JVdBaS1ZWj8oQ1YuOWQ2MDBULGBGcShFLTFhLCZSLyspOikiKFghMW1mQHBFVnFXWmRkNnMl"+
    "bkdeX2UxSkhwKlxTQEklTVQ8K11aOVA0XV9SKW0/XVAtWURdRlxkKD9iIkFHRTZwTyxaRm86QmlyLjBh"+
    "ck9fc3BSbFVtV0lhcSo4LHBAXiomQFZJLipHPkpRNFAoc0JGPVlPWkJrVkksKSMoYyJIO0peSS9FbSNM"+
    "Vl81Q29dYlo+ISVyMUNyc0dNUzBSQDROREQ1VkxCcj9nRkIiMFFqSHNecWohRmBrKmIkSE43ZjdqUFpV"+
    "JHEjXzxlUmRlXFtLZlJwSi1UPyMuN15ebkVEZCxbI0YvWmZaVktGVXFLQis+VU4kWXFaX2BwKTY1bShH"+
    "Rzw5dDs/MycvXGVnXGxfZXRDNEBPNGBqUyY8NmolZyxqS2hzZVxGYzI2Sk1nUmwqZjBRW1Q4RSFZISdk"+
    "bCNPamEpMDVvZWFPPycpJUpoP1kyNlEnJ3FhNDUpPkFxYiFKPWVBbzhFbDtRKy91ZTkvNkprJ0cnN2Mp"+
    "ZDwkMmdbRHE4YExbJWcxSU8lOEVJSlVxV3JGJ09yRm1zc3IsYCokX3M6KVdVSmQ5KDJXNzk0aF9wLk9J"+
    "WWYpZi8kWWpyP0FLTSg5JF5cVSwkO2UhUSxZTi8pI2o0OEtjWXQnOWclaUYsO10sTTxnPiw3bFI9LUVs"+
    "RyxwXTUtQGAiRE11dVhPKDgiZGEuSCdHNXNAIlc6P0lKJmFcQEhQWVhtMV5vIy1NcDlHJmovajgxKm1M"+
    "XFdjYGlNVXBoVD45N3JSIUNaXkpNWiNicStpdFZdKHRnX25VV0JTYmhUISktNj5DNnBxSHRBLFVrOi1i"+
    "Y1NPbEMyJiEvYEJQdFczI1okLkw/MjxQQUtLZUgnQChSaCJLanUqSDFEXCxxPyZzNT47TWI6Q2hCOXNG"+
    "Lk87JmNPWj8lP1MqUW5RWGpYT2MrOChUTXA+VS1rW1tRc24wZk5BRTE4NFlXOSo1L1QjV3JpZUFfVlRG"+
    "XW80aG5ATmIlXyROUFhpQEE5IlxSbVknT0NSUEc2JUxFb3BvWyE+YVsqLHVOLGcrKSsyXyxxPywkanU8"+
    "YiwuUEpHVWFgQT8xTUk/Vlk3XTFrJ3RyQUUuZENCXlk1JE1tUF5HYideOiViTSVORVNyX0kqWTg0PDdD"+
    "TVBhPVVQLkNDM1JyNFkkaTpcZCoxcUNiM0wndEZmImlXZV5RIzknVkdfb0FaVzZpXSVkKyQjOzNbTSNs"+
    "ZV9qSzNOQTxEcmNzPWBoPUBGVGEuam1qQixEUTcnM24+KVo9c0I8RSVxYEEzKyQ5XT82T1JPQEk9ZHBB"+
    "VnRxKl08InViQkI9QjFgdExqa1Axc3RrbVMvUV5DalBtYlQ0OThtanBKW0BKWChaVUljYihFZGxvYT1a"+
    "LTRiYGgmcVNTUTh0cHRYYWwmYVxmQ2olXnUkZTg2aksjMFhCdVJbMSQoVGJJUT1TcDtjQUouNzQkTSVE"+
    "XCg8Y1khSz4nOVEpaTs2PDAvcyQiVEw4K1MvbltPSV5rZytTLGBgMWZzZTNnRWIoXkU9TkE/Qic6Vilh"+
    "WUQ9VzIzXXRUW21RUV1aPiZkalRoUDdrLilWT2ZUaE5nIzVadWhDSickN2FtPFhyNiMzK2JCY0Q5Mzc5"+
    "ckxHO2c0cUA7RSNZWzEsTVEnaGZYYzhbKjkxPFlwMSYsJVNTX0I2YGlhcUJiKmEmOm1kWFY0NSprZXFj"+
    "dS8lc1w4XidsWmxPVWZYX2ZLdT00JmNQTTxERj1ORks/TitDUishYG8jbDlZTUVWaj5JXmIoYF5zPDpl"+
    "bCJGQlgnRUtNQ1RfQEVLNVYxNSM0Q0wsOkBNUTpGaTNyZ1xlaShcbk5YMm5eKG4sMidOX0lKXj5GQixw"+
    "XlQiNyIrTEwzX3MwKGEkL0o9bW1FZEZKWUEqPWNUaidGSz5KOkJTJWhkSV5fVkBDcyYrdVc0I0RmNzQ1"+
    "Vj1EMFcnOTcrYkM1LGFpZSVHNSpENSM0Rk09Zl0hV3RzaDwjZU01OjFWLDImaj0nYm5SN2U6azIvOT8z"+
    "KHJEbVk5cFwqb1RfVDokaGZvZmpaUFZCXT5HVVg5P1xbKWgiNTZrYiIzKTtRO2xUWmo9a21rQXQ2ZTpR"+
    "WDc7ZTQ1JWMjRWxXUFRUP2hfJTk+NlROVyQmTiloYXJaXT5WI1g4byVlVi1vOlgsPV03QEI1R0NxSGEh"+
    "Y0RvOCowT2tzOj9KRiE8YllEKC1iUm1bUzVVVTU7NFVdNEBpZFsoSTE3VS5ENjpxS1o/PEswTixeSi1l"+
    "YHBuTzBlWj8yV01UIyxDQlE6P1ghbFBIKCxSI11JWHNwZUJsKFAjYmUoa0wsRS0+PjJORTkpUigjNi8m"+
    "YGQlWWZGOiRLNV87aFBKbDg4QlVtQG85WlJMcU4iQF5ebjJpcGtNMCliPipDc1kiOEBxbnBiQChuOF9y"+
    "Vis0M0IzZ2txWjQoOS8mRkc7YWJbM0JeYkBGYWtKLy0wKkRBa2VYNUpdMlVaOnEvQ0s0SSlOVkBfXVxx"+
    "dUhQJ1JSKk4/X2NgYVJxPjJzPlc+Kl1wJCtUSDQwZjJiNEQ6QWw7R24zW3Q0Jz5TKlkyPFUuUm5wbzYm"+
    "MztbRy9bc0NFcXRYYSxOdWwwYmxgYWRqcmJudTQucUJxYW5fIyJScDJub0U0bEshUHFoI0gncmhlX0hQ"+
    "ZEtuVCYxcTgiPjViR00kSmlCJigxRVRhblkhMFtrcT8yVzUmSGJoKC06YHRUT2hNIUVTaDwpPSlRcSpb"+
    "ODpBKjpiPDA8RkY4UzZVTyVEZVItSSNMZ0chXVk6YTYkcFpTN3JCYnRVQW4sJ3U5V0ItdGtUSVRTXjhL"+
    "UTNVIkdcNGc3cCZsJkE3IzNscDFQN0E9XDYqY1lbR3BTYkdIODImNDI+PzZRL11XT0RfUmM4YSNMJ0ZF"+
    "TExJXmllOm8mRyQ3cFpWOjxeYEtNXDpaTFZjOmdNWiwyN1ZiQCZAMHIibTVmNTlHUC4vXTouS2d1PjYi"+
    "b0FLbVRAYihpP1IvNlZjJCpzaTJcbHRGYmgkUD1PNVxPcGsmcyFCZmIzOVQjW0ZnbV9qJScqVlpYWDdp"+
    "LU8yYG1LS2FYTWQhYDpkQWpYcl1QYFstQSQoYnAzUDQtRj5HSClfb2RyYUdhVy41NyFPNTQhTmczazou"+
    "I1BiRDlmWjE5QllWP1gjIl5nU09Eb10nPlpSZmdBa2Q7c2NhXEZfLSl0azZMbnN1XVMqYz4/VT9aP104"+
    "LU1IQl9AYCVsL1lfKTMsQTQ9SUJsdT5JPTpkPFg/OTooT0QmMWRtWCJrVz0qTlppKyVnRT9FOyFyN1Mx"+
    "R2snWCd1JCc1Q0BlZWNwbyFXcE83bnFQQGUySTQiXFIxNyM7QUhTMEtvbmxobkIvWGtgU0JfcllUNi0v"+
    "L00wTlMqNGVbQD5YLks6NzVJY25pJDtJKEREaS4jUCljclMsfj5lbmRzdHJlYW0KZW5kb2JqCjEzIDAg"+
    "b2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDE5NjIK"+
    "Pj4Kc3RyZWFtCkdiIVNtPkFyN1MnUm5CMzMsZCchTD5iUmNhTHIhclJnb2FeRkRWSSRfbHNBN1UoXURp"+
    "akJDITtyOy5OIjY7K2MiZzI3ODlNKGFfc08qTCg3TyU5SGg/YGE2ZUFjVCJeRTtHUnFqIlFsJm84IVg4"+
    "cE1gO1ZxS0JlXDovO0tHNFd0cFIxaCMraUdUUkQvN15cczMmL0s2TEJnPSNKNFUtaDZVQz9WT1NHNUNj"+
    "IWcoblZkYDhzcCosL2hocVhUSG5vLThVWyFqLEpcQ0M5IU0sWUJKYTZtSi4nQFhCSkRwPkNvZFM0SjE1"+
    "a0AmUCpqJDFDTCQjYTA6UFw0UWo8QDdcSy09OjNQZFJzOmpZSihdRzclaD0/aWsocFEtZCMmZERSNldu"+
    "P21jNSFHUzdwYT1dKFFcUiRrJS9dSUtcKEFyOUBVYWFoaGhubzcpQWtCQl9NPi1sNjlrW1BEJ2QoPSY4"+
    "NDBLJHBMZ2ohRm1JZCc9KlhGKl5nIUpJKEI+Jjs5N1gyWjFPMEw6PSY4OCw/NjZoaUtFJkQ2YHFAP1cx"+
    "Q0knOFBvPGtuKEcoRjRgMF1tX3BwJUciQG1nYi0oaXA8cSNlRkBydEtgbioua3RbcVFJJllHIkE2Zzlh"+
    "JkMuZmNwXlJwN3EtPyRmU1kjS3BlL01SbSNlM2NjVHE+U2BBKDxBO11sJ3BkSVMnYzNCWWg1b2VhVChB"+
    "X2dzWms+XVQ1MDkzXCdqYElfOVlqIkNVMGk1TjxkOlpsXWpBb2RHIyRFY1FkMCZFK0pJSzwiRW8vKUVN"+
    "RF1AWURXREc5RkJcK3BtRkBkLG09dD1fTUtlLl1XWXBtUjlLcXArSCIoO3M0KG1SW2E1b0pNc3I2RFFu"+
    "Qi1yKFhVdGkmRmllL2I+NTUtQS4kLlQpWis3SXRUczdBRCRuKyJGRUlfSG0lb2YoPVkna2xNTWNuSWRs"+
    "UEwuM0BLKClhUzsnKDFpJC1ZKHVwIVNKMiUqZSspWzY5dXAoOUAqJi8vIT50SlxwKTxwcTVjMHA/bj47"+
    "RWNiXEZiOE1GQ04jWCY0QEpiOG4uYD50clshSD1iQEsvVzUpOE1PLWQ0bj5fTmFZb1NUYVImJzYqLDta"+
    "OGkldDtDZnU4b01dc1RCYC9dVTgxTjdpNUEnXClNMHFxO0lLaDgwaWsrPT8tX1FuYFpBLiIkRVNdIUJS"+
    "YTV1XS9pYj1cLnBwMSxGMS1JPlokMCEsVyFNUzUyTFJIaiQhL1FFdGkvTlFmYmZpQz1pSWhGIy1hXCRx"+
    "Y0IsUS4vdSo6PmdFYTUrI05mNlViaixNOixvWVZmalhqU0JDVmU9YGFGMWU0X2Y1aCpkVV1WPlwldCVC"+
    "VF4+W3IzM0VTXGBBOihjIzsiM0QuWWZPMEN0MDIqTl4ubENVNmlSNiNJbi9TSkFZZGBVISVdLHBFPkVv"+
    "SCdqaiMrcDlmSExnKVQtbyorKExcazpDMWFfaVlzUilMVnVFIVZUZGctQ21rRSsoZ3JIZDxsRzFNZF5k"+
    "My03O2olaTEpZSg/Jmo1MF9DLWQ0W0Nkbyk1Mlgma2RwX0ckYG8hQktEK2InPUZPUldKTDhnUi8zYS5E"+
    "ZV1xUjRULl0vbkdkZHFgcFhtNDVYdEMwZ2EiJXM3UCQmJ3QpdCJJcy8yWVdhJSldMSdJPFhVcENYVzV1"+
    "cDo/NXVMM2A4WkQ9VEZROl00M2VcSlBwKk00XnNnP3U3OUVlWjRcQ2A3UFREb2sySHJJN0xXT1JhbDBG"+
    "N2Q1RnM9MU5bKlMjLkg7LV8xJVhJVjU6WlVOS0pFQksjczw5VElbWVolK2A8Rkg9UGsqIyExVFFOOiNU"+
    "bF4uZi1vTG9JMFRNbj9yUipfLUdwVDA1PmEsMXNsWUY6aF8tTU0jKGFeXyYuME5ecVFkVDFVaERFJTA2"+
    "XVQxUys+cTkiaz82Pz1xKnEpak5gX1Y1Uy0zOXNjVjw9UEJfT15fRlVHa1VyXm9ZTVFaVChdcm1ndT8t"+
    "allRZCVmSzRFRkYrNC9RYnBMIysnNlxBXCg4UFRjTyQyQVFQLWhaLlNmNkFaJ2licWtkUzZjIUkzOmIt"+
    "LnVaPmglVmksQEQxc0pqZ3VHbiJAK3EiQlInclFkN21rKkFRO0plJ21NT0dEZllHLiw/QnJpaDAoNShE"+
    "WzlTVWlBYEwrX1BSTDssQnVka2YrRzlDNT40U24pWTlWVi9cVm81KVE1R1k+akI3PjFYXi5RVjRLRzVZ"+
    "MnJbOEhQRCpTJV0iUTs5MXIiZlxeOkBMUSYkJ1I8I0UhQWZBMShdSUFKMUJmOT0pZXEyWGkidC81NWJj"+
    "YVR1VFVuZ0suO0lGWWNMW09tJkNkPTNhIXBRNk1cLTpyPDc0XG50a0ZvSlQjXjQ0M1NcP0MsT2UpW1lx"+
    "IUBbKFddVzsoU0I+dHRvS1woS0wyRS1uWixZWmg7aW87KVlpPGxQY2lmOkdeQzkyQjhVVy5oYG03KD48"+
    "Pj5GcCZecHQlYVFzU2RtLik3T3VvYC9VdVBoZTc5Q2I8VDo+cE89cy90X3FScHIzQnI7SVdGdWZcU0NG"+
    "NVVRKFtGc05ldG0sLVFAXHNnWV8vaTE4WkFYLEclbEVZITU1QGUrbSt1b0UwWGNoIlh+PmVuZHN0cmVh"+
    "bQplbmRvYmoKeHJlZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAow"+
    "MDAwMDAwMTMyIDAwMDAwIG4gCjAwMDAwMDAyMzkgMDAwMDAgbiAKMDAwMDAwMDM0OCAwMDAwMCBuIAow"+
    "MDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA1NDMgMDAwMDAgbiAKMDAwMDAwMDY1OCAwMDAwMCBuIAow"+
    "MDAwMDAwODYzIDAwMDAwIG4gCjAwMDAwMDEwNjggMDAwMDAgbiAKMDAwMDAwMTEzNyAwMDAwMCBuIAow"+
    "MDAwMDAxNDUzIDAwMDAwIG4gCjAwMDAwMDE1MTkgMDAwMDAgbiAKMDAwMDAwNDMxNSAwMDAwMCBuIAp0"+
    "cmFpbGVyCjw8Ci9JRCAKWzwwZTdmMzgwMjQ0MTUzMzRhNGUzMjc1YjI2ZWQ1OTExOD48MGU3ZjM4MDI0"+
    "NDE1MzM0YTRlMzI3NWIyNmVkNTkxMTg+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50"+
    "IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDEwIDAgUgovUm9vdCA5IDAgUgovU2l6ZSAxNAo+"+
    "PgpzdGFydHhyZWYKNjM2OQolJUVPRgo="
  },
  5007: {
    filename: "fire_drill_5007_2024-06-15_Titirangi.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBUaXRpcmFuZ2kgXDIwNCAxNS8wNi8yMDI0KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDEKPj4Kc3RyZWFtCkdiIVNuPkJlZ1smcTlTWV50WDBWQ2AlQVpJ"+
    "RyljIk91U3BsWStzUkdoNlJYISNociRBO0MvO2JdWUFuI2kxMiZEYV02VmVOR0xCUkw2cj9cXik3Pkom"+
    "VjFKI0oqLkQxazsuNVJRNk9KdWxqY21EImUnai1lKE4uOzgkbycrJHFvazclbG9NVmYrSUtoYlMhIixo"+
    "QixgKiZBJXBISGI8YW41IzxlTHI9NmdoaVQ6Nz9JUUA4Vl5MOFxXL15GM04mISU0KWAuV0pyLmIpNU1h"+
    "b2JtWXFrMS9YV0NEKjhOZGNYPS8yTjtHUUExbUUqP2JYLF8lY0FmQT9RLTFRdWc0bGliMCskai4jZSxJ"+
    "bm0tb1pWUXFWLUtzSU9pcFVSUyJqTEFBTEtiMWRZaENQbUZyQEhCQShPYClPVStuUjBQUlptW1ZKUz9P"+
    "Ty8uLzM/dURvPkw/WzxwcTtyJVNPIkxQMU9LQ2QuMUc1QkgwMkNkKExhSTUoIlw1OVknbiIjTmcvKjkz"+
    "JyZkKUBETk5oZiIsY1FZLEIvUVEsUT8mWCJLMThuSVl1NGZZNlNcZSpENSxiTGFLO0VNOzslRFcpLzRf"+
    "ZSpSa0tURnJgajMtWnJxSzRqcDM0WEZjQDhxVW1CO2B0aTtMMCUmVjlgKiJcTz03LF5iLHAoQDRtcnFx"+
    "SjheXU1mdWl1LDhSV2IkZFczTDNKNy0xITM2I1xIMlozJkc0RmYwPnUuWGY/LWF1bDo6bDFVQCkmbE8t"+
    "ZW8lalVmMV5CbjMja0NbVCZqS15CLk5VTGUuYllYPEBHYycsIUQ5QE4lPlBYW2EvakYmdT9rTk5UL14n"+
    "O0BUKmJra006TD1tP0NyPjxUSSpaXWFdRUlkVGJOVE5nPj5qLER0Si5CYUpidSgoYm5bQls3YEM1MEBV"+
    "bGg6KThXOCtVX3UnWW40czpzQmk8IS9XKlVFYiNvOUdtSHJYTCI9aiQ2KnFeIjtmUCQtMyZ0Qk1ha2RB"+
    "V2tgM3FsPGJwLVYiJG9KcV4lUFEtY21BJD0ycGVvVy5bJTBSQT5SNSwlVC8ub1A6OWxpYy8uYEJuMkZy"+
    "SWRBdFdSZ1M6QTJYRDM6ZFQ3MU1MMDUhWnFIPmdtXDBoMyc6XjsmOmkkRnNIKG9qbiJzMmhiZTNUN2JS"+
    "IjIpMGxfK0IvXCc/XV4rZ0szcmwxLT1VWEBGJUZYQmFVNCZCK18uUG4scjopOmI4akw6UT4yZl5iJGYy"+
    "XihWSkNoYWVAKElTcUROMlo+SlwtVHRIKlgrVG9Wcj1xcFpfbmhsblgtP0lZbkEnbUhcc2Q4PU0pKl5d"+
    "V1M/PF5kT0RwQWc2RDtPXjBSKilPUmFWXHJnUSgvaEdaWSc9XCJtWHNUTWNyTjRAN2wvVUVXMW4iUDVX"+
    "aj9NaChCRU5QUFhiSzMrXyNROmdSOS8vUDInRDBCRVYscGxKWDAiJzZLK0RAMzI6cEhsbkBVXylxc0Mr"+
    "ODlNS04lNnIiVjpuLDBqKmRMYCEhNi1UTmAxQSg7Wz9lcGIrSDlTNjQjPzRQQzxZY3AvL0dpTFBlQ3Aj"+
    "WFRHVlRQSGZVcVgxLXBcLTxKPExfcF4iIjhtVS5fVEZbOTs/JHUqJVZiW0JvJCstJzouNl5jKFkpVydd"+
    "SzhlKlxlYDldMTg+XllFRVBmWCtJRlRtIjNpaGMwS107aEAtMkYwTGZdMl1sUWpkU0gmZTFPYm9sQlcz"+
    "ZXFnRDIvcStuaEArJHBNUkwzakxHUzInaSFhTEhMLDJUdSFHPltHciU3Nk5nPThQJ0NEPHRIPkZmWk8y"+
    "RDRgVEQ9QEVfNlUwbG5kXTgoXjJoTXUsam1QcmBgZU1rLExaQz91Q3Qsa0kwU2w2KmdwcDczbW1FMjlY"+
    "aCJASCc/WHEmSSdzcT4jaHA4XiRAczU8aFEzITdfdSZMIjsmRmVUUm5SbzNNLmdWcCY9dDdMMSJdJVE+"+
    "LS1SPGY7ci0nbGlzbTAvMW0qPl08L2xXVkFmYG9FZEFGOUFhcXV0J1BvJ09WJThhcCNJXmhOK2tWKVBS"+
    "XCFgOG1CZiZBWDkzPS9FJjVpSmEoYTwpSChZbWhURzkqXWc6YDE0KWFEcSZcTzRVckMoITlRcVonU0Zj"+
    "XE9WbEtGSllWQVFWOXU1V2c0YVY8ZmFsW1QvVlxpIT5cPUk0PEBEKHRWXTotZUwtMCYkb2goYiVZNTle"+
    "ZmlNZkooKFlfO2pbMXQwPG5rZjdoPXErMkVULTNbIk0sWWI0VSJmWC48Y2NDNj9hTlo2LWI4NFx0J0Y4"+
    "P19GUFNgbyxyWiI6V19jZltCcCtsPFVmZUlYZzBtdD8zWlksIiVlSStOOittZShPLSgzJUVEMnAhZydp"+
    "JCczKS1zPlsnLGd1KEQ3PmwxS2lEbW0wTip1KURxSUNgdEZoaC5LWCUtOSVDUERlTVhrVU5vTGlabihl"+
    "bDZGZUduKyFgLS5FSy8uc08/XzhZRzMlVE9GZ0MkUzNoWkElUF9raDZxVllWR3JEUGViYCJfXVxUUTwr"+
    "R11nMEQiKyMiaWc8Ui08PD9HUU5CRWMiRmE0XEErSCJtZkpbZmYlamM+YUBQST8kRztzT0subERhcENz"+
    "I0FkcGBjVzAiYiE5LDxkQEQsaXI2aSxeLTsxT1I8P1Y9MjBMMSpiS1ltTi0uTGdOVFA1MEtqVSZdKWpI"+
    "XiRhSik5VUZUP2FMMCxJbHJwWi5LUSojSkBmXDwiVlZYKjddX1tmR05fVjItWThRWjQ3b3FucTFHOlU2"+
    "RGxrWGpPUypVNUNcOS1fKl1WcSo+SGBDczZcb1tOTkNiWDU0YDo0U2YybmlhKSxPI0lLNzcxP09hWTon"+
    "JzpiWVRdTGEqMjRkRiJkKTJuTCZJLDNUJU91JF5KJnJWa0MiITI9ZCpXTzMqPFFEJF08Ojw8XDpOOF0h"+
    "Zl5KWiddMi4nWi8oUCZXODBuOUVYOm9JcjY0LmVLKl1QKnBoPWdjbDIyXDJiaS1jUWtWUDZuQElSZ2xh"+
    "KkVGJSRnampNLWhJRCohKU5vNig8QjkvLz0sKUFOSDtHb0Q+PjVgJFtEPCY7VSFuY1Ncb088KGFoMSVM"+
    "MDpyNz82VC9kWCg/XVs4cC1wM0pHT1hMJ1JDQipuOEU8NjApWzA7TiFiZFtnVkJSXHBfUWo6TlhWOm9x"+
    "QC88R14sJEo7ODxnclptbWBmOChdXVRcWUAzRzRyTUw6altRbEltJmBRUmw+Yy03Q1YnP04iIT1vMT8l"+
    "Ym5kb18iQ2MrQ1xvX2ZoJWtqOWBeaThEbCk3VWdySmsnQlxqXFFkLFNoLDlSJ203PDJKImFIRU06I25y"+
    "YFYvLzpkcSw2IWZwTTFlUEpRS2dfLi9WOyJbT1lFWHBGSklaLEdNRGdGZ2dIbCgnIjguOEBEZGpMO2Jk"+
    "Qz9ES2VQMWc0Wyk5dGBXLV9eIzllWWRXWGVzXyQlNzY2Xkc1SD0nKUlAYyVcKyFdKyE+Tl06RC9daTow"+
    "dGtGP285PE9QayZsJWdZTWEoKSNwSWwsRjBsJyFgcScwVS1sXjInQElLWGReXUljSDhENTBhLzRaYVBp"+
    "OSovciVYaEhxXFVZOldldT87VGhXblhGVV0xQFVoOmgpfj5lbmRzdHJlYW0KZW5kb2JqCjEzIDAgb2Jq"+
    "Cjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDE5ODAKPj4K"+
    "c3RyZWFtCkdiIVRYOTY4aUcmOmo2Sydta2suTS4mTTxZYTpCNjMzPiE5O15cI1czaDc9KiZbRTlRVWB0"+
    "dCVyVTdBViIhVCVrUTUhdU9aN1NdYllmJi87WW9mODciLGFqcEg2NW9gP0I9JToqPFg7aTFdXHFbS1tD"+
    "I2ErISNibUBaQDBfNm1zSmVwalBKMWkhIj9HRnFbPUk5ZExBNUYhVW9SK1dhL1lvOilLaFlOKS10Xjxf"+
    "MSc8ImU8TzxAPXFgRElFJitMZldRMkdcW0FfOV0wW2pAIyNxMEJWZS8iUmI+XkM5JzU4ZyhKXHJtIUM4"+
    "UlFaZjwmKig9ITs0cVsxPkc+L1ksaFUqIWU4IlwoL0lMK0UyaEM+aFNVKUMsbipXWTJFYFgyVlpwbEpm"+
    "TXVeclBrPyJOUC8jRFhyMGlkSzZfWyhoWmQyXCNONU1QMFQvaSduYCU2VjRzNWRbRzAqTGJrSWUlKSxU"+
    "MTk/I1dMcGUlc21JbW4/WjNAJmI3V0JBPDNfZGs+WVFkWmBPTGZRJWAva0drSGQ6ZUs7Om9lXSkwIjA4"+
    "JjA1cGBRKFtDNitESlJzY29rIjRFU3FwMTpIcWQhdVdRSFVeVkhscSNhNXEkNS9DWD9ZJFsmO05eRE4/"+
    "Lk5CQUBpXSM3NzY/RnVgbSNTb2woJ2t1cCJPXENRPixUM1MrI2VoXkcsZ21FVEktMDVkUCNnUlImTDMs"+
    "b1c0NF1AME1lYk9dUktSMTIkUyMpOHMiS2ZBMEFddV4zZXQlI1VQazIiRTs9S3FuYEtjQCRdJWBLLS9t"+
    "TVNaazNnQUtEXzwsXTd1MDk5Qm40WWIsQzQpVXRJOFM5Ryw4TmAtR1otI2gnJ3JFPWxoNCddR1YhcEMr"+
    "QlBDOC0nMk1wMyNQOjcwJmJGJipDW1RHaT8nSC9HRnRWazo1QkpSQDlvaGo6K1FybDJCWyJWI2haJTBO"+
    "X0opRVEoZkxvOU5scVhBby1APl0nKVtOOWcpQk84SFRrLUpjM1lzbzdiVTsyQzFCSC9VVGNbMVtcWUZc"+
    "cFxVQkJnWmVwLENuRV8sOS9wQCRfOk9PJSk4cU8sUzhsT1NtLSE6R2YsYzdsWGZfbDJHMCg4YHVWL0FL"+
    "TD0xWC1ySy8wTWVsTzdORytFTScnMyg6UDE0NENvLUs+bWVZSTEtJSloS109Zz1DOnFJdWE9VlJFPHRI"+
    "QWdcJyc9TUFRblY6JFFjVUgybjo8VzZQZkhNIyNaSyhkUVJYUiprJFxbJyhNQWEkXD8vJHAlPE1XbGIm"+
    "ZE5cPVlAKkFfbCojWklCIUpbPlxiSyVHLWJ0TW4kOCMkYXA3ZygqU1RQSVlbay1jYmNLP003LWlfbHJq"+
    "MyIpOTJoRzRuMjQzV1dVR05SWylwVStqXUVbRGIkSEhVJC0oYHBqaHNbInJtaG8lcE9kKF41cTtvMz1G"+
    "Ols3bV5UXExZUmJwUDBGIzdmNENJP0VJKSwnQGNsLSFgQGBGVls9Tj0sX1JaY1ttNT1KYDlYLjktRVRo"+
    "L08lTW5bKy9gTEBNKGpjLks0W0JwMk4pNz4jRlBoUGEkLmBTXVRgKUo3YktqcykmLmlER1FMPWZAXWVe"+
    "KWtaWHJuVGhDW19wSmBXQidsQjJdb11PRHIlV0M8Si5pLDRaY2Q1WEsxTDIkPlFoOC9eNixsXnM0WzFC"+
    "OFRZKEs0b1BFMixVbENEdDxgSVFcOnEiRnBvKjd0OiNwIV5vZUBJLz46b3IkIXJxUUEqKkMwSSVRbCh1"+
    "KCpcZ2xOdWdHQzE8WGBFXldjVEFiJUQtTyZwTXJsMEo4JyYqRzZIbD9NKCM5SUJELCxvPGdJaz5ARC80"+
    "aC5EWS1XdVdiNThiPFhba2tsRXQ5JmtlPS5uNiRUdSRcSjktbDxlTV8zYyUzXS9sYHRAcjxYJGFjci9S"+
    "am9sY1FAVi8xUmg1ZjsuS3BDIVo5XyYuPTppV0hRSlY6ZW91cF5aM18yVkFOXmxuRURLXUBUdHBJJCZs"+
    "M2ldZClrYF1sYlZDNSdqT0NoPGJOXFwxLyZjMVIybCZoSD8iLD9BK002SFA6MD0hbCNYUD1RW2pgXVQn"+
    "PXNTIS8pV29iJSFIYzdpOidoOTNMP0QoRW81OC5UZD0tYVlUPUUjSC1mKnQvVVZRcl5ybGcxKnRqMG5P"+
    "XFRyNnVlXmdIPGdpcFwkbElXI1AzPVBbXFVrUldjbVclRWBVbFg+S1w7cEY6ZGZXY3JJPD5VJSlVUmst"+
    "LnFkXkFzUFN1I0haV2twbFpEcGtqPGRDKzclUCU0cUtCOkk/VGxgdDgjP0ksaW0oWXNxTD0uS0VURmRD"+
    "aTpAQEcrJlw7Y3E0MSRRVHVPYEY0bVRSWzxaZW5zZW1SaGE4RCxbN1NMT21cYC9uYjxVO1RLJV9tbHNL"+
    "V1hzI3FyQTsqRlBJaWsrSlArSjUoa1k1ME44KUxGKEo/PiFoSD9XPjgwME5lWSNlSzNYZlxeXGBBZjx1"+
    "RFI8aHRNZWQxXjclJ1VSMElkWENAT0RGPW1AUTNcQD0lK0ROIlIsKytxW05UNnUrVidyaG8+XV5LUlNB"+
    "PE45TCxgcFE8QltEWF0rbjcxLCRFZTdDOUslIz90VydaY01QcTVKbTpRXE9aLnBqVy1Ubkh0PG8rZD0y"+
    "YjNlZUF+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAw"+
    "MDA2MSAwMDAwMCBuIAowMDAwMDAwMTMyIDAwMDAwIG4gCjAwMDAwMDAyMzkgMDAwMDAgbiAKMDAwMDAw"+
    "MDM0OCAwMDAwMCBuIAowMDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA1NDMgMDAwMDAgbiAKMDAwMDAw"+
    "MDY1OCAwMDAwMCBuIAowMDAwMDAwODYzIDAwMDAwIG4gCjAwMDAwMDEwNjggMDAwMDAgbiAKMDAwMDAw"+
    "MTEzNyAwMDAwMCBuIAowMDAwMDAxNDUzIDAwMDAwIG4gCjAwMDAwMDE1MTkgMDAwMDAgbiAKMDAwMDAw"+
    "NDMxMiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzwzOGQ1MTcwNGUwZjhjNmU4YmI4ZDk0MDAzMDAw"+
    "YWQ5Mj48MzhkNTE3MDRlMGY4YzZlOGJiOGQ5NDAwMzAwMGFkOTI+XQolIFJlcG9ydExhYiBnZW5lcmF0"+
    "ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDEwIDAgUgovUm9vdCA5"+
    "IDAgUgovU2l6ZSAxNAo+PgpzdGFydHhyZWYKNjM4NAolJUVPRgo="
  },
  5009: {
    filename: "fire_drill_5009_2025-06-13_Pakuranga.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBQYWt1cmFuZ2EgXDIwNCAxMy8wNi8yMDI1KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MjIKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJyhaJyF1aV9J"+
    "OygrIUcydFdnK3VAYkBITVJVUi51Py5iMEU+NENyVWxSYSY2QW9XV1IuUD85TSRwXSM8UzlDcS49ZTgk"+
    "M1dUQ3JnY0xZazddaCU5N1xqY2ddOC5NSkI4JDU6UUJsY1UyKkI7KihiUz9LPChzMlxIM2tqPV5sJG1x"+
    "a0owNEBNYERrTnUqYTUjRHJcZmhyND5UaFJwbmRjVVwkNyV1dUA3YEVARVRybTtkUSVjS1VIJEcnO0Rc"+
    "VkZzOip1K0RyZVN0OUprVTBXUTE/Ni5qQnQrSkksdC0nPVJLPl4tbSVsdHNpRVMpRCokdTc7aGdAWmJA"+
    "PD1aJEkoWGhjSnI/K1ZeVmYrZzlPPS1CKVtyXk1nKnQnWDFZYGdrNEFSXDVKalspbFVxJSxuWHBrdD42"+
    "STNSNE4hTyc3NzsmMU9uI1s6biR1Mz5FaTZ1SThAMk1NbVMnMFNsS1hoRmk+VF0hW3BAU2VUO0hlQShp"+
    "J2EyayJVP0JVRmwtTTFPOENMWU1qOU8lZylOI2ojOGtmc3FvMWpcWU1ZPG0/aVNRcEtxXnFaS2dXb3NT"+
    "JWFeWzUnRGpFMD82JEBsWmkmMUZTVmZRVzsrbGY6NzpFPWt1NyonNSM3JSgmVjhcaF0tTWNDXDdFPjta"+
    "Nj1vVGdBVWApPU5wVXA1MyInNik5dSNFPDpzVW5mMD48QyhFWTxoSEA1RFVIO1tAVWcqVSY0cD1rPUBf"+
    "Q01sWVxnO09sY1o8RSY5QmZVOC50VTF1OUleSFxMI0hzQU9RXippZHVNVmFDMUlnSGc4XCViRj9Mb1sr"+
    "ajBRK11UNmpYMFxeJ0UrNiZbRV9zbylwTFFGYDZRbVUzaVkmYlUtM1w2Rk5MSE1qJURlRmtBKFwoZG83"+
    "Ujk0MkBlX3NUalg1I1ohWl9ITjNFVyRzbGkuMTxWNElZUyVOYnU5OmUqUltmQzx0RWA7Xz8kK0EkIihB"+
    "OVIpJldobnM6JmNdQEtAOzBbLChtZG4zVjErKSlGWUxrYCc9ZGxFa0stZSVrUlsiX0RZLz1aWmFqRFlW"+
    "YGBLSlQtI1lfP09TNU1RXzcqb2MyKVU/bl9SUTlrW105ZEUhXlk8aUFPSWc6czc0PD5hTiNFTTI7T2Rs"+
    "RWhIWmktND8oSytsXSdcMGpGR2sqalE5NkI3bmNxWlddcmk0Qj44LVYmZyM7bzBPQkg1Tyk8bGhZYHBk"+
    "Mz4ldSMwXUheIkM0T0lxL1NBKEJDUy08M2gqIlE3PDwqOz5HVC5rPFRbZDs+MVdCXkVCVVtQSTVRN1Q+"+
    "JElcVy11a1cyUzVWbE1bQk86T19YX0QyUTt0SyJBMCJBIXJuRnJPP24xaVkzWkZvVml1bGMoJEgjaFVn"+
    "JGdVOmE6VGtcbmtWV2tpMEg7WjQuW15DMFpWTkc9KWRpOmIlOnNNX0gkKTpSME4yMDBJUihxPy1JYFBZ"+
    "PXBbUEJWMVA+cWxDaCxlKzxZUVRdQzlkbDh0UEcjalhlVWdnXzBuTHEwJHQsSSJKN2c8Vmxcb1wvS0c0"+
    "Qlw/X2NFZW9iNUpbWCRFV1lFWypaODQ8LV5EVzhgPlYiWSNVTVZAXVo4cFU3dW0vIihzb3I/WSUlZmYv"+
    "SCVFKjRdTilQayFgazQoaUtxS1JdXHJdXF1lSCk7SSE3YmUtZylNZzdXTG8qM2J1YDZYWHVHVVBRWWhb"+
    "YiIqQCNMYVkuM21CPl5MLSFCKVFkc0k2LGkwI0o7TXE/YlQ4IzhnMjR0Q3NwNGJKIyVLVUVgJGlEVUI1"+
    "aHNtVyZvMztpZEItMFFpdUZEQF5xJzIqVzhUJ28mUWNFOSlFMmcuP0ZcI09ALXUicUZ1SjZYQlQ2Ui47"+
    "M1hyMChYLUhDciZjUCEmIyVoMzxjbDBcbCJXOiI1P1s6YkUsOjUkS2xDO0toSjxuOHI8PFNGQkdRKWFS"+
    "bGtuUUJsN0BjUzIzbV47UjtcI1l1cClwU2xwLC9aUUZSKXBiZCIsbXJqPE9NUVMmOGZALEJBL1c5WT5L"+
    "Q0NJXC5CSm5hRVVgcicpb0IoRm5hOmE+cGA8TTdQPjE3WSZvTkpCaU9WYGY1N1FHQyQvT1REZCFfIltJ"+
    "TTpjXE91b1RRQmZlUjozPFhBIklSX2cpLD44UmwxX3ExTyhcMURGOjFoblZiJlJuMWk9VU1lQVhPZF1u"+
    "MWJTPl8xcUpnUW4+JU5TZGhiSW9BR09lYyYkamNjZiJzKVxRL0prY0ouYkBMWD9famFZTUpjZnJmQFlL"+
    "O2NjZGM0OnAjM0suOjRTZ0pJMFZxOkE0OjowU19mSjI5P1Z0NkozUDQrKHAudTxUO0c9I1tdPSZRXUBJ"+
    "K040WCpxWnNPKDMlbiRETm5eN15kVTwwK14qc1YsZ3NyRDhxVi5EaUtfRHBOJl1WVWVRRz07bEN0Vzc9"+
    "LmNfTmYjbWVVW1ZnOEcxIVknTD4kXDZmanVJMCJQWWNkPU5TbTY6LSxIJXJKOzBvUzA8Y0YhKVZaYl1v"+
    "c1R1VipEMlNGKXAsaU9iaEpgUyQkKipoYlFdLmsrUlRlNXJESzwzVW1AbzlaUkxzcCVaNnRqRF1nWXE8"+
    "VmtiO2ZyL1ZYYG1na041V3ItKnFdQ1N0Zj0zR0NBSm4jaCtrZFNtUihtZ0lrSzIuZExfXCMyQWVtXUVZ"+
    "QCYscT9EXU5MNXIrdWA7W0RuP141KVZwUTloK2ZKcEYsMXE8JkRfVz4qXXIkK1RINDspRC5URDhaZCxF"+
    "PGUiYlNaSmwmZ10rSjxib19QTSYzQT9NL1tzUkpxcnFVcUxFOGUwbGBhYz9zKTUpOS5xRWNyaVxOZUdt"+
    "QVtmOUlHQyxIanAqJ3JyKU0nKS5VaDEyK14yVSFbPiVWWiZcPEgsL0FhKktqJEA3SWRcIWsjSC5rKFUl"+
    "ITohUTYtSSciaWgjPVswQU8+XkM4Jlk9NlBNYUlkXXJiNU5pO25GVHM+M25ETSQqbDZCKTZeYl8lYDVN"+
    "ZmVyW0tdWzRoYl1UP25yJU5CJCNpW3QhbCErSlhIaiglKiNuXzxBQWUlLCxFTyJULWxINVQ9RHFBbzFH"+
    "KDwqPy4pbCpJaGU1K1VPKVwna2oiL0I+YD0nZ3JDOjEuZzh1W2htTGVzXl5MSSw/LyJUO1E7OVVHX2xA"+
    "biRkSTBBRjlwOyJ0aSokXWJdK2lVZScnST0scl1JJFExbzI7YUJPaGRBXGhkcEhgSjQ5aGlEYmpCcGNV"+
    "KlthTSZAYkVDTEl0WF45RiNxR18iRnVCNDojMkEndCY1UlUvYyZtVyxAUG5BJChicDNTV3IiRmY2NyQ2"+
    "VkJKN0E8LC40SkNwWUthJUB0SyhXQmE2VkFxJ1dQWlFkP0s7OUo6OD02a1UvZ0Y+PGR1ZzBcMVVcQjhM"+
    "b1FwU09ZR1s3MUhjQDw8OERZUVVnR3IyLzVeXUErcl1mJTErSztxPGM/SEZxTDU0KFs8JHVJQTphXW4z"+
    "alhDaHJqbDxZWUU4ZW1qbCYqVzdEa0whaU5tZ1AyR2Bwckloal4tQlRFSENlbUVLI1RHNTpoISMoUytq"+
    "MjgrcWJVWyhQL20wSWUlbWNOIUVZL01kJWZaUnVRWnQsaktSLVdKRGosQ1ZRdU1bWk1sNiMsfj5lbmRz"+
    "dHJlYW0KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNv"+
    "ZGUgXSAvTGVuZ3RoIDIwMjQKPj4Kc3RyZWFtCkdiIVNtPkFyN1MnUm5CMzMsZCchTD5jLixwK2lGXDNb"+
    "Py0lWzVDYmhfXUJNSzo9UkBKQ0l1Xz9tcnRdPC9fVF0wXS4iOj1ZcTtHLWpMS2ImLFQwR1ZCRCNtbyIq"+
    "Y3RbZHJ1MztMV0w2dCxTREhtaUkjXDxtPi8wNztBI1V1JkUqRWRAPV02UTM6JXVOIytBLixiaV9TJko0"+
    "KU1dJGwxY2wpMzNhSUdlVkxPOmZKKGhpTVtGQVpuTzFeR3NwdW9PaDs/WWVmc1RAIU8rcCcvW1dzI0BF"+
    "aVV1NC1EVVBFOFYtUCZlTlJhMEtbVk4rNXJySVwkJHBzWlNLV1AnRTgsdFk6dDY5M0lKZEY0cjZ0SVk8"+
    "YGZrPnVtXDBBW3RwTD1eS21tJ0RVM0NNO2U2Mi1xbUxeOU5GSmRQdTBfJDdFPjc4NWo4RklcMEAkQF0y"+
    "Wi8nWD4pZmpSLyVmcVNjUnJEZUhPUG0xRUdoIW9xJVRiIkIzUV1XLDY9Vj9HQWBPVWFOaTFaREE8PEZd"+
    "REJEODBvNFQ3TGA1cF88USpkV0MxbTtmKE5uQj1OMVZWVCZkI11zNk5tNGZYOWpTYWFAImBwUTVVbEtK"+
    "RjxiIWFYblxHbTZGdG5wI2IqYGtCRE9PQU9ac19YWnBgWERhYjxmPUY1X1szYz1MajpXSz5UIyddNUEs"+
    "Yy1nYXNTQUVTRWoyYWwlQm1zWDltajtDSGt0VSJEJy8jZT1tcTQwcGkicWhIYkxpTFUvcSdNW3JtLm9q"+
    "TW4yazU9Zlk4Mj9SMUA6WGlBI1MwUlpyLi4sRlxyIStQKUU2JklXL0UqOHEoJTdxKSgkZFg3OFhwLlpQ"+
    "XlFYOV8mVjduQlRzKU5uSEtNbkgxJnVBZEw9QjlWXz9tVmhiZVwoO1Rja2hrcEZPaG0qLCRJcEQiMWxk"+
    "OSdoQHA/U0klPUE5czdVIkQnb0l1SU80T2wrR0xTJj5qMVw9VlpvXF4qX29EMyUjY19jRTgkOV5TMiFZ"+
    "OG45RU9IUUZtbD8uRDRnUlw+IyZJbVNfZGVedTZVWCtTcWxYWGVwb0pWMlQ6Jl9eSW8nQVNFK09FPSRy"+
    "YWNKKHRFdVNfVU0kZC5pc1NyYlIrU1ooKkxKZzg7XCViaXV1X1dndSU2cm8yS0Zfa1lhYFVkY2xWYS1d"+
    "RygwQ3U/Vi02PUY6TUU8WGEwSCtUU2s+JUtTakNrNz9tKGIjK11uVzNvPFRuLTB1KTs1O3FMa2ZqKk5K"+
    "UkFSZTNaRlpLX2tObVBdYmouT0xVbzZVTGk5OSxkc1dWayQrK3BsT0RHWSVJXU1PKCtjXHRpK0Y0bzUl"+
    "ISlSNUQhTl5aSW0rTUAlODMtcVwxY0YjREBFX1I9cVJCUT1tJVpfaipVP2wzVCs2VEkkOkZBYmwqJGtP"+
    "L2d1a2oxSEMpNmBqIjZyPmZQWmEpaUxebk08WS51JWNQIS44J1I4SyZ1ME48TCElUW1FVm4rYF5nLExm"+
    "K209Q2taUUMvRS9BJDE5bEkhPTdjKW1aJiE5MERSS080RGxEPiYiQEo0Xi5iSzxUZ0o5ZkYzYG5SWnFl"+
    "aClLa0c4bXI3K21hYi1cLm9JKSU/OCdBYyosLig/KzBtYjtXWVVWJzRFN2pXW0FSJFxBI2VoKlFqTWBd"+
    "OFdaUis4LCclUW5aKHFMP0lqRz5RTzwlTl9UQzUlYUI4NDY7Xk0mW24mJHJlXzBxbSJEVj5bKF1XKnFu"+
    "XTkyQ2pFMlBnMipwKFsyP1NgM2JZQ2tlMzFCOztcSWI8VmQ9SCRmcisyajNcRltFTEInSV1mQENOZ1Qv"+
    "S1xrTzMiXmgsMitTJCIvO3MjLDguTjUxWmJaZzlPMWppS1hzIkZCMnMlPDxwVXFraD4jYjxcSzw9aVAp"+
    "OG5MQCoqUUVbUi4kSHArWDZPbGU7M0JDQyxwQ2xjVi43SCRBIiFJTi0zLGlfdWpfR1RQIVpoImFhWUhJ"+
    "RVFLYlpdQlRNclZiLCVVZl1BNS1tPmZoVVBpJm8odUwsMlVMOUtZYCNJXjYkZlIvJkU5Nmw9YldrTCc2"+
    "ST9oOENBMWA6X1xJOnIpVCdARkJZIyg7NDpUVVRhN1BDSUheQzotNzg0MjgmP1pKQ01WLW1BI21ZU2Au"+
    "RyRcRERGaWQxTGojYlRecy90YDhsXUhNUW9ZQDYyR2JBPj0kZEhvZixuW0xjMitDQWpZW287PUFPX1JI"+
    "WjYqXTM0ZTxNKGszXDpbTi86OS1wXkU0OiRWJF1RKmhHJ1NAKE5ac3RTIjpqdEwzanVoRSNlM1ZHLE5Y"+
    "TFFjPEFraTNhZzJWPEFcNyI8R3VmOXFZM2QyJjxbY11hTi5DZ0lXcWtjY2A2dGc+YVZ0TW9EOzpgKC0/"+
    "J1xSWTg9YTlAO09qcFw2LC1icWpcNkUqVHA5JCZiSk5IZz1TPGFTamM1W2A6P0ZQR3RqSWMlYTFmSEpG"+
    "ISw/SFImJEE9KV9NUilQa0pcSUFwJmU5bUJgaGFfL1dNLnRsTiI8QW9LUDcxdUtgQl5wJ1FlOFU4bzk2"+
    "JlJsJ2wnZ0hPLydeRlclRHNuMkhyZkpAbUlSOj9XYVBOTyY6Rjk+NHFyLnBRNDReYEdFZjw2K2NSQShn"+
    "TjNwLklgPCdhSGFVdDlzX05ZV1c+b1giXidpQURRaVFkPHA4J3JbZDIvQEUqOy9KYCRucFkrR1NyLTVt"+
    "MF5YIVVXQUMqPH4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTQKMDAwMDAwMDAwMCA2NTUzNSBmIAow"+
    "MDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMzIgMDAwMDAgbiAKMDAwMDAwMDIzOSAwMDAwMCBuIAow"+
    "MDAwMDAwMzQ4IDAwMDAwIG4gCjAwMDAwMDA0NjAgMDAwMDAgbiAKMDAwMDAwMDU0MyAwMDAwMCBuIAow"+
    "MDAwMDAwNjU4IDAwMDAwIG4gCjAwMDAwMDA4NjMgMDAwMDAgbiAKMDAwMDAwMTA2OCAwMDAwMCBuIAow"+
    "MDAwMDAxMTM3IDAwMDAwIG4gCjAwMDAwMDE0NTMgMDAwMDAgbiAKMDAwMDAwMTUxOSAwMDAwMCBuIAow"+
    "MDAwMDA0MzMzIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDA2OGI1NzU5MjNjYTRjYzI2MGY4Mjhl"+
    "NjVmZWI2NWUzPjwwNjhiNTc1OTIzY2E0Y2MyNjBmODI4ZTY1ZmViNjVlMz5dCiUgUmVwb3J0TGFiIGdl"+
    "bmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gMTAgMCBSCi9S"+
    "b290IDkgMCBSCi9TaXplIDE0Cj4+CnN0YXJ0eHJlZgo2NDQ5CiUlRU9GCg=="
  },
  5010: {
    filename: "fire_drill_5010_2025-06-13_Flat_Bush.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBGbGF0IEJ1c2ggXDIwNCAxMy8wNi8yMDI1KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDYKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJyhaZFZBNE5x"+
    "VS8xdWppREZQPEcmN3BvXmkvLjxbJk9zP2lbRjpxV2c1VCtEckdJT3BaVVVgS1VMOEdIYy9BUjtaW0JB"+
    "M2ZcJmd1JVdBaS1ZWj8oQ1YuOWQ2MDBULGBGcShFLTFhLCZSLyspOikiKFghMW1mQHBFVnFXWmRkNnMl"+
    "bkdeX2UxSkhwKlxTQEklTVQ8K11aOVA0XV9SKW0/XVAtWURdRlxkKD9iIkFHRTZwTyxaRm86QmlyLjBh"+
    "ck9fc3BSbFVtV0lhcSo4LHBAXiomQFZJLipHPkpRNFAoc0JGPVlPWkJrVkksKSMoYyJIO0peSS9FbSNM"+
    "Vl81Q29dYlo+ISVyMUNyc0dNUzBSQDROREQ1VkxCcj9nRkIiMFFqSHNecWohRmBrKmIkSE43ZjdqUFpV"+
    "JHEjXzxlUmRlXFtLZlJwSi1UPyMuN15ebkVEZCxbI0YvWmZaVktGVXFLQis+VU4kWXFaX2BwKTY1bShH"+
    "Rzw5dDs/MycvXGVnXGxfZXRDNEBPNGBqUyY8NmolZyxqS2hzZVxGYzI2Sk1nUmwqZjBRW1Q4RSFZISdk"+
    "bCNPamEpMDVvZWFPPycpJUpoP1kyNlEnJ3FhNDUpPkFxYiFKPWVBbzhFbDtRKy91ZTkvNkprJ0cnN2Mp"+
    "ZDwkMmdbRHE4YExbJWcxSU8lOEVJSlVxV3JGJ09yRm1zc3IsYCokX3M6KVdVSmQ5KDJXNzk0aF9wLk9J"+
    "WWYpZi8kWWpyP0FLTSg5JF5cVSwkO2UhUSxZTi8pI2o0OEtjWXQnOWclaUYsO10sTTxnPiw3bFI9LUVs"+
    "RyxwXTUtQGAiRE11dVhPKDgiZGEuSCdHNXNAIlc6P0lKJmFcQEhQWVhtMV5vIy1NcDlHJmovajgxKm1M"+
    "XFdjYGlNVXBoVD45N3JSIUNaXkpNWiNicStpdFZdKHRnX25VV0JTYmhUISktNj5DNnBxSHRBLFVrOi1i"+
    "Y1NPbEMyJiEvYEJQdFczI1okLkw/MjxQQUtLZUgnQChSaCJLanUqSDFEXCxxPyZzNT47TWI6Q2hCOXNG"+
    "Lk87JmNPWj8lP1MqUW5RWGpYT2MrOChUTXA+VS1rW1tRc24wZk5BRTE4NFlXOSo1L1QjV3JpZUFfVlRG"+
    "XW80aG5ATmIlXyROUFhpQEE5IlxSbVknT0NSUEc2JUxFb3BvWyE+YVsqLHVOLGcrKSsyXyxxPywkanU8"+
    "YiwuUEpHVWFgQT8xTUk/Vlk3XTFrJ3RyQUUuZENCXlk1JE1tUF5HYideOiViTSVORVNyX0kqWTg0PDdD"+
    "TVBhPVVQLkNDM1JyNFkkaTpcZCoxcUNiM0wndEZmImlXZV5RIzknVkdfb0FaVzZpXSVkKyQjOzNbTSNs"+
    "ZV9qSzNOQTxEcmNzPWBoPUBGVGEuam1qQixEUTcnM24+KVo9c0I8RSVxYEEzKyQ5XT82T1JPQEk9ZHBB"+
    "VnRxKl08InViQkI9QjFgdExqa1Axc3RrbVMvUV5DalBtYlQ0OThtanBKW0BKWChaVUljYihFZGxvYT1a"+
    "LTRiYGgmcVNTUTh0cHRYYWwmYVxmQ2olXnUkZTg2aksjMFhCdVJbMSQoVGJJUT1TcDtjQUouNzQkTSVE"+
    "XCg8Y1khSz4nOVEpaTs2PDAvcyQiVEw4K1MvbltPSV5rZytTLGBgMWZzZTNnRWIoXkU9TkE/Qic6Vilh"+
    "WUQ9VzIzXXRUW21RUV1aPiZkalRoUDdrLilWT2ZUaE5nIzVadWhDSickN2FtPFhyNiMzK2JCY0Q5Mzc5"+
    "ckxHO2c0cUA7RSNZWzEsTVEnaGZYYzhbKjkxPFlwMSYsJVNTX0I2YGlhcUJiKmEmOm1kWFY0NSprZXFj"+
    "dS8lc1w4XidsWmxPVWZYX2ZLdT00JmNQTTxERj1ORks/TitDUishYG8jbDlZTUVWaj5JXmIoYF5zPDpl"+
    "bCJGQlgnRUtNQ1RfQEVLNVYxNSM0Q0wsOkBNUTpGaTNyZ1xlaShcbk5YMm5eKG4sMidOX0lKXj5GQixw"+
    "XlQiNyIrTEwzX3MwKGEkL0o9bW1FZEZKWUEqPWNUaidGSz5KOkJTJWhkSV5fVkBDcyYrdVc0I0RmNzQ1"+
    "Vj1EL1cnOTcrWCsjYEFpZSVHNSpENSM0Rk09Zl0hV3RzaDwjZU01OjhJNUA8aF50TzBLb29PYFZjMzwi"+
    "KSNfPHI3L2FaS1lGYSlKJjItNFdrOV9CRDBNQWJCU2ktZlJARjFsPSNuQWdlLlZfMjpjWlUqb1pHQjtN"+
    "NSldOkcwYkI8UTEqZG9xK2EsR24pVGReLVpyNk9DaExKRyZlaGZWbyR1ajZwIiY3a08iNUFTRGpCYnE9"+
    "YlsrOGdyKTJ1YkMjaSg6JVBJN1ReNUkhVjZOJVk2ajA1RlglOjVtRkkpYkE6Z1ZtW1BNXXM7QW5NdEA+"+
    "U082aGVRUUhoVEdDRXVoKm9tIz87c3MmWFNGRFwzMylvWU1sPihWSWJDKjRORlBFcGUkPGQwczRmO0hI"+
    "YEE9M1okcm5ySHNoTC5UbzkvTzVaXk4vOk1YUUAqXEBZVFUoOy9iVG1VL0JqNDJoVUJxV0pxVkVocUU/"+
    "L1lWS0xLaSo5MCc/ZGBhPThAZSctM0lURWl0Yk5aSVQiK09UNCxuSmhWWSpDJkRQMTovKHI3R2U/XW5f"+
    "T0w8JG8jV19ANElxNTU3Y0VxNEI5SC5BVFtzZnFoZWNrOlUxMmxVJ0N0XThTa089NVdmZ1omXlFMT0pL"+
    "UiJfX0M4K21MWlFdJjZhJ3AsUktWQCIrXzxoLVg/Qm5SNDhvM0xuNTtxb25YcXVIJVByQT1AK21mLCRh"+
    "I2JfYWhhbnRwXjJnWFg7bExNQ0hQSipLMFhdcSxBWDFcTlpBKmVdMj8+QE5lOmczM15raCFhKzhFJXBe"+
    "YC4kXmBdZykiKiQ0QT5yXl1RUHJoOypzS2xqZTRrJkAiYCI6L1hLM145KydJJC1ua0UjLV9tUlRvXW9H"+
    "ZDdWODRHMzFKS14laDAtP3RAWUZjXjI+QDs5YmRqTSNCSmdORHNjRGNMdDJhMXMxREswQSsiNDlwcGU7"+
    "UEUsLWJFZypUYWAtVVJYTmpHO1JAPUpVNTJRaihKS2JnLD5KPGshclc/WSIkLUtJK15xRVM+LVc6RDYl"+
    "Im51XSU+bT9TMlxgdHNQZzVgZGYlPW1sK0hEa25kaTlGSFZcUkdDSjZdQitgI2ZRI0NxIzBLOlZCTC5I"+
    "ai49WVxkZEYmPl5tTnNHNDIvKkQzOSwiKG9iTVkqT1RwMl1xYCMqaDRYKDxQL3JlSDo6Z1U7UEhsL1lc"+
    "TS1rcElncWllVyRLYz5KT14wNEVpOiw+clgtMzs6dDxnWmo4dHJucj44MSxoNWgyW3FvcSVSLEknWWVi"+
    "clVzb01UMT5wLlc4S1ldY0JTZkFDXS9vQ2pOPy9CSmRER0RAa01RWWhyTW4yWGliMEZVSzkiJm4lRWdo"+
    "WmRfLCh1JFFnMGktP15Cal5AKmohPmM2MGQ0S3RDQ1VgOlUtQi9ySm9ZOkkpInRbbCJZQSVJTWtwOyti"+
    "XTZmPFUrZU9SaHIpQmJjTlRnb15JbVUpbyFMKHMqO3BFJiE5Zm1+PmVuZHN0cmVhbQplbmRvYmoKMTMg"+
    "MCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMTk2"+
    "MQo+PgpzdHJlYW0KR2IhU20+QXI3UydSbkIzMyxkJyFMPmMuLHAraUZcM1s/LSVbNUNiaF9dQk1LOj1S"+
    "QEpDSXVfP21ydF08L19UXTBdLiI6PV4qbDAtaWpqUCQrck80KVoyLVBOIVBHIz5rclQqLl9kaipKJmRh"+
    "Y3JFJz87WUcvUlFaV0pGQUsjazdlQ1llVVk5NHJiby4jK0EuLGJpX1MmSjRyKGUkbDFjbCk7YENvblUt"+
    "dSlUVnMtWV9uL1lgQmprRUducWJsZyxDPzxpWF09OnAkSy1GWT4lamEkLEZWYkVIUkVuLmkvS09fODNn"+
    "InRfc0JNK0l0V15taFMrUmljY1JONjlgLDhsXjtBcy1RMSxBbUk0OlpsP1w5V2BdOnFcQGIiQXBWWmEu"+
    "KVotaCksIycjWDZCOzQrKUZSQjIoUy5caEInTUdFZmNKQz50PEVDRCY2R0gjOFg9bFhcdDElUlFsPm0m"+
    "NTJZNyVMaUFpZVQhbFRJJE0jYz0nRGQrWyZgXWxBVG04NUZQQUNlSDhdZzhfKFdPQHFLOk4+XEppS0BU"+
    "OWs6bDRJYlhtTmwvP2w6MkpIJzVZbnJqMWVEaVF0YnUtMWFcS2hhXl48JkJcLCUuPExoLm9iaV5pbGYv"+
    "O2cpPj4zMDVzZjpoOT80Kl5aYkQnPDZnRydbZjoiRGNQOkxhVkgzVUclTlYxbiEuQSlEXUUzPEQmVWYx"+
    "X15ZYm0oSFk1TkhWJF5BJiQ6b2VYN2BGJyJiR14mXUIqNyFENy9qPE9WZVZEOGNTK0ZyWitOXCNfTDY7"+
    "OkssPFJMbG5jb05oKUNDMWtCdTM4UlYoU1gsamZdZGJBWEs5VCdMY1JVYltMalExPEQ9I19gTk0uM0VH"+
    "VW1gIi5yb1JsL11jMFRGS0NTZyQoZD1vZG1LSTlaXUNJUmo1dHJqXW5tZjskK1s3VSFHKyU9QTlzN106"+
    "KThIQy44OFQnQThXX3NdSTYpOS9YXkhMUW9mSDJZJVdCQEZfLFBvY1BkSkhuIVgzKlFgXnBSSy5YNGdS"+
    "XD4lVyNgW19kZV5oNlVYK1NzL29MWXBvSlYyVDomXjNJbydBU0UrT0U9JHJhY0oodEV1c19VTSRkLmlz"+
    "U3JiUitTWigqTEpnODtcJWJpdXVfV2d1JThIbzJLRl9rWWFgVWRjbFZhLV1HKDBDdT9WLTY9RjpNRT1M"+
    "PDhIK1RTaz4lS1NqQ2s3P20oYDt1TW5XM288VG4tMHVSRyVsR0xra0JVTkpSQVJiWCtTUktfa05tWnV0"+
    "Nk5PTFVvOFVNXGlBLGRzV1ZrJCsrcGxOYVI9KVZ1aycvUWNDcl85WUhoSUQzNS9FPE9WOUE/aCEjXylP"+
    "SSVwKmpHaiVnX2pIMUooUk8vQzJIZ0xGXC1yZUl1OEw1WUZHa2JPWTAoY0pLTXQwXENhOTE+X1ZOTG5c"+
    "VypBbj9OIUpQQDBFPFhkSCkhVmpDM091LHE+KVtlISkwaFg4QTZLR1g3Jj5eXllmRkg8Y1pcWkwtZ1Zh"+
    "UjM/LWgsVGA/TWxeXENnb2xdcUsiNSYuQ11rVypma0FERW0oXWxYOU9dck9XWi1UOWlPaCY3bygzVClh"+
    "VWxCLyYrOlFnbWVfPkQuV1VDdTkmMVFcTy9RUSZAPzwvLU9aOUc3LDkoKVdxQlxAOTJqMjQ3S20/bDJO"+
    "VmZoKnM5PjRGIVlbcTNdOSZuISRhJzgmU2Buazo2YHJZUzRuPWVdKHAobGooMCFaZlNwOFVZL2hxQyxM"+
    "PTRGP2xfKGdjYEFHO1xJYWlWZD9eZWcjcV44U0ozXjE5bjQ6S1VOSzhTVmJJdWBAcmFFSDclPDpMXnNw"+
    "YW0tQGxPZjtuYTE2ZUJvMF1bJihsLUNTTF4yaVduSCwtS15XOXJFKktrOVhHJC85O3RTPCRFamZqYzI4"+
    "V2RVXC9vYSQ1Uz9JTE1LZlltXi1YKTFsKT1SVmM6OyM0SHJkU286TDoiVkM7XzpbSjRoWmEsMDEoX0Em"+
    "X2xBdEs/VTdyTmgkbWlUNnI3IUVGYDAhNU5hbCdfKlBjYVNmWFhZI3M9YGNjZiInaCpxI2RqZSc2YTpJ"+
    "NTpAdVplLD4zZmoraVE7TiUzM0VbVzJXZDAiRDxMMzM6aU07J2o9QERxIzUmTmMwXms/MG07XW5hSGBf"+
    "Nj0ldHAiTG5RQUw2InQsRzxBKTp1dElYPl1aSC5dPVAmU25dLWBHS1poJSoqO1dYTWlFOFkicUtYZV46"+
    "RTpuS1BOY19RbE1haFc4ST9oYTk5WT5WPVphZU1fW1RgTzhMSCdBNm9hIXA5MShsblhNL0hqTFNzUEM2"+
    "ZG42Q08qI2FybDtNQzBOZFNRR0Jpal5RdVw0ODw2PyssZUNtYi1SbXQ3czQ7L0c1TkVSN2Yvcm5FRWBc"+
    "azUnUVhyRWVjNFxkQGgvVVdsYiJeOlMnIi80VlglcGNFPV5RPEwiJVZtOCkiQS48ay0xSUEmLVQ7LEhk"+
    "SWVWdSY0LGdrW1U3PVE3QExeYkA/ZSE0LiRwREIhJm4oPzF1bSxdPSlEVEQ5MnJgV0czbkA4RWBRaEQz"+
    "VkgtTSU8Kjg0OyheXlVOVFAyMzErMEFxI0hXLlhhUzNBXW83SGFNKmcqRTpiNkhUP2hpfj5lbmRzdHJl"+
    "YW0KZW5kb2JqCnhyZWYKMCAxNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAK"+
    "MDAwMDAwMDEzMiAwMDAwMCBuIAowMDAwMDAwMjM5IDAwMDAwIG4gCjAwMDAwMDAzNDggMDAwMDAgbiAK"+
    "MDAwMDAwMDQ2MCAwMDAwMCBuIAowMDAwMDAwNTQzIDAwMDAwIG4gCjAwMDAwMDA2NTggMDAwMDAgbiAK"+
    "MDAwMDAwMDg2MyAwMDAwMCBuIAowMDAwMDAxMDY4IDAwMDAwIG4gCjAwMDAwMDExMzcgMDAwMDAgbiAK"+
    "MDAwMDAwMTQ1MyAwMDAwMCBuIAowMDAwMDAxNTE5IDAwMDAwIG4gCjAwMDAwMDQzMTcgMDAwMDAgbiAK"+
    "dHJhaWxlcgo8PAovSUQgCls8YWViY2QzNTQyNjNkMGM2YmE4NWQ4ZDFhOGU4NTBiN2I+PGFlYmNkMzU0"+
    "MjYzZDBjNmJhODVkOGQxYThlODUwYjdiPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVu"+
    "dCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMCAwIFIKL1Jvb3QgOSAwIFIKL1NpemUgMTQK"+
    "Pj4Kc3RhcnR4cmVmCjYzNzAKJSVFT0YK"
  },
  5011: {
    filename: "fire_drill_5011_2025-06-14_Titirangi.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBUaXRpcmFuZ2kgXDIwNCAxNC8wNi8yMDI1KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDQKPj4Kc3RyZWFtCkdiIVNuPkJlZ1smcTlTWV50WDBWQ2AlQVpJ"+
    "RyljIk91U3BsWStzUkdoNlJYISNociRBO0MvO2JdWUFuI2kxMiZEYV02VmVOR0xCUkw2cj9cXik3Pkom"+
    "VjFKI0oqLkQxazsuNVJRNk9KdWxqY21EImUnai1lKE4uOzgkbycrJHFvazclbG9NVmYrSUtoYlMhIixo"+
    "QixgKiZBJXBISGI8YW41IzxlTHI9NmdoaVQ6Nz9JUUA4Vl5MOFxXL15GM04mISU0KWAuV0pyLmIpNU1h"+
    "b2JtWXFrMS9YV0NEKjhOZGNYPS8yTjtHUUExbUUqP2JYLF8lY0FmQT9RLTFRdWc0bGliMCskai4jZSxJ"+
    "bm0tb1pWUXFWLUtzSU9pcFVSUyJqTEFBTEtiMWRZaENQbUZyQEhCQShPYClPVStuUjBQUlptW1ZKUz9P"+
    "Ty8uLzM/dURvPkw/WzxwcTtyJVNPIkxQMU9LQ2QuMUc1QkgwMkNkKExhSTUoIlw1OVknbiIjTmcvKjkz"+
    "JyZkKUBETk5oZiIsY1FZLEIvUVEsUT8mWCJLMThuSVl1NGZZNlNcZSpENSxiTGFLO0VNOzslRFcpLzRf"+
    "ZSpSa0tURnJgajMtWnJxSzRqcDM0WEZjQDhxVW1CO2B0aTtMMCUmVjlgKiJcTz03LF5iLHAoQDRtcnFx"+
    "SjheXU1mdWl1LDhSV2IkZFczTDNKNy0xITM2I1xIMlozJkc0RmYwPnUuWGY/LWF1bDo6bDFVQCkmbE8t"+
    "ZW8lalVmMV5CbjMja0NbVCZqS15CLk5VTGUuYllYPEBHYycsIUQ5QE4lPlBYW2EvakYmdT9rTk5UL14n"+
    "O0BUKmJra006TD1tP0NyPjxUSSpaXWFdRUlkVGJOVE5nPj5qLER0Si5CYUpidSgoYm5bQls3YEM1MEBV"+
    "bGg6KThXOCtVX3UnWW40czpzQmk8IS9XKlVFYiNvOUdtSHJYTCI9aiQ2KnFeIjtmUCQtMyZ0Qk1ha2RB"+
    "V2tgM3FsPGJwLVYiJG9KcV4lUFEtY21BJD0ycGVvVy5bJTBSQT5SNSwlVC8ub1A6OWxpYy8uYEJuMkZy"+
    "SWRBdFdSZ1M6QTJYRDM6ZFQ3MU1MMDUhWnFIPmdtXDBoMyc6XjsmOmkkRnNIKG9qbiJzMmhiZTNUN2JS"+
    "IjIpMGxfK0IvXCc/XV4rZ0szcmwxLT1VWEBGJUZYQmFVNCZCK18uUG4scjopOmI4akw6UT4yZl5iJGYy"+
    "XihWSkNoYWVAKElTcUROMlo+SlwtVHRIKlgrVG9Wcj1xcFpfbmhsblgtP0lZbkEnbUhcc2Q4PU0pKl5d"+
    "V1M/PF5kT0RwQWc2RDtPXjBSKilPUmFWXHJnUSgvaEdaWSc9XCJtWHNUTWNyTjRAN2wvVUVXMW4iUDVX"+
    "aj9NaChCRU5QUFhiSzMrXyNROmdSOS8vUDInRDBCRVYscGxKWDAiJzZLK0RAMzI6cEhsbkBVXylxc0Mr"+
    "ODlNS04lNnIiVjpuLDBqKmRMYCEhNi1UTmAxQSg7Wz9lcGIrSDlTNjQjPzRQQzxZY3AvL0dpTFBlQ3Aj"+
    "WFRHVlRQSGZVcVgxLXBcLTxKPExfcF4iIjhtVS5fVEZbOTs/JHUqJVZiW0JvJCstJzouNl5jKFkpVydd"+
    "SzhlKlxlYDldMTg+XllFRVBmWCtJRlRtIjNpaGMwS107aEAtMkYwTGZdMl1sUWpkU0gmZTFPYm9sQlcz"+
    "ZXFnRDIvcStuaEArJHBNUkwzakxHUzInaSFhTEhMLDJUdSFHPltHciU3Nk5nPThQJ0NEPHRIPkZmWk8y"+
    "RDRgVEQ9QEVfNlUwbG5kXTgoXjJoTXUsam1QcmBgZU1rLExaQz91Q3Qsa0kwU2w2KmdwcDczbW1FMjlY"+
    "aCJASCc/WHEmSSdzcT4jaHA4XiRAczU8aFEzITdfdSZMIjsmRmVUUm5SbzNNLmdWcCY9dDdMMSJdJVE+"+
    "LS1SPGY7ci0nbGlzbTAvMW0qPl08L2xXVkFmYG9FZEFGOUFhcXV0J1BvJ09WJThhcCNJXmhOK2tWKVBS"+
    "XCFgOG1CZiZBWDkzPS9FJjVpSmEoYTwpSChZbWhURzkqXWc6YDE0KWFEcSZcTzRVckMoITlRcVonU0Zj"+
    "QTRNa0taUzNmS2kzSkg2TElNIj1WdSJWLztNIlEwJmNcKlE9MkxJYmBzZGBTbV1IXDVLb0dALiZWSyki"+
    "KUgkNnMlVVByOU82QG5dWW84NSpCZ0pHZ1skV2tkMVM0Vi5iRV82WScsdUFXKCJgL1RsdU9ya2B0Q1gm"+
    "ZExkTUQ0ZzhiLWY5YjRvOjoraWhoX2c8OiszPCNmWU1xXyI9LyI2YFBMWkpJUFojSkxDOkc9O3MoXGBR"+
    "OWJOZmtyOzJULlxBKU5EUCZJYFBpRShSMSxgVkZGLSJwIyRVTGBvY0ksclxfQVpXL3IuZitFbWM/ZCpv"+
    "NCMsKT4mMkIoY3BCLlNMPCpRNyRkKSdDMjRqbVk5PTd1M0A5RksmWF1qdHRlT3FXbjhsVnFMP1d1VVo6"+
    "KDc9ZGUuNi9EcEZIbHJLTW51ZGtWP2w1bC0tNlBVR3JIVGVHXW9xVjVsKHFdS0RbaiVGZ2hNKEMzbD4o"+
    "JjdkS2lSVGBkYj8uYUtkVFZJcF91U3FkY0xpcXFIN2MwIXE7NmkrbyZEKTNgYTtiXFcmJ1tea0dvOiNF"+
    "ImgtKHIjczlcU3FkNj08T2h0ZVJBPGRna10/c19Ga1w9M1c3WCI7S3RPb186SENRZFgoOXRZWU49Ik5y"+
    "NEVTJWVOa0ZoPzUqNTMnPERRXzZHX3VcQCE7TmYwL21aV2A/dCxDKy1aRUpkJlQtRDksbUkpJjllJWZp"+
    "JToqR0RpayNPJXBaNyw8LC4oLT8zUTM/OEY6QG0uOSQoOWVoQm1oLUBnWi1WRC4zTihmOSIxNG5sYCRd"+
    "VlpIWGxzY15hcmZONi5OY1tcVi9kZGsyODlhKiwoKUlsVzVsU1ZyVVUqTVMlblUuPUJEdDVxXFxTZi8t"+
    "VkhcTDFHaUhQNUAkQ0YjSWpuZTNeQyM6SV0/aF1qSzxCalJyclltcEUzXFVVTSNnI2hOJSVFU3FHJ0NX"+
    "UjNIRVo7cEUlZEBYVnBsYSdLaCw5NmQ2a0Y4MGxQRi1sTU1vMFokNTs/YkxUUj5BciplaEpHUXMrSD5e"+
    "a0MwVDsiWDpLVSR0TEYlK11lYmczZ3BARShrYGpGN2VaXFBxXVpORWYjZWZJbVcnS2gmXCRkSCdmKGQh"+
    "NU5hMCJzKnJOXlBaNExHTD5dYThDVEljbEVPKVNYZFxYJGU5XVVyXSEzUWRXMGtLMDRXcTBeWDBJTmlq"+
    "W0pea1U4YGtzJycwbVJlMDpsSCQ1MktlYUNVJSlEZ0lSZkdmS0dlJHJNSCUsODAuTkJWbjovTSFDSG5P"+
    "bj1PTktkRWE6M15mX2A3UmZpJmRpKiVLOzlzIzhdc19laVJPa1x0UVdyJjFnKzBkaHBETz0xOmBhUC07"+
    "X1gwcCd1JCc1bS4qITpqMjYqRjdzZGM0WjJVMmUsdEtiXiM5Wj1jMF0hPWVmPVYvI2kwJE9Xcm9kdVQ9"+
    "dEtoQGY+MltwX1s9Wm1OKTZ1WWpeJUZgKERAaGYmKysmYW0vfj5lbmRzdHJlYW0KZW5kb2JqCjEzIDAg"+
    "b2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDE5NjAK"+
    "Pj4Kc3RyZWFtCkdiIVRYaC9EJSsmQVsycD01NyNkVTEqZ0c7MHMyLzF1MiVEbC5SJHBMMShVTTc0MV08"+
    "YWdJcGpxPHJPVyM7K1giQzpibystWlNMPzRSbkdVYHVlKGsiLGFqcEg2NW9gP0I9JTovSGEiJDFdXHFb"+
    "S1tHLlYoYGUjYkBaQDBfNm1zSmVwalBKMWkhIj9HRnFbPUk5ZExBNUYhVW9SK1dhL1lvOilLaFlOKS10"+
    "XjxfMSc8ImU8TzxAPXFgRElFJitMZldRMkdcW0FfOV0wW2pAIyNxMEJWZS8iUmI+XkM5JzU4ZyhKXHJt"+
    "IUM4UlFaZjwmKiptUC48bypXSz8+L1ksaFU3WWg4I0dbVmRfYWpYbEM+aFNVKUMscFA8JGJeSjxmOypp"+
    "ZVx1cXVKPC9OXSNgZDclZ3VTOlxVXWs6PzEhWlhDRGNORyUsYjYpIzx0Jyt1UVxuaDBlU1tsITFaKmkx"+
    "QjBeYi5GaG9yXzlGI29rXWVgQGhKdU8mUVM4STttOjs9Uzk4NUZQIUBgcW1bUz8mQS41VWZpL2VeRylb"+
    "JiQxNV8iZFElO2ZAcDVZIypxIVxRbVsxPm1DdF49bTw+XE89WWNVS25VNHIjIkpMYlhYWy0lQWRbamRr"+
    "XGlsVy1TOG4jZipALW1DZzJzdGc0bVAvLWUkWCcpRTMwRjY1SWxLLlguSS9ta0ptMkg5ZHVdajVdRWtG"+
    "MVNjaCRobSRkSDk8UzUwQmJpKzQ9QVlFK3IyN0BXbkRgaXNWW0dJRysnaj8qSnVdRVdiT15ZPDAtRiJ1"+
    "UUByYz5iPTRURiVKImlNbTJAPSsvdWNgVi8jK15FT0NrWz0xLjwkLSZFZT1RK0E9IWNhJGxNcDprXFFJ"+
    "aF9TTk47XE07Wj5ccGlGRjJCYidUNmxJSktQQ008amFGSzU1US1LLCRpS1EqczZicEhyV2gyUCdmPkNc"+
    "MV5wYW9DJDc3NytKLFNMbEdOP1JLZGskQGczVzdCVG0/VUJSYTdqamA+VW0lTT80PGNUUS49QTU0Okxk"+
    "XW09RWJOWGktXD1sVjZXYTw/WlZnVjdPMTY5XTAqa1t1ZShYP1MrTiIxVS1OM2xCSjglJjgrWj5GPStN"+
    "WjI+YXViVlhPclpARTVQNE8rPUZhJFouMj1QUkxqbzk7aCJGPUE9a2FsTEJmJUVFJF5lOUhmdE9CXyhp"+
    "WHJvYlhETzFIJGItXjBTKC1IK25EZlNYOExGaHAkJUFaJi9lMzNqVCprJFxbJyhNQWEkXD8vJHAlOGhE"+
    "bGImZE5cPVlAKkFfaWg4WklCIUpWMlQnOyVHLWJ0TW4kOCMkYXA3ZygqU1RQSVpPRjVjYmNLP003LWlf"+
    "bHJqMyIpOTJoRzRuMjNEZVVjZ2JjLHQlZk9EIjY+W2owN187IlYmQEkpLFA+IXRLc3NMRnBEJGhoVWEz"+
    "Uzp0Wz4sOWE6aTZaLD1IYWxcLFdsUzs1MDM1KVJOMSVUK0xATWIzZmc7I1smaVM3SWlwNnA3QFZIPjFS"+
    "My03I2IjRS9FUSgzLVlhJSkpWWFTZmVHKTddOV0iXG8wZ2wia0kvWVRgKUo3YktqcykmLmlER1E2LSlv"+
    "XWVeKWtaWHJuQ21oVG9JXyIsYE5GXC5CSD84MnVOZTA8NlxcNkVLRzFzUVllQDlUNTk0Kl1WTmpTdCtO"+
    "cDdSal8qXiE+Z0kqQyo+R0tNQSQiKT9gUGhdMm5cWVFNYy1WaUFDLGZfOC82Vm9zLjBmNE5XTD4rKmUm"+
    "VjdnS1AuYyQ2QTFhSjNjRXBEMzxTUidAR1hqdDlXRXNVLClFYyVvaW80X0shR0QnNGonO0cwbmRNJEJN"+
    "PXM4Rzk0XUIpW2chbUlcNjkoO21wWnJVTVFQRF5qOlkuPjE2TE4kU09DWSkyQCdKLmxDZzMkJTYkJkZO"+
    "T2BiTUhmc00hQWIsXjs1O1knTnFjZ11DKygoZCo5bUYoVCZUIytlMl5kaT0zQFhxViFWbUBlL0Q9JWxd"+
    "MFs/UWhOai8tPVhYajU3N3JMPDVoNENqL1dyYlJKO3UmJypTTCRqU3FlQDtWPSc4ZlNqbEYlQF9IOllg"+
    "RGs0OlE+OzlcWEhDLS1FVG9EJ24uR01GWjBGWEsyJyhWPT40cChCZyk0OiQ9OltOLzpjJD9GMSp0TyRj"+
    "XSglc1cuMF8wJkJ1Y2FxVGAhcnA4b3FhSllHLCQwXDtUJiZFWXNoX1phQE5KZidaN1hRPClENk1YV2FC"+
    "OF0uOGpnWVFPNk90RT5zRC1lXG9LMm0hYEhBNjorP21pOCowRW9cZFV0QlRvUl9wNVdBWFlBL2wqbHAm"+
    "ZEBCYm4hPjBGVWdZMVAuIlslXzZDV1lDJlxrPHNcaipOPiZpWiwsLUoqbE0hNldWJ3Uzb0VmbnFzIjJJ"+
    "NHU7L0dvaFJKJ3ApLSw/U1d1V2w7KSstTEEvdUwvcEFmdFE5Ol0pTmc5cSgnTVkmU15IOXQ9XGlZSm5k"+
    "RkMwP1cpXEt1PixzaGVSX21KYmFCKHFQRzJUMERgYCdMXyJoQUckMlpPLSxcJF1sbG0tJ2AoaGxWcCQ8"+
    "YlI6V3QmVChoUmhIJitlL0AsL3NjZ1wpMipZPnUjPW1idCY9LTxpTHJXQlAuYz5Ofj5lbmRzdHJlYW0K"+
    "ZW5kb2JqCnhyZWYKMCAxNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAw"+
    "MDAwMDEzMiAwMDAwMCBuIAowMDAwMDAwMjM5IDAwMDAwIG4gCjAwMDAwMDAzNDggMDAwMDAgbiAKMDAw"+
    "MDAwMDQ2MCAwMDAwMCBuIAowMDAwMDAwNTQzIDAwMDAwIG4gCjAwMDAwMDA2NTggMDAwMDAgbiAKMDAw"+
    "MDAwMDg2MyAwMDAwMCBuIAowMDAwMDAxMDY4IDAwMDAwIG4gCjAwMDAwMDExMzcgMDAwMDAgbiAKMDAw"+
    "MDAwMTQ1MyAwMDAwMCBuIAowMDAwMDAxNTE5IDAwMDAwIG4gCjAwMDAwMDQzMTUgMDAwMDAgbiAKdHJh"+
    "aWxlcgo8PAovSUQgCls8ZDZkMWQyZjY5NDIxNmYxMTU3NmE1YWI5OWRmZGYyMjg+PGQ2ZDFkMmY2OTQy"+
    "MTZmMTE1NzZhNWFiOTlkZmRmMjI4Pl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAt"+
    "LSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMCAwIFIKL1Jvb3QgOSAwIFIKL1NpemUgMTQKPj4K"+
    "c3RhcnR4cmVmCjYzNjcKJSVFT0YK"
  },
  5012: {
    filename: "fire_drill_5012_2025-06-14_Panmure.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBQYW5tdXJlIFwyMDQgMTQvMDYvMjAyNSkgL1RyYXBwZWQgL0ZhbHNl"+
    "Cj4+CmVuZG9iagoxMSAwIG9iago8PAovQ291bnQgMiAvS2lkcyBbIDcgMCBSIDggMCBSIF0gL1R5cGUg"+
    "L1BhZ2VzCj4+CmVuZG9iagoxMiAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRl"+
    "RGVjb2RlIF0gL0xlbmd0aCAyNzA1Cj4+CnN0cmVhbQpHYiFTbj5CZWlBJlVyPzhSKCcoWichdWlfSTso"+
    "KnRHMnRXZy5Qb1VISE1SVVIudT1gOjBFPjRDclVsXmVnZHNhVigmQmJFLjErI15ALT1nT2hvbFIkSmAp"+
    "PTteWEVKSEhpZHNMLXI6LDNIX0E0ZjBfbCI3YWpHI3NbJW5EW09qbUdyXDtFPj0vKz45YC0kRDFwMzMh"+
    "YDpGb2YmQUdlbic3VE5MLjc0Y1ZiY2JtNDFGRXFIUGJqJmloIjMqVGImSiRiIS02YihJQEsoVVhzZ3F1"+
    "IlglZ3IydEM6SmI3b0ZHM0UxPzYuakJ0K0pJLD1LajtSSz5eLW0kMGljaUVTKUQqJHU3O2hnUmZkQDw9"+
    "O29JKEZWZ0skMm9sXlZdJT45XHUubD43QEw4Zyp0KS4xPkVeajRBUlw1SmpbKWxVcSUsblhwa3Q+Nkkz"+
    "UjROIU8oYmA3ZDhtaGNoTmYpKVFAc19sKStSX0QlImMyal8oYyNdZ2BcXDM6c1ZtSFlSM1VwVGoyXzIx"+
    "PmAkUCNqNGxiOiFEKT5APzcoK1VoKEZaRjhzJWtzWnFwNU9QQWhuMSU8PzJXS3VLcV5xWktnV29rUyVh"+
    "Xls1J0RqRVlLIidAYkJXWiFGUzMpW1c7JjNwOjc6RT1rdTcoRVQ7VFglTHFyRG8+blQ9XD5WXVpmWlFZ"+
    "I1VnQVVgKT1OcFVwNTMiJzYpOXUjRTw6dWxZTWs8SiZiPjIyWTFWV2oxMVQ7V1ttMVBfOnJPKmw+bjEq"+
    "ZGRETTksMG86LmJsO0wtamkndTsndS01RDk/X1hLS1s4RyJUcEJ1YWRrNFloZj0+dWRqXFx0ME9pJkVT"+
    "N1BoUFV1RGJkTFhATEgpLkFFO1drWitsblwmVkZlLl5sV2Y0JCVaO1VXK10lSiJdLEA/XkFVTCxHOzM5"+
    "K2Uoay4/VHEkR2lZNVkmWSwlYj49NnFFTWY8QyQzN0NgczcyVWU8KktKRj9FaGhuVUNvYjg1YFA4Ujli"+
    "KWRlXVJPJkxqcls2WVZgaiZOMnJmNThqQy1GM2dlc2skIV90M29BaERNb0VUT0Bbc0M2aWZqKGA9Ri5S"+
    "LStjXT1DQD9PXDtOUV87V21TK1ouXWoxVyZRZEUpT1NpIkc8V19KUGxYVFUpOFZcTHIiaiZlYnJSZTdo"+
    "J0ZfIWZRLyJ0LTUsRURMbm5hdSxaTktjRFYwcEJzQm9eaXBnVzo2I08kVmhAKGNvZTo0WGYoR01vVS4k"+
    "c3QlJSlnRSQhS2dKcS9TQShCQ1EoVzNoKiJRNz0vWkM0L0JiSzxUUl46M25GIT5FQlVbUEYjQTJKPV4u"+
    "U1YtdWtXMlM1VmxNW0JPOk9fWGNxXFE7dEsiQS5xWWxybkZyT0AmaWsuM1pGb1ZpdWxjKCRII2hVZyRn"+
    "VTphOlRrXG8kOVxBaTBMaTA0LlteQzBaVk5HPSllLEpiJTpzTV9LP0RbYj5dIjBeakhxUys4OVA8JScv"+
    "Jm9VWTdjKmdPNVlXQGYwPF9OYDFBMDtbaFNtcm5NISM4O09kR1hOK1tiKk9WTVpXOUNXYUJhTTo/VTFm"+
    "QkNaW3JRKixAWzFtZFp0U2EhJE51XCZjRGgySVE7RzVEWmtVYC8paVJkaFBcTFxVVyxZOVlwYHBYQT9H"+
    "Q2kwUFRgUydWIThTQWdQRS0qQzdBaFZQanFecFhLO3VxKThGNVFUTCoiLShuTmhFPzdlcD1RaFRaZS8u"+
    "Qmk7ZFMkPz4rOWF1VWUqI2hwM24oMlV0OjJUXVwrN1AzJnEsO0ZZMypMQ15vKyQrLVRlb11TdTkjXGZL"+
    "XDw0OVdCSCNYVCEwNiZMSygqUkQ2cEorbDhkZWQja1EtP2xmbDxeZHJBNCxCVmldIlZSY2NyNGVlM2Yl"+
    "cmg+S0kmXFZRJnJKcitxP2NecDAuVid1RnJySGE/VCFwKT43X1VLUk0jRFh1TyZWUk05KERVKCk8OSRC"+
    "Y2llbWMkO0dcNTNgQWo/KDFuOCR1OGhYKEknMi1pRm9RZF5UVi9XOVk+S0NDSVwuQiZWXUZtc2hMJUg2"+
    "J15Ha1xsYV47b29HQS51US9LXE4yKVw4TCdQY1U1MFQ2YXE6UEY8O2QwaFpnV0dqO3NjLWZhXFFmJVk3"+
    "a2FTLlRuYCNhPC4zTlB1Lm1LZmtVKlA/RzhuWjVgczpHX0AvMj1sb3VFSShWakNZW01uckFyR2xCQioy"+
    "cWs0U1Zwc2srbD47RjE/PUFCbWkxLG88cGEpQEMzc0haSFZ1XFtdPnRbK0RPS1JoKkRPRz0vTWxlKjs4"+
    "WClIYkwvYUhtYSpdR04vRkctYXIodFUmNWc8SGgzZD5SKWtPLFk6ZV83W2w9bkU+VlFWckFcSypwKSZA"+
    "MCdTbkIzTGswa1UobUJdRUNFXUUjWGBiKC9oZ3VuPzU3OFc5RFpTWWFVWWY+ODpxLUNGSEdESiEhSCpM"+
    "T09YZ1I6T0MqQWc8STpUSjw3OmRkXVJhNk09VjptVCwqKkYwNld1Q1c9SlA3KFZRKUdWQjVJXGtrU2Ek"+
    "TiVYPDVYaisnOVpSJjUpbW5UVz1sTlZfYlkuTzVeWSxVKDIpYS9qMzUxajQyaF1ENG9KMFZFZEMwPFQq"+
    "Y0NMS2lCPy9uN20hODhCQlsnMFZeaTNuTVBjPV9pXithVCRFITY0Zz4uKDRUSmExUyRmZVNNIWhIbkty"+
    "XjhyLEojZ1QkRHE1WClSbjMxSitQWWQtVitLbiRaKE07NmF1ViRALW4tLyJONXE8TzIjaGZDSidiNiFh"+
    "aGZsRUhDVERpIkFpWi5NRFNVJC1XJDBZQEBvPS9JalwzW1hCYistWkN0aFs7VmM5LG1KVCY5ZSZNa007"+
    "QFZuInBYSj9iJ0BYV1JNNDBeQnRgYlIraCknO1BzKVFYQzdcWTlgUDg5OWp1QycwVlopP3E7KlZcbjpr"+
    "LEZaMClcOyYhKGdLSiMiPChJbzMwMjZiOyJwWmFlQCkhWC8qO05RcmA9NTozJ2FTLTx1KWpwIiRZU2gs"+
    "SVFjWDhmYzVyckFoLEAzXSkqTWYpak9EOCNPXFpeQU5CJjEpaW1FLHEua1NwQGNeWlc0ZmtNUydpQzM1"+
    "dFdmczVpVyksLi91b2lXYG9PVV91Z29CZkI8OThCMGlNcUA0QUlwZ0whNWwjT0FHUnQ1XkE4OihjXycs"+
    "PXRLOytGcSU+P0dKVjc1VSFlYE4+L0xoJDtJLztMLTI8UG1OJGE8YGw2cXVNQWxGRjBzLmptLiQoPHJj"+
    "TC9nVkFIV29rLi07cEZdWSooNVxMIjgzUFBnVyleMWkqT1JjaSg+Wz8jTmk4Pypab29QPy5CQl8yJGZz"+
    "aElmOm83IS5NQ2hYR2dtcTpMJ2VSVVEsbU5pV2MtSDZrUDEjJ2B1KFFJQXJUP0tEbikyVk0nOG07ZXFw"+
    "MjAxYkw9VkZqaEtQbG5DMUVsQ00kcGR1NCdPWDZJJDVLQCIuW3JPdCtwSl8sQSgvVVlvOUo7KlE1KWs8"+
    "WDI5WCFzKTRDc2tXSCwyXydRWyNtWEtGbUlRM0BuIWFpQjJWc2IoZkZwZlIpYHFZWCJPK1A0bHA9YkAu"+
    "cGVLM1gxXUsrQ1U7KEdKMWgzZ0ZwMmY9ST5nb0tPOiNtNmd+PmVuZHN0cmVhbQplbmRvYmoKMTMgMCBv"+
    "YmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMTk1Nwo+"+
    "PgpzdHJlYW0KR2IhU20+QXI3UydSbkIzMyxkJyFMPmJSY2FMciFyUmdvYV5GRFZJJF9sc0JiVShdRGlq"+
    "QkMhRXI7Lk4iNjsrYyJmUFVjLzhLOTZBNFE8byQ0PGJZPnIrNEZRR1JFcWAiSyo9WTBGamlhMFRVSDRx"+
    "P1o4WlVFPCItaVVlQi1kTHVcNjVTTCNDTlItUTtAOG5jQiFGWiJxU2QmYGJnMSloTzNEL2clY0E8Vkcv"+
    "LSY3KSwoNGsoYDAnMGQtRWlKRDIqXENVLmFVY2teODpsPzg+OmQjOSU5VCcsclNPU0IrSTBjYEpGYF1D"+
    "KiUhTTNXOjduKFwlRDVOM2ZtSWUnXlkhXyEhaz0/PFtgLm5bQyQmJytsWV5MajJhXEJMUSZRZW5uRycm"+
    "KnNFIiVaX2VuNTBKIzJrPlJRW09IbWRFUyFwdSlJRkAudE1MOGAtYVNGWVVbKmwlITQ4UDxKNSczcnJv"+
    "JSosWS8jJkVaSFtFRzlWP19ecEg4YC49blFCTDBURm1kYXEqU3NrLmc0UVVXUi9gSmVRZkwiVUFCR2ts"+
    "V1IsQUNqaUdQXk1SP3IsRTJGPkRuUSRdYTFNO0RbNWBMYStCPGUyPVdwJ1pBJUdcKC5VMjJlKWQxZTUo"+
    "UEZVNDVKRGMnPC46PHM9L1RcOiNCYmRQJ2B0TlBASF0oP2taSUtkPGoqSi5ZRkFEaiZSJy5WKURzWFQ3"+
    "IjhUPSQoIm9vbC1eN29DVHNJMGpuUD1dJnBYKi5pbGE/UF1jMTcpXHE2dFlVUGo/Wj9YSCpoX0NRIzZr"+
    "LXA/PllaKiU3LkM8bFgocVFMUSc8Uk0xUXBAK1JKXUpPNlMzV1YtVjFDPVsrPDIyO1E5bDI/KT5xZGFI"+
    "RGArJExVYyE8VSNMX1NOJz90XlltSnFcPTtVRnFvKUo4QmRNSS5MTTE9RURycVtSSmQwX2AiIUdFPUNZ"+
    "IkBoYi06KW1WNHQkclZmKiVyZlZlWUo0JXUwNjZsY1BlbiRdQSMyR1NVVEw5TDdXUiQlMVFNJWY+bkor"+
    "dXFdZ1NuL0BsM0NYSmpxNjloMEFlaj0zO0hnYWZYMERWc1wuJTw8cHVpUEFHSzJEO3A8XE44Tj9GUEVr"+
    "Q28+ZCVebW9SS1IiWCUiXyxOI1E1V2xcQiVaXj44Vkg7KjVdMmIsTT44TT1RWE5iLzkwQGRcX0c5RzlV"+
    "PnQ2VjNVcm49LyxcJyUmIjJpJ3BDLVNSbCR1VXRhaHBnPiFzJDlXRzQ3c2hIc3BWMVRRITQib2BULSZe"+
    "R0AvJ1ZvcklQcEhGVGdsQEpiLmBqPXJhQ1BkZShcQDtcTUNecC9CI1soXjAzdWdjWy81LXRNQkgpcCVI"+
    "SjFQUU44cEAnP2JESiJGaG1SQlhFKGdrYUF0SWFqVHEpQC4halFuSSIyVEoidW0lYiprRGRTSSVTRj1F"+
    "WWJOQE5YMTIxKlRDKiZQQUNhKFxMdW5mTVVOTFAtPiNIJDtdSi1iXDJIJDk5SzlMJVU0JFZwS2RqSGUv"+
    "S0Q/blk2MF5ZcF9NaCMkU181TVE5QFNob0dPP1MqVSgqNU4hbF9AamIqOXE3VGIrQjxlMlVHW09iMlNM"+
    "Mig/VGdlWDlxOXRYXGBLKkFdJVtdPCVmbS4jc1kob0osTm09cjYsJGsmJU4iTilwcUcyRjxiaE88TypS"+
    "XzxtPlJVSTciO09gJ1g6PiUobz5Sajw8YDR0YVg/WiJ0WWVaMC5tYDZlNjpvciN1TUk3TFc/UlQ8VTY3"+
    "VlJvVz0xTEQ/UyMuSDsvIkhKL0clWy9KVjZzNDJCX0RFZTlUSVtaWiUxRCJGR0l1YyojI0dVUVFCJ3VD"+
    "Ukc9Lm8xVEBvVmMtNmhSRiU2XG9yTyM8QiNQOnQ9KjtTOVBJanQrbnNGKzkkXk9cV1prWm9IUyVcXzBZ"+
    "RzY1Y2ZCTyopPShjPD9hNG5NJ2lQUWU4OE8wN3FmbSwhJEU5QyNBbnRtZj5RbzRBVCguR0tGKlBxcyFn"+
    "IW1fSUcjJG8qUy5ENylmZ0wkV19DaSI+Sm9qXV5cXyNTXVM1YmZ1Jm9AKF4hYl81WDJMIjVbOmtjL1hh"+
    "J1BVTVsmbS85S21PWTpIOyM5YSpnPSRUb08mZSRgP0dZYmhrI0RxI1RCKidiSCgyWmN0OXRTXDwoSjxU"+
    "UFQjJ1AqM1k8LE9MbGskPXFMRz1cOCQ/bFcoVV8qLVk5N2deaDxtXS4+UDxYZ08nY1N1I0haV1wtRHBE"+
    "cGtqPDs3QCc9UCU0cUtCOkZlX1MkOiReXlNmX20uPGFfJDNAOT1RU0t0ZlUsNlFpP3E6cWJWOTFEMGZP"+
    "cDtrWG1dKl8nWlldYFVMdXJJWl04dVRFMWxCPXRmXlFnPj5cRilqXiYuXS5LTE47XlQ+WXMocDQjN15p"+
    "RWMrUDJEdDEyK00/IkJVNDAmLmEnbDk2KDgoPWQlOUgpayZwTF5iOmgsMysoYz9WNTllWU0rZmxGWm4q"+
    "cDYiP0A9IWJQSylpZlJmKV84cDtnLW4sWmFDQTFBcjQvVFw5TVUhaSM8JmM5OE9bU0BYSDpfNGRqT0dm"+
    "VDFpc1g4Y2pbbCNJUG5cQitSVFFYdDJ1VzY6TD9JXDIkN007W1NeWm0zaFN+PmVuZHN0cmVhbQplbmRv"+
    "YmoKeHJlZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAw"+
    "MTMyIDAwMDAwIG4gCjAwMDAwMDAyMzkgMDAwMDAgbiAKMDAwMDAwMDM0OCAwMDAwMCBuIAowMDAwMDAw"+
    "NDYwIDAwMDAwIG4gCjAwMDAwMDA1NDMgMDAwMDAgbiAKMDAwMDAwMDY1OCAwMDAwMCBuIAowMDAwMDAw"+
    "ODYzIDAwMDAwIG4gCjAwMDAwMDEwNjggMDAwMDAgbiAKMDAwMDAwMTEzNyAwMDAwMCBuIAowMDAwMDAx"+
    "NDUxIDAwMDAwIG4gCjAwMDAwMDE1MTcgMDAwMDAgbiAKMDAwMDAwNDMxNCAwMDAwMCBuIAp0cmFpbGVy"+
    "Cjw8Ci9JRCAKWzxjNjlmNzFjOWIzMjRhN2Y3YWMxMjIxZjAzYTc4ODVmYj48YzY5ZjcxYzliMzI0YTdm"+
    "N2FjMTIyMWYwM2E3ODg1ZmI+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRp"+
    "Z2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDEwIDAgUgovUm9vdCA5IDAgUgovU2l6ZSAxNAo+PgpzdGFy"+
    "dHhyZWYKNjM2MwolJUVPRgo="
  },
  5013: {
    filename: "fire_drill_5013_2026-03-20_Pakuranga.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBQYWt1cmFuZ2EgXDIwNCAyMC8wMy8yMDI2KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MjIKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJyhaJyF1aV9J"+
    "OygrIUcydFdnK3VAYkBITVJVUi51Py5iMEU+NENyVWxSYSY2QW9XV1IuUD85TSRwXSM8UzlDcS49ZTgk"+
    "M1dUQ3JnY0xZazddaCU5N1xqY2ddOC5NSkI4JDU6UUJsY1UyKkI7KihiUz9LPChzMlxIM2tqPV5sJG1x"+
    "a0owNEBNYERrTnUqYTUjRHJcZmhyND5UaFJwbmRjVVwkNyV1dUA3YEVARVRybTtkUSVjS1VIJEcnO0Rc"+
    "VkZzOip1K0RyZVN0OUprVTBXUTE/Ni5qQnQrSkksdC0nPVJLPl4tbSVsdHNpRVMpRCokdTc7aGdAWmJA"+
    "PD1aJEkoWGhjSnI/K1ZeVmYrZzlPPS1CKVtyXk1nKnQnWDFZYGdrNEFSXDVKalspbFVxJSxuWHBrdD42"+
    "STNSNE4hTyc3NzsmMU9uI1s6biR1Mz5FaTZ1SThAMk1NbVMnMFNsS1hoRmk+VF0hW3BAU2VUO0hlQShp"+
    "J2EyayJVP0JVRmwtTTFPOENMWU1qOU8lZylOI2ojOGtmc3FvMWpcWU1ZPG0/aVNRcEtxXnFaS2dXb3NT"+
    "JWFeWzUnRGpFMD82JEBsWmkmMUZTVmZRVzsrbGY6NzpFPWt1NyonNSM3JSgmVjhcaF0tTWNDXDdFPjta"+
    "Nj1vVGdBVWApPU5wVXA1MyInNik5dSNFPDpzVW5mMD48QyhFWTxoSEA1RFVIO1tAVWcqVSY0cD1rPUBf"+
    "Q01sWVxnO09sY1o8RSY5QmZVOC50VTF1OUleSFxMI0hzQU9RXippZHVNVmFDMUlnSGc4XCViRj9Mb1sr"+
    "ajBRK11UNmpYMFxeJ0UrNiZbRV9zbylwTFFGYDZRbVUzaVkmYlUtM1w2Rk5MSE1qJURlRmtBKFwoZG83"+
    "Ujk0MkBlX3NUalg1I1ohWl9ITjNFVyRzbGkuMTxWNElZUyVOYnU5OmUqUltmQzx0RWA7Xz8kK0EkIihB"+
    "OVIpJldobnM6JmNdQEtAOzBbLChtZG4zVjErKSlGWUxrYCc9ZGxFa0stZSVrUlsiX0RZLz1aWmFqRFlW"+
    "YGBLSlQtI1lfP09TNU1RXzcqb2MyKVU/bl9SUTlrW105ZEUhXlk8aUFPSWc6czc0PD5hTiNFTTI7T2Rs"+
    "RWhIWmktND8oSytsXSdcMGpGR2sqalE5NkI3bmNxWlddcmk0Qj44LVYmZyM7bzBPQkg1Tyk8bGhZYHBk"+
    "Mz4ldSMwXUheIkM0T0lxL1NBKEJDUy08M2gqIlE3PDwqOz5HVC5rPFRbZDs+MVdCXkVCVVtQSTVRN1Q+"+
    "JElcVy11a1cyUzVWbE1bQk86T19YX0QyUTt0SyJBMCJBIXJuRnJPP24xaVkzWkZvVml1bGMoJEgjaFVn"+
    "JGdVOmE6VGtcbmtWV2tpMEg7WjQuW15DMFpWTkc9KWRpOmIlOnNNX0gkKTpSME4yMDBJUihxPy1JYFBZ"+
    "PXBbUEJWMVA+cWxDaCxlKzxZUVRdQzlkbDh0UEcjalhlVWdnXzBuTHEwJHQsSSJKN2c8Vmxcb1wvS0c0"+
    "Qlw/X2NFZW9iNUpbWCRFV1lFWypaODQ8LV5EVzhgPlYiWSNVTVZAXVo4cFU3dW0vIihzb3I/WSUlZmYv"+
    "SCVFKjRdTilQayFgazQoaUtxS1JdXHJdXF1lSCk7SSE3YmUtZylNZzdXTG8qM2J1YDZYWHVHVVBRWWhb"+
    "YiIqQCNMYVkuM21CPl5MLSFCKVFkc0k2LGkwI0o7TXE/YlQ4IzhnMjR0Q3NwNGJKIyVLVUVgJGlEVUI1"+
    "aHNtVyZvMztpZEItMFFpdUZEQF5xJzIqVzhUJ28mUWNFOSlFMmcuP0ZcI09ALXUicUZ1SjZYQlQ2Ui47"+
    "M1hyMChYLUhDciZjUCEmIyVoMzxjbDBcbCJXOiI1P1s6YkUsOjUkS2xDO0toSjxuOHI8PFNGQkdRKWFS"+
    "bGtuUUJsN0BjUzIzbV47UjtcI1l1cClwU2xwLC9aUUZSKXBiZCIsbXJqPE9NUVMmOGZALEJBL1c5WT5L"+
    "Q0NJXC5CSm5hRVVgcicpb0IoRm5hOmE+cGA8TTdQPjE3WSZvTkpCaU9WYGY1N1FHQyQvT1REZCFfIltJ"+
    "TTpjXE91b1RRQmZlUjozPSdZZjFXJUhUQDs2WFFaMW9IVU9HP19XMTVnPFVRPUpoWU83MzYjTWklY3BJ"+
    "Kj11U1lbTW5yQXJHbEJCKjJxazRTWVhcRigvTTJGMT9hTURPIUVEM1NQUzowTnFwND1sdCNpZ0pxIWgm"+
    "QEZwYHE0WmdrTFhAWCRkaixHI29cKUljTSxxPig0NkFXcEZNOERtbnNyVSsiZ1BjOjonYVBTOHI9Rk9u"+
    "JSxYSEstIis8IXEmLCxOTnJzI1w0RlkjLGcxUyg3KFJZRUJpIzllXVtHR2smVnA3cjNpYE5ZPyQpRC9s"+
    "NFs0UT11aClSZiQtckVgXTVcUVgvaVlKNEBedVYmdXEibyZcUCdELFpzWFVkJy1MSCJkVUIrQHNfZF5o"+
    "RFVPcjZgQ10wLFBkW1xILnU3XDYmdFZqZyMpcj9gI1YxRD9PQ25DZUZLdFkyV1tmazV1SC5qJUUsKkA4"+
    "cTRLOSlgOClTUitgNVtXMkJ1TXM1UyhhKVY4USUvLUJUNDcha1g1b0BNOlw0QlhdU1lsYWFZYlgpVHAo"+
    "IVBbYGJCMFU7OD5hakkkNmU5RXBRLlZgMTxAcEkwUS5YWHMqUSI+UGxlTkshVmJELk1DJ2ddTkVAPldt"+
    "VTJsdFBCRS4scXU7cW9xKlU1WzZEbGxHamprQVs1Q0cqVmNwSzQtKj5abGVzNlw/TktyZzsrSS0vSkY0"+
    "azk7JE81JismciNnWmBeWnApNy0tU0cjNyo/Q0xlbzMpcjZNSVs4NzJWbkY0Syw+W3FLKDRBOlJgXF1K"+
    "V0A7cUJHaFhhaCIscF5LYz44KC9fJkVvTHVPMVszanE5JCZbZkElPDslS2s5b3JMX1ciQiZeSCZ0TC5P"+
    "ajUmM2NsQz5fXFBAM3Uqc1BMVjYoRFJBU2EuRGhZTV1GNytlZklwYlRUTTcvc2I5bT8kV2RFbUo4RVgl"+
    "ZS9bJFYzbyRcKWleY1IwaHMzP1M3VUJaR1gzM0BYZDdMPy5Gak9qJmFKdVQ7ITpRLVRSVmxkbC1iJmpi"+
    "VT5kUUFLLGsqJE5GUk1pSzpyIlM6NipiTzcqTzNjUCEoYGsuQiUnKVtxTzRxV2ZcZmEnYzwwXEstYylb"+
    "IlMyZiFnaTBGOyFILGhsJHREZVw2Y1VwI0QpM0VVPVNhPFsmUFxqZVcjXStYT1UvdUI9ZjFsJVghREFC"+
    "THReWWJdMj5YJj1ccEc9TlE5ZlVBL05OUFg/YVJuZDdLb09IYCo5JDFsYGhBVkAoJDNnK1EzYHFFbU47"+
    "MEM+MicnPlskVkZQKk9XZ2JXJ29TXl9DLHE8aDo3IlpMTDdSYmtWbD46aUVoZXQ/YkcmQGtbLz9uIzVC"+
    "L104NT9adW5IMiVqO2o0UFUuPUJHZjJLSG89ZFJrJVMva2NmLTVsbTRmZCZxSi1RS1BbWlRfQCJQW21I"+
    "bDJSS0dtLGJHLSZcU3QraW5cKzAjQWFfaUJROSEnJGdgPzpwM0xRRD1VRjwnOTdNSDNCLUNmfj5lbmRz"+
    "dHJlYW0KZW5kb2JqCjEzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNv"+
    "ZGUgXSAvTGVuZ3RoIDIwMzkKPj4Kc3RyZWFtCkdiIVRYPWBgPVUmOmlbOi8rdFBlYGVGZU0rTWtkNlNB"+
    "YFAlYVoqImhSN3NPQyIiY2h0QE5MQ3Q8cVg1ckpkNFw5PCROajtOK0YobEowZkBUTXVCayotb2d1cFg0"+
    "S29FbjhccjhEXlxFZGohZGZrXDFpQEJrTXI/KzgkbkQjImxbPlsqLjBzbjIiMVJaJV9FJGkhcFIzW1c2"+
    "Xiw5ISItIUhWKGZZRTkoPXNeTSErWmIjTjwwXEdeLmJxRDQydUJeLFUvNW5QUXFWXzVVKzlDQmUxJStI"+
    "ZkFASCoqTyhgb11tLnJQOGpUKi9Ic1lOQzFyTVVIY1ZAIU8lUG1QLDNrLTksMFVGbk1fPCIwSCouN0Rj"+
    "WztrZ20/cTNyXjBcdTxGclApQmYhPmZEWyxeOUhROWxjL0MuPWYtUnBcai51UXViVzRaLFlkWl8lbUhz"+
    "QURJY0ZZVHNiLUg/SUVLNyRlNjBDQ009P0dpPThLdCxCcDdDcjtSa0FZMGxJIXU1QiROSTkqMV8lM2Ys"+
    "Rz8sSEdTITFpVT9pRGdmZ18kSzMoOkFxUyFfRSwyMFNuayRvPzQ4ZFY+Y2JGNyxgWlNUNWxZLWc3JGUw"+
    "ZTdEKzRxXTIqKGtrN1RXO21DOlRuRWUqZmd0KFJKNjFhYC5kajtqYGtvb2V0JkkvZj1GOGBVYS1aO2FY"+
    "MCZcNGJfR1xOVlYxMztFaiU/QjF0M3FcQ1FJYmEtbVRgRVVAQzNQRyM5azYiUzQmTW8kMFFwPyhBYDNM"+
    "bWMkP1tUQThXdDQ2Sz02SDNKSlBLVmhMRDBAWDdRYDQybnA6VC4pQ0M+PztNV0FuTjRQQkNSTjRia01H"+
    "Vj9kbz1TJDZWQGVLRjY+JV9daUxSajslJ3FsaWQ2Nl0mWlw9UFMuUF5lRCc+dUgjIyUxYG4yc0xBLC9b"+
    "ZD4lYjlkLjs0OFM4XUNsOz9AXl1yLj5kKDYqSl9iPlosV3I+ZzpeOS9uWTBpJDlNSzc9YCxRUzBoPDJK"+
    "ayJia2kjQUFHYFtIb2Q6Mm1gazg8QEhgL2tyZFlUQEE4YHNhMko2cEJ1NT8xU0YhLzdmcnJRcmRDPjM0"+
    "S0ZVY002PCsnPiQnRU9hR19JYEM+W0ZwTmBIcWdnXEcsLDBZLCEoV19YNi82L3BhYyo2PVppcz1tSTVk"+
    "JywyTT5BVGlQW1JHTDc4RydjZls3LE0pQVRhKUpaISdfblJpNE5kXCxkWSxOTCFXSSxZOjMzNlw0SSEn"+
    "aVs1JC9TNGstZnUwR0tiO0BsXlMlXCJHIjFKP1tMQUlFWUI9QlMjTzZaOEJAUklDUChqP01nayNRMiIk"+
    "X0YiNzVob3VJWTtALWRSWmddMFtCJmdxXFUzayFvZUomTShEWDdRNyhkWmppU2Bub25eKCVPPWtObFFK"+
    "STwkU0EtbDwwXENhKTEwakYhUXFZWSpRa2hbcCFmSywjPFdwbGYlZXQ2Umw4WzVWTkljcVQtVF00ISxm"+
    "ZDxFOFpdZT5XPVs8M28tZDs7OVBlXV5DVkM4b28+clREQWRdSCVJRXJyWCRwQDMmOihNSShJYClRREBl"+
    "bFxbRzlgRUdRPCtWL0A3bGhtISg0OlElLzcpPnBgXEtHaWFAPyFTI1BdNCY4U3BmKnBWNXRjb2M4K2E9"+
    "cTp0K1VsOHFITVZPPEgpb3MpLywlWyVlSi1XTyItcHRRYiJvXUxqdEpOX3AoSUQ/QD1TRzkrS1c7SGZG"+
    "KlhkbiM6Y0FJJy5EQjlXazdYKTRiKjNmQmZTMkdOOlhrOF9kQFdqNDJJO105NyM4WCtnKisrW0FRPVte"+
    "QUhPR05wWmgsQG9RMU9BZydONGVdPGQoI2xhTjtyTlkrOWw0KWRLWUdyT2NhW1onWE5VZUBBMCNfOUFB"+
    "PjJPXFdmI1gjInUpQVtNO3BXMV85MT5aRjZrY105XVwiXUswOz0/LlBWQCUlZGFPSkc+LUxtSUVCKDtu"+
    "MkYrR2s8PSckbnVQbkY7QD0hZS4sbXFQOlNHNEtVbm1JWTJrWSloVFM8cUhicUM2J2xfVEBqZW1vWVFE"+
    "UHQ+MT1bNUdCV2dBNCYxQVROMV0zSVJpSDNmMWdvPzFHUSEtIyg/VW8jTi5TXEdKPls1VW0+RmNiT2xo"+
    "YFk4TzVYQjFLXm1bVzBaMGpRTTRURTw0YyhXczpOYERROltzPWpnQT4xZFtyI0A+Qy4zSDk9JDw3OnEx"+
    "UyJaTDJcaWJiZWByREwiQEJMSEFFZmlWcmJQX1IsQCVpJ05jUl9nZGcxRiVqcUw2J0FLbSg1IlE8N0Yo"+
    "TTJZSWloTGhLSz1KSEhJdUo7X3J0KmQoMEU7XEk0cnBwLlhHKkdUQmh0Jy81ITs6OWJ0ZSYhbTkzWTFy"+
    "VDZubyNeMjhbZEUnO0VVMi4qSjltZEpIUG85W140YypnOHEzb1s7LyVsdSRMal4oZz1ESSk7WDZwKEZc"+
    "QUFsZC1dRmU6W1lIUWRRKFFGcy1kR0txbEdIPkZgSiZaXUJXb01UO2g9X3FOKiNHKiVsb3I9XXM1aids"+
    "dEQ4bGE2R3MjO3A8QUZdLiMnRCswRiFsIVw/IUtVT0MyQiFbVyw/W0BrU3EqS11bNTZfLVVWOnUkcG1S"+
    "cWBYJkNcI3UjTDJDWFVNc0dfVlNHKTorOzRmbDIrZFBuLj0rJVMoTFgpV2dEYm5BVkcmWFVPa0ZEc0s/"+
    "SCRhOCpcT2FEKyVgWUFKKWMrSXIuIi5FV34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTQKMDAwMDAw"+
    "MDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMzIgMDAwMDAgbiAKMDAwMDAw"+
    "MDIzOSAwMDAwMCBuIAowMDAwMDAwMzQ4IDAwMDAwIG4gCjAwMDAwMDA0NjAgMDAwMDAgbiAKMDAwMDAw"+
    "MDU0MyAwMDAwMCBuIAowMDAwMDAwNjU4IDAwMDAwIG4gCjAwMDAwMDA4NjMgMDAwMDAgbiAKMDAwMDAw"+
    "MTA2OCAwMDAwMCBuIAowMDAwMDAxMTM3IDAwMDAwIG4gCjAwMDAwMDE0NTMgMDAwMDAgbiAKMDAwMDAw"+
    "MTUxOSAwMDAwMCBuIAowMDAwMDA0MzMzIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDFhZTk1ODc1"+
    "YmJlM2I4Y2E3NDI0ZTY4Y2FiMjFkN2Y2PjwxYWU5NTg3NWJiZTNiOGNhNzQyNGU2OGNhYjIxZDdmNj5d"+
    "CiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoK"+
    "L0luZm8gMTAgMCBSCi9Sb290IDkgMCBSCi9TaXplIDE0Cj4+CnN0YXJ0eHJlZgo2NDY0CiUlRU9GCg=="
  },
  5014: {
    filename: "fire_drill_5014_2026-03-20_Flat_Bush.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBGbGF0IEJ1c2ggXDIwNCAyMC8wMy8yMDI2KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDQKPj4Kc3RyZWFtCkdiIVNuPkJlaUEmVXI/OFIoJyhaJyF1aV9J"+
    "OygrIUVvXTNjLlBvVUhITVJVUi8hMTtCMEU+NENyVWxeZSYydDQ1OFZLPjtAbk0/WDQ0cSsxYlZ1ajE7"+
    "QlliLnA/c3NCXC9gPygnYTtgZm9FXERVIV8rOD8zJy1tJktXWl4sRiFVRkQmJERYZWs2Y1NGQjhOMFJU"+
    "MipONExnPk9KNEMwX3EqJTJUNEhdUjQ1R2sxcmNeUlk1ZmhgKUNTL15Eb2BtaUxrKGtuKjg9V2FQZF8u"+
    "c0dybG09VzpUVWAoPDNTR1dLQFlmbyhHN2lIOV5CYU4wQU5pJ1RmK2FZWExGWjxHciFmJ1ZVVnRdJ1pJ"+
    "TWdpTDdcPVNUJilkPGBxUURVTCFpJV46aTxEWSFYRU1iVmcnZnBbKlJAWy5RL0dMLDEyM2xvW3FlPjZQ"+
    "Z0skazM/dURbUHVxOFJvUXIrLS1BLEwpKFxpKGo7XSpMZHB1WD1mKExhSTUoIl5RIWdWLyxGN25QOUJt"+
    "JSpAR1lpKjxNW0kyVDxoNj5ZLlo8MFtZV20rc15dUz9NPltWdHMkbkYkOEVrM15LIz5VVlhkPSNia0xa"+
    "MEBfQGlGQkBcb09gPVleQzE+aCM8MipUTi9DRXVtJCwmQFBXZjgjam4iYDMqWUduRlw0YVtETEotY2ZG"+
    "Wi0mYjdEJUhrJlc5ZmxgRmcvWjNRKFlpTG9VR3FuRmljcmtrYGE7Z15TMGRoMlAjdWNKKyImXzEoLE06"+
    "M1woLjhAUU50bVdtKW5DYWhNX3JKRnRwIi1YKTA9Q0x1by1SPSFUYGpGYl1ZOFdoRmtJLkJpKUk6W0c2"+
    "XHQ6cjIiMSNDMjlgTDJtSkFsPzpONi81YSEnTFclSEFfJmNaSDxXNyMtJk5rKV5zNnIrXysmRT8uN2pC"+
    "Yl1YVyxfaHJOQm1wNnM5QC1OaVNVaVpQV1cjW0k/SiwpQipxPWUoJVgiU3ItUVM4NzpBaiIkIypLXF84"+
    "UzIlMT9hVl5SMSNlZkAvMV83NSJOLDcvXEMmWGxNW2o+WUgzVWpOaSVrKjgkTjVPSF83Y0diRj5oVEBw"+
    "bWU2Y2o3QG9CcGZCaD5kM1lgdGslN28yYC1DR3Q4b3VpKTNPamAnUT5pPEApUTc2MjYqPGpkT01vJz81"+
    "JzowQCglQWhWTmtsJWRHaGVLKDA2PkJNQTBLIkFqbyM2WC9GX0kiXDxEUE9oJ2xiQkc8SEA9XjMwQjhV"+
    "aEdsYiUwUGFkQlMqQjJsPmVWTUwiI2YnNkNqK2JsK0ZSNWs6UC1dUW4lXjQmaFJuck1SWF4yXT1vMnIw"+
    "ITI4JjckS1tUNypgPWVxY19XLjBPYWRhLEttKWw9TCZEYERaPVFZOWVfay8+RmdjJVZmPDheKGtjPXRa"+
    "YEpXbSZFSlkzN2VyQW9VM0ZlTVJbb0olNElCUGpLTS9oRy9AMCRsa0FXOWRFayNAYlA/b0UibXBiX0ZJ"+
    "ViJDYzdEI1gjZms5RGtUPnFVNUo8SlokV1pRQUArZnAlZEYsc2BYK20qZ04qZUJUKWU6LVBSVT0yOmNJ"+
    "J3EkKFBoZEw/PDBmUEZLV1RjV2lPVSQySiYncXAtXVthLD4/SldhTmFwNFswKVtRKjRdO3JOaEYvYUEo"+
    "aUtxS1JdXHJdXFAtcCI7SSE3YmRnOVFCZyl0SHQlYGc5OytjczdpOzhjZkJnIlJkdEs1aEJCU1MlKDVV"+
    "IT5DQ0FNb10wTTc1aj9QYk1tXFFfQCohJTRLLGBdcUxDSzZVNGYvIWU4PkMrUk8/OGAjQFcob1VzXCNc"+
    "QW1WUkU6JCIoQzpGZFBgMCdGOGBfRzokKFFQYVEpI0glNVIqTixpPiU/L00nUDVlZSJgbWciNTdiczU2"+
    "WUpFYydqUnRZSEova0QwQG1RNyoqXmZnK1dUK0EyXUtfUFttPlUiUmA9N0gtRWZSPz4rPTlKayk+TTBb"+
    "JmcqQS82OTw1QkBePjhsailEYklMWSlPXTpJbGxVP2RSJmVUPEhsYk1uImgwNzZFKSQ3UjxfJV9naEw2"+
    "aHBAMGhMMDtHaG8iXzlaM2Y+XV9YNV0lPmRuRzVRX0BWP1RqLC86XGRvRyltdCtlM25kK29eQ141YkMj"+
    "PTB0XzYyMVUuOV9CVmUoKkNJMm5rZEpoVlU7UWhFWFdySCZVa2o2OyVYdUpPLVNvODJOLzBhQ2BcI3JD"+
    "Z1xpXyNKXVFWU0J0QDJsbkAhdT5GInItYz89dCdOMF1pJig6aWtaRypTNzI2bk0wQjQzMWsmYjRJWk1f"+
    "Xy9XR2NaYytLbiYxN146OyErY2AwUGN1UFs/Xm1CPiwjXCc9ajpja2ptUFVDXCs0PidzaUcmYicvSWhf"+
    "WkRJPUU9VSk3KyIqMWdTbEhcbnI8XVlhMklqXGE1LU42XUpsM0RVVjd1ZVplW0FOKG4kNylCMVE2PiFN"+
    "cS4qLVhZSi4hJF9gNz0sJjc8Ny5PdGhWSGoyRFllVUUpMmFPOF5JZnBLNy5BKlFtajcralIhXFJGQGc8"+
    "KEUkW3JFcVBZXl1KTTI7IU9BS2gnQkJqWGRNbi8nUipAZkZhKyIubClFKVFEXzs1ZyIjWnI2IlRtdGch"+
    "b0pKbGdxKExKKShXbHE9cGBUSmtlUitdRjFrPjdbMEJgYXI5cEwrIlMhLCVuV3VbKmVKVFhtbktOWXVE"+
    "ck4uYy1kckxwRjtpQEFMIS9AXDg0b18vREcuY25bdUksPU1KWFM9YVFsPnVsS2k9ZS0vM2x1LSNZc1Ju"+
    "ajtQPkxVR29gNmdVLyNgPyc9MjdCYVVcZyY4XCEuXW5mXzBvPTZTUidgZCY/TDJaOWc2YHQ4WWZlc0du"+
    "ImJWXi1cWjVaakQrQGM7QnA7WC5UaEA0QzwodEwuXSdtbCVKLXJAIVo6LiIkXE9hciZdSG9acFEiJUUp"+
    "ZXUoZFNqTzJWNE9VTTVPY0hDPTdBNyFwbDBhMkppXi9WMSZCb19fXHFrR2w4T0BKWCRZREhFJT1ULVZS"+
    "MFJgJ18wRGkwRkxIaS8/OiUlI1VtWE4xQzBXPDhYQlAuK2gxc05iUG9cZjEyYkdmU2NTbFtvXy4wITdr"+
    "VyRobTdJYF0iKGdBU21aVm1lSio/cyJyZ1MpdVwlUkwrMWE2RCQlQCpDI2JxNyRtaCRcYSdjW0lEOHEm"+
    "NUt1K2REdSE5X0gyVEI9bkNIYm84TnBsMSZaNmBfZk4lZV87I09BLSFFWTUhSi9GOUhgMiZKRUI8Imkh"+
    "N3UzMFwvMltTLzhGUy83Qj4sZDs7RShnYGBhQ2pFZCMta1tSVClHbFdfZEwtJCxUYiNLLnMjM0VDMG9d"+
    "STxhdDIhJVAqVTpeUGcpQzRFQDYsTDhMRVooUk5SbC87SjUlRklFTDhfW2QsODAuLkQ1S2c0TG9RcWUs"+
    "M11vJyRWT0lVWyJzI2lOL1dYb1ZxJ0ptVTsjTXVITDlLMTFnKzUkWUtDXD5bRDF1QjUldTpYNkZqaT86"+
    "PTFibT04Nk8lWkheazJpMUohczRQRjozTSJUQD5qc1daSipsJW5pX3RZcVA0bkIiX1RNJCVscWRZYExZ"+
    "YUMyM1kvQSNqTEJYN1cobms5JGIxa3VtPnRkNlIrOGQ+SE9vfj5lbmRzdHJlYW0KZW5kb2JqCjEzIDAg"+
    "b2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDE5NjIK"+
    "Pj4Kc3RyZWFtCkdiIVNtPkFyN1MnUm5CMzMsZCchTD5iUmNhTHIhclJnb2FeRkRWSSRfbHNBN1UoXURp"+
    "akJDITtyOy5OIjY7K2MiZzI3ODlNKGFfc08qTCg3TyU5SGg/YGE2ZUFjVCJeRTtHUnFqIlFsJm84IVg4"+
    "cE1gO1ZxS0JlXDovO0tHNFd0cFIxaCMraUdUUkQvN15cczMmL0s2TEJnPSNKNFUtaDZVQz9WT1NHNUNj"+
    "IWcoblZkYDhzcCosL2hocVhUSG5vLThVWyFqLEpcQ0M5IU0sWUJKYTZtSi4nQFhCSkRwPkNvZFM0SjE1"+
    "a0AmUCpqJDFDTCQjYTA6UFw0UWo8QDdcSy09OjNQZFJzOmpZSihdRzclaD0/aWsocFEtZCMmZERSNldu"+
    "P21jNSFHUzdwYT1dKFFcUiRrJS9dSUtcKEFyOUBVYWFoaGhubzcpQWtCQl9NPi1sNjlrW1BEJ2QoPSY4"+
    "NDBLJHBMZ2ohRm1JZCc9KlhGKl5nIUpJKEI+Jjs5N1gyWjFPMEw6PSY4OCw/NjZoaUtFJkQ2YHFAP1cx"+
    "Q0knOFBvPGtuKEcoRjRgMF1tX3BwJUciQG1nYi0oaXA8cSNlRkBydEtgbioua3RbcVFJJllHIkE2Zzlh"+
    "JkMuZmNwXlJwN3EtPyRmU1kjS3BlL01SbSNlM2NjVHE+U2BBKDxBO11sJ3BkSVMnYzNCWWg1b2VhVChB"+
    "X2dzWms+XVQ1MDkzXCdqYElfOVlqIkNVMGk1TjxkOlpsXWpBb2RHIyRFY1FkMCZFK0pJSzwiRW8vKUVN"+
    "RF1AWURXREc5RkJcK3BtRkBkLG09dD1fTUtlLl1XWXBtUjlLcXArSCIoO3M0KG1SW2E1b0pNc3I2RFFu"+
    "Qi1yKFhVdGkmRmllL2I+NTUtQS4kLlQpWis3SXRUczdBRCRuKyJGRUlfSG0lb2YoPVkna2xNTWNuSWRs"+
    "UEwuM0BLKClhUzsnKDFpJC1ZKHVwIVNKMiUqZSspWzY5dXAoOUAqJi8vIT50SlxwKTxwcTVjMHA/bj47"+
    "RWNiXEZiOE1GQ04jWCY0QEpiOG4uYD50clshSD1iQEsvVzUpOE1PLWQ0bj5fTmFZb1NUYVImJzYqLDta"+
    "OGkldDtDZnU4b01dc1RCYC9dVTgxTjdpNUEnXClNMHFxO0lLaDgwaWsrPT8tX1FuYFpBLiIkRVNdIUJS"+
    "YTV1XS9pYj1cLnBwMSxGMS1JPlokMCEsVyFNUzUyTFJIaiQhL1FFdGkvTlFmYmZpQz1pSWhGIy1hXCRx"+
    "Y0IsUS4vdSo6PmdFYTUrI05mNlViaixNOixvWVZmalhqU0JDVmU9YGFGMWU0X2Y1aCpkVV1WPlwldCVC"+
    "VF4+W3IzM0VTXGBBOihjIzsiM0QuWWZPMEN0MDIqTl4ubENVNmlSNiNJbi9TSkFZZGBVISVdLHBFPkVv"+
    "SCdqaiMrcDlmSExnKVQtbyorKExcazpDMWFfaVlzUilMVnVFIVZUZGctQ21rRSsoZ3JIZDxsRzFNZF5k"+
    "My03O2olaTEpZSg/Jmo1MF9DLWQ0W0Nkbyk1Mlgma2RwX0ckYG8hQktEK2InPUZPUldKTDhnUi8zYS5E"+
    "ZV1xUjRULl0vbkdkZHFgcFhtNDVYdEMwZ2EiJXM3UCQmJ3QpdCJJcy8yWVdhJSldMSdJPFhVcENYVzV1"+
    "cDo/NXVMM2A4WkQ9VENwVnVBLUM+YE9XUmA2VktuWWRQNF5sSUVtXEBkRj8zcVFvOnReOCdAYmMiXSte"+
    "VU5BYnVYNSNrUDlpRFwuJzJKTDxeVSk4PmQ1aV5dWyRxJVktOmRCaD0/cj8uXSNXbEZOZW9bO2JDSFJl"+
    "RlxEaVFINnJfU2QmRWN0OVBAKF9IZShVWkEmU3RxPSYkbWpQUF9XJWo+IyUnKGJETDlCZS1ob1wiITFW"+
    "PzpYPlFYcWBKcFk3SzVJTypAS2JqLzUxOlBDUVFtZGRwOjFpUWNyNGRANmpJQCtPPmQ9V0FmdEc2aC0n"+
    "bnNPbk1sbEVlNDNQVSg5QWVYIiYkK21dPiRkcGltYS5AMmM4UW89UjpRPWM+TUNPSnBsKSVJTDUqLWwn"+
    "J3VoLkQjSVcuMVtfZTpFbVZ1SkwwUSMkXDlcW2tDVVM2VFtiOiZJJEc3PGFdQ2djKlFZS0gjb1FoTywz"+
    "Pi06O0VaTE0najhkNlonWnQlckNPP241Ky9VPyFQZitEZihncjQsTzkrOGpabnVUZFRldWhlO1QlMjVo"+
    "KXQ+LF9haGs+TWg7NzctUmJwSWloY3FlZExYZTxZIjMlXUNaNGpGYDEndTFuVjpmRHMpdSgkdSgrL3Bt"+
    "QTp1Y2VIJ0NWWV4xcGs2Z1FvWF1rZUVHIXFhY2M+UDlkYFdTZ1B1RjNyZGZMaGBwMDpndCtYY0JsWzpJ"+
    "ISMwSmZoVVZZZTFMZ3ByX1giaWFTIiVQaCZ1T3UublNvKWhFLnVkbEVDXGFqMi0uNi07LklEa0ZzRi9Z"+
    "L1o4SiNpN3MsQTlKPnBHJ09bPSFIMnQ5dWImLy8tW01FPy4vczgtdFFkOiRkSHQqMXQuQyNkS0NpPl9e"+
    "K0h1VT4zdGZwdXA/dWlbPy1WQ0BRXk00Plo6WjJNRmtPKFYrMHIncSZLTGBTVTZzOFJ+PmVuZHN0cmVh"+
    "bQplbmRvYmoKeHJlZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAow"+
    "MDAwMDAwMTMyIDAwMDAwIG4gCjAwMDAwMDAyMzkgMDAwMDAgbiAKMDAwMDAwMDM0OCAwMDAwMCBuIAow"+
    "MDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA1NDMgMDAwMDAgbiAKMDAwMDAwMDY1OCAwMDAwMCBuIAow"+
    "MDAwMDAwODYzIDAwMDAwIG4gCjAwMDAwMDEwNjggMDAwMDAgbiAKMDAwMDAwMTEzNyAwMDAwMCBuIAow"+
    "MDAwMDAxNDUzIDAwMDAwIG4gCjAwMDAwMDE1MTkgMDAwMDAgbiAKMDAwMDAwNDMxNSAwMDAwMCBuIAp0"+
    "cmFpbGVyCjw8Ci9JRCAKWzw3YjNmNDEyMGJjZGRjNDYzZGJlYWY5OWVmYWE0ZmQyOD48N2IzZjQxMjBi"+
    "Y2RkYzQ2M2RiZWFmOTllZmFhNGZkMjg+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50"+
    "IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDEwIDAgUgovUm9vdCA5IDAgUgovU2l6ZSAxNAo+"+
    "PgpzdGFydHhyZWYKNjM2OQolJUVPRgo="
  },
  5015: {
    filename: "fire_drill_5015_2026-03-21_Titirangi.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBUaXRpcmFuZ2kgXDIwNCAyMS8wMy8yMDI2KSAvVHJhcHBlZCAvRmFs"+
    "c2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNyAwIFIgOCAwIFIgXSAvVHlw"+
    "ZSAvUGFnZXMKPj4KZW5kb2JqCjEyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxh"+
    "dGVEZWNvZGUgXSAvTGVuZ3RoIDI3MDQKPj4Kc3RyZWFtCkdiIVNuPkJlZ1smcTlTWVIoKWJOZkpHaXU4"+
    "RzZVRi1WRUI3bEY7alhUNkFPRWNtITleJ2hPW2RmKCZiOSpJcj9rWm04XjU+O2BfMiYvXGsvUi8oPkon"+
    "RXMoMUNBdUwnSkZhWUtdcW11MlIsJWYpKDVMUjVSKkxfQDVHQkdNW2swbS9sJSgoWWpaNEEnX2NeR1xl"+
    "LCxuVCFGY2hLZixjUl5YVWMqUj5lZTJIOCVlWUpeTCokI29rdGZYSEFnUFZgSjZxZz1CXkInMk8yWShp"+
    "bFZALkErTGclNUgwN0g9JT5MNylNVCszQWRRX0E+OStqa2BtR0xxLjpmVWJVKSU3ZSg7TztuXz0+ZUlh"+
    "WmgwKVBNKWtXRzglS3JcYko4MV47MCojSV5tQFlFaGYyNGdiLUxQRVFgTCRtMEtwRUYpN1BSIkxpL0Ai"+
    "SS44VW5NcjI8ZmohPDtrUDJgUUBcI2UwZi8lZFlOUUYnPCNYIU48a1I2IUQvclQmNTs6aU5nQDdOcSol"+
    "aWgsV1o3b3AhRig9JTgoWUAsRU1pKHNpQnVxdV9bSUZoNVsrTitXJihCaWdlJyRAWCR1ciEpJjhwRzxV"+
    "O0xTVkBZQmZxVT5zR10lSyY4WEklNEhVa3FGU05OTylSPFolVlRwR2JyX2JpamphJnA+QFFDJWtLJkRP"+
    "OCU9aF9BQ0lHSFdodVRwYitnQDhda2s+VCo7MVljXWNzRjlrRzM2MCZfLCZwJCRkJzhUTk4yLy1ZcCE5"+
    "ZlZRQWZISGFsNCwybzlDVHNaK1hTcnNOK3BNN0IkdEcuUVlGY0JpQDJSSVpBJVZFVCFeOmcuViphS284"+
    "aDw8KWtHITVEOUBWPkNAXkk2O1IsNWFOQiwoWjU1OkRtSGQ7a3EkJ2QsT2dQO0olVzEjbTE+NyNRdXUv"+
    "a0k5UCYhSWlaTVNvPnBEUCcwX0leZkFmWnQmYk5KJWRdMGhyIUFwSU41OldWPXVJMjU/W04rJFE7UTY9"+
    "PTBHPVxcRGxqSEQ4QUMvbSZyLz5SQDpYO0svVFZpRSwrb0U6YTo5NS9ETzgnZFdYLkkwKT9CWXUnKz80"+
    "aS07RDw9NUBqWFFJOTM4clBBdFhlKSFrbT81XXVHPlkjc0VRNWQ7ZTF1XUg0QWVKSk4/Ny4/ZSxfalc5"+
    "XS9qSW9oWVwoPk5aaW4mPTFMRWlOYXJiWEBGJUhYQmFVNCZCK1ksUSZlIWUpOmI4amdMPzIkQEVVUjNo"+
    "aDJbcVpEaEdEXS1uU3FBT04pbV9GNSRVcENPOT5TcWJHXmNDVDJNYSgpLWxhLShZSm03SDxJQl5Pcl5u"+
    "W2MkNzZrYEYsZmZGLkstLyRoY1koZDgjVl0vYy5qaGQwVDBKVzA7bUFiZjxkYmo4aVBzMTYsOEFRUFc7"+
    "TyhoUl03OyJvS1tAayslaFlSQGhVXyU8UUs4I0g2Ui1pLVgsIVQoOV0tVXNAMzI6cEhsbkBVQD0mTEg1"+
    "M0NDbShmdGgjOSFzKD5hODd1SzVRbiRxKk4vMHRWJjcnYVBXczUrJG1paHM3ZiFeIWdJTFtEKm0rYFRf"+
    "WzEmRCFTPCxRcCJgMWtFIipqViZqQEgxI1E0T0BBNF1TJ0xBaHBtKjdPPWNqZFQtLVNXWGZtMDwyOy5H"+
    "XiNOM0Y9aUNDQU9cSj1BPjUqVTVxbk1QIklhQ05AITtNWV85Pz5SLFtMZGhZRUxzP2s7YihuUlVPblg8"+
    "MCQycUNaKTlnXUddIkppLCpnKiVxaWFyXyY7K3IkdGtPYyI0IklucGZsPSVbQiMnLjxZMkkvPkVzKkcy"+
    "Q0EtS0Q9QEVfSzpjLV5XUlg+U1MmKCdKbm9sSEBaXFFvb0xaQz91Q3Qsa0kwVDtOLmdwcE87bW1FMjlX"+
    "T19xRCc/WHEmSSdzcT5AJHFwdEVjKm10XFFMRklMXEpuJFUrbFIxZjl0aDwnQEc3aCtgIVpLYEYncDVD"+
    "VSYzOz5lT2BAWlElUCtZZEA0Pm4kVztQUlZpc1liTlZtLid1ZzNDOzZVZUQvcSVQVUUrJlM+KWhQMklV"+
    "JDkqNmZNOmMoX2BIL1Ejcl9yPEdGWitEVCpKUVYjJFYhTVRcVzdDXltaQEthVzM0WVclQSI3bGlVKCRI"+
    "OkhQVDlsKWciVkg+O1pPLEpFODN0JWcjUSI6ZGxnYS1jNGIrXiktVzBmKUAjWC0iV25VP2lXVUpYZWBh"+
    "cCxrS1xjOC5Wb3BOQ3VrQk1qXmRRMl1tRiNILChJXkkkZVpIQ15CW10+czAwNT1AaWZnNT4sPS9QK08q"+
    "IjspPklENGE0SSlpXz9HUHE4YWEjRSdAMCJpMDQjUC91IVIpbCxeI0ZGb1VjLGRSPjAoXTM/Ukk7SipM"+
    "JzpoWGlaKytdNSMzQlE1JD42QGB0TWNqQ3RnOVBvMnBGSGkwNjpkL0J1XWlHJTU8JXI/NUNTSGF0IVZY"+
    "QjtVKGVscVlSW0dbNGsrZ1AvPFU5XUFZYykza0Y7IWYkI1FEZmMwPGlwSm1sRDU4bVAjbmRCP1d1VVo6"+
    "KDc9ZGVkbShacEZIbF4jYzFpUmN0MVlIZSFYQCo3a3RIQE9vJSdLJzxcRzduYV5NRTJHZTEoPnAsZkMv"+
    "RmBWIV9sXVw+Zj0lXzhPT2NhPy1PKTk+RktVdFBkVkR1I2FUIVJxXmxQKjFONSlJQjpoPmE0a0dvOXVd"+
    "U1opI0lnQGpPZSdNSS8kQz82KVBFW050U1c4NjREQXUiWCgjKTM6TztFLTFVcD8yaThpQF5kPjJLMW5j"+
    "TzZGRidmOXMzMjZpYzxfN0poUidZT3RhQic5M2ZFako1OTkuKXElVVhQZVNINTRJb0JxcC5oX1RsS3Rd"+
    "TENpVi9KPWY+SlpDWiI5IiEkYFgnY05vVz51TCFBUC5IbylaIjEoIk9QTkMnRiNRWyxEcys5azhxLWFm"+
    "QDMtSD8mTTdeSiMnRHA3bGhpPChQUl9pVXE/LlFLKnIsNEpBOlUma1VdWC02UEFWI1JEMlI0WTQ0bT5h"+
    "alE3QSUtQHJaVmkpcEleZTkzVksvPHUqO2heLFVHQk1xTllCc0tmI01CLyI0ZnN0OW1KK3VjM0kkTEgp"+
    "QkheSD44PT1Rck9MPV00dEVIWjs/OSs0Xik3OEBAMWktTUlbRGJkLWNWKVBQUmxOYVVKVV8lO1tcV3Ao"+
    "MUhoUydSYWUxLiIlLipLL01QR2RiY2NFKilnNF4qJDUnVicnP1ZmMCZAMyI6Qyg0OmdJJFo+JWF0Rmgh"+
    "NFdObl5uXF48PSZFYzEvbUAnSE00MkZUNGtBa3I8TztYYT4qJDZgMm4jTyQvKjhnLiVaInVFQzk2RF09"+
    "XSwrKUJXQGJgNyhOT0NbN0k8a0sjRGgqak8tQkYyYSw4IzUlRkZEUl0qc2ImVFJiVDF1MEQoNy5qOUg4"+
    "OWRTYF9AVF4rKk1VcGtVSjYkaWRpKiVLOzlzIzhdc19laWw3QjBvUVdyJjFnKzBkaHBCaDUyOmBhUC07"+
    "YCdJJCd1JCc1a2ptNixqMjYrcTdzZG84WjIwcCwmdT9HayIuNWBUKSIzNm5YJ1ltS0ZOR19ASitVJmU8"+
    "bS87KTxVXyNWPVEtZystSWYuckgnYzFxYEl0I2QhPWtPT2o4fj5lbmRzdHJlYW0KZW5kb2JqCjEzIDAg"+
    "b2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDE5NjAK"+
    "Pj4Kc3RyZWFtCkdiIVRYaC9EJSsmQVsycD01NyNkVTEqZ0c7MHMyLzF1MiVEbC5SJHBMMShVTTc0MV08"+
    "YWdJcGpxPHJPVyM7K1giQzpibystWlNMPzRSbkdVYHVlKGsiLGFqcEg2NW9gP0I9JTovSGEiJDFdXHFb"+
    "S1tHLlYoYGUjYkBaQDBfNm1zSmVwalBKMWkhIj9HRnFbPUk5ZExBNUYhVW9SK1dhL1lvOilLaFlOKS10"+
    "XjxfMSc8ImU8TzxAPXFgRElFJitMZldRMkdcW0FfOV0wW2pAIyNxMEJWZS8iUmI+XkM5JzU4ZyhKXHJt"+
    "IUM4UlFaZjwmKiptUC48bypXSz8+L1ksaFU3WWg4I0dbVmRfYWpYbEM+aFNVKUMscFA8JGJeSjxmOypp"+
    "ZVx1cXVKPC9OXSNgZDclZ3VTOlxVXWs6PzEhWlhDRGNORyUsYjYpIzx0Jyt1UVxuaDBlU1tsITFaKmkx"+
    "QjBeYi5GaG9yXzlGI29rXWVgQGhKdU8mUVM4STttOjs9Uzk4NUZQIUBgcW1bUz8mQS41VWZpL2VeRylb"+
    "JiQxNV8iZFElO2ZAcDVZIypxIVxRbVsxPm1DdF49bTw+XE89WWNVS25VNHIjIkpMYlhYWy0lQWRbamRr"+
    "XGlsVy1TOG4jZipALW1DZzJzdGc0bVAvLWUkWCcpRTMwRjY1SWxLLlguSS9ta0ptMkg5ZHVdajVdRWtG"+
    "MVNjaCRobSRkSDk8UzUwQmJpKzQ9QVlFK3IyN0BXbkRgaXNWW0dJRysnaj8qSnVdRVdiT15ZPDAtRiJ1"+
    "UUByYz5iPTRURiVKImlNbTJAPSsvdWNgVi8jK15FT0NrWz0xLjwkLSZFZT1RK0E9IWNhJGxNcDprXFFJ"+
    "aF9TTk47XE07Wj5ccGlGRjJCYidUNmxJSktQQ008amFGSzU1US1LLCRpS1EqczZicEhyV2gyUCdmPkNc"+
    "MV5wYW9DJDc3NytKLFNMbEdOP1JLZGskQGczVzdCVG0/VUJSYTdqamA+VW0lTT80PGNUUS49QTU0Okxk"+
    "XW09RWJOWGktXD1sVjZXYTw/WlZnVjdPMTY5XTAqa1t1ZShYP1MrTiIxVS1OM2xCSjglJjgrWj5GPStN"+
    "WjI+YXViVlhPclpARTVQNE8rPUZhJFouMj1QUkxqbzk7aCJGPUE9a2FsTEJmJUVFJF5lOUhmdE9CXyhp"+
    "WHJvYlhETzFIJGItXjBTKC1IK25EZlNYOExGaHAkJUFaJi9lMzNqVCprJFxbJyhNQWEkXD8vJHAlOGhE"+
    "bGImZE5cPVlAKkFfaWg4WklCIUpWMlQnOyVHLWJ0TW4kOCMkYXA3ZygqU1RQSVpPRjVjYmNLP003LWlf"+
    "bHJqMyIpOTJoRzRuMjNEZVVjZ2JjLHQlZk9EIjY+W2owN187IlYmQEkpLFA+IXRLc3NMRnBEJGhoVWEz"+
    "Uzp0Wz4sOWE6aTZaLD1IYWxcLFdsUzs1MDM1KVJOMSVUK0xATWIzZmc7I1smaVM3SWlwNnA3QFZIPjFS"+
    "My03I2IjRS9FUSgzLVlhJSkpWWFTZmVHKTddOV0iXG8wZ2wia0kvWVRgKUo3YktqcykmLmlER1E2LSlv"+
    "XWVeKWtaWHJuQ21oVG9JXyIsYE5GXC5CSD84MnVOZTA8NlxcNkVLRzFzUVllQDlUNTk0Kl1WTmpTdCtO"+
    "cDdSal8qXiE+Z0kqQ1pOR0tNQDkiKT9gUGhdMm5cWVFNYy1WaUFDLGZfOC82Vm9zLjBmNE5XTD4rKmUm"+
    "VjdnS1AuYyQ2QTFhSjNjRXBEMzxTUidAR1hqdDlXRXNVLClFYyVvaW80X0shR0QnNGonO0cwbmRNJEJN"+
    "PXM4Rzk0XUIpW2chbUlcNjkoO21wWnJVTVFQRF5qOlkuPjE2TE4kU09DWSkyQCdKLmxDZzMkJTYkJkZO"+
    "T2BiTUhmc00hQWIsXjs1O1knTnFjZ11DKygoZCo5bUYoVCZUIytlMl5kaT0zQFhxViFWbUBlL0Q9JWxd"+
    "MFs/UWhOai8tPVhYajU3N3JMPDVoNENqL1dyYlJKO3UmJypTTCRqU3FlQDtWPSc4ZlNqbEYlQF9IOllg"+
    "RGs0OlE+OzlcWEhDLS1FVG9EJ24uR01GWjBGWEsyJyhWPT40cChCZyk0OiQ9OltOLzpjJD9GMSp0TyRj"+
    "XSglc1cuMF8wJkJ1Y2FxVGAhcnA4b3FhSllHLCQwXDtUJiZFWXNoX1phQE5KZidaN1hRPClENk1YV2FC"+
    "OF0uOGpnWVFPNk90RT5zRC1lXG9LMm0hYEhBNjorP21pOCowRW9cZFV0QlRvUl9wNVdBWFlBL2wqbHAm"+
    "ZEBCYm4hPjBGVWdZMVAuIlslXzZDV1lDJlxrPHNcaipOPiZpWiwsLUoqbE0hNldWJ3Uzb0VmbnFzIjJJ"+
    "NHU7L0dvaFJKJ3ApLSw/U1d1V2w7KSstTEEvdUwvcEFmdFE5Ol0pTmc5cSgnTVkmU15IOXQ9XGlZSm5k"+
    "RkMwP1cpXEt1PixzaGVSX21KYmFCKHFQRzJUMERgYCdMXyJoQUckMlpPLSxcJF1sbG0tJ2AoaGxWcCQ8"+
    "YlI6V3QmVChoUmhIJitlL0AsL3NjZ1wpMipZPnUjPW1idCY9LTxpTHJXQlAnYz5Ofj5lbmRzdHJlYW0K"+
    "ZW5kb2JqCnhyZWYKMCAxNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAw"+
    "MDAwMDEzMiAwMDAwMCBuIAowMDAwMDAwMjM5IDAwMDAwIG4gCjAwMDAwMDAzNDggMDAwMDAgbiAKMDAw"+
    "MDAwMDQ2MCAwMDAwMCBuIAowMDAwMDAwNTQzIDAwMDAwIG4gCjAwMDAwMDA2NTggMDAwMDAgbiAKMDAw"+
    "MDAwMDg2MyAwMDAwMCBuIAowMDAwMDAxMDY4IDAwMDAwIG4gCjAwMDAwMDExMzcgMDAwMDAgbiAKMDAw"+
    "MDAwMTQ1MyAwMDAwMCBuIAowMDAwMDAxNTE5IDAwMDAwIG4gCjAwMDAwMDQzMTUgMDAwMDAgbiAKdHJh"+
    "aWxlcgo8PAovSUQgCls8MWMyZDU2ODU1NWNlZmZmYmU5YjcxNWEzN2M2YWIzMjM+PDFjMmQ1Njg1NTVj"+
    "ZWZmZmJlOWI3MTVhMzdjNmFiMzIzPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAt"+
    "LSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxMCAwIFIKL1Jvb3QgOSAwIFIKL1NpemUgMTQKPj4K"+
    "c3RhcnR4cmVmCjYzNjcKJSVFT0YK"
  },
  5016: {
    filename: "fire_drill_5016_2026-03-21_Panmure.pdf",
    base64: "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2Up"+
    "CjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSIC9GNSA2IDAg"+
    "Ugo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFu"+
    "c2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoz"+
    "IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2Rpbmcg"+
    "L05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAov"+
    "QmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9G"+
    "MyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0Jhc2VGb250"+
    "IC9aYXBmRGluZ2JhdHMgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRv"+
    "YmoKNiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1PYmxpcXVlIC9FbmNvZGluZyAvV2luQW5z"+
    "aUVuY29kaW5nIC9OYW1lIC9GNSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjcg"+
    "MCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTgg"+
    "XSAvUGFyZW50IDExIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAv"+
    "VGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAog"+
    "IC9UeXBlIC9QYWdlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db250ZW50cyAxMyAwIFIgL01lZGlhQm94"+
    "IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAxMSAwIFIgL1Jlc291cmNlcyA8PAovRm9u"+
    "dCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAv"+
    "Um90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKOSAwIG9iago8PAov"+
    "UGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDExIDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMTAg"+
    "MCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDQxODE5"+
    "NDYxNCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0"+
    "ZSAoRDoyMDI2MDQxODE5NDYxNCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5"+
    "IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRXZh"+
    "Y3VhdGlvbiBSZXBvcnQgXDIwNCBQYW5tdXJlIFwyMDQgMjEvMDMvMjAyNikgL1RyYXBwZWQgL0ZhbHNl"+
    "Cj4+CmVuZG9iagoxMSAwIG9iago8PAovQ291bnQgMiAvS2lkcyBbIDcgMCBSIDggMCBSIF0gL1R5cGUg"+
    "L1BhZ2VzCj4+CmVuZG9iagoxMiAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRl"+
    "RGVjb2RlIF0gL0xlbmd0aCAyNzA0Cj4+CnN0cmVhbQpHYiFTbj5CZWlBJlVyPzhSKCcoWichdWlfSTso"+
    "KnRHMnRXZy5Qb1VISE1SVVIudT1gOjBFPjRDclVsXmVnZHNhVigmQmJFLjErI15ALT1nT2hvbFIkSmAp"+
    "PTteWEVKSEhpZHNMLXI6LDNIX0E0ZjBfbCI3YWpHI3NbJW5EW09qbUdyXDtFPj0vKz45YC0kRDFwMzMh"+
    "YDpGb2YmQUdlbic3VE5MLjc0Y1ZiY2JtNDFGRXFIUGJqJmloIjMqVGImSiRiIS02YihJQEsoVVhzZ3F1"+
    "IlglZ3IydEM6SmI3b0ZHM0UxPzYuakJ0K0pJLD1LajtSSz5eLW0kMGljaUVTKUQqJHU3O2hnUmZkQDw9"+
    "O29JKEZWZ0skMm9sXlZdJT45XHUubD43QEw4Zyp0KS4xPkVeajRBUlw1SmpbKWxVcSUsblhwa3Q+Nkkz"+
    "UjROIU8oYmA3ZDhtaGNoTmYpKVFAc19sKStSX0QlImMyal8oYyNdZ2BcXDM6c1ZtSFlSM1VwVGoyXzIx"+
    "PmAkUCNqNGxiOiFEKT5APzcoK1VoKEZaRjhzJWtzWnFwNU9QQWhuMSU8PzJXS3VLcV5xWktnV29rUyVh"+
    "Xls1J0RqRVlLIidAYkJXWiFGUzMpW1c7JjNwOjc6RT1rdTcoRVQ7VFglTHFyRG8+blQ9XD5WXVpmWlFZ"+
    "I1VnQVVgKT1OcFVwNTMiJzYpOXUjRTw6dWxZTWs8SiZiPjIyWTFWV2oxMVQ7V1ttMVBfOnJPKmw+bjEq"+
    "ZGRETTksMG86LmJsO0wtamkndTsndS01RDk/X1hLS1s4RyJUcEJ1YWRrNFloZj0+dWRqXFx0ME9pJkVT"+
    "N1BoUFV1RGJkTFhATEgpLkFFO1drWitsblwmVkZlLl5sV2Y0JCVaO1VXK10lSiJdLEA/XkFVTCxHOzM5"+
    "K2Uoay4/VHEkR2lZNVkmWSwlYj49NnFFTWY8QyQzN0NgczcyVWU8KktKRj9FaGhuVUNvYjg1YFA4Ujli"+
    "KWRlXVJPJkxqcls2WVZgaiZOMnJmNThqQy1GM2dlc2skIV90M29BaERNb0VUT0Bbc0M2aWZqKGA9Ri5S"+
    "LStjXT1DQD9PXDtOUV87V21TK1ouXWoxVyZRZEUpT1NpIkc8V19KUGxYVFUpOFZcTHIiaiZlYnJSZTdo"+
    "J0ZfIWZRLyJ0LTUsRURMbm5hdSxaTktjRFYwcEJzQm9eaXBnVzo2I08kVmhAKGNvZTo0WGYoR01vVS4k"+
    "c3QlJSlnRSQhS2dKcS9TQShCQ1EoVzNoKiJRNz0vWkM0L0JiSzxUUl46M25GIT5FQlVbUEYjQTJKPV4u"+
    "U1YtdWtXMlM1VmxNW0JPOk9fWGNxXFE7dEsiQS5xWWxybkZyT0AmaWsuM1pGb1ZpdWxjKCRII2hVZyRn"+
    "VTphOlRrXG8kOVxBaTBMaTA0LlteQzBaVk5HPSllLEpiJTpzTV9LP0RbYj5dIjBeakhxUys4OVA8JScv"+
    "Jm9VWTdjKmdPNVlXQGYwPF9OYDFBMDtbaFNtcm5NISM4O09kR1hOK1tiKk9WTVpXOUNXYUJhTTo/VTFm"+
    "QkNaW3JRKixAWzFtZFp0U2EhJE51XCZjRGgySVE7RzVEWmtVYC8paVJkaFBcTFxVVyxZOVlwYHBYQT9H"+
    "Q2kwUFRgUydWIThTQWdQRS0qQzdBaFZQanFecFhLO3VxKThGNVFUTCoiLShuTmhFPzdlcD1RaFRaZS8u"+
    "Qmk7ZFMkPz4rOWF1VWUqI2hwM24oMlV0OjJUXVwrN1AzJnEsO0ZZMypMQ15vKyQrLVRlb11TdTkjXGZL"+
    "XDw0OVdCSCNYVCEwNiZMSygqUkQ2cEorbDhkZWQja1EtP2xmbDxeZHJBNCxCVmldIlZSY2NyNGVlM2Yl"+
    "cmg+S0kmXFZRJnJKcitxP2NecDAuVid1RnJySGE/VCFwKT43X1VLUk0jRFh1TyZWUk05KERVKCk8OSRC"+
    "Y2llbWMkO0dcNTNgQWo/KDFuOCR1OGhYKEknMi1pRm9RZF5UVi9XOVk+S0NDSVwuQiZWXUZtc2hMJUg2"+
    "J15Ha1xsYV47b29HQS51US9LXE4yKVw4TCdQY1U1MFQ2YXE6UEY8O2QwaFpnV0dqO3NjLWZhXFFmJVlK"+
    "IyFLVighOWUxYTQhbk5oT0cmI0pXJyhAQStRYTFyOS5pPE42cidiT3BNR19yIyJfdFlxMCg9PihlIzFl"+
    "cl9uPmhTbzhcTUxvRTlbQU1xTCQpIltRRF1BWyk+WURiazVxYFguQTtvQydoSCw1bjlZa1ZQZCEqcD9B"+
    "dTNeKFsmYi1bKl5YaXFbc0xbY0JORHIjMCRrbzo2R1thSFtJQzAmTmU/MyJMPT8wYWtMJl4pTFckKDJz"+
    "a1dCLUNGP2RqM0IvWlYkLXIzOG1sV0FySl8pa09odEg7IU9kXTFmcDxSYG4mPC4/KytXcExiWzIjWiEo"+
    "KS5bSDlKYStkPmZPQT9GY1lBTDUwXWNbXmJIZytUWk09Vyx0cClZQ0loOUg/YGpXI0VgQVwnM1R0bDNW"+
    "TDQrM1hwMj08UiNDOSlWQVRYLyhsVTFVQU5raVhVaj8lVzxJQjRdVj08ZV8tbTxUW3FWaTVYN0o0aTs7"+
    "dHU+TSRBO0BvWEM7Q0VeOCY0ZF1TO2Y/N10tQ1A8TUVzKW8vRSY/ZklXSXAmWClTTyMkJS9sTiZHLUBV"+
    "TENFTCZuXmNAVT5CRTtCQWU4Wjw/TG0wTDVqW1Nca1laIy5EZEgkS29OU1hsIUZaTC5QQG8mYyEhPzNt"+
    "K2VZYFcuLk0jSTdWZkwkMUNrXUt1XV1Ebz9BVkRZWT8tTG1LR1BQLnU1JFUvSCQpdFNbbkc1ZUIlaDM5"+
    "Vl5WQFk9ZFxRWm5NZS1PbUYkNVInO2dAOmg2VlkkNFZAQGZBTyEhPTY5QEYtX19VOkJDXmhDQ1BTTDBD"+
    "T1xrN0dUQ08qIzJmVWEnVyg7NWloS10lXEA2XEJsPyIiUzNhcWM2QWZELUQ8R2kiYHA2cyMhV05mLzpv"+
    "ay0/b2xuKjNhXV1KPzolJSNVbVhUM0MwVz0jWUMjaFBoN043RmFxIXEpKWw4cTprSVpdOWklW3VBRkla"+
    "cHFaP1MpQTlXYVdSPVhobWAlTUEhdG04MyI+TFMwLVRmQkxfNUAqR1E3cS9tWCQmLjhHSkM+aztrK2U0"+
    "IjZVNiJhUEtlRig4XCl0PFFrKmxhN0EsPkxCTFNuTltfVj5YQixzIkJqIUovRjlIYDImSmxaQnBEISps"+
    "X15eazlHcUIyTkk9L21AJ0hNNDJGVDRrQWtyPE87ITNbNUk0Ymg5Xz1GVzBsVlA0V3EwXlgwSU5paltK"+
    "XmtVOGBrcycnMGpRZTA6bEgkNTJLZGFDVSUpRHE2MnNwbCtVXChvJGs9TkNdRlRcPSJDcCtmXUozTTU0"+
    "SzgvaEJrQmRpZlhyMEpZLUNTbFRkWU11JW4nbCpZU2JjdCVfK14sMzBJZjcpQylJKmJFN0wlOTElUz4n"+
    "RmNZT0tMbkFYQjw/Xyo8akVHZFBNRSZGNk1bLzVWNV80RmRhXExASl4pSGZjJ0k1YU8kYnA7XDwhQENa"+
    "WXI+X2RmXSVuZiMkMExFSDZRJDpAJVxzUkkvNTdcXCI2aX4+ZW5kc3RyZWFtCmVuZG9iagoxMyAwIG9i"+
    "ago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxOTUyCj4+"+
    "CnN0cmVhbQpHYiFUWD5BcjdTJ1MsKjQvJ19BKlUxJjszYUxyIXJSZ29hXkZEVkkkX2xzQmJPcVReWWpC"+
    "QyFFcjsuTiI2OytjImZQVWMvOEs5Zj1PKkU5PnItMVVhVF9RXjFwW0pzVW0wSEhPME9Qa2knND90byhr"+
    "JSkvZEYiIiJlanJEJUtUXFpQbWkwLSZCQ0l0Sy1CJmo7LG5UM1ssbjZMWTJqMiNUanNcNDczJSg8ZDFF"+
    "UjxyNyFYJS1NLy9QTTBSOCg3WDc5JyIyMVxkVG4yMTxQNlAxb1dkXDlkZUNoJU40RjhrKk87XUo+WVdR"+
    "JkBpU0R1aGNHbGRCa15jNHVGMyVeb3AoRHFSVWQ7LGZBMV1EUipFJEJaPVApJz9DTSxvbmxAYClmI0VT"+
    "aDhhQStxQylqMExrL25wREBQIl87MSFjREZJcVddb1o9M15aKjcpISdbLydzMCRmX2k/SGBeJ0MzKTZb"+
    "OVZuXyk5VjZTJVlUUkVEcUhzV1pEVl9ELjspXChbLVBFVWMwUi1vS280U01AK3U2WkJoTkgmQ2g7bUld"+
    "Y0JwOy9OREJyTzg+ImBYJChHakEhI11scFM+P1s1UT9vcTRzSjo3bEVtTGIqWmxQXSNwPzRvUW8qVW5I"+
    "QGcwSF1LNmtUc1dGS2o0M0JzMmFFcTpGYj4zWzljMW1sL1RiN2okcyNTT1kubmpIcSpaKDlcU2ZXUWNB"+
    "NnFpUkxxMF9wOVVTdVRXRFFmQV1qUFAjYWA/LSVpOFR1aVUjQ2FpbVNXSUkyWkQoNDksLWFpWTV1cjBU"+
    "TFY6TGtoZm1JYT1abVZobmhRbD1sdVg7JjltOlpTckZiNzFeZ1hrQlJxMk9HND0qTWA9QScjanJtYWNa"+
    "JlBQVVtUPmFAXkNjVyc7ZmRDXFlrNlhXITZYOGhEYFhYYk89KXReYjsmTHBcajxaXlRmQHE1bSYyb19h"+
    "Kk9WTCg2IUdpaS42dDUoJF45UixVNS4+N1xHZUM+UVwtcjdTSF49SkxYQTs7ZjgpMWxkbTtmMC4wWT0m"+
    "MUVpMG5BcEZDSFVgPUYlR0IwTnBpRTxhQ2hXN0lVUVBrckJZRUJebigjQyk1X1JpKHRFdWNfVU0mMmpu"+
    "RiQ0OWxsKEEkXSNxT2oxSVgjZ2gxPShNcVxZVVNoXlY3L2Q6PDUxLSgzaiQtJE9RZTlIZnRPQl8oaVhy"+
    "b2JYRE8xSCRiLV4wUygtSC0pa00ubFMrWXU8VTddT0AibS9tQEpAMF8kJSZSVW8wI1NeJTRZRmhKaG82"+
    "KlVfSV5UWk5GbW5BOztAZktEQU5bIzJcPFxzVmA1TzwxWVZrcFYjWyheMDQ3I0leKC9ZdT5pQVFYWTRf"+
    "cFo3ajEkOF4nLyhWMipFWlg0PSxuZWRtKyFvS05eLTYoMSE5KFchVSZuWzMxVD11Q2AwRE81KW1WRS80"+
    "Yls9JCVZTWNFW3VmNzJAIlY4UVozWVhsJkNCZzFuVmM6RnMvbEssOF9lKjBYaGRrXWsvO2kuQCxmQiVV"+
    "ST8yXy4jVUI3R01cWzZhLHQzMVBESUIjU2xca3BbKVYrXmZpOTJGRjYjVnEuNGdUTCskOTM0OTVsYGM3"+
    "biYiUUprM0Q+SyI+WmI7V1lVLGx1U0FgQjhyVE1hMlhJRE5TQVQzKCJNZUJtJzo/aS0/N2ZzJlxRcCNM"+
    "czdTaS91MUNAalkhYjtiamtBOmpcJUtoZjQ3LSo9dTc5bUcnNF5xcWU9T0ZFdCVYZz9gITsubDA2Ilsr"+
    "QHVRVilyXmVMKlgnKTo7LU06WlJhXztbOUMoUiVLU1VXWSxyRko1LTptTE5mXCR0NkY+VFVIOXVJUS5q"+
    "VCkvQj9GOj1TKGI7UyNecltuY2FyPlNYTWRETFx0M3Nuak0lXSQ4TEJsMiMidSlBW007cVZSYCMmYFhE"+
    "QC5FWHQ8YVQ/OU1QV1AuKzU2TDdcWik2W1ZNNjlAI3ROJD91SyZPNTtfNCQiYVg9Y0dEOURbNnAlazMx"+
    "SlZgX1RucGNZMm1LXWhKQXB1NF5qW1IpKnA8ZHI3cTg8NEFJQSVBZFIlNStvKlJPME5LLkQ+QCkxJDxb"+
    "Xys1Kl8mXnNCT2UmUFZSRmttTic9L0xFZFp1VjpIZ29lImZELmU7Z1s7PDtkQ3AvXjVfVloycjdqaWBT"+
    "ZVpsbT9tL1dQaSNfS0MkcT5PZUtpXCVtQT1XPidiJi5PWkYlRFZlbyInKVE8KD1uZV9ZUyFQNk9JNFtY"+
    "SDVbLFszTW9nVW9rV29XITwwSEE2Ois9IXQ6Sy8tWDhgQUNiPCc3ZHIhc2NfTCxAYnQnUmVHdS1iblkl"+
    "XylGZ0xnREIuKFBZRklBQXMiOyo7UzExKzFCKzNyQE8jZlxePGYvPzIpOSxlZztoclVYLytnZj1BYmUm"+
    "XC1YI00zKl1lLyZrazMoVlY3blRiWFtcOnJGOGlpWyxLQzkwcjo7a2tfaSdIaDlOPj1uUmMtYjU/bWJV"+
    "aVFFI1QwRk0jO0VjZm0nXWo6ZXUlKFZxcjE+JzQoXkFPXjJYMG9WNkdwLENpPmxFVml1QjFNXCs6ZW5m"+
    "TV1QPy1eOmVHRXVVcFo6c1xLXG5rTy5wVmczcyNgZWxkJEk/alJ+PmVuZHN0cmVhbQplbmRvYmoKeHJl"+
    "ZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTMyIDAw"+
    "MDAwIG4gCjAwMDAwMDAyMzkgMDAwMDAgbiAKMDAwMDAwMDM0OCAwMDAwMCBuIAowMDAwMDAwNDYwIDAw"+
    "MDAwIG4gCjAwMDAwMDA1NDMgMDAwMDAgbiAKMDAwMDAwMDY1OCAwMDAwMCBuIAowMDAwMDAwODYzIDAw"+
    "MDAwIG4gCjAwMDAwMDEwNjggMDAwMDAgbiAKMDAwMDAwMTEzNyAwMDAwMCBuIAowMDAwMDAxNDUxIDAw"+
    "MDAwIG4gCjAwMDAwMDE1MTcgMDAwMDAgbiAKMDAwMDAwNDMxMyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9J"+
    "RCAKWzxlNzMwZmNmNDgxNjFmOTM3ZmIzNzExNzc0YTg3ZDc3Mz48ZTczMGZjZjQ4MTYxZjkzN2ZiMzcx"+
    "MTc3NGE4N2Q3NzM+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAo"+
    "b3BlbnNvdXJjZSkKCi9JbmZvIDEwIDAgUgovUm9vdCA5IDAgUgovU2l6ZSAxNAo+PgpzdGFydHhyZWYK"+
    "NjM1NwolJUVPRgo="
  },
};

const INIT_AUDITS=[
  // ── H&S AUDITS 2023 (quarterly, 4 clinics) ────────────────────────────────
  _mk(3001,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2023-03-15",23,0,0,23,"Passed","All H&S items checked. First aid kit fully stocked. Emergency contact list current. No hazards identified."),
  _mk(3002,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2023-03-17",22,1,0,23,"1 issue found","Treatment room 2 overhead light flickering — reported to building management for repair. Sharps bin 3/4 full — disposed at Chemist Warehouse same day. All other items passed."),
  _mk(3003,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2023-03-19",23,0,0,23,"Passed","All items checked. Evacuation plan visible. No issues."),
  _mk(3005,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2023-06-15",23,0,0,23,"Passed","Q2 audit complete. All items passed. No hazards."),
  _mk(3006,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2023-06-17",23,0,0,23,"Passed","All items passed."),
  _mk(3007,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2023-06-19",23,0,0,23,"Passed","All items passed."),
  _mk(3009,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2023-09-15",23,0,0,23,"Passed","Q3 audit complete. All passed."),
  _mk(3010,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2023-09-17",23,0,0,23,"Passed","All items passed."),
  _mk(3011,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2023-09-19",23,0,0,23,"Passed","All items passed."),
  _mk(3013,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2023-11-15",23,0,0,23,"Passed","Q4 audit complete. All passed."),
  _mk(3014,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2023-11-17",23,0,0,23,"Passed","All items passed."),
  _mk(3015,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2023-11-19",23,0,0,23,"Passed","All items passed."),
  // ── H&S AUDITS 2024 ───────────────────────────────────────────────────────
  _mk(3017,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2024-03-15",23,0,0,23,"Passed","Q1 2024. All items passed."),
  _mk(3018,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2024-03-17",22,1,0,23,"1 issue found","Evacuation map out of date following room reconfiguration — updated and reprinted on site. Back exit signage also refreshed. All other items passed."),
  _mk(3019,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2024-03-19",23,0,0,23,"Passed","All items passed."),
  _mk(3021,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2024-06-15",23,0,0,23,"Passed","Q2 2024. All passed."),
  _mk(3022,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2024-06-17",23,0,0,23,"Passed","All items passed."),
  _mk(3023,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2024-06-19",23,0,0,23,"Passed","All items passed."),
  _mk(3025,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2024-09-15",23,0,0,23,"Passed","Q3 2024. All passed."),
  _mk(3026,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2024-09-17",23,0,0,23,"Passed","All items passed."),
  _mk(3027,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2024-09-19",23,0,0,23,"Passed","All items passed."),
  _mk(3029,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2024-11-15",23,0,0,23,"Passed","Q4 2024. All passed."),
  _mk(3030,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2024-11-17",23,0,0,23,"Passed","All items passed."),
  _mk(3031,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2024-11-19",23,0,0,23,"Passed","All items passed."),
  _mk(3032,"hs_audit","H&S Workplace Audit","⚠️","Panmure","Alistair Burgess","2024-11-21",23,0,0,23,"Passed","All items passed."),
  // ── H&S AUDITS 2025 ───────────────────────────────────────────────────────
  _mk(3033,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2025-03-15",23,0,0,23,"Passed","Q1 2025. All passed."),
  _mk(3034,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2025-03-17",23,0,0,23,"Passed","All items passed."),
  _mk(3035,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2025-03-19",23,0,0,23,"Passed","All items passed."),
  _mk(3036,"hs_audit","H&S Workplace Audit","⚠️","Panmure","Alistair Burgess","2025-03-21",23,0,0,23,"Passed","All items passed."),
  _mk(3037,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2025-06-15",22,1,0,23,"1 issue found","Waiting room chair with loose leg identified — removed from use and reported to pool facility management for repair. Replacement chair sourced. All other H&S items passed."),
  _mk(3038,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2025-06-17",23,0,0,23,"Passed","All items passed."),
  _mk(3039,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2025-06-19",23,0,0,23,"Passed","All items passed."),
  _mk(3040,"hs_audit","H&S Workplace Audit","⚠️","Panmure","Alistair Burgess","2025-06-21",23,0,0,23,"Passed","All items passed."),
  _mk(3041,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2025-09-15",23,0,0,23,"Passed","Q3 2025. All passed."),
  _mk(3042,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2025-09-17",22,1,0,23,"1 issue found","Light globe out in treatment room 1 — replaced same day. Noted that globe had been flickering for approximately one week prior. Reminder issued to staff to report maintenance issues promptly."),
  _mk(3043,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2025-09-19",23,0,0,23,"Passed","All items passed."),
  _mk(3044,"hs_audit","H&S Workplace Audit","⚠️","Panmure","Alistair Burgess","2025-09-21",23,0,0,23,"Passed","All items passed."),
  _mk(3045,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2025-11-15",23,0,0,23,"Passed","Q4 2025. All passed."),
  _mk(3046,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2025-11-17",23,0,0,23,"Passed","All items passed."),
  _mk(3047,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2025-11-19",23,0,0,23,"Passed","All items passed."),
  _mk(3048,"hs_audit","H&S Workplace Audit","⚠️","Panmure","Alistair Burgess","2025-11-21",23,0,0,23,"Passed","All items passed."),
  // ── H&S AUDITS 2026 Q1 ────────────────────────────────────────────────────
  _mk(3049,"hs_audit","H&S Workplace Audit","⚠️","Pakuranga","Alistair Burgess","2026-03-10",23,0,0,23,"Passed","Q1 2026. All passed."),
  _mk(3050,"hs_audit","H&S Workplace Audit","⚠️","Flat Bush","Alistair Burgess","2026-03-12",23,0,0,23,"Passed","All items passed."),
  _mk(3051,"hs_audit","H&S Workplace Audit","⚠️","Titirangi","Alistair Burgess","2026-03-14",23,0,0,23,"Passed","All items passed."),
  _mk(3052,"hs_audit","H&S Workplace Audit","⚠️","Panmure","Alistair Burgess","2026-03-16",23,0,0,23,"Passed","All items passed."),

  // ── HYGIENE AUDITS 2023 ───────────────────────────────────────────────────
  _mk(4001,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2023-03-16",19,0,0,19,"Passed","All hygiene items passed. Plinth covers, alcohol wipes, hand sanitiser all stocked."),
  _mk(4002,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2023-03-18",19,0,0,19,"Passed","All items passed."),
  _mk(4003,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2023-03-20",19,0,0,19,"Passed","All items passed."),
  _mk(4005,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2023-06-16",19,0,0,19,"Passed","Q2 audit passed."),
  _mk(4006,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2023-06-18",19,0,0,19,"Passed","All items passed."),
  _mk(4007,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2023-06-20",19,0,0,19,"Passed","All items passed."),
  _mk(4009,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2023-09-16",19,0,0,19,"Passed","Q3 audit passed."),
  _mk(4010,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2023-09-18",19,0,0,19,"Passed","All items passed."),
  _mk(4011,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2023-09-20",19,0,0,19,"Passed","All items passed."),
  _mk(4013,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2023-11-16",19,0,0,19,"Passed","Q4 audit passed."),
  _mk(4014,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2023-11-18",19,0,0,19,"Passed","All items passed."),
  _mk(4015,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2023-11-20",19,0,0,19,"Passed","All items passed."),
  // ── HYGIENE 2024 ──────────────────────────────────────────────────────────
  _mk(4017,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-03-16",19,0,0,19,"Passed","Q1 2024. All items passed. Note: one fluorescent tube in the corridor flickering — logged with Sue at Lloyd Elsmore Pools management, they replaced it within 2 days as per usual arrangement."),
  _mk(4018,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-03-18",19,0,0,19,"Passed","All passed."),
  _mk(4019,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-03-20",19,0,0,19,"Passed","All items passed. Hans restocked general supplies (tissues, hand soap, sanitiser refills) from the supermarket on his way in — ongoing arrangement for Titirangi top-ups."),
  _mk(4021,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-06-16",19,0,0,19,"Passed","Q2 2024. All passed."),
  _mk(4022,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-06-18",18,1,0,19,"1 issue found","Two ceiling bulbs out in treatment room 2 — I picked up replacement LED bulbs from Mitre 10 on the way in, swapped them same day. Noted that we tend to run through bulbs faster at Flat Bush than the other clinics, keeping spares in the cupboard now. Face-hole paper towel stock checked and topped up. All other hygiene items passed."),
  _mk(4023,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-06-20",19,0,0,19,"Passed","All passed."),
  _mk(4025,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-09-16",19,0,0,19,"Passed","Q3 2024. All passed."),
  _mk(4026,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-09-18",17,2,0,19,"2 issues found","Ants and what looked like fleas in the waiting area carpet — likely tracked in from school holiday foot traffic. Closed the clinic for half a day, flea-bombed the whole space with insect bomb from Mitre 10, aired out thoroughly, vacuumed twice. Fully resolved by next day. Will keep an eye on it over summer. Face-hole paper towels topped up. All other items passed."),
  _mk(4027,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-09-20",19,0,0,19,"Passed","All passed."),
  _mk(4029,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-11-16",19,0,0,19,"Passed","Q4 2024. All passed."),
  _mk(4030,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-11-18",19,0,0,19,"Passed","All passed."),
  _mk(4031,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-11-20",19,0,0,19,"Passed","All passed."),
  _mk(4032,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2024-11-22",19,0,0,19,"Passed","All passed."),
  // ── HYGIENE 2025 ──────────────────────────────────────────────────────────
  _mk(4033,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2025-03-16",19,0,0,19,"Passed","Q1 2025. All passed."),
  _mk(4034,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Isabella Yang","2025-03-18",19,0,0,19,"Passed","Q1 2025. All items passed. Isabella now running hygiene audits for Flat Bush since she's covering the clinic day-to-day. Topped up face-hole paper towels and hand soap from the supermarket on her way in — ongoing arrangement for Flat Bush supply runs."),
  _mk(4035,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2025-03-20",19,0,0,19,"Passed","All passed."),
  _mk(4036,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2025-03-22",19,0,0,19,"Passed","All passed."),
  _mk(4037,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2025-06-16",19,0,0,19,"Passed","Q2 2025. All items passed. Noted one fluorescent tube starting to flicker in treatment room 1 — emailed Sue at Lloyd Elsmore Pools management, replaced within a day as usual. Al restocked face-hole paper towels and general supplies from the supermarket."),
  _mk(4038,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2025-06-18",19,0,0,19,"Passed","All passed."),
  _mk(4039,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2025-06-20",19,0,0,19,"Passed","All passed."),
  _mk(4040,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2025-06-22",19,0,0,19,"Passed","All passed."),
  _mk(4041,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2025-09-16",18,1,0,19,"1 issue found","Alcohol wipe dispenser in room 3 empty and not noticed by treating physio — restocked immediately. Reminder issued at next staff meeting regarding daily room checks before first client."),
  _mk(4042,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2025-09-18",19,0,0,19,"Passed","All passed."),
  _mk(4043,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2025-09-20",19,0,0,19,"Passed","All passed."),
  _mk(4044,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2025-09-22",19,0,0,19,"Passed","All passed."),
  _mk(4045,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2025-11-16",19,0,0,19,"Passed","Q4 2025. All passed."),
  _mk(4046,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2025-11-18",19,0,0,19,"Passed","All passed."),
  _mk(4047,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2025-11-20",19,0,0,19,"Passed","All passed."),
  _mk(4048,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2025-11-22",19,0,0,19,"Passed","All passed."),
  // ── HYGIENE 2026 Q1 (Pakuranga already logged Apr 4) ─────────────────────
  _mk(4049,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2026-03-11",19,0,0,19,"Passed","Q1 2026. All passed."),
  _mk(4050,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2026-03-13",19,0,0,19,"Passed","All passed."),
  _mk(4051,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2026-03-15",19,0,0,19,"Passed","All passed."),
  // (Pakuranga 2026-04-04 already exists in portal from live audit)

  // ── FIRE DRILLS (annual, each clinic) ────────────────────────────────────
  _mk(5001,"fire_drill","Fire Drill Record","🔥","Pakuranga","Jade Warren","2023-06-15",13,0,0,13,"Passed","Annual fire drill completed. All staff evacuated in under 3 minutes. Roll call completed. No issues."),
  _mk(5002,"fire_drill","Fire Drill Record","🔥","Flat Bush","Jade Warren","2023-06-16",13,0,0,13,"Passed","Drill completed successfully."),
  _mk(5003,"fire_drill","Fire Drill Record","🔥","Titirangi","Hans Vermeulen","2023-06-16",13,0,0,13,"Passed","All staff evacuated. No issues."),
  _mk(5005,"fire_drill","Fire Drill Record","🔥","Pakuranga","Jade Warren","2024-06-14",13,0,0,13,"Passed","Annual fire drill. All staff participated. Evacuation time: 2min 45sec."),
  _mk(5006,"fire_drill","Fire Drill Record","🔥","Flat Bush","Jade Warren","2024-06-14",13,0,0,13,"Passed","Drill completed successfully."),
  _mk(5007,"fire_drill","Fire Drill Record","🔥","Titirangi","Hans Vermeulen","2024-06-15",13,0,0,13,"Passed","All staff evacuated. Meeting point confirmed."),
  _mk(5009,"fire_drill","Fire Drill Record","🔥","Pakuranga","Jade Warren","2025-06-13",13,0,0,13,"Passed","Annual fire drill 2025. All staff and clients safely evacuated. Roll call completed at designated meeting point."),
  _mk(5010,"fire_drill","Fire Drill Record","🔥","Flat Bush","Jade Warren","2025-06-13",13,0,0,13,"Passed","Drill completed successfully."),
  _mk(5011,"fire_drill","Fire Drill Record","🔥","Titirangi","Hans Vermeulen","2025-06-14",13,0,0,13,"Passed","All evacuated. No issues."),
  _mk(5012,"fire_drill","Fire Drill Record","🔥","Panmure","Jade Warren","2025-06-14",13,0,0,13,"Passed","Drill completed. All clear."),
  _mk(5013,"fire_drill","Fire Drill Record","🔥","Pakuranga","Jade Warren","2026-03-20",13,0,0,13,"Passed","Annual fire drill 2026. All staff evacuated. New staff (Gwenne, Ibrahim, Dylan, Komal) participated for first time."),
  _mk(5014,"fire_drill","Fire Drill Record","🔥","Flat Bush","Jade Warren","2026-03-20",13,0,0,13,"Passed","Drill completed successfully."),
  _mk(5015,"fire_drill","Fire Drill Record","🔥","Titirangi","Hans Vermeulen","2026-03-21",13,0,0,13,"Passed","All evacuated. No issues."),
  _mk(5016,"fire_drill","Fire Drill Record","🔥","Panmure","Jade Warren","2026-03-21",13,0,0,13,"Passed","Drill completed."),

  // ── EQUIPMENT AUDITS (annual, each clinic) ────────────────────────────────
  _mk(6001,"equipment","Equipment & Electrical Check","⚡","Pakuranga","Jade Warren","2023-09-15",14,0,0,14,"Passed","All portable appliances tagged. TENS machines functional. Treatment tables in good condition. Sharps disposal confirmed."),
  _mk(6002,"equipment","Equipment & Electrical Check","⚡","Flat Bush","Jade Warren","2023-09-15",14,0,0,14,"Passed","All items passed."),
  _mk(6003,"equipment","Equipment & Electrical Check","⚡","Titirangi","Hans Vermeulen","2023-09-16",14,0,0,14,"Passed","All equipment checked and tagged."),
  _mk(6005,"equipment","Equipment & Electrical Check","⚡","Pakuranga","Jade Warren","2024-09-15",14,0,0,14,"Passed","Annual equipment check 2024. All tags current. All items passed."),
  _mk(6006,"equipment","Equipment & Electrical Check","⚡","Flat Bush","Jade Warren","2024-09-15",14,0,0,14,"Passed","All items passed."),
  _mk(6007,"equipment","Equipment & Electrical Check","⚡","Titirangi","Hans Vermeulen","2024-09-16",14,0,0,14,"Passed","All equipment tagged and functional."),
  _mk(6009,"equipment","Equipment & Electrical Check","⚡","Pakuranga","Jade Warren","2025-09-15",14,0,0,14,"Passed","Annual equipment check 2025. All portable appliances tagged within 12-month period. TENS machines and treatment tables checked."),
  _mk(6010,"equipment","Equipment & Electrical Check","⚡","Flat Bush","Jade Warren","2025-09-15",14,0,0,14,"Passed","All items passed."),
  _mk(6011,"equipment","Equipment & Electrical Check","⚡","Titirangi","Hans Vermeulen","2025-09-16",14,0,0,14,"Passed","All equipment tagged."),
  _mk(6012,"equipment","Equipment & Electrical Check","⚡","Panmure","Jade Warren","2025-09-16",14,0,0,14,"Passed","All items passed."),
  // ── SCHOOLS — Howick & Edgewater (term-based: ~Feb–Jun, Jul–Nov) ────────────
  // H&S — once per term (2x per year)
  _mk(8001,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2023-03-20",23,0,0,23,"Passed","Term 1 H&S — Howick School. First aid kit checked, emergency contacts current. All items passed."),
  _mk(8002,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2023-03-22",23,0,0,23,"Passed","Term 1 H&S — Edgewater School. All items passed."),
  _mk(8003,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2023-08-07",23,0,0,23,"Passed","Term 3 H&S — Howick School. All items passed."),
  _mk(8004,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2023-08-09",23,0,0,23,"Passed","Term 3 H&S — Edgewater School. All items passed."),
  _mk(8005,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2024-03-18",23,0,0,23,"Passed","Term 1 H&S — Howick School. All passed."),
  _mk(8006,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2024-03-20",23,0,0,23,"Passed","Term 1 H&S — Edgewater School. All passed."),
  _mk(8007,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2024-08-05",23,0,0,23,"Passed","Term 3 H&S — Howick School. All passed."),
  _mk(8008,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2024-08-07",22,1,0,23,"1 issue found","Paediatric resuscitation mask in first aid kit expired — replaced immediately. All other items passed."),
  _mk(8009,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2025-03-17",23,0,0,23,"Passed","Term 1 H&S — Howick School. All passed."),
  _mk(8010,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2025-03-19",23,0,0,23,"Passed","Term 1 H&S — Edgewater School. All passed."),
  _mk(8011,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2025-08-04",23,0,0,23,"Passed","Term 3 H&S — Howick School. All passed."),
  _mk(8012,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2025-08-06",23,0,0,23,"Passed","Term 3 H&S — Edgewater School. All passed."),
  _mk(8013,"hs_audit","H&S Workplace Audit","⚠️","Howick School","Alistair Burgess","2026-03-16",23,0,0,23,"Passed","Term 1 2026 H&S — Howick School. All passed."),
  _mk(8014,"hs_audit","H&S Workplace Audit","⚠️","Edgewater School","Alistair Burgess","2026-03-18",23,0,0,23,"Passed","Term 1 2026 H&S — Edgewater School. All passed."),
  // Hygiene — once per term
  _mk(8015,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2023-03-21",19,0,0,19,"Passed","Term 1 hygiene — Howick School. All items passed."),
  _mk(8016,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2023-03-23",19,0,0,19,"Passed","Term 1 hygiene — Edgewater School. All items passed."),
  _mk(8017,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2023-08-08",19,0,0,19,"Passed","Term 3 hygiene — Howick School. All passed."),
  _mk(8018,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2023-08-10",19,0,0,19,"Passed","Term 3 hygiene — Edgewater School. All passed."),
  _mk(8019,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2024-03-19",19,0,0,19,"Passed","Term 1 hygiene — Howick School. All passed."),
  _mk(8020,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2024-03-21",19,0,0,19,"Passed","Term 1 hygiene — Edgewater School. All passed."),
  _mk(8021,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2024-08-06",18,1,0,19,"1 issue found","Face-hole paper towels running low, no spare on-site — Al stopped at the supermarket by Pakuranga after school clinic and restocked. Ongoing arrangement: Al picks up general supplies for Pakuranga + schools when needed. All other items passed."),
  _mk(8022,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2024-08-08",19,0,0,19,"Passed","Term 3 hygiene — Edgewater School. All passed."),
  _mk(8023,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2025-03-18",19,0,0,19,"Passed","Term 1 hygiene — Howick School. All passed."),
  _mk(8024,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2025-03-20",19,0,0,19,"Passed","Term 1 hygiene — Edgewater School. All passed."),
  _mk(8025,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2025-08-05",19,0,0,19,"Passed","Term 3 hygiene — Howick School. All passed."),
  _mk(8026,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2025-08-07",19,0,0,19,"Passed","Term 3 hygiene — Edgewater School. All passed."),
  _mk(8027,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2026-03-17",19,0,0,19,"Passed","Term 1 2026 hygiene — Howick School. All passed."),
  _mk(8028,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2026-03-19",19,0,0,19,"Passed","Term 1 2026 hygiene — Edgewater School. All passed."),

  // ── PEER REVIEWS — from actual PBNZ peer review templates ─────────────────
  _mk(9001,"peer_review","Annual Peer Review","🔍","Titirangi","Jonathan Gaul","2023-10-20",28,0,0,28,"Passed","External peer review by Jonathan Gaul (70-07094). Clinical — direct observation. Strong ability to connect with patients. Professional communication, thorough subjective/objective assessment, evidence-based treatment plan. Action plan: continue current practice, consider teaching opportunities, look at developing FCE reports 6-9 months.","Jade Warren"),
  _mk(9002,"peer_review","Annual Peer Review","🔍","Titirangi","Jade Warren","2023-10-20",28,0,0,28,"Passed","Reviewer reg: 70-07094 (Jade). Clinical — direct observation. Achilles case. Hans highly professional, well-organised treatment space. Thorough subjective assessment despite hearing-aid challenges — recommendation to use written questionnaires. Excellent treatment plan and clinical reasoning. Action plan: continue current practice, consider teaching, FCE reports.","Hans Vermeulen"),
  _mk(9003,"peer_review","Annual Peer Review","🔍","Pakuranga","Jade Warren","2024-02-07",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Lower back strain case. Excellent use of open-ended questions in subjective. Effective objective measures — suggestion to include posture assessment. Clinical reasoning well articulated and evidence-based. Action plan: posture assessment training within 2 months, patient-centred care strategies within 3 months, monthly progress meetings.","Timothy Keung"),
  _mk(9004,"peer_review","Annual Peer Review","🔍","Pakuranga","Jade Warren","2024-09-11",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. MCL injury case. Alistair demonstrated excellent professional practice — clear communication, thorough subjective assessment, comprehensive objective examination including valgus stress test and Thessaly's test. Evidence-based treatment plan (PRICE, graduated ROM, progressive strengthening, proprioception, RTS protocol). Action plan: explore latest MCL rehab research, mentor junior staff/conduct in-house training.","Alistair Burgess"),
  _mk(9005,"peer_review","Annual Peer Review","🔍","Pakuranga","Jade Warren","2024-09-11",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Hamstring strain case. Strong professional practice, comprehensive subjective assessment covering injury mechanism and functional limitations. Objective exam methodical — SLR, active knee extension, lumbar/neural screen. Sound clinical reasoning resulting in accurate grading. Action plan: work on conciseness in explanations, observe senior colleagues in complex cases, consider advanced sports rehab or manual therapy courses, stay updated with latest research.","Dylan Connolly"),
  _mk(9006,"peer_review","Annual Peer Review","🔍","Titirangi","Jade Warren","2025-09-15",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Hans continues to demonstrate strong clinical skills, excellent patient rapport. Working well in mentor role as planned for 2026. Action plan: continue mentor role with Gwenne, share clinical reasoning approach with team.","Hans Vermeulen"),
  _mk(9007,"peer_review","Annual Peer Review","🔍","Pakuranga","Jade Warren","2025-09-15",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Alistair continues excellent clinical practice — Senior Physio and H&S Officer responsibilities well managed. Action plan: continue current practice, progress H&S leadership.","Alistair Burgess"),
  _mk(9008,"peer_review","Annual Peer Review","🔍","Pakuranga","Jade Warren","2025-09-15",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Timothy maintaining strong clinical standards. Action plan: continue SMART goal focus, CPD on track.","Timothy Keung"),
  _mk(9009,"peer_review","Annual Peer Review","🔍","Pakuranga","Jade Warren","2025-09-15",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Dylan progressing well, now working as contractor. Action plan: continue development across Pakuranga and schools, mentor opportunities as experience grows.","Dylan Connolly"),
  _mk(9010,"peer_review","Annual Peer Review","🔍","Flat Bush","Jade Warren","2025-09-15",28,0,0,28,"Passed","Reviewer: Jade Warren (70-07094). Clinical — direct observation. Isabella managing Flat Bush operations well. Strong clinical assessment skills. Action plan: continue building case load, develop communication with referrers, engage with local GP practices.","Isabella Yang"),
  _mk(9011,"peer_review","Annual Peer Review","🔍","Titirangi","Alistair Burgess","2025-09-15",28,0,0,28,"Passed","Reviewer: Alistair Burgess (Senior Physio). Clinical — direct observation. Jade demonstrates strong clinical skills as Director and Owner, continues to set good example across clinics. Action plan: continue current excellent practice.","Jade Warren"),

  // ── CLINICAL NOTES AUDITS — from actual audit forms ───────────────────────
  _mk(9101,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Dylan Connolly","2023-10-20",15,3,1,19,"3 issues found","Audit of 5 current + 5 past records. Consent 0% (major issue). Goals: Identified 70%, Measurable 0%, Time bound 10%. Adverse reaction warnings 0%. To work on: Goal Setting — SMART, Warnings re adverse Rx effects, Evidence of explanation of Ax + Rx.","Jade Warren"),
  _mk(9102,"clinical_notes","Clinical Notes Audit","📋","Flat Bush","Dylan Connolly","2023-10-20",14,4,1,19,"Several issues","Audit of 5 current + 5 past records. Consent 100%, Assessment 90–100%. Goals: Identified 0%, Measurable 0%, Time bound 0%. DC summaries 20%, Goals evaluated 20%. To work on: Goal Setting, Complete DC Summaries, Completing notes for each appointment.","Timothy Keung"),
  _mk(9103,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Dylan Connolly","2023-10-20",15,3,1,19,"3 issues found","Audit of 5 current + 5 past records. Notes logical 100%, Consent 100%, Assessment 100%. Goals: Identified 10%, Measurable 0%, Time bound 0%. Adverse reactions 0%, DC summaries 0%. To work on: Goal Setting — SMART, Note warnings re adverse Rx reactions, Discharging patients.","Hans Vermeulen"),
  _mk(9104,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2023-12-11",17,1,1,19,"DC summaries to complete","Dylan's clinical notes audit. 5 current + 5 past records. Most items 100%. DC summaries 20%, Goals evaluated 80%. To work on: Ensure discharge summaries completed for discharged patients — follow up phonecall or visit. Goals — always measurable, time bound.","Dylan Connolly"),
  _mk(9105,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2024-08-07",19,0,0,19,"Passed","Hans's H1 2024 notes audit. 5 current + 5 past records. All criteria 100% except Time bound 80%. 'Great notes' — very strong documentation across the board. No work-ons identified.","Hans Vermeulen"),
  _mk(9106,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Hans Vermeulen","2024-08-07",17,2,0,19,"2 issues found","Jade's H1 2024 notes audit, audited by Hans. All sections strong (100%). Discharge summary 80%, Goals Time bound 80%. To work on: Inconsistent use of VAS, Discharge planning in place but follow up for DC not completed on occasions.","Jade Warren"),
  _mk(9107,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2024-08-07",11,7,1,19,"Multiple issues","Alistair's H1 2024 notes audit. Notes 100%, Consent 100%. Goals: Measurable 50%, Time bound 0%. Treatment plan 70%, Treatment given 80%, Review 70%, DC summaries 0%. To work on: Notes incomplete, missing notes, avoid copy & paste notes, GOALS — need to be SMART (identified but no measure or time frame), D/C summaries not complete.","Alistair Burgess"),
  _mk(9108,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2024-08-07",12,6,1,19,"Multiple issues","Tim's H1 2024 notes audit. Notes 100%, Consent 100%, Assessment 80–100%. Goals: Measurable 0%, Time bound 0%. Treatment given 70%, Review 80%, DC 0%. To work on: Goals — not measurable or time bound, Notes incomplete — not done, No discharges done or incomplete, To do summaries.","Timothy Keung"),
  _mk(9109,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2024-08-07",16,2,1,19,"2 issues found","Dylan's H1 2024 notes audit. Most sections 100%. Goals: Measurable 70%, Time bound 70%. DC summaries 60%. To work on: Goals to be time framed e.g. 4 weeks, Measurable, Make sure Discharge summaries are completed.","Dylan Connolly"),
  _mk(9110,"clinical_notes","Clinical Notes Audit","📋","Flat Bush","Jade Warren","2024-08-07",18,1,0,19,"1 minor issue","Isabella's first notes audit. All criteria 100% across both current and past records. Very strong foundation. To work on: More detail needed in notes.","Isabella Yang"),
  _mk(9111,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2025-02-15",18,1,0,19,"1 minor issue","Hans's H2 2024 notes audit. Continued strong documentation. Minor refinements only.","Hans Vermeulen"),
  _mk(9112,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Alistair Burgess","2025-02-15",18,1,0,19,"Improved from H1","Jade's H2 2024 notes audit, audited by Alistair. Improvement on VAS use and discharge follow-ups from previous audit.","Jade Warren"),
  _mk(9113,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-02-15",15,3,1,19,"Improved","Alistair's H2 2024 notes audit. SMART goals much improved since August audit. Discharge summaries now being completed. Still some work on consistency with treatment plan detail.","Alistair Burgess"),
  _mk(9114,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-02-15",14,4,1,19,"Partial improvement","Tim's H2 2024 notes audit. Goals now attempted SMART format. Still gaps in discharge summaries. Continue working on completion of notes per session.","Timothy Keung"),
  _mk(9115,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2025-02-15",17,2,0,19,"Improved","Dylan's H2 2024 notes audit. Goals now time-framed. DC summaries being completed. Strong improvement overall.","Dylan Connolly"),
  _mk(9116,"clinical_notes","Clinical Notes Audit","📋","Flat Bush","Jade Warren","2025-02-15",19,0,0,19,"Passed","Isabella's H2 2024 notes audit. Detail in notes improved from previous audit. All criteria 100%.","Isabella Yang"),
  _mk(9117,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2025-08-07",19,0,0,19,"Passed","Hans's H1 2025 notes audit. Continued strong documentation. All criteria met.","Hans Vermeulen"),
  _mk(9118,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Alistair Burgess","2025-08-07",18,1,0,19,"1 minor issue","Jade's H1 2025 notes audit, audited by Alistair. Excellent continued improvement. Minor refinement on VAS documentation consistency.","Jade Warren"),
  _mk(9119,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-08-07",18,1,0,19,"1 minor issue","Alistair's H1 2025 notes audit. Major improvement since 2024 audits. Goals consistently SMART, discharge summaries complete. One minor note re treatment detail.","Alistair Burgess"),
  _mk(9120,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-08-07",17,2,0,19,"Improved","Tim's H1 2025 notes audit. Significant improvement on SMART goals and discharge summaries. Continuing progress.","Timothy Keung"),
  _mk(9121,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-08-07",18,1,0,19,"1 minor issue","Dylan's H1 2025 notes audit (first audit as contractor). All sections strong. Minor refinement on dose documentation for interventions.","Dylan Connolly"),
  _mk(9122,"clinical_notes","Clinical Notes Audit","📋","Flat Bush","Jade Warren","2025-08-07",19,0,0,19,"Passed","Isabella's H1 2025 notes audit. All criteria 100%. Continued excellent documentation.","Isabella Yang"),

  // ── PERFORMANCE APPRAISALS — annual April/May ─────────────────────────────
  _mk(9201,"appraisal","Annual Performance Appraisal","📊","Titirangi","Jade Warren","2023-05-10",8,0,0,8,"Passed","Self-review as Owner/Director. 20+ years physiotherapy experience. Reviewed P&P manual, CPD hours (>33 for year), all APC/First Aid/Cultural Competency current. Plan for year ahead: support new staff onboarding, maintain clinic profile across all sites.","Jade Warren"),
  _mk(9202,"appraisal","Annual Performance Appraisal","📊","Titirangi","Jade Warren","2023-05-10",8,0,0,8,"Passed","Hans — 20+ years tenure at TBP. Strong clinical performance, well-regarded Titirangi clinic lead. Contract and JD reviewed. CPD on track. Plan: continue clinical leadership at Titirangi, mentorship opportunities.","Hans Vermeulen"),
  _mk(9203,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2023-05-10",8,0,0,8,"Passed","Tim — strong performance, long-standing employee. Contract and JD reviewed. CPD on track. Plan: continue current role, focus on SMART goal documentation.","Timothy Keung"),
  _mk(9204,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2024-04-22",8,0,0,8,"Passed","Alistair — first annual appraisal (joined Oct 2023). Excellent transition into Senior Physio + H&S Officer role. Contract signed and in file, JD reviewed. CPD on track. Plan: continue H&S leadership, support onboarding for new physios.","Alistair Burgess"),
  _mk(9205,"appraisal","Annual Performance Appraisal","📊","Titirangi","Jade Warren","2024-04-22",8,0,0,8,"Passed","Self-review as Owner/Director. Year 2 of compliance portal implementation. All personal compliance items current. Plan: P&P manual 2024 review, prepare for DAA accreditation audit.","Jade Warren"),
  _mk(9206,"appraisal","Annual Performance Appraisal","📊","Titirangi","Jade Warren","2024-04-22",8,0,0,8,"Passed","Hans — continued strong clinical performance. Minor hearing-aid accommodation discussed — written questionnaires useful for initial patient info. Plan: continue at Titirangi, consider mentor role for incoming staff.","Hans Vermeulen"),
  _mk(9207,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2024-04-22",8,0,0,8,"Passed","Tim — continued strong performance. CPD on track. Plan: continue current role, focus on documentation completion and SMART goals (flagged in notes audit).","Timothy Keung"),
  _mk(9208,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2024-04-22",8,0,0,8,"Passed","Dylan — annual review. Strong clinical performance. CPD on track. Plan: continue development, consider broader case mix.","Dylan Connolly"),
  _mk(9209,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2025-04-22",8,0,0,8,"Passed","Alistair — 18 months with TBP. Strong Senior Physio performance, H&S Officer role well-executed. Contract and JD reviewed. Plan: continue H&S leadership, lead Ibrahim's orientation when he starts January 2026.","Alistair Burgess"),
  _mk(9210,"appraisal","Annual Performance Appraisal","📊","Titirangi","Jade Warren","2025-04-22",8,0,0,8,"Passed","Self-review as Owner/Director. Significant year — flood renovation at Titirangi, new staff onboarding. Plan: continue digital compliance improvements, support expansion of service offerings.","Jade Warren"),
  _mk(9211,"appraisal","Annual Performance Appraisal","📊","Titirangi","Jade Warren","2025-04-22",8,0,0,8,"Passed","Hans — excellent mentor role developing. Flood recovery handled well. Plan: formalise mentor role for Gwenne from December, continue Titirangi clinical lead duties.","Hans Vermeulen"),
  _mk(9212,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2025-04-22",8,0,0,8,"Passed","Tim — continued strong performance. Documentation improvement noted in recent audits. Plan: continue SMART goal focus, CPD on track.","Timothy Keung"),
  _mk(9213,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2025-04-22",8,0,0,8,"Passed","Dylan — transitioning to contractor from 2025. Contract updated to contractor agreement. Plan: continue clinical work across Pakuranga and schools, maintain CPD and audit cycle.","Dylan Connolly"),
  _mk(9214,"appraisal","Annual Performance Appraisal","📊","Flat Bush","Jade Warren","2025-04-22",8,0,0,8,"Passed","Isabella — first annual appraisal (joined June 2024). Excellent transition, running Flat Bush well. Contract and JD reviewed. Plan: continue building clinic profile, engage with local referrers.","Isabella Yang"),
  _mk(9215,"appraisal","Annual Performance Appraisal","📊","Pakuranga","Jade Warren","2026-04-22",8,0,0,8,"Passed","Alistair — 2+ years with TBP. Senior Physio role excellent, H&S Officer + orientation lead for Ibrahim. Plan: continue H&S leadership, support ongoing team development.","Alistair Burgess"),
];

// ── SEED INSERVICES — built from uploaded records ────────────────────────────
// IDs 1-99 are reserved for seed records; user-added records use Date.now() (>= ~1.7e12).
// type/hours/loggedTo are what the KPI uses to credit each staff member's CPD.
const INIT_INSERVICES = [
  {id:1,date:"2024-03-06",clinic:"All clinics",topic:"Kettlebells, Achilles review, Acupuncture, Patient cases",presenter:"Alistair, Dylan, Tim",attendees:"Jade, Alistair, Dylan, Tim",type:"inservice",hours:1.5,loggedTo:["jade","alistair","dylan","timothy"],notes:"Alistair — Kettlebell Inservice & Rehab applications (Meigh et al. 2019 scoping review, BELL trial in older adults). Dylan — Patient review: Achilles. Tim — Acupuncture review & evidence. Discussion re: Schools coverage. Files: Inservice_March_6_2024.pdf, KETTLEBELLS_Inservice.docx, s13102-019-0130-z.pdf, Effects_of_supervised_hardstyle_kettlebell_training.pdf",year:2024},
  {id:2,date:"2024-04-24",clinic:"All clinics",topic:"AMPS paper · Pelvis assessment · Natural history · Case study",presenter:"Alistair, Dylan",attendees:"Jade, Alistair, Dylan",type:"inservice",hours:1.5,loggedTo:["jade","alistair","dylan"],notes:"Alistair — Pelvis Assessment techniques & Differentiation. Dylan — Natural History of Conditions. AMPS (Amplified Musculoskeletal Pain Syndrome) paper review (Sherry et al. 2020 pediatric rheumatology cohort of 636). Clinic business: DNAs process using SEED, cancellation fees, uniform review. Files: Staff_Meeting_Inservice_April_24_2024.pdf, In_service_24_April_24_AMPS_paper.pdf",year:2024},
  {id:3,date:"2024-07-15",clinic:"All clinics",topic:"Patellar Tendinopathy — assessment & treatment",presenter:"Dylan Connolly",attendees:"Jade, Alistair, Dylan, Hans",type:"inservice",hours:1,loggedTo:["jade","alistair","dylan","hans"],notes:"Jumper's knee. Repetitive extensor overload — common in volleyball, basketball. Risk factors: reduced quad strength, inappropriate training load, flexibility deficits. Treatments compared: Progressive Tendon Loading (Breda 2020) vs eccentrics, Isometric → HSR (Lim 2018), ESWT, PRP, K-Tape, load management. Dose (Pavlova 2023): higher intensity, lower frequency. File: Patellar_Tendinopathy_Inservice_July_24.pdf",year:2024},
  {id:4,date:"2025-02-11",clinic:"All clinics",topic:"Beyond 3 × 10 — Strength training for rehab & beyond",presenter:"Alistair Burgess",attendees:"Jade, Alistair, Hans, Dylan, Timothy",type:"inservice",hours:1,loggedTo:["jade","alistair","hans","dylan","timothy"],notes:"SAID principle (Specific Adaptation to Imposed Demand). Strength–endurance continuum: 1–6 reps = strength, 8–12 = hypertrophy, 15+ = endurance. Rehab progression: Pain/swelling → ROM → general strength → specific strength → return to activity/sport. Loading protocols explored: 5×5, 10×10, 3×3, EMOM/AMRAP, ladders, singles, TUT. NZ aging population context. File: Inservice_Strength_Training_Beyond_3x10.pdf",year:2025},
  {id:5,date:"2025-05-14",clinic:"All clinics",topic:"Case study — 73yo male, calf strain → Achilles rupture",presenter:"Dylan Connolly",attendees:"Jade, Alistair, Dylan, Hans, Timothy",type:"inservice",hours:1,loggedTo:["jade","alistair","dylan","hans","timothy"],notes:"73yo, initial Grade I calf strain walking downhill. Pre-injury ax Dec 2023 clear — Thompson squeeze cleared. On second step of skipping test, loud pop, Achilles tear confirmed same day. Timeline: Eastcare confirmation → 6 wk plaster → 6 wk moonboot → ortho → WBAT + heel inserts → physio return. Research: Xergia 2023 (risk factors), Ochen 2019 (operative vs non-operative — re-rupture diff only 1.6%, complications 3.3%). File: TBP_Case_Study.pdf",year:2025},
  {id:6,date:"2025-08-20",clinic:"All clinics",topic:"Knee meniscus tear — presentation & management",presenter:"",attendees:"Jade, Alistair, Dylan, Hans",type:"inservice",hours:1,loggedTo:["jade","alistair","dylan","hans"],notes:"Review of meniscus tear presentation, assessment, and management options. File: Knee_meniscus_tear.pptx",year:2025},
  {id:7,date:"2025-11-05",clinic:"All clinics",topic:"School Nurse Study Day — TBP presentation",presenter:"",attendees:"Jade",type:"inservice",hours:1,loggedTo:["jade"],notes:"External presentation delivered at School Nurse Study Day. Covered TBP physiotherapy services, referral pathways, and common paediatric MSK presentations. File: Presentation_School_Nurse_Study_Day.pptx",year:2025},
  {id:8,date:"2026-02-18",clinic:"All clinics",topic:"MSK Paediatrics & Growing Pains — introduction",presenter:"",attendees:"Jade, Alistair, Dylan, Hans",type:"inservice",hours:1,loggedTo:["jade","alistair","dylan","hans"],notes:"Introduction to paediatric MSK presentations. Growing pains vs pathological causes. Differentials and when to refer. File: An_Introduction_to_MSK_Paeds_and_Growing_Pains.pptx",year:2026},
];

export default function App(){
  const[page,setPage]=useState("dashboard");const[profile,setProfile]=useState(null);const[role,setRole]=useState("owner");
  const[portalLoading,setPortalLoading]=useState(true);
  const[portalConnected,setPortalConnected]=useState(false);
  const[,forceRender]=useState(0);
  const[compTab,setCompTab]=useState("overview");const[mgmtTab,setMgmtTab]=useState("audits");const[docsTab,setDocsTab]=useState("contracts");const[isrvTab,setIsrvTab]=useState("log");
  const[meetings,setMeetings]=useState([]);
  const[audits,setAudits]=useState(INIT_AUDITS);
  const[inservices,setInservices]=useState(INIT_INSERVICES);
  const[activeAudit,setActiveAudit]=useState(null);
  const[viewAudit,setViewAudit]=useState(null);
  // logAudit and showLogAudit moved into ManagementPage to prevent re-mount on every keystroke
  const[extAudits,setExtAudits]=useState(()=>loadGen("extAudits")||[]);
  const[eavf,setEavf]=useState(null);
  const[analysing,setAnalysing]=useState(null);
  const[showExtForm,setShowExtForm]=useState(false);
  const[extLabel,setExtLabel]=useState("");
  const[mFilter,setMFilter]=useState("");
  const[mYearFilter,setMYearFilter]=useState("all");
  const[mClinicFilter,setMClinicFilter]=useState("all");
  const[ppDocs,setPpDocs]=useState(()=>loadGen("ppDocs")||[]);
  const[ppReviews,setPpReviews]=useState(()=>loadGen("ppReviews")||{});
  const[ppAiAnalysis,setPpAiAnalysis]=useState({});
  const[urgentOpen,setUrgentOpen]=useState(true);
  const[auditTypeFilter,setAuditTypeFilter]=useState("all");
  const[auditYearFilter,setAuditYearFilter]=useState("all");
  const[auditClinicFilter,setAuditClinicFilter]=useState("all");
  const[collapsedYears,setCollapsedYears]=useState({});
  const[vf,setVf]=useState(null);const[,fu]=useState(0);
  const[navOpen,setNavOpen]=useState(false);
  const[isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  useEffect(()=>{
    let rTimer=null;
    const h=()=>{clearTimeout(rTimer);rTimer=setTimeout(()=>{const m=window.innerWidth<768;setIsMobile(prev=>prev===m?prev:m);},150);};
    window.addEventListener("resize",h);
    return()=>{window.removeEventListener("resize",h);clearTimeout(rTimer);};
  },[]);
  const[staffOverrides,setStaffOverrides]=useState({});
  const roleNames={owner:"Jade Warren",alistair:"Alistair Burgess",hans:"Hans Vermeulen",staff:"Staff member"};
  // Hydrate React state from _portalStore — runs on initial load and after a
  // successful Connect so data appears without needing a manual refresh.
  const hydrateFromStore = useCallback(() => {
    const d = _portalStore.data;

    // Seeded records (IDs < 100000): INIT always wins for record data,
    // BUT we preserve any evidence/attachment the user already generated
    // so documents don't disappear when code is updated.
    // User records (timestamp IDs >= 100000): Drive always wins.
    const isSeeded = id => typeof id === 'number' && id < 100000;

    const deletedIds = new Set([
      ...(d["deletedAuditIds"] || []),
      ...JSON.parse(localStorage.getItem("tbp_deleted_audit_ids") || "[]"),
    ]);

    const driveById = {};
    (d["audits"]||[]).forEach(a => { if(isSeeded(a.id)) driveById[a.id] = a; });
    const driveMeetById = {};
    (d["meetings"]||[]).forEach(m => { if(isSeeded(m.id)) driveMeetById[m.id] = m; });

    const driveAudits   = (d["audits"]   || []).filter(a => !isSeeded(a.id));
    const driveMeetings = (d["meetings"] || []).filter(m => !isSeeded(m.id));

    const initAudits = INIT_AUDITS
      .filter(a => !deletedIds.has(a.id))
      .map(a => { const drv = driveById[a.id]; return drv?.evidence ? {...a, evidence: drv.evidence} : a; });
    const initMeetings = INIT_MEETINGS.map(m => {
      const drv = driveMeetById[m.id];
      return drv?.attachment ? {...m, attachment: drv.attachment} : m;
    });

    const newAudits   = [...initAudits,   ...driveAudits];
    const newMeetings = [...initMeetings, ...driveMeetings];
    newAudits.sort((a,b)=>b.date.localeCompare(a.date));
    newMeetings.sort((a,b)=>b.date.localeCompare(a.date));

    setAudits(newAudits);
    setMeetings(newMeetings);
    saveGen("audits",   newAudits);
    saveGen("meetings", newMeetings);

    if(d["inservices"]||INIT_INSERVICES.length){
      // Shared with KPI app: inservice broadcasts (type 'inservice' or no type)
      // PLUS personal CPD entries (type 'personal_cpd'). Show all of them but tag
      // personal CPD with _isPersonal so the UI can style them differently.
      const isSeeded = id => typeof id === 'number' && id <= 99;
      const deletedInserviceIds = new Set(d["deletedInserviceIds"] || []);
      const raw = d["inservices"] || [];
      const driveById = {};
      raw.forEach(e => { if(isSeeded(e?.id)) driveById[e.id] = e; });
      // User-created records (timestamp ids) — keep Drive as-is
      const userRecords = raw.filter(e => !isSeeded(e?.id));
      // INIT records — restore if present in Drive (Drive wins for user-edited fields)
      // but exclude any the user has intentionally deleted
      const seedRecords = INIT_INSERVICES
        .filter(s => !deletedInserviceIds.has(s.id))
        .map(s => driveById[s.id] || s);
      const combined = [...seedRecords, ...userRecords];
      // If any seed records aren't yet in Drive, push the merged array so KPI
      // (and other clients) can read them. Idempotent after first run — once
      // seeds are in Drive they'll be in `raw` and this condition is false.
      const rawIds = new Set(raw.map(e => String(e?.id)));
      const missingSeeds = seedRecords.filter(s => !rawIds.has(String(s.id)));
      if (missingSeeds.length > 0) {
        _log('[Portal] Pushing', missingSeeds.length, 'seed inservice(s) to Drive so KPI can see them');
        _portalStore.data["inservices"] = combined;
        // Immediate write instead of debounced — ensures KPI sees seeds before
        // the user switches tabs or closes the portal.
        _saveDriveState().catch(e => _warn('[Portal seed push]', e.message||e));
        // Also mirror to Vercel — KPI's readFullLog checks both sources.
        try {
          fetch(PORTAL_API+"/store",{headers:{"X-Portal-Secret":PORTAL_SECRET}})
            .then(r=>r.ok?r.json():{}).then(vs=>{
              const vercelExisting = Array.isArray(vs.data?.inservices) ? vs.data.inservices : [];
              const vercelIds = new Set(vercelExisting.map(e=>String(e?.id)));
              const merged = [...combined, ...vercelExisting.filter(e=>!vercelIds.has(String(e?.id))||!combined.find(c=>String(c.id)===String(e.id)))];
              const finalArr = [...new Map(merged.map(e=>[String(e.id),e])).values()];
              fetch(PORTAL_API+"/store",{method:"POST",headers:{"Content-Type":"application/json","X-Portal-Secret":PORTAL_SECRET},body:JSON.stringify({key:"inservices",value:finalArr})}).catch(()=>{});
            }).catch(()=>{});
        } catch {}
      }
      const cleaned=combined
        .map(e=>{
          const isInservice = !e.type || e.type==="inservice";
          const isPersonalCpd = e.type==="personal_cpd";
          if(!isInservice && !isPersonalCpd) return null;
          return {
            ...e,
            _isPersonal: isPersonalCpd,
            topic: e.topic || e.title || "(untitled)",
            clinic: e.clinic || (isPersonalCpd ? "Personal CPD" : "All clinics"),
            year: e.year || parseInt((e.date||"").slice(0,4)) || new Date().getFullYear(),
          };
        })
        .filter(Boolean);
      setInservices(cleaned);
    }
    if(d["extAudits"]&&d["extAudits"].length)setExtAudits(d["extAudits"]);
    if(d["ppDocs"])setPpDocs(d["ppDocs"]||[]);
    if(d["ppReviews"])setPpReviews(d["ppReviews"]||{});
    const overrides={};
    Object.keys(STAFF).forEach(id=>{
      const ei=d[`empinfo_${id}`]||null;
      if(ei)overrides[id]=ei;
    });
    setStaffOverrides(overrides);
  }, []);

  useEffect(()=>{
    _portalForceUpdate=forceRender;
    _loadStore().then((ok)=>{
      setPortalConnected(ok&&_portalReady);
      if(ok){
        hydrateFromStore();
      } else {
        setAudits(INIT_AUDITS);
        setMeetings(INIT_MEETINGS);
      }

      // ── Always pull user-created audits from Vercel too ──────────────────
      // KPI on iOS saves audits to Vercel when Drive auth unavailable.
      // Pull them here so the portal always shows them regardless of Drive status.
      fetch(PORTAL_API+"/store",{headers:{"X-Portal-Secret":PORTAL_SECRET}})
        .then(r=>r.ok?r.json():{}).then(vs=>{
          const vercelAudits=(Array.isArray(vs.data?.audits)?vs.data.audits:[])
            .filter(a=>typeof a.id==='string'||Number(a.id)>=100000);
          if(vercelAudits.length){
            setAudits(prev=>{
              const existingIds=new Set(prev.map(a=>String(a.id)));
              const toAdd=vercelAudits.filter(a=>!existingIds.has(String(a.id)));
              if(toAdd.length===0)return prev;
              const merged=[...prev,...toAdd].sort((a,b)=>b.date.localeCompare(a.date));
              saveGen("audits",merged);
              _log('[Portal] Pulled',toAdd.length,'audit(s) from Vercel');
              return merged;
            });
          }
          // Same trick for inservices — KPI may have written them to Vercel only
          // if Drive auth was down at the time.
          const vercelInservices=Array.isArray(vs.data?.inservices)?vs.data.inservices:[];
          if(vercelInservices.length){
            setInservices(prev=>{
              const existingIds=new Set(prev.map(i=>String(i?.id)));
              const toAdd=vercelInservices
                .filter(e=>!existingIds.has(String(e?.id)))
                .filter(e=>!e.type||e.type==="inservice"||e.type==="personal_cpd")
                .map(e=>{
                  const isPersonalCpd=e.type==="personal_cpd";
                  return{
                    ...e,
                    _isPersonal:isPersonalCpd,
                    topic:e.topic||e.title||"(untitled)",
                    clinic:e.clinic||(isPersonalCpd?"Personal CPD":"All clinics"),
                    year:e.year||parseInt((e.date||"").slice(0,4))||new Date().getFullYear(),
                  };
                });
              if(toAdd.length===0)return prev;
              // Sync the Vercel-only records back into Drive state so they persist properly
              const raw=(_portalStore?.data?.["inservices"])||[];
              const rawIds=new Set(raw.map(e=>String(e?.id)));
              const missingFromDrive=vercelInservices.filter(e=>!rawIds.has(String(e?.id)));
              if(missingFromDrive.length>0){
                saveGen("inservices",[...raw,...missingFromDrive]);
                _log('[Portal] Pushed',missingFromDrive.length,'inservice(s) from Vercel to Drive');
              }
              return[...prev,...toAdd];
            });
          }
        }).catch(()=>{});

      setPortalLoading(false);
    });
  },[]);
  // Derive effective staff from React state — reactive to changes
  function es(id){
    const base=STAFF[id]||{};
    const ei=staffOverrides[id]||null;
    if(!ei)return base;
    const typeMap={"Employed":"Employee","Sub Contractor":"Contractor","Owner":"Owner"};
    return{...base,type:typeMap[ei.employmentType]||base.type,clinics:ei.clinics&&ei.clinics.length?ei.clinics:base.clinics};
  }
  const reminders=getReminders();const urgentCount=reminders.filter(r=>r.status!=="ok").length;

  const navItems=[
    {id:"dashboard",label:"◈  Dashboard",    section:"Overview"},
    {id:"reminders",label:"🔔  Reminders",    badge:urgentCount>0?String(urgentCount):null},
    {id:"pp",       label:"📖  Policies & P", badge:null},
    {id:"compliance",label:"✓  Compliance"},
    {id:"staff",    label:"◉  All Staff",     section:"People"},
    {id:"archive",  label:"◎  Past Staff",    adminOnly:true},
    {id:"clinics",  label:"⊕  Clinics",       section:"Clinic"},
    {id:"inservice",label:"◇  In-service"},
    {id:"documents",label:"◻  Documents",     section:"Admin"},
    {id:"management",label:"◈  Management",   adminOnly:true},
  ];

  function TabBar({items,current,setter}){return <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem",overflowX:"auto"}}>{items.map(([id,label])=><div key={id} onClick={()=>setter(id)} style={{padding:"7px 14px",fontSize:13,color:current===id?C.teal:C.muted,cursor:"pointer",borderBottom:current===id?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:current===id?500:400,whiteSpace:"nowrap"}}>{label}</div>)}</div>;}

  const Dashboard=()=>{
    const sa=Object.entries(STAFF);const tr=sa.reduce((acc,[id])=>acc+staffComp(id).total,0);const td=sa.reduce((a,[id])=>a+staffComp(id).done,0);const pct=tr>0?Math.round((td/tr)*100):0;
    return(
      <div>
        <PH title="Good morning, Jade 👋" sub={"Total Body Physio — Compliance & HR Portal · April 2026" + (portalConnected ? " · 📁 Google Drive connected" : " · ⚠️ Connect Google Drive in sidebar")}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
          {[[String(Object.keys(STAFF).length),"Staff",C.teal],[`${pct}%`,"Compliance",pct>=80?C.teal:pct>50?C.amber:C.red],[String(urgentCount),"Due/overdue",urgentCount>0?C.red:C.teal],[String(audits.length),"Audit records",C.blue]].map(([n,l,c])=>(
            <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:700,color:c}}>{n}</div><div style={{fontSize:11,color:C.muted,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
        {(()=>{
          const issues=Object.entries(STAFF).flatMap(([id,s])=>{
            const found=[];
            const isOwner=STAFF[id]?.type==="Owner";
            CORE_CERTS.filter(c=>c.required&&!(c.notForOwner&&isOwner)).forEach(cert=>{
              const f=loadFile(id,cert.key);
              if(!f){found.push({name:s.name,id,issue:cert.label+" — missing",level:"missing"});}
              else if(f.expiry&&getExpiryStatus(f.expiry).status==="expired"){found.push({name:s.name,id,issue:cert.label+" — expired "+new Date(f.expiry).toLocaleDateString("en-NZ"),level:"expired"});}
            });
            return found;
          });
          if(!issues.length)return <Alert type="green" title="✅ All certifications current">No expired or missing required documents.</Alert>;
          const grouped={};issues.forEach(i=>{if(!grouped[i.name])grouped[i.name]={id:i.id,items:[]};grouped[i.name].items.push(i.issue);});
          const count=Object.keys(grouped).length;
          return(
            <div style={{background:"#FCEBEB",borderLeft:`3px solid ${C.red}`,borderRadius:6,marginBottom:"0.875rem",overflow:"hidden"}}>
              <div onClick={()=>setUrgentOpen(o=>!o)} style={{padding:"0.875rem 1rem",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
                <div style={{fontSize:13,fontWeight:600,color:C.red}}>🔴 Urgent — {count} staff member{count!==1?"s":""} need action</div>
                <span style={{fontSize:18,color:C.red,transform:urgentOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s",display:"inline-block"}}>›</span>
              </div>
              {urgentOpen&&<div style={{padding:"0 1rem 0.875rem"}}>
                {Object.entries(grouped).map(([name,{id,items}])=>(
                  <div key={name} onClick={()=>setProfile(id)} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6,padding:"6px 8px",borderRadius:6,cursor:"pointer",background:"rgba(226,75,74,0.06)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(226,75,74,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(226,75,74,0.06)"}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:STAFF[id]?.color||C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"white",flexShrink:0}}>{STAFF[id]?.ini}</div>
                    <div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{name}</div><div style={{fontSize:11,color:C.muted,marginTop:1}}>{items.join(" · ")}</div></div>
                    <span style={{marginLeft:"auto",fontSize:11,color:C.red,fontWeight:500,flexShrink:0}}>Upload →</span>
                  </div>
                ))}
                <div style={{fontSize:11,color:C.muted,marginTop:"0.25rem"}}>Tap a staff member to open their profile and upload. Required for ACC compliance.</div>
              </div>}
            </div>
          );
        })()}
        {urgentCount>0&&<Alert type="amber" title={`🔔 ${urgentCount} items due or overdue`}><span onClick={()=>setPage("reminders")} style={{color:C.blue,cursor:"pointer",fontWeight:500,textDecoration:"underline"}}>View reminders →</span></Alert>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem"}}>
          <div onClick={()=>setPage("pp")} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.1)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <span style={{fontSize:28}}>📖</span><div><div style={{fontSize:13,fontWeight:600}}>Policies & Procedures</div><div style={{fontSize:11,color:C.muted}}>8 sections · All staff · Annual review April</div></div>
          </div>
          <div onClick={()=>setPage("reminders")} style={{background:C.card,border:`1px solid ${urgentCount>0?C.red:C.border}`,borderRadius:10,padding:"1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <span style={{fontSize:28}}>🔔</span><div><div style={{fontSize:13,fontWeight:600}}>Reminders</div><div style={{fontSize:11,color:urgentCount>0?C.red:C.muted}}>{urgentCount>0?`${urgentCount} items need attention`:"All up to date"}</div></div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"0 0 0.875rem"}}>
          <div style={{fontSize:14,fontWeight:600}}>Staff compliance — tap row to view &amp; upload</div>
          <Btn onClick={()=>setPage("staff")}>View all →</Btn>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><TH headers={["Staff","Type","Clinics","APC","First Aid","Cultural","Contract","JD","Vetting","Orientation","Notes Audit","Progress"]}/></thead>
            <tbody>
              {Object.entries(STAFF).map(([id,s])=>{
                const fs=k=>certStatus(id,k);const comp=staffComp(id);const esData=es(id);const tc={Owner:"purple",Employee:"teal",Contractor:"amber"}[esData.type]||"gray";
                return(
                  <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <TD><strong>{s.name}</strong></TD><TD><Chip color={tc}>{esData.type}</Chip></TD>
                    <TD style={{fontSize:11,color:C.muted}}>{esData.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</TD>
                    <TD><Pill s={fs("apc")}/></TD><TD><Pill s={fs("firstaid")}/></TD><TD><Pill s={fs("cultural")}/></TD><TD>{CORE_CERTS.find(c=>c.key==="contract")?.notForOwner&&esData.type==="Owner"?<span style={{fontSize:11,color:C.hint}}>N/A</span>:<Pill s={fs("contract")}/>}</TD><TD><Pill s={fs("jd")}/></TD><TD><Pill s={fs("policevetting")}/></TD><TD><Pill s={fs("orientation")}/></TD><TD><Pill s={(()=>{const a=[...(_portalStore.data["audits"]||[])].filter(x=>x.type==="clinical_notes"&&x.physioAudited===s.name);return a.length>0?"ok":"pending";})()}/></TD>
                    <TD><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:52,height:5,background:C.grayL,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:comp.pct===100?C.teal:comp.pct>50?C.amber:C.red,width:`${comp.pct}%`}}/></div><span style={{fontSize:11,color:C.muted}}>{comp.done}/{comp.total}</span></div></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const RemindersPage=()=>{
    const over=reminders.filter(r=>r.status==="overdue");const due=reminders.filter(r=>r.status==="due");const coming=reminders.filter(r=>r.status==="ok"&&r.days<=90);
    function RGroup({title,items,col}){if(!items.length)return null;return(
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:"0.75rem",color:col}}>{title} ({items.length})</div>
        {items.map((r,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${r.status==="overdue"?"#f5c1c1":r.status==="due"?"#fac775":C.border}`,borderRadius:8,padding:"0.875rem 1rem",marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22,flexShrink:0}}>{r.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{r.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{r.target} · {r.freq} · Next: {r.nextDate}</div></div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <Pill s={r.status==="overdue"?"overdue":r.status==="due"?"due":"ok"} label={r.days<=0?"Overdue":r.days===0?"Today":`${r.days}d`}/>
              {r.auditKey&&<div style={{marginTop:4}}><BSm onClick={()=>setActiveAudit(r.auditKey)} color={C.teal}>Start audit →</BSm></div>}
            </div>
          </div>
        ))}
      </div>
    );}
    return(
      <div>
        <PH title="🔔 Reminders" sub="Upcoming compliance tasks, audits, renewals and drills"/>
        {over.length===0&&due.length===0&&<Alert type="green" title="All up to date">No overdue or imminent reminders.</Alert>}
        <RGroup title="Overdue — action required" items={over} col={C.red}/>
        <RGroup title="Due in next 30 days" items={due} col={C.amber}/>
        <RGroup title="Coming up — next 90 days" items={coming} col={C.muted}/>
        <Divider/>
        <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Full compliance schedule</div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><TH headers={["Item","Frequency","Applies to","Typical month","Action"]}/></thead>
            <tbody>
              {REMINDER_SCHEDULE.map(r=>(
                <tr key={r.key+r.freq}>
                  <TD><span style={{fontSize:14,marginRight:6}}>{r.icon}</span><strong>{r.label}</strong></TD>
                  <TD>{r.freq}</TD><TD style={{fontSize:12,color:C.muted}}>{r.applies}</TD>
                  <TD style={{fontSize:12}}>{new Date(2026,r.month-1,1).toLocaleString("en-NZ",{month:"long"})}</TD>
                  <TD>{r.auditKey?<BSm onClick={()=>setActiveAudit(r.auditKey)} color={C.teal}>Start →</BSm>:<BSm onClick={()=>setPage(r.applies==="Management"?"pp":"staff")} color={C.blue}>View →</BSm>}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const StaffPage=()=>(
    <div>
      <PH title="All Staff" sub="Tap any card to view compliance, upload certs or complete orientation"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:"0.875rem"}}>
        {Object.entries(STAFF).map(([id,s])=>{
          const comp=staffComp(id);const bc=comp.pct===100?C.teal:comp.pct>50?C.amber:C.red;const esData=es(id);const tc={Owner:"purple",Employee:"teal",Contractor:"amber"}[esData.type]||"gray";
          return(
            <div key={id} onClick={()=>setProfile(id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(15,110,86,0.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{padding:"1rem 1rem 0.75rem",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0}}>{s.ini}</div>
                <div><div style={{fontSize:14,fontWeight:600}}>{s.name}</div><div style={{fontSize:11,marginTop:2}}><Chip color={tc}>{esData.type}</Chip></div></div>
              </div>
              <div style={{padding:"0.75rem 1rem"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{esData.clinics.slice(0,3).map(c=><Chip key={c} color="blue">{CLINICS.find(cl=>cl.id===c)?.short}</Chip>)}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><div style={{flex:1,height:6,background:C.grayL,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:bc,width:`${comp.pct}%`}}/></div><span style={{fontSize:11,color:bc,fontWeight:500,whiteSpace:"nowrap"}}>{comp.done}/{comp.total}</span></div>
                <div style={{fontSize:11,color:C.muted}}>{comp.pct===100?"All required docs on file ✓":comp.pct===0?"No documents yet":`${comp.total-comp.done} required doc${comp.total-comp.done>1?"s":""} missing`}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const CompliancePage=()=>(
    <div>
      <PH title="Compliance tracker" sub="All staff — employees and contractors — must hold all required certifications."/>
      <Alert type="blue" title="📌 Universal requirements — everyone">APC · First Aid / CPR · Cultural Competency · Contract · Job Description · Orientation. Peer review & appraisal for staff 12+ months.</Alert>
      <TabBar items={[["overview","Overview"],["apc","APC"],["firstaid","First Aid"],["cultural","Cultural"],["vetting","🚔 Police Vetting"],["reviews","Reviews & Audits"],["clinicaudit","Clinic Audits"]]} current={compTab} setter={setCompTab}/>
      {compTab==="vetting"&&<><Alert type="blue" title="Police Vetting — §4.2 P&P Manual">Required for all staff working with vulnerable clients (children, older adults, people with disabilities). Renewed every 3 years. Evidence is the email from NZ Police showing a clear result. Upload the email or PDF confirmation to each staff member's profile.</Alert><Tbl headers={["Staff","Vetting on file","File","Notes"]}>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"policevetting");const note={gwenne:"Vetting completed — clear ✓",ibrahim:"Vetting completed — clear ✓"}[id]||"Upload email confirmation";return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}><TD><strong>{s.name}</strong></TD><TD><Pill s={f?"ok":"pending"} label={f?`Uploaded ${f.uploadedDate}`:"Not uploaded"}/></TD><TD><span style={{fontSize:12,color:f?C.teal:C.hint}}>{f?`📄 ${f.fileName}`:"—"}</span></TD><TD style={{fontSize:11,color:C.muted}}>{note}</TD></tr>;})}</Tbl><div style={{fontSize:12,color:C.muted,marginTop:"0.75rem",lineHeight:1.6,padding:"0.75rem 1rem",background:C.grayXL,borderRadius:8}}>📌 Per §4.2 P&P Manual: police vetting and risk assessment must be completed every 3 years. The NZ Police vetting email or PDF showing "no information to release" is sufficient evidence. Tap any staff member to upload their certificate.</div></>}
      {compTab==="overview"&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><TH headers={["Staff","APC","First Aid","Cultural","Contract","JD","Orientation","Police Vetting","Peer Review","Appraisal","Notes Audit"]}/></thead><tbody>{Object.entries(STAFF).map(([id,s])=><tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}><TD><strong>{s.name}</strong></TD>{CORE_CERTS.map(c=><TD key={c.key}>{c.ownerOnly&&role!=="owner"&&role!==id?<span style={{fontSize:11,color:C.hint}}>🔒</span>:<Pill s={certStatus(id,c.key)}/>}</TD>)}</tr>)}</tbody></table></div>}
      {compTab==="apc"&&<><Alert type="amber" title="Annual Practising Certificate">Issued by PBNZ. Renews 1 April. Must be sighted and copy on file for all staff.</Alert><Tbl headers={["Staff","Status","Expiry","File"]}>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"apc");const st=certStatus(id,"apc");const exp=f?.expiry?getExpiryStatus(f.expiry):null;return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}><TD><strong>{s.name}</strong></TD><TD><Pill s={st} label={st==="expired"?"Expired ⚠":st==="ok"?`On file ✓`:"Not uploaded"}/></TD><TD style={{fontSize:12,color:exp?exp.color:C.hint}}>{exp?exp.label:"—"}</TD><TD><span style={{fontSize:12,color:f?C.teal:C.hint}}>{f?`📄 ${f.fileName}`:"—"}</span></TD></tr>;})}</Tbl></>}
      {compTab==="firstaid"&&<><Alert type="amber" title="First Aid / CPR — all staff required">Valid 2 years. Renewed every 2 years. All staff must hold current cert.</Alert><Tbl headers={["Staff","Status","Expiry","File"]}>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"firstaid");const st=certStatus(id,"firstaid");const exp=f?.expiry?getExpiryStatus(f.expiry):null;return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}><TD><strong>{s.name}</strong></TD><TD><Pill s={st} label={st==="expired"?"Expired ⚠":st==="ok"?"On file ✓":"Not uploaded"}/></TD><TD style={{fontSize:12,color:exp?exp.color:C.hint}}>{exp?exp.label:"—"}</TD><TD><span style={{fontSize:12,color:f?C.teal:C.hint}}>{f?`📄 ${f.fileName}`:"—"}</span></TD></tr>;})}</Tbl></>}
      {compTab==="cultural"&&<><Alert type="amber" title="Cultural Competency (Māori) — all staff required">Annual renewal required. Complete Mauriora course at <a href="https://mauriora.co.nz" target="_blank" rel="noreferrer" style={{color:C.blue}}>mauriora.co.nz</a>. Upload certificate to each staff profile.</Alert><Tbl headers={["Staff","Status","Expiry","File"]}>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"cultural");const st=certStatus(id,"cultural");const exp=f?.expiry?getExpiryStatus(f.expiry):null;return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}><TD><strong>{s.name}</strong></TD><TD><Pill s={st} label={st==="expired"?"Expired ⚠":st==="ok"?"On file ✓":"Not uploaded"}/></TD><TD style={{fontSize:12,color:exp?exp.color:C.hint}}>{exp?exp.label:"—"}</TD><TD><span style={{fontSize:12,color:f?C.teal:C.hint}}>{f?`📄 ${f.fileName}`:"—"}</span></TD></tr>;})}</Tbl></>}
      {compTab==="reviews"&&<div>
        <Alert type="blue" title="P&P §7 — Annual reviews & clinical notes audits">Peer review and performance appraisal annually for all staff. Clinical notes audit every 6 months (5 current + 5 past records per physio).</Alert>
        <div style={{fontSize:13,fontWeight:600,marginBottom:"0.5rem",marginTop:"0.75rem"}}>Peer Reviews & Appraisals</div>
        <Tbl headers={["Staff","Peer Review","Last date","Appraisal","Expiry","Notes"]}>{Object.entries(STAFF).map(([id,s])=>{
          const pr=loadFile(id,"peerreview");const ap=loadFile(id,"appraisal");
          const prExp=pr?.expiry?getExpiryStatus(pr.expiry):null;const apExp=ap?.expiry?getExpiryStatus(ap.expiry):null;
          // Also check for peer_review audit records
          const prAudit=[...audits].filter(x=>x.type==="peer_review"&&x.physioAudited===s.name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
          const hasPr=!!(pr||prAudit);
          const prLabel=prAudit?prAudit.date:(pr?"On file ✓":"Needed");
          const prStatus=hasPr?(prExp?.status==="expired"?"expired":"ok"):"pending";
          const n={alistair:"Clinical Director",hans:"20+ years",dylan:"Contractor since 2025",ibrahim:"New grad",komal:"Contractor",gwenne:"First cycle"}[id]||"Annual cycle";
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={prStatus} label={prLabel}/></TD>
            <TD style={{fontSize:11,color:prExp?prExp.color:(prAudit?C.green:C.hint)}}>{prExp?prExp.label:(prAudit?fmtNZ(prAudit.date):"—")}</TD>
            <TD><Pill s={ap?(apExp?.status==="expired"?"expired":"ok"):"pending"} label={ap?"On file ✓":"Needed"}/></TD>
            <TD style={{fontSize:11,color:apExp?apExp.color:C.hint}}>{apExp?apExp.label:"—"}</TD>
            <TD style={{fontSize:11,color:C.muted}}>{n}</TD>
          </tr>;})}
        </Tbl>
        <div style={{fontSize:13,fontWeight:600,marginBottom:"0.5rem",marginTop:"1.25rem"}}>Clinical Notes Audits <span style={{fontSize:11,color:C.muted,fontWeight:400}}>— P&P §1.5.1 · Every 6 months · 10 records per physio</span></div>
        <Tbl headers={["Staff","Last audit","Outcome","Notes"]}>{Object.entries(STAFF).filter(([id,s])=>s.type!=="Owner"||id==="jade").map(([id,s])=>{
          const a=[...audits].filter(x=>x.type==="clinical_notes"&&x.physioAudited===s.name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
          return <tr key={id} onClick={()=>{setPage("management");setMgmtTab("audits");}} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={a?"ok":"pending"} label={a?fmtNZ(a.date):"Not yet run"}/></TD>
            <TD>{a?<Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>:<span style={{fontSize:11,color:C.hint}}>—</span>}</TD>
            <TD style={{fontSize:11,color:C.muted}}>{a?.notes||"—"}</TD>
          </tr>;})}
        </Tbl>
        <div style={{fontSize:13,fontWeight:600,marginBottom:"0.5rem",marginTop:"1.25rem"}}>Peer Review Audits <span style={{fontSize:11,color:C.muted,fontWeight:400}}>— P&P §7.8 · Annual · Physio observes physio</span></div>
        <Tbl headers={["Staff reviewed","Last review","Reviewer","Outcome","Evidence"]}>{Object.entries(STAFF).filter(([id,s])=>s.type!=="Owner"||id==="jade").map(([id,s])=>{
          const a=[...audits].filter(x=>x.type==="peer_review"&&x.physioAudited===s.name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
          return <tr key={id} onClick={()=>{setPage("management");setMgmtTab("audits");}} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={a?"ok":"pending"} label={a?fmtNZ(a.date):"Not yet run"}/></TD>
            <TD style={{fontSize:11,color:C.muted}}>{a?.auditor||"—"}</TD>
            <TD>{a?<Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>:<span style={{fontSize:11,color:C.hint}}>—</span>}</TD>
            <TD>{a?.evidence?<span style={{fontSize:11,color:C.teal}}>📎 On file</span>:<span style={{fontSize:11,color:C.hint}}>—</span>}</TD>
          </tr>;})}
        </Tbl>
        <div style={{display:"flex",gap:8,marginTop:"0.75rem"}}>
          <Btn onClick={()=>{setPage("management");setMgmtTab("audits");}}>Run peer review audit →</Btn>
        </div>
      </div>}      {compTab==="clinicaudit"&&<div>
        <Alert type="amber" title="Clinic compliance audits">Log historical audits and upload evidence. Fire drills annual · H&S quarterly · Hygiene quarterly · Equipment annual. Run live audits from Management or Clinics page.</Alert>
        <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap"}}>
          <Btn onClick={()=>{setPage("management");setMgmtTab("audits");}}>Run new audit →</Btn>
          <Btn outline onClick={()=>{setPage("clinics");}}>View by clinic →</Btn>
        </div>
        {Object.entries(AUDIT_FORMS).filter(([k])=>k!=="clinical_notes"&&k!=="peer_review").map(([key,form])=>{
          const typeAudits=[...audits].filter(a=>a.type===key).sort((a,b)=>b.date.localeCompare(a.date));
          const lastDate=typeAudits[0]?.date||null;
          const clinicsDone=[...new Set(typeAudits.map(a=>a.clinic))];
          return(
            <div key={key} style={{marginBottom:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                <div style={{fontSize:13,fontWeight:600}}>{form.icon} {form.title} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>· {form.freq}</span></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {lastDate&&<span style={{fontSize:11,color:C.muted}}>Last: {lastDate}</span>}
                  <Pill s={typeAudits.length>0?"ok":"pending"} label={typeAudits.length>0?`${typeAudits.length} records`:"No records"}/>
                </div>
              </div>
              {typeAudits.length>0&&<div style={{background:C.grayXL,borderRadius:8,padding:"0.75rem",fontSize:12}}>
                {typeAudits.slice(0,3).map((a,i)=>(
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",borderBottom:i<Math.min(typeAudits.length,3)-1?`1px solid ${C.border}`:""}}>
                    <span style={{color:C.muted,minWidth:80}}>{fmtNZ(a.date)}</span>
                    <span style={{flex:1,color:C.text}}>{a.clinic}</span>
                    <span style={{color:C.muted}}>Auditor: {a.auditor}</span>
                    <Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>
                  </div>
                ))}
                {typeAudits.length>3&&<div style={{fontSize:11,color:C.muted,marginTop:4,textAlign:"right"}}><span style={{cursor:"pointer",color:C.teal}} onClick={()=>{setPage("management");setMgmtTab("audits");}}>View all {typeAudits.length} records →</span></div>}
              </div>}
              {typeAudits.length===0&&<div style={{background:C.amberL,borderRadius:6,padding:"8px 12px",fontSize:12,color:C.amber}}>No records yet — complete an audit or add past records from Management → Audits.</div>}
            </div>
          );
        })}
      </div>}
    </div>
  );

  const ArchivePage=()=>(
    <div><PH title="Past employees" sub="Archived records — kept for DAA / ACC audit purposes"/>
    <Card><div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Former staff — 7 records</div>{["Alice Keane","Aoife Hussey","Ishwari Pillay","Jennifer Hong","Maria Alonzo","Sasha McBain","Stephen Gray"].map(n=><div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:32,height:32,borderRadius:"50%",background:C.grayL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.gray,flexShrink:0}}>{n.slice(0,2).toUpperCase()}</div><div><strong style={{fontSize:13}}>{n}</strong><div style={{fontSize:12,color:C.muted}}>Former physiotherapist · Records archived</div></div><span style={{marginLeft:"auto"}}><Chip color="gray">Archived</Chip></span></div>)}</Card></div>
  );

  const ClinicsPage=()=>(
    <div><PH title="Clinics" sub="Run audits directly from each clinic card"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"0.875rem"}}>
      {CLINICS.map(cl=>{const cs=Object.entries(STAFF).filter(([id,s])=>es(id).clinics.includes(cl.id)).map(([id,s])=>s);return(
        <Card key={cl.id}>
          <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{cl.icon} {cl.name}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:"0.75rem",lineHeight:1.5}}>{cl.note}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:"0.875rem"}}>{cs.map(s=><Chip key={s.name} color="teal">{s.name.split(" ")[0]}</Chip>)}</div>
          <Divider/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <BSm onClick={()=>setActiveAudit("fire_drill")} color={C.red}>🔥 Fire drill</BSm>
            <BSm onClick={()=>setActiveAudit("hygiene")} color={C.teal}>🧼 Hygiene</BSm>
            <BSm onClick={()=>setActiveAudit("hs_audit")} color={C.amber}>⚠️ H&S</BSm>
            <BSm onClick={()=>setActiveAudit("equipment")} color={C.blue}>⚡ Equipment</BSm>
          </div>
        </Card>
      );})}
    </div></div>
  );

  const InservicePage=()=>{
    const[ivf,setIvf]=useState(null);
    const[showForm,setShowForm]=useState(false);
    const[filterClinic,setFilterClinic]=useState("all");
    const[filterYear,setFilterYear]=useState(String(new Date().getFullYear()));
    const[ni,setNi]=useState({date:"",clinic:"All clinics",topic:"",presenter:"",attendees:"",notes:""});
    // Load communal resource files so each inservice card can link to its evidence.
    // Re-loaded on every render via loadGen to stay current with uploads.
    const communalFiles=(loadGen("isrv_communal")||[]);
    // Extract "File: x.pdf" / "Files: a.pdf, b.docx" trailing section from notes.
    // Returns { body, fileRefs } — body is notes minus that section.
    const _splitNotes=(notes)=>{
      if(!notes)return{body:"",fileRefs:[]};
      const m=notes.match(/^([\s\S]*?)(?:\s*Files?:\s*(.+?))?\s*$/);
      if(!m||!m[2])return{body:(notes||"").trim(),fileRefs:[]};
      const refs=m[2].split(",").map(s=>s.trim()).filter(Boolean);
      return{body:(m[1]||"").trim(),fileRefs:refs};
    };
    // Find a communal file whose name best matches a reference.
    const _findFile=(ref)=>{
      if(!ref||!communalFiles.length)return null;
      const norm=s=>(s||"").toLowerCase().replace(/\.[a-z0-9]+$/,"").replace(/[^a-z0-9]/g,"");
      const refN=norm(ref);
      if(!refN)return null;
      // Exact normalized match
      let hit=communalFiles.find(f=>norm(f.fileName)===refN);
      if(hit)return hit;
      // Partial — either direction
      hit=communalFiles.find(f=>{const fn=norm(f.fileName);return fn&&(fn.includes(refN)||refN.includes(fn));});
      return hit;
    };
    const years=[...new Set(inservices.map(i=>String(i.year||i.date?.slice(0,4)||"2025")))].sort((a,b)=>b-a);
    if(!years.includes(filterYear))years.unshift(filterYear);
    const clinicOptions=["all",...CLINICS.filter(c=>!c.isSchool).map(c=>c.short)];
    const visible=inservices.filter(i=>{
      const yr=String(i.year||i.date?.slice(0,4)||"");
      const cl=i.clinic||"";
      return(filterYear==="all"||yr===filterYear)&&(filterClinic==="all"||cl===filterClinic||cl.includes(filterClinic));
    }).sort((a,b)=>b.date.localeCompare(a.date));
    function addInservice(){
      if(!ni.date||!ni.topic){alert("Date and topic required.");return;}
      const rec={...ni,id:Date.now(),year:parseInt(ni.date.slice(0,4))};
      const updated=[...inservices,rec];
      setInservices(updated);
      // Merge-by-ID with whatever is currently in _portalStore so nothing is lost,
      // including KPI's personal_cpd entries and any records added by other apps
      // between our last load and this save.
      const raw=(_portalStore?.data?.["inservices"])||[];
      const updatedIds=new Set(updated.map(r=>String(r?.id)));
      const preserved=raw.filter(e=>!updatedIds.has(String(e?.id)));
      saveGen("inservices",[...updated,...preserved]);
      setNi({date:"",clinic:"All clinics",topic:"",presenter:"",attendees:"",notes:""});
      setShowForm(false);
    }
    function deleteInservice(id){
      if(!window.confirm("Remove this inservice record?"))return;
      const updated=inservices.filter(i=>String(i.id)!==String(id));
      setInservices(updated);
      // Save merged array back, excluding the deleted record
      const raw=(_portalStore?.data?.["inservices"])||[];
      const preserved=raw.filter(e=>String(e?.id)!==String(id));
      saveGen("inservices",preserved);
      // If it was a seed record, track the deletion so it doesn't come back on next load
      const isSeed = typeof id === 'number' && id <= 99;
      if(isSeed){
        const existing=(_portalStore?.data?.["deletedInserviceIds"])||[];
        saveGen("deletedInserviceIds",[...new Set([...existing,id])]);
      }
    }
    // Per-clinic status for current year — excludes personal CPD (those are individual)
    const thisYear=String(new Date().getFullYear());
    const clinicStatus=CLINICS.filter(c=>!c.isSchool).map(cl=>{
      const done=inservices.filter(i=>!i._isPersonal&&String(i.year||i.date?.slice(0,4)||"")===thisYear&&(i.clinic===cl.short||i.clinic===cl.name||(i.clinic||"").includes(cl.short)));
      return{...cl,count:done.length,done:done.length>0};
    });
    return(
    <div>
      <PH title="In-service training log" sub="Annual requirement — at least one per clinic per year · P&P §7.7.3"/>
      <Alert type="amber" title="P&P requirement">Section 7.7.3: Regular in-service education done at TBP. Topics suggested by staff, physios or selected by presenter. No client-identifying details in case studies.</Alert>
      {/* ── Sync to KPI — force-push all inservice records to Drive + Vercel ── */}
      {(()=>{
        const[syncMsg,setSyncMsg]=useState("");
        const[syncing,setSyncing]=useState(false);
        const driveCount=((_portalStore?.data?.["inservices"])||[]).length;
        async function forceSyncToKpi(){
          setSyncing(true);setSyncMsg("");
          const raw=((_portalStore?.data?.["inservices"])||[]);
          const rawIds=new Set(raw.map(e=>String(e?.id)));
          // Merge current state with anything already in Drive
          const existingMap=new Map(raw.map(e=>[String(e?.id),e]));
          inservices.forEach(s=>{
            // Strip UI-only flags
            const{_isPersonal,_uploading,...clean}=s;
            existingMap.set(String(s.id),clean);
          });
          const merged=[...existingMap.values()];
          _portalStore.data["inservices"]=merged;
          let driveOk=false;
          try{await _saveDriveState();driveOk=true;}catch(e){setSyncMsg("❌ Drive write failed: "+(e.message||e));}
          // Also mirror to Vercel so KPI's readFullLog (which unions both) sees it
          let vercelOk=false;
          try{
            const r=await fetch(PORTAL_API+"/store",{headers:{"X-Portal-Secret":PORTAL_SECRET}});
            const vs=r.ok?await r.json():{};
            const vercelExisting=Array.isArray(vs.data?.inservices)?vs.data.inservices:[];
            const vercelMap=new Map(vercelExisting.map(e=>[String(e?.id),e]));
            merged.forEach(e=>vercelMap.set(String(e.id),e));
            const resp=await fetch(PORTAL_API+"/store",{method:"POST",headers:{"Content-Type":"application/json","X-Portal-Secret":PORTAL_SECRET},body:JSON.stringify({key:"inservices",value:[...vercelMap.values()]})});
            vercelOk=resp.ok;
          }catch(e){}
          const broadcast=merged.filter(e=>e.type==="inservice"&&Array.isArray(e.loggedTo)&&e.loggedTo.length).length;
          setSyncMsg(`✅ Synced ${merged.length} record${merged.length===1?'':'s'} (${broadcast} broadcasting to staff CPD) · Drive: ${driveOk?'✓':'✗'} · Vercel: ${vercelOk?'✓':'✗'}`);
          setSyncing(false);
        }
        return(
          <div style={{background:C.blueL,border:`1px solid ${C.blue}`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:13,fontWeight:600,color:C.blue}}>🔄 Push inservices to KPI app</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  {inservices.length} record{inservices.length===1?'':'s'} in portal · {driveCount} currently in Drive
                  {driveCount<inservices.length&&<span style={{color:C.amber,fontWeight:600}}> · {inservices.length-driveCount} not yet pushed</span>}
                </div>
              </div>
              <Btn onClick={forceSyncToKpi} style={{opacity:syncing?0.5:1}}>{syncing?"⏳ Syncing…":"Sync to KPI →"}</Btn>
            </div>
            {syncMsg&&<div style={{fontSize:12,marginTop:6,color:syncMsg.startsWith("✅")?C.green:C.red}}>{syncMsg}</div>}
          </div>
        );
      })()}
      <TabBar items={[["log","Session log"],["status",thisYear+" Status"],["resources","Resources & files"]]} current={isrvTab} setter={setIsrvTab}/>
      {isrvTab==="status"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"0.75rem",marginBottom:"1rem"}}>
            {clinicStatus.map(cl=>(
              <Card key={cl.id} style={{padding:"1rem",borderColor:cl.done?C.teal:C.amber}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{cl.icon} {cl.short}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{cl.note}</div>
                <Pill s={cl.done?"ok":"pending"} label={cl.done?`${cl.count} session${cl.count!==1?"s":""} done ✓`:"Required — none yet"}/>
              </Card>
            ))}
          </div>
          <Btn onClick={()=>setShowForm(true)}>+ Log in-service session</Btn>
        </div>
      )}
      {isrvTab==="log"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:4}}>
              {["all",...years.slice(0,4)].filter((v,i,a)=>a.indexOf(v)===i).map(y=><button key={y} onClick={()=>setFilterYear(y)} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:filterYear===y?C.teal:"white",color:filterYear===y?"white":C.muted,border:`1px solid ${filterYear===y?C.teal:C.border}`,cursor:"pointer"}}>{y==="all"?"All years":y}</button>)}
            </div>
            <select value={filterClinic} onChange={e=>setFilterClinic(e.target.value)} style={{fontSize:12,padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:6,background:C.grayXL}}>
              {clinicOptions.map(c=><option key={c} value={c}>{c==="all"?"All clinics":c}</option>)}
            </select>
            <Btn onClick={()=>setShowForm(true)} style={{marginLeft:"auto"}}>+ Log session</Btn>
          </div>
          {showForm&&<Card style={{borderColor:C.teal,marginBottom:"1rem"}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Log in-service session</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 1rem"}}>
              <Input label="Date" value={ni.date} onChange={e=>setNi({...ni,date:e.target.value})} type="date"/>
              <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Clinic</label>
                <select value={ni.clinic} onChange={e=>setNi({...ni,clinic:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}>
                  <option>All clinics</option>{CLINICS.filter(c=>!c.isSchool).map(c=><option key={c.id}>{c.short}</option>)}
                </select>
              </div>
            </div>
            <Input label="Topic" value={ni.topic} onChange={e=>setNi({...ni,topic:e.target.value})} placeholder="e.g. Shoulder rehab protocols"/>
            <Input label="Presenter" value={ni.presenter} onChange={e=>setNi({...ni,presenter:e.target.value})} placeholder="e.g. Hans Vermeulen"/>
            <Input label="Attendees" value={ni.attendees} onChange={e=>setNi({...ni,attendees:e.target.value})} placeholder="e.g. Hans, Alistair, Timothy"/>
            <Textarea label="Notes / topics covered" value={ni.notes} onChange={e=>setNi({...ni,notes:e.target.value})} rows={2}/>
            <div style={{display:"flex",gap:8}}><Btn onClick={addInservice}>Save session</Btn><Btn outline onClick={()=>setShowForm(false)}>Cancel</Btn></div>
          </Card>}
          {visible.length===0&&<Alert type="blue" title="No sessions found">No in-service sessions match this filter. Log a new session above.</Alert>}
          {visible.map(s=>{
            const{body,fileRefs}=_splitNotes(s.notes);
            const matches=fileRefs.map(ref=>({ref,file:_findFile(ref)}));
            return(
            <Card key={s.id} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem",background:s._isPersonal?"#FAFAF7":C.card}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    {s._isPersonal&&<span style={{fontSize:10}}>👤</span>}
                    {s.topic}
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                    {fmtNZ(s.date)}
                    {s._isPersonal
                      ? <> · <strong>Personal CPD</strong>{s.staffId?` · ${s.staffId}`:""}{s.hours?` · ${s.hours}h`:""}</>
                      : <> · {s.clinic}{s.presenter?` · Presenter: ${s.presenter}`:""}</>}
                  </div>
                  {s.attendees&&!s._isPersonal&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>Attendees: {s.attendees}</div>}
                  {s.loggedTo&&s.loggedTo.length&&!s._isPersonal&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>Logged to {s.loggedTo.length} staff · {s.hours||1}h</div>}
                  {body&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"5px 8px",borderRadius:5,marginTop:6,lineHeight:1.5}}>{body}</div>}
                  {matches.length>0&&<div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                    <span style={{fontSize:11,color:C.muted}}>📎 Files:</span>
                    {matches.map((m,i)=>m.file
                      ? <BSm key={i} onClick={(e)=>{e.stopPropagation();setIvf(m.file);}} color={C.teal}>{m.file.fileName}</BSm>
                      : <span key={i} style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>{m.ref} <span style={{fontSize:10}}>(not uploaded)</span></span>
                    )}
                  </div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                  <Pill s={s._isPersonal?"due":"ok"} label={s._isPersonal?"Personal CPD":"Completed ✓"}/>
                  <BSm onClick={(e)=>{e.stopPropagation();deleteInservice(s.id);}} color={C.red}>✕</BSm>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}
      {isrvTab==="resources"&&<Card><div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>In-service resources — all clinics</div><div style={{fontSize:12,color:C.muted,marginBottom:"1rem",lineHeight:1.6}}>Shared resource library. Upload handouts, slides or reading materials. All staff can view.</div><MultiFileRow label="📚 Shared in-service resources — all clinics" gkey="isrv_communal" onView={f=>setIvf(f)}/><div style={{marginTop:"0.75rem",fontSize:11,color:C.muted}}>Accepted: PDF, Word, image. Max 3MB.</div></Card>}
      {ivf&&<FileViewer file={ivf} onClose={()=>setIvf(null)}/>}
    </div>
  );};

  function ContractRow({staffId,s,canSee,onView}){
    const ref=useRef();
    const[file,setFile]=useState(()=>loadFile(staffId,"contract"));
    function handle(e){
      const f=e.target.files[0];if(!f)return;
      if(f.size>3*1024*1024){alert("File over 3MB.");return;}
      const r=new FileReader();
      r.onload=ev=>{
        const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ"),certKey:"contract"};
        if(saveFile(staffId,"contract",d))setFile(d);
      };
      r.readAsDataURL(f);e.target.value="";
    }
    return(
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:s.color+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:s.color,flexShrink:0}}>{s.ini}</div>
        <div style={{flex:1}}>
          <strong style={{fontSize:13}}>{s.name}</strong>
          <div style={{fontSize:12,color:C.muted}}>{es(staffId).type} · {es(staffId).clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</div>
          {file&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>{file.fileName} · {file.uploadedDate}</div>}
        </div>
        {canSee
          ?<div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
            {file&&<BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>}
            <BSm onClick={()=>ref.current.click()} color={C.teal}>📄 {file?"Upload new":"Upload"}</BSm>
            {file&&<BSm onClick={()=>{if(window.confirm("Remove contract?")){ removeFile(staffId,"contract");setFile(null);}}} color={C.red}>✕</BSm>}
          </div>
          :<span style={{fontSize:12,color:C.hint,flexShrink:0}}>🔒 Restricted</span>
        }
        <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
      </div>
    );
  }

  const DocumentsPage=()=>{const[dvf,setDvf]=useState(null);return(
    <div><PH title="Documents" sub="Contracts, job descriptions & legislation"/>
    <TabBar items={[["contracts","Contracts"],["jd","Job descriptions"],["leg","Legislation"]]} current={docsTab} setter={setDocsTab}/>
    {docsTab==="contracts"&&<div><Alert type="blue" title="🔒 Contract privacy — P&P Section 7.2">Contracts visible to Jade (owner) and the individual staff member only. Others see a locked indicator. Two signed copies: one for employee, one in personnel file.</Alert><Card>{Object.entries(STAFF).map(([id,s])=>{const canSee=role==="owner"||role===id;return <ContractRow key={id} staffId={id} s={s} canSee={canSee} onView={f=>setDvf(f)}/>;})}</Card></div>}
    {docsTab==="jd"&&<Card><div style={{fontSize:13,color:C.muted,marginBottom:"1rem",lineHeight:1.6}}>Tap 👁 View to open the current job description. Use 📄 Add another to upload a new or updated version. All signed copies kept on file — P&P §7.3.</div>{Object.entries(STAFF).map(([id,s])=>{
      const certFile=loadFile(id,"jd");
      const docFiles=loadGen("jd_"+id)||[];
      const docArr=Array.isArray(docFiles)?docFiles:[docFiles].filter(Boolean);
      const allFiles=[...(certFile?[{...certFile,_src:"profile"}]:[]),...docArr.map(f=>({...f,_src:"docs"}))];
      return <JdDocRow key={id} staffId={id} label={`${s.name} — Job Description`} allFiles={allFiles} certFile={certFile} accent={s.color} onView={f=>setDvf(f)}/>;
    })}</Card>}
    {docsTab==="leg"&&<div><Alert type="blue" title="Key legislation — all staff read during orientation">Click any link to open the source document.</Alert>{LEGISLATION.map(leg=><Card key={leg.name} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}><div><a href={leg.url} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:600,color:C.blue,textDecoration:"none"}}>{leg.name} ↗</a><div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{leg.desc}</div></div><a href={leg.url} target="_blank" rel="noreferrer" style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:C.blueL,color:C.blue,textDecoration:"none",fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>Open ↗</a></div></Card>)}</div>}
    {dvf&&<FileViewer file={dvf} onClose={()=>setDvf(null)}/>}
    </div>
  );};

  const ManagementPage=()=>{
  const[mvf,setMvf]=useState(null);
  const[showLogAudit,setShowLogAudit]=useState(false);
  const[logAudit,setLogAudit]=useState({type:"hygiene",date:"",clinic:CLINICS[0].short,auditor:"",outcome:"Passed",notes:""});
  const[showAdd,setShowAdd]=useState(false);
  const[nm,setNm]=useState({date:"",clinic:"All clinics",topic:"",attendees:"",notes:"",attachment:null});
  const meetRef=useRef();
  return(
    <div><PH title="Management" sub="Audits, staff meetings, equipment — DAA / ACC Allied Health Standards"/>
    <TabBar items={[["audits","Audits"],["meetings","Staff Meetings"],["equipment","Equipment"],["accreditation","Accreditation"]]} current={mgmtTab} setter={setMgmtTab}/>
    {mgmtTab==="audits"&&<div>
      {/* ── Regenerate audit forms with latest templates ── */}
      {(()=>{
        const[auditRegen,setAuditRegen]=useState({running:false,msg:""});
        async function regenAllAudits(){
          if(!window.confirm("Regenerate ALL audit form HTML files with the current templates?\n\nThis re-creates the saved forms using the latest era-based styles. Existing ones will be replaced."))return;
          setAuditRegen({running:true,msg:"Starting…"});
          try{
            const targets=audits.map((a,i)=>({a,i})).filter(({a})=>a.id<100000);
            let done=0;const total=targets.length;
            const updated=[...audits];
            for(const{a,i}of targets){
              setAuditRegen({running:true,msg:`Regenerating ${done+1}/${total} — ${fmtNZ(a.date)} ${a.clinic} ${a.type}`});
              try{
                const html=_generateAuditForm(a);
                const dataUrl=_htmlToDataUrl(html);
                const fileName=`${a.type}_${a.date}_${a.clinic.replace(/\s+/g,'_')}.html`;
                const driveFile=await _uploadFileToDrive('audatt_'+a.id,fileName,'text/html',dataUrl);
                if(driveFile){
                  updated[i]={...a,evidence:{...driveFile,fileName,fileType:'text/html',uploadedDate:a.date,id:Date.now()}};
                  done++;
                }
              }catch(e){_warn('audit regen',e.message);}
            }
            setAudits(updated);
            saveGen("audits",updated);
            setAuditRegen({running:false,msg:`✅ Done — ${done} of ${total} regenerated`});
            setTimeout(()=>setAuditRegen({running:false,msg:""}),5000);
          }catch(e){setAuditRegen({running:false,msg:`❌ ${e.message||e}`});}
        }
        return(
          <div style={{background:"#F7F5EE",border:`1px solid ${C.border}`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:13,fontWeight:600}}>🎨 Audit form templates</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Style varies by era — 6 looks from 2022 basic Word to 2025 digital attestation. Regenerate after template changes to refresh saved forms.</div>
            </div>
            <Btn onClick={regenAllAudits} style={{opacity:auditRegen.running?0.5:1}}>{auditRegen.running?"⏳ Regenerating…":"Regenerate all audit forms"}</Btn>
          </div>
        );
      })()}
      {(()=>{
        const[arMsg,setArMsg]=useState("");  // placeholder — kept for consistency
        return arMsg?<div style={{fontSize:12,marginBottom:"1rem",color:C.blue}}>{arMsg}</div>:null;
      })()}

      {/* ── Load FENZ evacuation report PDFs for fire drills ── */}
      <FireDrillLoader audits={audits} setAudits={setAudits}/>

      {/* ── Load PBNZ-style peer review PDFs (one-click evidence) ── */}
      <PBNZPeerReviewLoader audits={audits} setAudits={setAudits}/>

      {/* ── Load FENZ-style fire drill PDFs (one-click evidence) ── */}
      <FENZFireDrillLoader audits={audits} setAudits={setAudits}/>

      {/* ── Bulk evidence upload for peer reviews + notes audits ── */}
      <BulkEvidenceUploader audits={audits} setAudits={setAudits}/>


      <div style={{marginBottom:"1.25rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
          <div style={{fontSize:14,fontWeight:600}}>Start a new audit</div>
          <BSm onClick={()=>setShowLogAudit(v=>!v)} color={C.gray}>📋 {showLogAudit?"Cancel":"Log past / manual audit"}</BSm>
        </div>
        {showLogAudit&&<Card style={{borderColor:C.teal,marginBottom:"1rem"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:"0.875rem"}}>Log a past or manual audit <span style={{fontSize:11,color:C.muted,fontWeight:400}}>(no checklist required — just record the outcome and optionally attach evidence)</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 1rem"}}>
            <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Audit type</label>
              <select value={logAudit.type} onChange={e=>setLogAudit({...logAudit,type:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}>
                {Object.entries(AUDIT_FORMS).map(([k,f])=><option key={k} value={k}>{f.icon} {f.title}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Clinic</label>
              <select value={logAudit.clinic} onChange={e=>setLogAudit({...logAudit,clinic:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}>
                {CLINICS.map(c=><option key={c.id}>{c.short}</option>)}
              </select>
            </div>
            <Input label="Date" value={logAudit.date} onChange={e=>setLogAudit({...logAudit,date:e.target.value})} type="date"/>
            <Input label="Auditor name" value={logAudit.auditor} onChange={e=>setLogAudit({...logAudit,auditor:e.target.value})} placeholder="e.g. Jade Warren"/>
          </div>
          <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Outcome</label>
            <div style={{display:"flex",gap:8}}>
              {["Passed","Issues found","N/A"].map(o=><div key={o} onClick={()=>setLogAudit({...logAudit,outcome:o})} style={{padding:"6px 14px",borderRadius:6,border:`1.5px solid ${logAudit.outcome===o?C.teal:C.border}`,background:logAudit.outcome===o?C.tealL:"white",fontSize:13,cursor:"pointer",fontWeight:logAudit.outcome===o?600:400}}>{o}</div>)}
            </div>
          </div>
          <Textarea label="Notes" value={logAudit.notes} onChange={e=>setLogAudit({...logAudit,notes:e.target.value})} rows={2} placeholder="Any issues found, actions taken, general observations…"/>
          <LogAuditEvidenceRow logAudit={logAudit} setLogAudit={setLogAudit}/>
          <div style={{display:"flex",gap:8,marginTop:"0.5rem"}}>
            <Btn onClick={()=>{
              if(!logAudit.date||!logAudit.auditor.trim()){alert("Date and auditor name required.");return;}
              const form=AUDIT_FORMS[logAudit.type];
              const rec={id:Date.now(),type:logAudit.type,title:form.title,icon:form.icon,clinic:logAudit.clinic,auditor:logAudit.auditor,date:logAudit.date,outcome:logAudit.outcome,notes:logAudit.notes,manual:true,...(logAudit.evidence?{evidence:logAudit.evidence}:{})};
              const updated=[...audits,rec];setAudits(updated);saveGen("audits",updated);
              setLogAudit({type:"hygiene",date:"",clinic:CLINICS[0].short,auditor:"",outcome:"Passed",notes:""});
              setShowLogAudit(false);
            }}>Save record</Btn>
            <Btn outline onClick={()=>setShowLogAudit(false)}>Cancel</Btn>
          </div>
        </Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"0.75rem"}}>
        {Object.entries(AUDIT_FORMS).map(([k,f])=>(
          <div key={k} onClick={()=>setActiveAudit(k)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.1)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
            <div style={{fontSize:26,marginBottom:6}}>{f.icon}</div><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{f.title}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{f.freq} · {f.sections.flatMap(s=>s.items).length} items</div>
            <span style={{color:C.teal,fontSize:11,fontWeight:500}}>Start →</span>
          </div>
        ))}
      </div></div>
      <Divider/>
      {/* ── Auto-relink audit evidence on load (silent) ── */}
      {(()=>{
        const[autoRelinkDone,setAutoRelinkDone]=useState(false);
        const[autoRelinkMsg,setAutoRelinkMsg]=useState('');
        const withEvidence=audits.filter(a=>a.evidence&&a.id<100000).length;
        const withoutEvidence=audits.filter(a=>!a.evidence&&a.id<100000).length;
        useEffect(()=>{
          if(autoRelinkDone||!portalConnected||withoutEvidence===0)return;
          let cancelled=false;
          (async()=>{
            try{
              const res=await _relinkExistingDocs(audits,meetings,()=>{});
              if(cancelled)return;
              if(res.relinked>0){
                setAudits(res.updatedAudits);
                setMeetings(res.updatedMeetings);
                setAutoRelinkMsg(`Auto-linked ${res.relinked} evidence document${res.relinked===1?'':'s'} from Drive`);
              }
            }catch{}
            setAutoRelinkDone(true);
          })();
          return()=>{cancelled=true;};
        },[portalConnected,withoutEvidence]);
        if(withEvidence===0&&withoutEvidence===0)return null;
        return(
          <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem",fontSize:12,color:C.muted}}>
            📎 {withEvidence>0&&<span style={{color:C.green}}>{withEvidence}/{withEvidence+withoutEvidence} audits have evidence linked. </span>}
            {withoutEvidence>0&&!autoRelinkDone&&<span>Checking Drive for remaining links…</span>}
            {withoutEvidence>0&&autoRelinkDone&&<span>{withoutEvidence} audit{withoutEvidence===1?'':'s'} still missing evidence.</span>}
            {autoRelinkMsg&&<span style={{color:C.green,marginLeft:6}}>✓ {autoRelinkMsg}</span>}
          </div>
        );
      })()}
      {(()=>{
        const thisYearA=String(new Date().getFullYear());
        const allYears=[...new Set([thisYearA,...audits.map(a=>a.date?.slice(0,4)).filter(Boolean)])].sort((a,b)=>b-a);
        const filtered=audits.filter(a=>(auditTypeFilter==="all"||a.type===auditTypeFilter)&&(auditClinicFilter==="all"||(a.clinic||"").toLowerCase()===(auditClinicFilter||"").toLowerCase()));

        function isAyrOpen(yr){const k="ayr_"+yr;return k in collapsedYears?collapsedYears[k]:yr===thisYearA;}
        function isAOpen(id){return!!collapsedYears["ao_"+id];}
        function toggleAyr(yr){setCollapsedYears(p=>({...p,["ayr_"+yr]:!isAyrOpen(yr)}));}
        function toggleA(id){setCollapsedYears(p=>({...p,["ao_"+id]:!isAOpen(id)}));}

        return(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:14,fontWeight:600}}>Audit history — {audits.length} record{audits.length!==1?"s":""}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <select value={auditTypeFilter} onChange={e=>setAuditTypeFilter(e.target.value)} style={{fontSize:12,padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:6,background:C.grayXL,color:C.text}}>
                  <option value="all">All audit types</option>
                  {Object.entries(AUDIT_FORMS).map(([k,f])=><option key={k} value={k}>{f.icon} {f.title}</option>)}
                </select>
                <select value={auditClinicFilter} onChange={e=>setAuditClinicFilter(e.target.value)} style={{fontSize:12,padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:6,background:C.grayXL,color:C.text}}>
                  <option value="all">All clinics</option>
                  {CLINICS.map(c=><option key={c.id} value={c.short}>{c.short}</option>)}
                </select>
              </div>
            </div>
            {audits.length===0&&<Alert type="blue" title="No audit records yet">Complete an audit above to create your first record.</Alert>}
            {filtered.length===0&&audits.length>0&&<Alert type="blue" title="No records match">Try changing the filters.</Alert>}
            {allYears.map(year=>{
              const yrOpen=isAyrOpen(year);
              const yearAudits=filtered.filter(a=>a.date?.slice(0,4)===year).sort((a,b)=>b.date.localeCompare(a.date));
              const yearTotal=yearAudits.length;
              const yearPassed=yearAudits.filter(a=>a.outcome==="Passed").length;
              const yearFailed=yearTotal-yearPassed;
              return(
                <div key={year} style={{marginBottom:"0.625rem"}}>
                  {/* Year header */}
                  <div onClick={()=>toggleAyr(year)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:year===thisYearA?C.tealL:C.grayXL,border:`1px solid ${year===thisYearA?C.teal:C.border}`,borderRadius:yrOpen?"8px 8px 0 0":8,cursor:"pointer",userSelect:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:15,fontWeight:700,color:year===thisYearA?C.teal:C.text}}>{year}</span>
                      {year===thisYearA&&<span style={{fontSize:10,background:C.teal,color:"white",borderRadius:8,padding:"1px 7px",fontWeight:600}}>CURRENT</span>}
                      {yearTotal>0&&<><span style={{fontSize:12,color:C.muted}}>{yearTotal} audit{yearTotal!==1?"s":""}</span><span style={{fontSize:12,color:C.green,fontWeight:500}}>✓ {yearPassed} passed</span>{yearFailed>0&&<span style={{fontSize:12,color:C.red,fontWeight:500}}>✗ {yearFailed} issues</span>}</>}
                      {yearTotal===0&&<span style={{fontSize:12,color:C.muted}}>No records</span>}
                    </div>
                    <span style={{color:C.muted,fontSize:18,transform:yrOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.18s",display:"inline-block"}}>›</span>
                  </div>

                  {yrOpen&&<div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",background:C.card,padding:"0.625rem"}}>
                    {yearTotal===0&&<div style={{fontSize:12,color:C.muted,padding:"8px 4px"}}>No audits match the current filters for this year.</div>}
                    {/* Group by audit type */}
                    {Object.entries(AUDIT_FORMS).map(([key,form])=>{
                      const ta=yearAudits.filter(a=>a.type===key);
                      if(!ta.length)return null;
                      return(
                        <div key={key} style={{marginBottom:"0.75rem"}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:"0.375rem",display:"flex",alignItems:"center",gap:6,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                            <span>{form.icon}</span> {form.title} <span style={{background:C.grayL,borderRadius:8,padding:"0 6px",fontSize:10,textTransform:"none",letterSpacing:0,fontWeight:500,color:C.muted}}>{ta.length}</span>
                          </div>
                          {ta.map(a=>{
                            const aOpen=isAOpen(a.id);
                            return(
                              <div key={a.id} style={{marginBottom:4}}>
                                {/* Audit summary row — tap to expand */}
                                <div onClick={()=>toggleA(a.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:aOpen?"6px 6px 0 0":6,background:C.grayXL,border:`1px solid ${aOpen?C.border:C.border}`,cursor:"pointer",userSelect:"none"}}>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:12,fontWeight:600,color:C.text}}>{fmtNZ(a.date)} <span style={{color:C.muted,fontWeight:400}}>· {a.clinic}</span></div>
                                    <div style={{fontSize:11,color:C.muted,marginTop:1}}>Auditor: {a.auditor}{a.physioAudited?` · Physio: ${a.physioAudited}`:""}</div>
                                  </div>
                                  {a.evidence&&<span style={{fontSize:11,color:C.teal,flexShrink:0}}>📎</span>}
                                  <Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>
                                  <span style={{color:C.muted,fontSize:14,transform:aOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.13s",display:"inline-block",flexShrink:0}}>›</span>
                                </div>
                                {/* Expanded audit detail */}
                                {aOpen&&<div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 6px 6px",background:"white",padding:"10px 12px"}}>
                                  {a.passed!==undefined&&<div style={{display:"flex",gap:14,marginBottom:6,fontSize:12}}>
                                    <span style={{color:C.green,fontWeight:500}}>✓ {a.passed} passed</span>
                                    {a.failed>0&&<span style={{color:C.red,fontWeight:500}}>✗ {a.failed} failed</span>}
                                    {a.na>0&&<span style={{color:C.muted}}>{a.na} N/A</span>}
                                    <span style={{color:C.muted}}>{a.total} total items</span>
                                  </div>}
                                  {a.notes&&<div style={{fontSize:12,background:C.grayXL,padding:"7px 10px",borderRadius:5,lineHeight:1.6,marginBottom:6,border:`1px solid ${C.border}`}}>{a.notes}</div>}
                                  {a.evidence&&<div style={{marginBottom:6}}><BSm onClick={()=>setEavf(a.evidence)} color={C.teal}>📎 View evidence — {a.evidence.fileName}</BSm></div>}
                                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                    <BSm onClick={e=>{e.stopPropagation();setViewAudit(a);}} color={C.blue}>View full report →</BSm>
                                    <AuditEvidenceBtn audit={a} audits={audits} setAudits={setAudits} onView={setEavf}/>
                                    <BSm onClick={e=>{e.stopPropagation();if(!window.confirm(`Delete this ${a.type} audit for ${a.clinic} on ${fmtNZ(a.date)}?\n\nThis cannot be undone.`))return;const updated=audits.filter(x=>x.id!==a.id);setAudits(updated);saveGen("audits",updated);// Track deleted seeded IDs so they don't reload from INIT
if(typeof a.id==="number"&&a.id<100000){const prev=JSON.parse(localStorage.getItem("tbp_deleted_audit_ids")||"[]");localStorage.setItem("tbp_deleted_audit_ids",JSON.stringify([...new Set([...prev,a.id])]));saveGen("deletedAuditIds",[...new Set([...prev,a.id])]);};}} color={C.red}>🗑 Delete</BSm>
                                  </div>
                                </div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>}
    {mgmtTab==="meetings"&&(()=>{
      const thisYear=String(new Date().getFullYear());
      const nowMonth=new Date().getMonth();
      const currentQ=nowMonth<3?0:nowMonth<6?1:nowMonth<9?2:3;
      const qDefs=[{n:"Q1",label:"Jan – Mar",months:[0,1,2]},{n:"Q2",label:"Apr – Jun",months:[3,4,5]},{n:"Q3",label:"Jul – Sep",months:[6,7,8]},{n:"Q4",label:"Oct – Dec",months:[9,10,11]}];
      const allMeetingYears=[...new Set([thisYear,...meetings.map(m=>m.date.slice(0,4))])].sort((a,b)=>b-a);
      const mainClinics=CLINICS.filter(c=>!c.isSchool);
      const[regenState,setRegenState]=useState({running:false,msg:""});
      async function regenAllMeetings(){
        if(!window.confirm("Regenerate ALL meeting minutes with the current templates?\n\nThis re-creates the saved HTML files using the latest styles. Existing ones will be replaced."))return;
        setRegenState({running:true,msg:"Starting…"});
        try{
          // Process ALL seeded meetings (id < 100000), not just mid-2025+
          const targets=meetings.map((m,i)=>({m,i})).filter(({m})=>m.id<100000);
          let done=0;const total=targets.length;
          const updated=[...meetings];
          for(const{m,i}of targets){
            setRegenState({running:true,msg:`Regenerating ${done+1}/${total} — ${fmtNZ(m.date)} ${m.clinic}`});
            try{
              const html=_generateMeetingMinutes(m);
              const dataUrl=_htmlToDataUrl(html);
              const fileName=`Meeting_Minutes_${m.date}_${m.clinic.replace(/\s+/g,'_')}.html`;
              const driveFile=await _uploadFileToDrive('mtgatt_'+m.id,fileName,'text/html',dataUrl);
              if(driveFile){
                updated[i]={...m,attachment:{...driveFile,fileName,fileType:'text/html',uploadedDate:m.date,id:Date.now()}};
                done++;
              }
            }catch(e){_warn('regen',e.message);}
          }
          setMeetings(updated);
          saveGen("meetings",updated);
          setRegenState({running:false,msg:`✅ Done — ${done} of ${total} regenerated`});
          setTimeout(()=>setRegenState({running:false,msg:""}),5000);
        }catch(e){setRegenState({running:false,msg:`❌ ${e.message||e}`});}
      }

      // Year open by default for all years (collapse only on explicit click)
      function isYrOpen(yr){const k="myr_"+yr;return k in collapsedYears?collapsedYears[k]:true;}
      function toggleYr(yr){setCollapsedYears(p=>({...p,["myr_"+yr]:!isYrOpen(yr)}));}

      function qMeetings(year,qi){
        return meetings.filter(m=>{
          if(m.date.slice(0,4)!==year)return false;
          return qDefs[qi].months.includes(new Date(m.date).getMonth());
        }).sort((a,b)=>a.date.localeCompare(b.date));
      }

      return <div>
        <Alert type="blue" title="P&P Section 7.6 — Staff meetings">Held quarterly per clinic. {meetings.length} meeting{meetings.length!==1?"s":""} logged.</Alert>

        {/* ── Regenerate minutes with latest templates ── */}
        <div style={{background:"#F7F5EE",border:`1px solid ${C.border}`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:13,fontWeight:600}}>🎨 Meeting minute templates</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Style varies by era (6 different looks — 2022 basic Word → 2025 digital attestation). Click below after any template change to refresh saved docs.</div>
          </div>
          <Btn onClick={regenAllMeetings} style={{opacity:regenState.running?0.5:1}}>{regenState.running?"⏳ Regenerating…":"Regenerate all minutes"}</Btn>
        </div>
        {regenState.msg&&<div style={{fontSize:12,marginBottom:"1rem",color:regenState.msg.startsWith("✅")?C.green:regenState.msg.startsWith("❌")?C.red:C.blue}}>{regenState.msg}</div>}

        {/* ── Meeting documents status (auto-linked on load) ── */}
        {(()=>{
          const[genStatus,setGenStatus]=useState('idle');
          const[genProgress,setGenProgress]=useState('');
          const[genResult,setGenResult]=useState(null);
          const withDoc=meetings.filter(m=>getMeetingFile(m)&&m.id<100000).length;
          const pendingMeetings=meetings.filter(m=>!getMeetingFile(m)&&m.id<100000).length;
          async function runMeetingGen(){
            setGenStatus('running');
            try{
              const res=await _generateHistoricalAttachments(audits,meetings,msg=>setGenProgress(msg));
              setAudits(res.updatedAudits);setMeetings(res.updatedMeetings);
              setGenResult(res);setGenStatus('done');
            }catch(e){setGenProgress(e.message);setGenStatus('error');}
          }
          if(withDoc===0&&pendingMeetings===0)return null;
          return(
            <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1rem",fontSize:12,color:C.muted}}>
              📄 {withDoc>0&&<span style={{color:C.green}}>{withDoc} meeting{withDoc!==1?'s':''} linked to Drive. </span>}
              {pendingMeetings>0&&<span>{pendingMeetings} still need documents. </span>}
              {pendingMeetings>0&&genStatus==='idle'&&<span onClick={runMeetingGen} style={{color:C.blue,cursor:'pointer',textDecoration:'underline',marginLeft:4}}>Generate missing →</span>}
              {genStatus==='running'&&<span style={{color:C.blue,marginLeft:6}}>⏳ {genProgress||'Starting…'}</span>}
              {genStatus==='done'&&<span style={{color:C.green,marginLeft:6}}>✓ Done</span>}
              {genStatus==='error'&&<span style={{color:C.red,marginLeft:6}}>❌ {genProgress}</span>}
            </div>
          );
        })()}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
          <Btn onClick={()=>setShowAdd(true)}>+ Log meeting</Btn>
        </div>

        {/* ── Log form ── */}
        {showAdd&&<Card style={{borderColor:C.teal,marginBottom:"1rem"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Log meeting <span style={{fontSize:12,color:C.muted,fontWeight:400}}>(set any past date for historical records)</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 1rem"}}>
            <Input label="Date" value={nm.date} onChange={e=>setNm({...nm,date:e.target.value})} type="date"/>
            <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Clinic / location</label>
              <select value={nm.clinic} onChange={e=>setNm({...nm,clinic:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}>
                <option>All clinics</option>{CLINICS.map(c=><option key={c.id}>{c.short}</option>)}
              </select>
            </div>
          </div>
          <Input label="Topic / agenda" value={nm.topic} onChange={e=>setNm({...nm,topic:e.target.value})} placeholder="e.g. Q4 staff meeting — H&S review, CPD updates"/>
          <Input label="Attendees" value={nm.attendees} onChange={e=>setNm({...nm,attendees:e.target.value})} placeholder="e.g. Jade, Alistair, Hans, Timothy"/>
          <Textarea label="Notes / minutes" value={nm.notes} onChange={e=>setNm({...nm,notes:e.target.value})} rows={3}/>
          <div style={{marginBottom:"0.625rem"}}>
            <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Attach minutes / notes document (optional)</label>
            {nm.attachment
              ?<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.grayXL,borderRadius:6,marginBottom:4}}>
                <span style={{fontSize:12,flex:1}}>📎 {nm.attachment.fileName}</span>
                <BSm onClick={()=>setNm({...nm,attachment:null})} color={C.red}>✕</BSm>
              </div>
              :<BSm onClick={()=>meetRef.current.click()} color={C.gray}>📎 Attach document or photo</BSm>
            }
            <input ref={meetRef} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;if(f.size>10*1024*1024){alert("File over 10MB.");return;}const r=new FileReader();r.onload=async ev=>{const att={id:Date.now(),fileName:f.name,fileType:f.type,dataUrl:ev.target.result,uploadedDate:new Date().toLocaleDateString("en-NZ")};setNm(n=>({...n,attachment:att}));const bf=await _uploadToBlob("mtgatt_"+att.id,f.name,f.type,ev.target.result);if(bf)setNm(n=>({...n,attachment:{...n.attachment,blobUrl:bf.blobUrl,dataUrl:undefined}}));};r.readAsDataURL(f);e.target.value="";}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{if(nm.date&&nm.topic){
              // Strip heavy dataUrl from attachment before saving — blobUrl is enough for viewing
              const att=nm.attachment?{...nm.attachment,dataUrl:undefined}:null;
              const rec={...nm,id:Date.now(),attachment:att};
              const updated=[...meetings,rec];setMeetings(updated);saveGen("meetings",updated);setNm({date:"",clinic:"All clinics",topic:"",attendees:"",notes:"",attachment:null});setShowAdd(false);}}}>Save</Btn>
            <Btn outline onClick={()=>setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>}

        {/* ── Year → Quarter label → Meeting cards ── */}
        {allMeetingYears.map(year=>{
          const yearMeetings=meetings.filter(m=>m.date.slice(0,4)===year);
          const yrOpen=isYrOpen(year);
          return(
            <div key={year} style={{marginBottom:"0.75rem"}}>
              {/* Year header — tap to collapse/expand */}
              <div onClick={()=>toggleYr(year)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:year===thisYear?C.tealL:C.grayXL,border:`1px solid ${year===thisYear?C.teal:C.border}`,borderRadius:yrOpen?"8px 8px 0 0":8,cursor:"pointer",userSelect:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:15,fontWeight:700,color:year===thisYear?C.teal:C.text}}>{year}</span>
                  {year===thisYear&&<span style={{fontSize:10,background:C.teal,color:"white",borderRadius:8,padding:"1px 7px",fontWeight:600}}>CURRENT</span>}
                  <span style={{fontSize:12,color:C.muted}}>{yearMeetings.length} meeting{yearMeetings.length!==1?"s":""}</span>
                </div>
                <span style={{color:C.muted,fontSize:18,transform:yrOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.18s",display:"inline-block"}}>›</span>
              </div>

              {yrOpen&&<div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",background:C.card,padding:"0.75rem"}}>
                {/* Q1–Q4 as static labels — no extra tap needed */}
                {qDefs.map((q,qi)=>{
                  const qms=qMeetings(year,qi);
                  const isCurrent=year===thisYear&&qi===currentQ;
                  const isPast=(parseInt(year)<parseInt(thisYear))||(year===thisYear&&qi<currentQ);
                  if(qms.length===0&&!isPast&&!isCurrent)return null; // hide future quarters with nothing
                  return(
                    <div key={qi} style={{marginBottom:"0.875rem"}}>
                      {/* Quarter label — static, not a button */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"0.5rem"}}>
                        <span style={{fontSize:12,fontWeight:700,color:qms.length>0?C.teal:isPast?C.red:C.muted}}>{q.n}</span>
                        <span style={{fontSize:11,color:C.muted}}>{q.label}</span>
                        {isCurrent&&<span style={{fontSize:10,background:C.teal+"22",color:C.teal,borderRadius:6,padding:"1px 6px",fontWeight:500}}>current</span>}
                        {qms.length===0&&isPast&&<span style={{fontSize:11,color:C.red}}>— no meeting logged</span>}
                        {qms.length===0&&isCurrent&&<span style={{fontSize:11,color:C.muted}}>— not yet logged</span>}
                      </div>
                      {/* Meeting cards — always fully expanded */}
                      {qms.map(m=>(
                        <div key={m.id} style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:"0.5rem"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{m.topic||"Staff meeting"}</div>
                              <div style={{fontSize:11,color:C.muted}}>📅 {fmtNZ(m.date)} &nbsp;·&nbsp; 📍 {m.clinic}</div>
                            </div>
                            <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                              <Pill s="ok" label="Done ✓"/>
                              <BSm onClick={()=>{if(window.confirm("Delete this meeting?")){const u=meetings.filter(x=>x.id!==m.id);setMeetings(u);saveGen("meetings",u);}}} color={C.red}>✕</BSm>
                            </div>
                          </div>
                          {m.attendees&&<div style={{fontSize:12,color:C.muted,marginTop:6}}>👥 {m.attendees}</div>}
                          {m.notes&&<div style={{fontSize:12,color:C.text,background:"white",padding:"8px 10px",borderRadius:6,border:`1px solid ${C.border}`,lineHeight:1.6,marginTop:6}}>{m.notes}</div>}
                          <div style={{marginTop:8}}>
                            <MeetingAttachBtn meeting={m} meetings={meetings} setMeetings={setMeetings} onView={setEavf}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {yearMeetings.length===0&&<div style={{padding:"10px 4px",fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:10}}>No meetings logged for {year}. <BSm onClick={()=>setShowAdd(true)} color={C.teal}>+ Log one →</BSm></div>}
              </div>}
            </div>
          );
        })}
      </div>;
    })()}
    {mgmtTab==="equipment"&&<div>
      <Alert type="amber" title="P&P Section 3.1.15 — Equipment">Annual service and test/tag. Upload service certs below. Instruction manuals on manufacturer websites. Equipment maintenance register on shared drive.</Alert>
      <Card>{CLINICS.filter(c=>!c.isSchool).map(cl=><FileRow key={cl.id} label={`${cl.icon} ${cl.short} — service certificate`} gkey={`equip_${cl.id}`} onView={f=>setMvf(f)} accent={C.amber}/>)}</Card>
      <Btn outline onClick={()=>setActiveAudit("equipment")}>Run equipment audit →</Btn>
      {mvf&&<FileViewer file={mvf} onClose={()=>setMvf(null)}/>}
    </div>}
    {mgmtTab==="accreditation"&&<div>
      <Alert type="green" title="DAA Group — ACC Allied Health Standards">All sections of this portal support your DAA audit readiness. P&P manual underpins all requirements below.</Alert>

      {[
        {t:"Staff credentials — APC, First Aid, Cultural",s:Object.entries(STAFF).every(([id])=>["apc","firstaid","cultural"].every(k=>loadFile(id,k)))?"ok":"pending",d:"All staff hold current APC, First Aid and Cultural Competency — P&P §7",action:()=>{setPage("compliance");setCompTab("overview");}},
        {t:"Police vetting — all staff",s:Object.entries(STAFF).every(([id])=>loadFile(id,"policevetting"))?"ok":"pending",d:"Every 3 years — NZ Police email confirmation — P&P §4.2",action:()=>{setPage("compliance");setCompTab("vetting");}},
        {t:"Clinical notes audits — 6-monthly",s:[...audits].filter(a=>a.type==="clinical_notes").length>0?"ok":"pending",d:"10 records per physio (5 current + 5 past) — P&P §1.5.1",action:()=>{setMgmtTab("audits");setActiveAudit("clinical_notes");}},
        {t:"Peer reviews — annual",s:[...audits].filter(a=>a.type==="peer_review").length>0?"ok":"pending",d:"At least annually per physio — observation, notes review, feedback — P&P §7.8",action:()=>{setMgmtTab("audits");setActiveAudit("peer_review");}},
        {t:"Orientation — all staff",s:Object.keys(STAFF).every(id=>loadFile(id,"orientation"))?"ok":"pending",d:"Complete digital checklist for each staff member — P&P §7.1",action:()=>setPage("staff")},
        (()=>{
          // Only count reviews dated this calendar year
          const yr=new Date().getFullYear();
          const reviewedThisYr=Object.values(ppReviews||{}).filter(r=>{
            if(!r?.reviewedAt)return false;
            try{return new Date(r.reviewedAt).getFullYear()===yr;}catch{return false;}
          }).length;
          const total=PP_SECTIONS?.length||8;
          const status=reviewedThisYr>=total?"ok":"pending";
          const label=status==="ok"?"Compliant ✓":`${reviewedThisYr}/${total} reviewed this year`;
          return{t:"P&P annual review",s:status,label,d:"Due April — P&P §1.1",action:()=>{setPage("pp");}};
        })(),
        {t:"In-service training",s:inservices.some(i=>String(i.year||i.date?.slice(0,4)||"")===String(new Date().getFullYear()))?"ok":"pending",d:"At least one per clinic per year — P&P §7.7.3",action:()=>setPage("inservice")},
        {t:"H&S audits — quarterly",s:[...audits].filter(a=>a.type==="hs_audit").length>0?"ok":"pending",d:"Records in audit history — P&P §1.5.2",action:()=>{setMgmtTab("audits");}},
        {t:"Fire drills — annual",s:[...audits].filter(a=>a.type==="fire_drill").length>0?"ok":"pending",d:"Annual requirement — P&P §3.1.2",action:()=>{setMgmtTab("audits");}},
        {t:"Staff meetings — quarterly",s:meetings.length>0?"ok":"pending",d:"Minutes logged in Staff Meetings tab — P&P §7.6",action:()=>setMgmtTab("meetings")},
        {t:"Equipment servicing — annual",s:[...audits].filter(a=>a.type==="equipment").length>0?"ok":"pending",d:"Annual service and test/tag — P&P §3.1.15",action:()=>setMgmtTab("equipment")},
        {t:"Hygiene audits — quarterly",s:[...audits].filter(a=>a.type==="hygiene").length>0?"ok":"pending",d:"Quarterly per clinic — P&P §1.5.2",action:()=>{setMgmtTab("audits");}},
        {t:"Client satisfaction survey",s:"ok",d:"Sent to every new patient after 4 sessions · P&P §1.5.3",action:()=>window.open("https://docs.google.com/spreadsheets/d/1---cI2Jqs7eRfaLX1om6PM-9uSjZCBpTSwxVanr3duM/edit?usp=drivesdk","_blank")},
      ].map(({t,s,d,action,label})=>(
        <div key={t} onClick={action||undefined} style={{background:C.card,border:`1px solid ${s==="ok"?C.teal:C.border}`,borderRadius:8,padding:"0.875rem 1rem",marginBottom:"0.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,cursor:action?"pointer":"default"}} onMouseEnter={e=>{if(action)e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.08)";}} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>{t}{action&&<span style={{fontSize:10,color:C.teal}}>→</span>}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{d}</div>
          </div>
          <Pill s={s} label={label||(s==="ok"?"Compliant ✓":"Action needed")}/>
        </div>
      ))}
    </div>}
    </div>
  );};

  if(portalLoading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg,fontFamily:"-apple-system,'Segoe UI',sans-serif"}}><div style={{textAlign:"center",padding:"0 2rem"}}><div style={{width:48,height:48,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div><div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:4}}>Total Body Physio</div><div style={{fontSize:13,color:C.muted,marginBottom:"1.5rem"}}>Connecting to Google Drive…</div><button onClick={()=>setPortalLoading(false)} style={{fontSize:12,color:C.muted,background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 16px",cursor:"pointer"}}>Skip — open without Drive</button></div></div>);

  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      {/* ── Mobile overlay backdrop ── */}
      {isMobile&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:19}}/>}

      {/* ── Sidebar ── */}
      <div style={{width:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:20,overflowY:"auto",transform:isMobile&&!navOpen?"translateX(-100%)":"translateX(0)",transition:"transform 0.22s ease"}}>
        <div style={{padding:"1.25rem 1rem",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>Total Body Physio</div><div style={{fontSize:11,color:C.muted}}>PhysioPortal</div></div>
          {isMobile&&<button onClick={()=>setNavOpen(false)} style={{background:"none",border:"none",fontSize:20,color:C.muted,cursor:"pointer",padding:"2px 6px",lineHeight:1}}>✕</button>}
        </div>
        {/* Google Drive connect banner */}
        {!portalConnected&&<div style={{padding:"0.625rem 1rem",borderBottom:`1px solid ${C.border}`,background:"#FFF9E6"}}>
          <div style={{fontSize:11,color:"#7a5c00",marginBottom:4,fontWeight:500}}>📁 Not connected to Google Drive</div>
          <button onClick={()=>_signInToDrive().then(ok=>{if(ok){setPortalConnected(true);hydrateFromStore();_scheduleForceUpdate();}}).catch(()=>{})} style={{width:"100%",background:"#185FA5",color:"white",border:"none",borderRadius:5,padding:"5px 0",fontSize:11,fontWeight:600,cursor:"pointer"}}>
            Connect Google Drive →
          </button>
        </div>}
        {portalConnected&&<div style={{padding:"5px 1rem",borderBottom:`1px solid ${C.border}`,background:"#EAF3DE",display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:10}}>📁</span><span style={{fontSize:11,color:C.green,fontWeight:500}}>Google Drive connected</span>
        </div>}
        <div style={{padding:"0.75rem 1rem",borderBottom:`1px solid ${C.border}`}}>
          <label style={{fontSize:10,color:C.hint,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Viewing as</label>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,background:C.grayXL}}>
            <option value="owner">Jade — Owner</option>
            <option value="alistair">Alistair — Clinical Director</option>
            <option value="hans">Hans — Clinic Lead</option>
            <option value="staff">Staff member</option>
          </select>
        </div>
        <div style={{padding:"0.5rem 0",flex:1}}>
          {navItems.map(item=>{
            if(item.adminOnly&&role==="staff")return null;
            return(
              <div key={item.id}>
                {item.section&&<div style={{fontSize:10,color:C.hint,textTransform:"uppercase",letterSpacing:"0.06em",padding:"0.75rem 1rem 0.25rem"}}>{item.section}</div>}
                <div onClick={()=>{setPage(item.id);if(isMobile)setNavOpen(false);}} style={{display:"flex",alignItems:"center",padding:"8px 1rem",fontSize:13,color:page===item.id?C.teal:C.muted,cursor:"pointer",borderLeft:page===item.id?`3px solid ${C.teal}`:"3px solid transparent",background:page===item.id?"#E1F5EE":"transparent",fontWeight:page===item.id?500:400}}>
                  <span style={{flex:1}}>{item.label}</span>
                  {item.badge&&<span style={{background:"#FCEBEB",color:C.red,fontSize:10,padding:"1px 6px",borderRadius:10,fontWeight:600}}>{item.badge}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:"0.875rem 1rem",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:13,fontWeight:600}}>{roleNames[role]}</div>
          <div style={{fontSize:11,color:C.muted}}>{role==="owner"?"Owner / Director":role==="alistair"?"Clinical Director":role==="hans"?"Clinic Lead — Titirangi":"Physiotherapist"}</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{marginLeft:isMobile?0:220,flex:1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        {/* Mobile top bar */}
        {isMobile&&<div style={{position:"sticky",top:0,zIndex:10,background:C.card,borderBottom:`1px solid ${C.border}`,padding:"0.625rem 1rem",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 2px",display:"flex",flexDirection:"column",gap:"4px",flexShrink:0}}>
            <span style={{display:"block",width:22,height:2,background:C.text,borderRadius:2}}/>
            <span style={{display:"block",width:22,height:2,background:C.text,borderRadius:2}}/>
            <span style={{display:"block",width:22,height:2,background:C.text,borderRadius:2}}/>
          </button>
          <div style={{flex:1,textAlign:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:C.teal}}>Total Body Physio</span>
          </div>
          {urgentCount>0&&<span style={{background:C.red,color:"white",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 7px",flexShrink:0}}>{urgentCount}</span>}
        </div>}
        <div style={{padding:isMobile?"1rem":"1.5rem",flex:1}}>
          {page==="dashboard"&&<Dashboard/>}
          {page==="reminders"&&<RemindersPage/>}
          {page==="pp"&&<PPPage setPage={setPage} setActiveAudit={setActiveAudit} ppDocs={ppDocs} setPpDocs={setPpDocs} ppReviews={ppReviews} setPpReviews={setPpReviews}/>}
          {page==="staff"&&<StaffPage/>}
          {page==="compliance"&&<CompliancePage/>}
          {page==="archive"&&<ArchivePage/>}
          {page==="clinics"&&<ClinicsPage/>}
          {page==="inservice"&&<InservicePage/>}
          {page==="documents"&&<DocumentsPage/>}
          {page==="management"&&<ManagementPage/>}
        </div>
      </div>

      <ProfileModal id={profile} onClose={()=>{setProfile(null);fu(n=>n+1);}} role={role} onStaffSave={(id,saved)=>setStaffOverrides(p=>({...p,[id]:saved}))} staffOverrides={staffOverrides}/>
      {viewAudit&&<AuditViewModal audit={viewAudit} onClose={()=>setViewAudit(null)}/>}
      {activeAudit&&<AuditModal type={activeAudit} onClose={()=>setActiveAudit(null)} onComplete={r=>{setAudits(p=>{const updated=[...p,r];saveGen("audits",updated);return updated;});setActiveAudit(null);setPage("management");setMgmtTab("audits");}}/>}
      {eavf&&<FileViewer file={eavf} onClose={()=>setEavf(null)}/>}
      {vf&&<FileViewer file={vf} onClose={()=>setVf(null)}/>}
    </div>
  );
}
