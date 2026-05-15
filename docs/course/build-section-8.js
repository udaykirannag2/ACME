"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
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
const F='Calibri', SW=10, TOT=21;
const OUT=path.join(__dirname,'section-8-slides.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Finance AI Agents on AWS — Section 8: Execution: Roadmap, Operating Model, and ROI';
const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;
const sh =()=>({type:'outer',blur:8, offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function hdr(s,sec,mod,title,dark=false){
  s.background={color:dark?A.nav:A.bg};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
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
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0});
      cx+=cw;
    });
  });
}
function modIntro(s,secLabel,modLabel,title,subtitle,n){
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  // Large ghost number
  const ghostNum=modLabel.split('.')[1]||'0';
  s.addText(ghostNum,{x:5.2,y:0.05,w:4.6,h:3.8,fontSize:200,bold:true,color:'131f35',fontFace:F,align:'right',valign:'top',margin:0});
  s.addShape(R,{x:0.55,y:0.8,w:0.06,h:1.4,fill:{color:A.ok},line:{color:A.ok}});
  s.addText(secLabel,{x:0.72,y:0.8,w:4,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText(modLabel,{x:0.72,y:1.04,w:4,h:0.28,fontSize:10,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText(title,{x:0.72,y:1.3,w:5.4,h:1.1,fontSize:24,bold:true,color:A.W,fontFace:F,margin:0});
  if(subtitle) s.addText(subtitle,{x:0.72,y:2.52,w:5.5,h:0.44,fontSize:11,color:A.navI,fontFace:F,margin:0});
  ftr(s,`Section 8  ·  ${modLabel}`,n,true);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — SECTION DIVIDER (dark navy, green accent, list all 5 modules)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.ok},line:{color:A.ok}});
  // Ghost '8'
  s.addText('8',{x:5.2,y:0.05,w:4.6,h:3.8,fontSize:230,bold:true,color:'131f35',fontFace:F,align:'right',valign:'top',margin:0});
  // Left accent bar
  s.addShape(R,{x:0.55,y:0.68,w:0.06,h:1.7,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('SECTION  ·  FINAL',{x:0.72,y:0.68,w:4.5,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Execution:\nRoadmap, Operating\nModel & ROI',{x:0.72,y:0.94,w:5.4,h:1.4,fontSize:28,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('45 min  ·  5 modules  ·  20 slides',{x:0.72,y:2.4,w:4.5,h:0.3,fontSize:9.5,color:A.navM,fontFace:F,margin:0});

  // Module list — 5 items, single column
  const mods=[
    '8.1  Your First 90 Days',
    '8.2  Operating Model',
    '8.3  Pitfalls and How to Avoid Them',
    '8.4  Measuring ROI',
    '8.5  Course Conclusion',
  ];
  mods.forEach((m,i)=>{
    s.addShape(OV,{x:0.55,y:2.88+i*0.43,w:0.12,h:0.12,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(m,{x:0.76,y:2.80+i*0.43,w:4.8,h:0.36,fontSize:9.5,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  // Bottom badge — "The final section"
  crd(s,0.42,4.94,9.16,0.28,{bg:'0d1e35',border:'1a3a55'});
  s.addText('This is the section that turns knowledge into action. You leave here ready to ship.',
    {x:0.6,y:4.96,w:8.8,h:0.24,fontSize:8.5,italic:true,color:A.ok,fontFace:F,align:'center',margin:0});

  ftr(s,'Section 8  ·  Execution',1,true);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The Sequencing Principle
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.1 — Your First 90 Days','The Sequencing Principle');

  // Main principle banner
  crd(s,0.42,1.06,9.16,1.0,{accent:A.ok,bg:A.okS,border:A.ok,shadow:shL()});
  s.addText('Build value before complexity.',{x:0.62,y:1.12,w:8.7,h:0.38,fontSize:20,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Get a demo-able win at 6 weeks. The CFO checkpoint at week 8 is your project\'s survival gate.',
    {x:0.62,y:1.50,w:8.7,h:0.5,fontSize:10,color:A.inkS,fontFace:F,margin:0});

  // Three milestone callouts
  const milestones=[
    {week:'Week 6',label:'Demo Day',body:'CFO asks a question.\nAgent answers in < 5 seconds.\nProject gets buy-in.',c:A.ok},
    {week:'Week 8',label:'CFO Checkpoint',body:'Variance RCA shown live.\nFP&A team validates output.\nProject cleared for Month 3.',c:A.brand},
    {week:'Week 12',label:'Production Gate',body:'CFO downloads AI-generated\nboard pack. Project approved\nfor full production rollout.',c:A.violet},
  ];
  milestones.forEach((m,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,2.22,2.9,2.76,{accent:m.c,shadow:shL()});
    s.addText(m.week,{x:x+0.14,y:2.28,w:2.6,h:0.26,fontSize:8.5,bold:true,color:m.c,fontFace:F,margin:0});
    s.addText(m.label,{x:x+0.14,y:2.52,w:2.6,h:0.42,fontSize:16,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:2.96,w:2.6,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(m.body,{x:x+0.14,y:3.02,w:2.6,h:0.76,fontSize:9,color:A.inkS,fontFace:F,margin:0});
    // Milestone flag icon
    s.addShape(OV,{x:x+2.52,y:2.28,w:0.24,h:0.24,fill:{color:m.c},line:{color:m.c}});
    s.addText('!',{x:x+2.52,y:2.28,w:0.24,h:0.24,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    // Arrow between cards
    if(i<2){
      s.addText('→',{x:x+2.9+0.06,y:3.4,w:0.18,h:0.36,fontSize:16,color:A.inkM,fontFace:F,align:'center',margin:0});
    }
  });

  // Bottom principle
  crd(s,0.42,5.06,9.16,0.2,{bg:A.okS,border:A.ok});
  s.addText('Rule: if the CFO can\'t see value by week 8, the project is at risk. Sequence accordingly.',
    {x:0.6,y:5.07,w:8.8,h:0.19,fontSize:8,italic:true,color:A.ok,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 8.1  ·  Your First 90 Days',2);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Phase 1–10 Roadmap (The Build Map)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.1 — Your First 90 Days','The 10-Phase Build Map — Sequenced for Maximum Value');

  // Month band headers
  const bands=[
    {label:'MONTH 1  ·  Days 1–30',x:0.42,w:2.92,c:A.ok},
    {label:'MONTH 2  ·  Days 31–60',x:3.54,w:2.92,c:A.brand},
    {label:'MONTH 3  ·  Days 61–90',x:6.66,w:2.92,c:A.violet},
  ];
  bands.forEach(b=>{
    s.addShape(R,{x:b.x,y:1.06,w:b.w,h:0.34,fill:{color:b.c},line:{color:b.c}});
    s.addText(b.label,{x:b.x+0.1,y:1.06,w:b.w-0.2,h:0.34,fontSize:8,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
  });

  // Phase rows
  const phases=[
    {n:'1',title:'Redshift + S3',note:'Workgroup, database, schema',m:0},
    {n:'2',title:'dbt Staging',note:'stg_erp__gl_entries, invoices, subscriptions',m:0},
    {n:'3',title:'dbt Intermediate',note:'int_revenue, int_arr_movements',m:0},
    {n:'4',title:'dbt Marts',note:'mart_pl, fct_arr, mart_ar_aging',m:0},
    {n:'5',title:'FastAPI Skeleton',note:'/health, /metrics/* endpoints',m:0},
    {n:'6',title:'Bedrock Agent + text_to_sql',note:'⭐ CFO CHECKPOINT — demo NL querying here',m:1,star:true},
    {n:'7',title:'AgentCore Gateway',note:'All 5 Lambda tools registered',m:1},
    {n:'8',title:'AgentCore Memory',note:'SEMANTIC strategy, cross-session recall',m:1},
    {n:'9',title:'Commentary',note:'/commentary — 4-paragraph CFO narrative',m:2},
    {n:'10',title:'Board Pack',note:'/boardpack — PDF with P&L, ARR, AR aging',m:2},
  ];
  const mX=[0.42,3.54,6.66];
  const mW=2.92;
  const mCounts=[0,0,0];
  phases.forEach((p)=>{
    const col=p.m;
    const row=mCounts[col];
    const x=mX[col]+0.08;
    const y=1.52+row*0.38;
    const bg=p.star?A.okS:A.card;
    const border=p.star?A.ok:A.rule;
    s.addShape(R,{x,y,w:mW-0.16,h:0.34,fill:{color:bg},line:{color:border,pt:p.star?1.5:0.5}});
    s.addText(`Ph ${p.n}`,{x:x+0.06,y:y+0.04,w:0.48,h:0.26,fontSize:7.5,bold:true,color:p.star?A.ok:A.brand,fontFace:F,valign:'middle',margin:0});
    s.addText(p.title,{x:x+0.56,y:y+0.04,w:mW-0.8,h:0.14,fontSize:8,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(p.note,{x:x+0.56,y:y+0.17,w:mW-0.8,h:0.14,fontSize:6.5,color:p.star?A.ok:A.inkD,fontFace:F,margin:0});
    mCounts[col]++;
  });

  // Bottom callout
  crd(s,0.42,4.98,9.16,0.22,{bg:A.okS,border:A.ok});
  s.addText('Phase 6 is your survival checkpoint. NL querying works → CFO is convinced → project cleared for Phases 7–10.',
    {x:0.6,y:4.99,w:8.8,h:0.2,fontSize:8,italic:true,color:A.ok,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 8.1  ·  Your First 90 Days',4);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Month 1: Data Foundation + NL Query (Days 1–30)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.1 — Your First 90 Days','Month 1 (Days 1–30): Data Foundation + NL Query');

  // Month badge
  crd(s,0.42,1.06,9.16,0.48,{accent:A.ok,bg:'e8f5ee',border:A.ok});
  s.addText('MONTH 1  ·  DAYS 1–30',{x:0.62,y:1.12,w:3,h:0.26,fontSize:9,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Goal: CFO asks a question, gets an answer in < 5 seconds.',
    {x:3.8,y:1.12,w:5.6,h:0.26,fontSize:9,italic:true,color:A.inkS,fontFace:F,margin:0});

  // Two week blocks
  const weeks=[
    {
      label:'Weeks 1–2',
      title:'Data Foundation',
      tasks:[
        'Provision Amazon Redshift Serverless (< 1 day)',
        'Clone dbt project, configure profiles.yml',
        'Run dbt run — validate mart_pl, mart_budget_vs_actual',
        'Confirm NULL counts in all dimension columns = 0',
        'Load 3 years of actuals + 1 year budget data',
      ],
      c:A.ok,
    },
    {
      label:'Weeks 3–4',
      title:'NL Query: Bedrock Agent + text_to_sql',
      tasks:[
        'Deploy text_to_sql Lambda with schema injection',
        'Configure Bedrock Agent (Claude 3 Sonnet)',
        'Build FastAPI /chat endpoint',
        'Connect to Streamlit Finance AI interface',
        'Golden query test: 10 questions, 10 correct answers',
      ],
      c:A.brand,
    },
  ];

  weeks.forEach((wk,i)=>{
    const x=0.42+i*4.7;
    crd(s,x,1.66,4.46,3.3,{accent:wk.c,shadow:shL()});
    s.addText(wk.label,{x:x+0.14,y:1.72,w:4.1,h:0.24,fontSize:8.5,bold:true,color:wk.c,fontFace:F,margin:0});
    s.addText(wk.title,{x:x+0.14,y:1.94,w:4.1,h:0.36,fontSize:13,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:2.34,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    wk.tasks.forEach((t,ti)=>{
      s.addShape(OV,{x:x+0.14,y:2.42+ti*0.4,w:0.12,h:0.12,fill:{color:wk.c},line:{color:wk.c}});
      s.addText(t,{x:x+0.32,y:2.38+ti*0.4,w:3.8,h:0.34,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
  });

  // Milestone card
  crd(s,0.42,5.04,9.16,0.22,{accent:A.ok,bg:A.okS,border:A.ok});
  s.addText('Month 1 Milestone:',{x:0.62,y:5.07,w:1.8,h:0.19,fontSize:8.5,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('CFO types "What was EMEA revenue in Q3?" → Agent answers in 4.2 seconds. CFO says "that\'s remarkable."',
    {x:2.5,y:5.07,w:6.9,h:0.19,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});

  ftr(s,'Module 8.1  ·  Your First 90 Days',4);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Month 2: Analysis Tools + Memory (Days 31–60)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.1 — Your First 90 Days','Month 2 (Days 31–60): Analysis Tools + Memory');

  // Month badge
  crd(s,0.42,1.06,9.16,0.48,{accent:A.brand,bg:A.brandS,border:A.brand});
  s.addText('MONTH 2  ·  DAYS 31–60',{x:0.62,y:1.12,w:3,h:0.26,fontSize:9,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('Goal: "What drove EMEA variance?" answered in 15 min instead of 2 days.',
    {x:3.8,y:1.12,w:5.6,h:0.26,fontSize:9,italic:true,color:A.inkS,fontFace:F,margin:0});

  const weeks=[
    {
      label:'Weeks 5–6',
      title:'Variance RCA + What-If',
      tasks:[
        'Build variance_rca Lambda (entity, period, dimension)',
        'Build whatif_sim Lambda (revenue lever modeling)',
        'Deploy AgentCore Gateway for tool routing',
        'Register both tools in Bedrock Agent action group',
        'QA: run 5 variance scenarios, validate vs manual Excel',
      ],
      c:A.brand,
    },
    {
      label:'Weeks 7–8',
      title:'AgentCore Memory + CFO Checkpoint',
      tasks:[
        'Enable AgentCore Memory Store (session persistence)',
        'Test cross-session recall: "You asked about EMEA last week…"',
        'CFO checkpoint demo — live variance RCA walkthrough',
        'Collect FP&A team feedback, iterate on output format',
        'Document known limitations before Month 3',
      ],
      c:A.ok,
    },
  ];

  weeks.forEach((wk,i)=>{
    const x=0.42+i*4.7;
    crd(s,x,1.66,4.46,3.3,{accent:wk.c,shadow:shL()});
    s.addText(wk.label,{x:x+0.14,y:1.72,w:4.1,h:0.24,fontSize:8.5,bold:true,color:wk.c,fontFace:F,margin:0});
    s.addText(wk.title,{x:x+0.14,y:1.94,w:4.1,h:0.36,fontSize:13,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:2.34,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    wk.tasks.forEach((t,ti)=>{
      s.addShape(OV,{x:x+0.14,y:2.42+ti*0.4,w:0.12,h:0.12,fill:{color:wk.c},line:{color:wk.c}});
      s.addText(t,{x:x+0.32,y:2.38+ti*0.4,w:3.8,h:0.34,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
  });

  // Milestone
  crd(s,0.42,5.04,9.16,0.22,{accent:A.brand,bg:A.brandS,border:A.brand});
  s.addText('Month 2 Milestone:',{x:0.62,y:5.07,w:1.8,h:0.19,fontSize:8.5,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('"What drove EMEA variance in October?" → Full root cause breakdown in 14 minutes. FP&A team validates: 100% accurate.',
    {x:2.5,y:5.07,w:6.9,h:0.19,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});

  ftr(s,'Module 8.1  ·  Your First 90 Days',6);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Month 3: Board-Ready Deliverables (Days 61–90)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.1 — Your First 90 Days','Month 3 (Days 61–90): Board-Ready Deliverables');

  // Month badge
  crd(s,0.42,1.06,9.16,0.48,{accent:A.violet,bg:A.violetS,border:A.violet});
  s.addText('MONTH 3  ·  DAYS 61–90',{x:0.62,y:1.12,w:3,h:0.26,fontSize:9,bold:true,color:A.violet,fontFace:F,margin:0});
  s.addText('Goal: CFO downloads a board pack generated entirely by AI. Project approved for production.',
    {x:3.8,y:1.12,w:5.6,h:0.26,fontSize:9,italic:true,color:A.inkS,fontFace:F,margin:0});

  const weeks=[
    {
      label:'Weeks 9–10',
      title:'Commentary Engine',
      tasks:[
        'Build /commentary endpoint (entity, period, tone)',
        'Add Commentary tab to Streamlit Finance AI',
        'Human-in-the-loop review workflow (approve/edit/reject)',
        'Integrate variance narrative into commentary output',
        'Test with 3 FP&A analysts: iterate on tone & format',
      ],
      c:A.violet,
    },
    {
      label:'Weeks 11–12',
      title:'Board Pack + E2E Validation',
      tasks:[
        'Build /boardpack endpoint (multi-entity PDF assembly)',
        'PDF download with ACME Finance branding',
        'End-to-end regression test suite (20 golden queries)',
        'CloudWatch dashboard: latency, tool call audit log',
        'CFO sign-off demo — full board pack in one session',
      ],
      c:A.ok,
    },
  ];

  weeks.forEach((wk,i)=>{
    const x=0.42+i*4.7;
    crd(s,x,1.66,4.46,3.3,{accent:wk.c,shadow:shL()});
    s.addText(wk.label,{x:x+0.14,y:1.72,w:4.1,h:0.24,fontSize:8.5,bold:true,color:wk.c,fontFace:F,margin:0});
    s.addText(wk.title,{x:x+0.14,y:1.94,w:4.1,h:0.36,fontSize:13,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:2.34,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    wk.tasks.forEach((t,ti)=>{
      s.addShape(OV,{x:x+0.14,y:2.42+ti*0.4,w:0.12,h:0.12,fill:{color:wk.c},line:{color:wk.c}});
      s.addText(t,{x:x+0.32,y:2.38+ti*0.4,w:3.8,h:0.34,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
  });

  // Milestone
  crd(s,0.42,5.04,9.16,0.22,{accent:A.ok,bg:A.okS,border:A.ok});
  s.addText('Month 3 Milestone:',{x:0.62,y:5.07,w:1.8,h:0.19,fontSize:8.5,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('CFO downloads AI-generated board pack. Signs project charter for production deployment. Your 90 days are complete.',
    {x:2.5,y:5.07,w:6.9,h:0.19,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});

  ftr(s,'Module 8.1  ·  Your First 90 Days',6);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — 8.2 Module Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Section 8','8.2','The Team and the\nChange Management\nChallenge','Who does what — and how to handle the "AI will take my job" conversation',7);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Team Structure
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.2 — Operating Model','The Three Roles You Cannot Ship Without');

  // Three role cards
  const roles=[
    {
      title:'Solution Architect',
      icon:'SA',
      owns:['AWS service design & configuration','Bedrock Agent orchestration','Lambda tool development','AgentCore Gateway & Memory','Security, VPC, IAM'],
      note:'You. The person who took this course.',
      c:A.brand,
    },
    {
      title:'Analytics Engineer',
      icon:'AE',
      owns:['dbt models & transformations','Amazon Redshift data quality','mart_pl, mart_budget_vs_actual','Schema documentation for text_to_sql','NULL validation & data contracts'],
      note:'Often already on the data team.',
      c:A.teal,
    },
    {
      title:'Finance Champion',
      icon:'FC',
      owns:['FP&A manager or senior analyst','Validates every agent output','Owns the use case business logic','Signs off before board submission','Bridges tech team ↔ CFO'],
      note:'The most critical hire. Without them, the project fails.',
      c:A.ok,
    },
  ];

  roles.forEach((r,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,1.06,2.92,4.1,{accent:r.c,shadow:shL()});
    // Role badge
    s.addShape(OV,{x:x+0.14,y:1.12,w:0.56,h:0.56,fill:{color:r.c},line:{color:r.c}});
    s.addText(r.icon,{x:x+0.14,y:1.12,w:0.56,h:0.56,fontSize:11,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(r.title,{x:x+0.8,y:1.18,w:1.9,h:0.44,fontSize:12,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:1.74,w:2.64,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    r.owns.forEach((o,oi)=>{
      s.addShape(OV,{x:x+0.14,y:1.84+oi*0.38,w:0.1,h:0.1,fill:{color:r.c},line:{color:r.c}});
      s.addText(o,{x:x+0.3,y:1.80+oi*0.38,w:2.48,h:0.32,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
    // Note at bottom
    crd(s,x+0.08,4.68,2.76,0.38,{bg:r.c==='1a8754'?A.okS:r.c==='3093a8'?A.tealS:A.brandS,border:r.c,accent:undefined});
    s.addText(r.note,{x:x+0.14,y:4.72,w:2.7,h:0.32,fontSize:7.5,italic:true,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // Bottom rule
  crd(s,0.42,5.04,9.16,0.22,{accent:A.ok,bg:A.okS,border:A.ok});
  s.addText('"You need all three. The Finance Champion is not optional — they\'re the reason the CFO trusts the output."',
    {x:0.6,y:5.07,w:8.8,h:0.19,fontSize:8.5,italic:true,color:A.ok,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 8.2  ·  Operating Model',10);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Change Management Reality
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.2 — Operating Model','The Change Management Reality: Three Fears, Three Answers');

  const fears=[
    {
      fear:'"The AI will make up numbers."',
      answer:'Address it with evidence.',
      detail:'Show golden query validation. Every response includes source attribution: which mart, which rows, which SQL. The agent doesn\'t guess — it queries clean data.',
      c:A.red,
    },
    {
      fear:'"My job is at risk."',
      answer:'Reframe, don\'t dismiss.',
      detail:'The analyst no longer builds the pivot table. The analyst now owns the variance narrative. That\'s a promotion in impact, not a reduction in headcount.',
      c:A.warn,
    },
    {
      fear:'"Who\'s responsible when the AI is wrong?"',
      answer:'Clear accountability chain.',
      detail:'The human who approved the output is responsible. Agent outputs require sign-off before board submission. The AI drafts. The analyst owns.',
      c:A.brand,
    },
  ];

  fears.forEach((f,i)=>{
    const y=1.06+i*1.38;
    crd(s,0.42,y,9.16,1.28,{accent:f.c,shadow:sh()});
    // Fear label
    s.addText('FEAR',{x:0.62,y:y+0.08,w:0.7,h:0.24,fontSize:7,bold:true,color:f.c,fontFace:F,margin:0});
    s.addText(f.fear,{x:0.62,y:y+0.30,w:3.8,h:0.38,fontSize:13,bold:true,color:A.ink,fontFace:F,margin:0});
    // Divider
    s.addShape(R,{x:4.6,y:y+0.12,w:0.015,h:1.04,fill:{color:A.ruleH},line:{color:A.ruleH}});
    // Answer
    s.addText('ANSWER',{x:4.72,y:y+0.08,w:1.2,h:0.24,fontSize:7,bold:true,color:f.c,fontFace:F,margin:0});
    s.addText(f.answer,{x:4.72,y:y+0.30,w:4.6,h:0.28,fontSize:10.5,bold:true,color:f.c,fontFace:F,margin:0});
    s.addText(f.detail,{x:4.72,y:y+0.60,w:4.62,h:0.56,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });

  ftr(s,'Module 8.2  ·  Operating Model',10);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — The Champion Conversation
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.2 — Operating Model','Finding Your Finance Champion');

  // Main quote
  crd(s,0.42,1.06,9.16,2.2,{accent:A.ok,bg:A.okS,border:A.ok,shadow:shL()});
  s.addText('“',{x:0.52,y:1.0,w:0.8,h:1.0,fontSize:72,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('Find the FP&A analyst who spends 3 days a month building variance pivot tables and hates it.\nThat person is your champion. Show them variance_rca.\nThe room changes.',
    {x:1.0,y:1.22,w:8.0,h:1.6,fontSize:16,bold:true,color:A.ink,fontFace:F,margin:0});

  // How to find them
  s.addText('How to identify the champion:',{x:0.42,y:3.46,w:4.0,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const signals=[
    'Complains loudest about "data not being ready" at month-end',
    'Sends "corrected version" emails at least once per cycle',
    'Has a private Excel workbook with 47 named ranges',
    'Says "I know the number is wrong but I can\'t prove it until next week"',
    'Has asked IT for data access and waited 3+ weeks',
  ];
  signals.forEach((sig,i)=>{
    s.addShape(OV,{x:0.42,y:3.86+i*0.34,w:0.14,h:0.14,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(sig,{x:0.64,y:3.82+i*0.34,w:4.4,h:0.3,fontSize:9,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // What to show them
  crd(s,5.3,3.42,4.3,2.4,{accent:A.brand,shadow:shL()});
  s.addText('What to show them first:',{x:5.44,y:3.48,w:3.9,h:0.28,fontSize:9.5,bold:true,color:A.brand,fontFace:F,margin:0});
  const show=[
    'Live NL query — their most painful monthly question',
    'variance_rca on their entity, last month\'s actuals',
    'The 15-minute number (vs their 3 days)',
    'Show source SQL — "it queried mart_pl directly"',
  ];
  show.forEach((sh2,i)=>{
    s.addShape(OV,{x:5.44,y:3.86+i*0.44,w:0.12,h:0.12,fill:{color:A.brand},line:{color:A.brand}});
    s.addText(sh2,{x:5.64,y:3.82+i*0.44,w:3.78,h:0.38,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  ftr(s,'Module 8.2  ·  Operating Model',10);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — 8.3 Module Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Section 8','8.3','What Separates Teams\nThat Ship From\nTeams That Stall','Five pitfalls that kill finance AI projects — and how to avoid every one',11);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — The 5 Pitfalls
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.3 — Pitfalls','The 5 Pitfalls That Kill Finance AI Projects');

  const pitfalls=[
    {
      n:'1',
      title:'Data Not Ready',
      problem:'Marts don\'t exist. NULLs in dimensions. No agreed variance formula.',
      fix:'AI Readiness Assessment (Section 4.5) before any AI work. No mart = no agent.',
      c:A.red,
    },
    {
      n:'2',
      title:'No Finance Champion',
      problem:'Tech team builds something finance doesn\'t trust. Usage is zero.',
      fix:'Recruit the finance champion before writing a line of code.',
      c:A.warn,
    },
    {
      n:'3',
      title:'Prompt Drift',
      problem:'System prompt updated. Golden queries start failing silently. No one notices.',
      fix:'Automated regression test on every deploy. CI/CD gate: 0 regressions allowed.',
      c:A.orange,
    },
    {
      n:'4',
      title:'Over-Promising Timeline',
      problem:'"We\'ll have NL querying AND board packs in 4 weeks." You won\'t.',
      fix:'The 90-day plan. Phased milestones. Never commit all deliverables upfront.',
      c:A.violet,
    },
    {
      n:'5',
      title:'No Audit Trail',
      problem:'CFO asks "how did the agent get this number?" Nobody knows.',
      fix:'Tool call logging in CloudWatch. AgentCore Memory stores every Q&A. Always.',
      c:A.teal,
    },
  ];

  const colW=1.82;
  pitfalls.forEach((p,i)=>{
    const x=0.42+i*1.88;
    crd(s,x,1.06,colW,4.2,{accent:p.c,shadow:sh()});
    // Number badge
    s.addShape(OV,{x:x+0.14,y:1.12,w:0.5,h:0.5,fill:{color:p.c},line:{color:p.c}});
    s.addText(p.n,{x:x+0.14,y:1.12,w:0.5,h:0.5,fontSize:14,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(p.title,{x:x+0.08,y:1.68,w:colW-0.16,h:0.46,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
    // Problem
    s.addText('PROBLEM',{x:x+0.08,y:2.2,w:colW-0.16,h:0.2,fontSize:7,bold:true,color:p.c,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.08,y:2.38,w:colW-0.16,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(p.problem,{x:x+0.08,y:2.4,w:colW-0.16,h:0.78,fontSize:8,color:A.inkS,fontFace:F,margin:0});
    // Fix
    s.addText('FIX',{x:x+0.08,y:3.24,w:colW-0.16,h:0.2,fontSize:7,bold:true,color:A.ok,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.08,y:3.42,w:colW-0.16,h:0.015,fill:{color:A.okS},line:{color:A.okS}});
    s.addText(p.fix,{x:x+0.08,y:3.44,w:colW-0.16,h:0.72,fontSize:8,color:A.inkS,fontFace:F,margin:0});
  });

  ftr(s,'Module 8.3  ·  Pitfalls',13);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — The Survival Rule
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.3 — Pitfalls','The One Rule That Keeps Projects Alive');

  // Main rule card
  crd(s,0.42,1.06,9.16,2.4,{accent:A.ok,bg:'f0fbf5',border:A.ok,shadow:shL()});
  s.addText('THE SURVIVAL RULE',{x:0.62,y:1.14,w:8.8,h:0.28,fontSize:8.5,bold:true,color:A.ok,fontFace:F,align:'center',margin:0});
  s.addText('“Ship something the CFO can use in 60 days.',{x:0.62,y:1.46,w:8.8,h:0.52,fontSize:18,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('An imperfect NL query interface that works is worth 10×\na perfect system that\'s still being built.”',
    {x:0.62,y:2.0,w:8.8,h:0.98,fontSize:15,color:A.inkS,fontFace:F,italic:true,align:'center',margin:0});

  // The corollary cards
  s.addText('What this means in practice:',{x:0.42,y:3.62,w:4.5,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});

  const corollaries=[
    {title:'Done is better than perfect',body:'A working demo with 3 known limitations is infinitely more persuasive than a roadmap slide.',c:A.ok},
    {title:'Milestones protect the project',body:'Each 30-day milestone gives leadership a reason to continue funding. No milestone = no budget.',c:A.brand},
    {title:'Imperfect + improving > perfect + delayed',body:'Finance teams trust systems that improve in front of them more than promises about future state.',c:A.violet},
  ];
  corollaries.forEach((co,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,4.0,2.9,1.2,{accent:co.c,shadow:sh()});
    s.addText(co.title,{x:x+0.14,y:4.06,w:2.6,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(co.body,{x:x+0.14,y:4.36,w:2.6,h:0.6,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });

  ftr(s,'Module 8.3  ·  Pitfalls',13);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — 8.4 Module Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Section 8','8.4','How to Know\nIf It\'s Working','The ROI scorecard that justifies continued investment — and expansion',14);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — The ROI Scorecard
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.4 — Measuring ROI','The ROI Scorecard: Baseline → Target');

  const rows=[
    ['Metric','Baseline (Manual)','AI Target','Reduction','How to Measure'],
    ['Hours saved per analyst/month','40 hrs','8 hrs','80%','Analyst time log (before/after)'],
    ['Variance cycle time','3 days','4 hours','85%','Close date → variance report date'],
    ['Commentary draft time','8 hours','45 min','91%','FP&A team log, sampled per cycle'],
    ['Board pack turnaround','3 days','Same day','97%','Date range: close to CFO receipt'],
    ['Data errors in reports','8%','0%','100%','AI queries mart directly — no copy-paste'],
  ];
  const cols=[2.7,1.8,1.6,1.1,2.0];
  tbl(s,rows,cols,0.42,1.06,{rh:0.44});

  // KPI summary
  kpi(s,0.42,3.98,2.1,1.1,'Time Saved (Variance)','85%','3 days → 4 hours',A.ok);
  kpi(s,2.68,3.98,2.1,1.1,'Commentary Speed','91%','8 hrs → 45 minutes',A.brand);
  kpi(s,4.94,3.98,2.1,1.1,'Error Rate','0%','Mart queries are deterministic',A.teal);
  kpi(s,7.2,3.98,2.5,1.1,'Board Pack','Same day','Was 3 days. Now done before lunch.',A.violet);

  // Tie-back note
  crd(s,0.42,5.16,9.16,0.18,{bg:A.okS,border:A.ok});
  s.addText('Tied to Section 3 Business Case. These are the numbers you promised the CFO. Now you can prove them.',
    {x:0.6,y:5.18,w:8.8,h:0.16,fontSize:7.5,italic:true,color:A.ok,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 8.4  ·  Measuring ROI',17);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — How to Measure
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.4 — Measuring ROI','How to Capture the Data: Three Simple Methods');

  const methods=[
    {
      title:'Time Tracking',
      icon:'T',
      when:'Before and after deployment',
      how:[
        'Ask analysts to log time for 2 weeks pre-launch',
        'Repeat for 2 weeks at Month 1, Month 3, Month 6',
        'Categories: data pull, variance analysis, commentary, formatting',
        'Tool: existing project management tool (Jira, Asana, Notion)',
      ],
      metric:'Hours saved per analyst per month',
      c:A.brand,
    },
    {
      title:'Cycle Time',
      icon:'C',
      when:'Every reporting cycle',
      how:[
        'Record: close date (finance books close)',
        'Record: date variance report delivered to CFO',
        'Record: date board pack received by board members',
        'Calculate delta — no special tooling needed',
      ],
      metric:'Cycle time: close → report → board delivery',
      c:A.ok,
    },
    {
      title:'CFO Satisfaction',
      icon:'S',
      when:'End of each quarter',
      how:[
        'Simple 5-question survey, 1–5 scale',
        'Questions: accuracy, speed, trust, usefulness, recommendation',
        'Collect via email or Typeform — 5 minutes to complete',
        'Track trend over 4 quarters: aim for 4.2+ by Q4',
      ],
      metric:'CFO satisfaction score (track quarterly)',
      c:A.violet,
    },
  ];

  methods.forEach((m,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,1.06,2.92,4.14,{accent:m.c,shadow:shL()});
    s.addShape(OV,{x:x+0.14,y:1.12,w:0.52,h:0.52,fill:{color:m.c},line:{color:m.c}});
    s.addText(m.icon,{x:x+0.14,y:1.12,w:0.52,h:0.52,fontSize:13,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(m.title,{x:x+0.76,y:1.18,w:2.0,h:0.44,fontSize:13,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(m.when,{x:x+0.14,y:1.68,w:2.64,h:0.24,fontSize:8,italic:true,color:A.inkD,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:1.9,w:2.64,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    m.how.forEach((h,hi)=>{
      s.addShape(OV,{x:x+0.14,y:2.0+hi*0.4,w:0.1,h:0.1,fill:{color:m.c},line:{color:m.c}});
      s.addText(h,{x:x+0.3,y:1.96+hi*0.4,w:2.48,h:0.34,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
    // Metric tag at bottom
    crd(s,x+0.08,4.64,2.76,0.42,{bg:m.c==='1a8754'?A.okS:m.c==='6c4ad9'?A.violetS:A.brandS,border:m.c});
    s.addText('Measures: '+m.metric,{x:x+0.14,y:4.67,w:2.7,h:0.36,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  ftr(s,'Module 8.4  ·  Measuring ROI',17);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — The 6-Month Conversation
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.4 — Measuring ROI','The Conversation at 6 Months');

  // Main scenario card
  crd(s,0.42,1.06,9.16,2.5,{accent:A.ok,bg:'f0fbf5',border:A.ok,shadow:shL()});
  s.addText('THE 6-MONTH CFO MEETING',{x:0.62,y:1.12,w:8.8,h:0.28,fontSize:8.5,bold:true,color:A.ok,fontFace:F,align:'center',margin:0});
  s.addText('“You walk into the CFO\'s office with 6 months of data.',{x:0.62,y:1.44,w:8.8,h:0.38,fontSize:14,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('Variance cycle time cut by 85%. Commentary draft time cut by 90%.\nBoard pack done same day.',{x:0.62,y:1.84,w:8.8,h:0.52,fontSize:12,color:A.inkS,fontFace:F,italic:true,align:'center',margin:0});
  s.addText('The question stops being “should we invest?”\nand becomes “how do we expand to all entities?””',{x:0.62,y:2.38,w:8.8,h:0.54,fontSize:14,bold:true,color:A.ok,fontFace:F,align:'center',margin:0});

  // Expansion options
  s.addText('What “expand to all entities” looks like:',{x:0.42,y:3.72,w:5.0,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const expands=[
    {title:'More Entities',body:'Roll out to EU, APAC, LATAM entities — same infrastructure, new Redshift schemas.',c:A.brand},
    {title:'More Users',body:'CFO → FP&A team → BU heads → board members. AgentCore Identity handles multi-tenant.',c:A.teal},
    {title:'More Tools',body:'Add budget reforecast Lambda, headcount planning Lambda, cash flow analysis Lambda.',c:A.violet},
  ];
  expands.forEach((e,i)=>{
    const x=0.42+i*3.12;
    crd(s,x,4.1,2.9,1.08,{accent:e.c,shadow:sh()});
    s.addText(e.title,{x:x+0.14,y:4.16,w:2.6,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(e.body,{x:x+0.14,y:4.46,w:2.6,h:0.56,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });

  ftr(s,'Module 8.4  ·  Measuring ROI',17);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 17 — 8.5 Module Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Section 8','8.5','What You\'ve\nBuilt','The final module — a complete picture of the journey and where it takes you',18);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 18 — The Journey Recap
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.5 — Course Conclusion','8 Sections. One Complete Transformation.');

  const sections=[
    {n:'S1',title:'The Live Demo',detail:'Saw it working. Understood what\'s possible.',c:A.brand},
    {n:'S2',title:'Finance for Architects',detail:'The vocabulary, the reports, the CFO\'s world.',c:A.teal},
    {n:'S3',title:'Strategy & Business Case',detail:'Use case portfolio. $1.9M problem. ROI model.',c:A.violet},
    {n:'S4',title:'Data Foundation',detail:'Redshift + dbt + mart design. AI Readiness.',c:A.orange},
    {n:'S5',title:'AWS Architecture',detail:'Bedrock, Lambda, VPC, IAM. The full stack.',c:A.cyan},
    {n:'S6',title:'Agent Design',detail:'Bedrock Agents, AgentCore, tool calling, memory.',c:A.warn},
    {n:'S7',title:'Build the System',detail:'Text-to-SQL, variance RCA, board pack. Working code.',c:A.ok},
    {n:'S8',title:'Execute & Measure',detail:'90-day plan. Operating model. ROI scorecard.',c:A.ok},
  ];

  // Two rows of 4
  sections.forEach((sec,i)=>{
    const row=Math.floor(i/4), col=i%4;
    const x=0.42+col*2.38, y=1.06+row*1.86;
    crd(s,x,y,2.22,1.7,{accent:sec.c,shadow:sh()});
    // Section number badge
    s.addShape(OV,{x:x+0.14,y:y+0.14,w:0.44,h:0.44,fill:{color:sec.c},line:{color:sec.c}});
    s.addText(sec.n,{x:x+0.14,y:y+0.14,w:0.44,h:0.44,fontSize:9.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(sec.title,{x:x+0.68,y:y+0.18,w:1.38,h:0.38,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addShape(R,{x:x+0.14,y:y+0.64,w:1.94,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(sec.detail,{x:x+0.14,y:y+0.7,w:1.94,h:0.76,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });

  // Flow arrows between sections
  for(let i=0;i<3;i++){
    s.addText('→',{x:0.42+i*2.38+2.22+0.04,y:1.76,w:0.12,h:0.28,fontSize:12,color:A.inkM,fontFace:F,align:'center',margin:0});
    s.addText('→',{x:0.42+i*2.38+2.22+0.04,y:3.62,w:0.12,h:0.28,fontSize:12,color:A.inkM,fontFace:F,align:'center',margin:0});
  }

  ftr(s,'Module 8.5  ·  Course Conclusion',20);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 19 — What You've Built: The Checklist
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 8','Module 8.5 — Course Conclusion','What You\'ve Built: The Complete Checklist');

  const checks=[
    {item:'Working ACME Finance system — NL querying, variance RCA, what-if, commentary, board pack',c:A.ok},
    {item:'Architecture patterns you can whiteboard for any CFO in any industry',c:A.ok},
    {item:'Finance domain vocabulary — income statements, variance analysis, FP&A workflows',c:A.ok},
    {item:'Use case prioritization framework — Impact × Complexity matrix, phased delivery',c:A.ok},
    {item:'90-day delivery plan — Month 1, 2, 3 milestones, two-engineer team',c:A.ok},
    {item:'ROI scorecard — baseline metrics, targets, measurement methods',c:A.ok},
    {item:'Production readiness checklist — audit trail, regression tests, human sign-off workflow',c:A.ok},
    {item:'The confidence to say "yes" when a CFO asks "can we build this for us?"',c:A.brand},
  ];

  checks.forEach((ch,i)=>{
    const y=1.06+i*0.52;
    const bg=i===7?A.brandS:'f8fff9';
    const border=i===7?A.brand:A.okS;
    crd(s,0.42,y,9.16,0.46,{bg,border,accent:undefined});
    s.addShape(OV,{x:0.54,y:y+0.1,w:0.26,h:0.26,fill:{color:ch.c},line:{color:ch.c}});
    s.addText('✓',{x:0.54,y:y+0.1,w:0.26,h:0.26,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(ch.item,{x:0.9,y:y+0.04,w:8.5,h:0.38,fontSize:i===7?10.5:9.5,bold:i===7,color:i===7?A.brand:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  ftr(s,'Module 8.5  ·  Course Conclusion',20);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 20 — FINAL SLIDE (dark navy, large callout, clean close — NO footer num)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  // Green accent bar
  s.addShape(R,{x:0,y:0,w:SW,h:0.06,fill:{color:A.ok},line:{color:A.ok}});

  // Ghost text — large decorative 'AI' watermark
  s.addText('AI',{x:4.8,y:-0.2,w:5.5,h:4.0,fontSize:260,bold:true,color:'0d1b2e',fontFace:F,align:'right',valign:'top',margin:0});

  // Left accent bar
  s.addShape(R,{x:0.55,y:0.7,w:0.07,h:3.8,fill:{color:A.ok},line:{color:A.ok}});

  // Top label
  s.addText('COURSE COMPLETE',{x:0.75,y:0.76,w:5.5,h:0.32,fontSize:9.5,bold:true,color:A.ok,fontFace:F,margin:0,letterSpacing:2});

  // Main quote
  s.addText('"The CFOs who deploy this\nin 2025–2026 will expect it\neverywhere by 2028.',{x:0.75,y:1.1,w:6.8,h:2.0,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('You now know\nhow to build it."',{x:0.75,y:3.06,w:6.0,h:1.1,fontSize:26,bold:true,color:A.ok,fontFace:F,margin:0});

  // Divider
  s.addShape(R,{x:0.75,y:4.26,w:5.4,h:0.03,fill:{color:'1e3a55'},line:{color:'1e3a55'}});

  // Three next steps
  const steps=[
    {n:'01',text:'Complete the lab — full system running in your AWS account'},
    {n:'02',text:'Adapt for a client — swap ACME data for their source systems'},
    {n:'03',text:'Expand — AgentCore Identity for multi-tenant, add more Lambda tools'},
  ];
  steps.forEach((st,i)=>{
    s.addShape(R,{x:0.75,y:4.38+i*0.28,w:0.36,h:0.22,fill:{color:A.ok},line:{color:A.ok}});
    s.addText(st.n,{x:0.75,y:4.38+i*0.28,w:0.36,h:0.22,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.text,{x:1.18,y:4.38+i*0.28,w:4.9,h:0.22,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  // Bottom footer strip (no slide number — clean close)
  s.addShape(R,{x:0,y:5.55,w:SW,h:0.07,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('Finance AI Agents on AWS: Build Real Systems for FP&A  ·  udemy.com',
    {x:0.42,y:5.33,w:9.16,h:0.22,fontSize:7.5,color:A.navM,fontFace:F,align:'center',valign:'middle',margin:0});
}

// ── SAVE ─────────────────────────────────────────────────────────────────────
pres.writeFile({fileName:OUT}).then(()=>{
  console.log(`✓ Saved: ${OUT}`);
  console.log(`  Slides: ${TOT}`);
}).catch(err=>{
  console.error('Error writing PPTX:', err);
  process.exit(1);
});
