import { useState, useRef, useEffect } from "react";

const PORTAL_API = "https://tbp-cliniko-proxy-j6f9.vercel.app/api/portal";
const PORTAL_SECRET = "tbp-portal-2026";
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
      console.error("[Expiry] API error " + resp.status);
      return { expiry: null };
    }
    const parsed = await resp.json();
    console.log("[Expiry] AI detected:", parsed);
    return parsed;
  } catch (e) {
    console.error("[Expiry] Failed:", e.message);
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
    links:[{label:"HDC Code of Rights",url:"https://hdc.org.nz/your-rights/about-the-code/code-of-health-and-disability-services-consumers-rights/"},{label:"Oranga Tamariki",url:"https://www.orangatamariki.govt.nz"},{label:"Mauriora course",url:"https://mauriora.co.nz"}]
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
    links:[{label:"Cliniko login",url:"https://app.cliniko.com"},{label:"ACC Allied Health schedule",url:"https://www.acc.co.nz/assets/provider/acc8310.pdf"}]
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
    links:[{label:"PBNZ Code of Ethics",url:"https://physiotherapy.org.nz/professional-standards/code-of-ethics"},{label:"Staff compliance",page:"compliance"}]
  },
  {
    id:"accounts", num:"8", icon:"💰", title:"Accounts",
    color:"#9C27B0", audience:"Management",
    summary:"Wages paid fortnightly by automatic payment. ACC invoiced per Allied Health Services Schedule (updated November 2025) via Submit Kit. Accounts software: Xero. Automated invoicing sends daily reminders. Manual follow-up: 30 days (friendly reminder), 60 days (overdue + phone call), 90 days (final notice). Unpaid accounts referred to Director. Preferred suppliers list on shared drive.",
    policies:[
      {title:"Staff wages",key:"wages",body:"Paid fortnightly by automatic payment. Director processes wages and maintains full record including PAYE/WT calculations. Tax tables at ird.govt.nz. TBP prepares invoices for contracted staff, cross-checked against statistics."},
      {title:"Client invoicing",key:"invoicing",body:"Accounts paid at end of each treatment where possible. Monthly report of outstanding accounts — invoiced by email. Schedule: initial invoice (payment ASAP) → 30 days ('A Friendly Reminder') → 60 days ('Reminder, Payment Overdue' — phone call) → 90 days ('Final Notice, within 7 days'). Unpaid accounts referred to Director to pursue or write off."},
      {title:"Preferred suppliers",key:"suppliers",body:"List stored on Google Drive in orientation folder. Kept updated by admin manager."},
    ],
    links:[{label:"Xero login",url:"https://login.xero.com"},{label:"IRD tax tables",url:"https://ird.govt.nz"}]
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
  {name:"PBNZ Code of Ethics and Professional Conduct",url:"https://physiotherapy.org.nz/professional-standards/code-of-ethics",desc:"Professional standards for all NZ physiotherapists."},
  {name:"PBNZ Cultural Competence Standard",url:"https://physioboard.org.nz/registration/cultural-competence",desc:"Māori cultural safety and competence — Physiotherapy Board NZ."},
  {name:"ACC Māori Cultural Competency (ACC1625)",url:"https://www.acc.co.nz/assets/provider/acc1625.pdf",desc:"ACC Māori cultural competency standard for providers."},
  {name:"ACC Allied Health Services Contract (ACC8310)",url:"https://www.acc.co.nz/assets/provider/acc8310.pdf",desc:"Allied Health contract — clinical director, in-service, audit standards."},
  {name:"Mauriora Cultural Competency course",url:"https://mauriora.co.nz",desc:"Complete the Foundation Course for annual renewal (valid 1 year)."},
  {name:"Employment Relations Act 2000",url:"https://legislation.govt.nz/act/public/2000/0024/latest/DLM58317.html",desc:"Employment agreements, disputes, good faith obligations."},
];

const CLINICS = [
  {id:"pakuranga",name:"Pakuranga — Lloyd Elsmore",short:"Pakuranga",icon:"🏊",note:"Lloyd Elsmore Leisure Centre · Since 2002 · Pool & gym access"},
  {id:"flatbush", name:"Flat Bush",               short:"Flat Bush", icon:"🏥",note:"Flat Bush clinic"},
  {id:"titirangi",name:"Titirangi Village",        short:"Titirangi", icon:"🌿",note:"Below Titirangi Medical Centre · Since 2004 · On-site gym"},
  {id:"panmure",  name:"Panmure — Lagoon Pools",   short:"Panmure",  icon:"🏊",note:"Inside Lagoon Pools complex · Hydrotherapy access"},
  {id:"schools",  name:"Howick & Edgewater College",short:"Schools", icon:"🏫",note:"School term only · Hakinakina Hauora Health Services"},
];

const STAFF = {
  jade:     {name:"Jade Warren",        ini:"JW",color:"#0a3d2e",title:"Owner / Director · Physiotherapist",             clinics:["pakuranga","flatbush","titirangi","panmure"],type:"Owner"},
  alistair: {name:"Alistair Burgess",   ini:"AB",color:"#0F6E56",title:"Senior Physiotherapist · H&S Officer", clinics:["pakuranga","schools"],                       type:"Employee",info:[["Role","Senior Physiotherapist"],["Additional","H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-14433 / HPI: 29CMBK"],["Started","24 October 2023"]]},
  timothy:  {name:"Timothy Keung",      ini:"TK",color:"#185FA5",title:"Physiotherapist",                                clinics:["pakuranga","titirangi","panmure"],             type:"Contractor",info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"]]},
  hans:     {name:"Hans Vermeulen",     ini:"HV",color:"#533AB7",title:"Physiotherapist · Clinic Lead",                  clinics:["titirangi"],                                  type:"Contractor",info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"]]},
  dylan:    {name:"Dylan Connolly",     ini:"DC",color:"#D85A30",title:"Physiotherapist",                                clinics:["pakuranga"],                                  type:"Employee",  info:[["Role","Physiotherapist"],["Started","December 2025"]]},
  ibrahim:  {name:"Ibrahim Al-Jumaily", ini:"IA",color:"#1D9E75",title:"Physiotherapist · New graduate",                 clinics:["pakuranga","flatbush"],                        type:"Employee",  info:[["Role","Physiotherapist"],["Level","New graduate"]]},
  isabella: {name:"Isabella Yang",      ini:"IY",color:"#D4537E",title:"Physiotherapist",                                clinics:["flatbush"],                                   type:"Employee",  info:[["Role","Physiotherapist"],["Qualification","BPhty — University of Otago"],["Started","17 June 2024"]]},
  gwenne:   {name:"Gwenne Manares",     ini:"GM",color:"#639922",title:"Physiotherapist",                                clinics:["panmure"],                                    type:"Employee",  info:[["Role","Physiotherapist"],["Clinic","Panmure"]]},
  komal:    {name:"Komal Kaur",         ini:"KK",color:"#9C27B0",title:"Physiotherapist",                                clinics:["pakuranga","panmure"],                         type:"Contractor",info:[["Role","Physiotherapist"],["Type","Contractor"]]},
};

const PAST_STAFF = ["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"];
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
    {title:"Treatment rooms",items:["Treatment tables wiped between every patient","Paper/pillow slip changed between every patient","Floors clean and free of debris","All surfaces disinfected","Waste bins emptied and lined","No clutter on benches or work surfaces"]},
    {title:"Equipment",items:["All equipment wiped down after use","Ultrasound heads cleaned after each use","Exercise equipment clean and stored correctly","Single-use items disposed of immediately"]},
    {title:"Hand hygiene stations",items:["Hand sanitiser at arrival/reception counter","Hand sanitiser at exit/departure counter","Sanitiser dispensers clean and full","Soap and paper towels at all clinical sinks"]},
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
    {title:"Clinical equipment",items:["Ultrasound machines functioning correctly","TENS/IFC machines functioning correctly","Exercise equipment safe and functional","Traction equipment checked (if applicable)"]},
    {title:"Treatment room equipment",items:["Treatment tables in good condition","Pillow frames and headrests secure","Step stools stable","Sharps disposal containers not over-filled — dispose at Chemist Warehouse at 3/4 full"]},
    {title:"Records",items:["Equipment register up to date","Service provider details recorded","Last service date recorded for each major item","Next service date scheduled"]},
  ]},
};

// ── CLOUD STORAGE — Vercel Blob via proxy API ────────────
let _portalStore = { files: {}, data: {} };
let _portalReady = false;
let _portalForceUpdate = null;

async function _loadStore() {
  try {
    const resp = await fetch(PORTAL_API + "/store?secret=" + encodeURIComponent(PORTAL_SECRET), {
      headers: { "X-Portal-Secret": PORTAL_SECRET },
    });
    if (!resp.ok) throw new Error("API " + resp.status);
    const state = await resp.json();
    // Merge file records: the store may return files in state.files and/or state.data
    const files = { ...(state.files || {}) };
    // Also pull any file records saved under the "files" store namespace
    if (state.data) {
      Object.entries(state.data).forEach(([k, v]) => {
        if (v && v.blobUrl) files[k] = v; // any data record with a blobUrl is a file record
      });
    }
    _portalStore = { files, data: state.data || {} };
    _portalReady = true;
    console.log("[Portal] Loaded:", Object.keys(_portalStore.files).length, "files,", Object.keys(_portalStore.data).length, "data keys");
    return true;
  } catch (e) {
    console.warn("[Portal] API unavailable, using localStorage:", e.message);
    _portalReady = false;
    return false;
  }
}

const sKey = (id, k) => `cert_${id}_${k}`;

function _archiveFile(key, oldFile) {
  if (!oldFile || !oldFile.fileName) return;
  const histKey = key + "_hist";
  const hist = (_portalStore.data[histKey] || []).slice(0, 9);
  const archived = { fileName:oldFile.fileName, fileType:oldFile.fileType, uploadedDate:oldFile.uploadedDate, blobUrl:oldFile.blobUrl, dataUrl:oldFile.dataUrl, expiry:oldFile.expiry, issued:oldFile.issued, archivedDate:new Date().toLocaleDateString("en-NZ") };
  const newHist = [archived, ...hist];
  _portalStore.data[histKey] = newHist;
  fetch(PORTAL_API + "/store", { method:"POST", headers:_apiHeaders, body:JSON.stringify({ key:histKey, value:newHist }) }).catch(()=>{});
}

function saveFile(id, k, d) {
  const key = sKey(id, k);
  if (_portalReady) {
    // Archive old file before overwriting
    _archiveFile(key, _portalStore.files[key]);
    _portalStore.files[key] = d;
    fetch(PORTAL_API + "/upload", {
      method: "POST", headers: _apiHeaders,
      body: JSON.stringify({ fileKey: key, fileName: d.fileName, fileType: d.fileType, fileData: d.dataUrl, meta: d.expiry ? { expiry: d.expiry } : d.issued ? { issued: d.issued } : undefined }),
    }).then(r => r.json()).then(result => {
      if (result.ok && result.file) {
        _portalStore.files[key] = result.file;
        fetch(PORTAL_API + "/store", {
          method: "POST", headers: _apiHeaders,
          body: JSON.stringify({ key, value: result.file, store: "files" }),
        }).catch(e => console.error("[Portal] Sync error:", e));
        if (_portalForceUpdate) _portalForceUpdate(n => n + 1);
      }
    }).catch(e => console.error("[Upload] Failed:", e.message));
    return true;
  }
  try { localStorage.setItem(key, JSON.stringify(d)); return true; } catch { return false; }
}

function loadFile(id, k) {
  const key = sKey(id, k);
  if (_portalReady) return _portalStore.files[key] || null;
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
    delete _portalStore.files[key];
    fetch(PORTAL_API + "/upload?fileKey=" + encodeURIComponent(key) + "&secret=" + encodeURIComponent(PORTAL_SECRET), {
      method: "DELETE", headers: { "X-Portal-Secret": PORTAL_SECRET },
    }).catch(e => console.error("[Portal] Delete error:", e));
    return;
  }
  try { localStorage.removeItem(key); } catch {}
}

function saveGen(k, d) {
  if (_portalReady) {
    if (d && d.dataUrl) {
      _portalStore.files[k] = d;
      fetch(PORTAL_API + "/upload", {
        method: "POST", headers: _apiHeaders,
        body: JSON.stringify({ fileKey: k, fileName: d.fileName, fileType: d.fileType, fileData: d.dataUrl }),
      }).then(r => r.json()).then(result => {
        if (result.ok && result.file) { _portalStore.files[k] = result.file; if (_portalForceUpdate) _portalForceUpdate(n => n + 1); }
      }).catch(e => console.error("[Portal] Upload error:", e));
    } else {
      _portalStore.data[k] = d;
      fetch(PORTAL_API + "/store", {
        method: "POST", headers: _apiHeaders,
        body: JSON.stringify({ key: k, value: d }),
      }).catch(e => console.error("[Portal] Save error:", e));
    }
    return true;
  }
  try { localStorage.setItem(k, JSON.stringify(d)); return true; } catch { return false; }
}

function loadGen(k) {
  if (_portalReady) return _portalStore.files[k] || _portalStore.data[k] || null;
  try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : null; } catch { return null; }
}

function removeGen(k) {
  if (_portalReady) {
    delete _portalStore.files[k];
    delete _portalStore.data[k];
    fetch(PORTAL_API + "/upload?fileKey=" + encodeURIComponent(k) + "&secret=" + encodeURIComponent(PORTAL_SECRET), {
      method: "DELETE", headers: { "X-Portal-Secret": PORTAL_SECRET },
    }).catch(e => console.error("[Portal] Delete error:", e));
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
  const f = loadFile(id, key);
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
    const targets = r.applies === "Per clinic" ? CLINICS.filter(c => c.id !== "schools").map(c => c.short) : ["All staff"];
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


// Upload a file to Vercel Blob and return the file record with blobUrl
async function _uploadToBlob(fileKey, fileName, fileType, dataUrl) {
  try {
    const resp = await fetch(PORTAL_API + "/upload", {
      method: "POST", headers: _apiHeaders,
      body: JSON.stringify({ fileKey, fileName, fileType, fileData: dataUrl }),
    });
    const result = await resp.json();
    if (result.ok && result.file) return result.file;
  } catch(e) { console.error("[Blob upload]", e.message); }
  return null;
}

// file viewer
function FileViewer({file,onClose}){
  if(!file)return null;
  const isImg=file.fileType?.startsWith("image/");const isPdf=file.fileType==="application/pdf";
  const url=file.blobUrl||file.dataUrl;
  const[pdfLoading,setPdfLoading]=useState(true);const[pdfError,setPdfError]=useState(false);
  // Google Docs viewer for cloud files — renders all pages
  const gdocsUrl=file.blobUrl?"https://docs.google.com/gview?embedded=true&url="+encodeURIComponent(file.blobUrl):null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:600,display:"flex",flexDirection:"column"}}>
      <div style={{background:C.teal,padding:"0.875rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{color:"white",fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:12}}>{file.fileName}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          {url&&<a href={url} target="_blank" rel="noreferrer" style={{color:"white",fontSize:12,padding:"4px 12px",background:"rgba(255,255,255,0.25)",borderRadius:20,textDecoration:"none",fontWeight:500}}>↗ Open full document</a>}
          {url&&<a href={url} download={file.fileName} style={{color:"white",fontSize:12,padding:"4px 12px",background:"rgba(255,255,255,0.2)",borderRadius:20,textDecoration:"none"}}>⬇ Download</a>}
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:17,flexShrink:0}}>✕</button>
        </div>
      </div>
      {isPdf&&<div style={{background:C.amberL,borderTop:`1px solid ${C.amber}`,padding:"6px 1.25rem",fontSize:12,color:C.amber,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span>📄 Multi-page PDF</span>
        <span style={{color:C.muted}}>·</span>
        <span>Scroll down to see all pages in preview below, or tap</span>
        <a href={url} target="_blank" rel="noreferrer" style={{color:C.blue,fontWeight:600,textDecoration:"none"}}>↗ Open full document</a>
        <span>for the best viewing experience</span>
      </div>}
      <div onClick={e=>e.stopPropagation()} style={{flex:1,overflow:"auto",display:"flex",alignItems:"stretch",justifyContent:"stretch",background:"#1a1a1a",position:"relative"}}>
        {isImg&&<img src={url} alt={file.fileName} style={{maxWidth:"100%",maxHeight:"100%",margin:"auto",objectFit:"contain",display:"block"}}/>}
        {isPdf&&!pdfError&&gdocsUrl&&(
          <>
            {pdfLoading&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#1a1a1a"}}><div style={{textAlign:"center",color:"white"}}><div style={{fontSize:40,marginBottom:8}}>📄</div><div style={{fontSize:14}}>Loading all pages…</div><div style={{fontSize:11,color:"#aaa",marginTop:4}}>May take a moment for large documents</div></div></div>}
            <iframe
              src={gdocsUrl}
              style={{width:"100%",height:"100%",border:"none",opacity:pdfLoading?0:1,transition:"opacity 0.4s",display:"block"}}
              title={file.fileName}
              onLoad={()=>setPdfLoading(false)}
              onError={()=>{setPdfLoading(false);setPdfError(true);}}
            />
          </>
        )}
        {isPdf&&!gdocsUrl&&url&&(
          // dataUrl fallback — object tag works better than iframe for multi-page in most browsers
          <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"1rem",boxSizing:"border-box"}}>
            <object data={url} type="application/pdf" style={{width:"100%",flex:1,minHeight:"70vh",borderRadius:6}}>
              <div style={{textAlign:"center",padding:"2rem",color:"white"}}>
                <div style={{fontSize:40,marginBottom:"0.75rem"}}>📄</div>
                <div style={{fontSize:14,marginBottom:"0.5rem"}}>{file.fileName}</div>
                <div style={{fontSize:12,color:"#aaa",marginBottom:"1.25rem"}}>PDF preview not available in this browser</div>
                {url&&<a href={url} target="_blank" rel="noreferrer" style={{color:C.tealL,fontSize:13,fontWeight:600}}>↗ Open PDF in new tab to view all pages</a>}
              </div>
            </object>
          </div>
        )}
        {isPdf&&pdfError&&<div style={{textAlign:"center",padding:"3rem",color:"white",margin:"auto"}}><div style={{fontSize:52,marginBottom:"0.75rem"}}>📄</div><div style={{fontSize:14,marginBottom:"0.5rem"}}>{file.fileName}</div><div style={{fontSize:12,color:"#aaa",marginBottom:"1.25rem"}}>Preview unavailable</div>{url&&<a href={url} target="_blank" rel="noreferrer" style={{color:C.tealL,fontSize:14,fontWeight:600}}>↗ Open PDF in new tab</a>}</div>}
        {!isImg&&!isPdf&&<div style={{textAlign:"center",padding:"3rem",color:"white",margin:"auto"}}><div style={{fontSize:52,marginBottom:"0.75rem"}}>📄</div><div style={{fontSize:14,fontWeight:500,marginBottom:"1rem"}}>{file.fileName}</div>{url&&<a href={url} download={file.fileName} style={{color:C.tealL,fontSize:13,fontWeight:600}}>⬇ Download file</a>}</div>}
      </div>
    </div>
  );
}

// generic file row
function FileRow({label,gkey,onView,accent=C.teal}){
  const ref=useRef();const[file,setFile]=useState(()=>loadGen(gkey));
  function handle(e){const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("File over 3MB.");return;}const r=new FileReader();r.onload=ev=>{const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};if(saveGen(gkey,d))setFile(d);};r.readAsDataURL(f);e.target.value="";}
  const isImg=file?.fileType?.startsWith("image/");
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
      {isImg&&file&&<div onClick={()=>onView(file)} style={{width:36,height:36,borderRadius:5,overflow:"hidden",cursor:"pointer",flexShrink:0,border:`1px solid ${C.border}`}}><img src={(file.blobUrl||file.dataUrl)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
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
  const canSee=!cert.ownerOnly||(role==="owner"||role===staffId);
  const[scanning,setScanning]=useState(false);const[showHist,setShowHist]=useState(false);
  function handle(e){
    const f=e.target.files[0];if(!f)return;
    if(f.size>3*1024*1024){alert("File over 3MB.");return;}
    const r=new FileReader();
    r.onload=ev=>{
      const key=sKey(staffId,cert.key);
      // Clear old expiry immediately so stale data doesn't linger
      if(_portalReady){
        delete _portalStore.data["expiry_"+key];
        fetch(PORTAL_API+"/store?key="+encodeURIComponent("expiry_"+key)+"&secret="+encodeURIComponent(PORTAL_SECRET),{method:"DELETE",headers:{"X-Portal-Secret":PORTAL_SECRET}}).catch(()=>{});
      }
      const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ"),certKey:cert.key,expiry:null,issued:null};
      if(saveFile(staffId,cert.key,d)){
        setFile(d);
        if(_portalForceUpdate)_portalForceUpdate(n=>n+1);
        setScanning(true);
        detectExpiryDate(ev.target.result,cert.label).then(result=>{
          const expiry=result.expiry||null;const issued=result.issued||null;
          const updated={...d,expiry,issued};
          setFile(updated);
          if(_portalReady){
            if(_portalStore.files[key]){_portalStore.files[key].expiry=expiry;_portalStore.files[key].issued=issued;}
            if(expiry||issued){
              _portalStore.data["expiry_"+key]={expiry,issued};
              fetch(PORTAL_API+"/store",{method:"POST",headers:_apiHeaders,body:JSON.stringify({key:"expiry_"+key,value:{expiry,issued}})}).catch(()=>{});
            }
            if(_portalForceUpdate)_portalForceUpdate(n=>n+1);
          }
          setScanning(false);
        }).catch(()=>setScanning(false));
      }
    };
    r.readAsDataURL(f);e.target.value="";
  }
  if(!canSee)return <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontWeight:500,fontSize:13,color:C.muted}}>🔒 {cert.label}</div><Pill s={file?"ok":"pending"} label={file?"On file":"Needed"}/></div>;
  const expiryData=_portalReady?(_portalStore.data["expiry_"+sKey(staffId,cert.key)]||null):null;
  const certExpiry=file?.expiry||expiryData?.expiry||null;
  const expInfo=certExpiry?getExpiryStatus(certExpiry):null;
  const isExpired=expInfo?.status==="expired";
  const isExpiring=expInfo?.status==="expiring";
  const status=file?(isExpired?"expired":"ok"):cert.required?"pending":"na";
  const bg={ok:"#EAF3DE",expired:"#FCEBEB",pending:cert.required?"#FAEEDA":"#F1EFE8",na:"#F1EFE8"}[status];
  const bd={ok:"#c0dd97",expired:"#f5a0a0",pending:cert.required?"#fac775":C.border,na:C.border}[status];
  const isImg=file?.fileType?.startsWith("image/");const isPdf=file?.fileType==="application/pdf";
  return(
    <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        {isImg&&<div onClick={()=>onView(file)} style={{width:44,height:44,borderRadius:6,overflow:"hidden",flexShrink:0,cursor:"pointer",border:`1px solid ${C.border}`}}><img src={(file.blobUrl||file.dataUrl)} alt="cert" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
        {isPdf&&<div onClick={()=>onView(file)} style={{width:44,height:44,borderRadius:6,background:C.redL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",border:`1px solid ${C.border}`,fontSize:22}}>📄</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div style={{fontWeight:500,fontSize:13}}>{cert.label}{cert.ownerOnly?" 🔒":""}</div>
            {scanning?<span style={{fontSize:11,color:C.blue,fontWeight:500}}>🔍 Reading cert...</span>:<Pill s={isExpired?"expired":isExpiring?"due":status} label={expInfo?expInfo.label:file?"On file ✓":cert.required?"Required":"Optional"}/>}
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{cert.renews}</div>
          {file&&<div style={{fontSize:11,color:C.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName} · {file.uploadedDate}</div>}
          {certExpiry&&<div style={{fontSize:11,color:expInfo?.color||C.muted,marginTop:1,fontWeight:600}}>{isExpired?"⚠ ":isExpiring?"⏰ ":"✓ "}{expInfo?.label}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
        {file&&<BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>}
        <BSm onClick={()=>ref.current.click()} color={cert.required?C.teal:C.gray}>📷 {file?"Upload new":"Upload"}</BSm>
        {file&&isExpired&&<BSm onClick={()=>{
          const key=sKey(staffId,cert.key);
          if(_portalReady){delete _portalStore.data["expiry_"+key];fetch(PORTAL_API+"/store?key="+encodeURIComponent("expiry_"+key)+"&secret="+encodeURIComponent(PORTAL_SECRET),{method:"DELETE",headers:{"X-Portal-Secret":PORTAL_SECRET}}).catch(()=>{});}
          if(_portalStore.files[key]){_portalStore.files[key].expiry=null;_portalStore.files[key].issued=null;}
          setFile(f=>({...f,expiry:null,issued:null}));
          if(_portalForceUpdate)_portalForceUpdate(n=>n+1);
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
    const f=e.target.files[0];if(!f)return;
    if(f.size>3*1024*1024){alert("File over 3MB.");return;}
    const r=new FileReader();
    r.onload=ev=>{
      const d={id:Date.now(),fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};
      // Upload to cloud
      if(_portalReady){
        fetch(PORTAL_API+"/upload",{method:"POST",headers:_apiHeaders,body:JSON.stringify({fileKey:gkey+"_"+d.id,fileName:d.fileName,fileType:d.fileType,fileData:d.dataUrl})}).then(r=>r.json()).then(result=>{
          if(result.ok&&result.file){
            setFiles(prev=>{const updated=prev.map(x=>x.id===d.id?{...x,...result.file}:x);saveGen(gkey,updated);return updated;});
          }
        }).catch(()=>{});
      }
      const updated=[...files,d];setFiles(updated);saveGen(gkey,updated);
    };
    r.readAsDataURL(f);e.target.value="";
  }
  function remove(id){
    const updated=files.filter(f=>f.id!==id);
    setFiles(updated);saveGen(gkey,updated.length?updated:null);
  }
  return(
    <div style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:files.length?6:0}}>
        <div style={{flex:1,fontSize:13,fontWeight:500}}>{label}</div>
        <BSm onClick={()=>ref.current.click()} color={accent}>📄 {files.length?"Add another":"Upload"}</BSm>
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
      if(_portalReady){
        fetch(PORTAL_API+"/upload",{method:"POST",headers:_apiHeaders,body:JSON.stringify({fileKey:key+"_"+d.id,fileName:d.fileName,fileType:d.fileType,fileData:d.dataUrl})}).then(r=>r.json()).then(result=>{
          if(result.ok&&result.file){
            setDocs(prev=>{const updated=prev.map(x=>x.id===d.id?{...x,...result.file,label:x.label}:x);saveGen(key,updated);return updated;});
          }
        }).catch(()=>{});
      }
      const updated=[...docs,d];setDocs(updated);saveGen(key,updated);
      setPendingLabel(null);
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

// audit view modal — shows a completed audit in full
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
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Start time (optional)</label><input type="time" value={meta.time} onChange={e=>setMeta({...meta,time:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Duration (e.g. "4 mins 30 secs")</label><input type="text" value={meta.duration} onChange={e=>setMeta({...meta,duration:e.target.value})} placeholder="e.g. 4 mins 30 secs" style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>
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
    const updated={...ppReviews,[sectionId]:{date:new Date().toLocaleDateString("en-NZ"),reviewer:"Jade Warren"}};
    setPpReviews(updated);saveGen("ppReviews",updated);
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
      // Then upload to blob for proper multi-page viewing
      const blobFile=await _uploadToBlob("ppdoc_"+id,f.name,f.type,ev.target.result);
      if(blobFile){
        const withBlob=updated.map(d=>d.id===id?{...d,blobUrl:blobFile.blobUrl,dataUrl:undefined}:d);
        setPpDocs(withBlob);saveGen("ppDocs",withBlob);
      } else {
        saveGen("ppDocs",updated);
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
                {isOpen&&<div style={{padding:"0 1rem 1rem",fontSize:13,color:C.muted,lineHeight:1.8,borderTop:`1px solid ${sec.color+"20"}`}}><div style={{marginTop:"0.875rem",whiteSpace:"pre-wrap"}}>{pol.body}</div></div>}
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
                  {rev?<div style={{fontSize:11,color:C.green,marginTop:2}}>✓ Reviewed {rev.date} · {rev.reviewer}</div>:<div style={{fontSize:11,color:C.muted,marginTop:2}}>Not yet reviewed this year</div>}
                  <div style={{marginTop:6}}>
                    {rev?<BSm onClick={()=>{if(window.confirm("Clear review status for this section?")){const u={...ppReviews};delete u[sec.id];setPpReviews(u);saveGen("ppReviews",u);}}} color={C.muted}>Clear ✕</BSm>:<BSm onClick={()=>markReviewed(sec.id)} color={C.teal}>✓ Mark reviewed</BSm>}
                  </div>
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
  {id:1,date:"2025-11-15",clinic:"All clinics",topic:"Q4 staff meeting — H&S review, CPD updates",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Discussed APC renewal cycle, updated first aid booking process."},
];
const INIT_AUDITS=[];

export default function App(){
  const[page,setPage]=useState("dashboard");const[profile,setProfile]=useState(null);const[role,setRole]=useState("owner");
  const[portalLoading,setPortalLoading]=useState(true);
  const[portalConnected,setPortalConnected]=useState(false);
  const[,forceRender]=useState(0);
  const[compTab,setCompTab]=useState("overview");const[mgmtTab,setMgmtTab]=useState("audits");const[docsTab,setDocsTab]=useState("contracts");const[isrvTab,setIsrvTab]=useState("log");
  const[meetings,setMeetings]=useState([]);
  const[audits,setAudits]=useState(INIT_AUDITS);
  const[inservices,setInservices]=useState([{id:1,date:"2025-08-10",clinic:"Titirangi",topic:"Shoulder rehab protocols",presenter:"Hans Vermeulen",attendees:"Hans, Alistair",notes:"Reviewed UniSportsOrtho shoulder stabilisation phases.",year:2025}]);
  const[activeAudit,setActiveAudit]=useState(null);
  const[viewAudit,setViewAudit]=useState(null);
  const[showLogAudit,setShowLogAudit]=useState(false);
  const[logAudit,setLogAudit]=useState({type:"hygiene",date:"",clinic:CLINICS[0].short,auditor:"",outcome:"Passed",notes:""});
  const[extAudits,setExtAudits]=useState(()=>loadGen("extAudits")||[]);
  const[eavf,setEavf]=useState(null);
  const[analysing,setAnalysing]=useState(null);
  const[showExtForm,setShowExtForm]=useState(false);
  const[extLabel,setExtLabel]=useState("");
  const[mFilter,setMFilter]=useState("");
  const[ppDocs,setPpDocs]=useState(()=>loadGen("ppDocs")||[]);
  const[ppReviews,setPpReviews]=useState(()=>loadGen("ppReviews")||{});
  const[ppAiAnalysis,setPpAiAnalysis]=useState({});
  const[urgentOpen,setUrgentOpen]=useState(true);
  const[auditTypeFilter,setAuditTypeFilter]=useState("all");
  const[auditYearFilter,setAuditYearFilter]=useState("all");
  const[collapsedYears,setCollapsedYears]=useState({});
  const[showAdd,setShowAdd]=useState(false);const[vf,setVf]=useState(null);const[,fu]=useState(0);
  const[nm,setNm]=useState({date:"",clinic:"All clinics",topic:"",attendees:"",notes:"",attachment:null});
  const meetRef=useRef();
  const[staffOverrides,setStaffOverrides]=useState({});
  const roleNames={owner:"Jade Warren",alistair:"Alistair Burgess",hans:"Hans Vermeulen",staff:"Staff member"};
  useEffect(()=>{
    _portalForceUpdate=forceRender;
    _loadStore().then((ok)=>{
      setPortalConnected(ok&&_portalReady);
      if(ok){
        // Populate all cloud-stored state AFTER load completes
        const d=_portalStore.data;
        if(d["audits"]&&d["audits"].length)setAudits(d["audits"]);
        if(d["meetings"]&&d["meetings"].length)setMeetings(d["meetings"]);else setMeetings(INIT_MEETINGS);
        if(d["inservices"]&&d["inservices"].length)setInservices(d["inservices"]);
        if(d["extAudits"]&&d["extAudits"].length)setExtAudits(d["extAudits"]);
        if(d["ppDocs"])setPpDocs(d["ppDocs"]||[]);
        if(d["ppReviews"])setPpReviews(d["ppReviews"]||{});
        // Staff overrides
        const overrides={};
        Object.keys(STAFF).forEach(id=>{
          const ei=d[`empinfo_${id}`]||null;
          if(ei)overrides[id]=ei;
        });
        setStaffOverrides(overrides);
      }
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
        <PH title="Good morning, Jade 👋" sub={"Total Body Physio — Compliance & HR Portal · April 2026" + (portalConnected ? " · ☁️ Cloud connected" : " · ⚠️ Local storage only")}/>
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
        <Tbl headers={["Staff","Peer Review","Expiry","Appraisal","Expiry","Notes"]}>{Object.entries(STAFF).map(([id,s])=>{
          const pr=loadFile(id,"peerreview");const ap=loadFile(id,"appraisal");
          const prExp=pr?.expiry?getExpiryStatus(pr.expiry):null;const apExp=ap?.expiry?getExpiryStatus(ap.expiry):null;
          const n={alistair:"Clinical Director",hans:"20+ years",dylan:"New Dec 2025",ibrahim:"New grad",komal:"Contractor",gwenne:"First cycle"}[id]||"Annual cycle";
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <TD><strong>{s.name}</strong></TD>
            <TD><Pill s={pr?(prExp?.status==="expired"?"expired":"ok"):"pending"} label={pr?"On file ✓":"Needed"}/></TD>
            <TD style={{fontSize:11,color:prExp?prExp.color:C.hint}}>{prExp?prExp.label:"—"}</TD>
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
      </div>}      {compTab==="clinicaudit"&&<div>
        <Alert type="amber" title="Clinic compliance audits">Log historical audits and upload evidence. Fire drills annual · H&S quarterly · Hygiene quarterly · Equipment annual. Run live audits from Management or Clinics page.</Alert>
        <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap"}}>
          <Btn onClick={()=>{setPage("management");setMgmtTab("audits");}}>Run new audit →</Btn>
          <Btn outline onClick={()=>{setPage("clinics");}}>View by clinic →</Btn>
        </div>
        {Object.entries(AUDIT_FORMS).filter(([k])=>k!=="clinical_notes").map(([key,form])=>{
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
    <Card><div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Former staff — 9 records</div>{["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"].map(n=><div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:32,height:32,borderRadius:"50%",background:C.grayL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.gray,flexShrink:0}}>{n.slice(0,2).toUpperCase()}</div><div><strong style={{fontSize:13}}>{n}</strong><div style={{fontSize:12,color:C.muted}}>Former physiotherapist · Records archived</div></div><span style={{marginLeft:"auto"}}><Chip color="gray">Archived</Chip></span></div>)}</Card></div>
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
    const clinicOptions=["all",...CLINICS.filter(c=>c.id!=="schools").map(c=>c.short)];
    const visible=inservices.filter(i=>{
      const yr=String(i.year||i.date?.slice(0,4)||"");
      const cl=i.clinic||"";
      return(filterYear==="all"||yr===filterYear)&&(filterClinic==="all"||cl===filterClinic||cl.includes(filterClinic));
    }).sort((a,b)=>b.date.localeCompare(a.date));
    function addInservice(){
      if(!ni.date||!ni.topic){alert("Date and topic required.");return;}
      const rec={...ni,id:Date.now(),year:parseInt(ni.date.slice(0,4))};
      const updated=[...inservices,rec];
      setInservices(updated);saveGen("inservices",updated);
      setNi({date:"",clinic:"All clinics",topic:"",presenter:"",attendees:"",notes:""});
      setShowForm(false);
    }
    // Per-clinic status for current year
    const thisYear=String(new Date().getFullYear());
    const clinicStatus=CLINICS.filter(c=>c.id!=="schools").map(cl=>{
      const done=inservices.filter(i=>String(i.year||i.date?.slice(0,4)||"")===thisYear&&(i.clinic===cl.short||i.clinic===cl.name||(i.clinic||"").includes(cl.short)));
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
                  <option>All clinics</option>{CLINICS.filter(c=>c.id!=="schools").map(c=><option key={c.id}>{c.short}</option>)}
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
            <Card key={s.id} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{s.topic}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{s.date} · {s.clinic}{s.presenter?` · Presenter: ${s.presenter}`:""}</div>
                  {s.attendees&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>Attendees: {s.attendees}</div>}
                  {s.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"5px 8px",borderRadius:5,marginTop:6,lineHeight:1.5}}>{s.notes}</div>}
                </div>
                <Pill s="ok" label="Completed ✓"/>
              </div>
            </Card>
          ))}
        </div>
      )}
      {isrvTab==="resources"&&<Card><div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>In-service resources</div><div style={{fontSize:12,color:C.muted,marginBottom:"1rem",lineHeight:1.6}}>Upload handouts, slides or reading materials. All staff can view.</div>{CLINICS.filter(c=>c.id!=="schools").map(cl=><FileRow key={cl.id} label={`${cl.icon} ${cl.short} — in-service resource`} gkey={`isrv_${cl.id}`} onView={f=>setIvf(f)}/>)}<div style={{marginTop:"0.75rem",fontSize:11,color:C.muted}}>Accepted: PDF, Word, image. Max 3MB.</div></Card>}
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
    {docsTab==="jd"&&<Card><div style={{fontSize:13,color:C.muted,marginBottom:"1rem",lineHeight:1.6}}>Each staff member may have multiple JDs for different roles. Upload all signed copies — P&P Section 7.3.</div>{Object.entries(STAFF).map(([id,s])=><MultiFileRow key={id} label={`${s.name} — Job Description`} gkey={`jd_${id}`} onView={f=>setDvf(f)} accent={s.color}/>)}</Card>}
    {docsTab==="leg"&&<div><Alert type="blue" title="Key legislation — all staff read during orientation">Click any link to open the source document.</Alert>{LEGISLATION.map(leg=><Card key={leg.name} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}><div><a href={leg.url} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:600,color:C.blue,textDecoration:"none"}}>{leg.name} ↗</a><div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{leg.desc}</div></div><a href={leg.url} target="_blank" rel="noreferrer" style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:C.blueL,color:C.blue,textDecoration:"none",fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>Open ↗</a></div></Card>)}</div>}
    {dvf&&<FileViewer file={dvf} onClose={()=>setDvf(null)}/>}
    </div>
  );};

  const ManagementPage=()=>{const[mvf,setMvf]=useState(null);return(
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
      {/* Audit history — filtered, grouped by year then type */}
      {(()=>{
        // Build year list from audit data
        const allYears=[...new Set(audits.map(a=>a.date?.slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);
        const filtered=audits.filter(a=>(auditTypeFilter==="all"||a.type===auditTypeFilter)&&(auditYearFilter==="all"||a.date?.startsWith(auditYearFilter)));
        const byYear={};filtered.forEach(a=>{const y=a.date?.slice(0,4)||"Unknown";if(!byYear[y])byYear[y]=[];byYear[y].push(a);});
        const sortedYears=Object.keys(byYear).sort((a,b)=>b-a);
        return(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:14,fontWeight:600}}>Audit history — {audits.length} record{audits.length!==1?"s":""}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {/* Year filter */}
                {["all",...allYears].map(y=><button key={y} onClick={()=>setAuditYearFilter(y)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:auditYearFilter===y?C.teal:"white",color:auditYearFilter===y?"white":C.muted,border:`1px solid ${auditYearFilter===y?C.teal:C.border}`,cursor:"pointer"}}>{y==="all"?"All years":y}</button>)}
                {/* Type filter */}
                <select value={auditTypeFilter} onChange={e=>setAuditTypeFilter(e.target.value)} style={{fontSize:11,padding:"3px 8px",border:`1px solid ${C.border}`,borderRadius:6,background:C.grayXL,color:C.text}}>
                  <option value="all">All types</option>
                  {Object.entries(AUDIT_FORMS).map(([k,f])=><option key={k} value={k}>{f.icon} {f.title}</option>)}
                </select>
              </div>
            </div>
            {audits.length===0&&<Alert type="blue" title="No audit records yet">Complete an audit above to create your first record.</Alert>}
            {filtered.length===0&&audits.length>0&&<Alert type="blue" title="No records match">Try changing the year or type filter.</Alert>}
            {sortedYears.map(year=>{
              const yearAudits=byYear[year].sort((a,b)=>b.date.localeCompare(a.date));
              const isCollapsed=!!collapsedYears[year];
              const passed=yearAudits.filter(a=>a.outcome==="Passed").length;
              const failed=yearAudits.length-passed;
              return(
                <div key={year} style={{marginBottom:"1rem"}}>
                  {/* Year header — collapsible */}
                  <div onClick={()=>setCollapsedYears(p=>({...p,[year]:!p[year]}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:C.grayXL,borderRadius:collapsedYears[year]?8:"8px 8px 0 0",border:`1px solid ${C.border}`,cursor:"pointer",userSelect:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:14,fontWeight:700,color:C.teal}}>{year}</span>
                      <Chip color="gray">{yearAudits.length} audit{yearAudits.length!==1?"s":""}</Chip>
                      <span style={{fontSize:12,color:C.green,fontWeight:500}}>✓ {passed} passed</span>
                      {failed>0&&<span style={{fontSize:12,color:C.red,fontWeight:500}}>✗ {failed} issues</span>}
                    </div>
                    <span style={{color:C.muted,fontSize:16,transform:isCollapsed?"rotate(0)":"rotate(90deg)",transition:"transform 0.2s",display:"inline-block"}}>›</span>
                  </div>
                  {!isCollapsed&&(
                    <div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",padding:"0.75rem",background:C.card}}>
                      {/* Group by type within year */}
                      {Object.entries(AUDIT_FORMS).map(([key,form])=>{
                        const ta=yearAudits.filter(a=>a.type===key);
                        if(!ta.length)return null;
                        return(
                          <div key={key} style={{marginBottom:"0.875rem"}}>
                            <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:"0.375rem",display:"flex",alignItems:"center",gap:6}}>
                              {form.icon} {form.title} <Chip color="gray">{ta.length}</Chip>
                            </div>
                            {ta.map(a=>(
                              <div key={a.id} style={{background:C.grayXL,borderRadius:6,padding:"8px 10px",marginBottom:4,display:"flex",alignItems:"flex-start",gap:10}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,fontWeight:600}}>{a.date} · {a.clinic}</div>
                                  <div style={{fontSize:11,color:C.muted}}>Auditor: {a.auditor}{a.physioAudited?` · Physio: ${a.physioAudited}`:""}</div>
                                  {a.passed!==undefined&&<div style={{fontSize:11,marginTop:2,display:"flex",gap:10}}>
                                    <span style={{color:C.green}}>✓ {a.passed}</span>
                                    {a.failed>0&&<span style={{color:C.red}}>✗ {a.failed}</span>}
                                    {a.na>0&&<span style={{color:C.muted}}>{a.na} N/A</span>}
                                    <span style={{color:C.muted}}>{a.total} total</span>
                                  </div>}
                                  {a.notes&&<div style={{fontSize:11,color:C.muted,marginTop:3,fontStyle:"italic"}}>{a.notes.slice(0,80)}{a.notes.length>80?"…":""}</div>}
                                  {a.evidence&&<div style={{fontSize:11,color:C.teal,marginTop:2}}>📎 {a.evidence.fileName}</div>}
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
                                  <Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>
                                  <BSm onClick={e=>{e.stopPropagation();setViewAudit(a);}} color={C.blue}>View →</BSm>
                                  <AuditEvidenceBtn audit={a} audits={audits} setAudits={setAudits} onView={setEavf}/>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>}
    {mgmtTab==="meetings"&&(()=>{
      const visibleMeetings=[...meetings].filter(m=>!mFilter||(m.topic+m.clinic+(m.attendees||"")+(m.notes||"")).toLowerCase().includes(mFilter.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
      return <div>
        <Alert type="blue" title="P&P Section 7.6 — Staff meetings">Held quarterly. Minutes stored here. Enter historical meetings by setting any past date. {meetings.length} meeting{meetings.length!==1?"s":""} logged.</Alert>
        <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center"}}>
          <input value={mFilter} onChange={e=>setMFilter(e.target.value)} placeholder="Search meetings…" style={{flex:1,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}/>
          <Btn onClick={()=>setShowAdd(true)}>+ Log meeting</Btn>
        </div>
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
            <input ref={meetRef} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;if(f.size>10*1024*1024){alert("File over 10MB.");return;}const r=new FileReader();r.onload=async ev=>{const att={id:Date.now(),fileName:f.name,fileType:f.type,dataUrl:ev.target.result,uploadedDate:new Date().toLocaleDateString("en-NZ")};setNm(n=>({...n,attachment:att}));const bf=await _uploadToBlob("mtgatt_"+att.id,f.name,f.type,ev.target.result);if(bf)setNm(n=>({...n,attachment:{...n.attachment,blobUrl:bf.blobUrl}}));};r.readAsDataURL(f);e.target.value="";}}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(nm.date&&nm.topic){const updated=[...meetings,{...nm,id:Date.now()}];setMeetings(updated);saveGen("meetings",updated);setNm({date:"",clinic:"All clinics",topic:"",attendees:"",notes:"",attachment:null});setShowAdd(false);}}} >Save</Btn><Btn outline onClick={()=>setShowAdd(false)}>Cancel</Btn></div>
        </Card>}
        {visibleMeetings.length===0&&<Alert type="blue" title="No meetings found">Log a meeting above or adjust the search.</Alert>}
        {visibleMeetings.map(m=>(
          <Card key={m.id} style={{marginBottom:"0.5rem"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:m.attendees||m.notes?6:0}}>
              <div><strong style={{fontSize:14}}>{m.topic}</strong><div style={{fontSize:12,color:C.muted,marginTop:2}}>{m.date} · {m.clinic}</div></div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                <Pill s="ok" label="Completed ✓"/>
                <BSm onClick={()=>{if(window.confirm("Delete this meeting record?")){const u=meetings.filter(x=>x.id!==m.id);setMeetings(u);saveGen("meetings",u);}}} color={C.red}>✕</BSm>
              </div>
            </div>
            {m.attendees&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}><strong style={{color:C.text}}>Attendees:</strong> {m.attendees}</div>}
            {m.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6,marginBottom:m.attachment?6:0}}>{m.notes}</div>}
            {m.attachment&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><span style={{fontSize:11,color:C.muted}}>📎</span><BSm onClick={()=>setEavf(m.attachment)} color={C.teal}>View minutes</BSm><span style={{fontSize:11,color:C.muted}}>{m.attachment.fileName}</span></div>}
          </Card>
        ))}
      </div>;
    })()}}
    {mgmtTab==="equipment"&&<div>
      <Alert type="amber" title="P&P Section 3.1.15 — Equipment">Annual service and test/tag. Upload service certs below. Instruction manuals on manufacturer websites. Equipment maintenance register on shared drive.</Alert>
      <Card>{CLINICS.filter(c=>c.id!=="schools").map(cl=><FileRow key={cl.id} label={`${cl.icon} ${cl.short} — service certificate`} gkey={`equip_${cl.id}`} onView={f=>setMvf(f)} accent={C.amber}/>)}</Card>
      <Btn outline onClick={()=>setActiveAudit("equipment")}>Run equipment audit →</Btn>
      {mvf&&<FileViewer file={mvf} onClose={()=>setMvf(null)}/>}
    </div>}
    {mgmtTab==="accreditation"&&<div>
      <Alert type="green" title="DAA Group — ACC Allied Health Standards">All sections of this portal support your DAA audit readiness. P&P manual underpins all requirements below.</Alert>
      {[
        {t:"Staff credentials — APC, First Aid, Cultural",s:Object.entries(STAFF).every(([id])=>["apc","firstaid","cultural"].every(k=>loadFile(id,k)))?"ok":"pending",d:"All staff hold current APC, First Aid and Cultural Competency — P&P §7",action:()=>{setPage("compliance");setCompTab("overview");}},
        {t:"Police vetting — all staff",s:Object.entries(STAFF).every(([id])=>loadFile(id,"policevetting"))?"ok":"pending",d:"Every 3 years — NZ Police email confirmation — P&P §4.2",action:()=>{setPage("compliance");setCompTab("vetting");}},
        {t:"Clinical notes audits — 6-monthly",s:[...audits].filter(a=>a.type==="clinical_notes").length>0?"ok":"pending",d:"10 records per physio (5 current + 5 past) — P&P §1.5.1",action:()=>{setMgmtTab("audits");setActiveAudit("clinical_notes");}},
        {t:"Orientation — all staff",s:Object.keys(STAFF).every(id=>loadFile(id,"orientation"))?"ok":"pending",d:"Complete digital checklist for each staff member — P&P §7.1",action:()=>setPage("staff")},
        {t:"P&P annual review",s:Object.keys(ppReviews||{}).length>=(PP_SECTIONS?.length||8)?"ok":"pending",d:"Due April — P&P §1.1",action:()=>{setPage("pp");}},
        {t:"In-service training",s:inservices.some(i=>String(i.year||i.date?.slice(0,4)||"")===String(new Date().getFullYear()))?"ok":"pending",d:"At least one per clinic per year — P&P §7.7.3",action:()=>setPage("inservice")},
        {t:"H&S audits — quarterly",s:[...audits].filter(a=>a.type==="hs_audit").length>0?"ok":"pending",d:"Records in audit history — P&P §1.5.2",action:()=>{setMgmtTab("audits");}},
        {t:"Fire drills — annual",s:[...audits].filter(a=>a.type==="fire_drill").length>0?"ok":"pending",d:"Annual requirement — P&P §3.1.2",action:()=>{setMgmtTab("audits");}},
        {t:"Staff meetings — quarterly",s:meetings.length>0?"ok":"pending",d:"Minutes logged in Staff Meetings tab — P&P §7.6",action:()=>setMgmtTab("meetings")},
        {t:"Equipment servicing — annual",s:[...audits].filter(a=>a.type==="equipment").length>0?"ok":"pending",d:"Annual service and test/tag — P&P §3.1.15",action:()=>setMgmtTab("equipment")},
        {t:"Hygiene audits — quarterly",s:[...audits].filter(a=>a.type==="hygiene").length>0?"ok":"pending",d:"Quarterly per clinic — P&P §1.5.2",action:()=>{setMgmtTab("audits");}},
        {t:"Client satisfaction survey",s:"pending",d:"Via website or forms — P&P §1.5.3",action:null},
      ].map(({t,s,d,action})=>(
        <div key={t} onClick={action||undefined} style={{background:C.card,border:`1px solid ${s==="ok"?C.teal:C.border}`,borderRadius:8,padding:"0.875rem 1rem",marginBottom:"0.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,cursor:action?"pointer":"default"}} onMouseEnter={e=>{if(action)e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.08)";}} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>{t}{action&&<span style={{fontSize:10,color:C.teal}}>→</span>}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{d}</div>
          </div>
          <Pill s={s} label={s==="ok"?"Compliant ✓":"Action needed"}/>
        </div>
      ))}
    </div>}
    </div>
  );};

  if(portalLoading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg,fontFamily:"-apple-system,'Segoe UI',sans-serif"}}><div style={{textAlign:"center"}}><div style={{width:48,height:48,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div><div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:4}}>Total Body Physio</div><div style={{fontSize:13,color:C.muted}}>Loading portal...</div></div></div>);

  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{width:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:10,overflowY:"auto"}}>
        <div style={{padding:"1.25rem 1rem",borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div>
          <div style={{fontSize:13,fontWeight:600}}>Total Body Physio</div>
          <div style={{fontSize:11,color:C.muted}}>PhysioPortal</div>
        </div>
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
                <div onClick={()=>setPage(item.id)} style={{display:"flex",alignItems:"center",padding:"8px 1rem",fontSize:13,color:page===item.id?C.teal:C.muted,cursor:"pointer",borderLeft:page===item.id?`3px solid ${C.teal}`:"3px solid transparent",background:page===item.id?"#E1F5EE":"transparent",fontWeight:page===item.id?500:400}}>
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
      <div style={{marginLeft:220,flex:1,padding:"1.5rem",minHeight:"100vh"}}>
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
      <ProfileModal id={profile} onClose={()=>{setProfile(null);fu(n=>n+1);}} role={role} onStaffSave={(id,saved)=>setStaffOverrides(p=>({...p,[id]:saved}))} staffOverrides={staffOverrides}/>
      {viewAudit&&<AuditViewModal audit={viewAudit} onClose={()=>setViewAudit(null)}/>}
      {activeAudit&&<AuditModal type={activeAudit} onClose={()=>setActiveAudit(null)} onComplete={r=>{setAudits(p=>{const updated=[...p,r];saveGen("audits",updated);return updated;});setActiveAudit(null);setPage("management");setMgmtTab("audits");}}/>}
      {vf&&<FileViewer file={vf} onClose={()=>setVf(null)}/>}
    </div>
  );
}
