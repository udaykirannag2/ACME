"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
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
const F='Calibri', SW=10, TOT=22;
const OUT=path.join(__dirname,'section-3-slides.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Finance AI Agents on AWS — Section 3: Transformation Strategy';
const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;
const sh =()=>({type:'outer',blur:8, offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function hdr(s,sec,mod,title,dark=false){
  s.background={color:dark?A.nav:A.bg};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  if(sec) s.addText(`${sec}  ·  ${mod}`,{x:0.42,y:0.1,w:8,h:0.22,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,margin:0});
  s.addText(title,{x:0.42,y:sec?0.31:0.16,w:9.0,h:0.52,fontSize:21,bold:true,color:dark?A.W:A.ink,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:sec?0.88:0.74,w:9.16,h:0.015,fill:{color:dark?'1e2d45':A.rule},line:{color:dark?'1e2d45':A.rule}});
}
function ftr(s,text,n,tot,dark=false){
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:dark?'080f1c':A.bgS},line:{color:dark?'080f1c':A.bgS}});
  s.addText(text,{x:0.42,y:5.335,w:7.5,h:0.27,fontSize:7.5,italic:true,color:dark?A.navM:A.inkD,fontFace:F,valign:'middle',margin:0});
  s.addText(`${n} / ${tot}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,valign:'middle',align:'right',margin:0});
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
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0,shrinkText:true});
      cx+=cw;
    });
  });
}
// Horizontal stepper helper
function stepper(s,steps,activeIdx,y){
  const boxW=2.4, gap=0.28, startX=0.42;
  steps.forEach((label,i)=>{
    const x=startX+i*(boxW+gap);
    const isActive=(i===activeIdx);
    const bg=isActive?A.violet:A.bgS;
    const textColor=isActive?A.W:A.inkD;
    s.addShape(R,{x,y,w:boxW,h:0.44,fill:{color:bg},line:{color:isActive?A.violet:A.ruleH,pt:1},shadow:sh()});
    s.addText(label,{x:x+0.05,y:y+0.04,w:boxW-0.1,h:0.36,fontSize:9,bold:isActive,color:textColor,fontFace:F,align:'center',valign:'middle',margin:0});
    // Arrow connector
    if(i<steps.length-1){
      const ax=x+boxW+0.04;
      s.addText('→',{x:ax,y:y+0.06,w:0.22,h:0.3,fontSize:10,color:A.inkM,fontFace:F,align:'center',margin:0});
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — SECTION DIVIDER
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  // Violet top accent
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.violet},line:{color:A.violet}});
  // Ghost "3" watermark
  s.addText('3',{x:5.2,y:0.05,w:4.6,h:3.9,fontSize:230,bold:true,color:'131f35',fontFace:F,align:'right',valign:'top',margin:0});
  // Left accent bar
  s.addShape(R,{x:0.55,y:0.65,w:0.06,h:1.7,fill:{color:A.violet},line:{color:A.violet}});
  s.addText('SECTION 3',{x:0.74,y:0.65,w:3.5,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Transformation\nStrategy',{x:0.74,y:0.92,w:5.5,h:1.3,fontSize:34,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('~55 min  ·  5 modules  ·  22 slides',{x:0.74,y:2.3,w:5,h:0.3,fontSize:9.5,color:A.navM,fontFace:F,margin:0});

  // 3-step spine
  s.addShape(R,{x:0.42,y:2.74,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
  const steps=[
    {n:'Step 1',label:'Identify Use Cases'},
    {n:'Step 2',label:'Evaluate (Impact-Feasibility)'},
    {n:'Step 3',label:'Business Case (S.T.A.R.T)'},
  ];
  steps.forEach((st,i)=>{
    const x=0.42+i*3.12;
    s.addShape(R,{x,y:2.78,w:3.0,h:0.68,fill:{color:A.violet},line:{color:A.violet},shadow:sh()});
    s.addText(`Step ${i+1}`,{x:x+0.1,y:2.82,w:2.8,h:0.22,fontSize:8,bold:true,color:'ede9f7',fontFace:F,margin:0});
    s.addText(st.label,{x:x+0.1,y:3.02,w:2.8,h:0.36,fontSize:10,bold:true,color:A.W,fontFace:F,margin:0});
  });

  // Section framing + additional modules
  s.addText('This section: deciding what to build — Identify → Prioritize → Justify',
    {x:0.42,y:3.56,w:9.16,h:0.28,fontSize:10,italic:true,color:'93a8cc',fontFace:F,margin:0});
  s.addText('Also in this section:  3.4 Build vs Buy vs Platform  ·  3.5 Current vs Future State — What Actually Changes',
    {x:0.42,y:3.88,w:9.16,h:0.26,fontSize:8.5,color:A.navM,fontFace:F,margin:0});

  ftr(s,'Section 3  ·  Transformation Strategy',1,TOT,true);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — MODULE 3.1 INTRO: Step 1 — Identify Use Cases
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.1','Step 1 — Identify Use Cases');
  stepper(s,['1  IDENTIFY','2  EVALUATE','3  BUSINESS CASE'],0,1.06);
  s.addText('Before you can prioritize, you need to know what\'s possible. Use case identification requires three teams in the same room.',
    {x:0.42,y:1.68,w:9.16,h:0.72,fontSize:14,color:A.inkS,fontFace:F,margin:0});
  s.addText('This step is about discovery — not decision-making. The goal is to surface every real pain point and opportunity before any filtering happens.',
    {x:0.42,y:2.42,w:9.16,h:0.5,fontSize:11,color:A.inkD,fontFace:F,margin:0});
  // 3 mini cards showing the teams
  const teams=[['TECHNICAL','SA, Data Eng'],['BUSINESS','FP&A, Finance Ops'],['LEADERSHIP','CFO, Finance VP']];
  const accents=[A.brand,A.ok,A.violet];
  teams.forEach(([name,sub],i)=>{
    const x=0.42+i*3.12;
    crd(s,x,3.08,3.0,1.68,{accent:accents[i]});
    s.addText(name,{x:x+0.2,y:3.14,w:2.7,h:0.3,fontSize:11,bold:true,color:accents[i],fontFace:F,margin:0});
    s.addText(sub,{x:x+0.2,y:3.46,w:2.7,h:0.26,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  });
  ftr(s,'Module 3.1  ·  Step 1: Identify Use Cases',2,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — WHO NEEDS TO BE IN THE ROOM
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.1','Who Needs to Be in the Room');
  const cols=[
    {title:'TECHNICAL',sub:'SA, Data Engineers',accent:A.brand,
     qs:['What data exists?','What\'s the build effort?','What\'s feasible with current infra?']},
    {title:'BUSINESS',sub:'FP&A, Finance Ops',accent:A.ok,
     qs:['Where is time being lost?','What\'s manual, repetitive, error-prone?','What slows down close?']},
    {title:'LEADERSHIP',sub:'CFO, Finance VP',accent:A.violet,
     qs:['What decisions are slow?','What would change board confidence?','What\'s the strategic priority?']},
  ];
  cols.forEach((col,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,1.06,3.0,3.7,{accent:col.accent});
    s.addText(col.title,{x:x+0.2,y:1.12,w:2.7,h:0.3,fontSize:12,bold:true,color:col.accent,fontFace:F,margin:0});
    s.addText(col.sub,{x:x+0.2,y:1.44,w:2.7,h:0.26,fontSize:9,color:A.inkD,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.2,y:1.74,w:2.6,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    col.qs.forEach((q,qi)=>{
      s.addText(`· ${q}`,{x:x+0.2,y:1.82+qi*0.5,w:2.7,h:0.44,fontSize:9.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    });
  });
  // Footer note
  s.addShape(R,{x:0.42,y:4.88,w:9.16,h:0.36,fill:{color:A.violetS},line:{color:'d4cef5',pt:1}});
  s.addText('Use cases identified by one team in isolation almost always fail. The intersection of all three is where real opportunities live.',
    {x:0.58,y:4.9,w:9.0,h:0.32,fontSize:8.5,italic:true,color:A.violet,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.1  ·  Step 1: Identify Use Cases',3,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — THREE USE CASE CATEGORIES
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.1','Three Categories of AI Use Cases');
  const cats=[
    {
      tag:'FOUNDATIONAL',accent:A.brand,bg:A.brandS,
      title:'Process Optimization\n& Workforce Enablement',
      def:'Automate repetitive tasks; reduce manual data wrangling',
      examples:'NL Querying, Flash Report Automation',
      chars:'High feasibility · Existing data · Clear ROI · Best starting point',
    },
    {
      tag:'ENHANCEMENT',accent:A.ok,bg:A.okS,
      title:'Strengthen Existing\nProducts or Services',
      def:'Add intelligence to existing workflows; improve quality or speed',
      examples:'Variance RCA, What-If Simulation',
      chars:'Requires AI reasoning · Medium complexity · Strong ROI',
    },
    {
      tag:'TRANSFORMATIONAL',accent:A.violet,bg:A.violetS,
      title:'New Capabilities —\nPreviously Impossible',
      def:'New products, revenue streams, or market opportunities powered by AI',
      examples:'AI Mgmt Commentary, Board Pack Generation',
      chars:'Highest impact · Higher complexity · Strongest competitive moat',
    },
  ];
  cats.forEach((cat,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,1.06,3.0,3.76,{accent:cat.accent});
    s.addShape(R,{x:x+0.08,y:1.06,w:3.0,h:0.38,fill:{color:cat.bg},line:{color:cat.bg}});
    s.addShape(R,{x,y:1.06,w:0.06,h:0.38,fill:{color:cat.accent},line:{color:cat.accent}});
    s.addText(cat.tag,{x:x+0.18,y:1.1,w:2.7,h:0.28,fontSize:9.5,bold:true,color:cat.accent,fontFace:F,margin:0});
    s.addText(cat.title,{x:x+0.18,y:1.5,w:2.7,h:0.64,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.18,y:2.17,w:2.6,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(cat.def,{x:x+0.18,y:2.2,w:2.7,h:0.52,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    s.addText('ACME examples:',{x:x+0.18,y:2.76,w:2.7,h:0.22,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    s.addText(cat.examples,{x:x+0.18,y:2.96,w:2.7,h:0.26,fontSize:8.5,color:cat.accent,fontFace:F,bold:true,margin:0});
    s.addText(cat.chars,{x:x+0.18,y:3.26,w:2.7,h:0.5,fontSize:7.5,color:A.inkD,fontFace:F,margin:0,wrap:true});
  });
  ftr(s,'Module 3.1  ·  Three categories: Foundational → Enhancement → Transformational',4,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — ACME DISCOVERY TABLE
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.1','From Pain to Use Case — The ACME Discovery');
  const rows=[
    ['Use Case','Identified By','Pain Signal','Category'],
    ['NL Querying','SA + FP&A','"Every question needs an IT ticket — 48hr lag"','Foundational'],
    ['Flash Report','FP&A','"4 hours every close to pull the same numbers"','Foundational'],
    ['Variance RCA','FP&A + CFO','"2–3 days per close for root cause analysis"','Enhancement'],
    ['What-If Sim','CFO','"Can\'t model scenarios fast enough for the board"','Enhancement'],
    ['Mgmt Commentary','CFO + FP&A','"Commentary takes a full day — 80% formatting"','Transformational'],
    ['Board Pack','CFO','"3 days to produce what should be automated"','Transformational'],
  ];
  tbl(s,rows,[1.5,1.3,4.3,1.6],0.42,1.06,{rh:0.44});
  // Footer insight
  s.addShape(R,{x:0.42,y:4.2,w:9.16,h:0.38,fill:{color:'f8f5ff'},line:{color:'d4cef5',pt:1}});
  s.addText('The CFO identified the transformational ones. FP&A found the enhancement ones. The SA team made them feasible.',
    {x:0.58,y:4.23,w:9.0,h:0.32,fontSize:8.5,italic:true,color:A.violet,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.1  ·  Six use cases discovered through cross-functional discovery',5,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — MODULE 3.2 INTRO: Step 2 — Impact-Feasibility Matrix
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.2','Step 2 — Evaluate: The Impact-Feasibility Matrix');
  stepper(s,['1  IDENTIFY','2  EVALUATE','3  BUSINESS CASE'],1,1.06);
  s.addText('Not all use cases are equal. The matrix tells you what to build now, what to plan for later, and what to skip.',
    {x:0.42,y:1.68,w:9.16,h:0.58,fontSize:14,color:A.inkS,fontFace:F,margin:0});
  s.addText('Plot each use case on two dimensions: how much value it delivers (Impact) and how readily it can be built with current data, skills, and infra (Feasibility).',
    {x:0.42,y:2.3,w:9.16,h:0.52,fontSize:11,color:A.inkD,fontFace:F,margin:0});
  // Mini 2x2 preview
  const qx=4.8, qy=2.96, qw=4.72, qh=2.2;
  const half=qw/2, halfH=qh/2;
  s.addShape(R,{x:qx,y:qy,w:half,h:halfH,fill:{color:'e2f3e9'},line:{color:A.rule,pt:0.5}});
  s.addShape(R,{x:qx+half,y:qy,w:half,h:halfH,fill:{color:'e2f3e9'},line:{color:A.rule,pt:0.5}});
  s.addShape(R,{x:qx,y:qy+halfH,w:half,h:halfH,fill:{color:'f3f3f3'},line:{color:A.rule,pt:0.5}});
  s.addShape(R,{x:qx+half,y:qy+halfH,w:half,h:halfH,fill:{color:A.brandS},line:{color:A.rule,pt:0.5}});
  s.addText('PLAN & SCALE',{x:qx+0.1,y:qy+0.06,w:half-0.15,h:0.28,fontSize:8.5,bold:true,color:A.warn,fontFace:F,margin:0});
  s.addText('BUILD NOW',{x:qx+half+0.1,y:qy+0.06,w:half-0.15,h:0.28,fontSize:8.5,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('DEPRIORITIZE',{x:qx+0.1,y:qy+halfH+0.06,w:half-0.15,h:0.28,fontSize:8.5,bold:true,color:A.inkM,fontFace:F,margin:0});
  s.addText('QUICK WINS',{x:qx+half+0.1,y:qy+halfH+0.06,w:half-0.15,h:0.28,fontSize:8.5,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('IMPACT ↑',{x:qx-0.65,y:qy+0.6,w:0.55,h:qh-0.7,fontSize:8,bold:true,color:A.inkD,fontFace:F,align:'center',margin:0,rotate:270});
  s.addText('FEASIBILITY →',{x:qx,y:qy+qh+0.08,w:qw,h:0.24,fontSize:8,bold:true,color:A.inkD,fontFace:F,align:'center',margin:0});
  ftr(s,'Module 3.2  ·  Step 2: Evaluate with Impact-Feasibility Matrix',6,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — THE 2×2 MATRIX (full)
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.2','Impact-Feasibility Matrix — Where to Invest');

  const mx=0.9, my=1.08, mw=8.2, mh=3.82;
  const hf=mw/2, vf=mh/2;

  // Quadrant backgrounds
  s.addShape(R,{x:mx,     y:my,       w:hf,h:vf,fill:{color:'fef8ee'},line:{color:A.ruleH,pt:0.5}});
  s.addShape(R,{x:mx+hf,  y:my,       w:hf,h:vf,fill:{color:'e8f7f0'},line:{color:A.ruleH,pt:0.5}});
  s.addShape(R,{x:mx,     y:my+vf,    w:hf,h:vf,fill:{color:'f3f4f6'},line:{color:A.ruleH,pt:0.5}});
  s.addShape(R,{x:mx+hf,  y:my+vf,    w:hf,h:vf,fill:{color:'e9f2ff'},line:{color:A.ruleH,pt:0.5}});

  // Quadrant labels
  s.addText('PLAN & SCALE',{x:mx+0.12,y:my+0.1,w:hf-0.2,h:0.3,fontSize:9.5,bold:true,color:A.warn,fontFace:F,margin:0});
  s.addText('BUILD NOW',{x:mx+hf+0.12,y:my+0.1,w:hf-0.2,h:0.3,fontSize:9.5,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('DEPRIORITIZE',{x:mx+0.12,y:my+vf+0.1,w:hf-0.2,h:0.3,fontSize:9.5,bold:true,color:A.inkM,fontFace:F,margin:0});
  s.addText('QUICK WINS',{x:mx+hf+0.12,y:my+vf+0.1,w:hf-0.2,h:0.3,fontSize:9.5,bold:true,color:A.brand,fontFace:F,margin:0});

  // Axis labels
  s.addText('HIGH IMPACT',{x:mx-0.82,y:my+0.4,w:0.78,h:0.28,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,align:'right',margin:0});
  s.addText('LOW IMPACT',{x:mx-0.82,y:my+vf+1.1,w:0.78,h:0.28,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,align:'right',margin:0});
  s.addText('← LOW FEASIBILITY',{x:mx+0.05,y:my+mh+0.1,w:hf-0.1,h:0.24,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,margin:0});
  s.addText('HIGH FEASIBILITY →',{x:mx+hf+0.05,y:my+mh+0.1,w:hf-0.1,h:0.24,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,margin:0});

  // Dot helper
  function dot(label,dx,dy,dc){
    s.addShape(OV,{x:dx-0.12,y:dy-0.12,w:0.24,h:0.24,fill:{color:dc},line:{color:dc}});
    s.addText(label,{x:dx+0.14,y:dy-0.12,w:1.4,h:0.24,fontSize:8.5,bold:true,color:A.inkS,fontFace:F,margin:0});
  }
  // Dots: positions relative to matrix bounds
  // Top-right quadrant (BUILD NOW): x in [mx+hf..mx+mw], y in [my..my+vf]
  dot('Variance RCA', mx+hf+0.3, my+0.55, A.ok);
  dot('NL Querying',  mx+hf+1.5, my+0.9,  A.brand);
  dot('What-If Sim',  mx+hf+0.5, my+1.35, A.teal);
  dot('Flash Report', mx+hf+1.8, my+1.65, A.ok);
  // Top-left quadrant (PLAN & SCALE): x in [mx..mx+hf], y in [my..my+vf]
  dot('Mgmt Comm.',   mx+0.3,    my+0.55, A.violet);
  // Center-right: slightly lower (Board Pack depends on Commentary)
  dot('Board Pack',   mx+hf+0.6, my+1.7,  A.violet);

  ftr(s,'Module 3.2  ·  Plot use cases; sequence by Build Now vs Plan & Scale',7,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — READING THE MATRIX: ACME PRIORITIES
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.2','ACME Prioritization: Short-Term vs Scale');

  // Left column — Build Now
  crd(s,0.42,1.06,4.6,3.7,{accent:A.ok});
  s.addText('BUILD NOW',{x:0.62,y:1.12,w:4.2,h:0.3,fontSize:11,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Days 1–90',{x:0.62,y:1.44,w:4.2,h:0.24,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:0.62,y:1.7,w:4.2,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const buildNow=[
    ['NL Querying','Eliminates data bottleneck; highest daily usage'],
    ['Variance RCA','Highest analyst time savings (2–3 days → 4 hours)'],
    ['What-If Sim','Highest CFO visibility; board-ready scenarios'],
    ['Flash Report','Fastest to build; good pilot win for trust'],
  ];
  buildNow.forEach(([name,desc],i)=>{
    s.addText(name,{x:0.62,y:1.82+i*0.74,w:4.2,h:0.26,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(desc,{x:0.62,y:2.08+i*0.74,w:4.2,h:0.38,fontSize:8.5,color:A.inkD,fontFace:F,margin:0,wrap:true});
  });

  // Right column — Plan & Scale
  crd(s,5.22,1.06,4.36,3.7,{accent:A.warn});
  s.addText('PLAN & SCALE',{x:5.42,y:1.12,w:4.0,h:0.3,fontSize:11,bold:true,color:A.warn,fontFace:F,margin:0});
  s.addText('Days 90–180',{x:5.42,y:1.44,w:4.0,h:0.24,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:5.42,y:1.7,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const planScale=[
    ['Mgmt Commentary','Depends on Variance RCA existing first — needs real variance data as input'],
    ['Board Pack','Depends on Commentary + all dashboards; final milestone'],
  ];
  planScale.forEach(([name,desc],i)=>{
    s.addText(name,{x:5.42,y:1.82+i*1.1,w:4.0,h:0.26,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(desc,{x:5.42,y:2.08+i*1.1,w:4.0,h:0.6,fontSize:8.5,color:A.inkD,fontFace:F,margin:0,wrap:true});
    if(i===0) s.addShape(OV,{x:5.42,y:3.06,w:0.18,h:0.18,fill:{color:A.warn},line:{color:A.warn}});
    if(i===0) s.addText('dependency',{x:5.64,y:3.04,w:1.5,h:0.22,fontSize:7.5,color:A.warn,fontFace:F,margin:0});
  });

  s.addShape(R,{x:0.42,y:4.84,w:9.16,h:0.38,fill:{color:'fef8ee'},line:{color:'f0d9b5',pt:1}});
  s.addText('Dependency matters. Commentary can\'t exist without Variance RCA. Board Pack needs Commentary. Sequence drives the roadmap.',
    {x:0.58,y:4.87,w:9.0,h:0.32,fontSize:8.5,italic:true,color:A.warn,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.2  ·  Build Now: NL Querying, Variance RCA, What-If, Flash Report',8,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — MODULE 3.3 INTRO: S.T.A.R.T
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.3','Step 3 — Build the Business Case: S.T.A.R.T');
  stepper(s,['1  IDENTIFY','2  EVALUATE','3  BUSINESS CASE'],2,1.06);
  s.addText('The S.T.A.R.T framework gives you a CFO-ready business case in five elements. Here\'s exactly what you need to bring into that room.',
    {x:0.42,y:1.68,w:9.16,h:0.58,fontSize:13,color:A.inkS,fontFace:F,margin:0});

  // S.T.A.R.T acronym cards
  const items=[
    {letter:'S',word:'Scope',color:A.brand},
    {letter:'T',word:'Tracking',color:A.ok},
    {letter:'A',word:'Assessment',color:A.warn},
    {letter:'R',word:'Resources',color:A.violet},
    {letter:'T',word:'Timeline',color:A.teal},
  ];
  const cardW=1.72, startX=0.42, gap=0.1;
  items.forEach((item,i)=>{
    const x=startX+i*(cardW+gap);
    crd(s,x,2.38,cardW,2.06,{accent:item.color});
    s.addText(item.letter,{x:x+0.14,y:2.44,w:cardW-0.2,h:0.78,fontSize:38,bold:true,color:item.color,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:3.26,w:cardW-0.24,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(item.word,{x:x+0.14,y:3.32,w:cardW-0.2,h:0.3,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
  });
  ftr(s,'Module 3.3  ·  Step 3: S.T.A.R.T Business Case Framework',9,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — THE S.T.A.R.T FRAMEWORK (five elements)
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.3','S.T.A.R.T — Five Elements of a CFO-Ready Business Case');
  const items=[
    {letter:'S',word:'SCOPE',color:A.brand,
     body:'Define the business problem. What process is broken? Who is affected? Current state vs desired state.'},
    {letter:'T',word:'TRACKING',color:A.ok,
     body:'Measurable metrics: ROI, KPIs, time saved, error rate, cycle time. These become your success criteria AND your board slide.'},
    {letter:'A',word:'ASSESSMENT',color:A.warn,
     body:'Risks and dependencies: data quality, infrastructure gaps, change management, regulatory requirements.'},
    {letter:'R',word:'RESOURCES',color:A.violet,
     body:'People (SA, AE, Finance champion), infrastructure, partners, budget. Vague estimates kill projects.'},
    {letter:'T',word:'TIMELINE',color:A.teal,
     body:'PoC → Pilot → Production. Days to each milestone. Clear exit criteria at every stage.'},
  ];
  // 2+3 layout
  const top2=[items[0],items[1]];
  const bot3=[items[2],items[3],items[4]];
  top2.forEach((item,i)=>{
    const x=0.42+i*4.77;
    const w=4.57;
    crd(s,x,1.06,w,1.64,{accent:item.color});
    s.addText(`${item.letter} — ${item.word}`,{x:x+0.2,y:1.12,w:w-0.3,h:0.34,fontSize:11,bold:true,color:item.color,fontFace:F,margin:0});
    s.addText(item.body,{x:x+0.2,y:1.48,w:w-0.3,h:1.1,fontSize:9,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });
  bot3.forEach((item,i)=>{
    const w=2.92;
    const x=0.42+i*(w+0.26);
    crd(s,x,2.84,w,1.72,{accent:item.color});
    s.addText(`${item.letter} — ${item.word}`,{x:x+0.2,y:2.9,w:w-0.3,h:0.34,fontSize:11,bold:true,color:item.color,fontFace:F,margin:0});
    s.addText(item.body,{x:x+0.2,y:3.26,w:w-0.3,h:1.2,fontSize:9,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });
  ftr(s,'Module 3.3  ·  S.T.A.R.T: the five building blocks of a fundable AI project',10,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — S.T.A.R.T APPLIED: VARIANCE RCA
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.3','S.T.A.R.T in Practice — Variance RCA Use Case');
  const rows=[
    ['Letter','Element','ACME Variance RCA — Concrete Detail'],
    ['S','Scope','FP&A spends 2–3 days/close manually identifying variance root causes across US, EMEA, APAC. Late root cause = wrong answer at board.'],
    ['T','Tracking','Cycle time: 2–3 days → 4 hours. Accuracy: ≥95% vs manual. Hours saved: 16 hr/month per FP&A analyst.'],
    ['A','Assessment','Data: fct_gl_entries vs stg_epm__plan_line must align. Change mgmt: analysts must trust AI output. Audit: every result traceable to mart data.'],
    ['R','Resources','1 SA (6 weeks) + 1 Analytics Engineer (4 weeks) + Finance Champion (review/sign-off). AWS cost: ~$50/mo incremental.'],
    ['T','Timeline','PoC: 2 weeks (EMEA only). Pilot: 4 weeks (all entities, parallel). Production: 6 weeks (replace manual). Total: 12 weeks.'],
  ];
  tbl(s,rows,[0.5,1.1,7.06],0.42,1.06,{rh:0.5});
  ftr(s,'Module 3.3  ·  S.T.A.R.T applied to Variance RCA — the template for every use case',11,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — PoC → PILOT → PRODUCTION TIMELINE
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.3','The Three-Phase Delivery Timeline');
  const phases=[
    {
      label:'POC',weeks:'Weeks 1–2',color:A.brand,bg:A.brandS,
      goal:'Single entity (EMEA), Dec 2024 period.',
      detail:'Goal: prove ≥95% accuracy vs manual.',
      exit:'Exit: Finance Champion sign-off.',
    },
    {
      label:'PILOT',weeks:'Weeks 3–6',color:A.ok,bg:A.okS,
      goal:'All entities, run parallel with manual process.',
      detail:'Measure cycle time. Collect analyst feedback.',
      exit:'Exit: CFO reviews both outputs — no material difference.',
    },
    {
      label:'PRODUCTION',weeks:'Weeks 7–12',color:A.violet,bg:A.violetS,
      goal:'Replace manual process entirely.',
      detail:'Monitor weekly. Alert if accuracy drops.',
      exit:'Quarterly review cadence. Fully auditable.',
    },
  ];
  phases.forEach((ph,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,1.08,3.0,3.5,{accent:ph.color});
    s.addShape(R,{x:x+0.08,y:1.08,w:3.0,h:0.52,fill:{color:ph.bg},line:{color:ph.bg}});
    s.addShape(R,{x,y:1.08,w:0.06,h:0.52,fill:{color:ph.color},line:{color:ph.color}});
    s.addText(ph.label,{x:x+0.18,y:1.12,w:2.7,h:0.3,fontSize:13,bold:true,color:ph.color,fontFace:F,margin:0});
    s.addText(ph.weeks,{x:x+0.18,y:1.42,w:2.7,h:0.2,fontSize:8.5,color:ph.color,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.18,y:1.64,w:2.6,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(ph.goal,{x:x+0.18,y:1.68,w:2.7,h:0.38,fontSize:9,color:A.ink,fontFace:F,margin:0,wrap:true});
    s.addText(ph.detail,{x:x+0.18,y:2.08,w:2.7,h:0.38,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
    s.addShape(R,{x:x+0.18,y:2.5,w:2.6,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(ph.exit,{x:x+0.18,y:2.56,w:2.7,h:0.76,fontSize:8.5,italic:true,color:ph.color,fontFace:F,margin:0,wrap:true});
    // Arrow between phases
    if(i<2){
      s.addText('→',{x:x+3.04,y:2.5,w:0.2,h:0.3,fontSize:14,color:A.inkM,fontFace:F,align:'center',margin:0});
    }
  });
  ftr(s,'Module 3.3  ·  PoC → Pilot → Production — clear exit criteria at each gate',12,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — THE CFO APPROVAL SLIDE
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.3','One Page. Numbers Only. This Is What Gets Budget Approved.');

  // Single executive summary card — 7 rows × 0.34 + header 0.42 = 2.8 total
  crd(s,0.42,1.06,9.16,2.92,{border:A.inkS});
  s.addShape(R,{x:0.42,y:1.06,w:9.16,h:0.42,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('EXECUTIVE SUMMARY — VARIANCE RCA AI TOOL',{x:0.58,y:1.1,w:9.0,h:0.32,fontSize:10,bold:true,color:A.W,fontFace:F,margin:0});

  const rows2=[
    {label:'Problem',val:'$380K/year in analyst capacity on variance analysis',color:A.red},
    {label:'Solution',val:'AI variance_rca tool (Lambda + Bedrock Agent)',color:A.brand},
    {label:'Investment',val:'6 weeks SA time + $600/year AWS cost',color:A.ink},
    {label:'Return',val:'$285K capacity recovered (75% of $380K)',color:A.ok},
    {label:'Payback',val:'< 3 months',color:A.ok},
    {label:'Risk',val:'LOW — parallel with manual during pilot, fully reversible',color:A.warn},
    {label:'Timeline',val:'12 weeks to production',color:A.brand},
  ];
  rows2.forEach((row,i)=>{
    const ry=1.54+i*0.34;
    const bg=i%2===0?A.card:'f8fafc';
    s.addShape(R,{x:0.42,y:ry,w:9.16,h:0.34,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(row.label,{x:0.58,y:ry+0.04,w:1.4,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    s.addText(row.val,{x:2.1,y:ry+0.04,w:7.2,h:0.26,fontSize:9,bold:row.label==='Return'||row.label==='Problem',color:row.color,fontFace:F,margin:0});
  });

  // Footer note
  s.addShape(R,{x:0.42,y:4.84,w:9.16,h:0.38,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
  s.addText('No architecture diagrams on this slide. CFOs approve numbers, not diagrams.',
    {x:0.58,y:4.87,w:9.0,h:0.32,fontSize:9,italic:true,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.3  ·  The CFO approval slide: one page, numbers only',13,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — THE LAYERED DECISION MODEL
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.4','Module 3.4 — Build vs Buy vs Platform');
  s.addText('This isn\'t one decision. It\'s four — each layer of a finance AI system has its own build-vs-buy answer.',
    {x:0.42,y:1.02,w:9.16,h:0.28,fontSize:11,italic:true,color:A.inkD,fontFace:F,margin:0});

  const layers=[
    {
      n:'4', label:'Application / UI',
      sub:'Streamlit  ·  Workday Portal  ·  Custom Dashboard  ·  BI Tool',
      verdict:'Build or Buy',
      color:A.orange, bg:'fdf2ea',
    },
    {
      n:'3', label:'Business Tools & Data',
      sub:'Lambda functions  ·  dbt models  ·  Redshift schema  ·  Your fiscal calendar  ·  Entity hierarchy',
      verdict:'Almost Always BUILD',
      color:A.brand, bg:A.brandS,
    },
    {
      n:'2', label:'Orchestration Platform',
      sub:'AWS Bedrock  ·  Google Vertex AI  ·  Azure OpenAI — managed agent hosting, memory, IAM, security',
      verdict:'Usually PLATFORM',
      color:A.ok, bg:A.okS,
    },
    {
      n:'1', label:'Foundation Models',
      sub:'Anthropic Claude  ·  OpenAI GPT-4o  ·  Google Gemini — nobody builds LLMs from scratch',
      verdict:'Always BUY',
      color:A.inkD, bg:'f3f4f6',
    },
  ];

  const rowH=0.76, rowGap=0.055, startY=1.38;
  layers.forEach((layer,i)=>{
    const y=startY+i*(rowH+rowGap);
    s.addShape(R,{x:0.42,y,w:9.16,h:rowH,fill:{color:layer.bg},line:{color:A.rule,pt:0.5}});
    s.addShape(R,{x:0.42,y,w:0.08,h:rowH,fill:{color:layer.color},line:{color:layer.color}});
    s.addText(`L${layer.n}`,{x:0.58,y:y+0.06,w:0.38,h:0.24,fontSize:8.5,bold:true,color:layer.color,fontFace:F,margin:0,align:'center'});
    s.addText(layer.label,{x:1.04,y:y+0.06,w:5.5,h:0.28,fontSize:12,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(layer.sub,{x:1.04,y:y+0.38,w:5.5,h:0.28,fontSize:8.5,color:A.inkD,fontFace:F,margin:0,shrinkText:true});
    s.addShape(R,{x:7.3,y:y+0.16,w:2.1,h:0.42,fill:{color:layer.bg},line:{color:layer.color,pt:1.5}});
    s.addText(layer.verdict,{x:7.32,y:y+0.17,w:2.06,h:0.40,fontSize:8.5,bold:true,color:layer.color,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  // Key message bar
  const barY=startY+4*(rowH+rowGap)-rowGap+0.06;
  s.addShape(R,{x:0.42,y:barY,w:9.16,h:0.3,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('SaaS = buying layers 2–4 as a package.  Platform + Build = choosing your own layer 2, then building layers 3–4 yourself.',
    {x:0.58,y:barY+0.03,w:9.0,h:0.24,fontSize:8.5,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.4  ·  Every AI application has four layers — each has its own build-vs-buy answer',14,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — THREE DECISION QUESTIONS
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.4','Three Questions That Determine Your Approach');

  const xs=[0.42,3.42,6.50];
  const cws=[3.0,3.08,3.08];
  const hh=0.38, rh=0.94, gap=0.05, startY=1.06;

  // Header row
  const hdrLabels=['QUESTION','BUY SIGNAL','BUILD SIGNAL'];
  const hdrBgs=[A.nav,'1a5c3a','0a4fb0'];
  hdrLabels.forEach((lbl,ci)=>{
    s.addShape(R,{x:xs[ci],y:startY,w:cws[ci],h:hh,fill:{color:hdrBgs[ci]},line:{color:'1e2d45',pt:0.5}});
    s.addText(lbl,{x:xs[ci]+0.1,y:startY+0.04,w:cws[ci]-0.14,h:hh-0.06,fontSize:8.5,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  const qs=[
    {
      n:'Q1', color:A.teal, label:'Data Sensitivity',
      question:'Must data stay in your cloud?',
      buy:'Non-sensitive data, SaaS hosting acceptable. Low regulatory risk, no VPC requirement.',
      build:'Financial actuals, PII, or M&A data. Regulated industry. Data must stay in your VPC.',
    },
    {
      n:'Q2', color:A.violet, label:'Business Logic Specificity',
      question:'Is the process standard or proprietary?',
      buy:'Standard: expense coding, AP automation, ASC 606 revenue recognition. SaaS has pre-built logic.',
      build:'Proprietary: your GL structure, fiscal calendar, entity hierarchy, variance thresholds — build it.',
    },
    {
      n:'Q3', color:A.orange, label:'3-Year Total Cost of Ownership',
      question:'What does cost look like at scale?',
      buy:'Small team, low volume, no in-house engineers. SaaS cheaper upfront; trade-off is control.',
      build:'50–100+ users, high query volume, SA team available. Platform 3–5x cheaper at scale.',
    },
  ];

  qs.forEach((q,ri)=>{
    const y=startY+hh+ri*(rh+gap);
    const qBg=ri%2===0?A.card:'f8fafc';
    s.addShape(R,{x:xs[0],y,w:cws[0],h:rh,fill:{color:qBg},line:{color:A.rule,pt:0.5}});
    s.addShape(R,{x:xs[0],y,w:0.06,h:rh,fill:{color:q.color},line:{color:q.color}});
    s.addShape(R,{x:xs[0]+0.14,y:y+0.1,w:0.32,h:0.32,fill:{color:q.color},line:{color:q.color}});
    s.addText(q.n,{x:xs[0]+0.14,y:y+0.1,w:0.32,h:0.32,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(q.label,{x:xs[0]+0.54,y:y+0.1,w:cws[0]-0.6,h:0.24,fontSize:8,bold:true,color:q.color,fontFace:F,margin:0});
    s.addText(q.question,{x:xs[0]+0.14,y:y+0.46,w:cws[0]-0.2,h:0.4,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0,wrap:true});

    s.addShape(R,{x:xs[1],y,w:cws[1],h:rh,fill:{color:'f0faf4'},line:{color:A.rule,pt:0.5}});
    s.addText('✓  Buy signal',{x:xs[1]+0.1,y:y+0.1,w:cws[1]-0.14,h:0.26,fontSize:8,bold:true,color:A.ok,fontFace:F,margin:0});
    s.addText(q.buy,{x:xs[1]+0.1,y:y+0.4,w:cws[1]-0.14,h:0.46,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true,shrinkText:true});

    s.addShape(R,{x:xs[2],y,w:cws[2],h:rh,fill:{color:A.brandS},line:{color:A.rule,pt:0.5}});
    s.addText('→  Build signal',{x:xs[2]+0.1,y:y+0.1,w:cws[2]-0.14,h:0.26,fontSize:8,bold:true,color:A.brand,fontFace:F,margin:0});
    s.addText(q.build,{x:xs[2]+0.1,y:y+0.4,w:cws[2]-0.14,h:0.46,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true,shrinkText:true});
  });

  // Bottom callout
  const callY=startY+hh+3*(rh+gap)+0.12;
  s.addShape(R,{x:0.42,y:callY,w:9.16,h:0.38,fill:{color:A.violet},line:{color:A.violet}});
  s.addText('2-of-3 answers pointing the same direction = your answer. Most finance AI projects score 2–3 for Platform + Build.',
    {x:0.58,y:callY+0.03,w:9.0,h:0.32,fontSize:9,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.4  ·  Data sensitivity · Business logic · 3-year TCO — 2-of-3 decides your direction',15,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — THE LANDSCAPE + ACME APPLICATION
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.4','The Market Landscape — and Where ACME Landed');

  // Vertical divider
  s.addShape(R,{x:6.0,y:1.06,w:0.03,h:4.1,fill:{color:A.ruleH},line:{color:A.ruleH}});

  // ── LEFT: Market landscape ──
  const LX=0.42, LW=5.4;
  s.addText('THE LANDSCAPE — 2025',{x:LX,y:1.06,w:LW,h:0.26,fontSize:9,bold:true,color:A.inkD,fontFace:F,margin:0});

  crd(s,LX,1.38,LW,1.22,{accent:A.ok,bg:A.okS});
  s.addText('SaaS FP&A — Buy when the process is standard',{x:LX+0.2,y:1.44,w:LW-0.26,h:0.26,fontSize:8.5,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Planning & budgeting:  Mosaic  ·  Pigment  ·  Planful  ·  Anaplan',{x:LX+0.2,y:1.74,w:LW-0.26,h:0.22,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  s.addText('Standard finance ops:  Leapfin (rev rec)  ·  Auditoria (AP)  ·  Airbase (expense)',{x:LX+0.2,y:2.0,w:LW-0.26,h:0.22,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  s.addText('Note: cannot query your custom schema or encode your fiscal logic',{x:LX+0.2,y:2.28,w:LW-0.26,h:0.22,fontSize:7.5,italic:true,color:A.inkD,fontFace:F,margin:0});

  crd(s,LX,2.7,LW,0.72,{accent:A.brand,bg:A.brandS});
  s.addText('Cloud Platform — Your Layer 2 choice',{x:LX+0.2,y:2.76,w:LW-0.26,h:0.24,fontSize:8.5,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('AWS Bedrock  ·  Google Vertex AI  ·  Azure OpenAI — all three are functionally equivalent; choose based on your primary cloud',{x:LX+0.2,y:3.02,w:LW-0.26,h:0.3,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true,shrinkText:true});

  crd(s,LX,3.52,LW,0.72,{accent:A.teal,bg:A.tealS});
  s.addText('A la Carte — Buy specific components',{x:LX+0.2,y:3.58,w:LW-0.26,h:0.24,fontSize:8.5,bold:true,color:A.teal,fontFace:F,margin:0});
  s.addText('Langfuse (observability)  ·  Pinecone (vectors)  ·  AgentCore Memory  ·  LangSmith (evals)',{x:LX+0.2,y:3.84,w:LW-0.26,h:0.3,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true,shrinkText:true});

  crd(s,LX,4.34,LW,0.6,{accent:A.violet,bg:A.violetS});
  s.addText('Buy SaaS for standard processes. Build on platform for proprietary analytics.',
    {x:LX+0.2,y:4.38,w:LW-0.26,h:0.5,fontSize:9,bold:true,color:A.violet,fontFace:F,valign:'middle',margin:0});

  // ── RIGHT: ACME Application ──
  const RX=6.14, RW=3.44;
  s.addText('HOW ACME SCORED',{x:RX,y:1.06,w:RW,h:0.26,fontSize:9,bold:true,color:A.inkD,fontFace:F,margin:0});

  const acmeQs=[
    {q:'Q1  Data in VPC?',a:'YES  →  Platform',color:A.teal},
    {q:'Q2  Logic custom?',a:'YES  →  Build',color:A.violet},
    {q:'Q3  Scale matters?',a:'YES  →  Platform',color:A.orange},
  ];
  acmeQs.forEach((item,i)=>{
    const y=1.38+i*0.52;
    s.addShape(R,{x:RX,y,w:RW,h:0.44,fill:{color:A.bgS},line:{color:A.rule,pt:0.5}});
    s.addText(item.q,{x:RX+0.1,y:y+0.04,w:RW-0.14,h:0.18,fontSize:8,color:A.inkS,fontFace:F,margin:0});
    s.addText(item.a,{x:RX+0.1,y:y+0.22,w:RW-0.14,h:0.18,fontSize:8.5,bold:true,color:item.color,fontFace:F,margin:0});
  });

  s.addText('Result: 3-of-3  →  Platform + Build',{x:RX,y:2.98,w:RW,h:0.26,fontSize:9,bold:true,color:A.ok,fontFace:F,margin:0});

  // Arch card container
  s.addShape(R,{x:RX,y:3.28,w:RW,h:1.54,fill:{color:A.bgS},line:{color:A.ruleH,pt:0.5}});
  const archCards=[
    {label:'USE BEDROCK',sub:'LLM + agent orchestration (Layer 2)',color:A.ok},
    {label:'BUILD YOUR TOOLS',sub:'text_to_sql · variance_rca · whatif_sim (Layer 3)',color:A.brand},
    {label:'OWN YOUR DATA',sub:'dbt + Redshift — your mart definitions (Layer 3)',color:A.violet},
  ];
  archCards.forEach((card,i)=>{
    const y=3.34+i*0.48;
    s.addShape(R,{x:RX+0.1,y,w:RW-0.2,h:0.42,fill:{color:A.card},line:{color:card.color,pt:1}});
    s.addText(card.label,{x:RX+0.22,y:y+0.04,w:RW-0.36,h:0.17,fontSize:8,bold:true,color:card.color,fontFace:F,margin:0});
    s.addText(card.sub,{x:RX+0.22,y:y+0.22,w:RW-0.36,h:0.16,fontSize:7.5,color:A.inkD,fontFace:F,margin:0,shrinkText:true});
  });

  s.addText('Your moat is layers 3–4. The cloud handles the rest.',
    {x:RX,y:4.9,w:RW,h:0.22,fontSize:8.5,italic:true,color:A.inkS,fontFace:F,margin:0});

  ftr(s,'Module 3.4  ·  Use Bedrock · Build tools · Own the data — the conclusion the framework reaches',16,TOT);
}

// SLIDE 17 — MODULE 3.5 INTRO: Before and After
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.5','Module 3.5 — Before and After: What Actually Changes');
  s.addText('The analyst doesn\'t disappear. They move up the value chain — from data wrangler to insight reviewer.',
    {x:0.42,y:1.06,w:9.16,h:0.68,fontSize:15,color:A.inkS,fontFace:F,margin:0});
  s.addText('Every use case in this section follows the same pattern: AI takes the left side of the workflow (retrieval, calculation, formatting), and the human owns the right side (judgment, verification, communication).',
    {x:0.42,y:1.82,w:9.16,h:0.66,fontSize:11,color:A.inkD,fontFace:F,margin:0});
  // Before/after split preview
  crd(s,0.42,2.66,4.4,2.12,{accent:A.red,bg:'fdf3f3'});
  s.addText('BEFORE',{x:0.62,y:2.72,w:4.0,h:0.32,fontSize:12,bold:true,color:A.red,fontFace:F,margin:0});
  s.addText('Manual · Slow · Error-prone · Context-switching',{x:0.62,y:3.06,w:4.0,h:0.5,fontSize:9.5,color:A.inkD,fontFace:F,margin:0});

  crd(s,5.18,2.66,4.4,2.12,{accent:A.ok,bg:A.okS});
  s.addText('AFTER',{x:5.38,y:2.72,w:4.0,h:0.32,fontSize:12,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('AI-assisted · Fast · Auditable · Analyst owns judgment',{x:5.38,y:3.06,w:4.0,h:0.5,fontSize:9.5,color:A.inkD,fontFace:F,margin:0});
  ftr(s,'Module 3.5  ·  Before and after — analyst moves from wrangler to strategist',17,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 18 — NL QUERYING BEFORE / AFTER
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.5','NL Querying — Before and After');

  // BEFORE column
  crd(s,0.42,1.06,4.4,3.62,{accent:A.red,bg:'fdf5f5'});
  s.addText('BEFORE',{x:0.62,y:1.12,w:4.0,h:0.3,fontSize:12,bold:true,color:A.red,fontFace:F,margin:0});
  s.addText('Total time: 2 days',{x:0.62,y:1.44,w:4.0,h:0.26,fontSize:9,bold:true,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:0.62,y:1.74,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const before23=[
    'Submit IT ticket',
    'Wait 48 hours',
    'Receive CSV',
    'Reformat in Excel',
    'Answer the question',
  ];
  before23.forEach((step,i)=>{
    s.addShape(R,{x:0.62,y:1.82+i*0.42,w:0.28,h:0.28,fill:{color:A.red},line:{color:A.red}});
    s.addText(`${i+1}`,{x:0.62,y:1.82+i*0.42,w:0.28,h:0.28,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(step,{x:0.96,y:1.84+i*0.42,w:3.68,h:0.26,fontSize:9.5,color:A.inkS,fontFace:F,margin:0});
  });

  // AFTER column
  crd(s,5.18,1.06,4.4,3.62,{accent:A.ok,bg:'f0faf4'});
  s.addText('AFTER',{x:5.38,y:1.12,w:4.0,h:0.3,fontSize:12,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Total time: 3 seconds',{x:5.38,y:1.44,w:4.0,h:0.26,fontSize:9,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addShape(R,{x:5.38,y:1.74,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const after23=[
    'Type your question in plain English',
    'Bedrock Agent routes to text_to_sql',
    'SQL runs on Redshift mart',
    'Answer returned in 3 seconds with SQL source',
  ];
  after23.forEach((step,i)=>{
    s.addShape(OV,{x:5.38,y:1.84+i*0.5,w:0.26,h:0.26,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(step,{x:5.7,y:1.84+i*0.5,w:3.68,h:0.26,fontSize:9.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });

  // Bottom stat
  s.addShape(R,{x:0.42,y:4.74,w:9.16,h:0.3,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('Same accuracy. 99.9% faster. Zero SQL knowledge required.',
    {x:0.58,y:4.76,w:9.0,h:0.26,fontSize:9.5,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.5  ·  NL Querying: 2 days → 3 seconds',18,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 19 — VARIANCE RCA BEFORE / AFTER
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.5','Variance RCA — Before and After');

  crd(s,0.42,1.06,4.4,3.62,{accent:A.red,bg:'fdf5f5'});
  s.addText('BEFORE',{x:0.62,y:1.12,w:4.0,h:0.3,fontSize:12,bold:true,color:A.red,fontFace:F,margin:0});
  s.addText('Total time: 2–3 days per close',{x:0.62,y:1.44,w:4.0,h:0.26,fontSize:9,bold:true,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:0.62,y:1.74,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const before24=[
    'Pull actuals from Redshift (write SQL)',
    'Pull plan from EPM (separate system)',
    'Build pivot table in Excel',
    'Rank variances manually by magnitude',
    'Write explanation for each variance',
  ];
  before24.forEach((step,i)=>{
    s.addShape(R,{x:0.62,y:1.82+i*0.42,w:0.28,h:0.28,fill:{color:A.red},line:{color:A.red}});
    s.addText(`${i+1}`,{x:0.62,y:1.82+i*0.42,w:0.28,h:0.28,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(step,{x:0.96,y:1.84+i*0.42,w:3.68,h:0.26,fontSize:9.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });

  crd(s,5.18,1.06,4.4,3.62,{accent:A.ok,bg:'f0faf4'});
  s.addText('AFTER',{x:5.38,y:1.12,w:4.0,h:0.3,fontSize:12,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Total time: 2–3 hours',{x:5.38,y:1.44,w:4.0,h:0.26,fontSize:9,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addShape(R,{x:5.38,y:1.74,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const after24=[
    'Agent runs variance_rca tool',
    'Ranked list returned in 15 minutes',
    'Analyst reviews output and approves',
    'Every finding traceable to mart data',
  ];
  after24.forEach((step,i)=>{
    s.addShape(OV,{x:5.38,y:1.84+i*0.54,w:0.26,h:0.26,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(step,{x:5.7,y:1.84+i*0.54,w:3.68,h:0.26,fontSize:9.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });

  s.addShape(R,{x:0.42,y:4.74,w:9.16,h:0.3,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('2–3 days → 2–3 hours. 16 analyst-hours saved per month. Fully auditable output.',
    {x:0.58,y:4.76,w:9.0,h:0.26,fontSize:9.5,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.5  ·  Variance RCA: 2–3 days → 2–3 hours per close cycle',19,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 20 — MANAGEMENT COMMENTARY BEFORE / AFTER
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.5','Management Commentary — Before and After');

  crd(s,0.42,1.06,4.4,3.62,{accent:A.red,bg:'fdf5f5'});
  s.addText('BEFORE',{x:0.62,y:1.12,w:4.0,h:0.3,fontSize:12,bold:true,color:A.red,fontFace:F,margin:0});
  s.addText('Total time: 1 full working day',{x:0.62,y:1.44,w:4.0,h:0.26,fontSize:9,bold:true,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:0.62,y:1.74,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const before25=[
    'FP&A analyst reads variance analysis output',
    'Writes 4 paragraphs from scratch',
    'First revision round with CFO',
    'Second revision — tone and emphasis',
    'Third revision — formatting and headers',
  ];
  before25.forEach((step,i)=>{
    s.addShape(R,{x:0.62,y:1.82+i*0.42,w:0.28,h:0.28,fill:{color:A.red},line:{color:A.red}});
    s.addText(`${i+1}`,{x:0.62,y:1.82+i*0.42,w:0.28,h:0.28,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(step,{x:0.96,y:1.84+i*0.42,w:3.68,h:0.26,fontSize:9.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });

  crd(s,5.18,1.06,4.4,3.62,{accent:A.ok,bg:'f0faf4'});
  s.addText('AFTER',{x:5.38,y:1.12,w:4.0,h:0.3,fontSize:12,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Total time: 20 minutes',{x:5.38,y:1.44,w:4.0,h:0.26,fontSize:9,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addShape(R,{x:5.38,y:1.74,w:4.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  const after25=[
    'Agent drafts commentary from variance data + mart context',
    'Analyst reviews draft (5 min) — structure already correct',
    'Analyst adds judgment, tone, strategic context (15 min)',
    'CFO receives finished commentary — no revision rounds',
  ];
  after25.forEach((step,i)=>{
    s.addShape(OV,{x:5.38,y:1.84+i*0.54,w:0.26,h:0.26,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(step,{x:5.7,y:1.84+i*0.54,w:3.68,h:0.26,fontSize:9.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
  });

  s.addShape(R,{x:0.42,y:4.74,w:9.16,h:0.3,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('1 full day → 20 minutes. Analyst adds judgment, not formatting. CFO stops editing drafts.',
    {x:0.58,y:4.76,w:9.0,h:0.26,fontSize:9.5,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});
  ftr(s,'Module 3.5  ·  Management Commentary: 1 day → 20 minutes',20,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 21 — THE PATTERN
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 3','MODULE 3.5','The Pattern Across Every Use Case');

  // Value chain — OLD (6 steps, fits 10" with stepW=1.52, gap=0.04)
  s.addText('OLD ANALYST ROLE',{x:0.42,y:1.08,w:9.16,h:0.28,fontSize:8.5,bold:true,color:A.red,fontFace:F,margin:0});
  const oldSteps=['Data Retrieval','Data Cleaning','Calculation','Formatting','Analysis','Insight'];
  const stepW=1.52, stepGap=0.04;
  // total: 0.42 + 6*(1.52+0.04) - 0.04 = 0.42 + 9.36 - 0.04 = 9.74" ✓
  oldSteps.forEach((st,i)=>{
    const x=0.42+i*(stepW+stepGap);
    const isRight=i>=4;
    s.addShape(R,{x,y:1.4,w:stepW,h:0.52,fill:{color:isRight?A.redS:'f3f4f6'},line:{color:isRight?A.red:A.ruleH,pt:1}});
    s.addText(st,{x:x+0.05,y:1.42,w:stepW-0.1,h:0.48,fontSize:8.5,bold:isRight,color:isRight?A.red:A.inkD,fontFace:F,align:'center',valign:'middle',margin:0});
    if(i<5) s.addText('→',{x:x+stepW+0.01,y:1.52,w:0.06,h:0.3,fontSize:8,color:A.inkM,fontFace:F,align:'center',margin:0});
  });

  // Value chain — NEW (4 AI steps + 3 human steps = 7 total)
  // 7*(1.3+0.03) = 9.31" + 0.42 start = 9.73" ✓
  const newStepW=1.3, newStepGap=0.03;
  s.addText('NEW ANALYST ROLE  (AI handles left side)',{x:0.42,y:2.14,w:9.16,h:0.28,fontSize:8.5,bold:true,color:A.ok,fontFace:F,margin:0});
  const aiSteps=['Data Retrieval','Data Cleaning','Calculation','Formatting'];
  const humanSteps=['Analysis','Insight','Decision'];
  aiSteps.forEach((st,i)=>{
    const x=0.42+i*(newStepW+newStepGap);
    s.addShape(R,{x,y:2.46,w:newStepW,h:0.52,fill:{color:'dde9fe'},line:{color:A.brand,pt:1}});
    s.addText(st,{x:x+0.04,y:2.48,w:newStepW-0.08,h:0.48,fontSize:8,color:A.brand,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText('→',{x:x+newStepW+0.01,y:2.58,w:0.04,h:0.3,fontSize:8,color:A.inkM,fontFace:F,align:'center',margin:0});
  });
  humanSteps.forEach((st,i)=>{
    const x=0.42+(4+i)*(newStepW+newStepGap);
    s.addShape(R,{x,y:2.46,w:newStepW,h:0.52,fill:{color:A.okS},line:{color:A.ok,pt:1.5}});
    s.addText(st,{x:x+0.04,y:2.48,w:newStepW-0.08,h:0.48,fontSize:8.5,bold:true,color:A.ok,fontFace:F,align:'center',valign:'middle',margin:0});
    if(i<2) s.addText('→',{x:x+newStepW+0.01,y:2.58,w:0.04,h:0.3,fontSize:8,color:A.inkM,fontFace:F,align:'center',margin:0});
  });

  // AI label spans columns 0-3 (4 * (1.3+0.03) = 5.32 wide), human spans 4-6
  const aiLabelW=4*(newStepW+newStepGap)-newStepGap;  // 5.18"
  const humanLabelX=0.42+4*(newStepW+newStepGap);
  const humanLabelW=3*(newStepW+newStepGap)-newStepGap;  // 3.87"
  s.addShape(R,{x:0.42,y:3.06,w:aiLabelW,h:0.24,fill:{color:'dde9fe'},line:{color:A.brand,pt:0.5}});
  s.addText('AI handles this side',{x:0.42,y:3.06,w:aiLabelW,h:0.24,fontSize:7.5,bold:true,color:A.brand,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(R,{x:humanLabelX,y:3.06,w:humanLabelW,h:0.24,fill:{color:A.okS},line:{color:A.ok,pt:0.5}});
  s.addText('Analyst owns this side',{x:humanLabelX,y:3.06,w:humanLabelW,h:0.24,fontSize:7.5,bold:true,color:A.ok,fontFace:F,align:'center',valign:'middle',margin:0});

  // Large takeaway
  crd(s,0.42,3.48,9.16,0.88,{accent:A.violet,bg:A.violetS});
  s.addText('The analyst moves from the left side of this chain to the right side. From wrangler to strategist.',
    {x:0.62,y:3.54,w:8.9,h:0.7,fontSize:13,bold:true,color:A.violet,fontFace:F,valign:'middle',margin:0});

  ftr(s,'Module 3.5  ·  AI takes the left side. Analyst owns the right side. Every time.',21,TOT);
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE 22 — SECTION 3 RECAP (dark, violet accent)
// ═════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.violet},line:{color:A.violet}});
  s.addText('SECTION 3',{x:0.42,y:0.1,w:9.16,h:0.22,fontSize:7.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Section 3 Complete — The 3-Step Strategy Framework',{x:0.42,y:0.31,w:9.16,h:0.52,fontSize:21,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.88,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});

  const checks=[
    {text:'Step 1 — Identify: Cross-functional discovery · 3 categories (Foundational / Enhancement / Transformational)',color:A.brand},
    {text:'Step 2 — Evaluate: Impact-Feasibility 2×2 matrix · Build Now vs Plan & Scale · Dependency sequencing',color:A.ok},
    {text:'Step 3 — S.T.A.R.T: Scope, Tracking, Assessment, Resources, Timeline · Applied to Variance RCA · CFO-ready one-pager',color:A.violet},
    {text:'Build vs Platform: AWS Bedrock wins on security, customization, speed, and cost for finance AI',color:A.teal},
    {text:'Before/after: Analyst moves from data wrangler to insight reviewer across all 6 use cases — wrangler → strategist',color:A.brand},
  ];
  checks.forEach((item,i)=>{
    const y=1.06+i*0.56;
    s.addShape(R,{x:0.42,y,w:0.32,h:0.32,fill:{color:item.color},line:{color:item.color}});
    s.addText('✓',{x:0.42,y,w:0.32,h:0.32,fontSize:11,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(item.text,{x:0.84,y:y+0.02,w:8.74,h:0.3,fontSize:9,color:A.navI,fontFace:F,margin:0,wrap:false,shrinkText:true});
  });

  // CTA
  s.addShape(R,{x:0.42,y:4.46,w:9.16,h:0.52,fill:{color:A.violet},line:{color:A.violet},shadow:shL()});
  s.addText('Next: Section 4 — Data Foundation  →',{x:0.6,y:4.5,w:9.0,h:0.44,fontSize:14,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});

  ftr(s,'Section 3 complete — 3-step framework: Identify · Evaluate · S.T.A.R.T',22,TOT,true);
}

// ═════════════════════════════════════════════════════════════════════════════
// WRITE FILE
// ═════════════════════════════════════════════════════════════════════════════
pres.writeFile({fileName:OUT}).then(()=>{
  console.log(`Section 3 PPTX written → ${OUT}`);
}).catch(err=>{
  console.error('Error writing PPTX:',err);
  process.exit(1);
});
