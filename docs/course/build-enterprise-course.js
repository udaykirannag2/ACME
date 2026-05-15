"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

// Atlas Design Tokens — no # prefix for pptxgenjs
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
const SW=10, SH=5.625, TOT=41;
const OUT=path.join(__dirname,'AI-Finance-Transformation-Course.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='AI Finance Transformation: Strategy to Working Agents on AWS';
const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;
const sh =()=>({type:'outer',blur:8, offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

// ── HELPERS ───────────────────────────────────────────────────────────────
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
function bdg(s,x,y,text,bg,fg='FFFFFF'){
  const bw=Math.max(text.length*0.068+0.2,0.55);
  s.addShape(R,{x,y,w:bw,h:0.22,fill:{color:bg},line:{color:bg}});
  s.addText(text,{x,y,w:bw,h:0.22,fontSize:7,bold:true,color:fg,fontFace:F,align:'center',valign:'middle',margin:0});
  return bw;
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
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0});
      cx+=cw;
    });
  });
}
function divSlide(s,num,title,color,mods,slideNums,slideN){
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color},line:{color}});
  s.addText(num,{x:5.8,y:0.2,w:4.0,h:3.8,fontSize:190,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  s.addShape(R,{x:0.55,y:0.75,w:0.06,h:1.5,fill:{color},line:{color}});
  s.addText('SECTION',{x:0.72,y:0.75,w:3,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText(title,{x:0.72,y:1.0,w:5.0,h:1.3,fontSize:28,bold:true,color:A.W,fontFace:F,margin:0});
  mods.forEach((m,i)=>{
    const col=i<5?0:1, row=i<5?i:i-5;
    s.addText([{text:`›  ${m}`,options:{hyperlink:{slide:slideNums[i]}}}],{x:0.72+col*2.6,y:2.55+row*0.43,w:2.45,h:0.36,fontSize:8.5,color:A.navI,fontFace:F,margin:0});
  });
  s.addText([{text:'← Back to Contents',options:{hyperlink:{slide:2}}}],{x:0.55,y:4.98,w:2.5,h:0.28,fontSize:9,color,fontFace:F,underline:true,margin:0});
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText(`Section ${num}`,{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText(`${slideN} / ${TOT}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}
function recapSlide(s,title,checks,color,nextSlide,nextLabel,slideN){
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color},line:{color}});
  s.addText(`${title} — Recap`,{x:0.42,y:0.1,w:8,h:0.44,fontSize:20,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.52,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
  checks.forEach((c,i)=>{
    s.addShape(OV,{x:0.42,y:1.02+i*0.52,w:0.26,h:0.26,fill:{color},line:{color}});
    s.addText('✓',{x:0.42,y:1.02+i*0.52,w:0.26,h:0.26,fontSize:8.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c,{x:0.8,y:1.02+i*0.52,w:8.7,h:0.34,fontSize:9.5,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });
  s.addText([{text:`${nextLabel} →`,options:{hyperlink:{slide:nextSlide}}}],{x:0.42,y:4.98,w:5.5,h:0.26,fontSize:9.5,color,fontFace:F,underline:true,margin:0});
  s.addText([{text:'← Contents',options:{hyperlink:{slide:2}}}],{x:7.5,y:4.98,w:2.1,h:0.26,fontSize:9.5,color:A.navM,fontFace:F,underline:true,align:'right',margin:0});
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText(`${title} Complete`,{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText(`${slideN} / ${TOT}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.06,fill:{color:A.brand},line:{color:A.brand}});
  // Compass mark (SVG geometry via shapes)
  s.addShape(R,{x:7.5,y:0.55,w:2.2,h:2.2,fill:{color:'0d1e3a'},line:{color:'172a4a'},shadow:shL()});
  s.addShape(OV,{x:7.72,y:0.77,w:1.76,h:1.76,fill:{color:'transparent'},line:{color:A.brand,pt:2}});
  s.addShape(OV,{x:8.12,y:1.17,w:0.96,h:0.96,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('◈',{x:8.12,y:1.17,w:0.96,h:0.96,fontSize:20,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(OV,{x:8.52,y:0.88,w:0.16,h:0.16,fill:{color:A.teal},line:{color:A.teal}});
  // Headline
  s.addText('AI Finance',{x:0.55,y:0.85,w:6.8,h:0.72,fontSize:42,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('Transformation',{x:0.55,y:1.52,w:6.8,h:0.72,fontSize:42,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('Strategy to Working Agents on AWS',{x:0.55,y:2.28,w:6.8,h:0.42,fontSize:18,color:A.navI,fontFace:F,margin:0});
  s.addShape(R,{x:0.55,y:2.76,w:5.2,h:0.03,fill:{color:A.brand},line:{color:A.brand}});
  // Pill badges
  const pills=[['SECTIONS 1–3',A.brand],['41 SLIDES',A.teal],['ENTERPRISE READY',A.ok]];
  let px=0.55;
  pills.forEach(([t,c])=>{
    const pw=Math.max(t.length*0.075+0.3,1.2);
    s.addShape(R,{x:px,y:2.88,w:pw,h:0.3,fill:{color:c},line:{color:c}});
    s.addText(t,{x:px,y:2.88,w:pw,h:0.3,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    px+=pw+0.12;
  });
  s.addText('Solution Architect Track  ·  v1.0  ·  May 2026',{x:0.55,y:3.3,w:5.5,h:0.28,fontSize:9,color:A.navM,fontFace:F,margin:0});
  s.addText([{text:'▶  View Table of Contents',options:{hyperlink:{slide:2}}}],{x:0.55,y:4.55,w:3.2,h:0.3,fontSize:10,color:A.brand,fontFace:F,underline:true,margin:0});
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('AI Finance Transformation: Strategy to Working Agents on AWS',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('1 / 41',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 2 — TABLE OF CONTENTS
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,null,null,'Table of Contents');
  ftr(s,'Click any section header or module title to navigate directly',2);
  const secs=[
    {num:'01',title:'The Finance Transformation\nImperative',color:A.brand,slide:3,
     mods:['1.1  CFO Pain Points','1.2  Cost of Inaction','1.3  Why Now?','1.4  AI Capabilities','1.5  Maturity Model','1.6  ACME Today','1.7  Architecture','1.8  Phase Roadmap'],
     slides:[4,5,6,7,8,9,10,11]},
    {num:'02',title:'The Finance Domain',color:A.teal,slide:13,
     mods:['2.1  Finance Organization','2.2  Financial Statements','2.3  P&L Metrics','2.4  SaaS Metrics','2.5  FP&A Calendar','2.6  Data Vocabulary','2.7  dbt Model Map','2.8  P&L Visual','2.9  ARR Waterfall'],
     slides:[14,15,16,17,18,19,20,21,22]},
    {num:'03',title:'Transformation Strategy',color:A.violet,slide:27,
     mods:['3.1  Use Cases','3.2  NL Querying','3.3  Variance RCA','3.4  What-If Sim','3.5  Business Case','3.6  Cost Model','3.7  Architecture','3.8  Bedrock+Lambda','3.9  AgentCore'],
     slides:[28,29,30,31,32,33,34,35,36]},
  ];
  const colX=[0.32,3.54,6.76];
  const cw=3.08;
  secs.forEach((sec,i)=>{
    const x=colX[i];
    crd(s,x,1.02,cw,4.06,{shadow:shL()});
    s.addShape(R,{x,y:1.02,w:cw,h:0.5,fill:{color:sec.color},line:{color:sec.color}});
    s.addText([{text:`${sec.num}  ${sec.title}`,options:{hyperlink:{slide:sec.slide}}}],{x:x+0.12,y:1.02,w:cw-0.2,h:0.5,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:x+0.1,y:1.52,w:cw-0.2,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    sec.mods.forEach((m,mi)=>{
      const my=1.56+mi*0.38;
      if(my>4.85) return;
      s.addText([{text:m,options:{hyperlink:{slide:sec.slides[mi]}}}],{x:x+0.12,y:my,w:cw-0.24,h:0.32,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
    });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 3 — SECTION 1 DIVIDER
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  divSlide(s,'01','The Finance\nTransformation\nImperative',A.brand,
    ['1.1  CFO Pain Points','1.2  Cost of Inaction','1.3  Why Now?','1.4  AI Capabilities',
     '1.5  Maturity Model','1.6  ACME Today','1.7  Architecture','1.8  Phase Roadmap'],
    [4,5,6,7,8,9,10,11],3);
}

// ══════════════════════════════════════════════════════
// SLIDE 4 — CFO PAIN POINTS (Module 1.1)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.1','Five CFO Pain Points This System Solves');
  ftr(s,'Source: Deloitte CFO Survey 2024 + ACME Finance close-process analysis',4);
  const pains=[
    {n:'01',color:A.red,   icon:'⏱',title:'Close Takes Too Long',    body:'Month-end close averages 6.4 days. FP&A spends 3 days on data wrangling — not analysis.'},
    {n:'02',color:A.warn,  icon:'🔍',title:'Variance Lag',            body:'Root-cause analysis takes 2–3 days per analyst. Board needs answers in hours.'},
    {n:'03',color:A.brand, icon:'📊',title:'Forecast Drift',          body:'Spreadsheet rolling forecasts diverge 8–12% by Q3. No version control, manual inputs.'},
    {n:'04',color:A.teal,  icon:'💬',title:'Data Bottleneck',         body:'Every ad-hoc question requires SQL or IT ticket. 48-hour lag kills agility.'},
    {n:'05',color:A.violet,icon:'📋',title:'Commentary Hours',        body:"Board package narrative takes a full day. It's 80% formatting, 20% insight."},
  ];
  const cw=1.78, ch=3.5, sy=1.05;
  pains.forEach((p,i)=>{
    const x=0.34+i*(cw+0.115);
    crd(s,x,sy,cw,ch,{accent:p.color});
    s.addShape(OV,{x:x+0.56,y:sy+0.22,w:0.52,h:0.52,fill:{color:p.color},line:{color:p.color}});
    s.addText(p.icon,{x:x+0.56,y:sy+0.22,w:0.52,h:0.52,fontSize:15,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(p.n,{x:x+0.1,y:sy+0.2,w:0.4,h:0.28,fontSize:10,bold:true,color:p.color,fontFace:F,margin:0});
    s.addText(p.title,{x:x+0.1,y:sy+0.85,w:cw-0.2,h:0.44,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.1,y:sy+1.28,w:cw-0.2,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(p.body,{x:x+0.1,y:sy+1.35,w:cw-0.2,h:2.0,fontSize:8.5,color:A.inkS,fontFace:F,valign:'top',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 5 — COST OF INACTION (Module 1.2)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.2','The Cost of Staying Manual');
  ftr(s,'Calculations: 12 FP&A analysts × $125K fully-loaded cost × FY2024 close data',5);
  kpi(s,0.35,1.05,2.22,1.52,'FP&A Time on Wrangling','62%','Per McKinsey 2024 Finance Survey',A.red);
  kpi(s,2.72,1.05,2.22,1.52,'Annual Cost (Manual Close)','$1.9M','12 analysts × $125K × 62% wasted',A.warn);
  kpi(s,5.09,1.05,2.22,1.52,'Avg Variance Query Time','2.8 days','Question asked → answer delivered',A.brand);
  kpi(s,7.46,1.05,2.17,1.52,'Forecast Miss Rate (Q3)','11.4%','Spreadsheet rolling forecast MAPE',A.violet);
  crd(s,0.35,2.72,9.3,1.62,{bg:A.okS,border:A.ok});
  s.addShape(R,{x:0.35,y:2.72,w:0.06,h:1.62,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('After AI: Projected Improvements',{x:0.57,y:2.8,w:4,h:0.32,fontSize:11,bold:true,color:A.ok,fontFace:F,margin:0});
  const afters=[
    {m:'Close Duration',from:'6.4 days',to:'3.5 days',imp:'−45%'},
    {m:'Variance RCA',from:'2.8 days',to:'4 hours',imp:'−93%'},
    {m:'FP&A on Wrangling',from:'62%',to:'18%',imp:'−44 pts'},
    {m:'Forecast MAPE',from:'11.4%',to:'6.2%',imp:'+46%'},
  ];
  afters.forEach((a,i)=>{
    const ax=0.57+i*2.28;
    s.addText(a.m,{x:ax,y:3.18,w:2.1,h:0.24,fontSize:8,bold:true,color:A.inkD,fontFace:F,margin:0});
    s.addText(`${a.from}  →  ${a.to}`,{x:ax,y:3.4,w:2.1,h:0.26,fontSize:8.5,color:A.ink,fontFace:F,margin:0});
    s.addText(a.imp,{x:ax,y:3.64,w:2.1,h:0.3,fontSize:14,bold:true,color:A.ok,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 6 — WHY NOW (Module 1.3)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.3','Why Finance AI Works Now — and Why 2019 Failed');
  ftr(s,'Three capability shifts converged in 2024: foundation models + managed AWS services + analytics engineering standards',6);
  const cols=[
    {year:'2019',color:A.red,label:'Early Attempts',items:['NLP needs 50K+ training examples','No managed LLM APIs — GPT-2 only','Manual ETL pipelines, no dbt','SageMaker ML engineering required','Result: $2M+ projects, abandoned']},
    {year:'2022',color:A.warn,label:'Progress',items:['GPT-3: few-shot prompting works','AWS JumpStart adds foundation models','dbt emerges as analytics standard','No agent orchestration or tool use','Still: hallucinations, no grounding']},
    {year:'2024',color:A.brand,label:'Inflection Point',items:['Claude 3 / GPT-4: reasoning + tools','AWS Bedrock GA — enterprise-grade','AgentCore GA: memory + gateway','dbt marts layer mature at ACME','Result: 6-week build, all managed']},
    {year:'2026',color:A.ok,label:'ACME Today ✓',items:['Bedrock Agent + 5 Lambda tools','AgentCore Gateway routes tools','AgentCore Memory: cross-session','Streamlit + FastAPI UI live','NL query → Redshift in < 3s']},
  ];
  const cw=2.22, sy=1.05;
  cols.forEach((c,i)=>{
    const x=0.35+i*(cw+0.12);
    crd(s,x,sy,cw,3.88,{accent:c.color});
    bdg(s,x+0.12,sy+0.14,c.year,c.color);
    s.addText(c.label,{x:x+0.12,y:sy+0.44,w:cw-0.22,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.1,y:sy+0.72,w:cw-0.22,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    c.items.forEach((item,ii)=>s.addText(`•  ${item}`,{x:x+0.12,y:sy+0.8+ii*0.48,w:cw-0.22,h:0.44,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 7 — AI CAPABILITIES (Module 1.4)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.4','Three AI Capabilities That Power Finance Automation');
  ftr(s,'Each capability maps to one or more Lambda tools in the ACME Finance architecture',7);
  const caps=[
    {n:'01',color:A.brand,icon:'🧠',title:'Natural Language Understanding',sub:'Parse finance questions into Redshift SQL',
     bullets:['Analyst: "Show EMEA op margin Q3 vs Q4"','Agent: entity=EMEA, metric=op_margin, comparison','text_to_sql Lambda generates parameterised SQL','Zero SQL knowledge required from FP&A'],tool:'text_to_sql Lambda'},
    {n:'02',color:A.teal,icon:'🔬',title:'Reasoning & Root-Cause Analysis',sub:'Identify variance drivers from raw actuals',
     bullets:['variance_rca queries fct_gl_entries vs plan','Agent ranks drivers by magnitude + significance','Generates commentary: "EMEA R&D +$4.2M due to…"','2-day analyst task → 4-minute automated run'],tool:'variance_rca Lambda'},
    {n:'03',color:A.violet,icon:'📈',title:'Scenario Simulation',sub:'Model downstream P&L impact of decisions',
     bullets:['whatif_sim: % change on any cost/revenue line','forecast: 4-quarter projection (statsforecast)','describe_metric: instant business definitions','Agent chains tools for multi-step analyses'],tool:'whatif_sim + forecast Lambdas'},
  ];
  caps.forEach((c,i)=>{
    const x=0.35+i*3.22, cw=3.0;
    crd(s,x,1.05,cw,3.88,{accent:c.color});
    s.addShape(OV,{x:x+0.18,y:1.14,w:0.52,h:0.52,fill:{color:c.color},line:{color:c.color}});
    s.addText(c.icon,{x:x+0.18,y:1.14,w:0.52,h:0.52,fontSize:15,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c.n,{x:x+0.84,y:1.18,w:0.38,h:0.26,fontSize:11,bold:true,color:c.color,fontFace:F,margin:0});
    s.addText(c.title,{x:x+0.14,y:1.74,w:cw-0.26,h:0.4,fontSize:10.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(c.sub,{x:x+0.14,y:2.12,w:cw-0.26,h:0.28,fontSize:8.5,color:A.inkD,fontFace:F,italic:true,margin:0});
    s.addShape(R,{x:x+0.12,y:2.38,w:cw-0.26,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    c.bullets.forEach((b,bi)=>s.addText(`•  ${b}`,{x:x+0.14,y:2.44+bi*0.42,w:cw-0.26,h:0.38,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
    bdg(s,x+0.14,4.64,c.tool,c.color);
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 8 — MATURITY MODEL (Module 1.5)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.5','Finance AI Maturity Model — Four Levels');
  ftr(s,'ACME is completing Level 2 (Augmented). Target: Level 3 by Q4 FY2026.',8);
  const lvls=[
    {n:'01',label:'Assisted',color:A.inkD,status:'ACME — FY2023',items:['NL query to SQL','Ad-hoc metric Q&A','No memory or tools','Analyst still formats output']},
    {n:'02',label:'Augmented',color:A.brand,status:'ACME NOW (Phase 8)',items:['Automated variance RCA','What-if simulation','Cross-session memory','Agent chaining 5 tools'],current:true},
    {n:'03',label:'Integrated',color:A.teal,status:'Target FY2026 Q4',items:['Agent writes commentary','Forecast auto-refreshes','Anomaly alerts','FP&A reviews, not builds']},
    {n:'04',label:'Autonomous',color:A.violet,status:'Future state',items:['Agent triggers close steps','Self-healing pipeline','Board package end-to-end','Human: strategic only']},
  ];
  const cw=2.22, sy=1.05;
  lvls.forEach((l,i)=>{
    const x=0.35+i*(cw+0.1);
    if(l.current){
      s.addShape(R,{x,y:sy,w:cw,h:0.36,fill:{color:l.color},line:{color:l.color}});
      s.addText('● CURRENT',{x,y:sy,w:cw,h:0.36,fontSize:8.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    }
    crd(s,x,sy+(l.current?0.36:0),cw,3.88-(l.current?0.36:0),{accent:l.color,shadow:l.current?shL():sh()});
    const oy=l.current?0.36:0;
    s.addText(l.n,{x:x+0.14,y:sy+oy+0.18,w:0.5,h:0.36,fontSize:17,bold:true,color:l.color,fontFace:F,margin:0});
    s.addText(l.label,{x:x+0.14,y:sy+oy+0.52,w:cw-0.26,h:0.3,fontSize:12,bold:true,color:A.ink,fontFace:F,margin:0});
    bdg(s,x+0.12,sy+oy+0.86,l.status,l.color);
    s.addShape(R,{x:x+0.1,y:sy+oy+1.14,w:cw-0.22,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    l.items.forEach((item,ii)=>s.addText(`•  ${item}`,{x:x+0.14,y:sy+oy+1.2+ii*0.45,w:cw-0.26,h:0.4,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  });
  for(let i=0;i<3;i++) s.addText('→',{x:0.35+(i+1)*(cw+0.1)-0.08,y:2.65,w:0.08,h:0.28,fontSize:12,color:A.inkD,fontFace:F,align:'center',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 9 — ACME TODAY (Module 1.6)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.6','ACME Today — Current State Assessment');
  ftr(s,'Phase 8 complete. AgentCore Gateway + Memory operational. All 5 Lambda tools in production.',9);
  crd(s,0.35,1.05,4.3,3.9,{accent:A.ok});
  s.addText('What Is Working',{x:0.55,y:1.12,w:3.9,h:0.3,fontSize:11,bold:true,color:A.ok,fontFace:F,margin:0});
  ['text_to_sql → Redshift avg 2.8s response','P&L, ARR, AR aging dashboards live in Streamlit',
   'FP&A team using NL query daily','Bedrock Agent + AgentCore Gateway deployed',
   'AgentCore Memory: cross-session analyst context','All 5 Lambda tools registered & production-ready']
    .forEach((w,i)=>s.addText(`✓  ${w}`,{x:0.55,y:1.5+i*0.38,w:3.9,h:0.34,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  s.addShape(R,{x:0.55,y:3.82,w:3.9,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Known Gaps (Phase 9+)',{x:0.55,y:3.86,w:3.9,h:0.26,fontSize:9,bold:true,color:A.warn,fontFace:F,margin:0});
  ['Commentary auto-draft','Board package automation'].forEach((g,i)=>s.addText(`›  ${g}`,{x:0.55,y:4.14+i*0.3,w:3.9,h:0.26,fontSize:8,color:A.warn,fontFace:F,margin:0}));
  crd(s,4.85,1.05,4.8,3.9,{accent:A.brand});
  s.addText('FY2024 Finance Scorecard',{x:5.05,y:1.12,w:4.3,h:0.3,fontSize:11,bold:true,color:A.brand,fontFace:F,margin:0});
  [['Revenue','$1,807.9M',A.ok],['Gross Profit','$1,401.4M',A.ok],['Gross Margin','77.5%',A.ok],
   ['Operating Income','−$170.4M',A.red],['Operating Margin','−9.4%',A.red],
   ['Entities','US | EMEA | APAC',A.brand],['Period Range','202401 – 202412',A.brand],
   ['ARR Movements','new | expansion | contraction | churn',A.teal]]
    .forEach(([k,v,c],i)=>{
      const bg=i%2===0?A.card:'f8fafc';
      s.addShape(R,{x:4.85,y:1.52+i*0.36,w:4.8,h:0.35,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(k,{x:5.0,y:1.52+i*0.36+0.04,w:1.7,h:0.28,fontSize:8,color:A.inkD,fontFace:F,valign:'middle',margin:0});
      s.addText(v,{x:6.68,y:1.52+i*0.36+0.04,w:2.8,h:0.28,fontSize:8.5,bold:true,color:c,fontFace:F,valign:'middle',margin:0});
    });
}

// ══════════════════════════════════════════════════════
// SLIDE 10 — ARCHITECTURE OVERVIEW (Module 1.7)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.7','Solution Architecture — End-to-End View');
  ftr(s,'All components are serverless or fully managed. No persistent EC2 in the AI path.',10);
  const layers=[
    {label:'UI Layer',color:A.violet,bg:A.violetS,items:['Streamlit Dashboard','FastAPI REST Proxy'],y:1.05},
    {label:'AI Orchestration',color:A.brand,bg:A.brandS,items:['Bedrock Agent (Claude Sonnet)','AgentCore Gateway','AgentCore Memory'],y:1.95},
    {label:'Tool Layer (Lambda)',color:A.ok,bg:A.okS,items:['text_to_sql','variance_rca','forecast','whatif_sim','describe_metric'],y:2.9},
    {label:'Data Layer (Redshift)',color:A.warn,bg:A.warnS,items:['mart_pl','fct_arr','mart_ar_aging','fct_gl_entries','stg_epm__plan_line'],y:3.88},
  ];
  layers.forEach(layer=>{
    s.addShape(R,{x:0.35,y:layer.y,w:9.3,h:0.74,fill:{color:layer.bg},line:{color:layer.color,pt:1.5}});
    s.addText(layer.label,{x:0.48,y:layer.y+0.05,w:1.7,h:0.28,fontSize:8,bold:true,color:A.inkS,fontFace:F,margin:0});
    const iw=(9.3-2.05)/layer.items.length;
    layer.items.forEach((item,i)=>{
      const ix=2.2+i*iw;
      s.addShape(R,{x:ix,y:layer.y+0.1,w:iw-0.12,h:0.54,fill:{color:A.card},line:{color:layer.color,pt:0.5},shadow:sh()});
      s.addText(item,{x:ix+0.06,y:layer.y+0.1,w:iw-0.24,h:0.54,fontSize:8,bold:true,color:A.ink,fontFace:F,align:'center',valign:'middle',margin:0});
    });
    if(layer.y<3.88) s.addText('↓',{x:4.9,y:layer.y+0.77,w:0.2,h:0.18,fontSize:11,color:A.inkD,fontFace:F,align:'center',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 11 — 8-PHASE ROADMAP (Module 1.8)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.8','Eight-Phase Implementation Roadmap');
  ftr(s,'Phases 1–8 complete ✓. Phase 9: automated commentary. Phase 10: board package automation.',11);
  const phases=[
    {n:'1',label:'NL\nQuery',desc:'text_to_sql\nRedshift'},
    {n:'2',label:'P&L\nDash',desc:'mart_pl\ncharts'},
    {n:'3',label:'ARR\nTracking',desc:'fct_arr\nwaterfall'},
    {n:'4',label:'AR\nAging',desc:'mart_ar_aging\nbuckets'},
    {n:'5',label:'Variance\nRCA',desc:'variance_rca\nLambda'},
    {n:'6',label:'What-If\nSim',desc:'whatif_sim\nforecast'},
    {n:'7',label:'Bedrock\nAgent',desc:'ReAct loop\ntool routing'},
    {n:'8',label:'AgentCore\nGA',desc:'Gateway\nMemory'},
  ];
  const cw=1.12, sy=1.05;
  phases.forEach((p,i)=>{
    const x=0.34+i*(cw+0.08);
    s.addShape(R,{x,y:sy,w:cw,h:0.44,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(`P${p.n}`,{x,y:sy,w:cw,h:0.44,fontSize:13,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    crd(s,x,sy+0.44,cw,3.32,{border:A.ok});
    s.addText(p.label,{x:x+0.06,y:sy+0.52,w:cw-0.12,h:0.5,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addText(p.desc,{x:x+0.06,y:sy+1.0,w:cw-0.12,h:0.72,fontSize:7.5,color:A.inkD,fontFace:F,align:'center',margin:0});
    s.addShape(OV,{x:x+0.31,y:sy+3.2,w:0.5,h:0.5,fill:{color:A.ok},line:{color:A.ok}});
    s.addText('✓',{x:x+0.31,y:sy+3.2,w:0.5,h:0.5,fontSize:14,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  });
  bdg(s,0.34,4.82,'✓ Phases 1–8 Complete',A.ok);
  bdg(s,2.3,4.82,'Phase 9: Commentary',A.brand);
  bdg(s,4.15,4.82,'Phase 10: Board Package',A.violet);
}

// ══════════════════════════════════════════════════════
// SLIDE 12 — SECTION 1 RECAP
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  recapSlide(s,'Section 1',
    ['The five CFO pain points: close lag, variance delay, forecast drift, data bottleneck, commentary hours',
     '$1.9M annual cost of staying manual — 12 FP&A analysts at 62% time on wrangling',
     '2024 inflection: foundation models + managed Bedrock + mature dbt analytics patterns',
     'Three AI capabilities: NL understanding, root-cause reasoning, scenario simulation',
     'Four maturity levels — ACME is completing Level 2 (Augmented)',
     'Architecture: Bedrock Agent + AgentCore Gateway + Memory + 5 Lambda tools'],
    A.brand,13,'Continue to Section 2: The Finance Domain',12);
}

// ══════════════════════════════════════════════════════
// SLIDE 13 — SECTION 2 DIVIDER
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  divSlide(s,'02','The Finance\nDomain',A.teal,
    ['2.1  Finance Organization','2.2  Financial Statements','2.3  P&L Metrics','2.4  SaaS Metrics',
     '2.5  FP&A Calendar','2.6  Data Vocabulary','2.7  dbt Model Map','2.8  P&L Visual','2.9  ARR Waterfall'],
    [14,15,16,17,18,19,20,21,22],13);
}

// ══════════════════════════════════════════════════════
// SLIDE 14 — FINANCE ORGANIZATION (Module 2.1)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.1','The Finance Organization — Who We Are Building For');
  ftr(s,'We are building for FP&A. Everything else is context.',14);
  const roles=[
    ['CFO','Strategy, board reporting, budget approval','Business case sponsor — defines success metrics',false],
    ['FP&A (Financial Planning & Analysis)','Budgeting, forecasting, variance analysis, management reporting','PRIMARY USERS — every tool is built for this team',true],
    ['Accounting / Controller','Month-end close, GL entries, compliance filings','Source of actuals data (fct_gl_entries)',false],
    ['Treasury','Cash management, AR collections, banking','AR aging consumers (mart_ar_aging)',false],
    ['Tax','Tax provision, entity filings, transfer pricing','Out of scope — Phases 1–10 do not touch tax',false],
  ];
  const cws=[1.4,3.85,3.75];
  // Header
  let hx=0.35;
  ['Role','Owns','Relevant to AI Build'].forEach((h,i)=>{
    s.addShape(R,{x:hx,y:1.05,w:cws[i],h:0.4,fill:{color:A.nav},line:{color:A.rule,pt:0.5}});
    s.addText(h,{x:hx+0.08,y:1.05,w:cws[i]-0.16,h:0.4,fontSize:9,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    hx+=cws[i];
  });
  roles.forEach((row,ri)=>{
    const ry=1.45+ri*0.64;
    const bg=row[3]?A.okS:(ri%2===0?A.card:'f8fafc');
    let rx=0.35;
    row.slice(0,3).forEach((cell,ci)=>{
      s.addShape(R,{x:rx,y:ry,w:cws[ci],h:0.62,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(cell,{x:rx+0.08,y:ry,w:cws[ci]-0.16,h:0.62,fontSize:row[3]&&ci===0?9:8.5,bold:row[3]&&ci===0,color:row[3]?A.ok:A.inkS,fontFace:F,valign:'middle',margin:0});
      rx+=cws[ci];
    });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 15 — THREE FINANCIAL STATEMENTS (Module 2.2)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.2','Three Financial Statements Every Architect Should Know');
  ftr(s,'P&L is primary. All Phases 1–8 tools centre on it. Balance Sheet and Cash Flow are context.',15);
  const stmts=[
    {title:'P&L / Income Statement',color:A.ok,icon:'📈',
     items:['Revenue','− Cost of Goods Sold (COGS)','= Gross Profit','− Operating Expenses','  • Sales & Marketing','  • Research & Development','  • General & Administrative','= Operating Income'],
     metric:'Gross Margin %  ·  Operating Margin %',acme:'mart_pl'},
    {title:'Balance Sheet',color:A.brand,icon:'⚖',
     items:['Assets:','  • Cash & equivalents','  • Accounts Receivable (AR)','  • Property & Equipment','Liabilities:','  • Accounts Payable, Debt','Equity = Assets − Liabilities','Key: AR balance & DSO'],
     metric:'AR Balance  ·  Days Sales Outstanding',acme:'mart_ar_aging (AR)'},
    {title:'Cash Flow Statement',color:A.warn,icon:'💵',
     items:['Operating: cash from core biz','Investing: CapEx, acquisitions','Financing: debt, equity','Free Cash Flow = Op − CapEx','Note: ≠ Net Income (timing)','Deferred revenue affects P&L','Not modelled in Phase 1–8','(Phase 9+)'],
     metric:'Free Cash Flow  ·  Operating CF',acme:'Not modelled (Phase 9+)'},
  ];
  stmts.forEach((st,i)=>{
    const x=0.35+i*3.22, cw=3.0;
    crd(s,x,1.05,cw,3.88,{accent:st.color});
    s.addShape(OV,{x:x+0.18,y:1.14,w:0.5,h:0.5,fill:{color:st.color},line:{color:st.color}});
    s.addText(st.icon,{x:x+0.18,y:1.14,w:0.5,h:0.5,fontSize:15,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.title,{x:x+0.8,y:1.2,w:cw-0.9,h:0.38,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.12,y:1.66,w:cw-0.26,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    st.items.forEach((item,ii)=>s.addText(item,{x:x+0.14,y:1.72+ii*0.28,w:cw-0.28,h:0.26,fontSize:8,color:A.inkS,fontFace:F,margin:0}));
    s.addShape(R,{x:x+0.12,y:3.98,w:cw-0.26,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(st.metric,{x:x+0.12,y:4.02,w:cw-0.26,h:0.24,fontSize:7.5,bold:true,color:st.color,fontFace:F,margin:0});
    bdg(s,x+0.12,4.34,st.acme,st.color);
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 16 — CORE P&L METRICS (Module 2.3)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.3','Core P&L Metrics — Memorize These');
  ftr(s,'Gross Margin and Operating Margin drive every FP&A conversation. Know these cold.',16);
  tbl(s,[
    ['Metric','Formula','Typical SaaS Range','ACME FY2024'],
    ['Revenue','Sum of recognized subscriptions + services','N/A','$1,807.9M'],
    ['COGS','Direct cost of delivery (hosting, support)','15–30% of revenue','22.5% of rev'],
    ['Gross Profit','Revenue − COGS','70–85% of revenue','$1,401.4M'],
    ['Gross Margin %','(Gross Profit / Revenue) × 100','70–85%','77.5% ✓'],
    ['Total OpEx','S&M + R&D + G&A','80–120% (growth stage)','86.9% of rev'],
    ['Operating Income','Gross Profit − Total OpEx','Negative in growth','−$170.4M'],
    ['Op Margin %','(Op Income / Revenue) × 100','Target >15%','−9.4%'],
    ['EBITDA','Op Income + Depreciation & Amortization','Cash proxy','est. −$145M'],
  ],[1.5,3.25,1.95,2.0],0.35,1.05,{rh:0.38});
  crd(s,0.35,4.7,9.3,0.5,{bg:A.brandS,border:A.brand});
  s.addText('💡  The R&D −15% what-if: +348 bps operating margin, +$62.9M operating income. This validates the whatif_sim Lambda output.',{x:0.55,y:4.74,w:8.9,h:0.38,fontSize:8.5,color:A.inkS,fontFace:F,italic:true,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 17 — SAAS METRICS (Module 2.4)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.4','SaaS Metrics — What Makes B2B SaaS Finance Different');
  ftr(s,'ACME fct_arr tracks all ARR movements monthly: new, expansion, contraction, churn.',17);
  tbl(s,[
    ['Metric','Full Name','Formula','Why It Matters'],
    ['ARR','Annual Recurring Revenue','Sum of active subscriptions annualized','Primary growth metric; investor benchmark'],
    ['MRR','Monthly Recurring Revenue','ARR ÷ 12','Operational tracking, not investor metric'],
    ['NRR ★','Net Revenue Retention','(Beg+Expand−Contract−Churn)÷Beg×100','>100% = organic growth from existing base'],
    ['GRR','Gross Revenue Retention','(Beg−Contract−Churn)÷Beg×100','Floor of NRR; excludes expansion'],
    ['Churn','Revenue Churn Rate','Churned ARR÷Beg ARR×100','Lost customers = negative ARR movement'],
    ['CAC','Customer Acquisition Cost','S&M spend÷new customers acquired','Growth efficiency; LTV/CAC > 3 = healthy'],
    ['LTV','Customer Lifetime Value','ARR/customer × Gross Margin%÷Churn','Ceiling on CAC spend'],
    ['DSO','Days Sales Outstanding','(AR Balance÷Revenue)×days in period','Collection speed; lower = better'],
  ],[0.95,1.8,3.2,2.75],0.35,1.05,{rh:0.38});
  crd(s,0.35,4.88,9.3,0.34,{bg:A.okS,border:A.ok});
  s.addText('★  NRR > 100% = the holy grail: organic growth from existing customers alone. ACME target: 110%+. GRR is the floor (no expansion).',{x:0.55,y:4.92,w:8.9,h:0.26,fontSize:8.5,bold:true,color:A.ok,fontFace:F,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 18 — FP&A CALENDAR (Module 2.5)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.5','The FP&A Calendar — What Finance Teams Do Every Month');
  ftr(s,'We automate the data retrieval inside each step — not the steps themselves.',18);
  const cols=[
    {label:'ANNUAL',color:A.warn,steps:[
      {name:'Annual Planning',detail:'Revenue targets, expense budgets, headcount by entity',ai:'whatif_sim + forecast'},
      {name:'Budget Load',detail:'Plan exported → stg_epm__plan_line (variance analysis source)',ai:'ETL pipeline'},
    ]},
    {label:'MONTHLY',color:A.brand,steps:[
      {name:'Month-End Close (day 1–5)',detail:'Post journal entries, reconcile GL → fct_gl_entries',ai:'No AI (Accounting owns)'},
      {name:'Flash Report (day 3–5)',detail:'Preliminary revenue vs budget for CFO',ai:'text_to_sql + summary'},
      {name:'Variance Report (day 7–10)',detail:'Actuals vs budget: cost center, entity, account',ai:'variance_rca Lambda'},
      {name:'Management Commentary',detail:"Written narrative explaining variances",ai:'Agent drafts numbers section'},
    ]},
    {label:'QUARTERLY',color:A.teal,steps:[
      {name:'Board Package',detail:'Full P&L, ARR waterfall, AR aging, 4-quarter forecast',ai:'All dashboards + forecast'},
      {name:'Investor Prep',detail:'Earnings KPI compilation, DSO trend, NRR commentary',ai:'describe_metric + NL query'},
    ]},
  ];
  const cws=[2.52,4.18,2.74];
  let cx=0.35;
  cols.forEach((col,ci)=>{
    const cw=cws[ci];
    s.addShape(R,{x:cx,y:1.05,w:cw,h:0.44,fill:{color:col.color},line:{color:col.color}});
    s.addText(col.label,{x:cx+0.1,y:1.05,w:cw-0.2,h:0.44,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',align:'center',margin:0});
    crd(s,cx,1.49,cw,3.44,{border:col.color});
    let sy=1.57;
    const stepH=ci===1?0.84:1.0;
    col.steps.forEach(step=>{
      s.addShape(R,{x:cx+0.1,y:sy,w:cw-0.2,h:0.025,fill:{color:col.color},line:{color:col.color}});
      s.addText(step.name,{x:cx+0.12,y:sy+0.06,w:cw-0.26,h:0.28,fontSize:8.5,bold:true,color:A.ink,fontFace:F,margin:0});
      s.addText(step.detail,{x:cx+0.12,y:sy+0.32,w:cw-0.26,h:ci===1?0.22:0.34,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
      const bady=sy+(ci===1?0.56:0.64);
      bdg(s,cx+0.12,bady,`AI: ${step.ai}`,col.color);
      sy+=stepH;
    });
    cx+=cw+0.1;
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 19 — DATA VOCABULARY (Module 2.6)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.6','Finance Data Vocabulary for the ACME Codebase');
  ftr(s,'These terms appear in every Lambda handler, every dbt model, and every API response.',19);
  tbl(s,[
    ['Term','Definition','ACME Location'],
    ['Fiscal Year','12-month accounting period (may not be Jan–Dec)','fiscal_year in all mart tables'],
    ['Period (YYYYMM)','6-digit month ID — 202403 = March 2024','period_yyyymm — primary time key'],
    ['Chart of Accounts','Master taxonomy of all financial categories','account_id in fct_gl_entries'],
    ['Cost Center','Org unit incurring costs (e.g. Engineering)','cost_center in variance_rca output'],
    ['Entity','Geographic subsidiary: US, EMEA, APAC','entity_id — primary grouping dimension'],
    ['Actuals','Real results — what happened','fct_gl_entries (source of truth)'],
    ['Plan / Budget','Pre-set targets — what was expected','stg_epm__plan_line'],
    ['Variance','Actuals − Plan (positive overage = bad for expense)','Calculated in variance_rca Lambda'],
    ['AR (Accounts Receivable)','Money owed to ACME by customers','mart_ar_aging — amount column'],
    ['Aging Bucket','AR by days overdue: 0-30, 31-60, 61-90, 90+','aging_bucket in mart_ar_aging'],
    ['ARR Movement','Monthly ARR change: new/expansion/contraction/churn','movement_type in fct_arr'],
  ],[1.65,3.85,3.2],0.35,1.05,{rh:0.34});
}

// ══════════════════════════════════════════════════════
// SLIDE 20 — DBT MODEL MAP (Module 2.7)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.7','How Finance Concepts Map to dbt Models');
  ftr(s,'AI tools query the marts layer only — never staging or intermediate.',20);
  const layers=[
    {label:'STAGING LAYER',sub:'Raw → Cleaned',color:A.inkD,bg:'f0f1f4',
     models:['stg_erp__gl_entries — raw GL journal entries from ERP','stg_erp__invoices — customer invoices (AR source)','stg_erp__subscriptions — subscription records (ARR source)','stg_epm__plan_line — budget/plan data from FP&A tool']},
    {label:'INTERMEDIATE LAYER',sub:'Business logic applied',color:A.brand,bg:A.brandS,
     models:['int_revenue — recognized revenue by entity/period','int_arr_movements — ARR categorized into movement types','int_ar_aging — invoices bucketed by days overdue','int_pl_components — P&L line items assembled by category']},
    {label:'MARTS LAYER',sub:'Final analytics — AI tools query here only',color:A.ok,bg:A.okS,
     models:['mart_pl → Full P&L by entity/quarter → /metrics/pl API + P&L dashboard tab','fct_arr → ARR waterfall by period/movement → /metrics/arr API + ARR tab','mart_ar_aging → Aging by bucket/segment → /metrics/ar_aging API + AR tab','fct_gl_entries → Actuals for variance analysis → variance_rca Lambda input']},
  ];
  layers.forEach((layer,i)=>{
    const y=1.05+i*1.38;
    s.addShape(R,{x:0.35,y,w:9.3,h:1.3,fill:{color:layer.bg},line:{color:layer.color,pt:1.5}});
    s.addShape(R,{x:0.35,y,w:1.65,h:1.3,fill:{color:layer.color},line:{color:layer.color}});
    s.addText(layer.label,{x:0.42,y:y+0.08,w:1.52,h:0.32,fontSize:8.5,bold:true,color:A.W,fontFace:F,margin:0});
    s.addText(layer.sub,{x:0.42,y:y+0.38,w:1.52,h:0.54,fontSize:7.5,color:A.W,fontFace:F,italic:true,margin:0});
    layer.models.forEach((m,mi)=>s.addText(`•  ${m}`,{x:2.1,y:y+0.06+mi*0.29,w:7.4,h:0.26,fontSize:8,color:A.inkS,fontFace:F,margin:0}));
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 21 — P&L VISUAL (Module 2.8)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.8','ACME P&L — FY2024 Visual Breakdown');
  ftr(s,'Source: mart_pl | Entities: US, EMEA, APAC | All values in USD millions',21);
  const entities=[
    {label:'US',rev:1084.7,gp:840.9,color:A.brand},
    {label:'EMEA',rev:505.2,gp:391.5,color:A.teal},
    {label:'APAC',rev:218.0,gp:169.0,color:A.violet},
  ];
  const cX=0.5,cY=1.05,cW=5.5,cH=3.9,maxV=1200;
  crd(s,cX,cY,cW,cH);
  s.addText('Revenue vs Gross Profit by Entity (FY2024, $M)',{x:cX+0.12,y:cY+0.1,w:cW-0.24,h:0.28,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
  const grpW=(cW-0.9)/3, baseY=cY+cH-0.32;
  entities.forEach((e,i)=>{
    const bx=cX+0.35+i*grpW;
    const rH=(e.rev/maxV)*2.9, gH=(e.gp/maxV)*2.9;
    s.addShape(R,{x:bx,y:baseY-rH,w:0.55,h:rH,fill:{color:e.color},line:{color:e.color}});
    s.addShape(R,{x:bx+0.62,y:baseY-gH,w:0.48,h:gH,fill:{color:A.okS},line:{color:A.ok,pt:1}});
    s.addText(e.label,{x:bx,y:baseY+0.04,w:1.1,h:0.22,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addText(`$${e.rev}M`,{x:bx,y:baseY-rH-0.22,w:0.55,h:0.2,fontSize:7.5,color:e.color,fontFace:F,align:'center',margin:0});
    s.addText(`$${e.gp}M`,{x:bx+0.62,y:baseY-gH-0.22,w:0.48,h:0.2,fontSize:7,color:A.ok,fontFace:F,align:'center',margin:0});
  });
  s.addShape(R,{x:cX+0.35,y:cY+0.48,w:0.14,h:0.12,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('Revenue',{x:cX+0.52,y:cY+0.46,w:1.1,h:0.16,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:cX+1.72,y:cY+0.48,w:0.14,h:0.12,fill:{color:A.okS},line:{color:A.ok}});
  s.addText('Gross Profit',{x:cX+1.89,y:cY+0.46,w:1.2,h:0.16,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
  const kpis=[['Revenue','$1,807.9M',A.brand],['Gross Profit','$1,401.4M',A.ok],['Gross Margin','77.5%',A.ok],['Op Income','−$170.4M',A.red],['Op Margin','−9.4%',A.red]];
  kpis.forEach((k,i)=>{
    crd(s,6.2,cY+i*0.78,3.45,0.7,{accent:k[2]});
    s.addText(k[0],{x:6.38,y:cY+i*0.78+0.08,w:2.8,h:0.24,fontSize:8,color:A.inkD,fontFace:F,margin:0});
    s.addText(k[1],{x:6.38,y:cY+i*0.78+0.3,w:2.8,h:0.34,fontSize:15,bold:true,color:k[2],fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 22 — ARR WATERFALL (Module 2.9)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.9','ARR Waterfall — How Recurring Revenue Moves');
  ftr(s,'Source: fct_arr | movement_type: new, expansion, contraction, churn | FY2024',22);
  const mvts=[
    {label:'Beg\nARR',val:1650,color:A.brand,type:'base'},
    {label:'+New',val:280,color:A.ok,type:'up'},
    {label:'+Expand',val:195,color:A.ok,type:'up'},
    {label:'−Contract',val:85,color:A.warn,type:'down'},
    {label:'−Churn',val:120,color:A.red,type:'down'},
    {label:'End\nARR',val:1920,color:A.teal,type:'base'},
  ];
  const cX=0.5,cY=1.05,cW=6.7,cH=3.9,maxV=2200,baseY=cY+cH-0.32;
  crd(s,cX,cY,cW,cH);
  s.addText('FY2024 ARR Waterfall ($M)',{x:cX+0.14,y:cY+0.1,w:cW-0.28,h:0.28,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
  const bw=0.72, gap=0.3;
  let runVal=1650;
  mvts.forEach((m,i)=>{
    const bx=cX+0.35+i*(bw+gap);
    let bH,by;
    if(m.type==='base'){bH=(m.val/maxV)*3.0;by=baseY-bH;}
    else if(m.type==='up'){bH=(m.val/maxV)*3.0;by=baseY-(runVal/maxV)*3.0-bH;}
    else{bH=(m.val/maxV)*3.0;by=baseY-((runVal)/maxV)*3.0;}
    s.addShape(R,{x:bx,y:by,w:bw,h:bH,fill:{color:m.color},line:{color:m.color}});
    s.addText(m.label,{x:bx-0.1,y:baseY+0.04,w:bw+0.2,h:0.28,fontSize:7.5,color:A.ink,fontFace:F,align:'center',margin:0});
    const dv=m.type==='base'?`$${m.val}M`:m.type==='up'?`+$${m.val}M`:`-$${m.val}M`;
    s.addText(dv,{x:bx-0.1,y:by-0.24,w:bw+0.2,h:0.22,fontSize:8,bold:true,color:m.color,fontFace:F,align:'center',margin:0});
    if(m.type==='up') runVal+=m.val;
    if(m.type==='down') runVal-=m.val;
  });
  const nrr=((1920/1650)*100).toFixed(1);
  crd(s,7.4,cY,2.25,1.08,{accent:A.teal});
  s.addText('NRR',{x:7.58,y:cY+0.1,w:1.9,h:0.26,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  s.addText(`${nrr}%`,{x:7.58,y:cY+0.34,w:1.9,h:0.5,fontSize:26,bold:true,color:A.teal,fontFace:F,margin:0});
  crd(s,7.4,cY+1.2,2.25,1.0,{accent:A.ok});
  s.addText('Net New ARR',{x:7.58,y:cY+1.3,w:1.9,h:0.26,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  s.addText('+$270M',{x:7.58,y:cY+1.54,w:1.9,h:0.46,fontSize:20,bold:true,color:A.ok,fontFace:F,margin:0});
  crd(s,7.4,cY+2.32,2.25,1.0,{accent:A.red});
  s.addText('Churn Rate',{x:7.58,y:cY+2.42,w:1.9,h:0.26,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  s.addText('7.3%',{x:7.58,y:cY+2.66,w:1.9,h:0.46,fontSize:20,bold:true,color:A.red,fontFace:F,margin:0});
  crd(s,7.4,cY+3.44,2.25,0.5,{bg:A.warnS,border:A.warn});
  s.addText('GRR  =  85.5%  (floor)',{x:7.55,y:cY+3.52,w:2.0,h:0.34,fontSize:8.5,bold:true,color:A.warn,fontFace:F,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 23 — AI TOUCHPOINTS IN CLOSE (Module 2.10)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.10','AI Touchpoints in the Finance Close Process');
  ftr(s,'AI does not replace the close — it automates data retrieval within each step.',23);
  const steps=[
    {day:'Day 1–5',phase:'Month-End Close',color:A.inkD,ai:false,tool:'N/A — Accounting owns',detail:'Post journal entries, reconcile all accounts, finalize GL. Output: fct_gl_entries updated with final actuals.'},
    {day:'Day 3–5',phase:'Flash Report',color:A.brand,ai:true,tool:'text_to_sql + Bedrock Agent',detail:'Agent queries mart_pl for preliminary revenue vs budget. Generates formatted variance summary in seconds, not hours.'},
    {day:'Day 7–10',phase:'Variance Report',color:A.warn,ai:true,tool:'variance_rca Lambda',detail:'Lambda compares fct_gl_entries vs stg_epm__plan_line. Identifies and ranks top drivers by account and cost center.'},
    {day:'Day 10+',phase:'Management Commentary',color:A.violet,ai:true,tool:'Bedrock Agent (multi-tool)',detail:'Agent drafts the numbers section of management commentary: "EMEA R&D over-budget $4.2M driven by…" in <30 seconds.'},
    {day:'Day 15',phase:'Board Package',color:A.teal,ai:true,tool:'All dashboards + forecast Lambda',detail:'Full P&L, ARR waterfall, AR aging dashboards + 4-quarter forward forecast from forecast Lambda. FP&A reviews and approves.'},
  ];
  steps.forEach((step,i)=>{
    const y=1.05+i*0.79;
    const isAI=step.ai;
    s.addShape(R,{x:0.35,y,w:SW-0.7,h:0.74,fill:{color:i%2===0?A.card:'f8fafc'},line:{color:A.rule,pt:0.5}});
    bdg(s,0.42,y+0.1,step.day,step.color);
    s.addText(step.phase,{x:1.45,y:y+0.06,w:2.0,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    bdg(s,1.45,y+0.42,isAI?'🤖 AI-Powered':'👤 Manual (Accounting)',isAI?A.ok:A.inkD);
    s.addText(step.detail,{x:3.65,y:y+0.06,w:5.7,h:0.58,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    if(isAI) bdg(s,3.65,y+0.5,step.tool,step.color);
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 24 — FINANCE QUICK REFERENCE (Module 2.11)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:'0d1117'};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('Finance Quick Reference',{x:0.42,y:0.1,w:8,h:0.44,fontSize:20,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('Keep this open while building',{x:0.42,y:0.52,w:5,h:0.26,fontSize:9,color:'7d8595',fontFace:F,italic:true,margin:0});
  s.addShape(R,{x:0.42,y:0.74,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
  // Left panel: ratios
  crd(s,0.35,0.88,4.5,4.22,{bg:'111827',border:'1e3a5f',shadow:shL()});
  s.addText('Key Ratios',{x:0.55,y:0.96,w:4.1,h:0.3,fontSize:11,bold:true,color:'93c5fd',fontFace:F,margin:0});
  const ratios=[
    {name:'Gross Margin',formula:'Gross Profit ÷ Revenue × 100',acme:'ACME FY2024: 77.5% ✓ (SaaS target 70–85%)'},
    {name:'Operating Margin',formula:'Op Income ÷ Revenue × 100',acme:'ACME FY2024: −9.4% (growth-stage investment)'},
    {name:'NRR',formula:'(Beg + Expand − Contract − Churn) ÷ Beg × 100',acme:'Holy grail >100%. ACME target: 110%+'},
    {name:'DSO',formula:'(AR Balance ÷ Revenue) × Days in Period',acme:'Lower = better. High DSO = collections risk'},
    {name:'R&D −15% What-If',formula:'whatif_sim Lambda result',acme:'+348 bps op margin  ·  +$62.9M op income'},
  ];
  ratios.forEach((r,i)=>{
    const ry=1.34+i*0.64;
    s.addText(r.name,{x:0.5,y:ry,w:4.2,h:0.26,fontSize:9,bold:true,color:'e2e8f0',fontFace:F,margin:0});
    s.addText(r.formula,{x:0.5,y:ry+0.24,w:4.2,h:0.2,fontSize:7.5,color:'94a3b8',fontFace:FM,margin:0});
    s.addText(r.acme,{x:0.5,y:ry+0.42,w:4.2,h:0.18,fontSize:7.5,color:'86efac',fontFace:F,margin:0});
  });
  // Right panel: validation numbers
  crd(s,5.05,0.88,4.6,4.22,{bg:'111827',border:'1e3a5f',shadow:shL()});
  s.addText('Lab Validation Numbers',{x:5.22,y:0.96,w:4.2,h:0.3,fontSize:11,bold:true,color:'93c5fd',fontFace:F,margin:0});
  const vals=[
    ['FY2024 Revenue','~$1,807.9M'],['FY2024 Gross Profit','~$1,401.4M'],
    ['FY2024 Gross Margin','~77.5%'],['FY2024 Op Income','~−$170.4M'],
    ['FY2024 Op Margin','~−9.4%'],['Entities','US | EMEA | APAC'],
    ['Fiscal Quarters','Q1–Q4 (FY2024)'],['Period Range','202401–202412'],
    ['AR Aging Buckets','0-30 | 31-60 | 61-90 | 90+'],
    ['ARR Movements','new | expansion | contraction | churn'],
  ];
  vals.forEach(([k,v],i)=>{
    const vy=1.34+i*0.36;
    s.addText(k,{x:5.22,y:vy,w:2.1,h:0.28,fontSize:8,color:'94a3b8',fontFace:F,valign:'middle',margin:0});
    s.addText(v,{x:7.3,y:vy,w:2.2,h:0.28,fontSize:8.5,bold:true,color:'e2e8f0',fontFace:F,valign:'middle',margin:0});
  });
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('These numbers are your ground truth. If queries return different values, check dbt model logic first.',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:7.5,italic:true,color:'7d8595',fontFace:F,valign:'middle',margin:0});
  s.addText('24 / 41',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:'7d8595',fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 25 — FINANCE PERSONA (Module 2.12)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 2','MODULE 2.12','The Finance Analyst Persona — Who We Are Building For');
  ftr(s,'Design every tool, every response, every output as if Sarah is the user.',25);
  crd(s,0.35,1.05,3.2,3.9,{accent:A.teal,shadow:shL()});
  s.addShape(OV,{x:1.15,y:1.18,w:1.6,h:1.6,fill:{color:A.tealS},line:{color:A.teal,pt:2}});
  s.addText('👩‍💼',{x:1.15,y:1.18,w:1.6,h:1.6,fontSize:36,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addText('Sarah Chen',{x:0.55,y:2.88,w:2.8,h:0.32,fontSize:13,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('Senior FP&A Analyst',{x:0.55,y:3.18,w:2.8,h:0.26,fontSize:9,color:A.inkD,fontFace:F,align:'center',margin:0});
  s.addText('ACME Finance — US Entity',{x:0.55,y:3.42,w:2.8,h:0.24,fontSize:8.5,color:A.inkD,fontFace:F,align:'center',margin:0});
  bdg(s,0.8,3.74,'8 yrs FP&A experience',A.teal);
  bdg(s,0.8,4.02,'No SQL skills',A.inkD);
  const panels=[
    {title:'Daily Reality',color:A.warn,items:['Owns monthly variance report for US entity','Builds budget vs actuals in Excel, exports to slides','Spends 3hrs/day in Redshift "waiting for IT"','Month-end: 14-hour days for 5 days straight']},
    {title:'What She Wants',color:A.ok,items:['"Why is EMEA R&D over budget?" — instant answer','Forward view: where does Q4 end up if we freeze hires?','Draft commentary she can edit, not write from scratch','One dashboard she trusts, not 6 spreadsheets']},
    {title:'What Breaks Trust',color:A.red,items:['Wrong numbers — she checks everything twice','Slow responses — she has 12 questions in a row','Hallucinated account names or period labels','Jargon she has to translate for the CFO']},
  ];
  panels.forEach((p,i)=>{
    const x=3.72+i*2.0;
    crd(s,x,1.05,1.88,3.9,{accent:p.color});
    s.addText(p.title,{x:x+0.14,y:1.12,w:1.6,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.1,y:1.4,w:1.68,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    p.items.forEach((item,ii)=>s.addText(`•  ${item}`,{x:x+0.14,y:1.46+ii*0.56,w:1.64,h:0.52,fontSize:8,color:A.inkS,fontFace:F,margin:0}));
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 26 — SECTION 2 RECAP
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  recapSlide(s,'Section 2',
    ['Finance org: FP&A is our primary user — accounting is the source of actuals',
     'Three statements: P&L is primary; balance sheet and cash flow are context for phases 1–8',
     'P&L metrics: Gross Margin 77.5% and Operating Margin −9.4% drive every FP&A conversation',
     'SaaS metrics: ARR, NRR (>100% = holy grail), GRR, Churn, CAC, LTV, DSO',
     'FP&A calendar: close → flash → variance → commentary → board package (monthly cycle)',
     'Data vocabulary: period_yyyymm, entity_id, fct_gl_entries, stg_epm__plan_line mapped',
     'dbt model layers: AI tools query marts only — never staging or intermediate',
     'AI touches 4 of 5 close steps at ACME; Accounting close step remains manual'],
    A.teal,27,'Continue to Section 3: Transformation Strategy',26);
}

// ══════════════════════════════════════════════════════
// SLIDE 27 — SECTION 3 DIVIDER
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  divSlide(s,'03','Transformation\nStrategy',A.violet,
    ['3.1  Use Case Portfolio','3.2  NL Querying','3.3  Variance RCA','3.4  What-If Simulation',
     '3.5  Business Case','3.6  Cost Model','3.7  Architecture','3.8  Bedrock + Lambda','3.9  AgentCore'],
    [28,29,30,31,32,33,34,35,36],27);
}

// ══════════════════════════════════════════════════════
// SLIDE 28 — USE CASE PORTFOLIO (Module 3.1)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.1','The ACME Finance AI Use Case Portfolio');
  ftr(s,'All six use cases are live in Phase 8. The Lambda tool each use case calls is shown below.',28);
  const usecases=[
    {n:'01',color:A.brand,title:'Natural Language Querying',impact:'High',effort:'Low',tool:'text_to_sql',desc:'Ask finance questions in plain English → instant Redshift SQL + formatted answer'},
    {n:'02',color:A.warn,title:'Variance Root-Cause Analysis',impact:'Very High',effort:'Medium',tool:'variance_rca',desc:'Automated identification of top budget variance drivers by account and cost center'},
    {n:'03',color:A.teal,title:'Revenue Forecasting',impact:'High',effort:'Medium',tool:'forecast',desc:'4-quarter rolling revenue/expense forecast using statsforecast on historical patterns'},
    {n:'04',color:A.violet,title:'What-If Scenario Modelling',impact:'High',effort:'Low',tool:'whatif_sim',desc:'% change on any P&L line → immediate downstream impact cascade across all metrics'},
    {n:'05',color:A.ok,title:'Metric Definitions',impact:'Low',effort:'Very Low',tool:'describe_metric',desc:'Instant business definition of any finance term — reduces analyst ramp time'},
    {n:'06',color:A.orange,title:'Management Commentary Draft',impact:'Very High',effort:'High',tool:'Multi-tool chain',desc:'Agent chains variance_rca + text_to_sql to draft the numbers section of board commentary'},
  ];
  const cw=3.0;
  usecases.forEach((uc,i)=>{
    const row=Math.floor(i/3), col=i%3;
    const x=0.35+col*(cw+0.1), y=1.05+row*1.98;
    crd(s,x,y,cw,1.88,{accent:uc.color});
    s.addText(uc.n,{x:x+0.14,y:y+0.12,w:0.4,h:0.28,fontSize:11,bold:true,color:uc.color,fontFace:F,margin:0});
    s.addText(uc.title,{x:x+0.14,y:y+0.4,w:cw-0.26,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(uc.desc,{x:x+0.14,y:y+0.68,w:cw-0.26,h:0.56,fontSize:8,color:A.inkS,fontFace:F,margin:0});
    bdg(s,x+0.14,y+1.3,`Tool: ${uc.tool}`,uc.color);
    bdg(s,x+0.14,y+1.58,`Impact: ${uc.impact}`,uc.impact==='Very High'?A.ok:uc.impact==='High'?A.brand:A.inkD);
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 29 — NL QUERYING (Module 3.2)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.2','Natural Language Querying — How text_to_sql Works');
  ftr(s,'Average query latency: 2.8s (NL input → formatted answer). Zero SQL knowledge required.',29);
  const steps=[
    {n:'1',color:A.brand,title:'Analyst Input',detail:'"What was EMEA gross margin for each quarter in FY2024 vs budget?"',code:null},
    {n:'2',color:A.teal,title:'Bedrock Agent — Intent Parse',detail:'Entity: EMEA  ·  Metric: gross_margin  ·  Period: Q1-Q4 FY2024  ·  Comparison: actuals vs plan',code:null},
    {n:'3',color:A.ok,title:'text_to_sql Lambda',detail:'Generates parameterised SQL against mart_pl + stg_epm__plan_line',code:'SELECT entity_id, fiscal_quarter,\n  SUM(gross_profit)/SUM(revenue) AS gm_pct\nFROM mart_pl WHERE entity_id=\'EMEA\'\nGROUP BY 1,2 ORDER BY 2'},
    {n:'4',color:A.warn,title:'Redshift Data API',detail:'Executes query, returns JSON result set (avg 1.2s for mart queries)',code:null},
    {n:'5',color:A.violet,title:'Agent — Format Response',detail:'Formats table, calculates variance vs plan, adds narrative: "EMEA Q3 GM was 74.2%, −3.1pp vs budget. Primary driver: hosting cost overrun in…"',code:null},
  ];
  const bw=1.6;
  steps.forEach((step,i)=>{
    const x=0.35+i*(bw+0.1);
    crd(s,x,1.05,bw,3.88,{accent:step.color});
    s.addShape(OV,{x:x+(bw-0.44)/2,y:1.14,w:0.44,h:0.44,fill:{color:step.color},line:{color:step.color}});
    s.addText(step.n,{x:x+(bw-0.44)/2,y:1.14,w:0.44,h:0.44,fontSize:13,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(step.title,{x:x+0.1,y:1.66,w:bw-0.2,h:0.36,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addShape(R,{x:x+0.08,y:2.0,w:bw-0.16,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    if(step.code){
      s.addShape(R,{x:x+0.08,y:2.04,w:bw-0.16,h:1.2,fill:{color:'0d1117'},line:{color:'1e3a5f'}});
      s.addText(step.code,{x:x+0.12,y:2.08,w:bw-0.24,h:1.1,fontSize:6.5,color:'93c5fd',fontFace:FM,margin:0});
    } else {
      s.addText(step.detail,{x:x+0.1,y:2.06,w:bw-0.2,h:1.8,fontSize:8,color:A.inkS,fontFace:F,margin:0});
    }
    if(i<4) s.addText('→',{x:x+bw+0.01,y:2.65,w:0.09,h:0.28,fontSize:11,color:A.inkD,fontFace:F,align:'center',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 30 — VARIANCE RCA (Module 3.3)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.3','Variance RCA — Automated Root-Cause Analysis');
  ftr(s,'variance_rca Lambda: fct_gl_entries vs stg_epm__plan_line. Returns ranked driver list in <5s.',30);
  crd(s,0.35,1.05,4.5,3.9,{accent:A.warn});
  s.addText('How It Works',{x:0.55,y:1.12,w:4.1,h:0.3,fontSize:11,bold:true,color:A.warn,fontFace:F,margin:0});
  const steps=['1.  FP&A asks: "Why is EMEA R&D over-budget in Q3?"','2.  Bedrock Agent calls variance_rca Lambda','3.  Lambda queries fct_gl_entries (actuals) vs stg_epm__plan_line (budget)','4.  Calculates variance = actuals − plan for each GL account × cost center','5.  Ranks top N drivers by absolute variance magnitude','6.  Agent formats ranked list + generates commentary draft','7.  FP&A edits and approves — no manual lookup required'];
  steps.forEach((st,i)=>s.addText(st,{x:0.55,y:1.5+i*0.36,w:4.1,h:0.32,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  s.addShape(R,{x:0.55,y:4.05,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Time saved: 2–3 analyst-days → 5 minutes',{x:0.55,y:4.08,w:4.1,h:0.28,fontSize:9,bold:true,color:A.ok,fontFace:F,margin:0});
  crd(s,5.05,1.05,4.6,3.9,{accent:A.ok,bg:'0d1117'});
  s.addText('Sample Output',{x:5.25,y:1.12,w:4.1,h:0.3,fontSize:11,bold:true,color:'93c5fd',fontFace:F,margin:0});
  s.addText('EMEA Q3 FY2024 — R&D Variance Analysis\nTotal over-budget: +$4.2M (+18.3% vs plan)',{x:5.25,y:1.48,w:4.2,h:0.48,fontSize:8.5,color:'e2e8f0',fontFace:F,margin:0});
  const rows=[['#','Account','CC','Variance','vs Plan'],['1','R&D – Personnel','Eng-EMEA','+$2.8M','+22%'],['2','R&D – Contractors','Eng-EMEA','+$0.9M','+45%'],['3','R&D – Software','All CC','+$0.5M','+12%']];
  const cws=[0.3,1.6,1.0,0.8,0.65];
  rows.forEach((row,ri)=>{
    let rx=5.18;
    row.forEach((cell,ci)=>{
      s.addShape(R,{x:rx,y:2.0+ri*0.38,w:cws[ci],h:0.36,fill:{color:ri===0?'1e2d45':(ri%2===0?'111827':'0d1117')},line:{color:'1e3a5f',pt:0.5}});
      s.addText(cell,{x:rx+0.04,y:2.0+ri*0.38,w:cws[ci]-0.08,h:0.36,fontSize:8,bold:ri===0,color:ri===0?A.W:'e2e8f0',fontFace:ri===0?F:FM,valign:'middle',margin:0});
      rx+=cws[ci];
    });
  });
  s.addShape(R,{x:5.18,y:3.18,w:4.37,h:0.8,fill:{color:'111827'},line:{color:'1e3a5f'}});
  s.addText('Agent Commentary Draft:\n"EMEA R&D over-budget by $4.2M in Q3. Primary driver is personnel costs in Eng-EMEA (+$2.8M, +22%) due to 3 additional FTE hires vs plan approved in June board meeting. Recommend: reforecast Q4 R&D +$1.4M."',{x:5.24,y:3.22,w:4.24,h:0.72,fontSize:7.5,color:'94a3b8',fontFace:F,margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 31 — WHAT-IF SIMULATION (Module 3.4)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.4','What-If Simulation — Modelling Downstream P&L Impact');
  ftr(s,'whatif_sim Lambda: apply % change to any line → cascades through full P&L in real time.',31);
  // Input card
  crd(s,0.35,1.05,2.9,3.9,{accent:A.brand});
  s.addText('Input',{x:0.55,y:1.12,w:2.5,h:0.28,fontSize:11,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('"What happens to operating margin\nif we cut R&D by 15%?"',{x:0.55,y:1.46,w:2.6,h:0.52,fontSize:9,color:A.ink,fontFace:F,italic:true,margin:0});
  s.addShape(R,{x:0.55,y:2.0,w:2.6,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Lambda Parameters:',{x:0.55,y:2.06,w:2.6,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
  [['line_item','R&D'],['change_pct','-15'],['base_period','FY2024'],['cascade','true']].forEach(([k,v],i)=>{
    s.addShape(R,{x:0.55,y:2.38+i*0.38,w:2.6,h:0.36,fill:{color:'f8fafc'},line:{color:A.rule,pt:0.5}});
    s.addText(k,{x:0.62,y:2.38+i*0.38,w:1.1,h:0.36,fontSize:8,color:A.inkD,fontFace:FM,valign:'middle',margin:0});
    s.addText(v,{x:1.72,y:2.38+i*0.38,w:1.3,h:0.36,fontSize:8.5,bold:true,color:A.ink,fontFace:FM,valign:'middle',margin:0});
  });
  // Output card
  crd(s,3.42,1.05,3.0,3.9,{accent:A.ok});
  s.addText('P&L Impact',{x:3.62,y:1.12,w:2.6,h:0.28,fontSize:11,bold:true,color:A.ok,fontFace:F,margin:0});
  const impacts=[['R&D Expense','$418M','$355.3M','−$62.7M',A.ok],['Total OpEx','$1,572M','$1,509M','−$62.7M',A.ok],['Op Income','−$170.4M','−$107.7M','+$62.7M',A.ok],['Op Margin','−9.4%','−5.96%','+348 bps',A.ok],['Gross Profit','$1,401M','$1,401M','No change',A.inkD],['EBITDA','−$145M','−$82.3M','+$62.7M',A.ok]];
  impacts.forEach(([k,base,sim,delta,c],i)=>{
    const ry=1.48+i*0.38;
    s.addShape(R,{x:3.48,y:ry,w:2.88,h:0.36,fill:{color:i%2===0?A.card:'f8fafc'},line:{color:A.rule,pt:0.5}});
    s.addText(k,{x:3.54,y:ry,w:1.0,h:0.36,fontSize:7.5,color:A.inkD,fontFace:F,valign:'middle',margin:0});
    s.addText(sim,{x:4.54,y:ry,w:1.0,h:0.36,fontSize:8,bold:true,color:A.ink,fontFace:FM,valign:'middle',margin:0});
    s.addText(delta,{x:5.54,y:ry,w:0.76,h:0.36,fontSize:8,bold:true,color:c,fontFace:FM,valign:'middle',margin:0});
  });
  // Result callout
  crd(s,6.6,1.05,3.05,3.9,{bg:A.okS,border:A.ok});
  s.addText('Result',{x:6.8,y:1.12,w:2.65,h:0.28,fontSize:11,bold:true,color:A.ok,fontFace:F,margin:0});
  [['Op Margin Improvement','+348 bps',A.ok],['Op Income Improvement','+$62.9M',A.ok],['New Op Margin','−5.96%',A.warn],['Analysis Time','< 3 seconds',A.brand]].forEach(([k,v,c],i)=>{
    crd(s,6.72,1.5+i*0.84,2.82,0.76,{accent:c});
    s.addText(k,{x:6.9,y:1.56+i*0.84,w:2.44,h:0.24,fontSize:8,color:A.inkD,fontFace:F,margin:0});
    s.addText(v,{x:6.9,y:1.78+i*0.84,w:2.44,h:0.38,fontSize:16,bold:true,color:c,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 32 — FLASH REPORT AUTOMATION (Module 3.5)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.5','Flash Report Automation — Day 3 of Close');
  ftr(s,'Target: preliminary revenue vs budget in the CFO inbox before day 5 of close.',32);
  crd(s,0.35,1.05,4.5,3.9,{accent:A.brand});
  s.addText('The Problem (Before AI)',{x:0.55,y:1.12,w:4.1,h:0.28,fontSize:10,bold:true,color:A.red,fontFace:F,margin:0});
  ['Day 3: CFO asks "Where are we vs budget?"','Analyst: "I need a few hours to pull the data"','Export GL data → paste into Excel → format pivot','Manually calculate variances by entity','Copy into PowerPoint slide → email','"Take 4 hours, sometimes I miss errors at 11pm"'].forEach((st,i)=>s.addText(`•  ${st}`,{x:0.55,y:1.46+i*0.38,w:4.1,h:0.34,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  s.addShape(R,{x:0.55,y:3.76,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Total time: 4+ hours | Error rate: ~8% of submissions need correction',{x:0.55,y:3.8,w:4.1,h:0.26,fontSize:8.5,color:A.red,fontFace:F,margin:0});
  crd(s,5.05,1.05,4.6,3.9,{accent:A.ok});
  s.addText('With AI (After Phase 8)',{x:5.25,y:1.12,w:4.1,h:0.28,fontSize:10,bold:true,color:A.ok,fontFace:F,margin:0});
  ['CFO asks same question in Streamlit chat','Agent routes to text_to_sql Lambda → mart_pl query','Fetches actual vs budget by entity in 1.2s','Formats comparison table with variance %','Agent adds 2-line narrative for each entity mismatch','Total: 3 seconds, available 24/7 during close'].forEach((st,i)=>s.addText(`✓  ${st}`,{x:5.25,y:1.46+i*0.38,w:4.1,h:0.34,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  s.addShape(R,{x:5.25,y:3.76,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Total time: 3 seconds | Error rate: 0% (query on source-of-truth mart)',{x:5.25,y:3.8,w:4.1,h:0.26,fontSize:8.5,color:A.ok,fontFace:F,margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 33 — BUSINESS CASE (Module 3.6)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.6','Business Case — How to Justify This Investment');
  ftr(s,'The business case must land with the CFO. Focus on FP&A capacity, not technology.',33);
  kpi(s,0.35,1.05,2.25,1.55,'Annual FP&A Capacity Freed','$1.2M','44% of wasted $1.9M recovered as analysis time',A.ok);
  kpi(s,2.75,1.05,2.25,1.55,'Variance Analysis ROI','28×','$45K AWS cost vs $1.26M analyst hours saved',A.brand);
  kpi(s,5.15,1.05,2.25,1.55,'Close Acceleration','-2.9 days','6.4 → 3.5 days. Faster close = earlier decisions',A.teal);
  kpi(s,7.55,1.05,2.1,1.55,'Build Time (Phase 1–8)','6 weeks','Bedrock + dbt + Streamlit on managed services',A.violet);
  const bcs=[
    {title:'Quantified Benefits',color:A.ok,items:['$1.9M wasted FP&A capacity → recover $1.2M via AI','Close 2.9 days shorter → board decisions 2.9 days earlier','Variance analysis: 2-day delay → 4-hour turnaround','Forecast accuracy: 11.4% → 6.2% MAPE (+$18M better decisions)']},
    {title:'Cost to Build & Run',color:A.warn,items:['AWS infrastructure (Bedrock, Lambda, Redshift): ~$45K/yr','Engineering build time: 6 weeks × 2 engineers','Ongoing maintenance: 0.25 FTE per year estimated','Total 3-year TCO: ~$350K vs $5.7M benefit over 3 years']},
    {title:'CFO Framing',color:A.violet,items:['"We are buying back analyst time from data wrangling"','"Not replacing FP&A — amplifying their strategic capacity"','"Payback period: 3.4 months from go-live"','"Risk: low — all AWS managed services, no custom models"']},
  ];
  bcs.forEach((bc,i)=>{
    const x=0.35+i*3.22;
    crd(s,x,2.76,3.0,2.12,{accent:bc.color});
    s.addText(bc.title,{x:x+0.14,y:2.84,w:2.7,h:0.28,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.1,y:3.1,w:2.78,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    bc.items.forEach((item,ii)=>s.addText(`•  ${item}`,{x:x+0.14,y:3.16+ii*0.38,w:2.72,h:0.34,fontSize:8,color:A.inkS,fontFace:F,margin:0}));
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 34 — COST MODEL (Module 3.7)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.7','AWS Cost Model — What Does This Actually Cost to Run?');
  ftr(s,'All costs are consumption-based. Low-usage months (e.g. between closes) cost near zero.',34);
  tbl(s,[
    ['AWS Service','Usage Pattern','Est. Monthly Cost','Notes'],
    ['Amazon Bedrock (Claude Sonnet)','~500 agent invocations/mo @ 4K tokens avg','~$180/mo','Input $3/M + Output $15/M tokens'],
    ['AgentCore Gateway','Tool routing for 500 invocations','~$10/mo','Per-invocation pricing'],
    ['AgentCore Memory','Cross-session memory for 20 analysts','~$25/mo','Per GB stored + retrieval ops'],
    ['AWS Lambda (5 tools)','500 invocations × avg 8s × 1GB memory','~$15/mo','Lambda: $0.0000166667/GB-sec'],
    ['Redshift Serverless','10–20 queries/day, RPU-based billing','~$180/mo','$0.375/RPU-hr, scales to zero'],
    ['Amazon S3 (artifacts)','Session logs, PPTX artifacts','~$2/mo','Negligible at this scale'],
    ['FastAPI on ECS Fargate','0.25 vCPU / 0.5GB, always-on','~$12/mo','Or Lambda URL for lower cost'],
    ['TOTAL','','~$424/mo','$5,088/year for full platform'],
  ],[1.7,2.9,1.6,2.5],0.35,1.05,{rh:0.37});
  crd(s,0.35,4.7,9.3,0.42,{bg:A.okS,border:A.ok});
  s.addText('💡  Actual costs scale with usage. Typical close-month (heavy): ~$650. Off-month (light): ~$180. Annual blended: ~$5,100.',{x:0.55,y:4.74,w:8.9,h:0.32,fontSize:8.5,color:A.ok,fontFace:F,italic:true,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 35 — ARCHITECTURE DETAIL (Module 3.8)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.8','System Architecture — Component Reference');
  ftr(s,'All components deployed via Terraform. IaC in infra/modules/bedrock/ and infra/envs/dev/',35);
  tbl(s,[
    ['Component','Type','Role','Key Config'],
    ['Streamlit App','Python web app','FP&A dashboard UI + chat interface','st.session_state for memoryId; tabs: P&L, ARR, AR, Chat'],
    ['FastAPI','Python REST API','Proxy between Streamlit and AWS','POST /chat invokes Bedrock Agent; GET /metrics/* queries Redshift'],
    ['Bedrock Agent','AWS managed','LLM orchestration + ReAct loop','Model: claude-sonnet-4; action groups → Gateway'],
    ['AgentCore Gateway','AWS managed','MCP tool registry + routing','5 Lambda targets; auth via IAM; rate limiting built-in'],
    ['AgentCore Memory','AWS managed','Cross-session analyst context','SEMANTIC strategy; memoryId = analyst user ID'],
    ['text_to_sql Lambda','Python/Node','NL → SQL → Redshift query','Uses Bedrock for SQL gen; Redshift Data API for exec'],
    ['variance_rca Lambda','Python','Variance root-cause analysis','Queries fct_gl_entries + stg_epm__plan_line; ranks drivers'],
    ['forecast Lambda','Python','Revenue/expense forecasting','statsforecast library; 4-quarter horizon; entity-level'],
    ['whatif_sim Lambda','Python','P&L scenario modelling','Applies % delta; cascades through mart_pl structure'],
    ['describe_metric Lambda','Python','Finance metric definitions','Static glossary lookup; returns definition + formula + ACME location'],
  ],[1.5,1.2,2.4,3.6],0.35,1.05,{rh:0.34});
}

// ══════════════════════════════════════════════════════
// SLIDE 36 — BEDROCK + LAMBDA (Module 3.9)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.9','Bedrock Agent + Lambda Tools — The Core Loop');
  ftr(s,'The ReAct loop: Reason → Act (call tool) → Observe (read result) → Reason again.',36);
  // ReAct loop diagram
  const loop=[
    {label:'REASON',detail:'Agent reads question + context. Plans which tool to call and with what args.',color:A.brand},
    {label:'ACT',detail:'Calls AgentCore Gateway → routes to correct Lambda. Passes structured args.',color:A.violet},
    {label:'OBSERVE',detail:'Receives Lambda result (JSON). Reads the data. Decides: answer now or call next tool?',color:A.teal},
    {label:'ANSWER',detail:'Formats final response. Cites data sources. Stores context in AgentCore Memory.',color:A.ok},
  ];
  loop.forEach((step,i)=>{
    const x=0.35+i*2.4;
    crd(s,x,1.05,2.2,2.4,{accent:step.color,shadow:shL()});
    s.addShape(OV,{x:x+0.74,y:1.14,w:0.72,h:0.72,fill:{color:step.color},line:{color:step.color}});
    s.addText(step.label,{x:x+0.74,y:1.14,w:0.72,h:0.72,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(step.detail,{x:x+0.12,y:1.96,w:1.96,h:1.3,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
    if(i<3) s.addText('→',{x:x+2.2+0.01,y:2.05,w:0.09,h:0.28,fontSize:12,color:A.inkD,fontFace:F,align:'center',margin:0});
  });
  // Lambda reference table
  crd(s,0.35,3.6,9.3,1.28,{border:A.brand});
  s.addText('Lambda Tool Reference',{x:0.55,y:3.68,w:3.5,h:0.26,fontSize:9.5,bold:true,color:A.brand,fontFace:F,margin:0});
  const lambdas=[['text_to_sql','NL → SQL','mart_pl, fct_arr, mart_ar_aging, fct_gl_entries','Python + boto3'],['variance_rca','Variance drivers','fct_gl_entries vs stg_epm__plan_line','Python + pandas'],['forecast','4Q projection','mart_pl historical','Python + statsforecast'],['whatif_sim','P&L delta','mart_pl structure','Python + numpy'],['describe_metric','Definitions','Static glossary JSON','Python']];
  lambdas.forEach((row,i)=>{
    const lx=0.42+i*1.85;
    s.addShape(R,{x:lx,y:3.98,w:1.8,h:0.8,fill:{color:A.brandS},line:{color:A.brand,pt:0.5}});
    s.addText(row[0],{x:lx+0.06,y:4.0,w:1.68,h:0.26,fontSize:8,bold:true,color:A.brand,fontFace:F,margin:0});
    s.addText(row[1],{x:lx+0.06,y:4.24,w:1.68,h:0.22,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
    s.addText(row[3],{x:lx+0.06,y:4.44,w:1.68,h:0.22,fontSize:7,color:A.inkD,fontFace:FM,margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 37 — AGENTCORE GATEWAY + MEMORY
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.9 cont.','AgentCore Gateway & Memory — What They Add');
  ftr(s,'AgentCore is GA (Oct 2025). Gateway and Memory replace Lambda action groups + session workarounds.',37);
  crd(s,0.35,1.05,4.5,3.9,{accent:A.orange,shadow:shL()});
  s.addText('AgentCore Gateway',{x:0.55,y:1.12,w:4.1,h:0.3,fontSize:11,bold:true,color:A.orange,fontFace:F,margin:0});
  [['Problem it solves','Each Lambda needed its own action group wired to each agent. Maintenance nightmare with 5+ tools.'],['What it does','Unified MCP-compatible tool registry. Agent calls Gateway → Gateway routes to correct Lambda.'],['Auth','Built-in IAM + OAuth. Replaces per-Lambda invocation policies.'],['Rate limiting','Per-tool throttle config. Protects Redshift from burst queries.'],['Monitoring','Single CloudWatch namespace for all tool invocations. One dashboard for all 5 tools.'],['ACME config','5 targets: text_to_sql, variance_rca, forecast, whatif_sim, describe_metric']].forEach(([k,v],i)=>{
    s.addShape(R,{x:0.5,y:1.5+i*0.38,w:4.24,h:0.36,fill:{color:i%2===0?A.card:'f8fafc'},line:{color:A.rule,pt:0.5}});
    s.addText(k,{x:0.56,y:1.5+i*0.38,w:1.1,h:0.36,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,valign:'middle',margin:0});
    s.addText(v,{x:1.64,y:1.5+i*0.38,w:3.04,h:0.36,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });
  crd(s,5.05,1.05,4.6,3.9,{accent:A.brand,shadow:shL()});
  s.addText('AgentCore Memory',{x:5.25,y:1.12,w:4.1,h:0.3,fontSize:11,bold:true,color:A.brand,fontFace:F,margin:0});
  [['Problem it solves','Classic Bedrock Agent: no memory between sessions. Analyst re-explains context every conversation.'],['What it does','Cross-session persistent memory. Semantic + episodic stores per analyst.'],['Memory strategy','SEMANTIC: understands "last week we discussed EMEA margin"'],['Session model','sessionId = per-browser-session (ephemeral). memoryId = per-analyst user ID (persistent).'],['FastAPI change','Pass memoryId alongside sessionId in invoke_agent() calls.'],['Example recall','"Last month you asked about EMEA R&D variance. Q3 trend continued into Q4: +$1.8M."']].forEach(([k,v],i)=>{
    s.addShape(R,{x:5.1,y:1.5+i*0.38,w:4.44,h:0.36,fill:{color:i%2===0?A.card:'f8fafc'},line:{color:A.rule,pt:0.5}});
    s.addText(k,{x:5.16,y:1.5+i*0.38,w:1.2,h:0.36,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,valign:'middle',margin:0});
    s.addText(v,{x:6.34,y:1.5+i*0.38,w:3.14,h:0.36,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 38 — IMPLEMENTATION TIMELINE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','REFERENCE','Implementation Timeline — From Zero to Phase 8');
  ftr(s,'Assumes 2 engineers (1 BE + 1 ML/data). All phases use Terraform for IaC.',38);
  const phases=[
    {ph:'P1–2',weeks:'Wk 1–2',title:'Foundation',items:['Redshift + dbt setup','mart_pl schema','text_to_sql Lambda','Bedrock Agent v1'],color:A.brand},
    {ph:'P3–4',weeks:'Wk 3–4',title:'Dashboards',items:['fct_arr + ARR tab','mart_ar_aging + AR tab','Streamlit UI v1','FastAPI REST proxy'],color:A.teal},
    {ph:'P5–6',weeks:'Wk 5–6',title:'AI Tools',items:['variance_rca Lambda','whatif_sim Lambda','forecast Lambda','describe_metric Lambda'],color:A.violet},
    {ph:'P7–8',weeks:'Wk 7–8',title:'AgentCore',items:['Bedrock Agent v2','AgentCore Gateway','AgentCore Memory','End-to-end QA + go-live'],color:A.ok},
  ];
  phases.forEach((p,i)=>{
    const x=0.35+i*2.4;
    s.addShape(R,{x,y:1.05,w:2.2,h:0.4,fill:{color:p.color},line:{color:p.color}});
    s.addText(`${p.ph}  ·  ${p.weeks}`,{x,y:1.05,w:2.2,h:0.4,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    crd(s,x,1.45,2.2,3.3,{border:p.color});
    s.addText(p.title,{x:x+0.12,y:1.54,w:1.96,h:0.3,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
    p.items.forEach((item,ii)=>{
      s.addShape(OV,{x:x+0.14,y:1.94+ii*0.52,w:0.2,h:0.2,fill:{color:A.ok},line:{color:A.ok}});
      s.addText(item,{x:x+0.4,y:1.92+ii*0.52,w:1.72,h:0.28,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
    });
  });
  crd(s,0.35,4.85,9.3,0.38,{bg:A.okS,border:A.ok});
  s.addText('✓  All 8 phases complete as of Phase 8 delivery. Phase 9 (commentary automation) targets Q3 FY2026. Phase 10 (board package) targets Q4 FY2026.',{x:0.55,y:4.89,w:8.9,h:0.28,fontSize:8.5,color:A.ok,fontFace:F,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 39 — MONITORING & GOVERNANCE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','REFERENCE','Monitoring, Governance & Production Readiness');
  ftr(s,'Production finance AI requires audit trails, accuracy validation, and fallback procedures.',39);
  const panels=[
    {title:'What to Monitor',color:A.brand,items:['Bedrock Agent: latency P50/P95/P99 per tool','Lambda: error rate, timeout %, cold start frequency','Redshift: query execution time, slot utilization','AgentCore Memory: hit rate, recall relevance scores','User satisfaction: thumbs up/down on chat responses','Data freshness: last fct_gl_entries load timestamp']},
    {title:'Accuracy Controls',color:A.warn,items:['Validation queries: compare AI answer vs direct Redshift query','FP&A sign-off required before AI output enters board materials','Hallucination guard: agent must cite source mart + period','Numeric validation: ±0.5% tolerance vs direct mart query','Monthly accuracy audit: sample 20 responses for correctness','Alert if answer deviates from mart_pl by >1%']},
    {title:'Governance',color:A.violet,items:['IAM: per-user Redshift permissions via AgentCore Identity (Phase 10)','Audit log: every agent invocation logged to CloudTrail + S3','PII: no customer names in mart layer — entity/account IDs only','Data retention: agent sessions 90 days, memory 12 months','Change control: Lambda version pinned; Bedrock model version locked','Incident runbook: fallback to direct Streamlit query if agent fails']},
  ];
  panels.forEach((p,i)=>{
    const x=0.35+i*3.22;
    crd(s,x,1.05,3.0,3.88,{accent:p.color});
    s.addText(p.title,{x:x+0.14,y:1.12,w:2.7,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.1,y:1.4,w:2.78,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    p.items.forEach((item,ii)=>s.addText(`•  ${item}`,{x:x+0.14,y:1.46+ii*0.4,w:2.72,h:0.36,fontSize:8.5,color:A.inkS,fontFace:F,margin:0}));
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 40 — KEY TAKEAWAYS
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','RECAP','Key Takeaways — What You Can Build After This Course');
  ftr(s,'Section 3 of 3 complete. You now have the strategy, the architecture, and the domain knowledge.',40);
  const takeaways=[
    {n:'01',color:A.brand,title:'The Stack Is Proven',body:'Bedrock + AgentCore + Lambda + dbt + Streamlit is production-tested at ACME. You can replicate it in 6–8 weeks.'},
    {n:'02',color:A.teal,title:'Domain Knowledge Is the Moat',body:"Finance AI fails when architects don't know FP&A. You now understand variance, close cycles, and why NRR matters."},
    {n:'03',color:A.ok,title:'Start With One Use Case',body:'NL querying (text_to_sql) has the lowest effort and highest FP&A adoption. Start there. Prove value. Then add tools.'},
    {n:'04',color:A.violet,title:'Accuracy = Trust',body:'FP&A will abandon the tool after one wrong number. Build validation queries, cite sources, never hallucinate account names.'},
    {n:'05',color:A.warn,title:'Frame It as Capacity, Not Replacement',body:'The CFO cares about reclaiming $1.9M in wasted analyst time. Lead with the business case, not the technology.'},
    {n:'06',color:A.orange,title:'AgentCore Is the Accelerator',body:'Gateway removes action-group wiring overhead. Memory makes the agent genuinely useful for follow-up questions. Use both.'},
  ];
  const cw=2.97;
  takeaways.forEach((t,i)=>{
    const row=Math.floor(i/3), col=i%3;
    const x=0.35+col*(cw+0.1), y=1.05+row*1.88;
    crd(s,x,y,cw,1.78,{accent:t.color});
    s.addText(t.n,{x:x+0.14,y:y+0.1,w:0.38,h:0.3,fontSize:11,bold:true,color:t.color,fontFace:F,margin:0});
    s.addText(t.title,{x:x+0.14,y:y+0.38,w:cw-0.26,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.1,y:y+0.66,w:cw-0.22,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(t.body,{x:x+0.14,y:y+0.72,w:cw-0.26,h:0.92,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 41 — COURSE CLOSE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.06,fill:{color:A.brand},line:{color:A.brand}});
  // Compass
  s.addShape(R,{x:7.6,y:0.6,w:2.0,h:2.0,fill:{color:'0d1e3a'},line:{color:'172a4a'},shadow:shL()});
  s.addShape(OV,{x:7.82,y:0.82,w:1.56,h:1.56,fill:{color:'transparent'},line:{color:A.brand,pt:2}});
  s.addShape(OV,{x:8.22,y:1.22,w:0.76,h:0.76,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('◈',{x:8.22,y:1.22,w:0.76,h:0.76,fontSize:16,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(OV,{x:8.52,y:0.95,w:0.14,h:0.14,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('You now have enough\nfinance domain knowledge\nto design AI systems that\nsolve real FP&A problems.',{x:0.55,y:0.7,w:6.8,h:1.8,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.55,y:2.56,w:5.2,h:0.03,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('Not just technically correct ones.',{x:0.55,y:2.66,w:6.0,h:0.4,fontSize:16,color:A.navI,fontFace:F,italic:true,margin:0});
  const summary=[
    `✓  3 sections completed`,`✓  41 slides  ·  ~110 minutes narrated`,
    `✓  Strategy, domain knowledge, and architecture`,`✓  6 Lambda tools  ·  Bedrock Agent  ·  AgentCore`,
  ];
  summary.forEach((line,i)=>s.addText(line,{x:0.55,y:3.2+i*0.36,w:6.5,h:0.32,fontSize:10.5,color:A.navI,fontFace:F,margin:0}));
  crd(s,0.55,4.58,9.05,0.6,{bg:'0d1e3a',border:'1e3a5f',shadow:shL()});
  s.addText('Next: Build the labs. Start with Phase 1 — the text_to_sql Lambda and your first NL query against mart_pl.',{x:0.72,y:4.62,w:8.7,h:0.5,fontSize:9.5,color:A.navI,fontFace:F,valign:'middle',margin:0});
  s.addText([{text:'← Back to Contents',options:{hyperlink:{slide:2}}}],{x:0.55,y:5.05,w:2.5,h:0.22,fontSize:8.5,color:A.brand,fontFace:F,underline:true,margin:0});
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('AI Finance Transformation: Strategy to Working Agents on AWS — Course Complete',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('41 / 41',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════
// SAVE
// ══════════════════════════════════════════════════════
pres.writeFile({fileName:OUT})
  .then(()=>console.log('✅  Built:',OUT))
  .catch(e=>{console.error('❌ Error:',e);process.exit(1);});
