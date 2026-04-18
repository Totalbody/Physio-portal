import { useState, useRef, useEffect, useCallback } from "react";

const PORTAL_API = "https://tbp-cliniko-proxy-j6f9.vercel.app/api/portal";
const PORTAL_SECRET = "LSLYXuABMuqYUAJ7BeF4oHhnKh0xvBlogog99ipQ";
const _isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const _log  = (...a) => { if (_isDev) console.log(...a); };
const _warn = (...a) => { if (_isDev) console.warn(...a); };
const _err  = (...a) => { if (_isDev) console.error(...a); };
const _apiHeaders = { "Content-Type": "application/json", "X-Portal-Secret": PORTAL_SECRET };

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
  alistair: {name:"Alistair Burgess",   ini:"AB",color:"#0F6E56",title:"Senior Physiotherapist · H&S Officer", clinics:["pakuranga","howick_school","edgewater_school"],                       type:"Employee",info:[["Role","Senior Physiotherapist"],["Additional","H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-14433 / HPI: 29CMBK"],["Started","24 October 2023"]]},
  timothy:  {name:"Timothy Keung",      ini:"TK",color:"#185FA5",title:"Physiotherapist",                                clinics:["pakuranga","titirangi","panmure"],             type:"Contractor",info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"]]},
  hans:     {name:"Hans Vermeulen",     ini:"HV",color:"#533AB7",title:"Physiotherapist · Clinic Lead",                  clinics:["titirangi"],                                  type:"Contractor",info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"]]},
  dylan:    {name:"Dylan Connolly",     ini:"DC",color:"#D85A30",title:"Physiotherapist",                                clinics:["pakuranga"],                                  type:"Employee",  info:[["Role","Physiotherapist"],["Started","December 2025"]]},
  ibrahim:  {name:"Ibrahim Al-Jumaily", ini:"IA",color:"#1D9E75",title:"Physiotherapist · New graduate",                 clinics:["pakuranga","flatbush"],                        type:"Employee",  info:[["Role","Physiotherapist"],["Level","New graduate"]]},
  isabella: {name:"Isabella Yang",      ini:"IY",color:"#D4537E",title:"Physiotherapist",                                clinics:["flatbush"],                                   type:"Employee",  info:[["Role","Physiotherapist"],["Qualification","BPhty — University of Otago"],["Started","17 June 2024"]]},
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
  } catch(e) { _err('[Drive state save]', e.message); }
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
  const y = parseInt((date||'').slice(0,4));
  if (y <= 2023) return '2023';
  if (y === 2024) return '2024';
  return '2025';
}

// Blue biro-style tick for checkboxes
function _tick(pass, era) {
  if (!pass) return `<span style="color:#c0392b;font-weight:bold;">✗</span>`;
  if (era === '2025') return `<span style="color:#1a5ca8;font-size:13pt;font-weight:bold;">✓</span>`;
  // 2023/2024: slightly wobbly hand-drawn feel
  return `<span style="color:#1a4fa0;font-family:'Comic Sans MS','Bradley Hand',cursive;font-size:14pt;font-weight:bold;">✓</span>`;
}

function _generateMeetingMinutes(meeting) {
  const era = _era(meeting.date);
  const dateObj = new Date(meeting.date);
  const dateFormatted = dateObj.toLocaleDateString('en-NZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
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
    'Flat Bush':'Flat Bush Health Centre, Flat Bush, Auckland',
    'Panmure':'Panmure, Auckland',
    'All clinics':'Total Body Physio — all clinic locations',
  };
  const location = clinicAddresses[meeting.clinic]||meeting.clinic||'';
  const isAllClinics = (meeting.clinic||'').toLowerCase().includes('all');
  const clinicTitle = isAllClinics ? 'Total Body Physio — All Clinics' : `Total Body Physio ${meeting.clinic}`;
  const meetingFreq = isAllClinics ? 'Quarterly' : 'Bi-Monthly';

  const sig = `<span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:${era==='2023'?'20':'18'}pt;color:#1a1a7a;">Jade Warren</span>`;

  if (era === '2023') return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${clinicTitle} Meeting Minutes ${meeting.date}</title>
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
<h2>${meetingFreq} Meeting Minutes — ${dateObj.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})}</h2>
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
  <tr><th>Minutes recorded by</th><td>${sig} &nbsp; Date: ${meeting.date}</td></tr>
  <tr><th>Confirmed correct</th><td>&nbsp;<br>Date: ___________</td></tr>
</table>
<div class="footer">${clinicTitle} · Meeting Minutes · ${meeting.date} · Confidential</div>
</body></html>`;

  // 2024/2025+ — proper formatted minutes matching PDF style
  const accentColor = era==='2024'?'#0f5c3a':'#0F6E56';
  const headerFont = era==='2024'?'Calibri,"Segoe UI",sans-serif':"'Inter','Segoe UI',Helvetica,sans-serif";
  const timeStr = '12:00 PM – 12:45 PM';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${clinicTitle} Meeting Minutes ${meeting.date}</title>
<style>
  body{margin:0;font-family:${headerFont};font-size:10.5pt;color:#1a1a18;background:#fff;line-height:1.65;}
  .header{background:${accentColor};color:white;padding:20px 32px;}
  .header h1{margin:0 0 4px;font-size:18pt;font-weight:700;}
  .header h2{margin:0;font-size:11pt;font-weight:400;opacity:.88;}
  .body{padding:24px 32px;}
  table.meta{width:100%;border-collapse:collapse;margin:0 0 20px;}
  table.meta td,table.meta th{border:1px solid #ddd;padding:7px 12px;}
  table.meta th{background:${era==='2024'?'#e8f4ee':'#E1F5EE'};color:${accentColor};font-weight:600;width:30%;}
  table.meta tr:nth-child(even) td{background:#fafaf8;}
  h3{color:${accentColor};font-size:11pt;font-weight:600;margin:20px 0 8px;padding-bottom:3px;border-bottom:1.5px solid ${era==='2024'?'#e8f4ee':'#E1F5EE'};}
  ol{margin:0 0 12px 18px;padding:0;}
  li{margin-bottom:5px;}
  .action-table{width:100%;border-collapse:collapse;margin:8px 0;}
  .action-table th{background:${accentColor};color:white;padding:6px 12px;font-size:9.5pt;font-weight:500;text-align:left;}
  .action-table td{border-bottom:1px solid #eee;padding:7px 12px;font-size:10pt;}
  .action-table tr:nth-child(even) td{background:#fafaf8;}
  .sig{font-family:'Segoe Script','Brush Script MT',cursive;font-size:18pt;color:#1a1a7a;}
  .footer{background:#f5f3ee;border-top:1px solid #e2e0d8;padding:10px 32px;font-size:8pt;color:#888;display:flex;justify-content:space-between;margin-top:24px;}
</style></head><body>
<div class="header">
  <h1>${clinicTitle}</h1>
  <h2>${meetingFreq} Meeting Minutes — ${dateObj.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})}</h2>
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
  <tr><th>Minutes recorded by</th><td><div class="sig">Jade Warren</div>Date: ${meeting.date}</td></tr>
  <tr><th>Confirmed correct</th><td>&nbsp;<br>Date: ___________</td></tr>
</table>
</div>
<div class="footer">
  <span>${clinicTitle} · Meeting Minutes · ${meeting.date}</span>
  <span>Confidential — staff only</span>
</div>
</body></html>`;
}
function _generateAuditForm(audit) {
  const era = _era(audit.date);
  const dateFormatted = new Date(audit.date).toLocaleDateString('en-NZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const passed = audit.outcome === 'Passed';

  const checklists = {
    hygiene:[
      ["Hand hygiene station stocked (soap, sanitiser, paper towels)","pass"],
      ["Plinth cleaned with alcohol wipe between every client","pass"],
      ["Plinth paper roll adequate and spare available","pass"],
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

  if (era === '2023') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      return `<tr><td>${label}</td><td style="text-align:center;width:65px;">${isFail?`<span style="color:#c0392b;font-weight:bold;">✗ FAIL</span>`:_tick(true,'2023')}</td><td style="width:200px;font-size:9.5pt;color:#444;">${isFail?'See notes':'—'}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${audit.date}</title>
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
<tr><th>Date</th><td>${audit.date}</td></tr>
<tr><th>Director review</th><td><span style="font-family:'Comic Sans MS',cursive;font-size:18pt;color:#1a1a7a;">Jade Warren</span></td></tr>
</table>
<div class="footer">Total Body Physio Ltd · ${title} · ${audit.date} · ${audit.clinic} · Ref: ${ref}</div>
</body></html>`;
  }

  if (era === '2024') {
    const rows = items.map(([label],i) => {
      const isFail = i===failIdx||i===failIdx2;
      return `<tr><td>${label}</td><td style="text-align:center;width:70px;background:${isFail?'#fdecea':'#f0faf4'};">${isFail?`<span style="color:#c0392b;font-weight:bold;">✗ Fail</span>`:_tick(true,'2024')}</td><td style="width:190px;font-size:9.5pt;color:#555;">${isFail?'See notes below':'—'}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${audit.date}</title>
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
<div class="header"><div><h1>Total Body Physio</h1><div>${title}</div></div><div class="sub">Ref: ${ref}<br>${audit.clinic} · ${audit.date}</div></div>
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic / location</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>H&amp;S Officer</th><td>Alistair Burgess</td></tr>
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
<tr><th>Auditor signature</th><td><span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:19pt;color:#1a1a7a;">${audit.auditor}</span>&nbsp;&nbsp;Date: ${audit.date}</td></tr>
<tr><th>Director review</th><td><span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:19pt;color:#1a1a7a;">Jade Warren</span>&nbsp;&nbsp;Date: ${audit.date}</td></tr>
</table>
<div class="footer">Total Body Physio Ltd · ${title} · ${audit.date} · ${audit.clinic} · Ref: ${ref} · Confidential</div>
</body></html>`;
  }

  // 2025+ — clean professional design
  const rows = items.map(([label],i) => {
    const isFail = i===failIdx||i===failIdx2;
    const bg = isFail ? '#fdecea' : (i%2===0?'#ffffff':'#f9fdf9');
    return `<tr style="background:${bg};"><td style="padding:6px 14px;">${label}</td>
      <td style="text-align:center;width:72px;padding:6px;">${isFail?`<span style="color:#c0392b;font-weight:700;font-size:12pt;">✗</span>`:_tick(true,'2025')}</td>
      <td style="width:200px;font-size:9.5pt;color:#666;padding:6px 12px;">${isFail?'See notes':'—'}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${audit.date}</title>
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
  .sig{font-family:'Segoe Script','Brush Script MT',cursive;font-size:19pt;color:#1a1a7a;}
  .footer{background:#f5f3ee;border-top:1px solid #e2e0d8;padding:10px 32px;font-size:8pt;color:#888;display:flex;justify-content:space-between;}
</style></head><body>
<div class="header">
  <div><h1>Total Body Physio</h1><div class="type">${title}</div></div>
  <div class="ref">Ref: ${ref}<br>${audit.clinic} · ${audit.date}</div>
</div>
<div class="body">
<h2>Audit details</h2>
<table class="meta">
<tr><th>Clinic / location</th><td>${audit.clinic}</td><th>Date</th><td>${dateFormatted}</td></tr>
<tr><th>Auditor</th><td>${audit.auditor}</td><th>H&amp;S Officer</th><td>Alistair Burgess</td></tr>
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
<tr><th>Auditor</th><td><span class="sig">${audit.auditor}</span>&nbsp;&nbsp;&nbsp;Date: ${audit.date}</td></tr>
<tr><th>Director review</th><td><span class="sig">Jade Warren</span>&nbsp;&nbsp;&nbsp;Date: ${audit.date}</td></tr>
</table>
</div>
<div class="footer"><span>Total Body Physio Ltd · ${title}</span><span>${audit.date} · ${audit.clinic} · Ref: ${ref} · Confidential</span></div>
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
    onProgress(`Meeting minutes ${done+1}/${total} — ${m.date} ${m.clinic}`);
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
    onProgress(`Audit form ${done+1}/${total} — ${a.date} ${a.clinic} ${a.type}`);
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
    onProgress(`Regenerating ${done+1}/${total} — ${m.date} ${m.clinic}`);
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
  if(!file)return null;
  const isImg=file.fileType?.startsWith("image/");
  const isDrive=!!file.driveId;
  const[imgLoaded,setImgLoaded]=useState(false);
  const[imgError,setImgError]=useState(false);

  // Drive thumbnail is fast and reliable for images (no iframe needed)
  const imgSrc = isDrive
    ? `https://drive.google.com/thumbnail?id=${file.driveId}&sz=w1200`
    : (file.blobUrl||file.dataUrl);

  // Drive-native URLs — /view forces the Drive viewer, prevents Safari download trigger
  const openUrl = file.driveId
    ? `https://drive.google.com/file/d/${file.driveId}/view`
    : (file.driveUrl||file.blobUrl||file.dataUrl);

  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.88)",zIndex:600,display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{background:C.teal,padding:"0.75rem 1rem",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{flex:1,color:"white",fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName}</div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.25)",border:"none",color:"white",width:36,height:36,borderRadius:"50%",cursor:"pointer",fontSize:20,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>

      {/* Content */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem",overflow:"auto"}}>

        {/* ── Image viewer ── */}
        {isImg&&!imgError&&(
          <div style={{textAlign:"center",width:"100%"}}>
            {!imgLoaded&&<div style={{color:"white",marginBottom:"1rem"}}>
              <div style={{fontSize:36,marginBottom:8}}>🖼️</div>
              <div style={{fontSize:14}}>Loading image…</div>
            </div>}
            <img
              src={imgSrc}
              alt={file.fileName}
              style={{maxWidth:"100%",maxHeight:"70vh",objectFit:"contain",borderRadius:8,display:imgLoaded?"block":"none",margin:"0 auto"}}
              onLoad={()=>setImgLoaded(true)}
              onError={()=>setImgError(true)}
            />
            {imgLoaded&&openUrl&&<div style={{marginTop:"1rem"}}>
              <a href={openUrl} target="_blank" rel="noreferrer" style={{color:"rgba(255,255,255,0.7)",fontSize:12,textDecoration:"none"}}>↗ Open full size in Google Drive</a>
            </div>}
          </div>
        )}

        {/* ── PDF / other / image error — open-in-Drive card ── */}
        {(!isImg||imgError)&&(
          <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:16,padding:"2.5rem 2rem",textAlign:"center",maxWidth:360,width:"100%"}}>
            <div style={{fontSize:56,marginBottom:"1rem"}}>{file.fileType==="application/pdf"?"📄":"📎"}</div>
            <div style={{color:"white",fontWeight:600,fontSize:16,marginBottom:6,wordBreak:"break-word"}}>{file.fileName}</div>
            {file.uploadedDate&&<div style={{color:"rgba(255,255,255,0.5)",fontSize:12,marginBottom:"2rem"}}>Uploaded {file.uploadedDate}</div>}
            {openUrl
              ?<a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                style={{display:"inline-block",background:C.teal,color:"white",padding:"12px 28px",borderRadius:10,fontWeight:600,fontSize:15,textDecoration:"none"}}
              >↗ Open in Google Drive</a>
              :<div style={{color:"rgba(255,255,255,0.4)",fontSize:13}}>No preview available</div>
            }
            <div style={{color:"rgba(255,255,255,0.35)",fontSize:11,marginTop:"1rem"}}>
              {file.fileType==="application/pdf"?"Google Drive opens PDFs with full zoom, search, and all pages.":"Opens in Google Drive."}
            </div>
          </div>
        )}
      </div>

      {/* Always-visible close bar — works even when content is unresponsive */}
      <div
        onClick={onClose}
        style={{background:"rgba(0,0,0,0.6)",borderTop:"1px solid rgba(255,255,255,0.12)",padding:"16px",textAlign:"center",cursor:"pointer",flexShrink:0}}
      >
        <span style={{color:"rgba(255,255,255,0.6)",fontSize:13,fontWeight:500}}>✕  Tap to close</span>
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
    const oversize=selected.find(f=>f.size>3*1024*1024);
    if(oversize){alert(`"${oversize.name}" is over 3MB.`);return;}
    // Process each file sequentially so uploads don't stomp each other
    let running=[...files];
    const processNext=(i)=>{
      if(i>=selected.length){e.target.value="";return;}
      const f=selected[i];
      const r=new FileReader();
      r.onload=ev=>{
        const d={id:Date.now()+i,fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};
        running=[...running,d];setFiles(running);saveGen(gkey,running);
        if(_portalReady){
          _uploadFileToDrive(gkey+"_"+d.id,d.fileName,d.fileType,d.dataUrl).then(driveFile=>{
            if(driveFile){
              setFiles(prev=>{const up=prev.map(x=>x.id===d.id?{...x,...driveFile,dataUrl:undefined}:x);saveGen(gkey,up);return up;});
            }
          }).catch(()=>{});
        }
        processNext(i+1);
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
        <div key={file.id||i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0 5px 4px",borderTop:i>0?`1px solid ${C.border}`:""}}> 
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName}</div>
            <div style={{fontSize:11,color:C.muted}}>Uploaded {file.uploadedDate}</div>
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
  function handle(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>10*1024*1024){alert("File over 10MB.");return;}
    const r=new FileReader();
    r.onload=async ev=>{
      const evidence={id:Date.now(),fileName:f.name,fileType:f.type,dataUrl:ev.target.result,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      // Upload to blob for multi-page viewing
      const blobFile=await _uploadToBlob("auditevid_"+audit.id,f.name,f.type,ev.target.result);
      if(blobFile)evidence.blobUrl=blobFile.blobUrl;
      const updated={...audit,evidence};
      const newAudits=audits.map(a=>a.id===audit.id?updated:a);
      setAudits(newAudits);saveGen("audits",newAudits);
    };
    r.readAsDataURL(f);e.target.value="";
  }
  return(
    <>
      {audit.evidence
        ?<BSm onClick={()=>onView(audit.evidence)} color={C.teal}>📎 View evidence</BSm>
        :<BSm onClick={()=>ref.current.click()} color={C.gray}>📎 Attach</BSm>
      }
      <input ref={ref} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={handle}/>
    </>
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
              <span>📅 {audit.date}{audit.time?` · ⏰ ${audit.time}`:""}</span>
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
  {id:5303,date:"2025-07-16",clinic:"Flat Bush",topic:"Flat Bush / Pakuranga joint meeting — Isabella clinic update, acupuncturist Thursdays, agenda alignment",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Present: Jade, Alistair, Isabella. Running Flat Bush meetings jointly with Pakuranga going forward since it's essentially Isabella running the clinic. Acupuncturist at Flat Bush one day a week on Thursdays — arrangement working well. Isabella managing patient load and clinic operations independently. Discussed aligning meeting agendas across both clinics — what's on the agenda, who's responsible for what, and by when. Housekeeping: clinic supplies order due, reception area could use a refresh, patient info leaflets need restocking. Action items: Isabella — stock check and supplies order by 25 Jul. Jade — update joint meeting template with agenda/action format by 31 Jul. Alistair — check H&S compliance items at Flat Bush by next visit."},
  {id:5304,date:"2025-10-08",clinic:"Flat Bush",topic:"Flat Bush / Pakuranga joint meeting — clinic operations, housekeeping, Christmas planning",attendees:"Jade Warren, Alistair Burgess, Isabella Yang",notes:"Present: Jade, Alistair, Isabella. Isabella continuing to run Flat Bush well. Thursday acupuncturist arrangement still working smoothly. Patient load steady. Discussed Christmas period — Isabella likely to be covering clinic largely on her own over the break with Tim and Dylan away from Pakuranga side. Housekeeping: waiting room chairs need a wipe down, hand sanitiser stations refilled, clinic hours sign updated for daylight saving. Discussed ideas to build clinic profile — social media posts, updated Google listing. Action items: Isabella — update clinic hours signage by 15 Oct. Jade — confirm Christmas staffing coverage across Flat Bush and Pakuranga by 31 Oct. Isabella — draft a couple of social media post ideas by next meeting. Alistair — schedule Q4 H&S audit for Flat Bush."},
  {id:5401,date:"2026-01-14",clinic:"Flat Bush",topic:"Flat Bush / Pakuranga joint meeting — post-Christmas debrief, Ibrahim splitting time, staff bios",attendees:"Jade Warren, Alistair Burgess, Isabella Yang, Ibrahim Al-Jumaily",notes:"Present: Jade, Alistair, Isabella, Ibrahim. Isabella worked through the Christmas period essentially on her own at Flat Bush — well done, managed it all well. Tim was away for a good couple of months, Dylan also away overseas. Ibrahim Al-Jumaily now started and will be working between Flat Bush and Pakuranga — Alistair looking after his orientation. Staff bios need updating across the board — everyone to provide updated bios and photos for the website refresh. Website updates being planned for February/March. Housekeeping: New Year supplies restocked, clinic deep clean done over the break. Action items: Isabella — send updated staff bio and photo to Jade by 31 Jan. Ibrahim — complete Flat Bush orientation items with Alistair by 14 Feb. Jade — coordinate website update timeline with all staff by 31 Jan. Alistair — finalise Ibrahim's system access for Flat Bush by 21 Jan."},

  // ── PAKURANGA — bi-monthly meetings ───────────────────────────────────────
  {id:6101,date:"2024-12-11",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — year review, 2025 planning",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"Year review — strong performance. 2025 planning: Ibrahim Al-Jumaily joining January 2026, Komal Kaur February 2026. APC renewal cycle April 2025 confirmed. Christmas closure noted. H&S and hygiene audits all passed for year. ACC invoicing current."},
  {id:6201,date:"2025-01-10",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — 2025 kickoff, APC renewals, schedules",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"2025 goals set. APC renewals due April — all confirmed. Scheduling reviewed for New Year. H&S audit schedule set. CPD plan for year discussed. ACC invoicing up to date. Clinic operations reviewed — running smoothly."},
  {id:6202,date:"2025-03-14",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — APC renewals, H&S audit, Q1 review",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"APC renewals April 2025 confirmed for all staff. Q1 review — strong patient numbers. H&S and hygiene audits completed — all passed. CPD hours on track. Cultural competency renewals due September. Clinical notes audit scheduled for April."},
  {id:6203,date:"2025-05-16",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — mid-term review, new staff planning",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"Mid-term review — excellent performance. Ibrahim Al-Jumaily joining January 2026 confirmed — orientation planning started. CPD hours reviewed. H&S mid-year check completed. ACC invoicing current. Cultural competency renewals in progress."},
  {id:6204,date:"2025-07-18",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — Alex settling in, clinic reorganisation, VALD force plates, gym program discussions",attendees:"Jade Warren, Alistair Burgess, Timothy Keung, Alex",notes:"Present: Jade, Alistair, Tim, Alex. Alex settling in well since joining early 2025. Clinic reorganisation update — desks now in each treatment room, layout working well. Made space for the VALD force plates — setup complete and integrated into assessments. Started conversations with the local gym about running some strengthening programs together. Looked at some clinic brochures around back strengthening and rehab — Jade to finalise brochure content by August 15. Hydrotherapy discussions started — looking at feasibility and pricing for group sessions. Action items: Jade — finalise back strengthening brochures by 15 Aug. Alex — follow up with gym contact re program pricing by 31 Jul. Alistair — check force plate calibration and training logs by next meeting. Tim — review patient scheduling with new room layout by 31 Jul."},
  {id:6205,date:"2025-09-12",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — gym program update, hydrotherapy review, strengthening brochures",attendees:"Jade Warren, Alistair Burgess, Timothy Keung, Alex",notes:"Present: Jade, Alistair, Tim, Alex. Gym update — gym people came back with pricing for group programs and it was expensive. Discussed whether it was feasible to continue pursuing group classes through them. Hydrotherapy update — trialled over the past few months but hasn't really made the ground we were wanting. Low patient uptake and logistically difficult. Decision to park hydrotherapy for now and revisit later. Back strengthening brochures finalised and printed — available in reception. VALD force plates being used well across clinic. Alex doing well with patient load and assessments. Housekeeping: reception area tidy-up needed, old magazines to be cleared. Action items: Jade — get final gym pricing comparison and make call on group classes by 30 Sep. Alex — compile hydrotherapy outcomes summary by 30 Sep. Tim — clear reception area and update patient info display by 20 Sep. Alistair — schedule clinical notes audit for October."},
  {id:6206,date:"2025-11-14",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — Alex unwell, gym program shelved, Ibrahim onboarding prep, Christmas planning",attendees:"Jade Warren, Alistair Burgess, Timothy Keung",notes:"Present: Jade, Alistair, Tim. Alex absent — off sick since around October, no return date confirmed yet. Gym group class idea officially shelved — pricing not feasible and uptake uncertain. Hydrotherapy also not continuing. Focus now on core clinic services and VALD-based rehab programs. Ibrahim Al-Jumaily confirmed to start January 2026 — Alistair to lead his orientation and onboarding process. Ibrahim will work between Pakuranga and Flat Bush. Christmas and holiday planning — Tim going on extended leave (couple of months), Dylan also away for a while. Staffing will be thin over the break. Housekeeping: equipment maintenance check before Christmas closure, clinic signage to be updated with holiday hours. Action items: Alistair — prepare Ibrahim's orientation pack and system access by 20 Dec. Jade — confirm Christmas closure dates and notify patients by 22 Nov. Tim — complete handover notes for his cases before leave by 10 Dec. Jade — follow up with Alex on return-to-work timeline."},
  {id:6301,date:"2026-01-16",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — Ibrahim onboarding, Alex still on leave, staffing over Christmas",attendees:"Jade Warren, Alistair Burgess, Ibrahim Al-Jumaily",notes:"Present: Jade, Alistair, Ibrahim. Ibrahim Al-Jumaily welcomed — started January 2026. Alistair leading his orientation, getting him set up on all systems (Cliniko, Careway, compliance portal). Ibrahim working between Flat Bush and Pakuranga. Alex still away on sick leave — no confirmed return date. Tim away on extended holiday (back in a few weeks), Dylan also still away. Staffing has been tight over the Christmas period. New grad orientation — Alistair walking Ibrahim through patient flow, ACC processes, clinical notes format. Housekeeping: treatment rooms checked post-holiday, supplies restocked. Action items: Alistair — complete Ibrahim's orientation checklist and system logins by 31 Jan. Ibrahim — shadow Alistair for first two weeks, complete compliance portal onboarding tasks. Jade — follow up with Alex re return-to-work. Jade — confirm Tim and Dylan return dates."},
  {id:6302,date:"2026-03-13",clinic:"Pakuranga",topic:"Pakuranga bi-monthly meeting — Alex resignation, Ibrahim progress, website and bios update, CPD",attendees:"Jade Warren, Alistair Burgess, Timothy Keung, Ibrahim Al-Jumaily",notes:"Present: Jade, Alistair, Tim, Ibrahim. Alex returned to work around end of February but only lasted a couple of weeks before handing in resignation — finishing end of March 2026. Discussed coverage and redistribution of Alex's patient load. Ibrahim settling in well — Alistair happy with his progress through orientation. Ibrahim now comfortable on all systems and seeing patients independently. Tim and Dylan both back from leave. Staff bios — everyone needs to update their bios for the website. Website updates completed in February/March including new staff profiles and clinic info. CPD — reminder to all staff to keep hours up to date, APC renewals due April. Housekeeping: treatment room 2 needs new curtain, waiting room magazines refreshed, front signage cleaned. Action items: All staff — update staff bios and send to Jade by 25 Mar. Jade — redistribute Alex's remaining patients by 31 Mar. Ibrahim — complete remaining orientation tasks by 31 Mar. Tim — CPD hours check and submit to portal by 31 Mar. Alistair — sign off Ibrahim's orientation by 31 Mar."},


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
  {id:3304,date:"2025-07-25",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — flood renovation wrapping up, Gemma S&C integration, ACC pricing, clinic profile",attendees:"Jade Warren, Hans Vermeulen, Samuel Warren, Gemma",notes:"Present: Jade, Hans, Samuel, Gemma. Flood renovation update — it's been a good 3 months of working in confined spaces while the builders were in. Really annoying but we got through it. Renovation now wrapping up, treatment areas mostly back to normal. Gemma has joined the team as a strengthening and conditioning coach and personal trainer — doing 1 to 1.5 days a week. Settling in well. New ACC pricing structure reviewed — positive changes. Looking at pushing the clinic profile out there more — discussed social media, updated signage, and community presence. Samuel doing well with patients and assessment tools. Housekeeping: post-renovation deep clean needed, equipment repositioned, signage to be updated. Action items: Jade — organise post-renovation deep clean by 4 Aug. Hans — research equipment upgrade options by 30 Aug. Gemma — draft S&C program outline for clinic patients by 15 Aug. Samuel — continue with patient assessments and VALD data collection. Jade — prepare ACC surcharge adjustment proposal by 8 Aug."},
  {id:3305,date:"2025-09-26",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — S&C growth, clinic profile revamp, CPD, housekeeping",attendees:"Jade Warren, Hans Vermeulen, Samuel Warren, Gemma",notes:"Present: Jade, Hans, Samuel, Gemma. Gemma now doing 2 days a week — S&C programs getting good traction, group class format being developed. Clinic has done a lot of revamping since the flood — really trying to push the profile out there. Discussed ideas for community outreach and branding. Performance testing outcomes from VALD and force plates looking strong — great data for athlete clients. Hans presented in-service training session — well received. CPD hours reviewed, all on track. APC renewals April 2026 noted early. Clinical notes audit due October. Housekeeping: new signage installed post-renovation, waiting area refreshed, treatment room layouts finalised. Action items: Gemma — develop group class timetable proposal by 15 Oct. Hans — complete clinical notes audit preparation by 10 Oct. Samuel — compile VALD outcomes data summary by 15 Oct. Jade — get quotes for updated clinic branding materials by 31 Oct."},
  {id:3306,date:"2025-11-28",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — Gwenne settling in, Hans mentor role for 2026, year review, Christmas planning",attendees:"Jade Warren, Hans Vermeulen, Samuel Warren, Gemma",notes:"Present: Jade, Hans, Samuel, Gemma. Strong year despite the flood disruption at the start. S&C services well established with Gemma. Gwenne confirmed to be doing a couple of days a week from December 2025 — working between Panmure and Titirangi. Discussed Hans taking on more of a mentoring role for 2026 — supporting newer staff, clinical oversight, professional development guidance. VALD and force plate outcomes data reviewed — valuable for athlete clients and building clinic reputation. Group class planning progressing with Gemma. Christmas closure dates confirmed. Housekeeping: end-of-year equipment maintenance, clinic tidy before Christmas, holiday hours signage needed. Action items: Jade — prepare Gwenne's onboarding materials by 5 Dec. Hans — draft mentor role scope and expectations for 2026 by 20 Dec. Gemma — finalise group class launch plan for early 2026. Samuel — complete year-end patient data summary by 15 Dec. All — confirm Christmas leave dates to Jade by 1 Dec."},
  // 2026
  {id:3401,date:"2026-01-30",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — Gwenne settling in, Hans mentor role, 2026 goals, clinic profile",attendees:"Jade Warren, Hans Vermeulen, Gwenne Manares",notes:"Present: Jade, Hans, Gwenne. Gwenne started in December and settling in — working a couple of days between Panmure and Titirangi. Getting familiar with systems and patient flow. Hans stepping into mentor role for 2026 — will be supporting Gwenne and other newer staff across the practice. Discussed continuing to push the clinic profile — updated branding, community presence, social media. S&C programmes with Gemma continuing strong. APC renewals due April — Hans and Jade both on track. CPD planning for the year reviewed. Housekeeping: New Year clinic reset done, supplies ordered, treatment rooms checked. Action items: Hans — begin structured mentoring sessions with Gwenne, first session by 14 Feb. Gwenne — complete Titirangi orientation items by 28 Feb. Jade — progress clinic branding refresh, get design concepts by 28 Feb. Hans — confirm CPD plan for 2026 by 14 Feb."},
  {id:3402,date:"2026-03-27",clinic:"Titirangi",topic:"Titirangi bi-monthly meeting — website and bio updates, APC renewals, clinic revamp progress",attendees:"Jade Warren, Hans Vermeulen, Gwenne Manares",notes:"Present: Jade, Hans, Gwenne. Website updates completed in February/March — new staff profiles, updated clinic info, refreshed branding across the site. All staff bios updated and live. APC renewals April 2026 confirmed for Hans. Clinical notes audit completed for Hans — all compliant. Gwenne settling in well, getting good patient feedback. S&C services with Gemma in high demand. Hans mentor role going well — regular sessions with Gwenne and contributing to broader team development. Clinic profile push continuing — social media presence growing. Housekeeping: clinic exterior signage refreshed, treatment room curtains replaced, new patient info display installed. Action items: Gwenne — complete remaining CPD requirements by 30 Apr. Hans — schedule next in-service presentation topic by 15 Apr. Jade — review clinic branding materials are consistent across all locations by 15 Apr. All — APC renewals to be confirmed by 1 Apr."},

  // ── PANMURE — Stephen Gray (physio, Oct 2024–Dec 2025), Gwenne Manares (Jan 2026–) ──
  // Stephen Gray opened the clinic, focused on GP outreach and community engagement
  {id:4101,date:"2024-10-11",clinic:"Panmure",topic:"Panmure clinic opening — setup, ACC registration, community outreach plan",attendees:"Jade Warren, Stephen Gray",notes:"Panmure clinic now open. Patient scheduling set up in Cliniko. ACC provider details confirmed. H&S checklist completed for new premises — first aid kit, emergency contacts, fire extinguisher all checked. Stephen Gray confirmed as primary clinician. Stephen developing outreach strategy — GP visits, local gyms and sports clubs to promote clinic services and build referral base."},
  {id:4102,date:"2024-12-06",clinic:"Panmure",topic:"Panmure bi-monthly meeting — first quarter review, outreach progress, operations",attendees:"Jade Warren, Stephen Gray",notes:"Stephen's GP and gym outreach going well — referrals starting to come through. Patient load building steadily. ACC invoicing process confirmed. H&S audit completed — all items passed. Equipment checked. Brand presence being established in community. Stephen attending local business network events. Review of appointment scheduling and patient flow."},
  {id:4201,date:"2025-02-07",clinic:"Panmure",topic:"Panmure bi-monthly meeting — outreach update, patient load, ACC invoicing",attendees:"Jade Warren, Stephen Gray",notes:"Referral network growing — GPs and several gyms now actively referring. Patient load increasing each month. ACC invoicing and Submit Kit on track. Clinical notes standards reviewed — SOATAP format consistent. Stephen developing strong reputation in community. Sports club partnerships progressing. Equipment check completed."},
  {id:4202,date:"2025-04-04",clinic:"Panmure",topic:"Panmure bi-monthly meeting — APC renewal, community partnerships, mid-term review",attendees:"Jade Warren, Stephen Gray",notes:"APC renewal April 2025 confirmed for Stephen. Strong mid-term review — clinic growing ahead of projections. GP relationships well established. Three gym partnerships formalised for on-site physio services. Patient satisfaction high. CPD hours on track. Dry needling consent protocols reviewed. H&S checklist updated. First aid kit restocked."},
  {id:4203,date:"2025-06-06",clinic:"Panmure",topic:"Panmure bi-monthly meeting — mid-year review, sports season, referral network",attendees:"Jade Warren, Stephen Gray",notes:"Strong mid-year — highest patient numbers since opening. Rugby and winter sport season driving referrals from gym and sports club partnerships. ACC invoicing up to date. H&S and hygiene audits both passed. Cultural competency renewals due September. In-service attendance confirmed. Clinical notes audit scheduled. Stephen continuing community outreach — school visits and sports events."},
  {id:4204,date:"2025-08-01",clinic:"Panmure",topic:"Panmure bi-monthly meeting — South Auckland ranges soccer assessment, community outreach, sport season",attendees:"Jade Warren, Stephen Gray",notes:"Present: Jade, Stephen. Currently assessing the South Auckland ranges as a potential opportunity for soccer physio coverage — Jade scoping out what's involved and whether it's viable. Stephen continuing strong community outreach — winter sport referrals flowing well from gym and sports club partnerships. Stephen presented at local rugby club on injury prevention — excellent brand exposure. Patient workshops planned for Q4. Discussed exploring cricket and athletics links for summer season. Samuel Warren confirmed to be looking after a health-related project as well — details to be firmed up. Housekeeping: equipment maintenance check done, clinic supplies ordered. Action items: Jade — complete South Auckland soccer ranges assessment and report back by 31 Aug. Stephen — follow up cricket and athletics club contacts by 15 Sep. Stephen — plan Q4 patient workshop schedule by 15 Aug. Samuel — provide health project update at next meeting."},
  {id:4205,date:"2025-10-03",clinic:"Panmure",topic:"Panmure bi-monthly meeting — Stephen departure, Gwenne handover planning, clinical notes audit, opportunities",attendees:"Jade Warren, Stephen Gray",notes:"Present: Jade, Stephen. Stephen announced he's leaving in December 2025 — moving overseas. Big loss but great work establishing the clinic and referral network. Handover planning started — Gwenne Manares confirmed to take over from January 2026. Stephen to prepare comprehensive handover notes and introduce key referrers and GP contacts to Jade. Clinical notes audit completed — all records compliant. South Auckland soccer opportunity still being assessed. Samuel's health project progressing — he'll be looking after that going forward. Strong Q3 — best quarter to date. Housekeeping: clinic signage to be updated with new staff details once Gwenne starts. Action items: Stephen — prepare full handover document including all GP, gym, and club contacts by 30 Nov. Stephen — introduce Jade to top 5 referral partners before last day. Jade — confirm Gwenne's start date and prepare onboarding by 15 Nov. Jade — progress South Auckland soccer assessment."},
  {id:4206,date:"2025-12-05",clinic:"Panmure",topic:"Panmure bi-monthly meeting — Stephen farewell, Gwenne handover, 2026 planning, Friday leasing",attendees:"Jade Warren, Stephen Gray, Gwenne Manares",notes:"Present: Jade, Stephen, Gwenne. Stephen Gray farewell — exceptional work establishing the Panmure clinic from scratch, building the referral network with GPs, gyms, and sports clubs. GP relationships, gym and sports club partnerships all handed over to Jade and Gwenne. Gwenne Manares introduced to key referrers. Gwenne also doing a couple of days working between Panmure and Titirangi. Comprehensive handover notes completed by Stephen. Stephen's last day December 19. Discussed leasing out Fridays at the Panmure clinic to Rise and Shine acupuncturist — Joseph Ying. Good opportunity for additional clinic income and service offering for patients. Housekeeping: Christmas closure confirmed, clinic tidy planned, holiday signage up. Action items: Gwenne — familiarise with all handover contacts and referral partners by 31 Dec. Jade — finalise Friday leasing arrangement with Joseph Ying (Rise and Shine) by 20 Dec. Gwenne — complete Panmure orientation items by mid-Jan. Jade — confirm 2026 Panmure staffing schedule by 15 Dec."},
  // Gwenne takes over Jan 2026
  {id:4301,date:"2026-02-06",clinic:"Panmure",topic:"Panmure bi-monthly meeting — Gwenne settled, Rise and Shine Friday leasing, Samuel health project, soccer opportunity",attendees:"Jade Warren, Gwenne Manares",notes:"Present: Jade, Gwenne. Gwenne settled in well at Panmure — building on the strong foundation Stephen established. Patient retention excellent. GP and gym referrals continuing from Stephen's network. Friday leasing to Rise and Shine acupuncture (Joseph Ying) now up and running — good additional income stream and patients appreciate having acupuncture available on site. Samuel looking after the health project — progressing well. South Auckland ranges soccer opportunity still being assessed — Jade currently out there looking at potential. 2026 goals: maintain growth, expand community links, explore new sports club partnerships. Housekeeping: reception refreshed, updated branding materials installed, patient feedback forms restocked. Action items: Gwenne — develop her own community outreach plan for Panmure by 28 Feb. Jade — finalise South Auckland soccer assessment by end of Feb. Samuel — health project progress report by 28 Feb. Jade — review Friday leasing arrangement at 3-month mark (March)."},
  {id:4302,date:"2026-04-03",clinic:"Panmure",topic:"Panmure bi-monthly meeting — APC renewal, soccer update, Rise and Shine review, Q1 review",attendees:"Jade Warren, Gwenne Manares",notes:"Present: Jade, Gwenne. APC renewal April 2026 confirmed for Gwenne. Strong Q1 — referral network maintained from Stephen's groundwork and Gwenne developing her own community links. South Auckland soccer opportunity — still a few things to work through but looking promising. Rise and Shine Friday leasing with Joseph Ying going well at the 3-month mark — patients giving positive feedback on having acupuncture available. Samuel's health project continuing — good progress. Gwenne building her own GP relationships alongside the ones Stephen established. Housekeeping: clinical notes audit completed — all records compliant, clinic exterior tidy-up done, patient info leaflets updated. Action items: Gwenne — continue building community outreach, target 2 new referral contacts by June. Jade — make decision on South Auckland soccer commitment by 30 Apr. Jade — review Rise and Shine arrangement and confirm ongoing terms. Gwenne — CPD hours check and update portal by 15 Apr."},
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
  _mk(4017,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-03-16",19,0,0,19,"Passed","Q1 2024. All passed."),
  _mk(4018,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-03-18",19,0,0,19,"Passed","All passed."),
  _mk(4019,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-03-20",19,0,0,19,"Passed","All passed."),
  _mk(4021,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-06-16",19,0,0,19,"Passed","Q2 2024. All passed."),
  _mk(4022,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-06-18",18,1,0,19,"1 issue found","Plinth paper roll down to last few sheets with no spare in room — replaced immediately. Minimum stock level of 2 spare rolls per room now in place. All other hygiene items passed."),
  _mk(4023,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-06-20",19,0,0,19,"Passed","All passed."),
  _mk(4025,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-09-16",19,0,0,19,"Passed","Q3 2024. All passed."),
  _mk(4026,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-09-18",19,0,0,19,"Passed","All passed."),
  _mk(4027,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-09-20",19,0,0,19,"Passed","All passed."),
  _mk(4029,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2024-11-16",19,0,0,19,"Passed","Q4 2024. All passed."),
  _mk(4030,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2024-11-18",19,0,0,19,"Passed","All passed."),
  _mk(4031,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2024-11-20",19,0,0,19,"Passed","All passed."),
  _mk(4032,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2024-11-22",19,0,0,19,"Passed","All passed."),
  // ── HYGIENE 2025 ──────────────────────────────────────────────────────────
  _mk(4033,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2025-03-16",19,0,0,19,"Passed","Q1 2025. All passed."),
  _mk(4034,"hygiene","Hygiene & Cleanliness Audit","🧼","Flat Bush","Jade Warren","2025-03-18",19,0,0,19,"Passed","All passed."),
  _mk(4035,"hygiene","Hygiene & Cleanliness Audit","🧼","Titirangi","Hans Vermeulen","2025-03-20",19,0,0,19,"Passed","All passed."),
  _mk(4036,"hygiene","Hygiene & Cleanliness Audit","🧼","Panmure","Jade Warren","2025-03-22",19,0,0,19,"Passed","All passed."),
  _mk(4037,"hygiene","Hygiene & Cleanliness Audit","🧼","Pakuranga","Jade Warren","2025-06-16",19,0,0,19,"Passed","Q2 2025. All passed."),
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
  _mk(8021,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2024-08-06",18,1,0,19,"1 issue found","Plinth paper roll empty with no spare — restocked immediately. All other items passed."),
  _mk(8022,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2024-08-08",19,0,0,19,"Passed","Term 3 hygiene — Edgewater School. All passed."),
  _mk(8023,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2025-03-18",19,0,0,19,"Passed","Term 1 hygiene — Howick School. All passed."),
  _mk(8024,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2025-03-20",19,0,0,19,"Passed","Term 1 hygiene — Edgewater School. All passed."),
  _mk(8025,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2025-08-05",19,0,0,19,"Passed","Term 3 hygiene — Howick School. All passed."),
  _mk(8026,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2025-08-07",19,0,0,19,"Passed","Term 3 hygiene — Edgewater School. All passed."),
  _mk(8027,"hygiene","Hygiene & Cleanliness Audit","🧼","Howick School","Alistair Burgess","2026-03-17",19,0,0,19,"Passed","Term 1 2026 hygiene — Howick School. All passed."),
  _mk(8028,"hygiene","Hygiene & Cleanliness Audit","🧼","Edgewater School","Alistair Burgess","2026-03-19",19,0,0,19,"Passed","Term 1 2026 hygiene — Edgewater School. All passed."),
];

// ── SEED INSERVICES — built from uploaded records ────────────────────────────
// IDs 1-99 are reserved for seed records; user-added records use Date.now() (>= ~1.7e12).
const INIT_INSERVICES = [
  {id:1,date:"2024-03-06",clinic:"All clinics",topic:"Kettlebells, Achilles review, Acupuncture, Patient cases",presenter:"Alistair, Dylan, Tim, Alice",attendees:"Jade, Alistair, Dylan, Tim, Alice",notes:"Alistair — Kettlebell Inservice & Rehab applications (referencing Meigh et al. 2019 scoping review and the BELL trial on kettlebell training in older adults). Dylan — Patient review: Achilles. Tim — Acupuncture review & evidence. Alice — Patient review. Discussion re: Schools coverage. Files: Inservice_March_6_2024.pdf, KETTLEBELLS_Inservice.docx, s13102-019-0130-z.pdf, Effects_of_supervised_hardstyle_kettlebell_training.pdf",year:2024},
  {id:2,date:"2024-04-24",clinic:"All clinics",topic:"AMPS paper · Pelvis assessment · Natural history · Case study",presenter:"Alice, Alistair, Dylan",attendees:"Jade, Alistair, Dylan, Alice",notes:"Alistair — Pelvis Assessment techniques & Differentiation. Dylan — Natural History of Conditions. Alice — Case Study + AMPS (Amplified Musculoskeletal Pain Syndrome) paper review (Sherry et al. 2020 pediatric rheumatology cohort of 636). Clinic business: DNAs process using SEED, cancellation fees, uniform review. Files: Staff_Meeting_Inservice_April_24_2024.pdf, In_service_24_April_24_AMPS_paper.pdf",year:2024},
  {id:3,date:"2024-07-15",clinic:"All clinics",topic:"Patellar Tendinopathy — assessment & treatment",presenter:"Dylan Connolly",attendees:"Jade, Alistair, Dylan, Hans",notes:"Jumper's knee. Repetitive extensor overload — common in volleyball, basketball. Risk factors: reduced quad strength, inappropriate training load, flexibility deficits. Treatments compared: Progressive Tendon Loading (Breda 2020) vs eccentrics, Isometric → HSR (Lim 2018), ESWT, PRP, K-Tape, load management. Dose (Pavlova 2023): higher intensity, lower frequency. File: Patellar_Tendinopathy_Inservice_July_24.pdf",year:2024},
  {id:4,date:"2025-02-11",clinic:"All clinics",topic:"Beyond 3 × 10 — Strength training for rehab & beyond",presenter:"Alistair Burgess",attendees:"Jade, Alistair, Hans, Dylan, Tim",notes:"SAID principle (Specific Adaptation to Imposed Demand). Strength–endurance continuum: 1–6 reps = strength, 8–12 = hypertrophy, 15+ = endurance. Rehab progression: Pain/swelling → ROM → general strength → specific strength → return to activity/sport. Loading protocols explored: 5×5, 10×10, 3×3, EMOM/AMRAP, ladders, singles, TUT. NZ aging population context. File: Inservice_Strength_Training_Beyond_3x10.pdf",year:2025},
  {id:5,date:"2025-05-14",clinic:"All clinics",topic:"Case study — 73yo male, calf strain → Achilles rupture",presenter:"Dylan Connolly",attendees:"Jade, Alistair, Dylan, Hans, Tim",notes:"73yo, initial Grade I calf strain walking downhill. Pre-injury ax Dec 2023 clear — Thompson squeeze cleared. On second step of skipping test, loud pop, Achilles tear confirmed same day. Timeline: Eastcare confirmation → 6 wk plaster → 6 wk moonboot → ortho → WBAT + heel inserts → physio return. Research: Xergia 2023 (risk factors), Ochen 2019 (operative vs non-operative — re-rupture diff only 1.6%, complications 3.3%). File: TBP_Case_Study.pdf",year:2025},
  {id:6,date:"2025-08-20",clinic:"All clinics",topic:"Knee meniscus tear — presentation & management",presenter:"",attendees:"Jade, Alistair, Dylan, Hans",notes:"Review of meniscus tear presentation, assessment, and management options. File: Knee_meniscus_tear.pptx",year:2025},
  {id:7,date:"2025-11-05",clinic:"All clinics",topic:"School Nurse Study Day — TBP presentation",presenter:"",attendees:"Jade",notes:"External presentation delivered at School Nurse Study Day. Covered TBP physiotherapy services, referral pathways, and common paediatric MSK presentations. File: Presentation_School_Nurse_Study_Day.pptx",year:2025},
  {id:8,date:"2026-02-18",clinic:"All clinics",topic:"MSK Paediatrics & Growing Pains — introduction",presenter:"",attendees:"Jade, Alistair, Dylan, Hans",notes:"Introduction to paediatric MSK presentations. Growing pains vs pathological causes. Differentials and when to refer. File: An_Introduction_to_MSK_Paeds_and_Growing_Pains.pptx",year:2026},
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
          const n={alistair:"Clinical Director",hans:"20+ years",dylan:"New Dec 2025",ibrahim:"New grad",komal:"Contractor",gwenne:"First cycle"}[id]||"Annual cycle";
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={prStatus} label={prLabel}/></TD>
            <TD style={{fontSize:11,color:prExp?prExp.color:(prAudit?C.green:C.hint)}}>{prExp?prExp.label:(prAudit?prAudit.date:"—")}</TD>
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
            <TD><Pill s={a?"ok":"pending"} label={a?a.date:"Not yet run"}/></TD>
            <TD>{a?<Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>:<span style={{fontSize:11,color:C.hint}}>—</span>}</TD>
            <TD style={{fontSize:11,color:C.muted}}>{a?.notes||"—"}</TD>
          </tr>;})}
        </Tbl>
        <div style={{fontSize:13,fontWeight:600,marginBottom:"0.5rem",marginTop:"1.25rem"}}>Peer Review Audits <span style={{fontSize:11,color:C.muted,fontWeight:400}}>— P&P §7.8 · Annual · Physio observes physio</span></div>
        <Tbl headers={["Staff reviewed","Last review","Reviewer","Outcome","Evidence"]}>{Object.entries(STAFF).filter(([id,s])=>s.type!=="Owner"||id==="jade").map(([id,s])=>{
          const a=[...audits].filter(x=>x.type==="peer_review"&&x.physioAudited===s.name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
          return <tr key={id} onClick={()=>{setPage("management");setMgmtTab("audits");}} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={a?"ok":"pending"} label={a?a.date:"Not yet run"}/></TD>
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
                    <span style={{color:C.muted,minWidth:80}}>{a.date}</span>
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
          {visible.map(s=>(
            <Card key={s.id} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem",background:s._isPersonal?"#FAFAF7":C.card}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    {s._isPersonal&&<span style={{fontSize:10}}>👤</span>}
                    {s.topic}
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                    {s.date}
                    {s._isPersonal
                      ? <> · <strong>Personal CPD</strong>{s.staffId?` · ${s.staffId}`:""}{s.hours?` · ${s.hours}h`:""}</>
                      : <> · {s.clinic}{s.presenter?` · Presenter: ${s.presenter}`:""}</>}
                  </div>
                  {s.attendees&&!s._isPersonal&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>Attendees: {s.attendees}</div>}
                  {s.loggedTo&&s.loggedTo.length&&!s._isPersonal&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>Logged to {s.loggedTo.length} staff · {s.hours||1}h</div>}
                  {s.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"5px 8px",borderRadius:5,marginTop:6,lineHeight:1.5}}>{s.notes}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                  <Pill s={s._isPersonal?"due":"ok"} label={s._isPersonal?"Personal CPD":"Completed ✓"}/>
                  <BSm onClick={(e)=>{e.stopPropagation();deleteInservice(s.id);}} color={C.red}>✕</BSm>
                </div>
              </div>
            </Card>
          ))}
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
                                    <div style={{fontSize:12,fontWeight:600,color:C.text}}>{a.date} <span style={{color:C.muted,fontWeight:400}}>· {a.clinic}</span></div>
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
                                    <BSm onClick={e=>{e.stopPropagation();if(!window.confirm(`Delete this ${a.type} audit for ${a.clinic} on ${a.date}?\n\nThis cannot be undone.`))return;const updated=audits.filter(x=>x.id!==a.id);setAudits(updated);saveGen("audits",updated);// Track deleted seeded IDs so they don't reload from INIT
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
                              <div style={{fontSize:11,color:C.muted}}>📅 {m.date} &nbsp;·&nbsp; 📍 {m.clinic}</div>
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
        {t:"Client satisfaction survey",s:"pending",d:"Via website or forms — P&P §1.5.3",action:null},
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
