import { useState, useRef, useEffect } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  teal:"#0F6E56",tealL:"#E1F5EEE",tealM:"#1D9E75",
  red:"#E24B4A",redL:"#FCEBEB",
  amber:"#BA7517",amberL:"#FAEEDA",
  green:"#3B6D11",greenL:"#EAF3DE",
  blue:"#185FA5",blueL:"#E6F1FB",
  gray:"#5F5E5A",grayL:"#F1EFE8",grayXL:"#FAFAF8",
  border:"#e2e0d8",text:"#1a1a18",muted:"#6b6963",hint:"#9b9892",
  bg:"#f5f3ee",card:"#ffffff",
};
const pillCfg={expired:{bg:"#FCEBEB",fg:"#A32D2D"},ok:{bg:"#EAF3DE",fg:"#3B6D11"},pending:{bg:"#FAEEDA",fg:"#BA7517"},na:{bg:"#F1EFE8",fg:"#5F5E5A"},due:{bg:"#E6F1FB",fg:"#185FA5"}};
const pillLabels={expired:"Expired ⚠",ok:"Done ✓",pending:"Upload needed",na:"N/A",due:"Action needed"};

// ─── BASE COMPONENTS ─────────────────────────────────────────────────────────
function Pill({s,label}){const p=pillCfg[s]||pillCfg.na;return <span style={{background:p.bg,color:p.fg,fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap",display:"inline-block"}}>{label??pillLabels[s]}</span>;}
function Chip({color="teal",children}){const m={teal:{bg:"#E1F5EE",fg:C.teal},blue:{bg:C.blueL,fg:C.blue},amber:{bg:C.amberL,fg:C.amber},gray:{bg:C.grayL,fg:C.gray},green:{bg:"#EAF3DE",fg:C.green}}[color]||{bg:C.grayL,fg:C.gray};return <span style={{background:m.bg,color:m.fg,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500}}>{children}</span>;}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1.25rem",marginBottom:"1rem",...style}}>{children}</div>;}
function Alert({type="amber",title,children}){const m={red:{bg:"#FCEBEB",b:C.red},amber:{bg:C.amberL,b:C.amber},green:{bg:"#EAF3DE",b:C.teal},blue:{bg:C.blueL,b:C.blue}}[type];return <div style={{background:m.bg,borderLeft:`3px solid ${m.b}`,borderRadius:6,padding:"0.75rem 1rem",marginBottom:"0.875rem"}}><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{children}</div></div>;}
function SLabel({children}){return <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:C.muted,marginBottom:"0.625rem",fontWeight:500}}>{children}</div>;}
function Divider(){return <div style={{borderTop:`1px solid ${C.border}`,margin:"0.875rem 0"}}/>;}
function Input({label,value,onChange,type="text",placeholder=""}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box"}}/></div>;}
function Textarea({label,value,onChange,rows=3}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><textarea value={value} onChange={onChange} rows={rows} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,resize:"vertical",boxSizing:"border-box"}}/></div>;}
function BtnPrimary({onClick,children,style={}}){return <button onClick={onClick} style={{background:C.teal,color:"white",border:"none",borderRadius:6,padding:"8px 16px",fontSize:13,fontWeight:500,cursor:"pointer",...style}}>{children}</button>;}
function BtnOutline({onClick,children}){return <button onClick={onClick} style={{background:"white",color:C.teal,border:`1px solid ${C.teal}`,borderRadius:6,padding:"8px 16px",fontSize:13,fontWeight:500,cursor:"pointer"}}>{children}</button>;}
function Select({label,value,onChange,options}){return <div style={{marginBottom:"0.625rem"}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><select value={value} onChange={onChange} style={{width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL}}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>;}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const CLINICS=[
  {id:"pakuranga",name:"Pakuranga — Lloyd Elsmore",short:"Pakuranga",icon:"🏊",note:"Lloyd Elsmore Leisure Centre · Since 2002 · Pool & gym access"},
  {id:"flatbush", name:"Flat Bush",short:"Flat Bush",icon:"🏥",note:"Flat Bush clinic"},
  {id:"titirangi",name:"Titirangi Village",short:"Titirangi",icon:"🌿",note:"Below Titirangi Medical Centre · Since 2004 · On-site gym"},
  {id:"panmure",  name:"Panmure — Lagoon Pools",short:"Panmure",icon:"🏊",note:"Inside Lagoon Pools complex · Hydrotherapy access"},
  {id:"schools",  name:"Howick & Edgewater College",short:"Schools",icon:"🏫",note:"School term only · Hakinakina Hauora Health Services"},
];

const STAFF={
  jade:     {name:"Jade Warren",          ini:"JW",color:"#0a3d2e",title:"Owner / Director · Physiotherapist",                clinics:["pakuranga","flatbush","titirangi","panmure"],type:"Owner",       bio:"Founded Total Body Physio in 2000. Physiotherapist and director overseeing all clinics.",                                                                                                       info:[["Role","Owner / Director"],["Clinics","All locations"]],                                                                                                                                                                            certs:[{n:"APC 2025/2026",s:"pending",d:"Upload your renewed certificate"},{n:"First Aid / CPR",s:"pending",d:"Upload current certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"Peer Review 2026",s:"pending",d:"Annual — due"},{n:"Orientation",s:"ok",d:"Completed"}]},
  alistair: {name:"Alistair Burgess",     ini:"AB",color:C.teal,   title:"Senior Physiotherapist · Clinical Director · H&S Officer", clinics:["pakuranga","schools"],                                    type:"Physiotherapist",bio:"M.Phty, B.App.Sc (Exercise & Sports Science), NZRP. 8+ years in private practice. Specialist in Strength Training, Movement Assessment, Shoulder & Core Rehabilitation. Former NZ U19 rugby.",info:[["Role","Senior Physiotherapist"],["Additional","Clinical Director · H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-14433 / HPI: 29CMBK"],["Started","24 October 2023"],["ACC role","Named Clinical Director — confirmed Nov 2023"]],                                                    certs:[{n:"APC 2025/2026",s:"expired",d:"Last cert expired 31 March 2025 — upload 2025/26 now"},{n:"First Aid Level 1 (St John)",s:"expired",d:"Expired 10 Aug 2024 — renew with St John"},{n:"Cultural Competency (Mauriora)",s:"expired",d:"Expired Sept 2024 — re-enrol at mauriora.co.nz"},{n:"PNZ Membership",s:"pending",d:"Upload renewal"},{n:"Peer Review 2026",s:"pending",d:"Annual — due"},{n:"Performance Appraisal 2026",s:"pending",d:"Annual — due"},{n:"Orientation",s:"ok",d:"Completed — signed"},{n:"Employment Agreement",s:"ok",d:"Signed 24 Oct 2023"}]},
  timothy:  {name:"Timothy Keung",        ini:"TK",color:"#185FA5",title:"Physiotherapist",                                       clinics:["pakuranga","titirangi","panmure"],                            type:"Contractor",     bio:"Fluent in Mandarin, Cantonese, and English. Works across Auckland locations. Pursuing postgraduate study in acupuncture.",                                                                  info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"],["Clinics","Pakuranga · Titirangi · Panmure"]],                                                                                        certs:[{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"Peer Review 2026",s:"pending",d:"Annual — due"},{n:"Performance Appraisal 2026",s:"pending",d:"Annual — due"},{n:"Orientation",s:"ok",d:"Completed"},{n:"Contract",s:"pending",d:"Upload from Drive"}]},
  hans:     {name:"Hans Vermeulen",       ini:"HV",color:"#533AB7",title:"Physiotherapist · Clinic Lead",                         clinics:["titirangi"],                                                 type:"Contractor",     bio:"Nearly 20 years with Total Body Physio. Clinic lead at Titirangi. Broad musculoskeletal experience.",                                                                                       info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"],["Clinic","Titirangi Village"]],                                                                                                               certs:[{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"PNZ Membership",s:"pending",d:"Upload if applicable"},{n:"Peer Review 2026",s:"ok",d:"Completed — on file"},{n:"Performance Appraisal 2026",s:"pending",d:"Annual — due"},{n:"Orientation",s:"ok",d:"Long-standing staff"},{n:"Contract",s:"pending",d:"Upload from Drive"}]},
  dylan:    {name:"Dylan Connolly",       ini:"DC",color:"#D85A30",title:"Physiotherapist",                                       clinics:["pakuranga"],                                                 type:"Physiotherapist",bio:"Manual therapy specialist. Employee from December 2025.",                                                                                                                          info:[["Role","Physiotherapist"],["Type","Employee"],["Speciality","Manual therapy"],["Started","December 2025"],["Clinic","Pakuranga"]],                                                                                                   certs:[{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"Orientation",s:"pending",d:"In progress"},{n:"Employment Agreement",s:"pending",d:"Upload from Drive"}]},
  ibrahim:  {name:"Ibrahim Al-Jumaily",   ini:"IA",color:C.tealM,  title:"Physiotherapist · New graduate",                        clinics:["pakuranga","flatbush"],                                       type:"Physiotherapist",bio:"NZ-trained physiotherapist, born and raised in South East Auckland. Strong interest in movement quality, injury prevention and evidence-based care. Football, martial arts, hiking.",    info:[["Role","Physiotherapist"],["Level","New graduate"],["Training","NZ-trained"],["Clinics","Pakuranga · Flat Bush"]],                                                                                                                 certs:[{n:"APC 2025/2026",s:"due",d:"New grad — confirm registration with Physio Board NZ"},{n:"First Aid / CPR",s:"due",d:"Not due yet — book when settled in"},{n:"Cultural Competency",s:"due",d:"Complete within first year"},{n:"Orientation",s:"pending",d:"In progress"},{n:"Contract",s:"pending",d:"Upload from Drive"}]},
  isabella: {name:"Isabella Yang",        ini:"IY",color:"#D4537E",title:"Physiotherapist",                                       clinics:["pakuranga","flatbush"],                                       type:"Physiotherapist",bio:"Otago University physio graduate. Grew up locally, attended Macleans College. Hands-on techniques and exercise-based treatment approach.",                                               info:[["Role","Physiotherapist"],["Type","Employee"],["Qualification","BPhty — University of Otago"],["Started","17 June 2024"],["Clinics","Pakuranga · Flat Bush"]],                                                                        certs:[{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"PNZ Membership",s:"pending",d:"Upload if applicable"},{n:"Peer Review 2026",s:"pending",d:"First annual cycle — due"},{n:"Performance Appraisal 2026",s:"pending",d:"First annual cycle — due"},{n:"Orientation",s:"ok",d:"Completed on start"},{n:"Employment Agreement",s:"pending",d:"Upload from Drive"}]},
  gwenne:   {name:"Gwenne Manares",       ini:"GM",color:"#639922",title:"Physiotherapist",                                       clinics:["panmure"],                                                   type:"Contractor",     bio:"Physiotherapist at Total Body Physio Panmure, inside the Lagoon Pools complex.",                                                                                                            info:[["Role","Physiotherapist"],["Type","Contractor"],["Clinic","Panmure — Lagoon Pools"]],                                                                                                                                               certs:[{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"Orientation",s:"pending",d:"In progress"},{n:"Contract",s:"pending",d:"Upload from Drive"}]},
};

const PAST_STAFF=["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"];

// ─── ORIENTATION DATA (from actual TBP documents) ─────────────────────────────
const ORIENTATION_SECTIONS=[
  {title:"Documents read & understood",items:["Privacy Act 2020","Children's Act 2014","Health Information Privacy Code 2020","Health Practitioners Competence Assurance Act 2003","Health and Disability Commissioner Act 1994","Code of Health and Disability Services Consumers' Rights","Health and Safety at Work Act 2015","PBNZ Code of Ethics and Professional Conduct","PBNZ Māori Cultural Safety and Competence Standard","PBNZ Cultural Competence Standard","PBNZ Sexual and Emotional Boundaries Standard","ACC8310 Partnering with ACC","ACC1625 Māori Cultural Competency","TBP Policies and Procedures Manual","TBP Business Plan","TBP Health and Safety Plan"]},
  {title:"The clinic — tour & introduction",items:["Introduction to all staff","Waiting rooms and treatment areas shown","Computerised notes system (Cliniko) demonstrated","Toilets located","Kitchen area shown"]},
  {title:"Health & safety emergency procedures",items:["Fire exits, alarms and extinguisher locations known","Evacuation procedure and meeting areas understood","Incident reporting for patients explained","Incident reporting for staff explained","Electrical mains location known","Location of first aid kit known"]},
  {title:"Administration",items:["CPR certificate seen and copy in file","APC seen and copy in file","Employee Information sheet completed","Physio registration number recorded in file","Performance review dates set","CPD goals set and hours assessed","Contract signed, dated and in file"]},
  {title:"Clinic policy & procedures",items:["Location of P&P manuals (Google Drive) confirmed","Location of phone list and contact numbers confirmed","Patient consent, privacy and confidentiality understood","Receiving and making calls — process understood","Photocopying process explained","Privacy Act 2020 read","Health and Safety Act read","P&P in orientation folder read"]},
  {title:"Swimming pool complex (Pakuranga only)",items:["Reception area and reception staff met","First aid room located","Manager's office and introduction to manager","Fire exits, alarms and extinguishers located","Gym and gym staff met","Public toilets and staff toilets/showers located","Staff room located","Car parking explained"]},
];

// ─── AUDIT FORM DEFINITIONS ───────────────────────────────────────────────────
const AUDIT_FORMS={
  hygiene:{
    title:"Hygiene & Cleanliness Audit",
    icon:"🧼",
    description:"Complete at each clinic quarterly. All items must be sighted and assessed.",
    sections:[
      {title:"Treatment rooms",items:["Treatment tables wiped down between every patient","Pillow slips/paper changed between every patient","Floors clean and free of debris","All surfaces disinfected","Waste bins emptied and lined","No clutter on benches or work surfaces"]},
      {title:"Equipment & tools",items:["All equipment wiped down after use","Ultrasound heads cleaned after each use","Exercise equipment (bands, balls) clean and stored correctly","Single-use items disposed of immediately"]},
      {title:"Hand hygiene",items:["Hand sanitiser available at each treatment room entrance","Staff observed following hand hygiene protocol","Soap and paper towels available at sinks"]},
      {title:"Common areas",items:["Waiting room chairs and surfaces clean","Reception desk clean and tidy","Kitchen/staff room clean — bench, sink, microwave","Staff toilets clean and stocked with soap and paper towels"]},
      {title:"PPE & infection control",items:["PPE supplies stocked (gloves, masks)","Clinical waste disposed of correctly","No expired single-use items in clinical areas"]},
    ]
  },
  clinical_notes:{
    title:"Clinical Notes Audit",
    icon:"📋",
    description:"Random audit of clinical records. Select 5 patient files and assess each item.",
    sections:[
      {title:"Documentation standards",items:["Notes completed on day of treatment","SOATAP format used consistently","Legible and professional language used","No blank fields in required sections"]},
      {title:"Consent & patient information",items:["Informed consent documented at first visit","Patient details accurate and up to date","Privacy and confidentiality statement signed","ACC claim details correct and complete"]},
      {title:"Treatment planning",items:["Initial assessment findings documented","Clinical diagnosis recorded","Treatment plan documented and reviewed","Measurable goals set with patient"]},
      {title:"Progress & outcomes",items:["Progress notes reflect treatment plan","Outcome measures recorded","Any change in condition noted","Referrals documented where made"]},
      {title:"ACC compliance",items:["16th-visit review completed where required","Discharge summary sent to referrer","ACC forms completed accurately","Treatment codes correct"]},
    ]
  },
  hs_audit:{
    title:"H&S Workplace Audit",
    icon:"⚠️",
    description:"Complete quarterly at each clinic. Alistair Burgess (H&S Officer) is responsible for conducting and reviewing this audit.",
    sections:[
      {title:"Fire safety",items:["Fire exits clear and unobstructed","Fire exit signage visible and in good condition","Fire extinguishers present, tagged and in date","Evacuation plan posted in visible location","All staff aware of evacuation procedure and meeting point"]},
      {title:"First aid",items:["First aid kit present and accessible","First aid kit contents checked and in date","At least one staff member holds current first aid certificate","First aid kit location known to all staff"]},
      {title:"General safety",items:["No trip hazards in clinical or public areas","Floors dry and non-slip or clearly signed","Adequate lighting in all areas","Emergency contact list posted","Electrical mains/switchboard clearly labelled and accessible"]},
      {title:"Equipment safety",items:["All electrical equipment tested and tagged","No damaged cords, plugs or sockets","Equipment stored safely when not in use","Service/maintenance records up to date"]},
      {title:"Staff & workplace",items:["All staff have read and signed H&S policy","Incident reporting process understood by all staff","Hazard register up to date","PPE available and in good condition","No workplace bullying or harassment concerns raised"]},
    ]
  },
  equipment:{
    title:"Equipment & Electrical Check",
    icon:"⚡",
    description:"Annual check of all electrical and clinical equipment. Complete for each clinic site.",
    sections:[
      {title:"Electrical equipment — testing & tagging",items:["All portable electrical appliances have current test tag","Test tag dates recorded and within 12-month period","No equipment with expired or missing tags in use","Switchboard/mains clearly labelled"]},
      {title:"Clinical equipment condition",items:["Ultrasound machines functioning correctly","TENS/IFC machines functioning correctly","Laser equipment (if applicable) functioning correctly","Traction equipment checked","Exercise equipment (treadmill, bike, etc.) safe and functional"]},
      {title:"Treatment room equipment",items:["Treatment tables in good condition — no cracks or unstable legs","Pillow frames and headrests secure","Step stools/footstools stable","Sharps disposal containers present and not over-filled"]},
      {title:"Records & documentation",items:["Equipment register up to date","Service provider details recorded","Last service date recorded for each major piece of equipment","Next service date scheduled and diary noted"]},
    ]
  }
};

// ─── DIGITAL ORIENTATION CHECKLIST ───────────────────────────────────────────
function OrientationChecklist({staffId,onClose}){
  const s=STAFF[staffId];
  const storageKey=`orientation_${staffId}`;
  const [checks,setChecks]=useState(()=>{try{const s=localStorage.getItem(storageKey);return s?JSON.parse(s):{}}catch{return{}}});
  const [sig,setSig]=useState("");
  const [submitted,setSubmitted]=useState(()=>!!localStorage.getItem(`orientation_done_${staffId}`));
  const [submittedDate]=useState(()=>localStorage.getItem(`orientation_date_${staffId}`)||"");

  const allItems=ORIENTATION_SECTIONS.flatMap(sec=>sec.items);
  const checkedCount=Object.values(checks).filter(Boolean).length;
  const pct=Math.round((checkedCount/allItems.length)*100);

  function toggle(item){
    const next={...checks,[item]:!checks[item]};
    setChecks(next);
    try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{}
  }

  function submit(){
    if(checkedCount<allItems.length){alert("Please tick all items before signing.");return;}
    if(!sig.trim()){alert("Please type your name to sign.");return;}
    const date=new Date().toLocaleDateString("en-NZ");
    try{localStorage.setItem(`orientation_done_${staffId}`,"true");localStorage.setItem(`orientation_date_${staffId}`,date);}catch{}
    setSubmitted(true);
  }

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:700,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"white",fontSize:17,fontWeight:600}}>Orientation Checklist</div>
            <div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2}}>{s.name} · Total Body Physio</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{color:"white",fontSize:20,fontWeight:700}}>{pct}%</div>
              <div style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>{checkedCount}/{allItems.length} items</div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        </div>

        {submitted?(
          <div style={{padding:"2rem",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:"0.75rem"}}>✅</div>
            <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>Orientation complete</div>
            <div style={{fontSize:13,color:C.muted}}>Signed by {s.name} on {submittedDate}</div>
            <div style={{marginTop:"1.5rem"}}><BtnOutline onClick={onClose}>Close</BtnOutline></div>
          </div>
        ):(
          <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>
            {/* Progress bar */}
            <div style={{marginBottom:"1.25rem"}}>
              <div style={{height:8,background:C.grayL,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:pct===100?C.teal:C.amber,width:`${pct}%`,transition:"width 0.3s"}}/>
              </div>
            </div>

            {ORIENTATION_SECTIONS.map((sec,si)=>(
              <div key={si} style={{marginBottom:"1.25rem"}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:"0.5rem",paddingBottom:"0.375rem",borderBottom:`1px solid ${C.border}`}}>{sec.title}</div>
                {sec.items.map((item,ii)=>{
                  const key=`${si}-${ii}`;
                  const checked=!!checks[key];
                  return(
                    <div key={ii} onClick={()=>toggle(key)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",cursor:"pointer",borderBottom:`1px solid ${C.grayL}`}}>
                      <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${checked?C.teal:C.border}`,background:checked?C.teal:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                        {checked&&<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                      <span style={{fontSize:13,color:checked?C.muted:C.text,textDecoration:checked?"line-through":"none"}}>{item}</span>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{background:C.grayXL,borderRadius:8,padding:"1rem",marginTop:"1rem",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Declaration & digital signature</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:"0.875rem",lineHeight:1.6}}>I confirm that I have read all the documents listed above and understood them to the best of my ability. I understand that should I have any queries or concerns, I must discuss these with the Administrative Manager.</div>
              <Input label="Type your full name to sign" value={sig} onChange={e=>setSig(e.target.value)} placeholder={s.name}/>
              <div style={{fontSize:11,color:C.muted,marginBottom:"0.875rem"}}>Date: {new Date().toLocaleDateString("en-NZ")}</div>
              <BtnPrimary onClick={submit} style={{opacity:checkedCount<allItems.length||!sig.trim()?0.5:1}}>✓ Submit signed orientation checklist</BtnPrimary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EMPLOYEE INFO FORM ───────────────────────────────────────────────────────
function EmployeeInfoForm({staffId,onClose}){
  const s=STAFF[staffId];
  const key=`empinfo_${staffId}`;
  const [form,setForm]=useState(()=>{try{const d=localStorage.getItem(key);return d?JSON.parse(d):{name:s.name,address:"",homePhone:"",cell:"",email:"",nokName:"",nokAddress:"",nokHomePhone:"",nokCell:"",empType:"Employed",workType:"Full time"}}catch{return{name:s.name,address:"",homePhone:"",cell:"",email:"",nokName:"",nokAddress:"",nokHomePhone:"",nokCell:"",empType:"Employed",workType:"Full time"}}});
  const [saved,setSaved]=useState(false);
  function f(field){return e=>{setForm({...form,[field]:e.target.value});setSaved(false);}}
  function save(){try{localStorage.setItem(key,JSON.stringify(form));}catch{}setSaved(true);}
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:600,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{color:"white",fontSize:17,fontWeight:600}}>Employee Information Sheet</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2}}>{s.name}</div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>
          <SLabel>Personal details</SLabel>
          <Input label="Full name" value={form.name} onChange={f("name")}/>
          <Input label="Address" value={form.address} onChange={f("address")}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            <Input label="Home phone" value={form.homePhone} onChange={f("homePhone")}/>
            <Input label="Cell" value={form.cell} onChange={f("cell")}/>
          </div>
          <Input label="Email" value={form.email} onChange={f("email")} type="email"/>
          <Divider/>
          <SLabel>Next of kin</SLabel>
          <Input label="Name" value={form.nokName} onChange={f("nokName")}/>
          <Input label="Address" value={form.nokAddress} onChange={f("nokAddress")}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            <Input label="Home phone" value={form.nokHomePhone} onChange={f("nokHomePhone")}/>
            <Input label="Cell" value={form.nokCell} onChange={f("nokCell")}/>
          </div>
          <Divider/>
          <SLabel>Employment type</SLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            <Select label="Employment status" value={form.empType} onChange={f("empType")} options={["Employed","Sub Contractor"]}/>
            <Select label="Hours" value={form.workType} onChange={f("workType")} options={["Full time","Part Time"]}/>
          </div>
          <div style={{marginTop:"0.875rem",display:"flex",gap:8,alignItems:"center"}}>
            <BtnPrimary onClick={save}>Save information</BtnPrimary>
            {saved&&<span style={{fontSize:12,color:C.teal,fontWeight:500}}>✓ Saved</span>}
          </div>
          <div style={{marginTop:"0.75rem",fontSize:11,color:C.muted}}>Pay and banking details are held securely in the employment agreement — not stored in this portal.</div>
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT FORM ───────────────────────────────────────────────────────────────
function AuditFormModal({type,onClose,onComplete}){
  const form=AUDIT_FORMS[type];
  const allItems=form.sections.flatMap(s=>s.items);
  const [checks,setChecks]=useState({});
  const [notes,setNotes]=useState({});
  const [meta,setMeta]=useState({clinic:CLINICS[0].short,auditor:"",date:new Date().toISOString().split("T")[0]});
  const checkedCount=Object.values(checks).filter(v=>v==="pass").length;
  const failCount=Object.values(checks).filter(v=>v==="fail").length;
  const naCount=Object.values(checks).filter(v=>v==="na").length;
  const answered=checkedCount+failCount+naCount;
  const pct=Math.round((answered/allItems.length)*100);

  function setCheck(key,val){setChecks(p=>({...p,[key]:val}));}
  function setNote(key,val){setNotes(p=>({...p,[key]:val}));}

  function submit(){
    if(!meta.auditor.trim()){alert("Please enter the auditor name.");return;}
    if(answered<allItems.length){if(!window.confirm(`${allItems.length-answered} items unanswered. Submit anyway?`))return;}
    const result={id:Date.now(),type,title:form.title,icon:form.icon,clinic:meta.clinic,auditor:meta.auditor,date:meta.date,checkedCount,failCount,naCount,total:allItems.length,outcome:failCount===0?"Passed":`${failCount} issue${failCount>1?"s":""} found`,notes:Object.entries(notes).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(" | ")};
    onComplete(result);
  }

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:720,marginBottom:"2rem"}}>
        <div style={{background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{color:"white",fontSize:17,fontWeight:600}}>{form.icon} {form.title}</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2}}>{form.description}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}><div style={{color:"white",fontSize:20,fontWeight:700}}>{pct}%</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>{answered}/{allItems.length}</div></div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        </div>
        <div style={{padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto"}}>
          {/* Meta */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem"}}>
            <Select label="Clinic" value={meta.clinic} onChange={e=>setMeta({...meta,clinic:e.target.value})} options={CLINICS.map(c=>c.short)}/>
            <Input label="Auditor name" value={meta.auditor} onChange={e=>setMeta({...meta,auditor:e.target.value})}/>
            <Input label="Date" value={meta.date} onChange={e=>setMeta({...meta,date:e.target.value})} type="date"/>
          </div>

          {/* Legend */}
          <div style={{display:"flex",gap:16,marginBottom:"1rem",fontSize:12,color:C.muted}}>
            <span>For each item select:</span>
            <span style={{color:"#3B6D11",fontWeight:500}}>✓ Pass</span>
            <span style={{color:C.red,fontWeight:500}}>✗ Fail / issue</span>
            <span style={{color:C.gray,fontWeight:500}}>— N/A</span>
          </div>

          {form.sections.map((sec,si)=>(
            <div key={si} style={{marginBottom:"1.5rem"}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,padding:"0.5rem 0.75rem",background:C.grayXL,borderRadius:6,marginBottom:"0.5rem",borderLeft:`3px solid ${C.teal}`}}>{sec.title}</div>
              {sec.items.map((item,ii)=>{
                const key=`${si}-${ii}`;
                const val=checks[key];
                return(
                  <div key={ii} style={{borderBottom:`1px solid ${C.grayL}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
                      <span style={{flex:1,fontSize:13,color:C.text}}>{item}</span>
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        {[["pass","✓","#EAF3DE","#3B6D11"],["fail","✗","#FCEBEB",C.red],["na","N/A",C.grayL,C.gray]].map(([v,label,bg,fg])=>(
                          <button key={v} onClick={()=>setCheck(key,val===v?undefined:v)} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`1.5px solid ${val===v?fg:C.border}`,background:val===v?bg:"white",color:val===v?fg:C.muted,cursor:"pointer",fontWeight:val===v?600:400,transition:"all 0.1s"}}>{label}</button>
                        ))}
                      </div>
                    </div>
                    {val==="fail"&&(
                      <div style={{paddingBottom:"8px"}}>
                        <input placeholder="Describe issue and action required..." value={notes[key]||""} onChange={e=>setNote(key,e.target.value)} style={{width:"100%",padding:"5px 8px",border:`1px solid ${C.red}`,borderRadius:5,fontSize:12,background:"#FCEBEB",boxSizing:"border-box"}}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Summary & submit */}
          <div style={{background:C.grayXL,borderRadius:8,padding:"1rem",border:`1px solid ${C.border}`,marginTop:"0.5rem"}}>
            <div style={{display:"flex",gap:16,marginBottom:"0.875rem",flexWrap:"wrap"}}>
              <span style={{fontSize:13}}><span style={{fontWeight:600,color:"#3B6D11"}}>{checkedCount}</span> passed</span>
              <span style={{fontSize:13}}><span style={{fontWeight:600,color:C.red}}>{failCount}</span> failed</span>
              <span style={{fontSize:13}}><span style={{fontWeight:600,color:C.gray}}>{naCount}</span> N/A</span>
              <span style={{fontSize:13,color:C.muted}}>{allItems.length-answered} unanswered</span>
            </div>
            <Textarea label="Overall notes / actions required" value={notes.overall||""} onChange={e=>setNote("overall",e.target.value)} rows={2}/>
            <BtnPrimary onClick={submit}>Submit audit record</BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UPLOAD BUTTON ────────────────────────────────────────────────────────────
function UploadBtn({certName,staffName}){
  const [done,setDone]=useState(false);
  if(done)return <span style={{fontSize:11,color:C.teal,fontWeight:500}}>✓ Uploaded</span>;
  return <button onClick={()=>{window.open("https://drive.google.com","_blank");setTimeout(()=>setDone(true),800);}} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"white",border:`1px solid ${C.border}`,cursor:"pointer",color:C.muted,whiteSpace:"nowrap"}}>Upload to Drive</button>;
}

// ─── CERT ITEM ────────────────────────────────────────────────────────────────
function CertItem({cert,staffName}){
  const bg={expired:"#FCEBEB",ok:"#EAF3DE",pending:"#FAEEDA",na:C.grayXL,due:"#E6F1FB"};
  const bd={expired:"#f5c1c1",ok:"#c0dd97",pending:"#fac775",na:C.border,due:"#b5d4f4"};
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:6,border:`1px solid ${bd[cert.s]}`,background:bg[cert.s],marginBottom:5}}>
    <div><div style={{fontWeight:500,fontSize:13}}>{cert.n}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{cert.d}</div></div>
    {cert.s==="ok"?<span style={{fontSize:11,color:"#3B6D11",fontWeight:500}}>✓ On file</span>:cert.s==="na"?<span style={{fontSize:11,color:C.gray}}>N/A</span>:<UploadBtn certName={cert.n} staffName={staffName}/>}
  </div>;
}

// ─── PROFILE MODAL ─────────────────────────────────────────────────────────────
function ProfileModal({id,onClose}){
  const [tab,setTab]=useState("compliance");
  const [showOri,setShowOri]=useState(false);
  const [showInfo,setShowInfo]=useState(false);
  if(!id)return null;
  const s=STAFF[id];
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"2rem 1rem",overflowY:"auto"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:12,width:"100%",maxWidth:680,overflow:"hidden",marginBottom:"2rem"}}>
          <div style={{background:s.color,padding:"1.5rem",display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"white",flexShrink:0}}>{s.ini}</div>
            <div style={{flex:1}}>
              <div style={{color:"white",fontSize:18,fontWeight:600}}>{s.name}</div>
              <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:3}}>{s.title}</div>
              <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}>
                {s.clinics.map(c=>{const cl=CLINICS.find(x=>x.id===c);return <span key={c} style={{background:"rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.9)",fontSize:10,padding:"2px 8px",borderRadius:20}}>{cl?.short}</span>;})}
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:18,flexShrink:0}}>✕</button>
          </div>
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.grayXL}}>
            {["compliance","profile","orientation","info","upload"].map(t=>(
              <div key={t} onClick={()=>setTab(t)} style={{padding:"9px 13px",fontSize:12,color:tab===t?C.teal:C.muted,cursor:"pointer",borderBottom:tab===t?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:tab===t?500:400,whiteSpace:"nowrap"}}>
                {t==="orientation"?"✓ Orientation":t==="info"?"📄 Info sheet":t==="upload"?"📎 Upload":t.charAt(0).toUpperCase()+t.slice(1)}
              </div>
            ))}
          </div>
          <div style={{padding:"1.25rem 1.5rem",maxHeight:"60vh",overflowY:"auto"}}>
            {tab==="profile"&&(
              <div>
                {s.bio&&<div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:"1.25rem",padding:"0.75rem 1rem",background:C.grayXL,borderRadius:8}}>{s.bio}</div>}
                <SLabel>Details</SLabel>
                {s.info.map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span style={{color:C.muted}}>{l}</span><span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span></div>)}
              </div>
            )}
            {tab==="compliance"&&<div><SLabel>Certifications &amp; compliance</SLabel>{s.certs.map(c=><CertItem key={c.n} cert={c} staffName={s.name}/>)}</div>}
            {tab==="orientation"&&(
              <div>
                <Alert type="green" title="Digital orientation checklist">Staff member can tick each item as completed and digitally sign to confirm. Progress is saved automatically.</Alert>
                <BtnPrimary onClick={()=>setShowOri(true)}>Open orientation checklist →</BtnPrimary>
              </div>
            )}
            {tab==="info"&&(
              <div>
                <Alert type="blue" title="Employee information sheet">Personal and employment details. Banking details are not stored here — those are in the employment agreement.</Alert>
                <BtnPrimary onClick={()=>setShowInfo(true)}>Open information sheet →</BtnPrimary>
              </div>
            )}
            {tab==="upload"&&(
              <div>
                <Alert type="green" title="📁 Upload to Google Drive — TBP Compliance folder">Files are saved to the shared <strong>TBP Compliance / {s.name}</strong> folder. Visible to management only.</Alert>
                <SLabel>Upload documents</SLabel>
                {["APC Certificate (2025/2026)","First Aid / CPR Certificate","Cultural Competency Certificate","Employment Agreement / Contract","Job Description","Peer Review Record","Performance Appraisal","PNZ Membership","Orientation Checklist (signed)","Other document"].map(doc=>(
                  <div key={doc} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <span>{doc}</span>
                    <button onClick={()=>window.open("https://drive.google.com","_blank")} style={{fontSize:11,padding:"4px 12px",borderRadius:20,background:C.teal,border:"none",cursor:"pointer",color:"white"}}>📎 Upload</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showOri&&<OrientationChecklist staffId={id} onClose={()=>setShowOri(false)}/>}
      {showInfo&&<EmployeeInfoForm staffId={id} onClose={()=>setShowInfo(false)}/>}
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const INIT_MEETINGS=[
  {id:1,date:"2025-11-15",clinic:"All clinics",topic:"Q4 staff meeting — H&S review, CPD updates",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Discussed APC renewal cycle, updated first aid booking process.",status:"done"},
  {id:2,date:"2025-08-10",clinic:"Titirangi",topic:"In-service — shoulder rehab protocols",attendees:"Hans, Alistair",notes:"Hans led session. Reviewed UniSportsOrtho shoulder stabilisation phases.",status:"done"},
];
const INIT_AUDITS=[
  {id:1,date:"2025-12-01",type:"H&S Workplace Audit",icon:"⚠️",title:"H&S Workplace Audit",clinic:"Pakuranga",auditor:"Alistair Burgess",checkedCount:22,failCount:1,naCount:0,total:23,outcome:"1 issue found",notes:"Minor: first aid kit expiry dates needed updating. Actioned same day."},
  {id:2,date:"2025-12-03",type:"H&S Workplace Audit",icon:"⚠️",title:"H&S Workplace Audit",clinic:"Titirangi",auditor:"Alistair Burgess",checkedCount:23,failCount:0,naCount:0,total:23,outcome:"Passed",notes:"All clear."},
  {id:3,date:"2025-09-15",type:"Equipment & Electrical Check",icon:"⚡",title:"Equipment & Electrical Check",clinic:"Pakuranga",auditor:"Jade Warren",checkedCount:15,failCount:0,naCount:2,total:17,outcome:"Passed",notes:"2 items N/A (no traction equipment). All tags current."},
];

export default function App(){
  const [page,setPage]=useState("dashboard");
  const [profile,setProfile]=useState(null);
  const [role,setRole]=useState("owner");
  const [compTab,setCompTab]=useState("all");
  const [docsTab,setDocsTab]=useState("contracts");
  const [mgmtTab,setMgmtTab]=useState("audits");
  const [meetings,setMeetings]=useState(INIT_MEETINGS);
  const [audits,setAudits]=useState(INIT_AUDITS);
  const [activeAuditForm,setActiveAuditForm]=useState(null);
  const [showAddMeeting,setShowAddMeeting]=useState(false);
  const [nm,setNm]=useState({date:"",clinic:"All clinics",topic:"",attendees:"",notes:""});

  const expiredCount=Object.values(STAFF).flatMap(s=>s.certs).filter(c=>c.s==="expired").length;
  const roleNames={owner:"Jade Warren",alistair:"Alistair Burgess",hans:"Hans Vermeulen",staff:"Staff member"};

  const navItems=[
    {id:"dashboard", label:"◈  Dashboard",   section:"Overview"},
    {id:"compliance",label:"✓  Compliance",   badge:expiredCount>0?String(expiredCount):null},
    {id:"staff",     label:"◉  All Staff",    section:"People"},
    {id:"archive",   label:"◎  Past Staff",   adminOnly:true},
    {id:"clinics",   label:"⊕  Clinics",      section:"Clinic"},
    {id:"inservice", label:"◇  In-service",   },
    {id:"documents", label:"◻  Documents",    section:"Admin"},
    {id:"management",label:"◈  Management",   adminOnly:true},
  ];

  function Tabs({items,current,setter}){return <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem",flexWrap:"wrap"}}>{items.map(([id,label])=><div key={id} onClick={()=>setter(id)} style={{padding:"7px 14px",fontSize:13,color:current===id?C.teal:C.muted,cursor:"pointer",borderBottom:current===id?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:current===id?500:400,whiteSpace:"nowrap"}}>{label}</div>)}</div>;}

  function tbl(headers,rows){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.grayXL}}>{headers.map(h=><th key={h} style={{textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:C.muted,padding:"0.5rem 0.75rem",borderBottom:`1px solid ${C.border}`,fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{rows}</tbody></table></div>;}
  function td(content,i){return <td key={i} style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`,verticalAlign:"middle"}}>{content}</td>;}
  function PH({title,sub}){return <><div style={{fontSize:20,fontWeight:600,marginBottom:3}}>{title}</div><div style={{fontSize:13,color:C.muted,marginBottom:"1.25rem"}}>{sub}</div></>;}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  const Dashboard=()=>(
    <div>
      <PH title="Good morning, Jade 👋" sub="Total Body Physio — Compliance & HR Portal · April 2026"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
        {[["8","Staff",C.teal],[String(expiredCount),"Expired certs",C.red],["5","Clinics",C.blue],[String(audits.length),"Audit records",C.amber]].map(([n,l,c])=>(
          <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:700,color:c}}>{n}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      <Alert type="red" title="🔴 Urgent — Alistair Burgess">APC expired 31 March 2025 · First Aid expired Aug 2024 · Cultural Competency expired Sept 2024. Three items need immediate renewal for ACC compliance.</Alert>
      <Alert type="amber" title="🟡 APC cycle 2025/2026 started 1 April 2026">Upload renewed APC certificates for all staff. Tap any staff row to open their profile and upload.</Alert>
      <Alert type="green" title="🟢 Audit forms now built in">Run hygiene, clinical notes, H&S and equipment audits directly in the portal. Go to Management → Audits.</Alert>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"1.25rem 0 1rem"}}>
        <div style={{fontSize:14,fontWeight:600}}>Compliance snapshot</div>
        <BtnPrimary onClick={()=>setPage("staff")}>View all staff →</BtnPrimary>
      </div>
      {tbl(["Staff","Clinic","Type","APC","First Aid","Cultural","Peer Review"],
        Object.entries(STAFF).filter(([id])=>id!=="jade").map(([id,s])=>{
          const certMap=Object.fromEntries(s.certs.map(c=>[c.n,c.s]));
          const apc=certMap["APC 2025/2026"]||"pending";
          const fa=certMap["First Aid / CPR"]||certMap["First Aid Level 1 (St John)"]||"pending";
          const cult=certMap["Cultural Competency (Mauriora)"]||certMap["Cultural Competency"]||"pending";
          const pr=certMap["Peer Review 2026"]||certMap["Peer Review"]||"na";
          const clinicName=s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ");
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            {[<strong>{s.name}</strong>,clinicName,<Chip color={s.type==="Contractor"?"amber":"teal"}>{s.type}</Chip>,<Pill s={apc}/>,<Pill s={fa}/>,<Pill s={cult}/>,<Pill s={pr}/>].map((c,i)=>td(c,i))}
          </tr>;
        })
      )}
    </div>
  );

  // ── STAFF ─────────────────────────────────────────────────────────────────
  const StaffPage=()=>(
    <div>
      <PH title="All Staff" sub="Tap any card to view profile, compliance checklist, orientation and upload docs"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"0.875rem"}}>
        {Object.entries(STAFF).map(([id,s])=>{
          const expired=s.certs.filter(c=>c.s==="expired").length;
          const pending=s.certs.filter(c=>c.s==="pending").length;
          const done=s.certs.filter(c=>c.s==="ok").length;
          const pct=Math.round((done/s.certs.length)*100);
          const barColor=expired>0?C.red:pending>0?C.amber:C.teal;
          return(
            <div key={id} onClick={()=>setProfile(id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(15,110,86,0.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{padding:"1rem 1rem 0.75rem",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0}}>{s.ini}</div>
                <div><div style={{fontSize:14,fontWeight:600}}>{s.name}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.type}</div></div>
              </div>
              <div style={{padding:"0.75rem 1rem"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                  {s.clinics.slice(0,3).map(c=><Chip key={c} color="blue">{CLINICS.find(cl=>cl.id===c)?.short}</Chip>)}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:5,background:C.grayL,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,background:barColor,width:`${pct}%`}}/>
                  </div>
                  <span style={{fontSize:11,color:barColor,whiteSpace:"nowrap"}}>{expired>0?`${expired} expired`:pending>0?`${pending} to upload`:"All good ✓"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── COMPLIANCE ────────────────────────────────────────────────────────────
  const CompliancePage=()=>(
    <div>
      <PH title="Compliance tracker" sub="APC cycle 1 April 2026 – 31 March 2027"/>
      <Tabs items={[["all","All staff"],["apc","APC"],["firstaid","First Aid"],["cultural","Cultural"],["reviews","Reviews & appraisals"]]} current={compTab} setter={setCompTab}/>
      {compTab==="all"&&tbl(["Staff","Clinic","APC 25/26","First Aid","Cultural","PNZ","Peer Review","Appraisal","Orientation"],
        Object.entries(STAFF).map(([id,s])=>{
          const cm=Object.fromEntries(s.certs.map(c=>[c.n,c.s]));
          const get=(keys)=>keys.map(k=>cm[k]).find(Boolean)||"pending";
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
            {[<strong>{s.name}</strong>,s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", "),
              <Pill s={get(["APC 2025/2026"])}/>,<Pill s={get(["First Aid / CPR","First Aid Level 1 (St John)"])}/>,
              <Pill s={get(["Cultural Competency (Mauriora)","Cultural Competency"])}/>,<Pill s={get(["PNZ Membership"])||"na"}/>,
              <Pill s={get(["Peer Review 2026","Peer Review"])}/>,<Pill s={get(["Performance Appraisal 2026","Performance Appraisal"])}/>,
              <Pill s={get(["Orientation"])}/>].map((c,i)=>td(c,i))}
          </tr>;
        })
      )}
      {compTab==="apc"&&<><Alert type="amber" title="APC — Annual Practising Certificate">Issued by Physiotherapy Board of NZ. Renews 1 April each year. New cycle: 2025/26 — 1 April 2026 to 31 March 2027.</Alert>
        {tbl(["Staff","Last APC on file","Status"],Object.entries(STAFF).map(([id,s])=>{const apc=s.certs.find(c=>c.n.includes("APC"));return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}>{[<strong>{s.name}</strong>,id==="alistair"?"2024/25 — on file ✓":"Not yet uploaded",<Pill s={apc?.s||"pending"}/>].map((c,i)=>td(c,i))}</tr>;}))}
      </>}
      {compTab==="firstaid"&&<Alert type="amber" title="First Aid / CPR">All staff require a current First Aid certificate, valid for 2 years. Alistair's St John Level 1 expired 10 August 2024. Upload via each staff member's profile.</Alert>}
      {compTab==="cultural"&&<Alert type="amber" title="Cultural Competency (Mauriora)">Valid for 1 year from completion date. Alistair's expired Sept 2024. Re-enrol at mauriora.co.nz. Confirm status for all staff and upload certificates.</Alert>}
      {compTab==="reviews"&&tbl(["Staff","Peer Review 2026","Appraisal 2026","Notes"],
        Object.entries(STAFF).map(([id,s])=>{
          const pr=s.certs.find(c=>c.n.includes("Peer Review"))?.s||"na";
          const ap=s.certs.find(c=>c.n.includes("Appraisal"))?.s||"na";
          const note={alistair:"Clinical Director reviews own CPD",hans:"Peer review on file",dylan:"New staff — Dec 2025",ibrahim:"New grad — not due yet",gwenne:"Confirm timing as contractor"}[id]||"First annual cycle";
          return <tr key={id}>{[<strong>{s.name}</strong>,<Pill s={pr}/>,<Pill s={ap}/>,<span style={{fontSize:12,color:C.muted}}>{note}</span>].map((c,i)=>td(c,i))}</tr>;
        })
      )}
    </div>
  );

  // ── ARCHIVE ───────────────────────────────────────────────────────────────
  const ArchivePage=()=>(
    <div>
      <PH title="Past employees" sub="Archived records — kept for DAA / ACC audit purposes"/>
      <Card>
        <div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Former staff — 9 records</div>
        {PAST_STAFF.map(name=>(
          <div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:C.grayL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.gray,flexShrink:0}}>{name.slice(0,2).toUpperCase()}</div>
            <div><strong style={{fontSize:13}}>{name}</strong><div style={{fontSize:12,color:C.muted}}>Former physiotherapist · Records archived</div></div>
            <span style={{marginLeft:"auto"}}><Chip color="gray">Archived</Chip></span>
          </div>
        ))}
      </Card>
    </div>
  );

  // ── CLINICS ───────────────────────────────────────────────────────────────
  const ClinicsPage=()=>(
    <div>
      <PH title="Clinics" sub="Total Body Physio — all locations"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"0.875rem"}}>
        {CLINICS.map(cl=>{
          const clinicStaff=Object.values(STAFF).filter(s=>s.clinics.includes(cl.id));
          return <Card key={cl.id}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{cl.icon} {cl.name}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:"0.75rem",lineHeight:1.5}}>{cl.note}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{clinicStaff.map(s=><Chip key={s.name} color="teal">{s.name.split(" ")[0]}</Chip>)}</div>
          </Card>;
        })}
      </div>
    </div>
  );

  // ── IN-SERVICE ────────────────────────────────────────────────────────────
  const InservicePage=()=>(
    <div>
      <PH title="In-service training log" sub="Annual requirement — at least one per clinic group per year"/>
      <Alert type="amber" title="Logistics tip">Getting all sites together is tough. Hans can lead Titirangi sessions. Each clinic just needs at least one documented session per year for ACC compliance.</Alert>
      <Card>
        <div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>2026 in-service log</div>
        {tbl(["Clinic","Topic","Date","Attendees","Status"],[
          ...["Pakuranga","Titirangi","Flat Bush","Panmure"].map((clinic,i)=>(
            <tr key={i}><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>{clinic}</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`,color:C.hint,fontStyle:"italic"}}>Not yet scheduled</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>—</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`,fontSize:12}}>{["Alistair, Timothy, Dylan, Ibrahim, Isabella","Hans","Ibrahim, Isabella","Gwenne"][i]}</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}><Pill s="pending" label="Plan required"/></td></tr>
          ))
        ])}
        <button style={{marginTop:"1rem",background:"white",color:C.teal,border:`1px solid ${C.teal}`,borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:500,cursor:"pointer"}}>+ Log in-service session</button>
      </Card>
    </div>
  );

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────
  const DocumentsPage=()=>(
    <div>
      <PH title="Documents" sub="Contracts, job descriptions & legislation"/>
      <Tabs items={[["contracts","Contracts"],["jd","Job descriptions"],["leg","Legislation"]]} current={docsTab} setter={setDocsTab}/>
      {docsTab==="contracts"&&<Card>{Object.entries(STAFF).map(([id,s])=>{const c=s.certs.find(c=>c.n.includes("Agreement")||c.n.includes("Contract"));return <div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:34,height:34,borderRadius:"50%",background:s.color+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:s.color,flexShrink:0}}>{s.ini}</div><div style={{flex:1}}><strong style={{fontSize:13}}>{s.name}</strong><div style={{fontSize:12,color:C.muted}}>{s.type} · {s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</div></div><Pill s={c?.s||"pending"} label={c?.s==="ok"?"Signed ✓":"Upload"}/></div>;})}
      </Card>}
      {docsTab==="jd"&&<Card>{[["Physiotherapist — Job Description","Template · Signed by Alistair 27/9/2023","ok"],["Clinical Director — Job Description","Signed by Alistair 24/9/2023 · ACC confirmed Nov 2023","ok"],["Health & Safety Officer — Job Description","Signed by Alistair 27/9/2023","ok"],["All other staff — Job Descriptions","Upload from Drive","pending"]].map(([n,m,s])=><div key={n} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div><strong style={{fontSize:13}}>{n}</strong><div style={{fontSize:12,color:C.muted}}>{m}</div></div><Pill s={s} label={s==="ok"?"On file ✓":"Upload"}/></div>)}</Card>}
      {docsTab==="leg"&&<Card>{[["Health Practitioners Competence Assurance Act 2003","Governs registration, APC and scope of practice for all physios."],["Health and Safety at Work Act 2015","H&S obligations. Alistair is H&S Officer. Quarterly audits required."],["Privacy Act 2020","Patient and staff privacy obligations."],["Employment Relations Act 2000","Employment agreements, disputes, good faith, restructuring."],["Children's Act 2014","Obligations regarding work with children."],["Health and Disability Commissioner Act 1994","Patient rights and complaints process."],["ACC Allied Health Services Contract (DAA Group)","Clinical Director requirements, 16th-visit reviews, in-service, orientation, audit standards."]].map(([t,d])=><div key={t} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><strong style={{fontSize:13}}>{t}</strong><div style={{fontSize:12,color:C.muted,marginTop:2,lineHeight:1.6}}>{d}</div></div>)}</Card>}
    </div>
  );

  // ── MANAGEMENT ────────────────────────────────────────────────────────────
  const ManagementPage=()=>(
    <div>
      <PH title="Management" sub="Audits, meetings, H&S, equipment — DAA / ACC Allied Health Standards"/>
      <Tabs items={[["audits","Audits"],["meetings","Staff Meetings"],["equipment","Equipment"],["accreditation","Accreditation"]]} current={mgmtTab} setter={setMgmtTab}/>

      {mgmtTab==="audits"&&(
        <div>
          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:"0.75rem"}}>Run an audit</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"0.75rem"}}>
              {Object.entries(AUDIT_FORMS).map(([key,f])=>(
                <div key={key} onClick={()=>setActiveAuditForm(key)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.1)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:24,marginBottom:6}}>{f.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{f.title}</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{f.sections.length} sections · {f.sections.flatMap(s=>s.items).length} items</div>
                  <div style={{marginTop:"0.625rem"}}><span style={{fontSize:11,color:C.teal,fontWeight:500}}>Start audit →</span></div>
                </div>
              ))}
            </div>
          </div>
          <Divider/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
            <div style={{fontSize:14,fontWeight:600}}>Audit history ({audits.length} records)</div>
          </div>
          {[...audits].reverse().map(a=>(
            <Card key={a.id}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                <div><div style={{fontSize:14,fontWeight:600}}>{a.icon} {a.title}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{a.date} · {a.clinic} · Auditor: {a.auditor}</div></div>
                <Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>
              </div>
              <div style={{display:"flex",gap:16,fontSize:12,marginBottom:a.notes?6:0}}>
                <span style={{color:"#3B6D11",fontWeight:500}}>{a.checkedCount} passed</span>
                <span style={{color:C.red,fontWeight:500}}>{a.failCount} failed</span>
                <span style={{color:C.gray}}>{a.naCount} N/A</span>
                <span style={{color:C.muted}}>{a.total} total items</span>
              </div>
              {a.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6}}>{a.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {mgmtTab==="meetings"&&(
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
            <BtnPrimary onClick={()=>setShowAddMeeting(true)}>+ Log meeting</BtnPrimary>
          </div>
          {showAddMeeting&&(
            <Card style={{borderColor:C.teal}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:"0.875rem"}}>Log new meeting</div>
              <Input label="Date" value={nm.date} onChange={e=>setNm({...nm,date:e.target.value})} type="date"/>
              <Input label="Clinic / location" value={nm.clinic} onChange={e=>setNm({...nm,clinic:e.target.value})}/>
              <Input label="Topic / agenda" value={nm.topic} onChange={e=>setNm({...nm,topic:e.target.value})}/>
              <Input label="Attendees" value={nm.attendees} onChange={e=>setNm({...nm,attendees:e.target.value})}/>
              <Textarea label="Notes / minutes" value={nm.notes} onChange={e=>setNm({...nm,notes:e.target.value})}/>
              <div style={{display:"flex",gap:8}}>
                <BtnPrimary onClick={()=>{if(nm.date&&nm.topic){setMeetings([...meetings,{...nm,id:Date.now(),status:"done"}]);setNm({date:"",clinic:"All clinics",topic:"",attendees:"",notes:""});setShowAddMeeting(false);}}} >Save meeting</BtnPrimary>
                <BtnOutline onClick={()=>setShowAddMeeting(false)}>Cancel</BtnOutline>
              </div>
            </Card>
          )}
          {[...meetings].reverse().map(m=>(
            <Card key={m.id}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                <div><strong style={{fontSize:14}}>{m.topic}</strong><div style={{fontSize:12,color:C.muted,marginTop:2}}>{m.date} · {m.clinic}</div></div>
                <Pill s="ok" label="Completed"/>
              </div>
              {m.attendees&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}><strong style={{color:C.text}}>Attendees:</strong> {m.attendees}</div>}
              {m.notes&&<div style={{fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6}}>{m.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {mgmtTab==="equipment"&&(
        <div>
          <Alert type="amber" title="Equipment servicing">Electrical equipment must be tested and tagged annually. Service certificates should be uploaded to Google Drive and logged here.</Alert>
          <Card>
            {tbl(["Clinic","Last serviced","Next due","Status"],[
              ...["Pakuranga","Flat Bush","Titirangi","Panmure"].map((clinic,i)=>(
                <tr key={i}><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>{clinic}</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>Sept 2025</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>Sept 2026</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}><Pill s="ok" label="Up to date"/></td></tr>
              ))
            ])}
            <div style={{marginTop:"1rem"}}><BtnOutline onClick={()=>{}}>+ Log service record</BtnOutline></div>
          </Card>
        </div>
      )}

      {mgmtTab==="accreditation"&&(
        <div>
          <Alert type="green" title="DAA Group — ACC Allied Health Standards">This portal supports your DAA accreditation. Compliance tracker, audit logs, meeting minutes, and in-service records all feed into audit readiness.</Alert>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"0.875rem"}}>
            {[["Staff credentials","APC, First Aid, Cultural Competency tracked per staff member",expiredCount>0?"expired":"ok"],["Clinical oversight","16th-visit case reviews by Clinical Director (Alistair)","pending"],["Orientation","Digital checklist with sign-off for each staff member","pending"],["In-service training","Annual requirement per clinic group","pending"],["H&S audits","Quarterly per clinic — logged in audit section","ok"],["Staff meetings","Quarterly — minutes logged in meetings section","ok"],["Equipment servicing","Annual electrical servicing — records on file","ok"],["Clinical notes audit","Random audit of records — run from audit section","na"]].map(([title,desc,s])=>(
              <Card key={title}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:14,fontWeight:600}}>{title}</div>
                  <Pill s={s} label={s==="ok"?"Compliant":s==="pending"?"Action needed":"Check"}/>
                </div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{desc}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── LAYOUT ────────────────────────────────────────────────────────────────
  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,'Segoe UI',sans-serif"}}>
      {/* Sidebar */}
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
            <option value="staff">Staff member (own only)</option>
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

      {/* Main */}
      <div style={{marginLeft:220,flex:1,padding:"1.5rem",minHeight:"100vh"}}>
        {page==="dashboard"  &&<Dashboard/>}
        {page==="staff"      &&<StaffPage/>}
        {page==="compliance" &&<CompliancePage/>}
        {page==="archive"    &&<ArchivePage/>}
        {page==="clinics"    &&<ClinicsPage/>}
        {page==="inservice"  &&<InservicePage/>}
        {page==="documents"  &&<DocumentsPage/>}
        {page==="management" &&<ManagementPage/>}
      </div>

      {/* Modals */}
      <ProfileModal id={profile} onClose={()=>setProfile(null)}/>
      {activeAuditForm&&(
        <AuditFormModal
          type={activeAuditForm}
          onClose={()=>setActiveAuditForm(null)}
          onComplete={result=>{setAudits(prev=>[...prev,result]);setActiveAuditForm(null);setPage("management");setMgmtTab("audits");}}
        />
      )}
    </div>
  );
}
