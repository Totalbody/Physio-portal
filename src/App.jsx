import { useState, useRef } from "react";

const C = {
  teal:"#0F6E56",tealL:"#E1F5EE",red:"#E24B4A",redL:"#FCEBEB",
  amber:"#BA7517",amberL:"#FAEEDA",green:"#3B6D11",greenL:"#EAF3DE",
  blue:"#185FA5",blueL:"#E6F1FB",gray:"#5F5E5A",grayL:"#F1EFE8",
  grayXL:"#FAFAF8",border:"#e2e0d8",text:"#1a1a18",muted:"#6b6963",
  hint:"#9b9892",bg:"#f5f3ee",card:"#ffffff",
};

// ─── P&P SECTIONS (from TBP Policies and Procedures Manual) ──────────────────
const PP_SECTIONS = [
  {id:"qrm", icon:"📊", title:"1. Quality & Risk Management", color:"#0F6E56", policies:[
    {title:"1.1 Policies & Procedures Manual", key:"pp_manual", summary:"The P&P manual is accessible to all current staff and confidential to TBP. Reviewed annually by the Director(s). Hard copy kept by Administrative Manager; digital copy on shared drive. No part may be photocopied without Director authorisation.", bullets:["Reviewed annually at the annual P&P staff meeting","Hard copy: Administrative Manager","Digital copy: portable hard drive (Director) + shared drive","No photocopying without Director authorisation","Confidential to current TBP employees and contractors"]},
    {title:"1.2 Clinical Governance — Clinical Director", key:"clinical_dir", summary:"Alistair Burgess is the named Clinical Director. Minimum 5 years experience and postgraduate certificate required. Must complete clinical review before 16th visit for each client.", bullets:["Named Clinical Director: Alistair Burgess","Minimum 5 years physiotherapy experience + postgrad cert required","Conduct internal audits of clinical record keeping","Provide clinical oversight — diagnosis, causation, treatment, planning","Clinical review required before 16th client visit","Review includes: mechanism of injury, diagnosis, causation, treatment plan, recommendations, expected outcome","Clinical Director must be available to discuss findings with treating provider","Report not required where client already has specialist oversight","If Clinical Director is treating provider — request subcontract approval from ACC: health.procurement@acc.co.nz"]},
    {title:"1.3 Business Plan", key:"biz_plan", summary:"Reviewed and revised annually by Director(s). Contains implementation calendar. Three copies: Master (Director, confidential), Clinic copy (shared drive, no financials).", bullets:["Reviewed annually by Director(s)","Contains implementation calendar — reviewed and actioned/rescheduled","Master copy: Director only (includes financial planning — confidential)","Clinic copy: shared drive, available to all staff, no financial information","Confidential to current TBP staff"]},
    {title:"1.3.1 Quality Improvement Plan", key:"quality_plan", summary:"Current quality plan encompassing all facets of service and all staff. Integral part of the Business Plan, reviewed at least annually.", bullets:["Reviewed at least annually with Business Plan","Clinical performance concerns resolved in accordance with ACC","Clinical Director monitors standard of clinical care","Statistics evaluated by Directors as per Business Plan"]},
    {title:"1.3.2 Risk Management Plan", key:"risk_plan", summary:"Part of the Business Plan. Details risks to the business and includes a full list of all relevant legislation.", bullets:["Part of the Business Plan","Includes full list of all relevant legislation","Reviewed via annual Business Plan review and H&S audit"]},
    {title:"1.4 Statistics", key:"statistics", summary:"Financial statistics collected monthly. Service delivery statistics collated annually before staff meeting. Ethnicity monitored during intake for cultural service delivery assessment.", bullets:["Financial statistics: monthly by Director(s)","Service delivery statistics: annual, fed back to staff","Reports generated through Cliniko and Google Forms","Ethnicity recorded at initial intake — used to assess cultural service delivery","Client satisfaction surveys assist with statistical analysis"]},
    {title:"1.5.1 Clinical Note Audit", key:"cn_audit", summary:"Completed every 6 months by physiotherapists. 10 records per physio — 5 current, 5 past (to audit discharge process). Forms stored on Google Drive; emailed to Administrative Manager for filing.", bullets:["Frequency: every 6 months","10 records per physiotherapist — 5 current, 5 past","Audit form stored on Google Drive","Completed forms emailed to Administrative Manager for personnel file","Discussed at annual performance review","May form part of peer review"]},
    {title:"1.5.2 Health & Safety Audit", key:"hs_audit_policy", summary:"Three-monthly H&S audit by physiotherapy staff, checked by H&S Officer. Anything potentially dangerous reported to Director(s) immediately.", bullets:["Frequency: quarterly (every 3 months)","Completed by physiotherapy staff, checked by H&S Officer","Includes: hygiene audit, equipment audit, safety/hazards","Template stored on Google Drive","Anything dangerous reported to Director(s) immediately"]},
    {title:"1.5.3 Client Satisfaction", key:"client_sat", summary:"Client feedback welcomed verbally or in writing via satisfaction forms or website. Used to identify service improvements and inform policy design.", bullets:["Feedback received verbally or in writing","Client satisfaction surveys identify strengths and weaknesses","Feedback informs policy and procedure design","All complaints managed via complaints procedure"]},
  ]},
  {id:"prof", icon:"⚖️", title:"2. Professional Standards", color:"#185FA5", policies:[
    {title:"2.1.1 Privacy Policy", key:"privacy_pol", summary:"All staff must understand the Privacy Act 2020 and Health Information Privacy Code 2020. Annual privacy refresher by Privacy Officer at staff meeting. Privacy and confidentiality procedures accessible to clients via website and client information booklet.", bullets:["Staff must understand Privacy Act 2020 and HIPC 2020","Copies in orientation folder","Free online training: privacy.org.nz — Health 101 and Health ABC modules","Annual privacy refresher at staff meeting","Privacy Officer appointed","Information collected fairly and sensitively","Stored and disposed of securely","Disclosure follows correct procedures (see Referrals policy)"]},
    {title:"2.1.2 Privacy Officer", key:"privacy_off", summary:"Privacy Officer responsible for encouraging compliance with Health Information Privacy Code and Privacy Act. Must respond to complaints within 24 hours, resolve within 20 days. Serious harm breaches reported to Privacy Commissioner.", bullets:["Familiar with Privacy Act 2020 principles","Manage personal information access requests and privacy complaints","Handle complaints in conjunction with Directors","Liaise with Office of the Privacy Commissioner if required","Advise staff on compliance and privacy impacts","Hold annual privacy refresher for all staff","Complaint response: acknowledge within 24 hours","Complaint resolution: respond with findings within 20 days","Serious harm breaches: report to Privacy Commissioner at privacy.org.nz"]},
    {title:"2.2.1 Consent to Assessment & Treatment", key:"consent_treat", summary:"All clients must give informed consent at initial consultation. Oral informed consent sufficient for routine assessment and treatment (per Physiotherapy Board NZ). Consent required for each treatment session and any significant change in treatment plan.", bullets:["All clients: informed consent at initial consultation","Physiotherapy Board NZ: oral informed consent sufficient for routine treatment","Client must be given information booklet before assessment","'Informed Verbal Consent Obtained' must be ticked on Initial Assessment form in Cliniko","Consent required for each treatment session","Consent required for any significant change in treatment plan — document in clinical notes","Client below age 16: consent from parent or guardian — document in notes"]},
    {title:"2.2.2 Confidentiality Policy", key:"confidentiality", summary:"Client consent required for disclosure. Discussed at initial assessment. Disclosure bound by Privacy Act 2020 and HIPC 2020.", bullets:["Consent for disclosure discussed at initial assessment","Standard parties: ACC Case Managers, GPs, Health Insurance Companies, Specialists","Other parties: contact client first, document consent in file","Bound by Privacy Act 2020 and HIPC 2020","Disclosure may be necessary to protect rights, property, or safety","Disclosure may be required by law enforcement or national security"]},
    {title:"2.2.3 Consent to Treatment Observation", key:"consent_obs", summary:"Informed consent required before any colleague observes treatment. Client asked away from the observer. Consent documented on Cliniko profile.", bullets:["Informed consent required before treatment observation commences","Client asked (away from observer) if they consent","Client reminded that observer is aware of the Privacy Act","Consent documented on client's Cliniko profile"]},
  ]},
  {id:"hs", icon:"🦺", title:"3. Health & Safety", color:"#BA7517", policies:[
    {title:"3.1 Health & Safety Plan", key:"hs_plan", summary:"Goal: reduce risk to employee and client wellbeing. H&S plan is part of the Business Plan.", bullets:["Includes: policy/goal statement, responsible persons, hazard identification, hazard controls, emergency response, employee training, record keeping","Part of the Business Plan"]},
    {title:"3.1.2 Fire", key:"fire_pol", summary:"Centre fitted with fire extinguisher. Staff reminded annually on how to use it. All electronic equipment off at end of each day. TBP is smoke-free.", bullets:["Fire extinguisher fitted — staff reminded annually on use","Last physio each day: ensure all electronic equipment switched off","TBP is smoke-free","If fire suspected: activate alarm, call 111","If easily extinguished with one extinguisher: extinguish","Remove anyone from danger if safe to do so","Close windows and doors on exit — leave doors unlocked","After event: complete incident report and review emergency plan"]},
    {title:"3.1.3 Clinical Emergency", key:"clinical_emerg", summary:"All staff must hold current First Aid certificate including CPR, renewed every 2 years. DRSABCD protocol.", bullets:["All staff: current First Aid cert including CPR — renewed every 2 years","Call 111 if appropriate","DRSABCD: Danger, Response, Send for help, Airway, Breathing, CPR, Defibrillator","30 compressions: adult two hands, child one hand, baby two fingers","Pinch nose, two breaths (compressions only if vomit/blood and no mask)","Get assisting staff to bring AED","Do not stop CPR until medical staff advise or person regains consciousness","All clinical emergencies documented via Incident Reporting"]},
    {title:"3.1.4 Evacuation / Disaster Plan", key:"evacuation", summary:"Procedures for earthquake, flood, severe storm, eruption, tsunami. Follow Civil Defence guidance.", bullets:["Earthquake: Drop, Cover, Hold — stay indoors, do not run outside","Flood: raise/remove valuables, avoid flooded areas, prepare for high ground","Severe storm: stay indoors, close curtains, partially open sheltered window","Eruption: stay indoors, close windows/doors, wear substantial clothing if outside","Tsunami: move inland to high ground immediately — if shaking is strong/long (1+ min) or magnitude 7+, evacuate immediately","Contact Civil Defence: 0800 22 22 00","Follow school health centre staff instructions","School-specific evacuation procedures posted on wall"]},
    {title:"3.1.7 Incident Reporting", key:"incident_rep", summary:"Incident report form completed for any hazards, risks, accidents, incidents or near misses. Stored in Cliniko. H&S Officer must be notified.", bullets:["Required for: hazards, risks, accidents, incidents, near misses","Form stored in client or staff profile in Cliniko","Full detailed account — dated by witnessing staff member","H&S Officer must be notified","Immediate risk to staff or clients: call ACC 0800 222 070","All H&S incidents: report to ACC at acc.co.nz","Notable events (death, illness, injury requiring hospitalisation): report to WorkSafe at worksafe.govt.nz"]},
    {title:"3.1.8 Complaints Procedure", key:"complaints", summary:"All complaints dealt with promptly. Reported to Director(s) within 24 hours. Director contacts complainant within 24 hours. Written acknowledgement within 5 days if unresolved.", bullets:["All staff must be perceptive to complaints — formal or informal","Complaints form: website FAQ section","Clients informed of right to complain — waiting room wall and client booklet","Report complaint to Director(s) within 24 hours","Director contacts complainant within 24 hours","Director and staff discuss and plan resolution","Written acknowledgement within 5 days if unlikely to resolve quickly","Follow Code of Health & Disability Services Consumers' Rights","Privacy complaints: Director and Privacy Officer handle together"]},
    {title:"3.1.9 Hygiene / Infection Control", key:"hygiene_pol", summary:"All staff responsible for keeping clinic clean. Infection prevention includes hand hygiene, PPE, equipment cleaning, no reuse of single-use items, safe waste disposal.", bullets:["Hand hygiene — before and after every client contact","Use of PPE (gloves, masks) as required","Cleaning/disinfecting equipment appropriately","No reuse of single-use equipment (e.g. needles)","Safe management and disposal of waste and sharps","Additional measures as necessary: single room treatment, safe linen handling"]},
    {title:"3.1.10 Personal Hygiene", key:"personal_hygiene", summary:"Staff must sanitise/wash hands before and after any client contact, after using toilet, and before eating. Open wounds must be covered.", bullets:["Sanitise or wash hands before AND after every client contact","Wash hands after toilet and before eating","Cover all open wounds with dressings or plasters"]},
    {title:"3.1.11 Clinic Hygiene", key:"clinic_hygiene", summary:"Clinic maintained by Auckland City Council facilities management. Physiotherapists responsible for rooms after each client.", bullets:["Clinic on council grounds — maintained by Auckland City Council","Report cleaning standard issues to Director(s)","After each client: return equipment to storage, wipe plinth with alcohol wipe, wash hands","Desks cleaned daily or more if required","Plinths cleaned with alcohol wipes","Alcohol wipes stored neatly on bench"]},
    {title:"3.1.12 Laundry", key:"laundry", summary:"Shorts and gowns available. Clients encouraged to bring own. Used items collected by Director(s) for laundering.", bullets:["Clients encouraged to bring own shorts/gowns","Used clinic shorts/gowns: placed in plastic bag, collected by Director(s)","Full hot wash cycle required","Tumble dry on high temperature for minimum 30 minutes","Ensures bacteria destroyed"]},
    {title:"3.2 Dry Needling", key:"dry_needling", summary:"Dry needling must be within individual scope of practice. Disposable needles only — never reuse. Fully documented including consent, warnings and contraindications.", bullets:["Must be within individual scope of practice","Use disposable sterile needles only — never reuse","Document DN procedure clearly in clinical notes","Warnings given and informed consent noted","Child under 16: parent/guardian consent required — parents present for first treatment","Consent to include: contraindications, precautions, possible adverse outcomes","Explain: needle insertion, sterile single-use needles, how DN works, possible transient symptoms, driving advice, post-needling soreness (48–72hrs)","High risk areas: needle shallow, direct away from vulnerable structures","Pregnancy: use with caution — risk of miscarriage especially first trimester — consider written consent","Sharps box: filled to 3/4 only, dispose at Chemist Warehouse, stored safely between use"]},
  ]},
  {id:"rights", icon:"🤝", title:"4. Rights & Responsibilities", color:"#533AB7", policies:[
    {title:"4.1 Client Rights & Responsibilities", key:"client_rights", summary:"All staff familiar with Health & Disability Commissioner Act 1994 and Code of Health & Disability Services Consumers' Rights 1996.", bullets:["All staff familiar with HDC Act 1994 and Code of Rights 1996","Clients treated with respect and privacy — gowns and shorts provided","All clients may bring a support person or advocate","Preference for treatment provider accommodated where practicable","Communicate effectively according to client's needs","ACC interpreters available for most cultural groups: 0800 101 966","Code of Rights on waiting room wall, pamphlets in waiting room, and in client booklet"]},
    {title:"4.2 Vulnerable Clients", key:"vulnerable", summary:"Vulnerable clients include children, older adults and people with disabilities. All staff must complete safety checks every 3 years.", bullets:["Vulnerable clients: children, older adults, people with disabilities","Physiotherapist suspects abuse: seek advice from health providers with expertise in abuse","Oranga Tamariki Information Sharing helpline: 0508 463 674","All staff aware of Children's Act 2014","Safety checks required: identity verification, reference checks, employment verification, PBNZ registration check, interview, police vetting, risk assessment","Police vetting and risk assessment: renewed every 3 years"]},
    {title:"4.3 Child Protection Policy", key:"child_protect", summary:"Welfare of child is first and most important consideration. Child = anyone under 18 years. Safety checks required for all staff working with children.", bullets:["Child = anyone under 18 years","Safety checks for all staff working with children: identity verification, police vetting, reference checks, employment verification, PBNZ check, interview, risk assessment","Child abuse not defined in Act — includes physical, emotional, sexual harm, ill treatment, abuse, neglect, deprivation","If child in immediate danger: call 111","If concerned: phone Oranga Tamariki on 0508 326 459","Obtain consent from victim before reporting — unless child at risk (overrides Privacy Act)","Section 66 Oranga Tamariki Act request: must release information — confirm from Police or Oranga Tamariki representative"]},
    {title:"4.4 Cultural Competency", key:"cultural_comp", summary:"All staff must practice cultural safety. Complete eCALD, Mauriora and ongoing cultural CPD. Cultural safety is a policy of ensuring respect for cultural and social differences.", bullets:["All staff practice cultural safety","Complete cultural competency training: eCALD, Mauriora, ongoing CPD and reflective practice","Establish links with school cultural leadership teams","Follow procedure for reception of clients with disability or cultural barriers"]},
    {title:"4.5 Māori Health", key:"maori_health", summary:"All staff respect Te Tiriti o Waitangi. All staff must complete Mauriora Cultural Competency course. Specific cultural safety procedures apply.", bullets:["Respect Te Tiriti o Waitangi at all times","All staff complete Mauriora Cultural Competency course","Familiar with ACC guideline: Te tūoro Māori me a mahi Cultural Competencies for Providers","Tangata Whenua consulted at each location","Pillows must never be placed on floor","Consent required before placing hands on head, neck or face of Māori clients","Pillows used under head must not be placed under legs or feet","Respect all non-verbal and verbal communication","Support Traditional Healing into home exercise programs where possible","All Māori clients entitled to support person or Whānau member","Specific treatment goals set in conjunction with client and Whānau","Language barriers: identify at booking — organise interpreter or family member","Private treatment rooms available","Ethnicity data collected through client satisfaction surveys"]},
    {title:"4.6 Reception of Clients with Disability or Cultural Barriers", key:"disability_culture", summary:"Cross-cultural communication improves accuracy of assessment, delivery of instructions, and client education. Use simplified language and visual cues.", bullets:["Ask questions to reveal client's understanding of their health issue","Acknowledge differences in perceptions, negotiate treatment plans","Practice active listening, involve clients in decision making","Simplify language when explaining diagnoses and treatment plans","Use visual cues: charts, equipment, demonstrations","Applies especially to clients with disabilities","Empowers clients to participate and direct their own care"]},
  ]},
  {id:"client_mgmt", icon:"🏥", title:"5. Client Management", color:"#1D9E75", policies:[
    {title:"5.1 Initial Consultation", key:"initial_consult", summary:"Clients seen within 5 days of referral (ACC requirement). Initial appointment minimum 45 minutes. Initial assessment template completed in Cliniko in its entirety.", bullets:["Clients may self-refer — pre-entry screening completed","Seen within 5 days of referral (ACC Allied Health Service Schedule)","Booking details required: name, injury site, daytime contact number","Initial appointment: minimum 45 minutes for ACC or Private","Arrange interpreter if required — ACC interpreters: 0800 101 966","Outside scope of practice: refer to school nurse or GP","Initial assessment template completed in Cliniko in full","Must include: full assessment and accurate diagnosis, clinical records, treatment plan, anticipated visits and goals, outcome measures, education on self-management, referrals where necessary"]},
    {title:"5.2 Follow-up", key:"followup", summary:"Follow-up provided per treatment plan. Goals reviewed at each visit. Documentation on Cliniko using standard consultation template.", bullets:["Follow treatment plan developed at initial consultation","Document on Cliniko using standard consultation template","Goals reviewed at each follow-up — management plan altered as needed","Include: clinical evidence treatment relates to covered injury, outcome measures, referrals where necessary, prior approval forms where required"]},
    {title:"5.3 Telehealth", key:"telehealth", summary:"Telehealth replaces in-person consultation — not appropriate where physical examination required. Both physio and client must be in NZ.", bullets:["Requires client consent — option of in-person if preferred","Not appropriate where physical examination required","Both physiotherapist and client must be in NZ at time of consultation","Only for clients who would normally attend the clinic in person","Clinical note using telehealth template in Cliniko required"]},
    {title:"5.4 Referrals", key:"referrals", summary:"Refer to specialist or other healthcare professional if clinically indicated. ACC prior approval required for some services.", bullets:["Refer if clinically indicated or client requests","Client entitled to second opinion — discuss and facilitate","Referral templates available in Cliniko","Referrals emailed where possible","ACC prior approval required for: Vocational Services, Pain Specialists, Social Rehabilitation Services","Notify ACC: claims@acc.co.nz when referring to services requiring ACC approval"]},
    {title:"5.5 Discharge Process", key:"discharge", summary:"Discharge summary completed in Cliniko per ACC Allied Health Services Operational Guidelines. Discharge letter to GP where GP referred.", bullets:["Discharge summary completed in Cliniko per ACC guidelines","Discharge summary provided to ACC if required","Discharge letter to GP if GP referred (minimum: response to treatment, specific follow-up required)","If client fails to attend: attempt to contact to check for complaints — record in notes"]},
    {title:"5.6 Prioritisation Policy", key:"prioritisation", summary:"Urgent cases (acute injuries, immediate attention) prioritised. Non-urgent based on earliest availability. Emergency: refer to medical services immediately.", bullets:["Urgent cases prioritised — acute injuries or requiring immediate attention","Non-urgent: scheduled on earliest availability based on clinical needs and preferences","Detailed client management system maintained and regularly updated","Regular communication among physiotherapists encouraged","Telehealth offered where appropriate","Discharge based on clinical assessment, goal achievement, or mutual agreement","Emergency: refer to necessary medical services immediately"]},
    {title:"5.7 Limitations of Services", key:"limitations", summary:"TBP does not offer: pelvic health, home visits, psychiatric care, or offsite services. Guide clients to appropriate services.", bullets:["TBP does NOT offer: Pelvic Health","TBP does NOT offer: Home visits","TBP does NOT offer: Psychiatric care","TBP does NOT offer: Offsite services","Clients requiring above services: guide to appropriate service provider"]},
  ]},
  {id:"info_mgmt", icon:"📁", title:"6. Information Management", color:"#D4537E", policies:[
    {title:"6.1 Clinical Records", key:"clinical_records", summary:"Clinical records completed for every client visit in Cliniko within 24 hours of treatment. SOATAP format. Outcome measures recorded every visit.", bullets:["Cliniko: 2-factor authentication required for login","Records completed within 24 hours of treatment session","Templates: Initial consultation, Follow-up/standard, Discharge summary, Telehealth","SOATAP format with SMART goals","Outcome measures: numerical pain rating scale + patient specific functional scale","Each record: treating physiotherapist's Cliniko login, dated, ACC45 number","ACC claims submitted via Submit Kit","All client communications (phone/email) documented in communications section","ACC audit request: clinical notes provided within 10 working days","Manual form available if internet/computer unavailable — input to Cliniko ASAP and destroy manual form"]},
    {title:"6.2 Communication", key:"communication", summary:"All communication with ACC conducted by Clinical Director. Any client communication documented in their Cliniko profile.", bullets:["All ACC service communication: Clinical Director","Any client communication: documented in communications section of Cliniko profile"]},
    {title:"6.3 Shared Drive", key:"shared_drive", summary:"Shared drive accessible via pakuranga@totalbodyphysio.co.nz (password protected). Personnel files, financial information and client records NOT stored on shared drive.", bullets:["Shared drive: caseload list, orientation info, audits, general shared documents","NOT on shared drive: personnel files, financial information, client records","Access via: pakuranga@totalbodyphysio.co.nz (password protected)"]},
    {title:"6.4 Correspondence", key:"correspondence", summary:"All correspondence with clients, ACC and healthcare providers documented. Open communication with referring providers.", bullets:["Document all correspondence in clinical notes or communications section of Cliniko","Open communication lines with referring healthcare providers","Referral letters: use letter template in Cliniko","If client declined: communicate reason and recommended action to client and healthcare provider","Client must give consent for communications involving a second party","All specialist, x-ray or other reports: uploaded to client Cliniko profile"]},
    {title:"6.5 ACC Reports", key:"acc_reports", summary:"TBP will provide reasonable ACC information requests including functional objectives, treatment rationale, outcome measures, discharge summaries. Provided free of charge.", bullets:["Provide all reasonable ACC information requests free of charge","ACC may request: functional objectives, treatment achievements, clinical rationale, proposed plan, goals, number of treatments, outcomes, return to work plan, discharge summary","ACC may conduct audits — Director(s) and staff available for performance meetings"]},
    {title:"6.6 Website", key:"website", summary:"Website totalbodyphysio.co.nz managed by Administrative Manager. Comments/feedback/complaints via website reviewed by Administrative Manager.", bullets:["Website: totalbodyphysio.co.nz","Managed by Administrative Manager","Feedback/complaints submitted via website — reviewed by Admin Manager, discussed with Director(s) as needed"]},
    {title:"6.7 Client Information Booklet", key:"client_booklet", summary:"Provided to all clients on first visit. Physiotherapist ensures new clients receive and understand the booklet including consent and outcome measures pages.", bullets:["Provided to all new clients on first visit","Administrative Manager keeps booklet up to date","Physiotherapist explains important points — especially consent and outcome measures pages"]},
  ]},
  {id:"hr", icon:"👥", title:"7. Human Resources", color:"#639922", policies:[
    {title:"7.1 Orientation", key:"orientation_pol", summary:"All new physiotherapy staff complete orientation within one month of start date. Minimum 2–3 hours set aside on first day. Includes ACC-specific induction before independent practice.", bullets:["Orientation checklist completed and reviewed within one month","Minimum 2–3 hours on first day for orientation","Director(s) responsibility: personally orientate or delegate treatment-related policies","Clerical staff orientate new staff on facility and admin duties","Must include ACC-specific induction before commencing independent practice","New staff: inducted then assessed on quality and safety of practice"]},
    {title:"7.2 Contracts of Employment", key:"contracts_pol", summary:"All staff have current contracts. Negotiated at commencement. Must be signed by end of Orientation Programme. Reviewed annually at performance review.", bullets:["All staff have current contract of employment","Negotiated at commencement — signed by end of Orientation Programme","Job description attached to and signed with contract","Two signed copies: one to employee, one in personnel file","Annual review: at end of financial year during annual performance review","Contract agreement between Hakinakina Hauora Health Services and TBP for contracted staff","Contracted physiotherapists provide own stock/materials","Contracted staff must complete TBP orientation programme"]},
    {title:"7.3 Job Descriptions", key:"job_descriptions", summary:"All staff have current job descriptions bound to employment contract. Reviewed annually at performance appraisals.", bullets:["All staff: current job description bound to contract","Discussed in full during contract negotiation","Job descriptions stored in Business Plan folder on shared drive","Positions: Director, Clinical Director Physiotherapy, Physiotherapist, Administrative Manager, Health and Safety Officer, Privacy Officer","Available to all other staff members","Director(s) review all JDs annually at performance appraisal time"]},
    {title:"7.4 Codes of Conduct", key:"codes_conduct", summary:"All TBP physiotherapists bound by the Aotearoa New Zealand Physiotherapy Code of Ethics and Professional Conduct (Physiotherapy Board of NZ). Copy on shared drive.", bullets:["Bound by PBNZ Code of Ethics and Professional Conduct","Copy stored on shared drive"]},
    {title:"7.5 Personnel Files", key:"personnel_files", summary:"Stored securely by Administrative Manager. Staff entitled to view own file on request.", bullets:["Stored securely by Administrative Manager","Staff may view own file on request","Contents: employee details (incl. emergency contact), signed ACC partnership agreement, signed contract and JD, APC certificate, PNZ membership cert, First Aid cert, Cultural competency CPD certs, signed orientation checklist, annual reviews, peer reviews, clinical notes audits"]},
    {title:"7.6 Staff Meetings", key:"staff_meetings", summary:"Held every 3 months. Annual meeting covers P&P and Business Plan changes, H&S updates and privacy update. Attendance compulsory. Minutes by Administrative Manager, stored on shared drive.", bullets:["Frequency: every 3 months (quarterly)","Annual meeting: P&P changes, Business Plan updates, H&S and privacy update","All staff attendance compulsory","Minutes taken by Administrative Manager","Minutes stored on shared drive","Chaired by Director(s)"]},
    {title:"7.7.1 Peer Review", key:"peer_review", summary:"Formal peer review at least annually. At least one current client per therapist. Internal or external (Hakinakina Hauora, TBP Flat Bush, TBP Titirangi).", bullets:["At least annually","At least one current client per therapist","May be internal or external review","External partners: Hakinakina Hauora Health Services, TBP Flat Bush, TBP Titirangi","Annual peer review template: Physiotherapy Board of NZ — stored on shared drive","Must include: pre-treatment discussion, clinical notes review, observation of assessing/treating","Client consent sought away from observing physiotherapist"]},
    {title:"7.7.2 Annual Performance Review", key:"appraisal_pol", summary:"All staff including Directors complete annual review. Done in April/May. At least one hour per staff member. Contract and job description also reviewed.", bullets:["All staff — professional, clerical and Directors","Completed in April/May","Minimum one hour per staff member","Director completes last section of appraisal form before meeting","Professional planning for coming year included","Both Director and staff member sign appraisal form","Contract and job description reviewed at same meeting","Templates stored on shared drive"]},
    {title:"7.7.4 Continuous Professional Development", key:"cpd_pol", summary:"Minimum 100 hours CPD every 3 years (rolling average) per PBNZ. Three annual reflective statements required — one specific to Māori culture. Annual CPD plan per PBNZ template.", bullets:["Meet PBNZ and ACC professional development requirements","Must be member of Physiotherapy New Zealand and PBNZ","Annual Professional Development Plan per PBNZ template","Minimum: 100 hours CPD every 3 years (rolling average)","3 reflective statements annually: 1 specific to Māori culture, 2 on culture/ethics/professionalism","CPD hours checked at annual performance review","In-services and peer reviews contribute to CPD hours","ACC-specific training requirements completed as available"]},
  ]},
  {id:"accounts", icon:"💰", title:"8. Accounts", color:"#BA7517", policies:[
    {title:"8.1 Staff Wages", key:"wages", summary:"Wages paid fortnightly by automatic payment. Director processes wages and keeps records of wages and PAYE/WT calculations.", bullets:["Fortnightly automatic payment","Director processes wages","Full record of all wages and PAYE/WT calculations kept","Tax tables: ird.govt.nz","Contracted staff: TBP prepares invoice for work done, cross-checked against statistics"]},
    {title:"8.2 Processing & Payment of Debtors", key:"debtors", summary:"All incoming accounts cross-referenced with Google Document of purchases. Uploaded to Xero monthly. Administrative Manager sorts accounts requiring payment.", bullets:["Cross-reference all incoming accounts with Google Document of purchases before payment","Write date received on incoming accounts — upload to Xero monthly","Stock accounts: attach all packing slips and cross-reference","Admin Manager sorts accounts for current calendar month — informs Jade Warren","Details of payment written on invoice, dated and signed","Invoices for paid accounts kept on Xero","Contracted staff provide all supplies for treatments"]},
    {title:"8.3 Client Invoicing", key:"invoicing", summary:"Outstanding amounts collected at discharge. Accounts sent monthly. Escalating reminders at 30, 60, 90 days.", bullets:["Admin Manager informed when client discharged — outstanding amount collected","Pay at end of each treatment where possible","Monthly report of outstanding accounts — invoice emailed","30 days: 'A Friendly Reminder'","60 days: 'Reminder, Payment is Overdue' — Admin Manager rings account holder","90 days: 'Final Notice, Payment within 7 days'","Unpaid accounts: handed to Director(s) to pursue or write off"]},
    {title:"8.4 Annual Accounts", key:"annual_accounts", summary:"Yearly accounts prepared by Director(s) at end of financial year and presented to accountant.", bullets:["Director(s) prepares accounts ledger, receipts and documentation","Accountant forwards checklist — Director works through it","All material presented to accountant by Director(s)"]},
  ]},
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
  jade:     {name:"Jade Warren",        ini:"JW",color:"#0a3d2e",title:"Owner / Director · Physiotherapist",             clinics:["pakuranga","flatbush","titirangi","panmure"],type:"Owner",         bio:"Founded Total Body Physio in 2000. Physiotherapist and director overseeing all clinics.",info:[["Role","Owner / Director"],["Clinics","All locations"]]},
  alistair: {name:"Alistair Burgess",   ini:"AB",color:"#0F6E56",title:"Senior Physio · Clinical Director · H&S Officer", clinics:["pakuranga","schools"],type:"Employee",bio:"M.Phty, B.App.Sc, NZRP. 8+ years. Strength Training, Movement Assessment, Shoulder & Core Rehab. Former NZ U19 rugby.",info:[["Role","Senior Physiotherapist"],["Additional","Clinical Director · H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-14433 / HPI: 29CMBK"],["Started","24 October 2023"]]},
  timothy:  {name:"Timothy Keung",      ini:"TK",color:"#185FA5",title:"Physiotherapist",                                clinics:["pakuranga","titirangi","panmure"],type:"Contractor",bio:"Fluent in Mandarin, Cantonese, and English. Pursuing postgraduate study in acupuncture.",info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"],["Clinics","Pakuranga · Titirangi · Panmure"]]},
  hans:     {name:"Hans Vermeulen",     ini:"HV",color:"#533AB7",title:"Physiotherapist · Clinic Lead",                  clinics:["titirangi"],type:"Contractor",bio:"Nearly 20 years with Total Body Physio. Clinic lead at Titirangi.",info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"],["Clinic","Titirangi"]]},
  dylan:    {name:"Dylan Connolly",     ini:"DC",color:"#D85A30",title:"Physiotherapist",                                clinics:["pakuranga"],type:"Employee",bio:"Manual therapy specialist. Employee from December 2025.",info:[["Role","Physiotherapist"],["Type","Employee"],["Started","December 2025"],["Clinic","Pakuranga"]]},
  ibrahim:  {name:"Ibrahim Al-Jumaily", ini:"IA",color:"#1D9E75",title:"Physiotherapist · New graduate",                 clinics:["pakuranga","flatbush"],type:"Employee",bio:"NZ-trained physiotherapist, South East Auckland. Movement quality and injury prevention.",info:[["Role","Physiotherapist"],["Level","New graduate"],["Clinics","Pakuranga · Flat Bush"]]},
  isabella: {name:"Isabella Yang",      ini:"IY",color:"#D4537E",title:"Physiotherapist",                                clinics:["flatbush"],type:"Employee",bio:"Otago University physio graduate. Grew up locally, attended Macleans College.",info:[["Role","Physiotherapist"],["Type","Employee"],["Qualification","BPhty — Otago"],["Started","17 June 2024"],["Clinic","Flat Bush"]]},
  gwenne:   {name:"Gwenne Manares",     ini:"GM",color:"#639922",title:"Physiotherapist",                                clinics:["panmure"],type:"Employee",bio:"Physiotherapist at TBP Panmure, Lagoon Pools complex.",info:[["Role","Physiotherapist"],["Type","Employee"],["Clinic","Panmure"]]},
  komal:    {name:"Komal Kaur",         ini:"KK",color:"#9C27B0",title:"Physiotherapist",                                clinics:["pakuranga","panmure"],type:"Contractor",bio:"Physiotherapist at Pakuranga and Panmure.",info:[["Role","Physiotherapist"],["Type","Contractor"],["Clinics","Pakuranga · Panmure"]]},
};

const PAST_STAFF = ["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"];

const CORE_CERTS = [
  {key:"apc",        label:"APC 2025/2026",                  renews:"Annual — 1 April",  required:true},
  {key:"firstaid",   label:"First Aid / CPR",                 renews:"Every 2 years",     required:true},
  {key:"cultural",   label:"Cultural Competency (Māori)",     renews:"Annual",            required:true},
  {key:"contract",   label:"Employment Agreement / Contract", renews:"One-off",           required:true, ownerOnly:true},
  {key:"jd",         label:"Job Description",                 renews:"One-off",           required:true},
  {key:"orientation",label:"Orientation checklist",           renews:"One-off",           required:true},
  {key:"peerreview", label:"Peer Review",                     renews:"Annual",            required:false},
  {key:"appraisal",  label:"Performance Appraisal",           renews:"Annual",            required:false},
  {key:"pnz",        label:"PNZ Membership",                  renews:"Annual",            required:false},
];

const REMINDER_SCHEDULE = [
  {key:"apc",          label:"APC renewal",                  freq:"Annual",    freqDays:365, month:4,  day:1,  icon:"📋", applies:"All staff"},
  {key:"cultural",     label:"Cultural Competency renewal",  freq:"Annual",    freqDays:365, month:9,  day:1,  icon:"🌿", applies:"All staff"},
  {key:"firstaid",     label:"First Aid / CPR renewal",      freq:"2-yearly",  freqDays:730, month:8,  day:10, icon:"🏥", applies:"All staff"},
  {key:"cn_audit",     label:"Clinical notes audit",         freq:"6-monthly", freqDays:182, month:4,  day:1,  icon:"📋", applies:"All physios"},
  {key:"hygiene_audit",label:"Hygiene & cleanliness audit",  freq:"Quarterly", freqDays:91,  month:4,  day:1,  icon:"🧼", applies:"Per clinic", auditKey:"hygiene"},
  {key:"hs_audit",     label:"H&S workplace audit",          freq:"Quarterly", freqDays:91,  month:4,  day:1,  icon:"⚠️", applies:"Per clinic", auditKey:"hs_audit"},
  {key:"fire_drill",   label:"Fire drill",                   freq:"Annual",    freqDays:365, month:6,  day:1,  icon:"🔥", applies:"Per clinic", auditKey:"fire_drill"},
  {key:"equipment",    label:"Equipment service & test/tag", freq:"Annual",    freqDays:365, month:9,  day:1,  icon:"⚡", applies:"Per clinic", auditKey:"equipment"},
  {key:"staff_meeting",label:"Staff meeting",                freq:"Quarterly", freqDays:91,  month:4,  day:1,  icon:"👥", applies:"All staff"},
  {key:"inservice",    label:"In-service training",          freq:"Annual",    freqDays:365, month:6,  day:1,  icon:"📚", applies:"Per clinic"},
  {key:"peer_review",  label:"Peer review",                  freq:"Annual",    freqDays:365, month:4,  day:1,  icon:"🔍", applies:"All physios"},
  {key:"appraisal",    label:"Performance appraisal",        freq:"Annual",    freqDays:365, month:5,  day:1,  icon:"📊", applies:"All staff"},
  {key:"pp_review",    label:"P&P Manual review",            freq:"Annual",    freqDays:365, month:4,  day:1,  icon:"📖", applies:"All staff"},
];

const ORI_SECTIONS = [
  {title:"Documents read & understood",items:["Privacy Act 2020","Children's Act 2014","Health Information Privacy Code 2020","Health Practitioners Competence Assurance Act 2003","Health and Disability Commissioner Act 1994","Code of Health and Disability Services Consumers' Rights","Health and Safety at Work Act 2015","PBNZ Code of Ethics and Professional Conduct","PBNZ Māori Cultural Safety and Competence Standard","PBNZ Cultural Competence Standard","PBNZ Sexual and Emotional Boundaries Standard","ACC8310 Partnering with ACC","ACC1625 Māori Cultural Competency","TBP Policies and Procedures Manual","TBP Business Plan","TBP Health and Safety Plan"]},
  {title:"Clinic tour & introduction",items:["Introduction to all staff","Waiting rooms and treatment areas shown","Cliniko notes system demonstrated","Toilets located","Kitchen area shown"]},
  {title:"Health & safety emergency procedures",items:["Fire exits, alarms and extinguisher locations known","Evacuation procedure and meeting areas understood","Incident reporting for patients explained","Incident reporting for staff explained","Electrical mains location known","First aid kit location known","Fire drill procedure explained"]},
  {title:"Administration",items:["CPR certificate seen and copy in file","APC seen and copy in file","Employee Information sheet completed","Physio registration number recorded","Performance review dates set","CPD goals set and hours assessed","Contract signed, dated and in file"]},
  {title:"Clinic policy & procedures",items:["P&P manuals location confirmed (Google Drive)","Phone list and contact numbers location confirmed","Patient consent and confidentiality understood","Hand sanitiser stations — arrival desk and exit counter","Receiving and making calls understood","Privacy Act 2020 read","Health and Safety Act read","P&P in orientation folder read"]},
  {title:"Pool complex — Pakuranga only",items:["Reception area and reception staff met","First aid room located","Manager introduced","Fire exits and extinguishers located","Gym and gym staff met","Staff toilets and showers located","Staff room located","Car parking explained"]},
];

const AUDIT_FORMS = {
  hygiene:{title:"Hygiene & Cleanliness Audit",icon:"🧼",freq:"Quarterly",sections:[
    {title:"Treatment rooms",items:["Treatment tables wiped between every patient","Paper/pillow slip changed between every patient","Floors clean and free of debris","All surfaces disinfected","Waste bins emptied and lined","No clutter on benches or work surfaces"]},
    {title:"Equipment",items:["All equipment wiped down after use","Ultrasound heads cleaned after each use","Exercise equipment clean and stored correctly","Single-use items disposed of immediately"]},
    {title:"Hand hygiene stations",items:["Hand sanitiser at arrival/reception counter","Hand sanitiser at exit/departure counter","Sanitiser dispensers clean and full","Soap and paper towels at all clinical sinks"]},
    {title:"Common areas",items:["Waiting room chairs and surfaces clean","Reception desk clean and tidy","Kitchen/staff room clean","Staff toilets clean and stocked"]},
    {title:"PPE & infection control",items:["PPE supplies stocked (gloves, masks)","Clinical waste disposed of correctly","No expired single-use items in clinical areas"]},
  ]},
  clinical_notes:{title:"Clinical Notes Audit",icon:"📋",freq:"Every 6 months",sections:[
    {title:"Documentation standards",items:["Notes completed within 24 hours of treatment","SOATAP format used consistently","Legible and professional language used","No blank fields in required sections","ACC45 number present on each record"]},
    {title:"Consent & patient information",items:["Informed verbal consent documented at first visit","'Informed Verbal Consent Obtained' ticked on Initial Assessment form","Patient details accurate and up to date","Privacy statement signed","ACC claim details correct"]},
    {title:"Treatment planning",items:["Initial assessment findings documented","Clinical diagnosis recorded","Treatment plan documented","SMART goals set with patient","Anticipated number of visits documented"]},
    {title:"Progress & outcomes",items:["Numerical pain rating scale recorded each visit","Patient specific functional scale recorded","Progress notes reflect treatment plan","Any change in condition noted","Referrals documented where made"]},
    {title:"ACC compliance",items:["16th-visit clinical review completed and in Cliniko","Clinical review includes mechanism of injury, diagnosis, causation, treatment plan, recommendations","Discharge summary completed per ACC guidelines","ACC forms completed accurately","Treatment codes correct","Prior approval sought where required"]},
  ]},
  hs_audit:{title:"H&S Workplace Audit",icon:"⚠️",freq:"Quarterly",sections:[
    {title:"Fire safety",items:["Fire exits clear and unobstructed","Fire exit signage visible and in good condition","Fire extinguisher present, tagged and in date","Evacuation plan posted in visible location","All staff aware of evacuation procedure and meeting point","Date of last fire drill recorded and within 12 months"]},
    {title:"First aid",items:["First aid kit present and accessible","First aid kit contents checked and in date","At least one staff member holds current first aid cert","First aid kit location known to all staff"]},
    {title:"General safety",items:["No trip hazards in clinical or public areas","Floors dry and non-slip or clearly signed","Adequate lighting in all areas","Emergency contact list posted","Electrical mains clearly labelled and accessible"]},
    {title:"Equipment safety",items:["All electrical equipment tested and tagged","No damaged cords, plugs or sockets","Equipment stored safely when not in use","Service records up to date"]},
    {title:"Staff & workplace",items:["All staff have read and signed H&S policy","Incident reporting process understood by all","Hazard register up to date","PPE available and in good condition"]},
  ]},
  fire_drill:{title:"Fire Drill Record",icon:"🔥",freq:"Annual",sections:[
    {title:"Drill details",items:["Date and time of drill recorded","All staff present at time of drill participated","Evacuation completed within acceptable time","All staff reached designated meeting point"]},
    {title:"Procedure check",items:["Alarm activated correctly","Fire exits used appropriately","No one re-entered building during drill","Roll call completed at meeting point","Any visitors or patients evacuated safely"]},
    {title:"Follow-up",items:["Any issues identified and recorded","Actions to address issues assigned","Next drill date scheduled and communicated to all staff","Drill record signed by H&S Officer"]},
  ]},
  equipment:{title:"Equipment & Electrical Check",icon:"⚡",freq:"Annual",sections:[
    {title:"Testing & tagging",items:["All portable appliances have current test tag","Test tag dates within 12-month period","No equipment with expired/missing tags in use","Switchboard clearly labelled"]},
    {title:"Clinical equipment",items:["Ultrasound machines functioning correctly","TENS/IFC machines functioning correctly","Exercise equipment safe and functional","Traction equipment checked (if applicable)"]},
    {title:"Treatment room equipment",items:["Treatment tables in good condition","Pillow frames and headrests secure","Step stools stable","Sharps disposal containers not over-filled (max 3/4 full)"]},
    {title:"Records",items:["Equipment register up to date","Service provider details recorded","Last service date recorded for each major item","Next service date scheduled"]},
  ]},
};

// storage
const sKey=(id,k)=>`cert_${id}_${k}`;
function saveFile(id,k,d){try{localStorage.setItem(sKey(id,k),JSON.stringify(d));return true;}catch(e){if(e.name==="QuotaExceededError")alert("Storage full.");return false;}}
function loadFile(id,k){try{const d=localStorage.getItem(sKey(id,k));return d?JSON.parse(d):null;}catch{return null;}}
function removeFile(id,k){try{localStorage.removeItem(sKey(id,k));}catch{}}
function saveGen(k,d){try{localStorage.setItem(k,JSON.stringify(d));return true;}catch{return false;}}
function loadGen(k){try{const d=localStorage.getItem(k);return d?JSON.parse(d):null;}catch{return null;}}
function staffComp(id){const req=CORE_CERTS.filter(c=>c.required);const done=req.filter(c=>!!loadFile(id,c.key)).length;return{done,total:req.length,pct:Math.round((done/req.length)*100)};}
function getReminders(){
  const today=new Date();const items=[];
  REMINDER_SCHEDULE.forEach(r=>{
    const next=new Date(today.getFullYear(),r.month-1,r.day);
    if(next<today)next.setFullYear(today.getFullYear()+1);
    const days=Math.ceil((next-today)/(1000*60*60*24));
    const status=days<0?"overdue":days<=30?"due":"ok";
    const targets=r.applies==="Per clinic"?CLINICS.filter(c=>c.id!=="schools").map(c=>c.short):["All staff"];
    targets.forEach(t=>items.push({...r,nextDate:next.toLocaleDateString("en-NZ"),days,status,target:t}));
  });
  return items.sort((a,b)=>a.days-b.days);
}

// base ui
const pillCfg={ok:{bg:"#EAF3DE",fg:"#3B6D11"},pending:{bg:"#FAEEDA",fg:"#BA7517"},na:{bg:"#F1EFE8",fg:"#5F5E5A"},due:{bg:"#E6F1FB",fg:"#185FA5"},overdue:{bg:"#FCEBEB",fg:"#A32D2D"}};
function Pill({s,label}){const p=pillCfg[s]||pillCfg.na;const def={ok:"Done ✓",pending:"Needed",na:"N/A",due:"Due soon",overdue:"Overdue!"};return <span style={{background:p.bg,color:p.fg,fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap",display:"inline-block"}}>{label??def[s]}</span>;}
function Chip({color="teal",children}){const m={teal:{bg:"#E1F5EE",fg:C.teal},blue:{bg:C.blueL,fg:C.blue},amber:{bg:C.amberL,fg:C.amber},gray:{bg:C.grayL,fg:C.gray},purple:{bg:"#EEEDFE",fg:"#533AB7"},green:{bg:"#EAF3DE",fg:"#3B6D11"}}[color]||{bg:C.grayL,fg:C.gray};return <span style={{background:m.bg,color:m.fg,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500}}>{children}</span>;}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1.25rem",marginBottom:"1rem",...style}}>{children}</div>;}
function Alert({type="amber",title,children}){const m={red:{bg:"#FCEBEB",b:C.red},amber:{bg:C.amberL,b:C.amber},green:{bg:"#EAF3DE",b:C.teal},blue:{bg:C.blueL,b:C.blue}}[type];return <div style={{background:m.bg,borderLeft:`3px solid ${m.b}`,borderRadius:6,padding:"0.75rem 1rem",marginBottom:"0.875rem"}}><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{children}</div></div>;}
function Btn({onClick,children,outline=false,style={}}){return <button onClick={onClick} style={{background:outline?"white":C.teal,color:outline?C.teal:"white",border:outline?`1px solid ${C.teal}`:"none",borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:500,cursor:"pointer",...style}}>{children}</button>;}
function BSm({onClick,children,color=C.teal}){return <button onClick={onClick} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:color+"18",border:`1px solid ${color}33`,color,cursor:"pointer",fontWeight:500}}>{children}</button>;}
function Input({label,value,onChange,type="text",placeholder=""}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>;}
function Textarea({label,value,onChange,rows=3}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><textarea value={value} onChange={onChange} rows={rows} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,resize:"vertical",boxSizing:"border-box"}}/></div>;}
function SL({children}){return <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:C.muted,marginBottom:"0.625rem",fontWeight:500}}>{children}</div>;}
function Divider(){return <div style={{borderTop:`1px solid ${C.border}`,margin:"0.875rem 0"}}/>;}
function TH({headers}){return <tr style={{background:C.grayXL}}>{headers.map(h=><th key={h} style={{textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:C.muted,padding:"0.5rem 0.75rem",borderBottom:`1px solid ${C.border}`,fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>)}</tr>;}
function TD({children,style={}}){return <td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`,verticalAlign:"middle",...style}}>{children}</td>;}
function Tbl({headers,children}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><TH headers={headers}/></thead><tbody>{children}</tbody></table></div>;}
function PH({title,sub}){return <><div style={{fontSize:20,fontWeight:600,marginBottom:3}}>{title}</div><div style={{fontSize:13,color:C.muted,marginBottom:"1.25rem"}}>{sub}</div></>;}
function TabBar({items,current,setter}){return <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem",overflowX:"auto"}}>{items.map(([id,label])=><div key={id} onClick={()=>setter(id)} style={{padding:"7px 14px",fontSize:13,color:current===id?C.teal:C.muted,cursor:"pointer",borderBottom:current===id?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:current===id?500:400,whiteSpace:"nowrap"}}>{label}</div>)}</div>;}

// file viewer
function FileViewer({file,onClose}){
  if(!file)return null;
  const isImg=file.fileType?.startsWith("image/");const isPdf=file.fileType==="application/pdf";
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,overflow:"hidden",maxWidth:800,width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
        <div style={{background:C.teal,padding:"1rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{color:"white",fontWeight:600,fontSize:14}}>{file.fileName}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{file.uploadedDate}</span>
            <a href={file.dataUrl} download={file.fileName} style={{color:"white",fontSize:11,padding:"3px 10px",background:"rgba(255,255,255,0.2)",borderRadius:20,textDecoration:"none"}}>⬇ Download</a>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:"1.25rem",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f0f0",minHeight:300}}>
          {isImg&&<img src={file.dataUrl} alt={file.fileName} style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:6,objectFit:"contain"}}/>}
          {isPdf&&<iframe src={file.dataUrl} style={{width:"100%",height:"68vh",border:"none",borderRadius:6}} title={file.fileName}/>}
          {!isImg&&!isPdf&&<div style={{textAlign:"center",color:C.muted}}><div style={{fontSize:52,marginBottom:"0.75rem"}}>📄</div><div style={{fontSize:14,fontWeight:500}}>{file.fileName}</div><a href={file.dataUrl} download={file.fileName} style={{display:"inline-block",marginTop:"1rem",color:C.teal,fontSize:13,fontWeight:500}}>⬇ Download</a></div>}
        </div>
      </div>
    </div>
  );
}

function FileRow({label,gkey,onView,accent=C.teal}){
  const ref=useRef();const[file,setFile]=useState(()=>loadGen(gkey));
  function handle(e){const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("File over 3MB.");return;}const r=new FileReader();r.onload=ev=>{const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ")};if(saveGen(gkey,d))setFile(d);};r.readAsDataURL(f);e.target.value="";}
  const isImg=file?.fileType?.startsWith("image/");
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
      {isImg&&file&&<div onClick={()=>onView(file)} style={{width:36,height:36,borderRadius:5,overflow:"hidden",cursor:"pointer",flexShrink:0,border:`1px solid ${C.border}`}}><img src={file.dataUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{label}</div>{file&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>{file.fileName} · {file.uploadedDate}</div>}</div>
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {file&&<BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>}
        <BSm onClick={()=>ref.current.click()} color={accent}>{file?"Replace":"📷 Upload"}</BSm>
        {file&&<BSm onClick={()=>{if(window.confirm("Remove?")){localStorage.removeItem(gkey);setFile(null);}}} color={C.red}>✕</BSm>}
      </div>
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

function CertCard({staffId,cert,role,onView}){
  const ref=useRef();const[file,setFile]=useState(()=>loadFile(staffId,cert.key));
  const canSee=!cert.ownerOnly||(role==="owner"||role===staffId);
  function handle(e){const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("File over 3MB.");return;}const r=new FileReader();r.onload=ev=>{const d={fileName:f.name,dataUrl:ev.target.result,fileType:f.type,uploadedDate:new Date().toLocaleDateString("en-NZ"),certKey:cert.key};if(saveFile(staffId,cert.key,d))setFile(d);};r.readAsDataURL(f);e.target.value="";}
  if(!canSee)return <div style={{background:C.grayXL,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontWeight:500,fontSize:13,color:C.muted}}>🔒 {cert.label}</div><Pill s={file?"ok":"pending"} label={file?"On file":"Needed"}/></div>;
  const status=file?"ok":cert.required?"pending":"na";
  const bg={ok:"#EAF3DE",pending:cert.required?"#FAEEDA":"#F1EFE8",na:"#F1EFE8"}[status];
  const bd={ok:"#c0dd97",pending:cert.required?"#fac775":C.border,na:C.border}[status];
  const isImg=file?.fileType?.startsWith("image/");const isPdf=file?.fileType==="application/pdf";
  return(
    <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        {isImg&&<div onClick={()=>onView(file)} style={{width:44,height:44,borderRadius:6,overflow:"hidden",flexShrink:0,cursor:"pointer",border:`1px solid ${C.border}`}}><img src={file.dataUrl} alt="cert" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
        {isPdf&&<div onClick={()=>onView(file)} style={{width:44,height:44,borderRadius:6,background:C.redL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",border:`1px solid ${C.border}`,fontSize:22}}>📄</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div style={{fontWeight:500,fontSize:13}}>{cert.label}{cert.ownerOnly?" 🔒":""}</div>
            <Pill s={status} label={file?"On file ✓":cert.required?"Required":"Optional"}/>
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{cert.renews}</div>
          {file&&<div style={{fontSize:11,color:C.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.fileName} · {file.uploadedDate}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
        {file&&<BSm onClick={()=>onView(file)} color={C.teal}>👁 View</BSm>}
        <BSm onClick={()=>ref.current.click()} color={file?C.gray:cert.required?C.teal:C.gray}>{file?"Replace":"📷 Upload"}</BSm>
        {file&&<BSm onClick={()=>{if(window.confirm("Remove?")){{removeFile(staffId,cert.key);setFile(null);}}}} color={C.red}>Remove</BSm>}
      </div>
      <input ref={ref} type="file" accept="image/*,application/pdf,.doc,.docx" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

function OrientationModal({staffId,onClose}){
  const s=STAFF[staffId];const sk=`ori_${staffId}`;
  const[checks,setChecks]=useState(()=>{try{return JSON.parse(localStorage.getItem(sk)||"{}");}catch{return{};}});
  const[sig,setSig]=useState("");const[done,setDone]=useState(()=>!!localStorage.getItem(`ori_done_${staffId}`));
  const[doneDate]=useState(()=>localStorage.getItem(`ori_date_${staffId}`)||"");
  const all=ORI_SECTIONS.flatMap(s=>s.items);const checked=Object.values(checks).filter(Boolean).length;const pct=Math.round((checked/all.length)*100);
  function toggle(k){const n={...checks,[k]:!checks[k]};setChecks(n);try{localStorage.setItem(sk,JSON.stringify(n));}catch{}}
  function submit(){
    if(checked<all.length){alert(`${all.length-checked} items not ticked.`);return;}
    if(!sig.trim()){alert("Please type your full name to sign.");return;}
    const date=new Date().toLocaleDateString("en-NZ");
    try{localStorage.setItem(`ori_done_${staffId}`,"true");localStorage.setItem(`ori_date_${staffId}`,date);}catch{}
    saveFile(staffId,"orientation",{fileName:`Orientation_${s.name.replace(/ /g,"_")}.txt`,dataUrl:"data:text/plain;base64,"+btoa(`Orientation completed\nName: ${s.name}\nSigned: ${sig}\nDate: ${date}\nItems: ${checked}/${all.length}`),fileType:"text/plain",uploadedDate:date,certKey:"orientation"});
    setDone(true);
  }
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:680,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{color:"white",fontSize:16,fontWeight:600}}>Orientation Checklist</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2}}>{s.name}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{textAlign:"right"}}><div style={{color:"white",fontSize:22,fontWeight:700}}>{pct}%</div><div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{checked}/{all.length}</div></div><button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button></div>
        </div>
        {done?(
          <div style={{padding:"2rem",textAlign:"center"}}><div style={{fontSize:52,marginBottom:"0.75rem"}}>✅</div><div style={{fontSize:16,fontWeight:600}}>Orientation complete</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>Signed by {s.name} · {doneDate}</div><div style={{marginTop:"1.5rem"}}><Btn outline onClick={onClose}>Close</Btn></div></div>
        ):(
          <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>
            <div style={{height:8,background:C.grayL,borderRadius:4,overflow:"hidden",marginBottom:"1.25rem"}}><div style={{height:"100%",borderRadius:4,background:pct===100?C.teal:C.amber,width:`${pct}%`,transition:"width 0.3s"}}/></div>
            {ORI_SECTIONS.map((sec,si)=>(
              <div key={si} style={{marginBottom:"1.25rem"}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:"0.5rem",paddingBottom:"0.375rem",borderBottom:`1px solid ${C.border}`}}>{sec.title}</div>
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
              <div style={{fontSize:12,color:C.muted,marginBottom:"0.875rem",lineHeight:1.6}}>I confirm I have read all documents listed above and understood them. I will discuss any queries with the Administrative Manager.</div>
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

function AuditModal({type,onClose,onComplete}){
  const form=AUDIT_FORMS[type];const all=form.sections.flatMap(s=>s.items);
  const[checks,setChecks]=useState({});const[notes,setNotes]=useState({});
  const[meta,setMeta]=useState({clinic:CLINICS[0].short,auditor:"",date:new Date().toISOString().split("T")[0]});
  const[overall,setOverall]=useState("");
  const passed=Object.values(checks).filter(v=>v==="pass").length;const failed=Object.values(checks).filter(v=>v==="fail").length;const na=Object.values(checks).filter(v=>v==="na").length;
  const answered=passed+failed+na;const pct=Math.round((answered/all.length)*100);
  function submit(){
    if(!meta.auditor.trim()){alert("Please enter auditor name.");return;}
    if(answered<all.length&&!window.confirm(`${all.length-answered} items unanswered. Submit anyway?`))return;
    const fn=Object.entries(notes).filter(([,v])=>v).map(([k,v])=>`• ${k}: ${v}`).join("\n");
    onComplete({id:Date.now(),type,title:form.title,icon:form.icon,clinic:meta.clinic,auditor:meta.auditor,date:meta.date,passed,failed,na,total:all.length,outcome:failed===0?"Passed":`${failed} issue${failed>1?"s":""} found`,notes:(fn+(overall?`\nNotes: ${overall}`:"")).trim()});
  }
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:720,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{color:"white",fontSize:16,fontWeight:600}}>{form.icon} {form.title}</div><div style={{color:"rgba(255,255,255,0.75)",fontSize:11,marginTop:2}}>{form.freq}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{textAlign:"right"}}><div style={{color:"white",fontSize:20,fontWeight:700}}>{pct}%</div><div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{answered}/{all.length}</div></div><button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15}}>✕</button></div>
        </div>
        <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem"}}>
            {[["Clinic","clinic","select"],["Auditor","auditor","text"],["Date","date","date"]].map(([lbl,k,t])=>(
              <div key={k}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{lbl}</label>
                {t==="select"?<select value={meta[k]} onChange={e=>setMeta({...meta,[k]:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}>{CLINICS.map(c=><option key={c.id}>{c.short}</option>)}</select>:<input type={t} value={meta[k]} onChange={e=>setMeta({...meta,[k]:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:16,marginBottom:"0.875rem",fontSize:12}}><span style={{fontWeight:500,color:C.text}}>Each item:</span><span style={{color:"#3B6D11",fontWeight:600}}>✓ Pass</span><span style={{color:C.red,fontWeight:600}}>✗ Fail</span><span style={{color:C.gray,fontWeight:600}}>— N/A</span></div>
          {form.sections.map((sec,si)=>(
            <div key={si} style={{marginBottom:"1.5rem"}}>
              <div style={{fontSize:13,fontWeight:600,padding:"0.5rem 0.75rem",background:C.grayXL,borderRadius:6,marginBottom:"0.5rem",borderLeft:`3px solid ${C.teal}`}}>{sec.title}</div>
              {sec.items.map((item,ii)=>{const k=`${si}-${ii}`;const val=checks[k];return(
                <div key={ii} style={{borderBottom:`1px solid ${C.grayL}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><span style={{flex:1,fontSize:13}}>{item}</span>
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

function ProfileModal({id,onClose,role}){
  const[tab,setTab]=useState("certs");const[showOri,setShowOri]=useState(false);const[vf,setVf]=useState(null);const[,fu]=useState(0);
  if(!id)return null;const s=STAFF[id];const comp=staffComp(id);
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
                <span style={{background:"rgba(255,255,255,0.25)",color:"white",fontSize:10,padding:"2px 9px",borderRadius:20,fontWeight:600}}>{s.type}</span>
                {s.clinics.map(c=>{const cl=CLINICS.find(x=>x.id===c);return cl?<span key={c} style={{background:"rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.9)",fontSize:10,padding:"2px 8px",borderRadius:20}}>{cl.short}</span>:null;})}
                <span style={{background:`rgba(255,255,255,${comp.pct===100?0.35:0.15})`,color:"white",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{comp.done}/{comp.total} required</span>
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:18,flexShrink:0}}>✕</button>
          </div>
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.grayXL,overflowX:"auto"}}>
            {[["certs","📋 Compliance"],["profile","👤 Profile"],["orientation","✓ Orientation"]].map(([t,l])=>(
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
                <div style={{fontSize:11,color:C.muted,marginTop:"0.625rem",lineHeight:1.5}}>📷 Tap Upload to take a photo or pick a file. Max 3MB.</div>
              </div>
            )}
            {tab==="profile"&&(
              <div>
                {s.bio&&<div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:"1.25rem",padding:"0.75rem 1rem",background:C.grayXL,borderRadius:8}}>{s.bio}</div>}
                <SL>Details</SL>
                {s.info.map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span style={{color:C.muted}}>{l}</span><span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span></div>)}
              </div>
            )}
            {tab==="orientation"&&(
              <div>
                {localStorage.getItem(`ori_done_${id}`)
                  ?<Alert type="green" title="✅ Orientation completed">Signed by {s.name} on {localStorage.getItem(`ori_date_${id}`)}.</Alert>
                  :<Alert type="amber" title="Orientation not yet completed">All items must be ticked and signed before submission.</Alert>}
                <Btn onClick={()=>setShowOri(true)}>{localStorage.getItem(`ori_done_${id}`)?"View / reopen →":"Start orientation →"}</Btn>
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

// P&P VIEWER MODAL
function PPModal({policy,onClose}){
  if(!policy)return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:640,marginBottom:"2rem",overflow:"hidden"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div style={{color:"white",fontSize:15,fontWeight:600,lineHeight:1.4}}>{policy.title}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15,flexShrink:0}}>✕</button>
        </div>
        <div style={{padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto"}}>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:"1.25rem",background:C.grayXL,borderRadius:8,padding:"0.875rem 1rem"}}>{policy.summary}</div>
          <SL>Key requirements</SL>
          {policy.bullets.map((b,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.grayL}`}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.teal,flexShrink:0,marginTop:5}}/>
              <span style={{fontSize:13,lineHeight:1.6}}>{b}</span>
            </div>
          ))}
          <div style={{marginTop:"1.25rem",padding:"0.75rem 1rem",background:C.amberL,borderRadius:8,fontSize:12,color:C.amber}}>
            <strong>Source:</strong> TBP Policies and Procedures Manual · {policy.title}
          </div>
        </div>
      </div>
    </div>
  );
}

// INIT DATA
const INIT_MEETINGS=[
  {id:1,date:"2025-11-15",clinic:"All clinics",topic:"Q4 staff meeting — H&S review, CPD updates",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Discussed APC renewal cycle, updated first aid booking process."},
  {id:2,date:"2025-08-10",clinic:"Titirangi",topic:"In-service — shoulder rehab protocols",attendees:"Hans, Alistair",notes:"Hans led session. Reviewed UniSportsOrtho shoulder stabilisation phases."},
];
const INIT_AUDITS=[
  {id:1,date:"2025-12-01",type:"hs_audit",icon:"⚠️",title:"H&S Workplace Audit",clinic:"Pakuranga",auditor:"Alistair Burgess",passed:22,failed:1,na:0,total:23,outcome:"1 issue found",notes:"First aid kit expiry dates needed updating. Actioned same day."},
  {id:2,date:"2025-12-03",type:"hs_audit",icon:"⚠️",title:"H&S Workplace Audit",clinic:"Titirangi",auditor:"Alistair Burgess",passed:23,failed:0,na:0,total:23,outcome:"Passed",notes:""},
  {id:3,date:"2025-09-15",type:"equipment",icon:"⚡",title:"Equipment & Electrical Check",clinic:"Pakuranga",auditor:"Jade Warren",passed:15,failed:0,na:2,total:17,outcome:"Passed",notes:"2 items N/A. All test tags current."},
];
const INIT_COMPLAINTS=[
  {id:1,date:"2025-10-03",nature:"Service complaint",receivedBy:"Jade Warren",status:"Resolved",notes:"Client unhappy with wait time. Acknowledged within 24hrs. Resolved with apology and process improvement."},
];

export default function App(){
  const[page,setPage]=useState("dashboard");const[profile,setProfile]=useState(null);const[role,setRole]=useState("owner");
  const[compTab,setCompTab]=useState("overview");const[mgmtTab,setMgmtTab]=useState("audits");const[docsTab,setDocsTab]=useState("contracts");const[isrvTab,setIsrvTab]=useState("log");
  const[ppSection,setPpSection]=useState(null);const[ppPolicy,setPpPolicy]=useState(null);const[ppSearch,setPpSearch]=useState("");
  const[meetings,setMeetings]=useState(INIT_MEETINGS);const[audits,setAudits]=useState(INIT_AUDITS);const[complaints,setComplaints]=useState(INIT_COMPLAINTS);
  const[activeAudit,setActiveAudit]=useState(null);const[showAddMeeting,setShowAddMeeting]=useState(false);
  const[showAddComplaint,setShowAddComplaint]=useState(false);const[nc,setNc]=useState({date:"",nature:"",receivedBy:"",status:"Open",notes:""});
  const[vf,setVf]=useState(null);const[,fu]=useState(0);
  const[nm,setNm]=useState({date:"",clinic:"All clinics",topic:"",attendees:"",notes:""});
  const roleNames={owner:"Jade Warren",alistair:"Alistair Burgess",hans:"Hans Vermeulen",staff:"Staff member"};
  const reminders=getReminders();const urgentCount=reminders.filter(r=>r.status!=="ok").length;

  const navItems=[
    {id:"dashboard",label:"◈  Dashboard",section:"Overview"},
    {id:"reminders",label:"🔔  Reminders",badge:urgentCount>0?String(urgentCount):null},
    {id:"compliance",label:"✓  Compliance"},
    {id:"staff",label:"◉  All Staff",section:"People"},
    {id:"archive",label:"◎  Past Staff",adminOnly:true},
    {id:"clinics",label:"⊕  Clinics",section:"Clinic"},
    {id:"inservice",label:"◇  In-service"},
    {id:"documents",label:"◻  Documents",section:"Admin"},
    {id:"policies",label:"📖  P&P Manual"},
    {id:"management",label:"◈  Management",adminOnly:true},
  ];

  const Dashboard=()=>{
    const sa=Object.entries(STAFF);const tr=sa.length*CORE_CERTS.filter(c=>c.required).length;const td=sa.reduce((a,[id])=>a+staffComp(id).done,0);const pct=Math.round((td/tr)*100);
    return(
      <div>
        <PH title="Good morning, Jade 👋" sub="Total Body Physio — Compliance & HR Portal · April 2026"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
          {[["9","Staff",C.teal],[`${pct}%`,"Compliance",pct>=80?C.teal:pct>50?C.amber:C.red],[String(urgentCount),"Due/overdue",urgentCount>0?C.red:C.teal],[String(audits.length),"Audit records",C.blue]].map(([n,l,c])=>(
            <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:700,color:c}}>{n}</div><div style={{fontSize:11,color:C.muted,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
        <Alert type="red" title="🔴 Urgent — Alistair Burgess">APC expired 31 March 2025 · First Aid expired Aug 2024 · Cultural Competency expired Sept 2024. Upload immediately for ACC compliance.</Alert>
        {urgentCount>0&&<Alert type="amber" title={`🔔 ${urgentCount} items due or overdue`}>Audits, drills or renewals need attention. <span onClick={()=>setPage("reminders")} style={{color:C.blue,cursor:"pointer",fontWeight:500,textDecoration:"underline"}}>View reminders →</span></Alert>}
        <div style={{display:"flex",gap:"0.75rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
          <div onClick={()=>setPage("policies")} style={{flex:1,minWidth:180,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"0.875rem 1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.teal} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <span style={{fontSize:24}}>📖</span><div><div style={{fontSize:13,fontWeight:600}}>P&P Manual</div><div style={{fontSize:11,color:C.muted}}>Browse policies &amp; procedures</div></div>
          </div>
          <div onClick={()=>setPage("management")} style={{flex:1,minWidth:180,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"0.875rem 1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.teal} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <span style={{fontSize:24}}>📋</span><div><div style={{fontSize:13,fontWeight:600}}>Audits</div><div style={{fontSize:11,color:C.muted}}>Run or view audit records</div></div>
          </div>
          <div onClick={()=>setPage("compliance")} style={{flex:1,minWidth:180,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"0.875rem 1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.teal} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <span style={{fontSize:24}}>✅</span><div><div style={{fontSize:13,fontWeight:600}}>Compliance</div><div style={{fontSize:11,color:C.muted}}>Staff certifications tracker</div></div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"0.25rem 0 0.875rem"}}>
          <div style={{fontSize:14,fontWeight:600}}>Staff compliance — tap row to view &amp; upload</div>
          <Btn onClick={()=>setPage("staff")}>View all →</Btn>
        </div>
        <Tbl headers={["Staff","Type","Clinics","APC","First Aid","Cultural","Contract","Orientation","Progress"]}>
          {Object.entries(STAFF).map(([id,s])=>{
            const fs=k=>loadFile(id,k)?"ok":"pending";const comp=staffComp(id);const tc={Owner:"purple",Employee:"teal",Contractor:"amber"}[s.type]||"gray";
            return(
              <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <TD><strong>{s.name}</strong></TD><TD><Chip color={tc}>{s.type}</Chip></TD>
                <TD style={{fontSize:11,color:C.muted}}>{s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</TD>
                <TD><Pill s={fs("apc")}/></TD><TD><Pill s={fs("firstaid")}/></TD><TD><Pill s={fs("cultural")}/></TD>
                <TD><Pill s={role==="owner"||role===id?fs("contract"):"na"} label={role==="owner"||role===id?(loadFile(id,"contract")?"On file":"Needed"):"🔒"}/></TD>
                <TD><Pill s={fs("orientation")}/></TD>
                <TD><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:52,height:5,background:C.grayL,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:comp.pct===100?C.teal:comp.pct>50?C.amber:C.red,width:`${comp.pct}%`}}/></div><span style={{fontSize:11,color:C.muted}}>{comp.done}/{comp.total}</span></div></TD>
              </tr>
            );
          })}
        </Tbl>
      </div>
    );
  };

  // P&P PAGE
  const PoliciesPage=()=>{
    const filtered=ppSearch.trim()
      ?PP_SECTIONS.map(sec=>({...sec,policies:sec.policies.filter(p=>p.title.toLowerCase().includes(ppSearch.toLowerCase())||p.summary.toLowerCase().includes(ppSearch.toLowerCase())||p.bullets.some(b=>b.toLowerCase().includes(ppSearch.toLowerCase())))})).filter(sec=>sec.policies.length>0)
      :ppSection?PP_SECTIONS.filter(s=>s.id===ppSection):PP_SECTIONS;
    return(
      <div>
        <PH title="📖 Policies & Procedures Manual" sub="Total Body Physio — sourced directly from the TBP P&P Manual"/>
        <Alert type="blue" title="About this section">All policies are sourced from the TBP Policies and Procedures Manual. The manual is reviewed annually by the Director(s) and any changes presented at the annual P&P staff meeting. The master copy is held by the Administrative Manager.</Alert>
        <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
          <input value={ppSearch} onChange={e=>setPpSearch(e.target.value)} placeholder="Search policies…" style={{flex:1,minWidth:180,padding:"8px 12px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}/>
          {ppSearch&&<BSm onClick={()=>setPpSearch("")} color={C.gray}>Clear ✕</BSm>}
        </div>
        {!ppSearch&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
            <BSm onClick={()=>setPpSection(null)} color={ppSection===null?C.teal:C.gray}>All sections</BSm>
            {PP_SECTIONS.map(s=><BSm key={s.id} onClick={()=>setPpSection(s.id===ppSection?null:s.id)} color={ppSection===s.id?C.teal:C.gray}>{s.icon} {s.title.split(".")[1]?.trim().split(" ").slice(0,3).join(" ")||s.title}</BSm>)}
          </div>
        )}
        {filtered.map(sec=>(
          <div key={sec.id} style={{marginBottom:"1.5rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"0.75rem",padding:"0.625rem 1rem",background:sec.color+"15",borderRadius:8,borderLeft:`3px solid ${sec.color}`}}>
              <span style={{fontSize:18}}>{sec.icon}</span>
              <div style={{fontSize:14,fontWeight:600,color:sec.color}}>{sec.title}</div>
              <span style={{marginLeft:"auto",fontSize:11,color:C.muted}}>{sec.policies.length} policies</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"0.625rem"}}>
              {sec.policies.map(p=>(
                <div key={p.key} onClick={()=>setPpPolicy(p)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"0.875rem 1rem",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=sec.color;e.currentTarget.style.boxShadow=`0 2px 12px ${sec.color}22`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:C.text}}>{p.title}</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.summary}</div>
                  <div style={{marginTop:6,fontSize:11,color:sec.color,fontWeight:500}}>{p.bullets.length} requirements · View →</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"3rem",color:C.muted}}><div style={{fontSize:32,marginBottom:"0.75rem"}}>🔍</div><div style={{fontSize:14}}>No policies found matching "{ppSearch}"</div></div>}
      </div>
    );
  };

  const RemindersPage=()=>{
    const over=reminders.filter(r=>r.status==="overdue");const due=reminders.filter(r=>r.status==="due");const coming=reminders.filter(r=>r.status==="ok"&&r.days<=90);
    function RGroup({title,items,col}){
      if(!items.length)return null;
      return(
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:"0.75rem",color:col}}>{title} ({items.length})</div>
          {items.map((r,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${r.status==="overdue"?"#f5c1c1":r.status==="due"?"#fac775":C.border}`,borderRadius:8,padding:"0.875rem 1rem",marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22,flexShrink:0}}>{r.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{r.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{r.target} · {r.freq} · Next: {r.nextDate}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <Pill s={r.status==="overdue"?"overdue":r.status==="due"?"due":"ok"} label={r.days<=0?"Overdue":r.days===0?"Today":`${r.days}d`}/>
                {r.auditKey&&<div style={{marginTop:4}}><BSm onClick={()=>setActiveAudit(r.auditKey)} color={C.teal}>Start →</BSm></div>}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return(
      <div>
        <PH title="🔔 Reminders" sub="Upcoming compliance tasks, audits, renewals and drills — sourced from TBP P&P Manual"/>
        {over.length===0&&due.length===0&&<Alert type="green" title="All up to date">No overdue or imminent reminders.</Alert>}
        <RGroup title="Overdue — action required" items={over} col={C.red}/>
        <RGroup title="Due in next 30 days" items={due} col={C.amber}/>
        <RGroup title="Coming up — next 90 days" items={coming} col={C.muted}/>
        <Divider/>
        <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Full compliance schedule — per TBP P&P Manual</div>
        <Tbl headers={["Item","Frequency","Applies to","Typical month","P&P ref","Action"]}>
          {REMINDER_SCHEDULE.map(r=>(
            <tr key={r.key}>
              <TD><span style={{fontSize:14,marginRight:6}}>{r.icon}</span><strong>{r.label}</strong></TD>
              <TD>{r.freq}</TD><TD style={{fontSize:12,color:C.muted}}>{r.applies}</TD>
              <TD style={{fontSize:12}}>{new Date(2026,r.month-1,1).toLocaleString("en-NZ",{month:"long"})}</TD>
              <TD style={{fontSize:11,color:C.blue}}>{{apc:"§7.7.4",cultural:"§4.4",firstaid:"§3.1.3",cn_audit:"§1.5.1",hygiene_audit:"§1.5.2",hs_audit:"§1.5.2",fire_drill:"§3.1.2",equipment:"§3.1.15",staff_meeting:"§7.6",inservice:"§7.7.3",peer_review:"§7.7.1",appraisal:"§7.7.2",pp_review:"§1.1"}[r.key]||"—"}</TD>
              <TD>{r.auditKey?<BSm onClick={()=>setActiveAudit(r.auditKey)} color={C.teal}>Start →</BSm>:<BSm onClick={()=>setPage("staff")} color={C.blue}>Staff →</BSm>}</TD>
            </tr>
          ))}
        </Tbl>
      </div>
    );
  };

  const StaffPage=()=>(
    <div>
      <PH title="All Staff" sub="Tap any card to view compliance, upload certs or complete orientation"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:"0.875rem"}}>
        {Object.entries(STAFF).map(([id,s])=>{
          const comp=staffComp(id);const bc=comp.pct===100?C.teal:comp.pct>50?C.amber:C.red;const tc={Owner:"purple",Employee:"teal",Contractor:"amber"}[s.type]||"gray";
          return(
            <div key={id} onClick={()=>setProfile(id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(15,110,86,0.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{padding:"1rem 1rem 0.75rem",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0}}>{s.ini}</div>
                <div><div style={{fontSize:14,fontWeight:600}}>{s.name}</div><div style={{fontSize:11,marginTop:2}}><Chip color={tc}>{s.type}</Chip></div></div>
              </div>
              <div style={{padding:"0.75rem 1rem"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{s.clinics.slice(0,3).map(c=><Chip key={c} color="blue">{CLINICS.find(cl=>cl.id===c)?.short}</Chip>)}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><div style={{flex:1,height:6,background:C.grayL,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:bc,width:`${comp.pct}%`}}/></div><span style={{fontSize:11,color:bc,fontWeight:500,whiteSpace:"nowrap"}}>{comp.done}/{comp.total}</span></div>
                <div style={{fontSize:11,color:C.muted}}>{comp.pct===100?"All required docs on file ✓":comp.pct===0?"No documents uploaded yet":`${comp.total-comp.done} required doc${comp.total-comp.done>1?"s":""} missing`}</div>
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
      <Alert type="blue" title="📌 Universal requirements — per TBP P&P §7.5">APC · First Aid / CPR (every 2 years) · Cultural Competency (annual) · Contract · Job Description · Orientation · Peer review &amp; appraisal for staff 12+ months.</Alert>
      <TabBar items={[["overview","Overview"],["apc","APC"],["firstaid","First Aid"],["cultural","Cultural"],["reviews","Reviews"]]} current={compTab} setter={setCompTab}/>
      {compTab==="overview"&&<Tbl headers={["Staff","APC","First Aid","Cultural","Contract","JD","Orientation","Peer Review","Appraisal"]}>{Object.entries(STAFF).map(([id,s])=><tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}><TD><strong>{s.name}</strong></TD>{CORE_CERTS.map(c=><TD key={c.key}>{c.ownerOnly&&role!=="owner"&&role!==id?<span style={{fontSize:11,color:C.hint}}>🔒</span>:<Pill s={loadFile(id,c.key)?"ok":"pending"}/>}</TD>)}</tr>)}</Tbl>}
      {compTab==="apc"&&<><Alert type="amber" title="APC — §7.7.4 P&P Manual">Issued by Physiotherapy Board of NZ. Renews 1 April. Copy must be sighted and on file for all staff.</Alert><Tbl headers={["Staff","APC on file","File"]}>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"apc");return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}><TD><strong>{s.name}</strong></TD><TD><Pill s={f?"ok":"pending"} label={f?`Uploaded ${f.uploadedDate}`:"Not uploaded"}/></TD><TD><span style={{fontSize:12,color:f?C.teal:C.hint}}>{f?`📄 ${f.fileName}`:"—"}</span></TD></tr>;})}</Tbl></>}
      {compTab==="firstaid"&&<Alert type="amber" title="First Aid / CPR — §3.1.3 P&P Manual">Valid 2 years. All staff required. Alistair's St John Level 1 expired 10 Aug 2024. Upload via each staff member's profile.</Alert>}
      {compTab==="cultural"&&<Alert type="amber" title="Cultural Competency — §4.4 & §4.5 P&P Manual">Valid 1 year. Mauriora course required. Alistair's cert expired Sept 2024. Re-enrol at <a href="https://mauriora.co.nz" target="_blank" rel="noreferrer" style={{color:C.blue}}>mauriora.co.nz</a>. ACC1625 standard applies.</Alert>}
      {compTab==="reviews"&&<Tbl headers={["Staff","Peer Review","Appraisal","Notes"]}>{Object.entries(STAFF).map(([id,s])=>{const pr=loadFile(id,"peerreview");const ap=loadFile(id,"appraisal");const note={alistair:"Clinical Director",hans:"On file",dylan:"New — Dec 2025",ibrahim:"New grad",komal:"Contractor",gwenne:"First cycle"}[id]||"Annual cycle";return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}><TD><strong>{s.name}</strong></TD><TD><Pill s={pr?"ok":"pending"}/></TD><TD><Pill s={ap?"ok":"pending"}/></TD><TD style={{fontSize:12,color:C.muted}}>{note}</TD></tr>;})}</Tbl>}
    </div>
  );

  const ArchivePage=()=>(
    <div>
      <PH title="Past employees" sub="Archived records — kept for DAA / ACC audit purposes"/>
      <Card><div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Former staff — 9 records</div>{PAST_STAFF.map(name=><div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:32,height:32,borderRadius:"50%",background:C.grayL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.gray,flexShrink:0}}>{name.slice(0,2).toUpperCase()}</div><div><strong style={{fontSize:13}}>{name}</strong><div style={{fontSize:12,color:C.muted}}>Former physiotherapist · Records archived</div></div><span style={{marginLeft:"auto"}}><Chip color="gray">Archived</Chip></span></div>)}</Card>
    </div>
  );

  const ClinicsPage=()=>(
    <div>
      <PH title="Clinics" sub="Total Body Physio — all locations. Run audits directly from each clinic card."/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"0.875rem"}}>
        {CLINICS.map(cl=>{const cs=Object.values(STAFF).filter(s=>s.clinics.includes(cl.id));return(
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
      </div>
    </div>
  );

  const InservicePage=()=>{const[ivf,setIvf]=useState(null);return(
    <div>
      <PH title="In-service training log" sub="Annual — at least one per clinic group per year (§7.7.3 P&P Manual)"/>
      <Alert type="amber" title="P&P requirement §7.7.3">In-services may be run by the physiotherapist, external providers, or in conjunction with Total Body Physio. Case study presentations permitted — no identifying client details.</Alert>
      <TabBar items={[["log","2026 Log"],["resources","Resources & files"]]} current={isrvTab} setter={setIsrvTab}/>
      {isrvTab==="log"&&<Card><Tbl headers={["Clinic","Topic","Date","Attendees","Status"]}>{[["Pakuranga","Not yet scheduled","—","Alistair, Timothy, Dylan, Ibrahim, Komal","pending"],["Flat Bush","Not yet scheduled","—","Ibrahim, Isabella","pending"],["Titirangi","Shoulder rehab protocols","10 Aug 2025","Hans, Alistair","ok"],["Panmure","Not yet scheduled","—","Gwenne, Timothy, Komal","pending"]].map(([c,t,d,a,s])=><tr key={c}><TD>{c}</TD><TD style={{fontStyle:s==="pending"?"italic":"normal",color:s==="pending"?C.hint:C.text}}>{t}</TD><TD>{d}</TD><TD style={{fontSize:12}}>{a}</TD><TD><Pill s={s} label={s==="ok"?"Completed ✓":"Needed"}/></TD></tr>)}</Tbl><div style={{marginTop:"1rem"}}><Btn outline onClick={()=>alert("Use Management > Staff Meetings to log in-service sessions with notes and attendees.")}>+ Log in-service session</Btn></div></Card>}
      {isrvTab==="resources"&&<Card><div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>In-service resources</div><div style={{fontSize:12,color:C.muted,marginBottom:"1rem",lineHeight:1.6}}>Upload handouts, presentations or reading materials. All staff can view. Creates an audit record of what was covered.</div>{CLINICS.filter(c=>c.id!=="schools").map(cl=><FileRow key={cl.id} label={`${cl.icon} ${cl.short} — in-service resource`} gkey={`isrv_${cl.id}`} onView={f=>setIvf(f)}/>)}<div style={{marginTop:"0.75rem",fontSize:11,color:C.muted}}>PDF, Word doc, or image. Max 3MB.</div></Card>}
      {ivf&&<FileViewer file={ivf} onClose={()=>setIvf(null)}/>}
    </div>
  );};

  const DocumentsPage=()=>{const[dvf,setDvf]=useState(null);return(
    <div>
      <PH title="Documents" sub="Contracts, job descriptions & legislation"/>
      <TabBar items={[["contracts","Contracts"],["jd","Job descriptions"],["leg","Legislation"]]} current={docsTab} setter={setDocsTab}/>
      {docsTab==="contracts"&&<div><Alert type="blue" title="🔒 Contract privacy — §7.2 P&P Manual">Contracts visible to Jade (owner) and the individual staff member only. Two signed copies required: one to employee, one in personnel file.</Alert><Card>{Object.entries(STAFF).map(([id,s])=>{const canSee=role==="owner"||role===id;const f=canSee?loadFile(id,"contract"):null;return(<div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:34,height:34,borderRadius:"50%",background:s.color+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:s.color,flexShrink:0}}>{s.ini}</div><div style={{flex:1}}><strong style={{fontSize:13}}>{s.name}</strong><div style={{fontSize:12,color:C.muted}}>{s.type} · {s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</div></div>{canSee?<div style={{display:"flex",gap:5,alignItems:"center"}}>{f&&<BSm onClick={()=>setDvf(f)} color={C.teal}>👁 View</BSm>}<Pill s={f?"ok":"pending"} label={f?"On file ✓":"Upload needed"}/></div>:<span style={{fontSize:12,color:C.hint}}>🔒 Restricted</span>}</div>);})}</Card></div>}
      {docsTab==="jd"&&<Card><div style={{fontSize:13,color:C.muted,marginBottom:"1rem",lineHeight:1.6}}>Each staff member uploads their own signed JD. Per §7.3 P&P Manual, JDs reviewed annually at performance appraisals.</div>{Object.entries(STAFF).map(([id,s])=><FileRow key={id} label={`${s.name} — Job Description`} gkey={`jd_${id}`} onView={f=>setDvf(f)} accent={s.color}/>)}</Card>}
      {docsTab==="leg"&&<div><Alert type="blue" title="Key legislation — all links go to official sources">All staff read these during orientation (§2.1.1, §4.1, §4.2 P&P Manual). Click any link to open the source document.</Alert>{LEGISLATION.map(leg=><Card key={leg.name} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}><div><a href={leg.url} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:600,color:C.blue,textDecoration:"none"}}>{leg.name} ↗</a><div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{leg.desc}</div></div><a href={leg.url} target="_blank" rel="noreferrer" style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:C.blueL,color:C.blue,textDecoration:"none",fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>Open ↗</a></div></Card>)}</div>}
      {dvf&&<FileViewer file={dvf} onClose={()=>setDvf(null)}/>}
    </div>
  );};

  const ManagementPage=()=>{const[mvf,setMvf]=useState(null);return(
    <div>
      <PH title="Management" sub="Audits, staff meetings, complaints, equipment — DAA / ACC Allied Health Standards"/>
      <TabBar items={[["audits","Audits"],["meetings","Staff Meetings"],["complaints","Complaints"],["equipment","Equipment"],["accreditation","Accreditation"]]} current={mgmtTab} setter={setMgmtTab}/>
      {mgmtTab==="audits"&&<div>
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Start a new audit</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"0.75rem"}}>
            {Object.entries(AUDIT_FORMS).map(([k,f])=>(
              <div key={k} onClick={()=>setActiveAudit(k)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.1)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                <div style={{fontSize:26,marginBottom:6}}>{f.icon}</div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{f.title}</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{f.freq} · {f.sections.flatMap(s=>s.items).length} items</div>
                <span style={{color:C.teal,fontSize:11,fontWeight:500}}>Start →</span>
              </div>
            ))}
          </div>
        </div>
        <Divider/>
        <div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Audit history ({audits.length})</div>
        {[...audits].reverse().map(a=>(
          <Card key={a.id}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}><div><div style={{fontSize:14,fontWeight:600}}>{a.icon} {a.title}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{a.date} · {a.clinic} · {a.auditor}</div></div><Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/></div>
            <div style={{display:"flex",gap:16,fontSize:12,marginBottom:a.notes?6:0}}><span style={{color:"#3B6D11",fontWeight:500}}>{a.passed} passed</span><span style={{color:C.red,fontWeight:500}}>{a.failed} failed</span><span style={{color:C.gray}}>{a.na} N/A</span><span style={{color:C.muted}}>{a.total} total</span></div>
            {a.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6,whiteSpace:"pre-line"}}>{a.notes}</div>}
          </Card>
        ))}
      </div>}
      {mgmtTab==="meetings"&&<div>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}><Btn onClick={()=>setShowAddMeeting(true)}>+ Log meeting</Btn></div>
        {showAddMeeting&&<Card style={{borderColor:C.teal}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Log new meeting</div>
          <Input label="Date" value={nm.date} onChange={e=>setNm({...nm,date:e.target.value})} type="date"/>
          <Input label="Clinic / location" value={nm.clinic} onChange={e=>setNm({...nm,clinic:e.target.value})}/>
          <Input label="Topic / agenda" value={nm.topic} onChange={e=>setNm({...nm,topic:e.target.value})}/>
          <Input label="Attendees" value={nm.attendees} onChange={e=>setNm({...nm,attendees:e.target.value})}/>
          <Textarea label="Notes / minutes" value={nm.notes} onChange={e=>setNm({...nm,notes:e.target.value})}/>
          <div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(nm.date&&nm.topic){setMeetings([...meetings,{...nm,id:Date.now()}]);setNm({date:"",clinic:"All clinics",topic:"",attendees:"",notes:""});setShowAddMeeting(false);}}} >Save</Btn><Btn outline onClick={()=>setShowAddMeeting(false)}>Cancel</Btn></div>
        </Card>}
        {[...meetings].reverse().map(m=>(
          <Card key={m.id}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}><div><strong style={{fontSize:14}}>{m.topic}</strong><div style={{fontSize:12,color:C.muted,marginTop:2}}>{m.date} · {m.clinic}</div></div><Pill s="ok" label="Completed ✓"/></div>
            {m.attendees&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}><strong style={{color:C.text}}>Attendees:</strong> {m.attendees}</div>}
            {m.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6}}>{m.notes}</div>}
          </Card>
        ))}
      </div>}
      {mgmtTab==="complaints"&&<div>
        <Alert type="amber" title="Complaints procedure — §3.1.8 P&P Manual">All complaints reported to Director(s) within 24 hours. Director contacts complainant within 24 hours. Written acknowledgement within 5 days if unresolved. Respond with findings within 20 days.</Alert>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}><Btn onClick={()=>setShowAddComplaint(true)}>+ Log complaint</Btn></div>
        {showAddComplaint&&<Card style={{borderColor:C.red}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Log new complaint</div>
          <Input label="Date received" value={nc.date} onChange={e=>setNc({...nc,date:e.target.value})} type="date"/>
          <Input label="Nature of complaint" value={nc.nature} onChange={e=>setNc({...nc,nature:e.target.value})}/>
          <Input label="Received by" value={nc.receivedBy} onChange={e=>setNc({...nc,receivedBy:e.target.value})}/>
          <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>Status</label><select value={nc.status} onChange={e=>setNc({...nc,status:e.target.value})} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}><option>Open</option><option>In progress</option><option>Resolved</option></select></div>
          <Textarea label="Notes / details" value={nc.notes} onChange={e=>setNc({...nc,notes:e.target.value})}/>
          <div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(nc.date&&nc.nature){setComplaints([...complaints,{...nc,id:Date.now()}]);setNc({date:"",nature:"",receivedBy:"",status:"Open",notes:""});setShowAddComplaint(false);}}} >Save</Btn><Btn outline onClick={()=>setShowAddComplaint(false)}>Cancel</Btn></div>
        </Card>}
        {[...complaints].reverse().map(c=>(
          <Card key={c.id}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}><div><strong style={{fontSize:14}}>{c.nature}</strong><div style={{fontSize:12,color:C.muted,marginTop:2}}>{c.date} · Received by {c.receivedBy}</div></div><Pill s={c.status==="Resolved"?"ok":c.status==="Open"?"overdue":"due"} label={c.status}/></div>
            {c.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6}}>{c.notes}</div>}
          </Card>
        ))}
      </div>}
      {mgmtTab==="equipment"&&<div>
        <Alert type="amber" title="Equipment servicing — annual requirement — §3.1.15 P&P Manual">All electrical equipment tested and tagged. Upload service certificates below. Instruction manuals on manufacturer websites. Service register on shared drive.</Alert>
        <Card>{CLINICS.filter(c=>c.id!=="schools").map(cl=><FileRow key={cl.id} label={`${cl.icon} ${cl.short} — service certificate`} gkey={`equip_${cl.id}`} onView={f=>setMvf(f)} accent={C.amber}/>)}</Card>
        <Btn outline onClick={()=>setActiveAudit("equipment")}>Run equipment audit →</Btn>
        {mvf&&<FileViewer file={mvf} onClose={()=>setMvf(null)}/>}
      </div>}
      {mgmtTab==="accreditation"&&<div>
        <Alert type="green" title="DAA Group — ACC Allied Health Standards">All sections of this portal support your DAA audit readiness. P&P section references added throughout.</Alert>
        {[["Staff credentials — APC, First Aid, Cultural",Object.entries(STAFF).every(([id])=>["apc","firstaid","cultural"].every(k=>loadFile(id,k)))?"ok":"pending","§7.5, §7.7.4 — All staff hold current APC, First Aid and Cultural Competency"],["Clinical Director oversight","ok","§1.2 — Alistair Burgess, ACC confirmed Nov 2023. 16th-visit reviews required."],["16th-visit case reviews","pending","§1.2 — Clinical review before 16th visit, stored in Cliniko, includes mechanism of injury, diagnosis, causation, treatment plan"],["Orientation — all staff","pending","§7.1 — Complete digital checklist for each staff member. ACC-specific induction required before independent practice."],["In-service training","pending","§7.7.3 — At least one session per clinic per year. Log in Staff Meetings."],["H&S audits — quarterly","ok","§1.5.2 — Records in audit history above"],["Fire drills — annual","pending","§3.1.2 — Run from Clinics page. All staff reminded annually on fire extinguisher use."],["Clinical notes audit — 6-monthly","pending","§1.5.1 — 10 records per physio (5 current, 5 past). Discussed at annual review."],["Staff meetings — quarterly","ok","§7.6 — Compulsory attendance. Minutes by Admin Manager, stored on shared drive."],["Equipment servicing — annual","ok","§3.1.15 — Records in equipment section above"],["P&P manual — annual review","pending","§1.1 — Reviewed annually by Director(s), presented at annual P&P staff meeting"],["Complaints log","ok",`§3.1.8 — ${complaints.length} complaint(s) logged. All acknowledged within 24hrs, resolved within 20 days.`]].map(([t,s,d])=>(
          <Card key={t} style={{marginBottom:"0.5rem",padding:"0.875rem 1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{t}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{d}</div></div>
              <Pill s={s} label={s==="ok"?"Compliant ✓":"Action needed"}/>
            </div>
          </Card>
        ))}
      </div>}
    </div>
  );};

  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      <div style={{width:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:10,overflowY:"auto"}}>
        <div style={{padding:"1.25rem 1rem",borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div>
          <div style={{fontSize:13,fontWeight:600}}>Total Body Physio</div>
          <div style={{fontSize:11,color:C.muted,marginTop:1}}>PhysioPortal</div>
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
                <div onClick={()=>setPage(item.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 1rem",fontSize:13,color:page===item.id?C.teal:C.muted,cursor:"pointer",borderLeft:page===item.id?`3px solid ${C.teal}`:"3px solid transparent",background:page===item.id?"#E1F5EE":"transparent",fontWeight:page===item.id?500:400}}>
                  {item.label}
                  {item.badge&&<span style={{marginLeft:"auto",background:"#FCEBEB",color:C.red,fontSize:10,padding:"1px 6px",borderRadius:10,fontWeight:600}}>{item.badge}</span>}
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
        {page==="dashboard"&&<Dashboard/>}{page==="reminders"&&<RemindersPage/>}{page==="staff"&&<StaffPage/>}
        {page==="compliance"&&<CompliancePage/>}{page==="archive"&&<ArchivePage/>}{page==="clinics"&&<ClinicsPage/>}
        {page==="inservice"&&<InservicePage/>}{page==="documents"&&<DocumentsPage/>}
        {page==="policies"&&<PoliciesPage/>}{page==="management"&&<ManagementPage/>}
      </div>
      <ProfileModal id={profile} onClose={()=>{setProfile(null);fu(n=>n+1);}} role={role}/>
      {activeAudit&&<AuditModal type={activeAudit} onClose={()=>setActiveAudit(null)} onComplete={r=>{setAudits(p=>[...p,r]);setActiveAudit(null);setPage("management");setMgmtTab("audits");}}/>}
      {vf&&<FileViewer file={vf} onClose={()=>setVf(null)}/>}
      <PPModal policy={ppPolicy} onClose={()=>setPpPolicy(null)}/>
    </div>
  );
}
