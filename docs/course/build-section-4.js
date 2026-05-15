"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

// ── Design Tokens ─────────────────────────────────────────────────────────────
const A = {
  bg:'f6f7f9', bgS:'eef0f4', card:'ffffff',
  ink:'0b1220', inkS:'3b475a', inkD:'6b7689', inkM:'9aa3b2',
  rule:'e6e9ef', ruleH:'d3d8e0',
  brand:'0b66e4', brandS:'e7f0ff', brandD:'0a4fb0',
  nav:'0e1525', navI:'cbd2dd', navM:'7d8595',
  ok:'1a8754', okS:'e2f3e9',
  warn:'c4671b', warnS:'fcefdf',
  red:'c63232', redS:'fbe5e5',
  violet:'6c4ad9', violetS:'ede9f7',
  teal:'137a7b', tealS:'e1f4f4',
  orange:'e07a3a', orangeS:'fdf0e5',
  cyan:'3093a8', W:'FFFFFF',
};
const F='Calibri', FM='Consolas';
const SW=10, TOT=20;
const OUT=path.join(__dirname,'section-4-slides.pptx');

const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Section 4 — Data Foundation';

const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;
const sh =()=>({type:'outer',blur:8, offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

// ── Helpers ───────────────────────────────────────────────────────────────────
function hdr(s,sec,mod,title,dark=false){
  s.background={color:dark?A.nav:A.bg};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  if(sec) s.addText(`${sec}  ·  ${mod}`,{x:0.42,y:0.1,w:8,h:0.22,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,margin:0});
  s.addText(title,{x:0.42,y:sec?0.31:0.16,w:9.0,h:0.52,fontSize:21,bold:true,color:dark?A.W:A.ink,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:sec?0.88:0.74,w:9.16,h:0.015,fill:{color:dark?'1e2d45':A.rule},line:{color:dark?'1e2d45':A.rule}});
}
function ftr(s,text,n,dark=false){
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:dark?'080f1c':A.bgS},line:{color:dark?'080f1c':A.bgS}});
  s.addText(text,{x:0.42,y:5.335,w:7.5,h:0.27,fontSize:7.5,italic:true,color:dark?A.navM:A.inkD,fontFace:F,valign:'middle',margin:0});
  s.addText(`${n} / ${TOT}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,valign:'middle',align:'right',margin:0});
}
function crd(s,x,y,w,h,o={}){
  s.addShape(R,{x,y,w,h,fill:{color:o.bg||A.card},line:{color:o.border||A.rule,pt:1},shadow:o.shadow||sh()});
  if(o.accent) s.addShape(R,{x,y,w:0.06,h,fill:{color:o.accent},line:{color:o.accent}});
}
function kpi(s,x,y,w,h,label,val,sub,accent){
  crd(s,x,y,w,h,{accent:accent||A.brand});
  s.addText(label,{x:x+0.15,y:y+0.1,w:w-0.22,h:0.24,fontSize:8,color:A.inkD,fontFace:F,margin:0});
  s.addText(val,{x:x+0.15,y:y+0.32,w:w-0.22,h:0.46,fontSize:19,bold:true,color:A.ink,fontFace:F,margin:0});
  if(sub) s.addText(sub,{x:x+0.15,y:y+0.76,w:w-0.22,h:0.22,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
}
function tbl(s,rows,cols,x,y,opts={}){
  const rh=opts.rh||0.36;
  rows.forEach((row,ri)=>{
    const isH=ri===0;
    let cx=x;
    row.forEach((cell,ci)=>{
      const cw=Array.isArray(cols)?cols[ci]:cols;
      const bg=isH?A.nav:(ri%2===0?A.card:'f8fafc');
      s.addShape(R,{x:cx,y:y+ri*rh,w:cw,h:rh,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
      cx+=cw;
    });
  });
}
function bullet(s,items,x,y,w,opts={}){
  const lineH=opts.lineH||0.38;
  const color=opts.color||A.inkS;
  const accent=opts.accent||A.ok;
  const fontSize=opts.fontSize||9.5;
  items.forEach((item,i)=>{
    s.addShape(R,{x,y:y+i*lineH,w:0.06,h:0.06,fill:{color:accent},line:{color:accent}});
    s.addText(item,{x:x+0.16,y:y+i*lineH-0.04,w:w,h:lineH,fontSize,color,fontFace:F,valign:'middle',margin:0,wrap:true});
  });
}
function tag(s,x,y,text,bg,fg='FFFFFF'){
  const tw=Math.max(text.length*0.072+0.22,0.55);
  s.addShape(R,{x,y,w:tw,h:0.22,fill:{color:bg},line:{color:bg}});
  s.addText(text,{x,y,w:tw,h:0.22,fontSize:7,bold:true,color:fg,fontFace:F,align:'center',valign:'middle',margin:0});
  return tw;
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — SECTION 4 DIVIDER (dark navy, green accent)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  // Top accent bar — green for Section 4
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  // Large ghosted "4"
  s.addText('4',{x:5.8,y:0.2,w:4.0,h:3.8,fontSize:190,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  // Green left bar
  s.addShape(R,{x:0.55,y:0.75,w:0.06,h:1.5,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('SECTION',{x:0.72,y:0.75,w:3,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Data Foundation',{x:0.72,y:1.0,w:5.0,h:1.1,fontSize:28,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('50 min  ·  5 Modules  ·  20 Slides',{x:0.72,y:2.1,w:4.5,h:0.3,fontSize:10,color:A.navM,fontFace:F,margin:0});

  // Module list — two columns
  const mods=[
    '4.1  Why Data Is the Hard Part',
    '4.2  Source Systems Landscape',
    '4.3  Get It In: Ingestion & Storage',
    '4.4  Transform with dbt',
    '4.5  AI Readiness Assessment',
  ];
  const slideNums=[2,4,8,13,18];
  mods.forEach((m,i)=>{
    const col=i<5?0:1, row=i<5?i:i-5;
    s.addText(m,{x:0.72+col*3.0,y:2.55+row*0.43,w:2.8,h:0.36,fontSize:8.5,color:A.navI,fontFace:F,margin:0});
  });

  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 4 — Data Foundation',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('1 / 20',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — 4.1 THE REALITY: FINANCE DATA IS MESSY
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.1 — Why Data Is the Hard Part','The Reality: Finance Data Is Messy');
  ftr(s,'Most AI projects fail at the data layer, not the model layer',2);

  // Insight callout box
  s.addShape(R,{x:0.42,y:0.95,w:9.16,h:0.55,fill:{color:A.okS},line:{color:A.ok,pt:1}});
  s.addShape(R,{x:0.42,y:0.95,w:0.06,h:0.55,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('⚠  Most AI finance projects fail here — not at the model layer.',{x:0.6,y:0.95,w:8.9,h:0.55,fontSize:10,bold:true,color:A.ok,fontFace:F,valign:'middle',margin:0});

  // Four challenge cards
  const challenges=[
    {label:'3+ Source Systems',icon:'⬡',desc:'ERP, EPM, CRM each export different formats, at different cadences, owned by different teams.',accent:A.brand},
    {label:'5+ Years of Schema Changes',icon:'⬡',desc:'Column renames, account code restructuring, entity merges. No one documented them.',accent:A.warn},
    {label:'Company-Specific Codes',icon:'⬡',desc:'GL account 4210 means revenue here. Nobody outside Finance knows that. AI doesn\'t either.',accent:A.violet},
    {label:'Political Sensitivity',icon:'⬡',desc:'Who can see entity-level P&L? Who sees headcount costs? Access control is a real constraint.',accent:A.red},
  ];
  const iconBgs=[A.brandS,A.warnS,A.violetS,A.redS];
  challenges.forEach((c,i)=>{
    const x=0.42+(i%2)*4.72, y=1.65+(Math.floor(i/2))*1.5;
    crd(s,x,y,4.56,1.35,{accent:c.accent});
    s.addShape(R,{x:x+0.14,y:y+0.1,w:1.1,h:1.1,fill:{color:iconBgs[i]},line:{color:c.accent,pt:0.5}});
    s.addText(c.icon,{x:x+0.14,y:y+0.1,w:1.1,h:1.1,fontSize:22,color:c.accent,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c.label,{x:x+1.38,y:y+0.1,w:3.0,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(c.desc,{x:x+1.38,y:y+0.4,w:3.0,h:0.8,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — 4.1 THE ACME DATA LANDSCAPE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.1 — Why Data Is the Hard Part','The ACME Data Landscape');
  ftr(s,'AI tools query marts only — never staging or raw',3);

  // Key insight banner
  s.addShape(R,{x:0.42,y:0.95,w:9.16,h:0.42,fill:{color:A.nav},line:{color:A.nav}});
  s.addShape(R,{x:0.42,y:0.95,w:0.06,h:0.42,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('Key Insight:  "AI tools query marts only — never staging or raw."',{x:0.6,y:0.95,w:8.9,h:0.42,fontSize:9.5,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});

  // 3 source system cards
  const sources=[
    {name:'ERP',sub:'SAP / NetSuite',color:A.brand,tables:['GL Entries (actuals)','Invoices (AR/AR aging)','Subscription Records (ARR)'],stg:['stg_erp__gl_entries','stg_erp__invoices','stg_erp__subscriptions']},
    {name:'EPM',sub:'Adaptive / Anaplan',color:A.teal,tables:['Budget & Plan data','Annual targets set by Finance','Variance baseline'],stg:['stg_epm__plan_line']},
    {name:'CRM',sub:'Salesforce',color:A.violet,tables:['Customer data','Bookings pipeline','Contract metadata'],stg:['stg_crm__accounts','stg_crm__opportunities']},
  ];
  sources.forEach((src,i)=>{
    const x=0.42+i*3.08;
    crd(s,x,1.5,2.95,2.18,{accent:src.color});
    s.addShape(R,{x:x+0.14,y:1.58,w:2.68,h:0.34,fill:{color:src.color},line:{color:src.color}});
    s.addText(`${src.name}  ·  ${src.sub}`,{x:x+0.14,y:1.58,w:2.68,h:0.34,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    src.tables.forEach((t,j)=>{
      s.addShape(R,{x:x+0.14,y:2.0+j*0.26,w:0.06,h:0.06,fill:{color:src.color},line:{color:src.color}});
      s.addText(t,{x:x+0.28,y:1.96+j*0.26,w:2.4,h:0.24,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
    // staging tables
    s.addShape(R,{x:x+0.14,y:2.84,w:2.68,h:0.72,fill:{color:A.bgS},line:{color:A.ruleH,pt:0.5}});
    s.addText('staging tables',{x:x+0.14,y:2.85,w:2.68,h:0.18,fontSize:6.5,bold:true,color:A.inkM,fontFace:F,align:'center',margin:0});
    src.stg.forEach((t,j)=>{
      s.addText(t,{x:x+0.18,y:3.04+j*0.17,w:2.6,h:0.16,fontSize:6.5,color:A.brand,fontFace:FM,margin:0});
    });
  });

  // Flow arrow to 5 mart tables
  s.addShape(R,{x:0.42,y:3.82,w:9.16,h:0.72,fill:{color:A.okS},line:{color:A.ok,pt:1}});
  s.addShape(R,{x:0.42,y:3.82,w:0.06,h:0.72,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('5 Mart Tables Power the Entire AI System:',{x:0.6,y:3.84,w:2.5,h:0.68,fontSize:8,bold:true,color:A.ok,fontFace:F,valign:'middle',margin:0,wrap:true});
  const marts=['mart_pl','fct_arr','mart_ar_aging','fct_revenue','fct_gl_entries'];
  marts.forEach((m,i)=>{
    s.addShape(R,{x:3.22+i*1.22,y:3.92,w:1.14,h:0.42,fill:{color:A.card},line:{color:A.ok,pt:0.75}});
    s.addText(m,{x:3.22+i*1.22,y:3.92,w:1.14,h:0.42,fontSize:7,bold:true,color:A.ok,fontFace:FM,align:'center',valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — MODULE 4.2 INTRO
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('4.2',{x:6.0,y:0.2,w:3.8,h:3.4,fontSize:160,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  s.addShape(R,{x:0.55,y:0.78,w:0.06,h:1.3,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('MODULE',{x:0.72,y:0.78,w:4,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Know Your Sources\nBefore You Build',{x:0.72,y:1.06,w:5.5,h:1.2,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('10 min  ·  4 slides',{x:0.72,y:2.4,w:3,h:0.28,fontSize:9.5,color:A.navM,fontFace:F,margin:0});

  const pts=['Where does each data type live?','What format and frequency are the extracts?','Who owns each pipeline?','What are you negotiating vs. what are you building?'];
  pts.forEach((p,i)=>{
    s.addShape(OV,{x:0.72,y:2.85+i*0.44,w:0.18,h:0.18,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(p,{x:0.98,y:2.82+i*0.44,w:6.0,h:0.32,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 4 — Data Foundation',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('4 / 20',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — SOURCE 1: ERP SYSTEM
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.2 — Source Systems Landscape','Source 1 — ERP System');
  ftr(s,'ERP is the authoritative source for all actuals',5);

  // Source badge
  s.addShape(R,{x:0.42,y:0.96,w:1.2,h:0.28,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('ERP SYSTEM',{x:0.42,y:0.96,w:1.2,h:0.28,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addText('SAP / NetSuite / Oracle — the system of record for financial actuals',{x:1.72,y:0.96,w:7.5,h:0.28,fontSize:9,color:A.inkD,fontFace:F,valign:'middle',margin:0});

  // Three data type cards
  const dtypes=[
    {title:'GL Entries',icon:'📒',tag:'ACTUALS',tagC:A.ok,desc:'Every journal entry posted to the general ledger. Account code, entity, amount, period, description.',key:'Chart of Accounts mapping is required before any AI can interpret these.',stg:'stg_erp__gl_entries'},
    {title:'Invoices',icon:'📄',tag:'AR',tagC:A.brand,desc:'Invoices issued to customers. Due date, amount, aging bucket, customer ID, payment status.',key:'Source of AR aging analysis. Links to CRM for customer segments.',stg:'stg_erp__invoices'},
    {title:'Subscription Records',icon:'🔄',tag:'ARR SOURCE',tagC:A.teal,desc:'Active subscription contracts. MRR, start/end dates, plan type, expansion/churn events.',key:'This is the canonical source for ARR calculations. Finance owns the definition.',stg:'stg_erp__subscriptions'},
  ];
  dtypes.forEach((d,i)=>{
    const x=0.42+i*3.08;
    crd(s,x,1.38,2.95,3.48,{accent:A.brand});
    s.addShape(R,{x:x+0.14,y:1.46,w:2.68,h:0.36,fill:{color:A.brandS},line:{color:A.ruleH,pt:0.5}});
    s.addText(d.tag,{x:x+0.14,y:1.46,w:0.75,h:0.36,fontSize:7,bold:true,color:A.brand,fontFace:F,valign:'middle',align:'center',margin:0});
    s.addText(d.title,{x:x+0.95,y:1.46,w:1.87,h:0.36,fontSize:10,bold:true,color:A.ink,fontFace:F,valign:'middle',margin:0});
    s.addText(d.desc,{x:x+0.14,y:1.9,w:2.72,h:1.1,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    s.addShape(R,{x:x+0.14,y:3.08,w:2.72,h:0.62,fill:{color:A.okS},line:{color:A.ok,pt:0.5}});
    s.addText('Key:',{x:x+0.18,y:3.1,w:0.38,h:0.18,fontSize:7,bold:true,color:A.ok,fontFace:F,margin:0});
    s.addText(d.key,{x:x+0.18,y:3.26,w:2.62,h:0.4,fontSize:7.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    s.addShape(R,{x:x+0.14,y:3.78,w:2.72,h:0.32,fill:{color:A.nav},line:{color:A.nav}});
    s.addText(d.stg,{x:x+0.14,y:3.78,w:2.72,h:0.32,fontSize:7.5,bold:true,color:A.ok,fontFace:FM,align:'center',valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — SOURCE 2: EPM SYSTEM
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.2 — Source Systems Landscape','Source 2 — EPM (Enterprise Performance Management)');
  ftr(s,'EPM is the source of truth for budget and plan — what variance RCA compares against',6);

  tag(s,0.42,0.96,'EPM SYSTEM',A.teal);
  s.addText('Adaptive Insights / Anaplan / Hyperion — where Finance sets annual targets',{x:1.72,y:0.96,w:7.5,h:0.28,fontSize:9,color:A.inkD,fontFace:F,valign:'middle',margin:0});

  // Main content — left: what EPM is, right: why it matters for AI
  crd(s,0.42,1.38,5.5,3.52,{accent:A.teal});
  s.addText('What Lives in EPM',{x:0.62,y:1.46,w:5.1,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const epmItems=[
    'Annual budget set by Finance leadership each October/November',
    'Monthly plan lines: Account, Entity, Scenario (Budget/Forecast/Actuals), Period, Amount',
    'Rolling forecasts updated monthly or quarterly',
    'Headcount plan (by department, by role)',
    'Capital expenditure plan (CAPEX schedules)',
    'Driver-based models (growth %, cost ratios)',
  ];
  epmItems.forEach((e,i)=>{
    s.addShape(R,{x:0.62,y:1.86+i*0.38,w:0.06,h:0.06,fill:{color:A.teal},line:{color:A.teal}});
    s.addText(e,{x:0.82,y:1.83+i*0.38,w:4.9,h:0.36,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
  });

  crd(s,6.12,1.38,3.46,1.68,{accent:A.ok,bg:A.okS});
  s.addText('ACME Staging Table',{x:6.3,y:1.46,w:3.1,h:0.22,fontSize:8,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('stg_epm__plan_line',{x:6.3,y:1.7,w:3.1,h:0.28,fontSize:12,bold:true,color:A.ink,fontFace:FM,margin:0});
  s.addText('Key columns:',{x:6.3,y:2.06,w:3.1,h:0.2,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,margin:0});
  const cols=['account_code  ·  entity_id','fiscal_year  ·  fiscal_period','scenario  ·  amount'];
  cols.forEach((c,i)=>{
    s.addText(c,{x:6.3,y:2.28+i*0.22,w:3.0,h:0.2,fontSize:7.5,color:A.inkS,fontFace:FM,margin:0});
  });

  crd(s,6.12,3.2,3.46,1.7,{accent:A.brand});
  s.addText('Why This Matters for AI',{x:6.3,y:3.28,w:3.1,h:0.24,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
  const whys=[
    'Variance RCA compares actuals vs. plan_line amounts',
    'AI explanations reference plan targets directly',
    'Without EPM data, there is no variance — only spend',
    'Finance defines the formula: actuals − budget',
  ];
  whys.forEach((w,i)=>{
    s.addShape(R,{x:6.3,y:3.6+i*0.3,w:0.06,h:0.06,fill:{color:A.brand},line:{color:A.brand}});
    s.addText(w,{x:6.46,y:3.57+i*0.3,w:2.9,h:0.28,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — THE ARCHITECT'S JOB: NEGOTIATE THE EXTRACT
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.2 — Source Systems Landscape',"The Architect's Job: Negotiate the Extract");
  ftr(s,"You don't control source systems — you negotiate the extract",7);

  // Central truth statement
  s.addShape(R,{x:0.42,y:0.95,w:9.16,h:0.6,fill:{color:A.nav},line:{color:A.nav}});
  s.addShape(R,{x:0.42,y:0.95,w:0.06,h:0.6,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('"You don\'t control these source systems. You negotiate the extract."',{x:0.62,y:0.95,w:8.9,h:0.6,fontSize:11,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});

  // 3-column: know / negotiate / escalate
  const cols2=[
    {title:'Know Before You Start',color:A.brand,items:[
      'What format does the system export? (CSV, JDBC, API)',
      'What is the refresh frequency? (nightly, weekly, real-time)',
      'Who owns the pipeline? (IT team, Finance team, vendor)',
      'What is the latency SLA? (T+1, T+2, weekly close)',
      'Are there any row-level filters on the export?',
    ]},
    {title:'Negotiate',color:A.teal,items:[
      'Full historical extract (minimum 2 years for AI trend analysis)',
      'Consistent column names across export versions',
      'Null handling agreement (empty = zero or truly absent?)',
      'Incremental vs. full load (impacts S3 cost and load time)',
      'Test file before going to production',
    ]},
    {title:'Escalate If Needed',color:A.warn,items:[
      'System owner refuses to provide raw GL entries (need journal level)',
      'Export only available weekly but AI needs daily refresh',
      'Account code mapping not available (critical blocker)',
      'Data governance not yet defined for new AI use case',
      'No staging environment available for testing extracts',
    ]},
  ];
  cols2.forEach((col,i)=>{
    const x=0.42+i*3.08;
    crd(s,x,1.72,2.95,3.15,{accent:col.color});
    s.addShape(R,{x:x+0.14,y:1.8,w:2.68,h:0.3,fill:{color:col.color},line:{color:col.color}});
    s.addText(col.title,{x:x+0.14,y:1.8,w:2.68,h:0.3,fontSize:8.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    col.items.forEach((item,j)=>{
      s.addShape(R,{x:x+0.18,y:2.2+j*0.48,w:0.06,h:0.06,fill:{color:col.color},line:{color:col.color}});
      s.addText(item,{x:x+0.32,y:2.16+j*0.48,w:2.52,h:0.46,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — MODULE 4.3 INTRO
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('4.3',{x:6.0,y:0.2,w:3.8,h:3.4,fontSize:160,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  s.addShape(R,{x:0.55,y:0.78,w:0.06,h:1.3,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('MODULE',{x:0.72,y:0.78,w:4,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Getting Data\nInto Redshift',{x:0.72,y:1.06,w:5.5,h:1.2,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('12 min  ·  5 slides',{x:0.72,y:2.4,w:3,h:0.28,fontSize:9.5,color:A.navM,fontFace:F,margin:0});
  const pts=[
    'S3 as the raw landing zone — why object storage first',
    'COPY command: the bridge from S3 to Redshift',
    'Redshift Serverless: RPU billing, auto-pause, cold start',
    'Three-layer storage design inside one database',
    'Cost reality at ACME scale',
  ];
  pts.forEach((p,i)=>{
    s.addShape(OV,{x:0.72,y:2.85+i*0.44,w:0.18,h:0.18,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(p,{x:0.98,y:2.82+i*0.44,w:6.0,h:0.32,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 4 — Data Foundation',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('8 / 20',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — THE INGESTION PATTERN
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.3 — Ingestion & Storage','The Ingestion Pattern: Source → S3 → Redshift');
  ftr(s,'Nightly batch, CSV files, S3 prefix per source system — simple and auditable',9);

  // Flow diagram: 4 boxes with arrows
  const steps=[
    {label:'Source Systems',sub:'ERP · EPM · CRM',color:A.brand,x:0.38},
    {label:'S3 Landing Zone',sub:'s3://acme-finance-raw/\n{source}/{date}/',color:A.teal,x:2.88},
    {label:'Redshift COPY',sub:'COPY command\nnightly schedule',color:A.warn,x:5.38},
    {label:'Staging Tables',sub:'stg_erp__*\nstg_epm__*',color:A.ok,x:7.88},
  ];
  steps.forEach((st,i)=>{
    crd(s,st.x,1.1,2.28,1.3,{accent:st.color});
    s.addShape(R,{x:st.x+0.14,y:1.18,w:2.01,h:0.3,fill:{color:st.color},line:{color:st.color}});
    s.addText(st.label,{x:st.x+0.14,y:1.18,w:2.01,h:0.3,fontSize:8.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.sub,{x:st.x+0.14,y:1.55,w:2.01,h:0.75,fontSize:8,color:A.inkS,fontFace:FM,align:'center',valign:'middle',margin:0,wrap:true});
    if(i<3) s.addText('→',{x:st.x+2.28,y:1.6,w:0.52,h:0.3,fontSize:16,bold:true,color:A.inkM,fontFace:F,align:'center',margin:0});
  });

  // ACME specifics table
  s.addText('ACME-Specific Configuration',{x:0.42,y:2.58,w:4,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  tbl(s,[
    ['Parameter','ACME Value'],
    ['Batch schedule','Nightly at 02:00 UTC'],
    ['File format','CSV with header row, UTF-8'],
    ['S3 bucket','s3://acme-finance-raw/'],
    ['S3 prefix pattern','/{source}/{YYYY-MM-DD}/'],
    ['Redshift target','analytics_dev_marts schema'],
    ['COPY IAM role','arn:aws:iam::…:role/RedshiftCopyRole'],
  ],[2.5,3.0],0.42,2.9,{rh:0.34});

  // S3 structure visual
  crd(s,6.22,2.58,3.36,2.68,{});
  s.addText('S3 Prefix Structure',{x:6.38,y:2.66,w:3.0,h:0.24,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
  const paths=[
    's3://acme-finance-raw/',
    '  erp/2026-05-08/',
    '    gl_entries.csv',
    '    invoices.csv',
    '  epm/2026-05-08/',
    '    plan_line.csv',
    '  crm/2026-05-08/',
    '    accounts.csv',
  ];
  paths.forEach((p,i)=>{
    const isFolder=p.includes('/') && !p.includes('.csv');
    s.addText(p,{x:6.38,y:2.96+i*0.27,w:3.0,h:0.24,fontSize:7.5,color:isFolder?A.brand:A.inkS,fontFace:FM,margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — REDSHIFT SERVERLESS
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.3 — Ingestion & Storage','Redshift Serverless: Why It Fits This Use Case');
  ftr(s,'RPU-based billing — if you are not querying, you are not paying',10);

  // KPIs row
  kpi(s,0.42,1.0,2.16,1.14,'Billing model','RPU-based','Redshift Processing Units / second',A.ok);
  kpi(s,2.72,1.0,2.16,1.14,'Auto-pause','30 min','idle timeout before pause',A.brand);
  kpi(s,5.02,1.0,2.16,1.14,'Cold start','~60 s','first query after pause',A.warn);
  kpi(s,7.32,1.0,2.16,1.14,'Est. cost','~$180','per month at ACME scale',A.teal);

  // ACME config
  crd(s,0.42,2.3,4.4,2.68,{accent:A.ok});
  s.addText('ACME Redshift Config',{x:0.62,y:2.38,w:4.0,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const cfgs=[
    ['Workgroup','acme-finance-dev'],
    ['Database','dev'],
    ['Schema','analytics_dev_marts'],
    ['Base RPU','8 RPU (scales up to 512)'],
    ['VPC','Private subnet, no public access'],
    ['Admin user','acme_admin'],
  ];
  cfgs.forEach(([k,v],i)=>{
    const bg=i%2===0?A.card:'f8fafc';
    s.addShape(R,{x:0.56,y:2.72+i*0.36,w:4.12,h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(k,{x:0.62,y:2.72+i*0.36+0.04,w:1.6,h:0.28,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,valign:'middle',margin:0});
    s.addText(v,{x:2.28,y:2.72+i*0.36+0.04,w:2.28,h:0.28,fontSize:8.5,color:A.inkS,fontFace:FM,valign:'middle',margin:0});
  });

  // Pro/con trade-off
  crd(s,5.02,2.3,4.56,2.68,{accent:A.warn});
  s.addText('Trade-off Consideration',{x:5.22,y:2.38,w:4.1,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const pros=[
    ['Pro','No cluster management — AWS handles scaling'],
    ['Pro','Pay per query second — low cost for dev/test'],
    ['Pro','Scales to 512 RPU for month-end close queries'],
    ['Con','60-second cold start on first daily query'],
    ['Con','Less predictable billing than provisioned clusters'],
    ['Con','Not ideal for sub-second latency requirements'],
  ];
  pros.forEach(([type,text],i)=>{
    const isPro=type==='Pro';
    s.addShape(R,{x:5.16,y:2.72+i*0.36,w:0.38,h:0.28,fill:{color:isPro?A.okS:A.redS},line:{color:isPro?A.ok:A.red,pt:0.5}});
    s.addText(type,{x:5.16,y:2.72+i*0.36,w:0.38,h:0.28,fontSize:7,bold:true,color:isPro?A.ok:A.red,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(text,{x:5.6,y:2.72+i*0.36+0.02,w:3.78,h:0.28,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — STORAGE DESIGN: THREE LAYERS
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.3 — Ingestion & Storage','Storage Design: Three Layers in One Database');
  ftr(s,'AI tools only hit the analytics/marts layer — never raw or staging',11);

  // Three layer cards — tall
  const layers=[
    {name:'RAW / STAGING',schema:'analytics_dev_staging',color:A.warn,purpose:'Direct output of COPY command. 1-to-1 with source CSV files. No business logic. Column names match source system.',tables:['stg_erp__gl_entries','stg_erp__invoices','stg_erp__subscriptions','stg_epm__plan_line','stg_crm__accounts'],who:'Accessed by: dbt only. Never by AI tools or analysts.',rule:'⛔ AI tools must NOT query this layer.'},
    {name:'INTERMEDIATE',schema:'analytics_dev_intermediate',color:A.brand,purpose:'Business logic applied. Joins across sources. Derived fields calculated. Named for what they represent, not where they came from.',tables:['int_revenue','int_arr_movements','int_ar_aging','int_pl_components'],who:'Accessed by: dbt only. Stepping stone to marts.',rule:'⚠  Not for direct consumption.'},
    {name:'MARTS / ANALYTICS',schema:'analytics_dev_marts',color:A.ok,purpose:'Final analytics-ready tables. Denormalized for query performance. AI tools, Redshift ML, and analysts query here only.',tables:['mart_pl','fct_arr','mart_ar_aging','fct_revenue','fct_gl_entries'],who:'Accessed by: AI agents, Bedrock tools, analysts, BI.',rule:'✅ This is the AI query layer.'},
  ];
  layers.forEach((l,i)=>{
    const x=0.42+i*3.08;
    crd(s,x,0.98,2.95,4.12,{accent:l.color});
    s.addShape(R,{x:x+0.14,y:1.06,w:2.68,h:0.34,fill:{color:l.color},line:{color:l.color}});
    s.addText(l.name,{x:x+0.14,y:1.06,w:2.68,h:0.34,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText('Schema:',{x:x+0.18,y:1.46,w:0.7,h:0.2,fontSize:7,bold:true,color:A.inkD,fontFace:F,margin:0});
    s.addText(l.schema,{x:x+0.18,y:1.64,w:2.6,h:0.2,fontSize:7,color:l.color,fontFace:FM,margin:0});
    s.addText(l.purpose,{x:x+0.14,y:1.9,w:2.72,h:0.96,fontSize:7.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    s.addShape(R,{x:x+0.14,y:2.94,w:2.72,h:0.7,fill:{color:A.bgS},line:{color:A.ruleH,pt:0.5}});
    s.addText('Tables:',{x:x+0.18,y:2.96,w:2.6,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    l.tables.forEach((t,j)=>{
      s.addText(t,{x:x+0.18,y:3.14+j*0.16,w:2.6,h:0.16,fontSize:6.5,color:l.color,fontFace:FM,margin:0});
    });
    const lBg=i===0?A.warnS:i===1?A.brandS:A.okS;
    s.addShape(R,{x:x+0.14,y:3.72,w:2.72,h:0.22,fill:{color:lBg},line:{color:l.color,pt:0.5}});
    s.addText(l.who,{x:x+0.18,y:3.73,w:2.62,h:0.2,fontSize:6.5,color:A.inkD,fontFace:F,valign:'middle',margin:0,wrap:true});
    s.addShape(R,{x:x+0.14,y:4.02,w:2.72,h:0.28,fill:{color:i===2?A.okS:i===1?A.warnS:A.redS},line:{color:i===2?A.ok:i===1?A.warn:A.red,pt:0.5}});
    s.addText(l.rule,{x:x+0.18,y:4.02,w:2.62,h:0.28,fontSize:7.5,bold:true,color:i===2?A.ok:i===1?A.warn:A.red,fontFace:F,valign:'middle',margin:0});
  });
  // Arrow flow
  s.addText('→',{x:3.37,y:2.7,w:0.16,h:0.3,fontSize:14,bold:true,color:A.inkM,fontFace:F,align:'center',margin:0});
  s.addText('→',{x:6.45,y:2.7,w:0.16,h:0.3,fontSize:14,bold:true,color:A.inkM,fontFace:F,align:'center',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — COST REALITY
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.3 — Ingestion & Storage','Cost Reality: Redshift Serverless at ACME Scale');
  ftr(s,'Cold start is the tradeoff for low cost — plan for it in your AI tool design',12);

  // Cost breakdown table
  s.addText('Monthly Cost Breakdown',{x:0.42,y:1.0,w:5,h:0.3,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
  tbl(s,[
    ['Component','Usage','Unit Cost','Monthly Est.'],
    ['Redshift compute','~30 query-hrs/mo (8 RPU avg)','$0.36/RPU-hr','~$86'],
    ['Redshift storage','~200 GB managed storage','$0.024/GB-mo','~$5'],
    ['S3 raw storage','~500 GB (5 years history)','$0.023/GB-mo','~$12'],
    ['S3 data transfer','~10 GB/night COPY load','$0.09/GB transfer','~$27'],
    ['dbt Cloud','Team tier','$50/seat/mo (1 seat)','$50'],
    ['TOTAL','','','~$180/mo'],
  ],[1.8,1.8,1.5,1.3],0.42,1.36,{rh:0.36});

  // Cold start advisory card
  crd(s,0.42,3.78,4.4,1.42,{accent:A.warn,bg:A.warnS});
  s.addText('Cold Start Advisory',{x:0.62,y:3.86,w:4.0,h:0.26,fontSize:10,bold:true,color:A.warn,fontFace:F,margin:0});
  const advs=[
    'After 30 min idle, Redshift pauses and charges stop',
    'First AI query after pause waits ~60s for warm-up',
    'Design AI tools to show a "loading" state during cold start',
    'Consider a warm-up Lambda ping at 07:45 AM UTC daily',
  ];
  advs.forEach((a,i)=>{
    s.addShape(R,{x:0.62,y:4.18+i*0.26,w:0.06,h:0.06,fill:{color:A.warn},line:{color:A.warn}});
    s.addText(a,{x:0.78,y:4.15+i*0.26,w:3.88,h:0.24,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // Scale card
  crd(s,5.02,3.78,4.56,1.42,{accent:A.ok,bg:A.okS});
  s.addText('Scaling for Month-End Close',{x:5.22,y:3.86,w:4.1,h:0.26,fontSize:10,bold:true,color:A.ok,fontFace:F,margin:0});
  const scaleItems=[
    'Month-end: Redshift auto-scales to 128 RPU if queues',
    'Max RPU cap set at 512 — prevents runaway cost',
    'Heavy dbt runs in off-peak hours (Sunday 03:00 UTC)',
    'AI tool queries via read-only user, separate from dbt',
  ];
  scaleItems.forEach((a,i)=>{
    s.addShape(R,{x:5.22,y:4.18+i*0.26,w:0.06,h:0.06,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(a,{x:5.38,y:4.15+i*0.26,w:4.04,h:0.24,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — MODULE 4.4 INTRO
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('4.4',{x:6.0,y:0.2,w:3.8,h:3.4,fontSize:160,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  s.addShape(R,{x:0.55,y:0.78,w:0.06,h:1.3,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('MODULE',{x:0.72,y:0.78,w:4,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('dbt: The Layer That\nMakes AI Trustworthy',{x:0.72,y:1.06,w:5.5,h:1.2,fontSize:24,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('12 min  ·  5 slides',{x:0.72,y:2.4,w:3,h:0.28,fontSize:9.5,color:A.navM,fontFace:F,margin:0});
  const pts=[
    'The three-layer model map: staging → intermediate → marts',
    'What the staging layer does (and doesn\'t do)',
    'Business logic lives in intermediate, not staging',
    'Mart tables: what the AI actually queries',
    'The cardinal rule: if AI queries staging, it\'s a design problem',
  ];
  pts.forEach((p,i)=>{
    s.addShape(OV,{x:0.72,y:2.85+i*0.44,w:0.18,h:0.18,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(p,{x:0.98,y:2.82+i*0.44,w:6.5,h:0.36,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0,wrap:true});
  });
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 4 — Data Foundation',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('13 / 20',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — THE DBT MODEL MAP
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.4 — Transform with dbt','The dbt Model Map: Three Layers');
  ftr(s,'Staging cleans, intermediate applies logic, marts serve AI and analysts',14);

  // Three-layer flow with ACME table names
  const layers=[
    {
      name:'STAGING',sub:'Raw cleaned · 1:1 with source',color:A.warn,y:1.04,
      tables:['stg_erp__gl_entries','stg_erp__invoices','stg_erp__subscriptions','stg_epm__plan_line'],
      rule:'Clean · Rename · Cast types\nNo business logic'
    },
    {
      name:'INTERMEDIATE',sub:'Business logic applied',color:A.brand,y:2.42,
      tables:['int_revenue','int_arr_movements','int_ar_aging','int_pl_components'],
      rule:'Join sources · Apply rules\nCalculate derived fields'
    },
    {
      name:'MARTS',sub:'Analytics-ready · AI queries here',color:A.ok,y:3.8,
      tables:['mart_pl','fct_arr','mart_ar_aging','fct_revenue','fct_gl_entries'],
      rule:'Denormalized · Performant\nAI tools query only this layer'
    },
  ];
  layers.forEach((l,i)=>{
    // Layer header bar
    s.addShape(R,{x:0.42,y:l.y,w:6.3,h:0.34,fill:{color:l.color},line:{color:l.color}});
    s.addText(l.name,{x:0.52,y:l.y,w:2,h:0.34,fontSize:9,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    s.addText(l.sub,{x:2.6,y:l.y,w:4,h:0.34,fontSize:8,color:l.color==='c4671b'?'f5ddc0':A.navI,fontFace:F,valign:'middle',margin:0});
    // Table chips
    const chipBg=i===0?A.warnS:i===1?A.brandS:A.okS;
    l.tables.forEach((t,j)=>{
      const cx=0.52+j*1.54;
      s.addShape(R,{x:cx,y:l.y+0.4,w:1.46,h:0.34,fill:{color:chipBg},line:{color:l.color,pt:0.75}});
      s.addText(t,{x:cx,y:l.y+0.4,w:1.46,h:0.34,fontSize:6.5,color:l.color,fontFace:FM,align:'center',valign:'middle',margin:0});
    });
    // Arrow between layers
    if(i<2) s.addText('↓',{x:3.0,y:l.y+0.82,w:0.5,h:0.28,fontSize:14,bold:true,color:A.inkM,fontFace:F,align:'center',margin:0});
    // Rule card
    crd(s,6.9,l.y,2.68,0.88,{accent:l.color});
    s.addText(l.rule,{x:7.06,y:l.y+0.08,w:2.38,h:0.76,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
  });

  // Bottom rule
  s.addShape(R,{x:0.42,y:4.74,w:9.16,h:0.46,fill:{color:A.nav},line:{color:A.nav}});
  s.addShape(R,{x:0.42,y:4.74,w:0.06,h:0.46,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('Rule: "If your AI tool queries staging, you have a design problem."',{x:0.62,y:4.74,w:8.9,h:0.46,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — STAGING LAYER
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.4 — Transform with dbt','Staging Layer: Clean, Rename, Cast');
  ftr(s,'Staging is the cleaning station — no business logic crosses this boundary',15);

  s.addShape(R,{x:0.42,y:0.95,w:9.16,h:0.38,fill:{color:A.warnS},line:{color:A.warn,pt:1}});
  s.addShape(R,{x:0.42,y:0.95,w:0.06,h:0.38,fill:{color:A.warn},line:{color:A.warn}});
  s.addText('Purpose: Produce clean, consistently named columns from raw source files. One model per source table.',{x:0.62,y:0.95,w:8.9,h:0.38,fontSize:9,color:A.inkS,fontFace:F,valign:'middle',margin:0});

  // 4 staging model cards
  const mods=[
    {name:'stg_erp__gl_entries',color:A.warn,cols:['gl_entry_id','account_code','entity_id','fiscal_year','fiscal_period','amount_usd','description','posted_at'],transforms:['Rename: acct_cd → account_code','Cast: posted_date to DATE','Filter: exclude voided entries','Add: _source = \'erp\'']},
    {name:'stg_erp__invoices',color:A.warn,cols:['invoice_id','customer_id','invoice_date','due_date','amount_usd','payment_status','aging_days'],transforms:['Rename: inv_id → invoice_id','Derive: aging_days = today - due_date','Standardize: status codes','Cast: amounts to NUMERIC(15,2)']},
    {name:'stg_erp__subscriptions',color:A.warn,cols:['subscription_id','customer_id','plan_type','mrr_usd','start_date','end_date','movement_type'],transforms:['Parse: movement_type from event_code','Derive: is_active flag','Standardize: plan tier names','Cast: mrr_usd to NUMERIC(15,2)']},
    {name:'stg_epm__plan_line',color:A.teal,cols:['plan_line_id','account_code','entity_id','fiscal_year','fiscal_period','scenario','amount_usd'],transforms:['Rename: scen → scenario','Cast: fiscal_period to INT','Filter: scenario IN (Budget, Forecast)','Standardize: account_code format']},
  ];
  mods.forEach((m,i)=>{
    const x=0.42+(i%2)*4.72, y=1.48+(Math.floor(i/2))*1.84;
    crd(s,x,y,4.56,1.72,{accent:m.color});
    s.addShape(R,{x:x+0.14,y:y+0.08,w:4.28,h:0.3,fill:{color:m.color},line:{color:m.color}});
    s.addText(m.name,{x:x+0.14,y:y+0.08,w:4.28,h:0.3,fontSize:8.5,bold:true,color:A.W,fontFace:FM,align:'center',valign:'middle',margin:0});
    // columns
    s.addShape(R,{x:x+0.14,y:y+0.44,w:2.04,h:1.12,fill:{color:A.bgS},line:{color:A.ruleH,pt:0.5}});
    s.addText('Key Columns',{x:x+0.18,y:y+0.46,w:1.96,h:0.2,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    m.cols.slice(0,6).forEach((c,j)=>{
      s.addText(c,{x:x+0.18,y:y+0.66+j*0.15,w:1.96,h:0.15,fontSize:6,color:A.inkS,fontFace:FM,margin:0});
    });
    // transforms
    s.addShape(R,{x:x+2.26,y:y+0.44,w:2.16,h:1.12,fill:{color:A.card},line:{color:A.rule,pt:0.5}});
    s.addText('Transforms Applied',{x:x+2.3,y:y+0.46,w:2.08,h:0.2,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    m.transforms.forEach((t,j)=>{
      s.addText(t,{x:x+2.3,y:y+0.66+j*0.22,w:2.08,h:0.2,fontSize:6.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — INTERMEDIATE LAYER
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.4 — Transform with dbt','Intermediate Layer: Business Rules Applied');
  ftr(s,'Business logic lives here — joins, derivations, and calculated fields',16);

  s.addShape(R,{x:0.42,y:0.95,w:9.16,h:0.38,fill:{color:A.brandS},line:{color:A.brand,pt:1}});
  s.addShape(R,{x:0.42,y:0.95,w:0.06,h:0.38,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('Purpose: Apply Finance\'s business rules, join across sources, and calculate derived fields. Only dbt accesses this layer.',{x:0.62,y:0.95,w:8.9,h:0.38,fontSize:9,color:A.inkS,fontFace:F,valign:'middle',margin:0});

  const imods=[
    {
      name:'int_revenue',color:A.brand,
      sources:['stg_erp__gl_entries','stg_erp__invoices'],
      logic:['Filter GL to revenue accounts (4xxx range)','Join invoices to confirm recognition','Calculate recognized vs. deferred split','Apply entity-level allocation rules'],
      output:['revenue_id','entity_id','period','recognized_usd','deferred_usd','recognition_type']
    },
    {
      name:'int_arr_movements',color:A.brand,
      sources:['stg_erp__subscriptions'],
      logic:['Classify movement type: new/expansion/churn/contraction','Calculate MRR delta per period','Derive ARR = MRR × 12','Flag reactivations vs. new logos'],
      output:['movement_id','customer_id','period','movement_type','arr_delta_usd','ending_arr_usd']
    },
    {
      name:'int_ar_aging',color:A.brand,
      sources:['stg_erp__invoices'],
      logic:['Calculate days outstanding per invoice','Assign aging bucket: current/30/60/90/90+','Flag disputed invoices','Calculate DSO at customer segment level'],
      output:['invoice_id','customer_segment','aging_bucket','amount_usd','days_outstanding']
    },
    {
      name:'int_pl_components',color:A.brand,
      sources:['stg_erp__gl_entries','stg_epm__plan_line'],
      logic:['Join actuals to plan by account+entity+period','Calculate variance = actuals − budget','Classify: favorable vs. unfavorable variance','Apply P&L hierarchy (Revenue → EBITDA)'],
      output:['pl_line_id','account_code','pl_category','actuals_usd','budget_usd','variance_usd','variance_pct']
    },
  ];
  imods.forEach((m,i)=>{
    const x=0.42+(i%2)*4.72, y=1.46+(Math.floor(i/2))*1.86;
    crd(s,x,y,4.56,1.74,{accent:m.color});
    s.addShape(R,{x:x+0.14,y:y+0.08,w:4.28,h:0.3,fill:{color:m.color},line:{color:m.color}});
    s.addText(m.name,{x:x+0.14,y:y+0.08,w:4.28,h:0.3,fontSize:9,bold:true,color:A.W,fontFace:FM,align:'center',valign:'middle',margin:0});
    // Sources
    s.addText('Sources:',{x:x+0.18,y:y+0.44,w:1.0,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    m.sources.forEach((src,j)=>{
      s.addText(`· ${src}`,{x:x+0.18,y:y+0.6+j*0.16,w:2.0,h:0.15,fontSize:6.5,color:A.warn,fontFace:FM,margin:0});
    });
    // Business logic
    s.addText('Business Logic:',{x:x+2.3,y:y+0.44,w:2.0,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    m.logic.forEach((l,j)=>{
      s.addText(`· ${l}`,{x:x+2.3,y:y+0.6+j*0.2,w:2.1,h:0.19,fontSize:6,color:A.inkS,fontFace:F,margin:0,wrap:true});
    });
    // Output
    s.addShape(R,{x:x+0.14,y:y+1.38,w:4.28,h:0.28,fill:{color:A.nav},line:{color:A.nav}});
    s.addText('Output: '+m.output.join(' · '),{x:x+0.18,y:y+1.38,w:4.18,h:0.28,fontSize:6.5,color:A.navI,fontFace:FM,valign:'middle',margin:0,wrap:true});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 17 — MARTS LAYER
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.4 — Transform with dbt','Marts Layer: What AI Queries');
  ftr(s,'If your AI tool queries staging, you have a design problem',17);

  s.addShape(R,{x:0.42,y:0.95,w:9.16,h:0.38,fill:{color:A.okS},line:{color:A.ok,pt:1}});
  s.addShape(R,{x:0.42,y:0.95,w:0.06,h:0.38,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('Rule: AI tools, Bedrock Lambda functions, and analysts query marts only. Denormalized for performance.',{x:0.62,y:0.95,w:8.9,h:0.38,fontSize:9,bold:true,color:A.ok,fontFace:F,valign:'middle',margin:0});

  const marts=[
    {name:'mart_pl',color:A.ok,from:'int_pl_components',aiUse:'P&L variance RCA, trend queries',dims:'entity_id, fiscal_year, fiscal_quarter, pl_category',metrics:'actuals_usd, budget_usd, variance_usd, variance_pct, prior_year_usd'},
    {name:'fct_arr',color:A.teal,from:'int_arr_movements',aiUse:'ARR waterfall, churn analysis',dims:'customer_id, period, movement_type, plan_type',metrics:'arr_delta_usd, ending_arr_usd, new_logo_arr, churn_arr'},
    {name:'mart_ar_aging',color:A.brand,from:'int_ar_aging',aiUse:'AR aging queries, DSO monitoring',dims:'customer_id, customer_segment, aging_bucket',metrics:'amount_usd, invoice_count, dso_days, overdue_pct'},
    {name:'fct_revenue',color:A.violet,from:'int_revenue',aiUse:'Revenue recognition queries',dims:'entity_id, product_line, period, recognition_type',metrics:'recognized_usd, deferred_usd, total_billed_usd'},
    {name:'fct_gl_entries',color:A.warn,from:'stg_erp__gl_entries',aiUse:'Ad hoc GL queries by AI agent',dims:'account_code, entity_id, fiscal_period',metrics:'amount_usd, entry_count, description'},
  ];
  marts.forEach((m,i)=>{
    const x=0.42+(i%3)*3.08, y=1.46+(Math.floor(i/3))*1.88;
    const w=i>=3?4.64:2.95;
    if(i===3||i===4){
      // Second row: two wider cards
      const x2=0.42+(i-3)*4.76;
      crd(s,x2,3.44,4.56,1.72,{accent:m.color});
      s.addShape(R,{x:x2+0.14,y:3.52,w:4.28,h:0.28,fill:{color:m.color},line:{color:m.color}});
      s.addText(m.name,{x:x2+0.14,y:3.52,w:2.2,h:0.28,fontSize:8.5,bold:true,color:A.W,fontFace:FM,valign:'middle',margin:0});
      s.addText(`← ${m.from}`,{x:x2+2.4,y:3.52,w:2.02,h:0.28,fontSize:7,color:'ccddff',fontFace:FM,valign:'middle',align:'right',margin:0});
      s.addText('AI Use Case:',{x:x2+0.18,y:3.86,w:1.0,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(m.aiUse,{x:x2+0.18,y:4.02,w:4.18,h:0.22,fontSize:7.5,color:m.color,fontFace:F,margin:0,wrap:true});
      s.addText('Key Dimensions:',{x:x2+0.18,y:4.28,w:2.1,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(m.dims,{x:x2+0.18,y:4.44,w:4.18,h:0.22,fontSize:6.5,color:A.inkS,fontFace:FM,margin:0,wrap:true});
      s.addText('Metrics:',{x:x2+0.18,y:4.7,w:4.18,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(m.metrics,{x:x2+0.18,y:4.86,w:4.18,h:0.22,fontSize:6.5,color:A.inkS,fontFace:FM,margin:0,wrap:true});
    } else {
      crd(s,x,1.46,2.95,1.84,{accent:m.color});
      s.addShape(R,{x:x+0.14,y:1.54,w:2.68,h:0.28,fill:{color:m.color},line:{color:m.color}});
      s.addText(m.name,{x:x+0.14,y:1.54,w:2.68,h:0.28,fontSize:8.5,bold:true,color:A.W,fontFace:FM,align:'center',valign:'middle',margin:0});
      s.addText(`← ${m.from}`,{x:x+0.14,y:1.86,w:2.68,h:0.18,fontSize:6,color:A.inkM,fontFace:FM,align:'center',margin:0});
      s.addText('AI Use:',{x:x+0.18,y:2.1,w:0.6,h:0.18,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(m.aiUse,{x:x+0.18,y:2.26,w:2.62,h:0.26,fontSize:7.5,color:m.color,fontFace:F,margin:0,wrap:true});
      s.addText('Dims:',{x:x+0.18,y:2.56,w:0.5,h:0.16,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(m.dims,{x:x+0.18,y:2.7,w:2.62,h:0.2,fontSize:6,color:A.inkS,fontFace:FM,margin:0,wrap:true});
      s.addText('Metrics:',{x:x+0.18,y:2.94,w:0.6,h:0.16,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(m.metrics,{x:x+0.18,y:3.08,w:2.62,h:0.18,fontSize:6,color:A.inkS,fontFace:FM,margin:0,wrap:true});
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 18 — MODULE 4.5 INTRO
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('4.5',{x:6.0,y:0.2,w:3.8,h:3.4,fontSize:160,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  s.addShape(R,{x:0.55,y:0.78,w:0.06,h:1.3,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('MODULE',{x:0.72,y:0.78,w:4,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Is Your Data\nReady for AI?',{x:0.72,y:1.06,w:5.2,h:1.2,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('8 min  ·  3 slides',{x:0.72,y:2.4,w:3,h:0.28,fontSize:9.5,color:A.navM,fontFace:F,margin:0});
  const pts=[
    'A practical pre-flight checklist for solution architects',
    '10 must-pass criteria before wiring in any AI tool',
    'Performance, quality, governance, and access controls',
    'What to fix first when you fail a checklist item',
  ];
  pts.forEach((p,i)=>{
    s.addShape(OV,{x:0.72,y:2.85+i*0.44,w:0.18,h:0.18,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(p,{x:0.98,y:2.82+i*0.44,w:6.0,h:0.32,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 4 — Data Foundation',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('18 / 20',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 19 — AI READINESS CHECKLIST
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 4','Module 4.5 — AI Readiness Assessment','AI Readiness Checklist: 10 Must-Pass Criteria');
  ftr(s,'Run this checklist before wiring any AI tool into your data layer',19);

  const items=[
    {check:'Marts exist and are tested',detail:'dbt tests passing: not_null, unique, accepted_values on all key columns.',cat:'Quality',catC:A.ok},
    {check:'Column names are self-documenting',detail:'fiscal_year not fy, entity_id not eid. AI uses column names as context.',cat:'Quality',catC:A.ok},
    {check:'No NULLs in primary dimensions',detail:'account_code, entity_id, fiscal_period must be non-null in all mart tables.',cat:'Quality',catC:A.ok},
    {check:'Refresh schedule documented',detail:'AI tools must know data freshness. T+1 is minimum for daily variance alerts.',cat:'Pipeline',catC:A.brand},
    {check:'Row counts validated against source',detail:'ERP exports 50,000 GL entries → stg_erp__gl_entries has 50,000 rows. Reconcile daily.',cat:'Pipeline',catC:A.brand},
    {check:'Historical data available (min 2 years)',detail:'Trend analysis requires 8+ quarters. LLMs cannot extrapolate what is not in the data.',cat:'Coverage',catC:A.teal},
    {check:'Variance formula defined and agreed',detail:'Finance must sign off: variance = actuals − budget (not budget − actuals).',cat:'Governance',catC:A.violet},
    {check:'Access controls on staging',detail:'AI service role has SELECT on marts schema only. Staging is inaccessible.',cat:'Security',catC:A.warn},
    {check:'Redshift query performance <3s for marts',detail:'Run EXPLAIN ANALYZE on top 10 AI tool queries. Add SORTKEY/DISTKEY if needed.',cat:'Performance',catC:A.orange},
    {check:'Schema change process defined',detail:'When EPM adds a column, who updates dbt? Who tests? Who notifies AI tool owners?',cat:'Governance',catC:A.violet},
  ];
  const catCols={Quality:A.ok,Pipeline:A.brand,Coverage:A.teal,Governance:A.violet,Security:A.warn,Performance:A.orange};
  items.forEach((item,i)=>{
    const col=i<5?0:1, row=i<5?i:i-5;
    const x=0.42+col*4.76, y=1.04+row*0.82;
    const cc=catCols[item.cat]||A.ok;
    crd(s,x,y,4.56,0.72,{accent:cc});
    // Checkbox
    s.addShape(R,{x:x+0.14,y:y+0.14,w:0.28,h:0.28,fill:{color:A.okS},line:{color:A.ok,pt:1}});
    s.addText('☐',{x:x+0.14,y:y+0.14,w:0.28,h:0.28,fontSize:9,color:A.ok,fontFace:F,align:'center',valign:'middle',margin:0});
    // Category badge
    const bw=item.cat.length*0.075+0.2;
    s.addShape(R,{x:x+4.56-bw-0.1,y:y+0.14,w:bw,h:0.2,fill:{color:cc},line:{color:cc}});
    s.addText(item.cat.toUpperCase(),{x:x+4.56-bw-0.1,y:y+0.14,w:bw,h:0.2,fontSize:6,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    // Check text
    s.addText(item.check,{x:x+0.52,y:y+0.1,w:3.5,h:0.26,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(item.detail,{x:x+0.52,y:y+0.38,w:3.88,h:0.28,fontSize:7,color:A.inkD,fontFace:F,margin:0,wrap:true});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 20 — SECTION 4 RECAP + NEXT
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('Section 4 — Data Foundation',{x:0.42,y:0.1,w:8,h:0.44,fontSize:20,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.52,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});

  const checks=[
    'Finance data is messy by nature — 3+ sources, schema drift, political access constraints. Plan for this.',
    'You negotiate the extract — understand format, frequency, and ownership before building pipelines.',
    'S3 → Redshift COPY is the ingestion pattern. Nightly batch, per-source prefixes, auditable.',
    'Redshift Serverless costs ~$180/month at ACME scale. Cold start (~60s) is the key trade-off.',
    'dbt three-layer model: staging cleans, intermediate applies business logic, marts serve AI.',
    'Staging layer: 1-to-1 with source, rename/cast/filter only. No business logic crosses this boundary.',
    'Intermediate layer: joins across sources, Finance\'s rules applied, derived fields calculated.',
    'Marts layer: denormalized, performant, access-controlled. The only layer AI tools should query.',
    'Run the 10-item AI Readiness Checklist before connecting any agent or Lambda to your data layer.',
  ];
  checks.forEach((c,i)=>{
    s.addShape(OV,{x:0.42,y:0.82+i*0.49,w:0.22,h:0.22,fill:{color:A.ok},line:{color:A.ok}});
    s.addText('✓',{x:0.42,y:0.82+i*0.49,w:0.22,h:0.22,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c,{x:0.76,y:0.82+i*0.49,w:8.9,h:0.42,fontSize:8.5,color:A.navI,fontFace:F,valign:'middle',margin:0,wrap:true});
  });

  // Next section CTA
  s.addText('Next:  Section 5 — Reference Architecture  →',{x:0.42,y:5.0,w:5.5,h:0.24,fontSize:9.5,bold:true,color:A.ok,fontFace:F,underline:true,margin:0});
  s.addText('← Table of Contents',{x:7.5,y:5.0,w:2.1,h:0.24,fontSize:9.5,color:A.navM,fontFace:F,underline:true,align:'right',margin:0});

  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 4 Complete — Data Foundation',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('20 / 20',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ── SAVE ──────────────────────────────────────────────────────────────────────
pres.writeFile({fileName:OUT}).then(()=>{
  console.log(`✅  Saved: ${OUT}`);
}).catch(err=>{
  console.error('❌  Error:', err.message);
  process.exit(1);
});
