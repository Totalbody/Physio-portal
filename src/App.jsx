import { useState, useRef, useEffect, useCallback, Fragment } from "react";

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
  {id:"pakuranga",name:"Pakuranga — Lloyd Elsmore",short:"Pakuranga",icon:"🏊",address:"1 Sir Lloyd Drive, Pakuranga, Auckland",note:"Lloyd Elsmore Leisure Centre · Since 2002 · Pool & gym access"},
  {id:"flatbush", name:"Flat Bush",               short:"Flat Bush", icon:"🏥",address:"14 Fusion Road, Flat Bush, Auckland",note:"Flat Bush clinic"},
  {id:"titirangi",name:"Titirangi Village",        short:"Titirangi", icon:"🌿",address:"2 Rangiwai Road, Titirangi, Auckland 0604",note:"Below Titirangi Medical Centre · Since 2004 · On-site gym"},
  {id:"panmure",  name:"Panmure — Lagoon Pools",   short:"Panmure",  icon:"🏊",address:"29 Lagoon Drive, Panmure, Auckland 1072",note:"Inside Lagoon Pools complex · Hydrotherapy access"},
  {id:"howick_school",    name:"Howick School",    short:"Howick School",    icon:"🏫",isSchool:true,noFireDrill:true,note:"School term only · Hakinakina Hauora Health Services · School runs own fire drills"},
  {id:"edgewater_school", name:"Edgewater School", short:"Edgewater School", icon:"🏫",isSchool:true,noFireDrill:true,note:"School term only · Hakinakina Hauora Health Services · School runs own fire drills"},
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
  clinical_notes:{title:"Clinical Notes Audit",icon:"📋",freq:"Every 6 months",hasPhysioSelect:true,useV2Grid:true,sections:[
    {title:"Notes can be clearly understood",items:["Logical, intelligible and sequential","Patient is identified on each page"]},
    {title:"Consent",items:["Evidence that assessment and treatment has been explained and accepted by the patient","Further consent with significant change in treatment"]},
    {title:"Assessment",items:["Patient history","Subjective examination","Objective examination","Related test findings","Analysis / conclusion"]},
    {title:"Goals of treatment",items:["Identified","Measurable","Time bound"]},
    {title:"Treatment plan",items:["Record of initial treatment plan"]},
    {title:"Changes in plan",items:["Recorded"]},
    {title:"Notation of each treatment given",items:["Treatment given recorded"]},
    {title:"Evidence of review",items:["Entry of review each time a patient attends for treatment"]},
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
  peer_review:{title:"Peer Review",icon:"🔍",freq:"Annual",hasPhysioSelect:true,useV2Modal:true,sections:[
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
async function _uploadFileToDrive(fileKey, fileName, fileType, dataUrl, _isRetry=false) {
  try {
    const folderId = _folderForKey(fileKey); // instant — no API call
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: fileName, parents: [folderId] })], { type:'application/json' }));
    form.append('file', new Blob([bytes], { type: fileType }));
    const t0 = Date.now();
    const resp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      { method:'POST', headers:{ Authorization:`Bearer ${_driveToken}` }, body: form }
    );
    // Token expired? Refresh and retry once.
    if (resp.status === 401 && !_isRetry) {
      _warn('[Drive upload] 401 — refreshing token and retrying', fileName);
      _clearTokenCache();
      try { await _requestToken('none'); } catch {
        try { await _requestToken(''); } catch(e) { _err('[Drive upload] token refresh failed', e.message||e); return null; }
      }
      return _uploadFileToDrive(fileKey, fileName, fileType, dataUrl, true);
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      _err('[Drive upload]', resp.status, fileName, errText.slice(0, 200));
      return null;
    }
    const r = await resp.json();
    if (!r.id) { _err('[Drive upload] no file id in response', fileName, JSON.stringify(r).slice(0,200)); return null; }
    _log(`[Drive upload] ✓ ${fileName} (${(bytes.length/1024).toFixed(0)}KB in ${Date.now()-t0}ms) id=${r.id}`);
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
  } catch(e) { _err('[Drive upload] exception', fileName, e.message||String(e)); return null; }
}

async function _deleteFromDrive(driveId) {
  if (!driveId || !_driveToken) return;
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}`,
      { method:'DELETE', headers:{ Authorization:`Bearer ${_driveToken}` } });
  } catch(e) { _err('[Drive delete]', e.message); }
}

// ── SAVE SERIALIZATION ───────────────────────────────────────────
// Root cause of the "evidence reverts on refresh" bug:
// multiple components trigger state saves in quick succession.
// Each save PATCHes the full 8MB state file and takes 6–20s.
// With concurrent PATCHes, Google Drive applies them in the order
// they *arrive*, which is not necessarily the order they were
// started — so a stale-snapshot save can complete LAST and clobber
// fresher data. This queue ensures only one save is ever in flight;
// if another save is requested while one is running, we do exactly
// one more save after the current one completes, which picks up
// the latest _portalStore.data and guarantees the final write wins.
let _saveInFlight  = null;
let _saveRequested = false;
// Shared lock across any bulk-upload component (currently BulkEvidenceUploader).
// Prevents two long-running batches from racing each other on _portalStore.data
// and writing stale snapshots.
let _batchRunning = false;
async function _saveDriveState() {
  if (_saveInFlight) {
    _saveRequested = true;
    try { await _saveInFlight; } catch {}
    if (!_saveRequested) return; // another waiter already triggered a follow-up
  }
  _saveRequested = false;
  const p = _saveDriveStateImpl();
  _saveInFlight = p;
  try {
    await p;
  } finally {
    _saveInFlight = null;
    if (_saveRequested) {
      _saveRequested = false;
      _saveDriveState().catch(e => _warn('[Drive] follow-up save failed:', e.message||String(e)));
    }
  }
}

// Save portal-state.json into the root portal folder (debounced)
async function _saveDriveStateImpl(_isRetry=false) {
  if (!_portalReady || !_driveToken) throw new Error('Drive not ready');
  // Diagnostic: show how many fire drill records have PDF evidence in this snapshot
  const _aud = _portalStore.data?.audits || [];
  const _fdTot = _aud.filter(a=>a?.type==='fire_drill').length;
  const _fdEv  = _aud.filter(a=>a?.type==='fire_drill' && a?.evidence?.driveId).length;
  const payload = JSON.stringify({ ..._portalStore.data, _files: _portalStore.files });
  _log(`[Drive] Saving state (${(payload.length/1024).toFixed(0)}KB, ${Object.keys(_portalStore.data).length} keys, ${Object.keys(_portalStore.files).length} files, fire drill evidence ${_fdEv}/${_fdTot})…`);
  const t0 = Date.now();
  try {
    if (_driveStateFileId) {
      const resp = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${_driveStateFileId}?uploadType=media`, {
        method:'PATCH',
        headers:{ Authorization:`Bearer ${_driveToken}`, 'Content-Type':'application/json' },
        body: payload,
      });
      // Token expired? Refresh and retry once.
      if (resp.status === 401 && !_isRetry) {
        _warn('[Drive state save] 401 — refreshing token and retrying');
        _clearTokenCache();
        try { await _requestToken('none'); } catch { await _requestToken(''); }
        return _saveDriveStateImpl(true);
      }
      // State file was deleted/moved? Clear the stale ID and try creating a new one.
      if (resp.status === 404 && !_isRetry) {
        _warn('[Drive state save] 404 — state file gone, creating a new one');
        _driveStateFileId = null;
        try { localStorage.removeItem('tbp_state_file_id'); } catch {}
        return _saveDriveStateImpl(true);
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(()=>resp.statusText);
        throw new Error(`Drive PATCH failed: ${resp.status} ${errText.slice(0,200)}`);
      }
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
      if (resp.status === 401 && !_isRetry) {
        _warn('[Drive state create] 401 — refreshing token and retrying');
        _clearTokenCache();
        try { await _requestToken('none'); } catch { await _requestToken(''); }
        return _saveDriveStateImpl(true);
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(()=>resp.statusText);
        throw new Error(`Drive create failed: ${resp.status} ${errText.slice(0,200)}`);
      }
      const r = await resp.json();
      if (r.id) {
        _driveStateFileId = r.id;
        try { localStorage.setItem('tbp_state_file_id', r.id); } catch {}
        fetch(`https://www.googleapis.com/drive/v3/files/${r.id}/permissions`, {
          method:'POST',
          headers:{ Authorization:`Bearer ${_driveToken}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ role:'reader', type:'anyone' }),
        }).catch(()=>{});
      }
    }
    _log(`[Drive] State saved ✓ (${Date.now()-t0}ms)`);
    _mirrorStateToVercel();
  } catch(e) {
    _err('[Drive state save]', e.message);
    throw e; // re-throw so callers (like saveGenImmediate) see failures
  }
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
    // Sort by modifiedTime DESC so the newest file wins even if duplicates exist.
    // Duplicates can appear if an earlier session lost its file-ID cache (e.g. 404
    // on PATCH → retry creates a new file) — and the old copy sticks around
    // in Drive. Without this sort, _loadDriveData might pick an older copy
    // arbitrarily, which is exactly how "state reverts on refresh" happens.
    const list = await window.gapi.client.drive.files.list({
      q, fields:'files(id,modifiedTime,size)', spaces:'drive',
      orderBy: 'modifiedTime desc', pageSize: 50,
    });
    const found = (list.result.files || []);
    if (found.length === 0) {
      _log('[Drive] No portal-state.json found — starting fresh');
      await _syncLocalToDrive();
      return;
    }
    if (found.length > 1) {
      _warn(`[Drive] ⚠️ Found ${found.length} portal-state.json files — using newest. Older copies:`,
        found.slice(1).map(f => `${f.id} (modified ${f.modifiedTime})`).join(' | '));
    }
    _driveStateFileId = found[0].id;
    _log(`[Drive] Using state file id=${found[0].id.slice(0,10)}… modified=${found[0].modifiedTime} size=${((Number(found[0].size)||0)/1024).toFixed(0)}KB`);
    try { localStorage.setItem('tbp_state_file_id', _driveStateFileId); } catch {}
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${_driveStateFileId}?alt=media&_cb=${Date.now()}`,
      { headers:{ Authorization:`Bearer ${_driveToken}`, 'Cache-Control':'no-cache', 'Pragma':'no-cache' } }
    );
    const data = await resp.json();
    const files = data._files || {};
    delete data._files;
    _portalStore = { files, data };
    // Diagnostic: show how many fire drills and peer reviews have PDF evidence
    // in the state we just loaded. If this is 0/14 right after a "successful"
    // upload batch, the save didn't actually persist.
    const _aud = data.audits || [];
    const _fdTot = _aud.filter(a=>a?.type==='fire_drill').length;
    const _fdEv  = _aud.filter(a=>a?.type==='fire_drill' && a?.evidence?.driveId).length;
    const _prTot = _aud.filter(a=>a?.type==='peer_review').length;
    const _prEv  = _aud.filter(a=>a?.type==='peer_review' && a?.evidence?.driveId).length;
    _log(`[Drive] Loaded ${Object.keys(files).length} files, ${Object.keys(data).length} data keys · fire drills ${_fdEv}/${_fdTot} w/ evidence · peer reviews ${_prEv}/${_prTot} w/ evidence`);
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
  const isV2 = audit.formVersion === "v2" && audit.peerReviewData;
  const pr = isV2 ? audit.peerReviewData : null;

  const practitioner = (pr && pr.practitioner) || audit.physioAudited || 'Practitioner';
  const reviewer     = (pr && pr.reviewer)     || audit.auditor        || 'Reviewer';
  const reviewerReg  = (pr && pr.reviewerReg)  || (() => {
    // Legacy fallback: extract rego from notes
    const regMatch = (audit.notes||'').match(/70[\-\s]?\d{4,5}/);
    return regMatch ? regMatch[0].replace(/\s/,'-') : '';
  })();
  const reviewerProfession = (pr && pr.reviewerProfession) || 'Physiotherapist';

  // Practice type + method — use v2 structured data, else infer from notes (legacy)
  const notesLower = (audit.notes||'').toLowerCase();
  const pt = pr && pr.practiceTypes ? pr.practiceTypes : {
    clinical: !notesLower.includes('non-clinical') && !notesLower.includes('research') && !notesLower.includes('academic'),
    nonClinical: notesLower.includes('non-clinical'),
    research: notesLower.includes('research'),
    academic: notesLower.includes('academic'),
    other: notesLower.includes('other'),
  };
  const practiceOther = (pr && pr.practiceOther) || '';
  const mt = pr && pr.methods ? pr.methods : {
    direct: notesLower.includes('direct observation') || notesLower.includes('direct obs') || (!notesLower.includes('video') && !notesLower.includes('performance review')),
    video: notesLower.includes('video'),
    performance: notesLower.includes('performance review'),
  };

  // Area comments — use v2 data, else fall back to legacy placeholder text
  const legacyComments = {
    professional: "Clear, professional communication maintained throughout the session. Language appropriate to patient. Explanations and instructions delivered effectively.",
    subjective:   "Thorough subjective assessment with targeted questioning. Active listening demonstrated. Patient given opportunity to express concerns.",
    objective:    "Comprehensive objective examination performed. Relevant special tests, range of motion and strength testing completed. Methodical and well-documented.",
    reasoning:    "Strong clinical reasoning linking subjective and objective findings. Evidence-based treatment plan with clear rationale discussed with patient. Realistic timeline and achievable goals set.",
    interaction:  "Positive rapport with patient. Teaching approach clear and patient-centred. Exercises demonstrated effectively. Patient engagement strong throughout session.",
  };
  const comments = (pr && pr.comments) || {};
  const commentOrFallback = (k) => comments[k] || legacyComments[k];

  // Summaries + action plan
  const notes = audit.notes || 'Annual peer review completed.';
  const actionMatch = notes.match(/[Aa]ction [Pp]lan[:\.]?\s*(.+?)(?=\.\s*[A-Z]|$)/s);
  const reviewerSummary = (pr && pr.reviewerSummary) || (notes.length > 100 ? notes : `Review conducted on ${dateFormatted}. Practitioner demonstrated professional standards and clinical competency. ${notes}`);
  const revieweeSummary = (pr && pr.revieweeSummary) || 'Grateful for the feedback and opportunity to reflect on my practice. I appreciate the suggestions for continued growth and will incorporate these into my ongoing professional development.';
  const actionPlan      = (pr && pr.actionPlan)      || (actionMatch ? actionMatch[1].trim() : 'Continue current practice. Review annually.');

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
  table.areas td.comment{width:40%;color:#1a1a1a;font-size:9.5pt;white-space:pre-line;}
  .summary-box{border:1px solid #c7b8e0;border-radius:4px;margin:14px 0;}
  .summary-box .header{background:#E8DFF5;color:#6B46C1;padding:8px 14px;font-weight:700;font-size:10pt;text-transform:none;text-decoration:underline;}
  .summary-box .body{padding:14px 16px;font-size:10pt;min-height:60px;color:#1a1a1a;white-space:pre-line;}
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
    <div class="field"><div class="label">Reviewer Profession:</div><div class="value">${reviewerProfession}</div></div>
  </div>

  <table class="method">
    <tr>
      <td class="label-col">Practice type reviewed:</td>
      <td>
        <span class="opt">${chk(pt.clinical)} Clinical</span>
        <span class="opt">${chk(pt.nonClinical)} Non-clinical</span>
        <span class="opt">${chk(pt.research)} Research</span>
      </td>
    </tr>
    <tr>
      <td class="label-col"></td>
      <td>
        <span class="opt">${chk(pt.academic)} Academic</span>
        <span class="opt">${chk(pt.other)} Other ${practiceOther?`<em style="color:#5a4a7a;">(${practiceOther})</em>`:`<em style="color:#888;">(specify)</em>`}</span>
      </td>
    </tr>
    <tr>
      <td class="label-col">Method:</td>
      <td>
        <span class="opt">${chk(mt.direct)} Direct observation*</span>
        <span class="opt">${chk(mt.video)} Video*</span>
        <span class="opt">${chk(mt.performance)} Performance Review</span>
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
      <td class="comment">${commentOrFallback('professional')}</td>
    </tr>
    <tr>
      <td class="area">Subjective</td>
      <td class="feedback">—</td>
      <td class="comment">${commentOrFallback('subjective')}</td>
    </tr>
    <tr>
      <td class="area">Objective</td>
      <td class="feedback">—</td>
      <td class="comment">${commentOrFallback('objective')}</td>
    </tr>
    <tr>
      <td class="area">Clinical Reasoning and Treatment Plan</td>
      <td class="feedback">—</td>
      <td class="comment">${commentOrFallback('reasoning')}</td>
    </tr>
    <tr>
      <td class="area">Patient Interaction — eg teaching</td>
      <td class="feedback">—</td>
      <td class="comment">${commentOrFallback('interaction')}</td>
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
      ${audit.signature
        ? `<div style="display:inline-block;"><img src="${audit.signature}" alt="reviewer signature" style="max-height:56px;max-width:260px;display:block;margin-left:auto;"/></div>
           <div class="date" style="font-family:'IBM Plex Mono',monospace;">${audit.signedBy||reviewer} · ${fmtNZ(audit.date)}</div>`
        : `<div class="name">${reviewer}</div>
           <div class="date">${fmtNZ(audit.date)}</div>`
      }
    </div>
  </div>

  <div class="footer">
    Total Body Physio Ltd · Annual Peer Review Record · ${fmtNZ(audit.date)} · Ref PR-${audit.id}
  </div>

</div>
</body></html>`;
}

// ── FENZ-style PDF for v2 fire drill records ────────────────────
// Matches the official Fire and Emergency NZ Evacuation Report form:
// blue banner header, Parts A-E in boxed sections, tick boxes in
// Yes/No/N/A columns, sign-off line with typed contact name.
function _generateFireDrillForm(audit) {
  const fd = audit.fireDrillData || {};
  const ev = fd.evacuation || {};
  const ct = fd.contact || {};
  const answers = fd.answers || {};
  const details = fd.details || {};
  const ref = `FD-${audit.id}`;
  const dateFormatted = fmtNZLong(audit.date);
  const concerns = audit.failed || 0;

  // Fire drill question text — repeated from FENZ_QUESTIONS for PDF standalone
  const fdQs = [
    {n:1, q:"Did any injuries occur during this trial evacuation?", detail:"If yes, detail the injuries that occurred during the trial evacuation", yesIsGood:false},
    {n:2, q:"Was the evacuation alarm/method of alerting occupants clearly heard in all areas of the building?", detail:"If no, detail issue and action taken to remedy it", yesIsGood:true},
    {n:3, q:"Were all exit ways clear?", detail:"If no, detail issue and action taken to remedy it", yesIsGood:true},
    {n:4, q:"Were 'FIRE ACTION NOTICES' in place?", detail:"If no, detail issue and action taken to remedy it", yesIsGood:true},
    {n:5, q:"Were systems in place to assist anyone who could not self-evacuate and if so, did the systems function?", detail:"If no, detail issue and action taken to remedy it", yesIsGood:true},
    {n:6, q:"Did any equipment to assist with the evacuation work as intended?", detail:"If no, detail issue and action taken to remedy it", yesIsGood:true},
    {n:7, q:"Occupants accounted for or building determined to be clear in accordance with the evacuation scheme?", detail:"If no, detail issue and action taken to remedy it", yesIsGood:true},
  ];

  // Render a Yes/No/N/A tick cell — filled if answered, empty square if not
  const tick = (marked) => marked
    ? `<span style="font-family:'Courier New',monospace;font-size:12pt;color:#1F3A5F;font-weight:700">[✓]</span>`
    : `<span style="font-family:'Courier New',monospace;font-size:12pt;color:#666">[&nbsp;&nbsp;]</span>`;

  const questionRows = fdQs.map(q => {
    const a = answers[q.n];
    const showDetail = a === (q.yesIsGood ? "no" : "yes");
    const detailText = showDetail && details[q.n] ? details[q.n] : "";
    return `
      <tr>
        <td style="width:42px;vertical-align:top;padding:10px 8px;font-weight:700;font-size:11pt;text-align:center;border:1px solid #d9dde8;">${q.n}</td>
        <td style="vertical-align:top;padding:10px 12px;font-size:10.5pt;line-height:1.5;border:1px solid #d9dde8;">
          <div>${q.q}</div>
          <div style="font-style:italic;color:#666;font-size:9.5pt;margin-top:4px;">${q.detail}</div>
          ${detailText ? `<div style="background:#FFF8E6;border-left:3px solid #D4AF37;padding:6px 10px;margin-top:8px;font-size:9.5pt;color:#4a3c1a;">${detailText}</div>` : ""}
        </td>
        <td style="width:48px;text-align:center;vertical-align:middle;border:1px solid #d9dde8;">${tick(a==="yes")}</td>
        <td style="width:48px;text-align:center;vertical-align:middle;border:1px solid #d9dde8;">${tick(a==="no")}</td>
        <td style="width:48px;text-align:center;vertical-align:middle;border:1px solid #d9dde8;">${tick(a==="na")}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fire Evacuation Report ${fmtNZ(audit.date)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;}
  body{margin:0;font-family:'IBM Plex Sans','Segoe UI',sans-serif;font-size:10.5pt;color:#1a1a18;background:#fff;}
  .header{background:linear-gradient(135deg,#1F3A5F 0%,#2d4f7a 100%);color:white;padding:22px 40px;display:flex;justify-content:space-between;align-items:center;}
  .header .brand{display:flex;align-items:center;gap:18px;}
  .header .icon{background:rgba(255,255,255,0.18);padding:10px 16px;border-radius:6px;font-size:18pt;}
  .header h1{margin:0;font-size:20pt;font-weight:700;letter-spacing:-0.01em;}
  .header .sub{font-size:10pt;opacity:0.85;margin-top:2px;}
  .header .ref{text-align:right;font-size:9pt;opacity:0.85;line-height:1.7;}
  .notice{background:#EEF2F8;padding:10px 40px;font-size:9pt;color:#555;font-style:italic;border-bottom:1px solid #d9dde8;}
  .body{padding:20px 40px 30px;}
  .part-head{background:#1F3A5F;color:white;padding:8px 16px;margin:18px 0 0;display:flex;align-items:center;gap:12px;border-radius:5px 5px 0 0;}
  .part-head .label{background:rgba(255,255,255,0.2);padding:2px 10px;border-radius:3px;font-size:9.5pt;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}
  .part-head .title{font-size:11pt;font-weight:600;flex:1;}
  .part-head .subtitle{font-size:9.5pt;opacity:0.85;text-align:right;}
  .part-body{border:1px solid #d9dde8;border-top:none;border-radius:0 0 5px 5px;background:#fff;}
  .part-body table{width:100%;border-collapse:collapse;}
  .part-body td{padding:9px 14px;font-size:10.5pt;vertical-align:top;border:1px solid #d9dde8;}
  .part-body .lbl{background:#f6f8fb;width:32%;font-weight:500;color:#555;}
  .part-body .val{background:#fff;font-weight:500;color:#1a1a18;}
  .part-body .val.strong{font-weight:600;}
  .qtable{width:100%;border-collapse:collapse;margin:0;}
  .qtable thead th{background:#f0f3f8;color:#1F3A5F;padding:8px 6px;font-size:9.5pt;font-weight:600;border:1px solid #d9dde8;text-align:center;}
  .comments{background:#FEFCF3;border:1px solid #D4AF37;border-left:4px solid #D4AF37;padding:14px 18px;border-radius:0 4px 4px 0;font-size:10.5pt;margin:10px 14px;min-height:30px;line-height:1.5;}
  .signoff{background:#f6f8fb;padding:16px;margin:6px 14px 14px;border-radius:4px;border:1px solid #e0e5ee;}
  .signoff .sig-label{font-size:9.5pt;color:#555;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;}
  .signoff .sig-value{font-family:'Brush Script MT','Apple Chancery',cursive;font-size:20pt;color:#1F3A5F;line-height:1.2;border-bottom:1px solid #1F3A5F;padding-bottom:4px;min-width:260px;display:inline-block;}
  .signoff .sig-meta{font-size:9pt;color:#888;margin-top:4px;font-family:'IBM Plex Mono',monospace;}
  .followup{display:flex;align-items:center;gap:8px;margin:12px 14px;font-size:10pt;color:${fd.followUpRequested?'#c25500':'#888'};}
  .followup-box{display:inline-block;width:14px;height:14px;border:1.5px solid ${fd.followUpRequested?'#c25500':'#888'};text-align:center;line-height:11px;font-weight:700;color:#c25500;}
  .outcome{display:inline-block;padding:6px 18px;border-radius:4px;font-weight:600;font-size:10pt;letter-spacing:0.04em;background:${concerns===0?'#1F3A5F':'#c0392b'};color:white;}
  .footer{background:#f3f5f9;border-top:1px solid #d9dde8;padding:12px 40px;font-size:8pt;color:#888;display:flex;justify-content:space-between;margin-top:20px;}
</style></head><body>

<div class="header">
  <div class="brand">
    <div class="icon">🔥</div>
    <div>
      <h1>Evacuation Report</h1>
      <div class="sub">Fire and Emergency New Zealand &middot; evacuation trial record</div>
    </div>
  </div>
  <div class="ref">Ref: ${ref}<br>${audit.clinic} &middot; ${fmtNZ(audit.date)}</div>
</div>

<div class="notice">Send completed reports to the Fire Information Unit &mdash; <b>evacuation@fireandemergency.nz</b> or PO Box 68042, Wellesley Street, Auckland 1141.</div>

<div class="body">

  <!-- Part A — Building -->
  <div class="part-head">
    <span class="label">Part A</span>
    <span class="title">Building description</span>
  </div>
  <div class="part-body">
    <table>
      <tr><td class="lbl">Building name</td><td class="val strong">${fd.buildingName||'—'}</td></tr>
      <tr><td class="lbl">Address</td><td class="val">${fd.address||'—'}</td></tr>
      <tr><td class="lbl">Scheme reference</td><td class="val">${fd.schemeRef||'—'}</td></tr>
    </table>
  </div>

  <!-- Part B — Contact -->
  <div class="part-head">
    <span class="label">Part B</span>
    <span class="title">Contact person details</span>
  </div>
  <div class="part-body">
    <table>
      <tr><td class="lbl">Contact person's name</td><td class="val strong">${ct.name||'—'}</td></tr>
      <tr><td class="lbl">Phone / mobile</td><td class="val">${ct.phone||'—'}</td></tr>
      <tr><td class="lbl">Email address</td><td class="val">${ct.email||'—'}</td></tr>
    </table>
  </div>

  <!-- Part C — Evacuation details -->
  <div class="part-head">
    <span class="label">Part C</span>
    <span class="title">Evacuation details</span>
  </div>
  <div class="part-body">
    <table>
      <tr>
        <td class="lbl">Date of evacuation</td>
        <td class="val strong" style="width:26%">${dateFormatted}</td>
        <td class="lbl" style="width:16%">Time of evacuation</td>
        <td class="val strong">${ev.time||'—'}</td>
      </tr>
      <tr>
        <td class="lbl">Time taken to evacuate</td>
        <td class="val strong" colspan="3">${ev.minutes||'0'} minutes &middot; ${ev.seconds||'0'} seconds</td>
      </tr>
    </table>
  </div>

  <!-- Part D — Assessment outcomes -->
  <div class="part-head">
    <span class="label">Part D</span>
    <span class="title">Assessment outcomes</span>
  </div>
  <div class="part-body">
    <table class="qtable">
      <thead>
        <tr>
          <th style="width:42px">#</th>
          <th style="text-align:left;padding-left:12px">Question</th>
          <th style="width:48px">Yes</th>
          <th style="width:48px">No</th>
          <th style="width:48px">N/A</th>
        </tr>
      </thead>
      <tbody>
        ${questionRows}
        <tr>
          <td style="padding:10px 8px;font-weight:700;font-size:11pt;text-align:center;border:1px solid #d9dde8;">8</td>
          <td colspan="4" style="padding:10px 12px;border:1px solid #d9dde8;font-size:10.5pt;">
            When was the last training session for permanent occupants held?
            <span style="margin-left:20px;font-weight:600;color:#1F3A5F;">${fd.lastTrainingDate?fmtNZ(fd.lastTrainingDate):'Not recorded'}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Part E — Additional comments + sign-off -->
  <div class="part-head">
    <span class="label">Part E</span>
    <span class="title">Additional comments</span>
    <span class="subtitle">Outcome: <span class="outcome">${concerns===0?'✓ All clear':`⚠ ${concerns} issue${concerns>1?'s':''}`}</span></span>
  </div>
  <div class="part-body" style="padding-bottom:1px;">
    <div class="comments">${fd.additionalComments || 'No additional comments recorded.'}</div>
    <div class="followup">
      <span class="followup-box">${fd.followUpRequested?'✓':''}</span>
      <span>${fd.followUpRequested ? 'Follow-up requested — contact person wishes to speak about this trial.' : 'Follow-up not requested.'}</span>
    </div>
    <div class="signoff">
      <div class="sig-label">Contact person signature</div>
      ${audit.signature
        ? `<div style="border-bottom:1px solid #1F3A5F;padding-bottom:4px;min-width:260px;display:inline-block;"><img src="${audit.signature}" alt="signature" style="max-height:56px;max-width:300px;display:block;"/></div>
           <div style="font-size:9pt;color:#888;margin-top:4px;font-family:'IBM Plex Mono',monospace;">${audit.signedBy||audit.auditor||ct.name||''} &middot; signed ${audit.signedAt?fmtNZ(audit.signedAt.slice(0,10)):fmtNZ(audit.date)}</div>`
        : `<div class="sig-value">${audit.auditor||ct.name||''}</div>`
      }
      <div class="sig-meta">${fmtNZ(audit.date)} &middot; Ref ${ref}</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>Total Body Physio Ltd &middot; Fire Evacuation Report</span>
  <span>${fmtNZ(audit.date)} &middot; ${audit.clinic} &middot; Ref: ${ref}</span>
</div>

</body></html>`;
}

// ── NZP-style clinical notes audit PDF for v2 grid records ──────
// Matches the 15-criterion × 10-record grid template with per-row
// totals and %Complies column, plus a "To work on" block at the
// bottom. Green TBP branding.
function _generateNotesAuditForm(audit) {
  const nd = audit.notesAuditData || {};
  const grid = nd.grid || {};
  const ref = `CN-${audit.id}`;
  const dateFormatted = fmtNZLong(audit.date);

  // Build the 16 criteria grouped by section
  const criteria = [
    { section:"Notes can be clearly understood",       text:"Logical, intelligible and sequential" },
    { section:"Notes can be clearly understood",       text:"Patient is identified on each page" },
    { section:"Consent",                                text:"Evidence that assessment and treatment has been explained and accepted by the patient" },
    { section:"Consent",                                text:"Further consent with significant change in treatment" },
    { section:"Assessment",                             text:"Patient history" },
    { section:"Assessment",                             text:"Subjective examination" },
    { section:"Assessment",                             text:"Objective examination" },
    { section:"Assessment",                             text:"Related test findings" },
    { section:"Assessment",                             text:"Analysis / conclusion" },
    { section:"Goals of treatment",                     text:"Identified" },
    { section:"Goals of treatment",                     text:"Measurable" },
    { section:"Goals of treatment",                     text:"Time bound" },
    { section:"Treatment plan",                         text:"Record of initial treatment plan" },
    { section:"Changes in plan",                        text:"Recorded" },
    { section:"Notation of each treatment given",       text:"Treatment given recorded" },
    { section:"Evidence of review",                     text:"Entry of review each time a patient attends for treatment" },
  ];

  function rowStats(row){
    let currentPass=0, currentDone=0, pastPass=0, pastDone=0;
    for(let col=0; col<10; col++){
      const v = grid[`${row}-${col}`];
      const isCurrent = col < 5;
      if(v === "pass"){ if(isCurrent) currentPass++; else pastPass++; }
      if(v === "pass" || v === "fail"){ if(isCurrent) currentDone++; else pastDone++; }
    }
    const denom = currentDone + pastDone;
    const numer = currentPass + pastPass;
    return { currentPass, pastPass, pct: denom === 0 ? null : Math.round((numer / denom) * 100) };
  }

  const cellMark = (v) => {
    if(v === "pass") return `<span style="color:#1a6e1a;font-weight:700;font-size:12pt;">✓</span>`;
    if(v === "fail") return `<span style="color:#c0392b;font-weight:700;font-size:12pt;">✗</span>`;
    if(v === "na")   return `<span style="color:#888;font-size:8.5pt;font-weight:600;">N/A</span>`;
    return `<span style="color:#ddd;">·</span>`;
  };

  // Render rows grouped by section
  let tbodyRows = "";
  let lastSection = null;
  criteria.forEach((c, row) => {
    if(c.section !== lastSection){
      tbodyRows += `<tr><td colspan="13" style="background:#eef5f1;color:#1a3c34;font-weight:700;font-size:9.5pt;padding:6px 10px;text-transform:uppercase;letter-spacing:.5px;">${c.section}</td></tr>`;
      lastSection = c.section;
    }
    const s = rowStats(row);
    const pctText = s.pct === null ? "—" : `${s.pct}%`;
    const pctBg = s.pct === null ? "#f5f5f0" : s.pct === 100 ? "#EAF3DE" : s.pct >= 80 ? "#FAEEDA" : "#FCEBEB";
    const pctColor = s.pct === null ? "#888" : s.pct === 100 ? "#0F6E56" : s.pct >= 80 ? "#BA7517" : "#c0392b";
    let cells = "";
    for(let col=0; col<10; col++){
      const v = grid[`${row}-${col}`] || "";
      const borderLeft = col === 5 ? "border-left:2px solid #a8c4b6;" : "border-left:1px solid #d6e8e0;";
      cells += `<td style="padding:5px 2px;text-align:center;${borderLeft}width:7%;">${cellMark(v)}</td>`;
    }
    tbodyRows += `<tr>
      <td style="padding:7px 10px;font-size:10pt;color:#1a2a24;border:1px solid #c8ddd5;">${c.text}</td>
      ${cells}
      <td style="padding:5px 6px;text-align:center;font-weight:700;font-size:10pt;color:${pctColor};background:${pctBg};border-left:2px solid #c8ddd5;">${pctText}</td>
    </tr>`;
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Clinical Notes Audit — ${audit.physioAudited||''} — ${fmtNZ(audit.date)}</title>
<style>
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10.5pt;color:#1a2a24;background:#fff;line-height:1.5;}
  .page{padding:28px 36px;}
  .header{background:linear-gradient(145deg,#1a3c34 0%,#2a5c4e 100%);color:white;padding:22px 28px;margin:-28px -36px 18px;display:flex;align-items:center;justify-content:space-between;}
  .header .brand{display:flex;align-items:center;gap:14px;}
  .header .logo{width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14pt;}
  .header h1{margin:4px 0 0;font-size:18pt;font-weight:700;letter-spacing:-0.01em;}
  .header .sub{font-size:9.5pt;opacity:0.8;letter-spacing:0.4pt;text-transform:uppercase;margin-top:2px;}
  .header .ref{text-align:right;font-size:9pt;opacity:0.85;line-height:1.7;}
  .tag{font-size:11pt;opacity:0.85;margin-top:4px;font-style:italic;}
  .meta{background:#eef5f1;padding:14px 20px;border-bottom:1px solid #c8ddd5;margin:0 -36px 14px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px 22px;}
  .meta-field .label{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#2a5c4e;}
  .meta-field .value{font-size:10.5pt;color:#1a2a24;border-bottom:1px solid #c8ddd5;padding:2px 0;}
  .key-strip{padding:8px 0;font-size:10pt;color:#3d5a50;display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
  .key-strip strong{color:#1a3c34;text-transform:uppercase;letter-spacing:.5px;font-size:9pt;}
  .key-strip .k{background:#eef5f1;padding:2px 9px;border-radius:12px;}
  table.grid{width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed;}
  table.grid th{background:#1a3c34;color:#fff;padding:6px 4px;font-weight:600;font-size:9.5pt;border:1px solid #0f2b24;text-align:center;}
  table.grid th.crit-col{text-align:left;padding-left:10px;width:38%;}
  table.grid th.group-head{background:#2a5c4e;font-size:9pt;letter-spacing:.3px;}
  table.grid th.pct{background:#7ab648;color:#0f2b1e;width:7%;}
  .workon{background:#fff;border:1px solid #c8ddd5;border-radius:8px;padding:14px 18px;margin:14px 0;}
  .workon .label{font-size:10pt;font-weight:700;color:#2a5c4e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
  .workon .text{font-size:10.5pt;color:#1a2a24;white-space:pre-line;line-height:1.6;min-height:60px;}
  .signoff{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:22px;padding-top:14px;border-top:1px solid #c8ddd5;}
  .sig-block .label{font-size:9pt;font-weight:700;color:#2a5c4e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
  .sig-block .value{font-family:'Brush Script MT','Apple Chancery',cursive;font-size:20pt;color:#1a3c34;line-height:1.1;border-bottom:1.5px solid #1a2a24;padding-bottom:4px;min-width:200px;display:inline-block;}
  .sig-block .date{font-size:9pt;color:#888;margin-top:3px;font-style:italic;}
  .footer{margin-top:20px;padding:10px 0;background:#1a3c34;color:rgba(255,255,255,0.75);font-size:9pt;text-align:center;letter-spacing:.3px;margin:20px -36px -28px;padding:10px 36px;}
  .footer-bar{height:3px;background:linear-gradient(90deg,#2a9d5c,#7ab648);margin:0 -36px;}
</style></head><body>

<div class="page">
  <div class="header">
    <div class="brand">
      <div class="logo">TBP</div>
      <div>
        <div style="font-size:11pt;opacity:0.85;letter-spacing:.3px;">Total Body Physio Limited</div>
        <h1>Clinical Record Audit Form</h1>
        <div class="tag">Five current records · five past records · NZP-aligned structure</div>
      </div>
    </div>
    <div class="ref">Ref: ${ref}<br>${fmtNZ(audit.date)}</div>
  </div>

  <div class="meta">
    <div class="meta-field"><div class="label">Physiotherapist</div><div class="value">${audit.physioAudited||'—'}</div></div>
    <div class="meta-field"><div class="label">Auditor</div><div class="value">${audit.auditor||'—'}</div></div>
    <div class="meta-field"><div class="label">Clinic</div><div class="value">${audit.clinic||'—'}</div></div>
    <div class="meta-field"><div class="label">Date</div><div class="value">${dateFormatted}</div></div>
  </div>

  <div class="key-strip">
    <strong>Key</strong>
    <span class="k"><b style="color:#1a6e1a;">✓</b> present</span>
    <span class="k"><b style="color:#c0392b;">✗</b> not present or inadequate</span>
    <span class="k"><b>N/A</b> not applicable</span>
  </div>

  <table class="grid">
    <thead>
      <tr>
        <th rowspan="2" class="crit-col">Criterion</th>
        <th colspan="5" class="group-head">Current records</th>
        <th colspan="5" class="group-head">Past records</th>
        <th rowspan="2" class="pct">% Complies</th>
      </tr>
      <tr>
        <th style="width:6%;">C1</th><th style="width:6%;">C2</th><th style="width:6%;">C3</th><th style="width:6%;">C4</th><th style="width:6%;">C5</th>
        <th style="width:6%;">P1</th><th style="width:6%;">P2</th><th style="width:6%;">P3</th><th style="width:6%;">P4</th><th style="width:6%;">P5</th>
      </tr>
    </thead>
    <tbody>
      ${tbodyRows}
    </tbody>
  </table>

  <div class="workon">
    <div class="label">To work on &mdash; specific actions, feedback, examples</div>
    <div class="text">${nd.workOn || 'No specific actions recorded.'}</div>
  </div>

  <div class="signoff">
    <div class="sig-block">
      <div class="label">Auditor signature</div>
      ${audit.signature
        ? `<div style="border-bottom:1.5px solid #1a2a24;padding-bottom:4px;min-width:200px;display:inline-block;"><img src="${audit.signature}" alt="signature" style="max-height:52px;max-width:260px;display:block;"/></div>
           <div class="date" style="font-family:'IBM Plex Mono',monospace;">${audit.signedBy||audit.auditor||''} · ${dateFormatted}</div>`
        : `<div class="value">${audit.auditor||''}</div>
           <div class="date">${dateFormatted}</div>`
      }
    </div>
    <div class="sig-block">
      <div class="label">Physio signature (acknowledged)</div>
      <div class="value"></div>
      <div class="date">To be signed on review</div>
    </div>
  </div>

  <div class="footer">Total Body Physio Limited · Clinical Record Audit Form · ${fmtNZ(audit.date)} · Ref: ${ref}</div>
  <div class="footer-bar"></div>

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

  // v2 fire drills use the FENZ Evacuation Report template —
  // pre-v2 fire drill records still fall through to the generic era-based layout.
  if (audit.type === 'fire_drill' && audit.formVersion === 'v2' && audit.fireDrillData) {
    return _generateFireDrillForm(audit);
  }

  // v2 clinical notes audits use the 15x10 grid template.
  if (audit.type === 'clinical_notes' && audit.formVersion === 'v2' && audit.notesAuditData) {
    return _generateNotesAuditForm(audit);
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
<tr><th>Auditor</th><td>${audit.signature
  ? `<img src="${audit.signature}" alt="signature" style="max-height:42px;max-width:260px;display:inline-block;vertical-align:middle;"/>&nbsp;&nbsp;&nbsp;<span style="font-size:9.5pt;color:#666">${audit.signedBy||audit.auditor} · ${fmtNZ(audit.date)}</span>`
  : `<span class="sig-auditor">${audit.auditor}</span>&nbsp;&nbsp;&nbsp;Date: ${fmtNZ(audit.date)}`
}</td></tr>
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
  ${audit.signature
    ? `<div class="attestation" style="padding:10px 16px;">
         <div style="margin-bottom:4px;"><img src="${audit.signature}" alt="signature" style="max-height:56px;max-width:260px;display:block;"/></div>
         <span class="label">✓ HANDWRITTEN SIGNATURE</span><br>
         <span class="name">${audit.signedBy||audit.auditor}</span><br>
         <span class="ref">${fmtNZ(audit.date)} · Ref A-${audit.id}</span>
       </div>`
    : `<div class="attestation">
         <span class="label">✓ DIGITALLY SIGNED</span><br>
         <span class="name">${audit.auditor}</span><br>
         <span class="ref">${fmtNZ(audit.date)} · Ref A-${audit.id}</span>
       </div>`
  }
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
        // Match to an audit record — ONLY link if no evidence is currently set.
        // Previous condition ("relink if evidence.driveId differs") was destructive:
        // it happily overwrote a freshly-uploaded FENZ PDF with whatever HTML template
        // happened to still be sitting in the audit folder from an earlier regen.
        // If an audit has a driveId, leave it alone — the user (or a bulk uploader)
        // put it there deliberately. Broken links can be fixed by re-uploading.
        const match = updatedAudits.find(a => a.date === fileDate && file.name.includes(a.type) &&
          !a.evidence?.driveId);
        if (match) {
          match.evidence = { driveId: file.id, driveUrl: file.webViewLink,
            blobUrl:`https://drive.google.com/uc?export=view&id=${file.id}`,
            fileName: file.name, fileType:'text/html' };
          _log(`[Relink] Linked HTML form to ${match.type} ${match.date} ${match.clinic}`);
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
        // Only link if no attachment exists — never overwrite deliberate uploads.
        const match = updatedMeetings.find(m => m.date === fileDate &&
          !m.attachment?.driveId);
        if (match) {
          match.attachment = { driveId: file.id, driveUrl: file.webViewLink,
            blobUrl:`https://drive.google.com/uc?export=view&id=${file.id}`,
            fileName: file.name, fileType:'text/html',
            uploadedDate: fileDate, id: Date.now() };
          _log(`[Relink] Linked HTML minutes to ${match.date} ${match.clinic}`);
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

// Immediate version — bypasses debounce and awaits Drive save so callers know it persisted.
// Returns {ok: true} on success, {ok: false, error: '...'} on failure.
async function saveGenImmediate(k, d) {
  if (_portalReady) {
    _portalStore.data[k] = d;
    clearTimeout(_saveTimer);
    try {
      await _saveDriveState();
      return { ok: true };
    } catch (e) {
      _warn('[saveGenImmediate] Drive save failed', e);
      return { ok: false, error: e.message || String(e) };
    }
  }
  try { localStorage.setItem(k, JSON.stringify(d)); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
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
  // Review certs (peer review, appraisal) — ignore stale OCR expiry,
  // check audit records as well as direct uploads
  if (key === "peerreview" || key === "appraisal") {
    const f = loadFile(id, key);
    if (f) return "ok";
    const name = STAFF[id]?.name || "";
    const auditList = _portalStore.data["audits"] || [];
    const auditType = key === "peerreview" ? "peer_review" : "appraisal";
    const found = auditList.some(a => a.type === auditType && a.physioAudited === name && a.evidence);
    if (found) return "ok";
    return cert?.required ? "pending" : "na";
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

function getReminders(audits, meetings, inservicesData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = [];

  // Fall back to module-level store if caller didn't pass state (defensive)
  audits         = audits         || (_portalStore.data && _portalStore.data.audits)     || [];
  meetings       = meetings       || (_portalStore.data && _portalStore.data.meetings)   || [];
  inservicesData = inservicesData || (_portalStore.data && _portalStore.data.inservices) || [];

  function latest(records, predicate) {
    let best = null;
    for (const r of records) {
      if (!r || !r.date || !predicate(r)) continue;
      const d = new Date(r.date);
      if (isNaN(d)) continue;
      if (!best || d > best) best = d;
    }
    return best;
  }

  REMINDER_SCHEDULE.forEach(r => {
    const targets = r.applies === "Per clinic"
      ? CLINICS.filter(c => !c.isSchool).map(c => c.short)
      : ["All staff"];

    targets.forEach(target => {
      let lastDate = null;

      // Find most recent completion for this reminder type + target
      if (r.auditKey) {
        // Audit-based task (fire_drill, hygiene, hs_audit, equipment, clinical_notes, peer_review)
        lastDate = latest(audits, a =>
          a.type === r.auditKey
          && (target === "All staff" || a.clinic === target)
        );
      } else if (r.key === "staff_meeting") {
        // Most recent staff meeting (matches Q1/Q2 etc. in topic)
        lastDate = latest(meetings, m =>
          /\bstaff meeting\b/i.test(m.topic || "")
        );
      } else if (r.key === "inservice") {
        // In-service — separate inservices array
        lastDate = latest(inservicesData, i =>
          (target === "All staff" || i.clinic === target)
        );
      }

      // Compute next due date
      let next;
      if (lastDate) {
        next = new Date(lastDate);
        next.setDate(next.getDate() + r.freqDays);
      } else {
        // Fallback for renewals/certs with no completion record — use fixed calendar
        next = new Date(today.getFullYear(), r.month - 1, r.day);
        if (next < today) next.setFullYear(today.getFullYear() + 1);
      }

      const days = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      const status = days < 0 ? "overdue" : days <= 30 ? "due" : "ok";

      items.push({
        ...r,
        nextDate: next.toLocaleDateString("en-NZ"),
        lastDone: lastDate ? lastDate.toLocaleDateString("en-NZ") : null,
        days,
        status,
        target,
      });
    });
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
  // For peerreview / appraisal / clinicalnotes: fall back to the most recent matching audit record's evidence
  let auditEvidenceFile = null;
  let auditEvidenceDate = null;
  if (!file && (cert.key === "peerreview" || cert.key === "appraisal" || cert.key === "clinicalnotes")) {
    const staffName = STAFF[staffId]?.name || "";
    const auditType = cert.key === "peerreview" ? "peer_review"
                     : cert.key === "appraisal" ? "appraisal"
                     : "clinical_notes";
    const auditList = _portalStore.data?.audits || [];
    const matches = auditList
      .filter(a => a.type === auditType && a.physioAudited === staffName && a.evidence)
      .sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    if (matches.length) {
      const top = matches[0];
      auditEvidenceFile = { ...top.evidence, _fromAudit: true, _auditId: top.id, _auditDate: top.date };
      auditEvidenceDate = top.date;
    }
  }
  const effectiveFile = file || docJdFile || auditEvidenceFile;
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
        // Skip expiry detection for review-type certs (peer review, appraisal):
        // these don't carry an expiry date — they just renew annually.
        // Scanning dates on the doc (e.g. review period or signature date) caused
        // false "Expired" statuses.
        if (_REVIEW_CERTS.has(cert.key)) return;
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
  // Review certs (peer review, appraisal) don't have true expiry dates — ignore any
  // stale expiry data that may have been captured by the OCR from prior uploads.
  const isReviewCert = _REVIEW_CERTS.has(cert.key);
  const certExpiry = isReviewCert ? null : (effectiveFile?.expiry||expiryData?.expiry||null);
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
  const isAuditFallback=!file&&!docJdFile&&!!auditEvidenceFile;
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
          {effectiveFile&&<div style={{fontSize:11,color:C.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{effectiveFile.fileName} · {isAuditFallback?`audit ${fmtNZ(auditEvidenceDate)}`:effectiveFile.uploadedDate}{isDocsFallback?" · via Documents tab":""}{isAuditFallback?" · via audit record":""}</div>}
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
          <BSm onClick={()=>onView(_resolveAuditEvidence(audit))} color={C.teal}>📎 View</BSm>
          <BSm onClick={()=>ref.current.click()} color={C.gray} style={{opacity:uploading?0.5:1}}>{uploading?"⏳":"↑ Replace"}</BSm>
        </>
        :<BSm onClick={()=>ref.current.click()} color={C.blue} style={{opacity:uploading?0.5:1}}>{uploading?"⏳ Uploading…":"📎 Upload evidence"}</BSm>
      }
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </>
  );
}

// Returns evidence unchanged for now — kept as a hook for future transformations.
function _resolveAuditEvidence(audit){
  return audit?.evidence || null;
}

// Bulk evidence uploader for peer reviews + clinical notes audits.
// Staged-files workflow: user picks multiple PDFs, each gets a dropdown to
// assign to a record, then a single "Upload" commits them all.


function BulkEvidenceUploader({audits,setAudits}){
  const[bulkOpen,setBulkOpen]=useState(false);
  const[bulkType,setBulkType]=useState("peer_review");
  const[uploadStatus,setUploadStatus]=useState("");
  const[stagedFiles,setStagedFiles]=useState([]);
  const bulkRef=useRef();
  const reviewsAndAudits=audits.filter(a=>(a.type==="peer_review"||a.type==="clinical_notes"||a.type==="fire_drill")&&a.id<100000);
  const withEvidence=reviewsAndAudits.filter(a=>a.evidence).length;
  const needEvidence=reviewsAndAudits.length-withEvidence;
  const peerNeed=audits.filter(a=>a.type==="peer_review"&&a.id<100000&&!a.evidence).length;
  const notesNeed=audits.filter(a=>a.type==="clinical_notes"&&a.id<100000&&!a.evidence).length;
  const fireNeed=audits.filter(a=>a.type==="fire_drill"&&a.id<100000&&!a.evidence).length;
  const candidates=audits.filter(a=>a.type===bulkType&&a.id<100000&&!a.evidence).sort((a,b)=>a.date.localeCompare(b.date));

  const staffPatterns=[
    {name:"Jade Warren",     patterns:[/jade/i,/warren/i]},
    {name:"Alistair Burgess",patterns:[/alistair/i,/burgess/i]},
    {name:"Hans Vermeulen",  patterns:[/hans/i,/vermeulen/i]},
    {name:"Timothy Keung",   patterns:[/\btim\b/i,/timothy/i,/keung/i]},
    {name:"Dylan Connolly",  patterns:[/dylan/i,/connolly/i]},
    {name:"Isabella Yang",   patterns:[/isabella/i,/yang/i]},
  ];
  function guessFromFilename(name,pool,type){
    const lower=name.toLowerCase();
    // Fire drills: match by exact date and clinic (e.g. "fire_drill_5001_2023-06-15_Pakuranga.pdf")
    if(type==="fire_drill"){
      const dm=name.match(/(\d{4})-(\d{2})-(\d{2})/);
      const exactDate=dm?`${dm[1]}-${dm[2]}-${dm[3]}`:null;
      const clinicMap=[
        {name:"Pakuranga",re:/pakuranga/i},
        {name:"Flat Bush",re:/flat[\s_-]?bush/i},
        {name:"Titirangi",re:/titirangi/i},
        {name:"Panmure",re:/panmure/i},
      ];
      let fdClinic=null;
      for(const c of clinicMap){if(c.re.test(lower)){fdClinic=c.name;break;}}
      let best=null,bestScore=-1;
      for(const c of pool){
        let s=0;
        if(exactDate&&c.date===exactDate)s+=100;
        if(fdClinic&&(c.clinic||"").toLowerCase()===fdClinic.toLowerCase())s+=50;
        if(s>bestScore){bestScore=s;best=c;}
      }
      return bestScore>=100?best?.id:null;
    }
    // Peer reviews / clinical notes: match by staff name + year/month
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
      targetId:guessFromFilename(f.name,pool,bulkType)||"",
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
        setUploadStatus(`⏳ ${attached}/${toUpload.length}: ${target.type==="fire_drill"?`${target.clinic} ${fmtNZ(target.date)}`:`${target.physioAudited||""} ${fmtNZ(target.date)}`}…`);
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
          <div style={{fontSize:13,fontWeight:600,color:C.blue}}>📎 Upload evidence — peer reviews, notes audits & fire drills</div>
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
          <button onClick={()=>{setBulkType("fire_drill");setStagedFiles([]);}} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:`1px solid ${bulkType==="fire_drill"?C.blue:C.border}`,background:bulkType==="fire_drill"?C.blue:"white",color:bulkType==="fire_drill"?"white":C.text,cursor:"pointer",fontWeight:500}}>🔥 Fire drills ({fireNeed} need)</button>
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
                          {c.type==="fire_drill"?`${c.clinic} · ${fmtNZ(c.date)}`:`${c.physioAudited||"?"} · ${fmtNZ(c.date)} · ${c.clinic}`}{usedIds.includes(c.id)?" (used)":""}
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
// ── FENZ-shaped read-only view for v2 fire drill records ────────────────
function FireDrillViewModal({audit,onClose}){
  const fd = audit.fireDrillData || {};
  const ev = fd.evacuation || {};
  const ct = fd.contact || {};
  const answers = fd.answers || {};
  const details = fd.details || {};
  const answerDisplay = (v) => v==="yes"?{label:"Yes",color:"#3B6D11",bg:"#EAF3DE"}
                              : v==="no"?{label:"No",color:C.red,bg:"#FCEBEB"}
                              : v==="na"?{label:"N/A",color:C.gray,bg:C.grayL}
                              : {label:"—",color:C.hint,bg:"transparent"};
  const concerns = (audit.failed || 0);
  const row = (label, value) => (
    <div style={{display:"flex",borderBottom:`1px solid ${C.grayL}`,padding:"7px 0",fontSize:12}}>
      <div style={{minWidth:180,color:C.muted,fontWeight:500}}>{label}</div>
      <div style={{flex:1,color:C.text}}>{value || <span style={{color:C.hint,fontStyle:"italic"}}>Not recorded</span>}</div>
    </div>
  );
  const sectionHead = (letter,title) => (
    <div style={{background:"#1F3A5F",color:"white",padding:"7px 12px",fontWeight:700,fontSize:12,marginTop:"1rem",marginBottom:0,borderRadius:"5px 5px 0 0",display:"flex",alignItems:"center",gap:8}}>
      <span style={{background:"rgba(255,255,255,.2)",padding:"1px 7px",borderRadius:3,fontSize:10,letterSpacing:".5px"}}>Part {letter}</span>
      <span>{title}</span>
    </div>
  );
  const sectionBody = (children) => <div style={{background:"white",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 5px 5px",padding:"0.75rem 1rem"}}>{children}</div>;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:760,marginBottom:"2rem",overflow:"hidden"}}>
        <div style={{background:concerns===0?"linear-gradient(135deg,#1F3A5F 0%,#2d4f7a 100%)":C.red,padding:"1.25rem 1.5rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:16,fontWeight:600}}>🔥 {audit.title}</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>📅 {fmtNZ(audit.date)}{ev.time?` · ⏰ ${ev.time}`:""}</span>
              <span>📍 {audit.clinic}</span>
              <span>👤 {audit.auditor}</span>
              {audit.duration && <span>⏱ {audit.duration}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
              <div style={{color:"white",fontSize:16,fontWeight:700}}>{audit.outcome}</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>FENZ format</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15,flexShrink:0}}>✕</button>
          </div>
        </div>

        <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>

          {sectionHead("A","Building description")}
          {sectionBody(<>
            {row("Building name", fd.buildingName)}
            {row("Address", fd.address)}
            {row("Scheme reference", fd.schemeRef)}
          </>)}

          {sectionHead("B","Contact person details")}
          {sectionBody(<>
            {row("Contact name", ct.name)}
            {row("Phone / mobile", ct.phone)}
            {row("Email address", ct.email)}
          </>)}

          {sectionHead("C","Evacuation details")}
          {sectionBody(<>
            {row("Date of evacuation", fmtNZ(ev.date || audit.date))}
            {row("Time of evacuation", ev.time)}
            {row("Time taken", (ev.minutes || ev.seconds) ? `${ev.minutes||0} minutes ${ev.seconds||0} seconds` : "")}
          </>)}

          {sectionHead("D","Assessment outcomes")}
          {sectionBody(<>
            {FENZ_QUESTIONS.map(q=>{
              const a = answers[q.n];
              const d = answerDisplay(a);
              const showDetail = a === (q.yesIsGood ? "no" : "yes");
              return (
                <div key={q.n} style={{padding:"8px 0",borderBottom:`1px solid ${C.grayL}`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.teal,minWidth:22,marginTop:1}}>{q.n}.</span>
                    <span style={{flex:1,fontSize:12,lineHeight:1.45,color:C.text}}>{q.q}</span>
                    <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",background:d.bg,color:d.color,borderRadius:4,minWidth:44,textAlign:"center",flexShrink:0}}>{d.label}</span>
                  </div>
                  {showDetail && details[q.n] && (
                    <div style={{marginTop:6,marginLeft:32,fontSize:11,color:C.red,fontStyle:"italic",background:"#FAEEDA",padding:"5px 9px",borderRadius:4,borderLeft:`2px solid ${C.amber}`}}>↳ {details[q.n]}</div>
                  )}
                </div>
              );
            })}
            {fd.lastTrainingDate && (
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",marginTop:4}}>
                <span style={{fontSize:12,fontWeight:600,color:C.teal,minWidth:22}}>8.</span>
                <span style={{flex:1,fontSize:12,color:C.text}}>Last training session for permanent occupants</span>
                <span style={{fontSize:11,color:C.text,fontWeight:500}}>{fmtNZ(fd.lastTrainingDate)}</span>
              </div>
            )}
          </>)}

          {(fd.additionalComments || fd.followUpRequested) && <>
            {sectionHead("E","Additional comments")}
            {sectionBody(<>
              {fd.additionalComments && <div style={{fontSize:12,color:C.text,whiteSpace:"pre-line",lineHeight:1.5,marginBottom:fd.followUpRequested?"0.5rem":0}}>{fd.additionalComments}</div>}
              {fd.followUpRequested && <div style={{fontSize:12,color:C.amber,fontWeight:600,marginTop:"0.5rem"}}>⚑ Follow-up requested — contact person wants to speak about this trial</div>}
            </>)}
          </>}

          {/* Sign-off — shows actual signature image when present */}
          <div style={{marginTop:"1.25rem",padding:"1rem",background:"#f6f8fb",border:`1px solid #e0e5ee`,borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1F3A5F",textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Contact person signature</div>
            {audit.signature
              ? <>
                  <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:10,display:"inline-block",maxWidth:"100%"}}>
                    <img src={audit.signature} alt="signature" style={{maxHeight:60,maxWidth:260,display:"block"}}/>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:5,fontFamily:"monospace"}}>{audit.signedBy||audit.auditor} · signed {audit.signedAt?fmtNZ(audit.signedAt.slice(0,10)):fmtNZ(audit.date)}</div>
                </>
              : <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>Signature not recorded — pre-signature system. Signed by: <b style={{color:C.text,fontStyle:"normal"}}>{audit.auditor||ct.name||"—"}</b></div>
            }
          </div>

        </div>
      </div>
    </div>
  );
}

function AuditViewModal({audit,onClose}){
  if(!audit)return null;
  // ── v2 fire drill records render in FENZ shape ────────────────────
  if(audit.type === "fire_drill" && audit.formVersion === "v2" && audit.fireDrillData){
    return <FireDrillViewModal audit={audit} onClose={onClose}/>;
  }
  // ── v2 peer review records render in PBNZ shape ──────────────────
  if(audit.type === "peer_review" && audit.formVersion === "v2" && audit.peerReviewData){
    return <PeerReviewViewModal audit={audit} onClose={onClose}/>;
  }
  // ── v2 clinical notes audits render as a 15x10 grid ──────────────
  if(audit.type === "clinical_notes" && audit.formVersion === "v2" && audit.notesAuditData){
    return <NotesAuditGridViewModal audit={audit} onClose={onClose}/>;
  }
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
          {/* Sign-off — shows actual signature image when present */}
          <div style={{marginTop:"1rem",padding:"0.875rem",background:"#f6f8fb",border:`1px solid #e0e5ee`,borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:700,color:C.teal,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Auditor signature</div>
            {audit.signature
              ? <>
                  <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:8,display:"inline-block",maxWidth:"100%"}}>
                    <img src={audit.signature} alt="signature" style={{maxHeight:56,maxWidth:240,display:"block"}}/>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:5,fontFamily:"monospace"}}>{audit.signedBy||audit.auditor} · signed {audit.signedAt?fmtNZ(audit.signedAt.slice(0,10)):fmtNZ(audit.date)}</div>
                </>
              : <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>Signature not recorded — pre-signature system. Signed by: <b style={{color:C.text,fontStyle:"normal"}}>{audit.auditor||"—"}</b></div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Clinical Notes Audit — 16-criteria NZP structure ─────────────
// Each criterion is ticked across 10 records (5 current + 5 past)
// producing a 16 × 10 grid. Per-row totals + %Complies auto-calculated.
const NOTES_AUDIT_CRITERIA = [
  { section:"Notes can be clearly understood",       text:"Logical, intelligible and sequential" },
  { section:"Notes can be clearly understood",       text:"Patient is identified on each page" },
  { section:"Consent",                                text:"Evidence that assessment and treatment has been explained and accepted by the patient" },
  { section:"Consent",                                text:"Further consent with significant change in treatment" },
  { section:"Assessment",                             text:"Patient history" },
  { section:"Assessment",                             text:"Subjective examination" },
  { section:"Assessment",                             text:"Objective examination" },
  { section:"Assessment",                             text:"Related test findings" },
  { section:"Assessment",                             text:"Analysis / conclusion" },
  { section:"Goals of treatment",                     text:"Identified" },
  { section:"Goals of treatment",                     text:"Measurable" },
  { section:"Goals of treatment",                     text:"Time bound" },
  { section:"Treatment plan",                         text:"Record of initial treatment plan" },
  { section:"Changes in plan",                        text:"Recorded" },
  { section:"Notation of each treatment given",       text:"Treatment given recorded" },
  { section:"Evidence of review",                     text:"Entry of review each time a patient attends for treatment" },
];

// Cycle states: undefined → "pass" → "fail" → "na" → undefined
const NOTES_CYCLE = { undefined:"pass", "":"pass", pass:"fail", fail:"na", na:"" };
const NOTES_DISPLAY = {
  pass: {mark:"✓",  color:"#0F6E56", bg:"#EAF3DE"},
  fail: {mark:"✗",  color:"#c0392b", bg:"#FCEBEB"},
  na:   {mark:"N/A",color:"#5F5E5A", bg:"#E8E6DC"},
};

function NotesAuditGridModal({onClose,onComplete,role,roleName}){
  const today = new Date().toISOString().split("T")[0];
  // State — one grid cell per (criterion index, record index). Stored as
  // flat object keyed "rowIdx-colIdx" to keep the save payload compact.
  const [grid, setGrid] = useState({});
  const [meta, setMeta] = useState({
    date: today,
    clinic: CLINICS[0].short,
    physioAudited: "",
    auditor: roleName||"",
    workOn: "",
  });
  // Pass 2 — signature
  const [signatureObj, setSignatureObj] = useState(null);
  useEffect(()=>{ if(!_sigCacheLoaded) loadSignatures().catch(()=>{}); },[]);

  // Cycle a cell through the four states
  function cycleCell(row, col){
    const k = `${row}-${col}`;
    setGrid(p => {
      const cur = p[k] || "";
      const next = NOTES_CYCLE[cur] || "";
      const copy = {...p};
      if(next === "") delete copy[k]; else copy[k] = next;
      return copy;
    });
  }

  // Live totals per row: how many of each record group pass/fail/na
  function rowStats(row){
    let currentPass=0, currentDone=0, pastPass=0, pastDone=0;
    for(let col=0; col<10; col++){
      const v = grid[`${row}-${col}`];
      const isCurrent = col < 5;
      if(v === "pass"){ if(isCurrent) currentPass++; else pastPass++; }
      if(v === "pass" || v === "fail"){
        // N/A doesn't count toward denominator for the %Complies calculation
        if(isCurrent) currentDone++; else pastDone++;
      }
    }
    const denom = currentDone + pastDone;
    const numer = currentPass + pastPass;
    const pct = denom === 0 ? null : Math.round((numer / denom) * 100);
    return { currentPass, currentDone, pastPass, pastDone, pct };
  }

  // Overall stats — total ticks across the whole 15×10 grid
  const totalPassed = Object.values(grid).filter(v=>v==="pass").length;
  const totalFailed = Object.values(grid).filter(v=>v==="fail").length;
  const totalNa     = Object.values(grid).filter(v=>v==="na").length;
  const totalCells  = NOTES_AUDIT_CRITERIA.length * 10;
  const totalAnswered = totalPassed + totalFailed + totalNa;
  const pctComplete = Math.round((totalAnswered / totalCells) * 100);

  function submit(){
    if(!meta.physioAudited){ alert("Please select the physiotherapist whose notes are being audited."); return; }
    if(!meta.auditor.trim()){ alert("Please enter auditor name."); return; }
    if(!signatureObj || !signatureObj.dataUrl){ alert("Please sign the form before submitting."); return; }
    if(totalAnswered < totalCells){
      if(!window.confirm(`${totalCells - totalAnswered} of ${totalCells} cells unanswered. Submit anyway?`)) return;
    }
    // Build the notes text for history/list display
    const summaryLines = [];
    NOTES_AUDIT_CRITERIA.forEach((c, row) => {
      const s = rowStats(row);
      if(s.pct !== null && s.pct < 100){
        summaryLines.push(`• ${c.text}: ${s.pct}% complies (${s.currentPass + s.pastPass}/${s.currentDone + s.pastDone})`);
      }
    });
    const notesText = [
      summaryLines.length ? "Criteria below 100%:" : "All criteria 100%.",
      ...summaryLines,
      meta.workOn ? `\nTo work on: ${meta.workOn}` : "",
    ].filter(Boolean).join("\n").trim();

    onComplete({
      id: Date.now(),
      type: "clinical_notes",
      title: `Clinical Notes Audit — ${meta.physioAudited}`,
      icon: "📋",
      clinic: meta.clinic,
      auditor: meta.auditor,
      physioAudited: meta.physioAudited,
      date: meta.date,
      passed: totalPassed,
      failed: totalFailed,
      na: totalNa,
      total: totalCells,
      outcome: totalFailed === 0 ? "Passed" : `${totalFailed} issue${totalFailed>1?"s":""} found`,
      notes: notesText,
      signature: signatureObj.dataUrl,
      signedBy: meta.auditor,
      signedAt: new Date().toISOString(),
      formVersion: "v2",
      notesAuditData: {
        grid: {...grid},
        workOn: meta.workOn,
      },
    });
  }

  // Group criteria by section for visual grouping in the grid
  const sectionGroups = [];
  let lastSection = null;
  NOTES_AUDIT_CRITERIA.forEach((c, idx) => {
    if(c.section !== lastSection){
      sectionGroups.push({ section: c.section, rows: [] });
      lastSection = c.section;
    }
    sectionGroups[sectionGroups.length-1].rows.push({ ...c, idx });
  });

  // ── UI ──
  const lbl = (txt) => <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>{txt}</label>;
  const sectionHead = (title) => <div style={{background:C.teal,color:"white",padding:"6px 12px",fontWeight:600,fontSize:11,letterSpacing:".4px",textTransform:"uppercase"}}>{title}</div>;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:960,marginBottom:"2rem"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(145deg,#1a3c34 0%,#2a5c4e 100%)",padding:"1.25rem 1.5rem",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:17,fontWeight:700,letterSpacing:".3px"}}>📋 Clinical Record Audit Form</div>
            <div style={{color:"rgba(255,255,255,0.85)",fontSize:11,marginTop:3,fontStyle:"italic"}}>Five current records · five past records · NZP-aligned structure</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{textAlign:"right"}}>
              <div style={{color:"white",fontSize:20,fontWeight:700}}>{pctComplete}%</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{totalAnswered}/{totalCells}</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button>
          </div>
        </div>

        <div style={{padding:"1.25rem 1.5rem",maxHeight:"78vh",overflowY:"auto"}}>

          {/* Meta */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"1rem"}}>
            <div>{lbl("Date")}<input type="date" value={meta.date} onChange={e=>setMeta(p=>({...p,date:e.target.value}))} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
            <div>{lbl("Clinic")}<select value={meta.clinic} onChange={e=>setMeta(p=>({...p,clinic:e.target.value}))} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}>{CLINICS.map(c=><option key={c.id}>{c.short}</option>)}</select></div>
            <div>{lbl("Auditor name")}<input type="text" value={meta.auditor} onChange={e=>setMeta(p=>({...p,auditor:e.target.value}))} placeholder="e.g. Jade Warren" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
          </div>

          {/* Physio selector */}
          <div style={{background:"#E6F1FB",border:`1px solid #b8d4f0`,borderRadius:8,padding:"0.75rem 1rem",marginBottom:"1.25rem"}}>
            <div style={{fontSize:12,fontWeight:600,color:C.blue,marginBottom:"0.5rem"}}>📋 Whose notes are being audited?</div>
            <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
              {Object.values(STAFF).filter(s=>s.type!=="Owner").map(s=>(
                <div key={s.name} onClick={()=>setMeta(p=>({...p,physioAudited:s.name}))} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${meta.physioAudited===s.name?C.blue:C.border}`,background:meta.physioAudited===s.name?C.blueL:"white",fontSize:12,cursor:"pointer",fontWeight:meta.physioAudited===s.name?600:400,color:meta.physioAudited===s.name?C.blue:C.text}}>{s.name.split(" ")[0]}</div>
              ))}
            </div>
            {meta.physioAudited && <div style={{fontSize:11,color:C.muted,marginTop:6}}>Auditing 5 current + 5 past records for <strong>{meta.physioAudited}</strong></div>}
          </div>

          {/* Legend */}
          <div style={{background:C.grayXL,borderRadius:8,padding:"8px 12px",marginBottom:"0.75rem",display:"flex",gap:16,alignItems:"center",fontSize:11,color:C.muted,flexWrap:"wrap"}}>
            <span style={{fontWeight:600,color:C.text}}>Tap cell to cycle:</span>
            <span>blank → <b style={{color:"#0F6E56"}}>✓</b> → <b style={{color:"#c0392b"}}>✗</b> → <b style={{color:C.gray}}>N/A</b> → blank</span>
            <span style={{marginLeft:"auto",fontStyle:"italic"}}>Scroll horizontally if the grid is wider than your screen →</span>
          </div>

          {/* The grid — sticky criterion column, 10 record columns, totals, pct */}
          <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",marginBottom:"1rem"}}>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{borderCollapse:"collapse",fontSize:12,minWidth:820,width:"100%"}}>
                <thead>
                  <tr style={{background:"#1a3c34",color:"white"}}>
                    <th style={{padding:"8px 10px",textAlign:"left",fontWeight:600,fontSize:11,letterSpacing:".3px",position:"sticky",left:0,background:"#1a3c34",zIndex:2,minWidth:260,borderRight:"2px solid #0f2b24"}}>Criterion</th>
                    {[1,2,3,4,5].map(n=><th key={`cur-${n}`} style={{padding:"6px 4px",fontWeight:600,fontSize:10,minWidth:44,background:"#2a5c4e",borderLeft:"1px solid rgba(255,255,255,0.12)"}}>C{n}</th>)}
                    {[1,2,3,4,5].map(n=><th key={`past-${n}`} style={{padding:"6px 4px",fontWeight:600,fontSize:10,minWidth:44,background:"#2a5c4e",borderLeft:n===1?`2px solid rgba(255,255,255,0.35)`:"1px solid rgba(255,255,255,0.12)"}}>P{n}</th>)}
                    <th style={{padding:"6px 4px",fontWeight:700,fontSize:10,minWidth:72,background:"#7ab648",color:"#0f2b1e",borderLeft:"2px solid rgba(255,255,255,0.35)"}}>Complies</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionGroups.map((group, gi) => (
                    <Fragment key={gi}>
                      <tr>
                        <td colSpan={12} style={{padding:0}}>{sectionHead(group.section)}</td>
                      </tr>
                      {group.rows.map((c, ri) => {
                        const rowIdx = c.idx;
                        const s = rowStats(rowIdx);
                        const pctText = s.pct === null ? "—" : `${s.pct}%`;
                        const pctColor = s.pct === null ? C.hint : s.pct === 100 ? "#0F6E56" : s.pct >= 80 ? "#BA7517" : "#c0392b";
                        return (
                          <tr key={rowIdx} style={{background: (gi+ri) % 2 === 0 ? "#fff" : "#fafbf9"}}>
                            <td style={{padding:"7px 10px",fontSize:12,position:"sticky",left:0,background:(gi+ri) % 2 === 0 ? "#fff" : "#fafbf9",zIndex:1,borderRight:`2px solid ${C.border}`,color:C.text,minWidth:260}}>{c.text}</td>
                            {Array.from({length:10}).map((_, col) => {
                              const v = grid[`${rowIdx}-${col}`];
                              const d = v ? NOTES_DISPLAY[v] : null;
                              return (
                                <td key={col} style={{padding:2,textAlign:"center",borderLeft:col===5?`2px solid ${C.border}`:`1px solid ${C.grayL}`,background:d?d.bg:"#fff"}}>
                                  <button
                                    onClick={()=>cycleCell(rowIdx,col)}
                                    style={{width:"100%",height:34,border:"none",background:"transparent",cursor:"pointer",fontSize:d?.mark === "N/A" ? 10 : 16,fontWeight:700,color:d?d.color:C.hint,padding:0}}
                                    title={`Record ${col<5?'C':'P'}${(col%5)+1}, ${c.text}`}
                                  >{d ? d.mark : ""}</button>
                                </td>
                              );
                            })}
                            <td style={{padding:"7px 8px",textAlign:"center",fontSize:12,fontWeight:700,color:pctColor,background:s.pct===100?"#EAF3DE":s.pct===null?"#f5f5f0":s.pct>=80?"#FAEEDA":"#FCEBEB",borderLeft:`2px solid ${C.border}`,minWidth:72}}>{pctText}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals strip */}
          <div style={{display:"flex",gap:16,padding:"12px 14px",background:C.grayXL,borderRadius:8,marginBottom:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:13}}><b style={{color:"#0F6E56"}}>{totalPassed}</b> passed</span>
            <span style={{fontSize:13}}><b style={{color:"#c0392b"}}>{totalFailed}</b> failed</span>
            <span style={{fontSize:13}}><b style={{color:C.gray}}>{totalNa}</b> N/A</span>
            <span style={{fontSize:13,color:C.muted}}>{totalCells - totalAnswered} unanswered</span>
          </div>

          {/* To work on */}
          <div style={{marginBottom:"1rem"}}>
            {lbl("To work on — specific actions, feedback, examples")}
            <textarea rows={4} value={meta.workOn} onChange={e=>setMeta(p=>({...p,workOn:e.target.value}))} placeholder="e.g. Goals to be time framed — e.g. 4 weeks · Measurable · Make sure Discharge summaries are completed" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>
          </div>

          <AuditSignature staffKey={role||"staff"} staffName={meta.auditor||roleName||"Staff member"} onChange={setSignatureObj}/>
          <div style={{marginTop:"1rem"}}>
            <Btn onClick={submit}>Submit audit record</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// Read-only grid view for v2 notes audit records
function NotesAuditGridViewModal({audit,onClose}){
  const nd = audit.notesAuditData || {};
  const grid = nd.grid || {};

  function rowStats(row){
    let currentPass=0, currentDone=0, pastPass=0, pastDone=0;
    for(let col=0; col<10; col++){
      const v = grid[`${row}-${col}`];
      const isCurrent = col < 5;
      if(v === "pass"){ if(isCurrent) currentPass++; else pastPass++; }
      if(v === "pass" || v === "fail"){
        if(isCurrent) currentDone++; else pastDone++;
      }
    }
    const denom = currentDone + pastDone;
    const numer = currentPass + pastPass;
    const pct = denom === 0 ? null : Math.round((numer / denom) * 100);
    return { currentPass, currentDone, pastPass, pastDone, pct };
  }

  const sectionGroups = [];
  let lastSection = null;
  NOTES_AUDIT_CRITERIA.forEach((c, idx) => {
    if(c.section !== lastSection){
      sectionGroups.push({ section: c.section, rows: [] });
      lastSection = c.section;
    }
    sectionGroups[sectionGroups.length-1].rows.push({ ...c, idx });
  });

  const sectionHead = (title) => <div style={{background:C.teal,color:"white",padding:"6px 12px",fontWeight:600,fontSize:11,letterSpacing:".4px",textTransform:"uppercase"}}>{title}</div>;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:960,marginBottom:"2rem",overflow:"hidden"}}>
        <div style={{background:audit.outcome==="Passed"?"linear-gradient(145deg,#1a3c34 0%,#2a5c4e 100%)":C.red,padding:"1.25rem 1.5rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:16,fontWeight:600}}>📋 {audit.title}</div>
            <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>📅 {fmtNZ(audit.date)}</span>
              <span>📍 {audit.clinic}</span>
              <span>👤 Auditor: {audit.auditor}</span>
              <span>🎯 Reviewee: {audit.physioAudited}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
              <div style={{color:"white",fontSize:16,fontWeight:700}}>{audit.outcome}</div>
              <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{audit.passed}/{audit.total} cells ✓</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15,flexShrink:0}}>✕</button>
          </div>
        </div>

        <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>
          <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",marginBottom:"1rem"}}>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{borderCollapse:"collapse",fontSize:12,minWidth:820,width:"100%"}}>
                <thead>
                  <tr style={{background:"#1a3c34",color:"white"}}>
                    <th style={{padding:"8px 10px",textAlign:"left",fontWeight:600,fontSize:11,letterSpacing:".3px",position:"sticky",left:0,background:"#1a3c34",zIndex:2,minWidth:260,borderRight:"2px solid #0f2b24"}}>Criterion</th>
                    {[1,2,3,4,5].map(n=><th key={`cur-${n}`} style={{padding:"6px 4px",fontWeight:600,fontSize:10,minWidth:44,background:"#2a5c4e"}}>C{n}</th>)}
                    {[1,2,3,4,5].map(n=><th key={`past-${n}`} style={{padding:"6px 4px",fontWeight:600,fontSize:10,minWidth:44,background:"#2a5c4e",borderLeft:n===1?`2px solid rgba(255,255,255,0.35)`:""}}>P{n}</th>)}
                    <th style={{padding:"6px 4px",fontWeight:700,fontSize:10,minWidth:72,background:"#7ab648",color:"#0f2b1e",borderLeft:"2px solid rgba(255,255,255,0.35)"}}>Complies</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionGroups.map((group, gi) => (
                    <Fragment key={gi}>
                      <tr><td colSpan={12} style={{padding:0}}>{sectionHead(group.section)}</td></tr>
                      {group.rows.map((c, ri) => {
                        const rowIdx = c.idx;
                        const s = rowStats(rowIdx);
                        const pctText = s.pct === null ? "—" : `${s.pct}%`;
                        const pctColor = s.pct === null ? C.hint : s.pct === 100 ? "#0F6E56" : s.pct >= 80 ? "#BA7517" : "#c0392b";
                        const rowBg = (gi+ri) % 2 === 0 ? "#fff" : "#fafbf9";
                        return (
                          <tr key={rowIdx} style={{background:rowBg}}>
                            <td style={{padding:"7px 10px",fontSize:12,position:"sticky",left:0,background:rowBg,zIndex:1,borderRight:`2px solid ${C.border}`,minWidth:260}}>{c.text}</td>
                            {Array.from({length:10}).map((_, col) => {
                              const v = grid[`${rowIdx}-${col}`];
                              const d = v ? NOTES_DISPLAY[v] : null;
                              return (
                                <td key={col} style={{padding:"7px 4px",textAlign:"center",borderLeft:col===5?`2px solid ${C.border}`:`1px solid ${C.grayL}`,background:d?d.bg:"#fff",color:d?d.color:C.hint,fontSize:d?.mark === "N/A" ? 10 : 15,fontWeight:700}}>{d ? d.mark : ""}</td>
                              );
                            })}
                            <td style={{padding:"7px 8px",textAlign:"center",fontSize:12,fontWeight:700,color:pctColor,background:s.pct===100?"#EAF3DE":s.pct===null?"#f5f5f0":s.pct>=80?"#FAEEDA":"#FCEBEB",borderLeft:`2px solid ${C.border}`}}>{pctText}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {nd.workOn && (
            <div style={{background:"#FEFCF3",border:`1px solid #D4AF37`,borderLeft:"4px solid #D4AF37",borderRadius:"0 6px 6px 0",padding:"12px 16px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#8a6a1c",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>To work on</div>
              <div style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:"pre-line"}}>{nd.workOn}</div>
            </div>
          )}
          {/* Sign-off — shows actual signature image when present */}
          <div style={{marginTop:"1rem",padding:"0.875rem",background:"#f6f8fb",border:`1px solid #e0e5ee`,borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:700,color:C.teal,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Auditor signature</div>
            {audit.signature
              ? <>
                  <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:8,display:"inline-block",maxWidth:"100%"}}>
                    <img src={audit.signature} alt="signature" style={{maxHeight:56,maxWidth:240,display:"block"}}/>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:5,fontFamily:"monospace"}}>{audit.signedBy||audit.auditor} · signed {audit.signedAt?fmtNZ(audit.signedAt.slice(0,10)):fmtNZ(audit.date)}</div>
                </>
              : <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>Signature not recorded — pre-signature system. Signed by: <b style={{color:C.text,fontStyle:"normal"}}>{audit.auditor||"—"}</b></div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PBNZ peer review observation areas ──────────────────────────
// These 5 areas match the official Physiotherapy Board of NZ
// Annual Peer Review template. The reviewer writes a free-text
// comment per area — no tick-boxes, matching the PBNZ form exactly.
const PEER_REVIEW_AREAS = [
  { key:"professional", label:"Professional practice", hint:"Communication, language, explanations, instructions" },
  { key:"subjective",   label:"Subjective",            hint:"Subjective assessment observation" },
  { key:"objective",    label:"Objective",             hint:"Objective examination observation" },
  { key:"reasoning",    label:"Clinical Reasoning and Treatment Plan", hint:"Clinical reasoning linking Sx and Ox; treatment plan" },
  { key:"interaction",  label:"Patient Interaction",   hint:"e.g. teaching, rapport, engagement" },
];

// PeerReviewModal — PBNZ-exact narrative peer review form.
// Replaces the old tick-box modal when opened via the Peer Review audit type.
// Saves with formVersion:"v2" and a structured peerReviewData payload.
function PeerReviewModal({onClose,onComplete,role,roleName}){
  const today = new Date().toISOString().split("T")[0];
  // Practitioner list — all physios (excluding Owner? No, include Jade too; Directors do peer review)
  const physioList = Object.values(STAFF).map(s=>s.name);

  // Review setup
  const [date, setDate] = useState(today);
  const [practitioner, setPractitioner] = useState("");
  const [reviewer, setReviewer] = useState(roleName||"");
  const [reviewerReg, setReviewerReg] = useState("");
  const [reviewerProfession, setReviewerProfession] = useState("Physiotherapist");

  // Pass 2 — signature
  const [signatureObj, setSignatureObj] = useState(null);
  useEffect(()=>{ if(!_sigCacheLoaded) loadSignatures().catch(()=>{}); },[]);

  // Practice type + method — radio-ish, but we store as sets since user might tick multiple
  const [practiceTypes, setPracticeTypes] = useState({clinical:true, nonClinical:false, research:false, academic:false, other:false});
  const [practiceOther, setPracticeOther] = useState("");
  const [methods, setMethods] = useState({direct:true, video:false, performance:false});

  // 5 area narrative comments
  const [comments, setComments] = useState({});
  // Summaries + action plan
  const [revieweeSummary, setRevieweeSummary] = useState("");
  const [reviewerSummary, setReviewerSummary] = useState("");
  const [actionPlan, setActionPlan] = useState("");

  function togglePractice(key){ setPracticeTypes(p=>({...p,[key]:!p[key]})); }
  function toggleMethod(key){ setMethods(m=>({...m,[key]:!m[key]})); }

  function submit(){
    if(!practitioner) { alert("Please select the practitioner (reviewee)."); return; }
    if(!reviewer.trim()) { alert("Please enter the reviewer's name."); return; }
    if(!reviewerSummary.trim()) { alert("Please complete the reviewer summary."); return; }
    if(!actionPlan.trim()) { alert("Please complete the action plan."); return; }
    if(!signatureObj || !signatureObj.dataUrl){ alert("Please sign the form before submitting."); return; }

    // Build a notes field compatible with history-list display
    const noteLines = [];
    PEER_REVIEW_AREAS.forEach(a=>{ if(comments[a.key]) noteLines.push(`• ${a.label}: ${comments[a.key]}`); });
    if(reviewerSummary) noteLines.push(`Reviewer summary: ${reviewerSummary}`);
    if(actionPlan) noteLines.push(`Action plan: ${actionPlan}`);

    onComplete({
      id: Date.now(),
      type: "peer_review",
      title: `Peer Review — ${practitioner}`,
      icon: "🔍",
      clinic: (CLINICS.find(c=>!c.isSchool)||CLINICS[0]).short,  // not clinic-specific, but schema requires it
      auditor: reviewer,
      physioAudited: practitioner,
      date,
      passed: 0, failed: 0, na: 0, total: 0,  // narrative form — no pass/fail counting
      outcome: "Completed",
      notes: noteLines.join("\n"),
      signature: signatureObj.dataUrl,
      signedBy: reviewer,
      signedAt: new Date().toISOString(),
      formVersion: "v2",
      peerReviewData: {
        practitioner, reviewer, reviewerReg, reviewerProfession,
        practiceTypes, practiceOther, methods,
        comments, revieweeSummary, reviewerSummary, actionPlan,
      },
    });
  }

  const fieldLbl = (txt) => <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>{txt}</label>;
  const sectionHead = (title) => <div style={{background:"#6B46C1",color:"white",padding:"7px 14px",fontWeight:700,fontSize:12,marginTop:"1.25rem",marginBottom:0,borderRadius:"5px 5px 0 0",letterSpacing:".3px"}}>{title}</div>;
  const sectionBody = (children) => <div style={{background:"white",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 5px 5px",padding:"0.875rem 1rem"}}>{children}</div>;
  const chkBox = (checked, onClick, label) => (
    <div onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",padding:"4px 10px",marginRight:8,marginBottom:4,borderRadius:4,background:checked?"#F0E8FA":"transparent",border:`1.5px solid ${checked?"#6B46C1":C.border}`}}>
      <span style={{width:14,height:14,borderRadius:2,background:checked?"#6B46C1":"white",border:`1.5px solid ${checked?"#6B46C1":"#c7b8e0"}`,display:"inline-flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:700}}>{checked?"✓":""}</span>
      <span style={{fontSize:12,color:checked?"#6B46C1":C.text}}>{label}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:760,marginBottom:"2rem"}}>
        <div style={{background:"linear-gradient(135deg,#6B46C1 0%,#8a64d8 100%)",padding:"1.25rem 1.5rem",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:17,fontWeight:700,letterSpacing:".3px"}}>🔍 Annual Peer Review</div>
            <div style={{color:"rgba(255,255,255,0.85)",fontSize:11,marginTop:3,fontStyle:"italic"}}>Physiotherapy Board of NZ — Te Poari Tiaki Tinana o Aotearoa</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button>
        </div>

        <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>

          {/* Review setup */}
          {sectionHead("Review setup")}
          {sectionBody(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
              <div>{fieldLbl("Date of review")}<input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
              <div>{fieldLbl("Practitioner (reviewee)")}<select value={practitioner} onChange={e=>setPractitioner(e.target.value)} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}>
                <option value="">— Select —</option>
                {physioList.map(n=><option key={n} value={n}>{n}</option>)}
              </select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
              <div>{fieldLbl("Peer reviewer name (as per Board register)")}<input type="text" value={reviewer} onChange={e=>setReviewer(e.target.value)} placeholder="e.g. Jade Warren" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
              <div>{fieldLbl("Registration number")}<input type="text" value={reviewerReg} onChange={e=>setReviewerReg(e.target.value)} placeholder="70-XXXXX" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
            </div>
            <div>{fieldLbl("Reviewer profession")}<input type="text" value={reviewerProfession} onChange={e=>setReviewerProfession(e.target.value)} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
          </>)}

          {/* Practice type + method */}
          {sectionHead("Practice type & method")}
          {sectionBody(<>
            <div style={{marginBottom:"0.75rem"}}>
              {fieldLbl("Practice type reviewed")}
              <div style={{display:"flex",flexWrap:"wrap",marginTop:2}}>
                {chkBox(practiceTypes.clinical, ()=>togglePractice("clinical"), "Clinical")}
                {chkBox(practiceTypes.nonClinical, ()=>togglePractice("nonClinical"), "Non-clinical")}
                {chkBox(practiceTypes.research, ()=>togglePractice("research"), "Research")}
                {chkBox(practiceTypes.academic, ()=>togglePractice("academic"), "Academic")}
                {chkBox(practiceTypes.other, ()=>togglePractice("other"), "Other")}
              </div>
              {practiceTypes.other && <input type="text" placeholder="Specify other practice type" value={practiceOther} onChange={e=>setPracticeOther(e.target.value)} style={{width:"100%",marginTop:6,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/>}
            </div>
            <div>
              {fieldLbl("Method")}
              <div style={{display:"flex",flexWrap:"wrap",marginTop:2}}>
                {chkBox(methods.direct, ()=>toggleMethod("direct"), "Direct observation")}
                {chkBox(methods.video, ()=>toggleMethod("video"), "Video")}
                {chkBox(methods.performance, ()=>toggleMethod("performance"), "Performance review")}
              </div>
              <div style={{fontSize:10.5,color:C.muted,marginTop:4,fontStyle:"italic",lineHeight:1.4}}>For Direct observation and Video methods you must adhere to the Informed Consent Standard. For videoconference reviews, also adhere to the Internet and Electronic Communication Standard.</div>
            </div>
          </>)}

          {/* 5 areas */}
          {sectionHead("Areas to review — reviewer's comments")}
          {sectionBody(<>
            {PEER_REVIEW_AREAS.map((a,i)=>(
              <div key={a.key} style={{marginBottom:i<PEER_REVIEW_AREAS.length-1?"1rem":0,paddingBottom:i<PEER_REVIEW_AREAS.length-1?"0.75rem":0,borderBottom:i<PEER_REVIEW_AREAS.length-1?`1px solid ${C.grayL}`:"none"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#6B46C1",marginBottom:2}}>{a.label}</div>
                <div style={{fontSize:10.5,color:C.muted,marginBottom:5,fontStyle:"italic"}}>{a.hint}</div>
                <textarea rows={2} value={comments[a.key]||""} onChange={e=>setComments(p=>({...p,[a.key]:e.target.value}))} placeholder={`Your observations on ${a.label.toLowerCase()}…`} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>
              </div>
            ))}
          </>)}

          {/* Summaries */}
          {sectionHead("Reviewee summary")}
          {sectionBody(<textarea rows={3} value={revieweeSummary} onChange={e=>setRevieweeSummary(e.target.value)} placeholder="The reviewee's own reflection on the session (optional — can be added later)…" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>)}

          {sectionHead("Reviewer summary")}
          {sectionBody(<textarea rows={3} value={reviewerSummary} onChange={e=>setReviewerSummary(e.target.value)} placeholder="Overall summary — strengths, areas for improvement, notable observations…" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>)}

          {sectionHead("Action plan")}
          {sectionBody(<textarea rows={3} value={actionPlan} onChange={e=>setActionPlan(e.target.value)} placeholder="1. Specific actions with timeframes\n2. ...\n3. ..." style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>)}

          <div style={{background:C.grayXL,borderRadius:8,padding:"1rem",marginTop:"1.25rem",border:`1px solid ${C.border}`}}>
            <AuditSignature staffKey={role||"staff"} staffName={reviewer||roleName||"Reviewer"} onChange={setSignatureObj}/>
            <div style={{marginTop:"1rem"}}>
              <Btn onClick={submit}>Submit peer review record</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Read-only PBNZ-shaped view for v2 peer review records
function PeerReviewViewModal({audit,onClose}){
  const pr = audit.peerReviewData || {};
  const pt = pr.practiceTypes || {};
  const mt = pr.methods || {};
  const comments = pr.comments || {};

  const sectionHead = (title) => <div style={{background:"#6B46C1",color:"white",padding:"7px 14px",fontWeight:700,fontSize:12,marginTop:"1rem",marginBottom:0,borderRadius:"5px 5px 0 0"}}>{title}</div>;
  const sectionBody = (children) => <div style={{background:"white",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 5px 5px",padding:"0.75rem 1rem"}}>{children}</div>;
  const row = (label, value) => (
    <div style={{display:"flex",borderBottom:`1px solid ${C.grayL}`,padding:"6px 0",fontSize:12}}>
      <div style={{minWidth:180,color:C.muted,fontWeight:500}}>{label}</div>
      <div style={{flex:1,color:C.text}}>{value || <span style={{color:C.hint,fontStyle:"italic"}}>—</span>}</div>
    </div>
  );
  const chk = (on) => <span style={{width:14,height:14,borderRadius:2,background:on?"#6B46C1":"white",border:`1.5px solid ${on?"#6B46C1":"#c7b8e0"}`,display:"inline-flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:700}}>{on?"✓":""}</span>;
  // Render a tick-labelled option
  const opt = (on, label) => <span key={label} style={{display:"inline-flex",alignItems:"center",gap:5,marginRight:14,fontSize:12,color:on?"#6B46C1":C.muted,fontWeight:on?600:400}}><span style={{width:14,height:14,borderRadius:2,background:on?"#6B46C1":"white",border:`1.5px solid ${on?"#6B46C1":"#c7b8e0"}`,display:"inline-flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:700}}>{on?"✓":""}</span>{label}</span>;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:760,marginBottom:"2rem",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#6B46C1 0%,#8a64d8 100%)",padding:"1.25rem 1.5rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:16,fontWeight:600}}>🔍 {audit.title}</div>
            <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:4,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>📅 {fmtNZ(audit.date)}</span>
              <span>👤 Reviewer: {audit.auditor}</span>
              <span>🎯 Reviewee: {pr.practitioner || audit.physioAudited}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15,flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>

          {sectionHead("Review setup")}
          {sectionBody(<>
            {row("Date of review", fmtNZ(audit.date))}
            {row("Practitioner (reviewee)", pr.practitioner)}
            {row("Peer reviewer", pr.reviewer)}
            {row("Registration number", pr.reviewerReg)}
            {row("Reviewer profession", pr.reviewerProfession)}
          </>)}

          {sectionHead("Practice type & method")}
          {sectionBody(<>
            <div style={{paddingBottom:8,borderBottom:`1px solid ${C.grayL}`,marginBottom:8}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:5,textTransform:"uppercase",letterSpacing:".3px"}}>Practice type</div>
              <div>{opt(pt.clinical,"Clinical")}{opt(pt.nonClinical,"Non-clinical")}{opt(pt.research,"Research")}{opt(pt.academic,"Academic")}{opt(pt.other,"Other")}</div>
              {pt.other && pr.practiceOther && <div style={{fontSize:12,color:C.text,marginTop:4,marginLeft:22,fontStyle:"italic"}}>Specify: {pr.practiceOther}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:5,textTransform:"uppercase",letterSpacing:".3px"}}>Method</div>
              <div>{opt(mt.direct,"Direct observation")}{opt(mt.video,"Video")}{opt(mt.performance,"Performance review")}</div>
            </div>
          </>)}

          {sectionHead("Areas to review")}
          {sectionBody(<>
            {PEER_REVIEW_AREAS.map((a,i)=>(
              <div key={a.key} style={{paddingBottom:i<PEER_REVIEW_AREAS.length-1?"0.75rem":0,marginBottom:i<PEER_REVIEW_AREAS.length-1?"0.75rem":0,borderBottom:i<PEER_REVIEW_AREAS.length-1?`1px solid ${C.grayL}`:"none"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#6B46C1",marginBottom:3}}>{a.label}</div>
                <div style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:"pre-line"}}>{comments[a.key] || <span style={{color:C.hint,fontStyle:"italic"}}>Not recorded</span>}</div>
              </div>
            ))}
          </>)}

          {pr.revieweeSummary && <>
            {sectionHead("Reviewee summary")}
            {sectionBody(<div style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:"pre-line"}}>{pr.revieweeSummary}</div>)}
          </>}

          {sectionHead("Reviewer summary")}
          {sectionBody(<div style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:"pre-line"}}>{pr.reviewerSummary || <span style={{color:C.hint,fontStyle:"italic"}}>Not recorded</span>}</div>)}

          {sectionHead("Action plan")}
          {sectionBody(<div style={{fontSize:12,color:C.text,lineHeight:1.5,whiteSpace:"pre-line"}}>{pr.actionPlan || <span style={{color:C.hint,fontStyle:"italic"}}>Not recorded</span>}</div>)}

          {/* Sign-off — reviewer signature */}
          <div style={{marginTop:"1rem",padding:"0.875rem",background:"#F5F0FB",border:`1px solid #c7b8e0`,borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6B46C1",textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Reviewer signature</div>
            {audit.signature
              ? <>
                  <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:8,display:"inline-block",maxWidth:"100%"}}>
                    <img src={audit.signature} alt="reviewer signature" style={{maxHeight:56,maxWidth:240,display:"block"}}/>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:5,fontFamily:"monospace"}}>{audit.signedBy||pr.reviewer||audit.auditor} · signed {audit.signedAt?fmtNZ(audit.signedAt.slice(0,10)):fmtNZ(audit.date)}</div>
                </>
              : <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>Signature not recorded — pre-signature system. Signed by: <b style={{color:C.text,fontStyle:"normal"}}>{pr.reviewer||audit.auditor||"—"}</b></div>
            }
          </div>

        </div>
      </div>
    </div>
  );
}

// ── FENZ fire drill questions (matches the official Evacuation Report form) ─
// Question 1 is unusual — Yes means "injuries occurred", which is BAD.
// Questions 2–7 follow the normal pattern where Yes means "things worked".
// Question 8 is a date field (last training session), handled separately.
const FENZ_QUESTIONS = [
  {n:1, q:"Did any injuries occur during this trial evacuation?", detailPrompt:"If yes, detail the injuries that occurred", yesIsGood:false},
  {n:2, q:"Was the evacuation alarm/method of alerting occupants clearly heard in all areas of the building?", detailPrompt:"If no, detail issue and action taken to remedy it", yesIsGood:true},
  {n:3, q:"Were all exit ways clear?", detailPrompt:"If no, detail issue and action taken to remedy it", yesIsGood:true},
  {n:4, q:"Were 'FIRE ACTION NOTICES' in place?", detailPrompt:"If no, detail issue and action taken to remedy it", yesIsGood:true},
  {n:5, q:"Were systems in place to assist anyone who could not self-evacuate and if so, did the systems function?", detailPrompt:"If no, detail issue and action taken to remedy it", yesIsGood:true},
  {n:6, q:"Did any equipment to assist with the evacuation work as intended?", detailPrompt:"If no, detail issue and action taken to remedy it", yesIsGood:true},
  {n:7, q:"Occupants accounted for or building determined to be clear in accordance with the evacuation scheme?", detailPrompt:"If no, detail issue and action taken to remedy it", yesIsGood:true},
];

// Fire drill form — matches FENZ Evacuation Report template exactly.
// Stored with formVersion:"v2" so AuditViewModal + PDF generator can branch.
function FireDrillModal({onClose,onComplete,role,roleName}){
  const today = new Date().toISOString().split("T")[0];
  // Default to first clinic that actually does fire drills
  const drillClinics = CLINICS.filter(c=>!c.noFireDrill);
  const [clinicId, setClinicId] = useState(drillClinics[0].id);
  const activeClinic = CLINICS.find(c=>c.id===clinicId) || drillClinics[0];
  // Part A — Building (auto-set name, editable address pre-filled from clinic)
  const [buildingName, setBuildingName] = useState(`Total Body Physio — ${activeClinic.short}`);
  const [address, setAddress] = useState(activeClinic.address || "");
  const [schemeRef, setSchemeRef] = useState("");
  // Part B — Contact person (pre-filled, editable)
  const [contactName, setContactName] = useState("Jade Warren");
  const [contactPhone, setContactPhone] = useState("021 794 272");
  const [contactEmail, setContactEmail] = useState("admin@totalbodyphysio.co.nz");
  // Part C — Evacuation details
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  // Part D — Assessment outcomes (1-7 = yes/no/na + detail; 8 = last training date)
  const [answers, setAnswers] = useState({}); // { 1: 'yes'|'no'|'na', ... }
  const [details, setDetails] = useState({}); // { 1: "...", ... }
  const [lastTrainingDate, setLastTrainingDate] = useState("");
  // Part E — Additional comments + follow-up request
  const [additionalComments, setAdditionalComments] = useState("");
  const [followUpRequested, setFollowUpRequested] = useState(false);
  const [auditorName, setAuditorName] = useState(roleName || "");
  // Pass 2 — signature (from AuditSignature component; shape: { dataUrl, mode } | null)
  const [signatureObj, setSignatureObj] = useState(null);

  // Make sure signatures are loaded when this modal opens
  useEffect(() => { if(!_sigCacheLoaded) loadSignatures().catch(()=>{}); }, []);

  // When clinic changes, refresh the building name + address defaults
  function onClinicChange(newId){
    const c = CLINICS.find(x=>x.id===newId);
    if(!c) return;
    setClinicId(newId);
    setBuildingName(`Total Body Physio — ${c.short}`);
    setAddress(c.address || "");
  }

  // Outcome logic: count "concerns" — anything that isn't the desirable answer.
  // Q1: yes=concern (injury). Q2–7: no=concern. N/A and "yes is good" don't count.
  const concerns = FENZ_QUESTIONS.filter(q => {
    const a = answers[q.n];
    if(!a || a === "na") return false;
    return q.yesIsGood ? a === "no" : a === "yes";
  }).length;
  const answered = FENZ_QUESTIONS.filter(q => !!answers[q.n]).length;

  function submit(){
    if(!auditorName.trim()){ alert("Please enter the auditor / contact person name."); return; }
    if(!signatureObj || !signatureObj.dataUrl){ alert("Please sign the form before submitting."); return; }
    if(answered < FENZ_QUESTIONS.length){
      if(!window.confirm(`${FENZ_QUESTIONS.length - answered} of 7 assessment questions unanswered. Submit anyway?`)) return;
    }
    if(!minutes && !seconds){
      if(!window.confirm("Evacuation time not recorded. Submit anyway?")) return;
    }
    // Build a notes summary for the history-pane and PDF compatibility
    const concernLines = FENZ_QUESTIONS.filter(q=>{
      const a = answers[q.n]; if(!a||a==="na") return false;
      return q.yesIsGood ? a==="no" : a==="yes";
    }).map(q=>{
      const d = details[q.n] ? ` — ${details[q.n]}` : "";
      return `• Q${q.n}: ${q.q.split("?")[0]}?${d}`;
    }).join("\n");
    const summaryParts = [];
    if(minutes||seconds) summaryParts.push(`Evacuation time: ${minutes||0}m ${seconds||0}s`);
    if(lastTrainingDate) summaryParts.push(`Last training: ${fmtNZ(lastTrainingDate)}`);
    if(additionalComments) summaryParts.push(`Comments: ${additionalComments}`);
    const notes = [concernLines, summaryParts.join(" · ")].filter(Boolean).join("\n").trim();

    onComplete({
      id: Date.now(),
      type: "fire_drill",
      title: `Fire Drill Record — ${activeClinic.short}`,
      icon: "🔥",
      clinic: activeClinic.short,
      auditor: auditorName,
      physioAudited: null,
      date,
      time,
      duration: (minutes||seconds) ? `${minutes||0}m ${seconds||0}s` : "",
      passed: FENZ_QUESTIONS.length - concerns,
      failed: concerns,
      na: FENZ_QUESTIONS.filter(q=>answers[q.n]==="na").length,
      total: FENZ_QUESTIONS.length,
      outcome: concerns === 0 ? "All clear" : `${concerns} issue${concerns>1?"s":""} flagged`,
      notes: notes || "Drill completed. No issues identified.",
      // Pass 2 — signature image embedded on the record
      signature: signatureObj.dataUrl,
      signedBy: auditorName,
      signedAt: new Date().toISOString(),
      // FENZ-specific payload — rendered by AuditViewModal v2 branch + PDF
      formVersion: "v2",
      fireDrillData: {
        buildingName, address, schemeRef,
        contact: { name: contactName, phone: contactPhone, email: contactEmail },
        evacuation: { date, time, minutes: minutes||"0", seconds: seconds||"0" },
        answers, details, lastTrainingDate,
        additionalComments, followUpRequested,
      },
    });
  }

  // ── UI helpers ──
  const lbl = (txt) => <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:".3px"}}>{txt}</label>;
  const inp = (value,onChange,placeholder,type="text") => <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/>;
  const sectionHead = (letter,title) => <div style={{background:"#1F3A5F",color:"white",padding:"8px 14px",fontWeight:700,fontSize:13,marginTop:"1.25rem",marginBottom:0,borderRadius:"6px 6px 0 0",display:"flex",alignItems:"center",gap:10}}><span style={{background:"rgba(255,255,255,.2)",padding:"2px 9px",borderRadius:4,fontSize:11,letterSpacing:".5px"}}>Part {letter}</span><span>{title}</span></div>;
  const sectionBody = (children) => <div style={{background:"white",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"0.875rem 1rem"}}>{children}</div>;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:760,marginBottom:"2rem"}}>
        {/* FENZ-style blue header */}
        <div style={{background:"linear-gradient(135deg,#1F3A5F 0%,#2d4f7a 100%)",padding:"1.25rem 1.5rem",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:17,fontWeight:700,letterSpacing:".3px"}}>🔥 FIRE EVACUATION REPORT</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:11,marginTop:3,fontStyle:"italic"}}>Matches FENZ Evacuation Report — Part A through E</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button>
        </div>

        <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>

          {/* Clinic picker — only clinics that actually run drills */}
          <div style={{marginBottom:"0.5rem"}}>
            {lbl("Clinic")}
            <select value={clinicId} onChange={e=>onClinicChange(e.target.value)} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}>
              {drillClinics.map(c=><option key={c.id} value={c.id}>{c.short}</option>)}
            </select>
            <div style={{fontSize:11,color:C.muted,marginTop:4,fontStyle:"italic"}}>Howick &amp; Edgewater Schools run their own fire drills — not shown here.</div>
          </div>

          {/* Part A — Building */}
          {sectionHead("A","Building description")}
          {sectionBody(<>
            <div style={{marginBottom:"0.75rem"}}>{lbl("Building name")}{inp(buildingName,setBuildingName,"e.g. Total Body Physio — Panmure")}</div>
            <div style={{marginBottom:"0.75rem"}}>{lbl("Address")}{inp(address,setAddress,"Street address")}</div>
            <div>{lbl("Scheme reference (if known)")}{inp(schemeRef,setSchemeRef,"FENZ scheme number — leave blank if not known")}</div>
          </>)}

          {/* Part B — Contact */}
          {sectionHead("B","Contact person details")}
          {sectionBody(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
              <div>{lbl("Name")}{inp(contactName,setContactName)}</div>
              <div>{lbl("Phone / mobile")}{inp(contactPhone,setContactPhone)}</div>
            </div>
            <div>{lbl("Email address")}{inp(contactEmail,setContactEmail,"","email")}</div>
          </>)}

          {/* Part C — Evacuation details */}
          {sectionHead("C","Evacuation details")}
          {sectionBody(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
              <div>{lbl("Date of evacuation")}{inp(date,setDate,"","date")}</div>
              <div>{lbl("Time of evacuation")}{inp(time,setTime,"","time")}</div>
            </div>
            <div>{lbl("Time taken to evacuate")}
              <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                <input type="number" min="0" max="60" value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="0" style={{width:70,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,textAlign:"center"}}/>
                <span style={{fontSize:12,color:C.muted}}>minutes</span>
                <input type="number" min="0" max="59" value={seconds} onChange={e=>setSeconds(e.target.value)} placeholder="0" style={{width:70,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,textAlign:"center"}}/>
                <span style={{fontSize:12,color:C.muted}}>seconds</span>
              </div>
            </div>
          </>)}

          {/* Part D — Assessment outcomes */}
          {sectionHead("D","Assessment outcomes")}
          {sectionBody(<>
            <div style={{display:"flex",gap:16,marginBottom:"0.75rem",fontSize:11,color:C.muted,justifyContent:"flex-end",paddingRight:"0.75rem"}}>
              <span style={{width:40,textAlign:"center",fontWeight:600}}>Yes</span>
              <span style={{width:40,textAlign:"center",fontWeight:600}}>No</span>
              <span style={{width:40,textAlign:"center",fontWeight:600}}>N/A</span>
            </div>
            {FENZ_QUESTIONS.map(q=>{
              const val = answers[q.n];
              const showsDetail = val === (q.yesIsGood ? "no" : "yes");
              return (
                <div key={q.n} style={{paddingBottom:"0.75rem",marginBottom:"0.75rem",borderBottom:`1px solid ${C.grayL}`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.teal,minWidth:24,marginTop:2}}>{q.n}.</span>
                    <span style={{flex:1,fontSize:13,lineHeight:1.45}}>{q.q}</span>
                    <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}>
                      {[["yes","Yes","#EAF3DE","#3B6D11"],["no","No","#FCEBEB",C.red],["na","N/A",C.grayL,C.gray]].map(([v,lblTxt,bg,fg])=>(
                        <button key={v} onClick={()=>setAnswers(p=>({...p,[q.n]:p[q.n]===v?undefined:v}))} style={{width:40,fontSize:11,padding:"4px 0",borderRadius:4,border:`1.5px solid ${val===v?fg:C.border}`,background:val===v?bg:"white",color:val===v?fg:C.muted,cursor:"pointer",fontWeight:val===v?600:400,textAlign:"center"}}>{lblTxt}</button>
                      ))}
                    </div>
                  </div>
                  {showsDetail && (
                    <div style={{marginTop:"0.5rem",marginLeft:32}}>
                      <input placeholder={q.detailPrompt} value={details[q.n]||""} onChange={e=>setDetails(p=>({...p,[q.n]:e.target.value}))} style={{width:"100%",padding:"5px 8px",border:`1px solid ${C.amber}`,borderRadius:5,fontSize:12,background:"#FAEEDA",boxSizing:"border-box"}}/>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Q8 — last training date */}
            <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:"0.25rem"}}>
              <span style={{fontSize:12,fontWeight:600,color:C.teal,minWidth:24}}>8.</span>
              <span style={{flex:1,fontSize:13}}>When was the last training session for permanent occupants held?</span>
              <input type="date" value={lastTrainingDate} onChange={e=>setLastTrainingDate(e.target.value)} style={{padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,background:C.grayXL}}/>
            </div>
          </>)}

          {/* Part E — Additional comments */}
          {sectionHead("E","Additional comments")}
          {sectionBody(<>
            <div style={{marginBottom:"0.75rem"}}>
              {lbl("Additional comments / observations")}
              <textarea rows={3} value={additionalComments} onChange={e=>setAdditionalComments(e.target.value)} placeholder="e.g. Drill completed. Gwenne leading as new H&S Officer for Panmure. All clear." style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,fontFamily:"inherit",boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
              <div>{lbl("Contact person signature (name)")}{inp(auditorName,setAuditorName,"Type name to confirm")}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:18}}>
                <input type="checkbox" checked={followUpRequested} onChange={e=>setFollowUpRequested(e.target.checked)} id="fd-followup" style={{width:16,height:16,cursor:"pointer"}}/>
                <label htmlFor="fd-followup" style={{fontSize:12,color:C.text,cursor:"pointer",lineHeight:1.4}}>Tick if you would like to speak to someone about this trial</label>
              </div>
            </div>
          </>)}

          {/* Summary + submit */}
          <div style={{background:C.grayXL,borderRadius:8,padding:"1rem",marginTop:"1.25rem",border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",gap:20,marginBottom:"0.875rem",fontSize:13}}>
              <span><b style={{color:"#3B6D11"}}>{FENZ_QUESTIONS.length - concerns}</b> OK</span>
              {concerns > 0 && <span><b style={{color:C.red}}>{concerns}</b> concern{concerns>1?"s":""} flagged</span>}
              <span style={{color:C.muted}}>{FENZ_QUESTIONS.length - answered} unanswered</span>
            </div>
            <AuditSignature staffKey={role||"staff"} staffName={auditorName||roleName||"Staff member"} onChange={setSignatureObj}/>
            <div style={{marginTop:"1rem"}}>
              <Btn onClick={submit}>Submit fire drill record</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIGNATURES — reusable drawing pad + storage + audit signature block
// ═══════════════════════════════════════════════════════════════
// Used for both:
//   1. Per-staff "saved signature" in ProfileModal (upload once, reuse)
//   2. Per-audit signing at submit time (use saved OR draw fresh)
//
// Storage: base64 PNG data URLs mapped by staffKey in a Vercel blob
// keyed "signatures" — kept separate from audit records so signatures
// can be reused across multiple audits without duplication.
// ═══════════════════════════════════════════════════════════════

// ── SignaturePad — the drawing canvas with iOS fixes ──────────────
// iOS Safari attaches React's onTouchMove as a PASSIVE listener, so
// e.preventDefault() is silently ignored and the first drag becomes
// a scroll. We attach touch handlers natively via addEventListener
// with {passive:false}, which guarantees preventDefault actually
// prevents iOS from treating the drag as a scroll gesture.
function SignaturePad({onChange, value, height=180, color="#1a3c34"}){
  const ref = useRef(null);
  const [drew, setDrew] = useState(!!value);
  const down = useRef(false);
  const last = useRef(null);
  const hasInk = useRef(!!value);
  const pendingResize = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(()=>{ onChangeRef.current = onChange; }, [onChange]);

  // Canvas sizing + optional initial image render
  useEffect(()=>{
    const c = ref.current; if(!c) return;
    const styleCtx = (ctx, dpr) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    };
    const sizeCanvas = () => {
      if(down.current){ pendingResize.current = true; return; }
      const rect = c.getBoundingClientRect();
      if(rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if(c.width === newW && c.height === newH) return;
      let snap = null;
      if(hasInk.current && c.width && c.height){
        snap = document.createElement("canvas");
        snap.width = c.width; snap.height = c.height;
        snap.getContext("2d").drawImage(c, 0, 0);
      }
      c.width = newW; c.height = newH;
      const ctx = c.getContext("2d");
      styleCtx(ctx, dpr);
      if(snap){
        ctx.save(); ctx.setTransform(1,0,0,1,0,0);
        ctx.drawImage(snap, 0, 0, snap.width, snap.height, 0, 0, c.width, c.height);
        ctx.restore();
        styleCtx(ctx, dpr);
      } else if(value){
        // Initial render of an existing signature image
        const img = new Image();
        img.onload = () => {
          const ctx2 = c.getContext("2d");
          ctx2.save();
          ctx2.setTransform(1, 0, 0, 1, 0, 0);
          // Fit image inside canvas while preserving aspect ratio
          const scale = Math.min(c.width / img.width, c.height / img.height);
          const w = img.width * scale, h = img.height * scale;
          ctx2.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
          ctx2.restore();
          styleCtx(ctx2, dpr);
        };
        img.src = value;
      }
    };
    c.__sigSize = sizeCanvas;
    c.__sigFlushPending = () => { if(pendingResize.current){ pendingResize.current = false; sizeCanvas(); } };
    sizeCanvas();
    let ro = null;
    if(typeof ResizeObserver !== "undefined"){ ro = new ResizeObserver(()=>sizeCanvas()); ro.observe(c); }
    window.addEventListener("resize", sizeCanvas);
    window.addEventListener("orientationchange", sizeCanvas);
    const vv = window.visualViewport; if(vv) vv.addEventListener("resize", sizeCanvas);
    return () => {
      if(ro) ro.disconnect();
      window.removeEventListener("resize", sizeCanvas);
      window.removeEventListener("orientationchange", sizeCanvas);
      if(vv) vv.removeEventListener("resize", sizeCanvas);
    };
  }, [value, color]);

  // Native (non-passive) touch + mouse handlers
  useEffect(()=>{
    const c = ref.current; if(!c) return;
    const pt = e => {
      const r = c.getBoundingClientRect();
      const t = e.touches?.[0] || e.changedTouches?.[0] || e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const go = e => {
      e.preventDefault();
      if(c.__sigSize) c.__sigSize();
      down.current = true;
      last.current = pt(e);
    };
    const mv = e => {
      e.preventDefault();
      if(!down.current) return;
      const ctx = c.getContext("2d");
      const p = pt(e);
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      if(!hasInk.current){ hasInk.current = true; setDrew(true); }
    };
    const up = e => {
      if(!down.current) return;
      if(e && e.preventDefault) e.preventDefault();
      down.current = false;
      if(hasInk.current && onChangeRef.current){
        onChangeRef.current(c.toDataURL("image/png"));
      }
      if(c.__sigFlushPending) c.__sigFlushPending();
    };
    const opts = { passive: false };
    c.addEventListener("touchstart", go, opts);
    c.addEventListener("touchmove", mv, opts);
    c.addEventListener("touchend", up, opts);
    c.addEventListener("touchcancel", up, opts);
    c.addEventListener("mousedown", go);
    c.addEventListener("mousemove", mv);
    c.addEventListener("mouseup", up);
    return () => {
      c.removeEventListener("touchstart", go, opts);
      c.removeEventListener("touchmove", mv, opts);
      c.removeEventListener("touchend", up, opts);
      c.removeEventListener("touchcancel", up, opts);
      c.removeEventListener("mousedown", go);
      c.removeEventListener("mousemove", mv);
      c.removeEventListener("mouseup", up);
    };
  }, []);

  const clear = () => {
    const c = ref.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
    setDrew(false);
    if(onChangeRef.current) onChangeRef.current(null);
  };

  return (
    <div style={{position:"relative"}}>
      <canvas ref={ref} style={{width:"100%",height,border:`2px dashed ${C.border}`,borderRadius:10,background:"#f8fcf9",touchAction:"none",WebkitUserSelect:"none",userSelect:"none",cursor:"crosshair",display:"block"}}/>
      {!drew && <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:C.muted,fontSize:14,pointerEvents:"none",whiteSpace:"nowrap"}}>Sign here with your finger</div>}
      {drew && <button onClick={clear} style={{position:"absolute",top:8,right:8,background:"white",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,color:C.muted,cursor:"pointer"}}>Clear</button>}
    </div>
  );
}

// ── Signature storage ─────────────────────────────────────────────
// signatures blob shape: { [staffKey]: "data:image/png;base64,..." }
// Cached in-memory via _sigCache; refreshed on every loadSignatures().
let _sigCache = null;
let _sigCacheLoaded = false;

async function loadSignatures(){
  try {
    const res = await fetch(PORTAL_API + "/store?key=signatures", {
      headers: { "X-Portal-Secret": PORTAL_SECRET }
    });
    if(res.ok){
      const data = await res.json();
      _sigCache = (data && data.value) ? data.value : {};
      _sigCacheLoaded = true;
      return _sigCache;
    }
  } catch(e){ /* fall through — return empty map */ }
  _sigCache = {};
  _sigCacheLoaded = true;
  return _sigCache;
}

async function saveSignature(staffKey, dataUrl){
  if(!_sigCacheLoaded) await loadSignatures();
  _sigCache = { ..._sigCache, [staffKey]: dataUrl };
  const res = await fetch(PORTAL_API + "/store", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Portal-Secret": PORTAL_SECRET },
    body: JSON.stringify({ key: "signatures", value: _sigCache })
  });
  if(!res.ok) throw new Error("Signature save failed: " + res.status);
  return _sigCache;
}

async function deleteSignature(staffKey){
  if(!_sigCacheLoaded) await loadSignatures();
  const copy = { ..._sigCache };
  delete copy[staffKey];
  _sigCache = copy;
  await fetch(PORTAL_API + "/store", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Portal-Secret": PORTAL_SECRET },
    body: JSON.stringify({ key: "signatures", value: _sigCache })
  });
  return _sigCache;
}

function getSavedSignature(staffKey){
  if(!_sigCacheLoaded || !_sigCache) return null;
  return _sigCache[staffKey] || null;
}

// ── Preloaded signatures — baked in to skip the upload step for specific staff ──
// Only used by the 'one-tap install' button in the Signature tab. Delete an entry
// once the staff member has saved their signature via the normal flow — it's just
// a convenience, not a source of truth. The source of truth is the 'signatures'
// blob in the Vercel portal store (same one loadSignatures/saveSignature use).
const PRELOADED_SIGNATURES = {
  jade: "data:image/png;base64,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",
};

// ── SignatureTab — shown inside ProfileModal for staff to set up their sig ─
function SignatureTab({staffId, staffName, role}){
  const [loading, setLoading] = useState(!_sigCacheLoaded);
  const [saved, setSaved] = useState(getSavedSignature(staffId));
  const [mode, setMode] = useState("current"); // "current" | "draw" | "upload"
  const [drawing, setDrawing] = useState(null); // base64 from SignaturePad
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  // Retrofill state — only relevant when user is viewing their own profile
  // and has a saved signature. Walks all audit records, finds unsigned ones
  // where this user was the auditor, and lets them batch-apply their sig.
  const isOwnProfile = role === staffId;
  const [retrofillMode, setRetrofillMode] = useState("idle");  // idle | scanning | preview | saving | done
  const [retrofillCandidates, setRetrofillCandidates] = useState([]);
  const [retrofillMsg, setRetrofillMsg] = useState("");

  useEffect(()=>{
    if(_sigCacheLoaded){ setSaved(getSavedSignature(staffId)); return; }
    loadSignatures().then(()=>{ setSaved(getSavedSignature(staffId)); setLoading(false); });
  }, [staffId]);

  async function onFilePick(e){
    const f = e.target.files?.[0];
    if(!f) return;
    if(!f.type.startsWith("image/")){ alert("Please upload an image file (PNG, JPG)."); return; }
    if(f.size > 2 * 1024 * 1024){ alert("Signature image must be under 2MB."); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await saveSignature(staffId, ev.target.result);
          setSaved(ev.target.result);
          setMode("current");
          setMsg("✓ Signature saved");
          setTimeout(()=>setMsg(""), 2500);
        } catch(err){ setMsg("Save failed: " + err.message); }
        finally { setUploading(false); }
      };
      reader.readAsDataURL(f);
    } catch(err){ setUploading(false); setMsg("Error: " + err.message); }
    e.target.value = "";
  }

  async function saveDrawing(){
    if(!drawing){ alert("Please draw your signature first."); return; }
    setUploading(true);
    try {
      await saveSignature(staffId, drawing);
      setSaved(drawing);
      setMode("current");
      setDrawing(null);
      setMsg("✓ Signature saved");
      setTimeout(()=>setMsg(""), 2500);
    } catch(err){ setMsg("Save failed: " + err.message); }
    finally { setUploading(false); }
  }

  async function removeSaved(){
    if(!window.confirm("Remove your saved signature? You'll need to re-add it before signing audits.")) return;
    try {
      await deleteSignature(staffId);
      setSaved(null);
      setMsg("Signature removed");
      setTimeout(()=>setMsg(""), 2500);
    } catch(err){ setMsg("Remove failed: " + err.message); }
  }

  if(loading) return <div style={{padding:"2rem",textAlign:"center",color:C.muted,fontSize:13}}>Loading signature…</div>;

  return (
    <div style={{padding:"1.25rem 1.5rem"}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Signature on file for {staffName}</div>
      <div style={{fontSize:11.5,color:C.muted,marginBottom:"1rem",lineHeight:1.5}}>
        Set a signature once — it will appear on every audit PDF you sign. You can either upload a PNG of your real signature (sign on paper, photograph/scan) or draw one below. Redo any time.
      </div>

      {saved && mode === "current" && (
        <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px",marginBottom:"1rem"}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Current signature</div>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px",display:"flex",justifyContent:"center",minHeight:120,alignItems:"center"}}>
            <img src={saved} alt="signature" style={{maxWidth:"100%",maxHeight:140,objectFit:"contain"}}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            <button onClick={()=>setMode("upload")} style={{padding:"7px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"white",color:C.text,fontSize:12,cursor:"pointer",fontWeight:500}}>Upload new PNG</button>
            <button onClick={()=>setMode("draw")} style={{padding:"7px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"white",color:C.text,fontSize:12,cursor:"pointer",fontWeight:500}}>Draw new</button>
            <button onClick={removeSaved} style={{padding:"7px 14px",border:"1px solid #f5a0a0",borderRadius:8,background:"#FCEBEB",color:C.red,fontSize:12,cursor:"pointer",fontWeight:500,marginLeft:"auto"}}>Remove</button>
          </div>
        </div>
      )}

      {!saved && mode === "current" && (
        <div style={{background:"#FEFCF3",border:`1px solid #D4AF37`,borderLeft:"4px solid #D4AF37",borderRadius:"0 8px 8px 0",padding:"12px 16px",marginBottom:"1rem"}}>
          <div style={{fontSize:12,color:"#4a3c1a",lineHeight:1.5}}>No signature on file yet. Choose one of the options below — a photographed signature on paper usually looks cleanest.</div>
          {PRELOADED_SIGNATURES[staffId] && (
            <div style={{marginTop:12,paddingTop:12,borderTop:"1px dashed #D4AF37"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#8a6a1c",textTransform:"uppercase",letterSpacing:".3px",marginBottom:6}}>Or — one-tap install</div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:6,flexShrink:0}}>
                  <img src={PRELOADED_SIGNATURES[staffId]} alt="preloaded signature" style={{maxHeight:40,maxWidth:180,display:"block"}}/>
                </div>
                <button
                  onClick={async () => {
                    setUploading(true);
                    setMsg("");
                    try {
                      await saveSignature(staffId, PRELOADED_SIGNATURES[staffId]);
                      setSaved(PRELOADED_SIGNATURES[staffId]);
                      setMode("current");
                      setMsg("✓ Signature installed");
                      setTimeout(()=>setMsg(""), 3000);
                    } catch (err) {
                      setMsg("Install failed: " + (err.message || err));
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  style={{background:"#8a6a1c",color:"white",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",opacity:uploading?0.6:1,flexShrink:0}}
                >{uploading?"Installing…":"🎯 Use this signature"}</button>
              </div>
              <div style={{fontSize:11,color:"#8a6a1c",marginTop:8,lineHeight:1.4,fontStyle:"italic"}}>Pre-loaded image of your signature ready to install — saves you the upload step. You can replace it anytime via Upload or Draw.</div>
            </div>
          )}
        </div>
      )}

      {mode !== "current" && (
        <div style={{display:"flex",gap:8,marginBottom:"1rem"}}>
          <button onClick={()=>{setMode("upload");setDrawing(null);}} style={{flex:1,padding:"10px 14px",border:`1.5px solid ${mode==="upload"?C.teal:C.border}`,borderRadius:8,background:mode==="upload"?C.tealL:"white",color:mode==="upload"?C.teal:C.text,fontSize:13,cursor:"pointer",fontWeight:600}}>📁 Upload PNG / photo</button>
          <button onClick={()=>{setMode("draw");}} style={{flex:1,padding:"10px 14px",border:`1.5px solid ${mode==="draw"?C.teal:C.border}`,borderRadius:8,background:mode==="draw"?C.tealL:"white",color:mode==="draw"?C.teal:C.text,fontSize:13,cursor:"pointer",fontWeight:600}}>✏️ Draw with finger</button>
          {saved && <button onClick={()=>setMode("current")} style={{padding:"10px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"white",color:C.muted,fontSize:13,cursor:"pointer"}}>Cancel</button>}
        </div>
      )}

      {mode === "upload" && (
        <div style={{border:`1.5px dashed ${C.border}`,borderRadius:10,padding:"1.25rem",textAlign:"center",background:C.grayXL}}>
          <div style={{fontSize:13,color:C.text,marginBottom:6,fontWeight:500}}>Upload a photograph or scan of your signature</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:12,lineHeight:1.5}}>Sign on a blank white page, take a clear photo, crop close to the signature. PNG or JPG, under 2MB.</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFilePick} style={{display:"none"}}/>
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{background:C.teal,color:"white",border:"none",borderRadius:8,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer",opacity:uploading?0.6:1}}>{uploading?"Uploading…":"Choose file"}</button>
        </div>
      )}

      {mode === "draw" && (
        <div>
          <SignaturePad onChange={setDrawing} value={null} height={200}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={saveDrawing} disabled={!drawing || uploading} style={{background:C.teal,color:"white",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(!drawing||uploading)?0.5:1}}>{uploading?"Saving…":"✓ Save signature"}</button>
            <button onClick={()=>setMode("current")} style={{padding:"9px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"white",color:C.muted,fontSize:13,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {msg && <div style={{marginTop:"1rem",padding:"8px 14px",background:msg.startsWith("✓")?"#EAF3DE":"#FCEBEB",borderRadius:6,fontSize:12,color:msg.startsWith("✓")?"#0F6E56":C.red,fontWeight:500}}>{msg}</div>}

      {isOwnProfile && saved && (
        <div style={{marginTop:"1.5rem",paddingTop:"1.25rem",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>Retrofill signature on past audits</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.5,marginBottom:12}}>
            Finds 2025 audit records you completed that don't yet have a signature image attached, and applies your saved signature to them. The signed date will match the original audit date, so it looks the same as if you'd signed at the time. Records from 2023/2024 are left untouched.
          </div>

          {retrofillMode === "idle" && (
            <button
              onClick={async () => {
                setRetrofillMode("scanning");
                setRetrofillMsg("Loading audits…");
                try {
                  const audits = loadGen("audits") || [];
                  // Match criteria: year is 2025, no existing signature, and this staff member was the auditor
                  const nameRe = new RegExp(`^\\s*(${staffName}|${staffName.split(" ")[0]}|${staffId})\\s*$`, "i");
                  const candidates = audits.filter(a => {
                    if(!a || !a.date) return false;
                    if(!a.date.startsWith("2025")) return false;
                    if(a.signature) return false; // don't overwrite existing sigs
                    // Special case for peer review: only retrofill if this user was the reviewer
                    if(a.type === "peer_review" && a.peerReviewData){
                      const rev = a.peerReviewData.reviewer || "";
                      return nameRe.test(rev) || a.completedBy === staffId;
                    }
                    // Generic: match on auditor name, signedBy name, or completedBy role
                    const auditor = a.auditor || "";
                    const sb = a.signedBy || "";
                    const cb = a.completedBy || "";
                    return nameRe.test(auditor) || nameRe.test(sb) || cb === staffId;
                  });
                  setRetrofillCandidates(candidates);
                  if(candidates.length === 0){
                    setRetrofillMode("idle");
                    setRetrofillMsg(`✓ No 2025 audits found that need retrofilling. All good.`);
                  } else {
                    setRetrofillMode("preview");
                    setRetrofillMsg("");
                  }
                } catch(e){
                  setRetrofillMode("idle");
                  setRetrofillMsg(`❌ Couldn't load audits: ${e.message}`);
                }
              }}
              style={{background:"white",border:`1.5px solid ${C.teal}`,color:C.teal,borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:600,cursor:"pointer"}}
            >🔍 Scan for 2025 audits to retrofill</button>
          )}

          {retrofillMode === "scanning" && (
            <div style={{fontSize:12,color:C.muted,padding:"10px 0"}}>Scanning records…</div>
          )}

          {retrofillMode === "preview" && (
            <div>
              <div style={{background:"#F5F0FB",border:`1px solid #c7b8e0`,borderLeft:`4px solid #6B46C1`,borderRadius:"0 6px 6px 0",padding:"10px 14px",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#6B46C1",marginBottom:3}}>Found {retrofillCandidates.length} record{retrofillCandidates.length===1?"":"s"} to retrofill</div>
                <div style={{fontSize:11,color:C.text,lineHeight:1.5}}>Review the list below. Clicking "Apply" will add your saved signature image to all of these records with signedAt = the audit's original date.</div>
              </div>

              <div style={{maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:6,marginBottom:12}}>
                {retrofillCandidates.map((a,i) => {
                  const def = AUDIT_FORMS[a.type] || {icon:"📋", title:a.type};
                  return (
                    <div key={a.id || i} style={{padding:"7px 12px",borderBottom:i<retrofillCandidates.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:10,fontSize:11}}>
                      <span style={{fontSize:14}}>{def.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,color:C.text,fontSize:12}}>{a.title || def.title}{a.clinic?` — ${a.clinic}`:""}</div>
                        <div style={{color:C.muted,fontSize:10,marginTop:1}}>{a.date} · {a.auditor || a.completedByName || "—"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button
                  onClick={async () => {
                    setRetrofillMode("saving");
                    setRetrofillMsg(`Applying signature to ${retrofillCandidates.length} records…`);
                    try {
                      const audits = loadGen("audits") || [];
                      const candidateIds = new Set(retrofillCandidates.map(c => c.id));
                      const updated = audits.map(a => {
                        if(!candidateIds.has(a.id)) return a;
                        return {
                          ...a,
                          signature: saved,
                          signedBy: a.signedBy || a.auditor || staffName,
                          signedAt: a.date + "T12:00:00.000Z",  // audit-date-based, noon UTC
                        };
                      });
                      const result = await saveGenImmediate("audits", updated);
                      if(result.ok){
                        setRetrofillMode("done");
                        setRetrofillMsg(`✓ Signature applied to ${retrofillCandidates.length} record${retrofillCandidates.length===1?"":"s"}. Refresh the page to see updated signatures in the history list.`);
                      } else {
                        setRetrofillMode("preview");
                        setRetrofillMsg(`❌ Save failed: ${result.error}`);
                      }
                    } catch(e){
                      setRetrofillMode("preview");
                      setRetrofillMsg(`❌ Retrofill failed: ${e.message}`);
                    }
                  }}
                  style={{background:"#6B46C1",color:"white",border:"none",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:600,cursor:"pointer"}}
                >✓ Apply signature to all {retrofillCandidates.length}</button>
                <button
                  onClick={() => { setRetrofillMode("idle"); setRetrofillCandidates([]); setRetrofillMsg(""); }}
                  style={{padding:"9px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"white",color:C.muted,fontSize:12,cursor:"pointer"}}
                >Cancel</button>
              </div>
            </div>
          )}

          {retrofillMode === "saving" && (
            <div style={{fontSize:12,color:C.muted,padding:"10px 0"}}>⏳ Saving to Drive + portal store…</div>
          )}

          {retrofillMode === "done" && (
            <button
              onClick={() => { setRetrofillMode("idle"); setRetrofillCandidates([]); setRetrofillMsg(""); }}
              style={{padding:"7px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"white",color:C.muted,fontSize:12,cursor:"pointer"}}
            >Close</button>
          )}

          {retrofillMsg && (
            <div style={{marginTop:10,padding:"8px 12px",background:retrofillMsg.startsWith("✓")?"#EAF3DE":retrofillMsg.startsWith("❌")?"#FCEBEB":C.grayXL,borderRadius:6,fontSize:11,color:retrofillMsg.startsWith("✓")?"#0F6E56":retrofillMsg.startsWith("❌")?C.red:C.muted,fontWeight:500,lineHeight:1.5}}>{retrofillMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AuditSignature — used at submit time inside audit modals ────────
// Gives the signer a choice: use their saved signature, or draw fresh.
// onChange receives an object { dataUrl, mode } or null.
function AuditSignature({ staffKey, staffName, onChange, required = true }){
  const savedSig = getSavedSignature(staffKey);
  const [mode, setMode] = useState(savedSig ? "saved" : "draw");
  const [drawing, setDrawing] = useState(null);

  // Emit the right signature upward based on mode
  useEffect(() => {
    if(mode === "saved" && savedSig){
      onChange({ dataUrl: savedSig, mode: "saved" });
    } else if(mode === "draw" && drawing){
      onChange({ dataUrl: drawing, mode: "drawn" });
    } else {
      onChange(null);
    }
  }, [mode, drawing, savedSig]);

  return (
    <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",marginTop:"1rem"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:".4px"}}>Signature {required && <span style={{color:C.red,marginLeft:4}}>*</span>}</div>
        <div style={{fontSize:11,color:C.muted}}>Signing as <b style={{color:C.text}}>{staffName}</b></div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button onClick={()=>setMode("saved")} disabled={!savedSig} style={{flex:1,padding:"8px 12px",border:`1.5px solid ${mode==="saved"?C.teal:C.border}`,borderRadius:8,background:mode==="saved"?C.tealL:"white",color:!savedSig?C.hint:mode==="saved"?C.teal:C.text,fontSize:12,cursor:savedSig?"pointer":"not-allowed",fontWeight:600,opacity:savedSig?1:0.6}}>✓ Use saved signature</button>
        <button onClick={()=>setMode("draw")} style={{flex:1,padding:"8px 12px",border:`1.5px solid ${mode==="draw"?C.teal:C.border}`,borderRadius:8,background:mode==="draw"?C.tealL:"white",color:mode==="draw"?C.teal:C.text,fontSize:12,cursor:"pointer",fontWeight:600}}>✏️ Draw fresh</button>
      </div>
      {mode === "saved" && savedSig && (
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:8,textAlign:"center"}}>
          <img src={savedSig} alt="your signature" style={{maxHeight:80,maxWidth:"100%",objectFit:"contain"}}/>
        </div>
      )}
      {mode === "saved" && !savedSig && (
        <div style={{fontSize:12,color:C.muted,padding:"12px 4px",fontStyle:"italic"}}>No signature on file. Add one via your profile → Signature tab, or draw below.</div>
      )}
      {mode === "draw" && (
        <SignaturePad onChange={setDrawing} value={null} height={140}/>
      )}
    </div>
  );
}

// audit modal
function AuditModal({type,onClose,onComplete,role,roleName}){
  // ── Fire drill uses a dedicated FENZ-style form ──────────────────
  if(type === "fire_drill"){
    return <FireDrillModal onClose={onClose} onComplete={onComplete} role={role} roleName={roleName}/>;
  }
  // ── Peer review uses a dedicated PBNZ-style narrative form ────────
  if(type === "peer_review"){
    return <PeerReviewModal onClose={onClose} onComplete={onComplete} role={role} roleName={roleName}/>;
  }
  // ── Clinical notes audit uses a 16 x 10 grid ───────────────────
  if(type === "clinical_notes"){
    return <NotesAuditGridModal onClose={onClose} onComplete={onComplete} role={role} roleName={roleName}/>;
  }
  const form=AUDIT_FORMS[type];const all=form.sections.flatMap(s=>s.items);
  const[checks,setChecks]=useState({});const[notes,setNotes]=useState({});
  const[meta,setMeta]=useState({clinic:CLINICS[0].short,auditor:roleName||"",physioAudited:"",date:new Date().toISOString().split("T")[0],time:"",duration:""});
  const[overall,setOverall]=useState("");
  // Pass 2 — signature (from AuditSignature component; shape: { dataUrl, mode } | null)
  const[signatureObj,setSignatureObj]=useState(null);
  useEffect(()=>{ if(!_sigCacheLoaded) loadSignatures().catch(()=>{}); },[]);
  const passed=Object.values(checks).filter(v=>v==="pass").length;const failed=Object.values(checks).filter(v=>v==="fail").length;const na=Object.values(checks).filter(v=>v==="na").length;
  const answered=passed+failed+na;const pct=Math.round((answered/all.length)*100);
  function submit(){
    if(!meta.auditor.trim()){alert("Please enter auditor name.");return;}
    if(form.hasPhysioSelect&&!meta.physioAudited){alert("Please select the physiotherapist whose notes are being audited.");return;}
    if(!signatureObj || !signatureObj.dataUrl){alert("Please sign the form before submitting.");return;}
    if(answered<all.length&&!window.confirm(`${all.length-answered} items unanswered. Submit anyway?`))return;
    const fn=Object.entries(notes).filter(([,v])=>v).map(([k,v])=>`• ${k}: ${v}`).join("\n");
    const titleDisplay=form.hasPhysioSelect&&meta.physioAudited?`${form.title} — ${meta.physioAudited}`:form.title;
    onComplete({id:Date.now(),type,title:titleDisplay,icon:form.icon,clinic:meta.clinic,auditor:meta.auditor,physioAudited:meta.physioAudited||null,date:meta.date,passed,failed,na,total:all.length,outcome:failed===0?"Passed":`${failed} issue${failed>1?"s":""} found`,notes:(fn+(overall?`\nNotes: ${overall}`:"")).trim(),signature:signatureObj.dataUrl,signedBy:meta.auditor,signedAt:new Date().toISOString()});
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
            <AuditSignature staffKey={role||"staff"} staffName={meta.auditor||roleName||"Staff member"} onChange={setSignatureObj}/>
            <div style={{marginTop:"1rem"}}>
              <Btn onClick={submit}>Submit audit record</Btn>
            </div>
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
            {[["certs","📋 Compliance"],["empinfo","📝 Employee Info"],["profile","👤 Profile"],["signature","✍️ Signature"],["orientation","✓ Orientation"]].map(([t,l])=>(
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
            {tab==="signature"&&<SignatureTab staffId={id} staffName={s.name} role={role}/>}
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
  _mk(9101,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Dylan Connolly","2023-10-20",15,3,1,19,"3 issues found","Audit of 5 current + 5 past records. Consent 0% (major issue). Goals: Identified 70%, Measurable 0%, Time bound 10%. Adverse reaction warnings 0%. To work on: Goal Setting — SMART, Warnings re adverse Rx effects, Evidence of explanation of Ax + Rx.","Jade Warren"),
  _mk(9102,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Dylan Connolly","2023-10-20",14,4,1,19,"Several issues","Audit of 5 current + 5 past records. Consent 100%, Assessment 90–100%. Goals: Identified 0%, Measurable 0%, Time bound 0%. DC summaries 20%, Goals evaluated 20%. To work on: Goal Setting, Complete DC Summaries, Completing notes for each appointment.","Timothy Keung"),
  _mk(9103,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Dylan Connolly","2023-10-20",15,3,1,19,"3 issues found","Audit of 5 current + 5 past records. Notes logical 100%, Consent 100%, Assessment 100%. Goals: Identified 10%, Measurable 0%, Time bound 0%. Adverse reactions 0%, DC summaries 0%. To work on: Goal Setting — SMART, Note warnings re adverse Rx reactions, Discharging patients.","Hans Vermeulen"),
  _mk(9104,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2023-12-11",17,1,1,19,"DC summaries to complete","Dylan's clinical notes audit. 5 current + 5 past records. Most items 100%. DC summaries 20%, Goals evaluated 80%. To work on: Ensure discharge summaries completed for discharged patients — follow up phonecall or visit. Goals — always measurable, time bound.","Dylan Connolly"),
  _mk(9105,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2024-08-07",19,0,0,19,"Passed","Hans's H1 2024 notes audit. 5 current + 5 past records. All criteria 100% except Time bound 80%. 'Great notes' — very strong documentation across the board. No work-ons identified.","Hans Vermeulen"),
  _mk(9106,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Hans Vermeulen","2024-08-07",17,2,0,19,"2 issues found","Jade's H1 2024 notes audit, audited by Hans. All sections strong (100%). Discharge summary 80%, Goals Time bound 80%. To work on: Inconsistent use of VAS, Discharge planning in place but follow up for DC not completed on occasions.","Jade Warren"),
  _mk(9107,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2024-08-07",11,7,1,19,"Multiple issues","Alistair's H1 2024 notes audit. Notes 100%, Consent 100%. Goals: Measurable 50%, Time bound 0%. Treatment plan 70%, Treatment given 80%, Review 70%, DC summaries 0%. To work on: Notes incomplete, missing notes, avoid copy & paste notes, GOALS — need to be SMART (identified but no measure or time frame), D/C summaries not complete.","Alistair Burgess"),
  _mk(9108,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2024-08-07",12,6,1,19,"Multiple issues","Tim's H1 2024 notes audit. Notes 100%, Consent 100%, Assessment 80–100%. Goals: Measurable 0%, Time bound 0%. Treatment given 70%, Review 80%, DC 0%. To work on: Goals — not measurable or time bound, Notes incomplete — not done, No discharges done or incomplete, To do summaries.","Timothy Keung"),
  _mk(9109,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2024-08-07",16,2,1,19,"2 issues found","Dylan's H1 2024 notes audit. Most sections 100%. Goals: Measurable 70%, Time bound 70%. DC summaries 60%. To work on: Goals to be time framed e.g. 4 weeks, Measurable, Make sure Discharge summaries are completed.","Dylan Connolly"),
  _mk(9110,"clinical_notes","Clinical Notes Audit","📋","Flat Bush","Jade Warren","2024-08-07",18,1,0,19,"1 minor issue","Isabella's first notes audit. All criteria 100% across both current and past records. Very strong foundation. To work on: More detail needed in notes.","Isabella Yang"),
  _mk(9111,"clinical_notes","Clinical Notes Audit","📋","Titirangi","Jade Warren","2025-02-15",18,1,0,19,"1 minor issue","Hans's H2 2024 notes audit. Continued strong documentation. Minor refinements only.","Hans Vermeulen"),
  _mk(9112,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Alistair Burgess","2025-02-15",18,1,0,19,"Improved from H1","Jade's H2 2024 notes audit, audited by Alistair. Improvement on VAS use and discharge follow-ups from previous audit.","Jade Warren"),
  _mk(9113,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-02-15",15,3,1,19,"Improved","Alistair's H2 2024 notes audit. SMART goals much improved since August audit. Discharge summaries now being completed. Still some work on consistency with treatment plan detail.","Alistair Burgess"),
  _mk(9114,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-02-15",14,4,1,19,"Partial improvement","Tim's H2 2024 notes audit. Goals now attempted SMART format. Still gaps in discharge summaries. Continue working on completion of notes per session.","Timothy Keung"),
  _mk(9115,"clinical_notes","Clinical Notes Audit","📋","Pakuranga","Jade Warren","2025-02-15",17,2,0,19,"Improved","Dylan's H2 2024 notes audit. Goals now time-framed. DC summaries being completed. Strong improvement overall.","Dylan Connolly"),
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
  const reminders=getReminders(audits,meetings,inservices);const urgentCount=reminders.filter(r=>r.status!=="ok").length;

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
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{r.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{r.target} · {r.freq} · Next: {r.nextDate}{r.lastDone?` · Last done: ${r.lastDone}`:""}</div></div>
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
        <Tbl headers={["Staff","Peer Review","Last date","Appraisal","Last date","Notes"]}>{Object.entries(STAFF).map(([id,s])=>{
          const pr=loadFile(id,"peerreview");const ap=loadFile(id,"appraisal");
          // Review certs don't carry a real expiry — ignore any OCR-captured expiry.
          // Check for peer_review audit records as fallback
          const prAudit=[...audits].filter(x=>x.type==="peer_review"&&x.physioAudited===s.name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
          const hasPr=!!(pr||prAudit);
          const prLabel=prAudit?fmtNZ(prAudit.date):(pr?"On file ✓":"Needed");
          const prStatus=hasPr?"ok":"pending";
          // Check for appraisal audit records too
          const apAudit=[...audits].filter(x=>x.type==="appraisal"&&x.physioAudited===s.name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
          const hasAp=!!(ap||apAudit);
          const apLabel=apAudit?fmtNZ(apAudit.date):(ap?"On file ✓":"Needed");
          const apStatus=hasAp?"ok":"pending";
          const n={alistair:"Clinical Director",hans:"20+ years",dylan:"Contractor since 2025",ibrahim:"New grad",komal:"Contractor",gwenne:"First cycle"}[id]||"Annual cycle";
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={prStatus} label={prLabel}/></TD>
            <TD style={{fontSize:11,color:prAudit?C.green:C.hint}}>{prAudit?fmtNZ(prAudit.date):"—"}</TD>
            <TD><Pill s={apStatus} label={apLabel}/></TD>
            <TD style={{fontSize:11,color:apAudit?C.green:C.hint}}>{apAudit?fmtNZ(apAudit.date):"—"}</TD>
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
      {activeAudit&&<AuditModal type={activeAudit} role={role} roleName={roleNames[role]||"Staff member"} onClose={()=>setActiveAudit(null)} onComplete={r=>{setAudits(p=>{const updated=[...p,r];saveGen("audits",updated);return updated;});setActiveAudit(null);setPage("management");setMgmtTab("audits");}}/>}
      {eavf&&<FileViewer file={eavf} onClose={()=>setEavf(null)}/>}
      {vf&&<FileViewer file={vf} onClose={()=>setVf(null)}/>}
    </div>
  );
}
