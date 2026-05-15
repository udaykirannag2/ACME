"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

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
const F='Calibri', SW=10, SH=5.625, TOT=27;
const OUT=path.join(__dirname,'section-2-slides.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Section 2 — Finance Domain and the Problem We\'re Solving';
const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;
const sh=()=>({type:'outer',blur:8,offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

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
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0});
      cx+=cw;
    });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 1 — SECTION DIVIDER (dark navy)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  // Big section number watermark
  s.addText('2',{x:5.5,y:0.1,w:4.2,h:3.8,fontSize:200,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  // Left accent bar
  s.addShape(R,{x:0.55,y:0.75,w:0.06,h:1.6,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('SECTION',{x:0.72,y:0.75,w:3.5,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Finance Domain\n& the Problem\nWe\'re Solving',{x:0.72,y:1.0,w:5.2,h:1.35,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0,lineSpacingMultiple:1.15});
  // Duration badge
  s.addShape(R,{x:0.72,y:2.5,w:1.4,h:0.28,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('~65 min  ·  6 modules',{x:0.72,y:2.5,w:2.8,h:0.28,fontSize:8.5,color:A.W,fontFace:F,valign:'middle',margin:0});

  // Module list
  const mods=[
    '2.0  Finance Basics 101',
    '2.1  CFO Pain Points',
    '2.2  Cost of Inaction',
    '2.3  Why Now?',
    '2.4  Three AI Capabilities',
    '2.5  Maturity Model',
  ];
  mods.forEach((m,i)=>{
    const col=i<3?0:1, row=i<3?i:i-3;
    const tx=0.72+col*4.0, ty=2.95+row*0.42;
    s.addShape(R,{x:tx-0.02,y:ty+0.07,w:0.16,h:0.16,fill:{color:A.teal},line:{color:A.teal}});
    s.addText(m,{x:tx+0.2,y:ty,w:3.6,h:0.36,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  ftr(s,'Section 2  ·  Finance Domain and the Problem We\'re Solving',1,TOT,true);
}

// ══════════════════════════════════════════════════════
// SLIDE 2 — P&L STRUCTURE (Module 2.0)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.0 — Finance Basics 101','Reading a P&L in 5 Minutes');

  // Waterfall bars — left side
  const bars=[
    {label:'Revenue',val:'$1,807.9M',pct:'100%',bg:A.brand,x:0.42,w:3.6},
    {label:'− Cost of Goods Sold',val:'−$406.8M',pct:'22.5%',bg:A.red,x:0.42,w:3.6},
    {label:'= Gross Profit',val:'$1,401.1M',pct:'77.5% GM',bg:A.ok,x:0.42,w:3.6},
    {label:'− Operating Expenses',val:'−$1,571.0M',pct:'86.9%',bg:A.warn,x:0.42,w:3.6},
    {label:'= Operating Income',val:'−$169.9M',pct:'−9.4% OM',bg:A.red,x:0.42,w:3.6},
  ];
  bars.forEach((b,i)=>{
    const y=1.02+i*0.74;
    const isTotal=(i===2||i===4);
    s.addShape(R,{x:b.x,y,w:b.w,h:0.56,fill:{color:b.bg},line:{color:b.bg},shadow:sh()});
    s.addText(b.label,{x:b.x+0.12,y:y+0.04,w:2.0,h:0.22,fontSize:8,color:A.W,fontFace:F,bold:isTotal,margin:0});
    s.addText(b.val,{x:b.x+0.12,y:y+0.26,w:2.0,h:0.24,fontSize:11,bold:true,color:A.W,fontFace:F,margin:0});
    s.addText(b.pct,{x:b.x+2.8,y:y+0.14,w:0.7,h:0.28,fontSize:9.5,bold:isTotal,color:A.W,fontFace:F,align:'right',valign:'middle',margin:0});
  });

  // Right side — OpEx breakdown card
  crd(s,4.3,1.02,5.3,3.68,{accent:A.warn});
  s.addText('OpEx Breakdown',{x:4.5,y:1.1,w:4.9,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const opex=[
    ['Category','Amount','% Rev'],
    ['Sales & Marketing (S&M)','$632.8M','35.0%'],
    ['Research & Development (R&D)','$578.5M','32.0%'],
    ['General & Administrative (G&A)','$359.7M','19.9%'],
    ['Total OpEx','$1,571.0M','86.9%'],
  ];
  tbl(s,opex,[2.0,1.5,0.95],4.46,1.46,{rh:0.4});

  // Key callout
  s.addShape(R,{x:4.3,y:4.05,w:5.3,h:0.58,fill:{color:A.brandS},line:{color:A.brand,pt:1},shadow:sh()});
  s.addText('ACME FY2024: Strong 77.5% gross margin — but heavy investment spending\ncreates a −9.4% operating margin. Classic high-growth SaaS profile.',
    {x:4.42,y:4.08,w:5.06,h:0.52,fontSize:8.5,color:A.brandD,fontFace:F,valign:'middle',margin:0});

  ftr(s,'Module 2.0  ·  Finance Basics 101',2,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 3 — SaaS METRICS (Module 2.0)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.0 — Finance Basics 101','SaaS Metrics That Matter');

  const metrics=[
    {abbr:'ARR',full:'Annual Recurring Revenue',def:'Annualized value of all active subscriptions. The north-star top-line metric for SaaS.',accent:A.brand,val:'$1,807.9M'},
    {abbr:'NRR',full:'Net Revenue Retention',def:'Revenue from existing customers this year vs last. >100% means upsell outpaces churn — growth without new logos.',accent:A.ok,val:'118%'},
    {abbr:'Churn',full:'Logo / Revenue Churn',def:'% of customers (logo churn) or revenue (rev churn) lost in a period. Low churn = durable business.',accent:A.red,val:'4.2% ann.'},
    {abbr:'CAC',full:'Customer Acquisition Cost',def:'Total S&M spend ÷ new customers acquired. Measures sales efficiency.',accent:A.warn,val:'$28.4K'},
    {abbr:'LTV',full:'Lifetime Value',def:'Average ARR per customer × gross margin ÷ churn rate. LTV:CAC > 3× is healthy.',accent:A.violet,val:'$142K'},
  ];

  metrics.forEach((m,i)=>{
    const col=i<3?0:1;
    const row=i<3?i:i-3;
    const x=0.42+col*4.9;
    const y=1.05+row*1.32;
    crd(s,x,y,4.6,1.18,{accent:m.accent});
    s.addText(m.abbr,{x:x+0.18,y:y+0.08,w:1.0,h:0.44,fontSize:22,bold:true,color:m.accent,fontFace:F,margin:0});
    s.addText(m.full,{x:x+0.18,y:y+0.5,w:2.2,h:0.22,fontSize:8,color:A.inkD,fontFace:F,margin:0});
    s.addText(m.val,{x:x+2.6,y:y+0.12,w:1.8,h:0.38,fontSize:18,bold:true,color:A.ink,fontFace:F,align:'right',margin:0});
    s.addText(m.def,{x:x+0.18,y:y+0.72,w:4.3,h:0.38,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
  });

  // Why architects need these
  s.addShape(R,{x:5.32,y:3.58,w:4.28,h:1.54,fill:{color:A.nav},line:{color:A.nav},shadow:shL()});
  s.addText('Why SAs need to know this',{x:5.44,y:3.64,w:4.0,h:0.26,fontSize:8.5,bold:true,color:A.teal,fontFace:F,margin:0});
  const why=['CFOs speak in ARR and NRR — not revenue lines','Your solution\'s ROI maps to NRR improvement or churn reduction','Budget conversations start with "what\'s the ARR impact?"'];
  why.forEach((w,i)=>{
    s.addText(`›  ${w}`,{x:5.44,y:3.94+i*0.38,w:4.0,h:0.32,fontSize:8,color:A.navI,fontFace:F,margin:0});
  });

  ftr(s,'Module 2.0  ·  Finance Basics 101',3,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 4 — FP&A CALENDAR (Module 2.0)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.0 — Finance Basics 101','The FP&A Calendar');

  const steps=[
    {label:'Annual\nPlanning',sub:'Oct–Nov',color:A.brand,icon:'①'},
    {label:'Monthly\nClose',sub:'3–5 days',color:A.teal,icon:'②'},
    {label:'Flash\nReport',sub:'Day 3',color:A.ok,icon:'③'},
    {label:'Variance\nAnalysis',sub:'Days 4–6',color:A.warn,icon:'④'},
    {label:'Mgmt\nCommentary',sub:'Days 6–8',color:A.orange,icon:'⑤'},
    {label:'Board\nPack',sub:'Day 8–10',color:A.violet,icon:'⑥'},
  ];

  // Circular cycle: 6 nodes placed in an arc
  const cx=5.0, cy=2.9, rx=3.0, ry=1.65;
  const N=steps.length;
  steps.forEach((st,i)=>{
    const angle=((i/N)*2*Math.PI)-(Math.PI/2);
    const nx=cx+rx*Math.cos(angle);
    const ny=cy+ry*Math.sin(angle);
    // Draw arc connector arrow (simplified as small diamond)
    if(i>0){
      const pa=((((i-1)/N)*2*Math.PI)-(Math.PI/2));
      const mx=cx+rx*Math.cos((angle+pa)/2)*0.92;
      const my=cy+ry*Math.sin((angle+pa)/2)*0.92;
      s.addShape(OV,{x:mx-0.07,y:my-0.07,w:0.14,h:0.14,fill:{color:A.ruleH},line:{color:A.ruleH}});
    }
    // Node circle
    s.addShape(OV,{x:nx-0.55,y:ny-0.55,w:1.1,h:1.1,fill:{color:st.color},line:{color:st.color},shadow:sh()});
    s.addText(st.icon,{x:nx-0.55,y:ny-0.3,w:1.1,h:0.35,fontSize:16,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    // Label outside
    const lx=cx+(rx+0.85)*Math.cos(angle)-0.75;
    const ly=cy+(ry+0.58)*Math.sin(angle)-0.28;
    s.addText(st.label,{x:lx,y:ly,w:1.5,h:0.44,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.sub,{x:lx,y:ly+0.42,w:1.5,h:0.22,fontSize:7.5,color:st.color,fontFace:F,align:'center',margin:0});
  });

  // Center label
  s.addText('FP&A\nCycle',{x:cx-0.85,y:cy-0.38,w:1.7,h:0.76,fontSize:11,bold:true,color:A.inkD,fontFace:F,align:'center',valign:'middle',margin:0});

  // Pain callout
  crd(s,0.3,4.42,9.4,0.72,{bg:A.warnS,border:A.warn});
  s.addShape(R,{x:0.3,y:4.42,w:0.06,h:0.72,fill:{color:A.warn},line:{color:A.warn}});
  s.addText('The bottleneck',{x:0.5,y:4.48,w:1.5,h:0.24,fontSize:8,bold:true,color:A.warn,fontFace:F,margin:0});
  s.addText('Steps ② → ④ (close → variance analysis) consume 3 of the 5 close days — mostly on data wrangling, not insight. That\'s what AI compresses.',
    {x:0.5,y:4.7,w:9.1,h:0.36,fontSize:8.5,color:A.warn,fontFace:F,margin:0});

  ftr(s,'Module 2.0  ·  Finance Basics 101',4,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 5 — MODULE 2.0 RECAP
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('Module 2.0 — Finance Basics 101  ·  Recap',{x:0.42,y:0.1,w:9,h:0.44,fontSize:18,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.52,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});

  const checks=[
    'Revenue − COGS = Gross Profit. Gross Profit − OpEx = Operating Income. ACME runs at 77.5% GM / −9.4% OM.',
    'ARR and NRR are the two metrics CFOs anchor every conversation to. NRR > 100% = growth from existing customers.',
    'Churn, CAC, and LTV define the unit economics of the business — your solution\'s ROI connects here.',
    'The FP&A calendar runs in a monthly cycle: close → flash → variance → commentary → board pack.',
    'The 3-day data-wrangling bottleneck inside the close cycle is the primary target for AI compression.',
  ];
  checks.forEach((c,i)=>{
    s.addShape(OV,{x:0.42,y:1.05+i*0.62,w:0.28,h:0.28,fill:{color:A.teal},line:{color:A.teal}});
    s.addText('✓',{x:0.42,y:1.05+i*0.62,w:0.28,h:0.28,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c,{x:0.82,y:1.05+i*0.62,w:8.8,h:0.44,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  s.addShape(R,{x:0.42,y:4.72,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
  s.addText('You now know enough finance to build for finance teams',
    {x:0.42,y:4.78,w:9.16,h:0.36,fontSize:11.5,bold:true,color:A.teal,fontFace:F,align:'center',valign:'middle',margin:0});

  ftr(s,'Module 2.0 Complete  ·  Next: 2.1 CFO Pain Points',5,TOT,true);
}

// ══════════════════════════════════════════════════════
// SLIDE 6 — MODULE 2.1 INTRO
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.1 — CFO Pain Points','Five Problems We\'re Solving');

  // Intro callout
  crd(s,0.42,1.05,9.16,0.88,{bg:A.brandS,border:A.brand,accent:A.brand});
  s.addText('The ACME CFO doesn\'t have a technology problem. She has five time-and-accuracy problems — all of which have the same root cause: data locked away from the people who need it.',
    {x:0.62,y:1.1,w:8.86,h:0.78,fontSize:10,color:A.brandD,fontFace:F,valign:'middle',margin:0});

  // 5 pain points overview grid
  const pains=[
    {n:'01',title:'Close Takes Too Long',stat:'6.4 days avg',color:A.red},
    {n:'02',title:'Variance Lag',stat:'2–3 days for root-cause',color:A.warn},
    {n:'03',title:'Forecast Drift',stat:'8–12% error by Q3',color:A.orange},
    {n:'04',title:'Data Bottleneck',stat:'48hr per ad-hoc query',color:A.violet},
    {n:'05',title:'Commentary Hours',stat:'1 full day for board pack',color:A.teal},
  ];

  pains.forEach((p,i)=>{
    const col=i<3?0:1;
    const row=i<3?i:(i-3);
    const x=0.42+col*4.88;
    const y=2.08+row*1.0;
    if(i===4){ // center last card
      crd(s,2.86,4.08,4.28,0.9,{accent:p.color});
      s.addShape(R,{x:2.86,y:4.08,w:0.48,h:0.9,fill:{color:p.color},line:{color:p.color}});
      s.addText(p.n,{x:2.86,y:4.08,w:0.48,h:0.9,fontSize:14,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
      s.addText(p.title,{x:3.44,y:4.12,w:3.0,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
      s.addText(p.stat,{x:3.44,y:4.48,w:3.0,h:0.28,fontSize:9,color:p.color,fontFace:F,margin:0});
    } else {
      crd(s,x,y,4.6,0.88,{});
      s.addShape(R,{x,y,w:0.48,h:0.88,fill:{color:p.color},line:{color:p.color}});
      s.addText(p.n,{x,y,w:0.48,h:0.88,fontSize:14,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
      s.addText(p.title,{x:x+0.58,y:y+0.08,w:3.8,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
      s.addText(p.stat,{x:x+0.58,y:y+0.46,w:3.8,h:0.28,fontSize:9,color:p.color,fontFace:F,margin:0});
    }
  });

  ftr(s,'Module 2.1  ·  CFO Pain Points',6,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 7 — PAIN POINTS 1–3
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.1 — CFO Pain Points','Pain Points 1–3: Time and Accuracy');

  const pains=[
    {
      n:'01', color:A.red,
      title:'Close Takes Too Long',
      stat:'6.4 days average close',
      bullets:[
        '3 of 6.4 days spent on data wrangling — pulling, reconciling, formatting',
        'Finance team is blocked: no answers until close completes',
        'Every extra day = delayed decisions at board level',
      ],
      target:'AI target: compress to < 4 days',
    },
    {
      n:'02', color:A.warn,
      title:'Variance Lag',
      stat:'2–3 days for root-cause',
      bullets:[
        'Actuals vs plan gap surfaces on Day 1 — explanation takes 2–3 more days',
        'Analysts manually cross-reference P&L, headcount, and GL data',
        'Board needs the "why" in hours, not days',
      ],
      target:'AI target: root-cause in minutes',
    },
    {
      n:'03', color:A.orange,
      title:'Forecast Drift',
      stat:'8–12% forecast error by Q3',
      bullets:[
        'Spreadsheet models updated monthly — stale within weeks',
        'Plan-vs-actuals diverge silently; no alert system',
        'Q3 reforecasting is a fire drill every quarter',
      ],
      target:'AI target: continuous what-if simulation',
    },
  ];

  pains.forEach((p,i)=>{
    const y=1.05+i*1.44;
    crd(s,0.42,y,9.16,1.3,{});
    s.addShape(R,{x:0.42,y,w:0.5,h:1.3,fill:{color:p.color},line:{color:p.color}});
    s.addText(p.n,{x:0.42,y,w:0.5,h:0.5,fontSize:16,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(p.title,{x:1.02,y:y+0.06,w:4.5,h:0.28,fontSize:10.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(p.stat,{x:1.02,y:y+0.34,w:3.5,h:0.24,fontSize:9,color:p.color,fontFace:F,bold:true,margin:0});
    p.bullets.forEach((b,bi)=>{
      s.addText(`·  ${b}`,{x:1.02,y:y+0.58+bi*0.22,w:5.5,h:0.2,fontSize:8,color:A.inkS,fontFace:F,margin:0});
    });
    // Target badge
    s.addShape(R,{x:6.72,y:y+0.12,w:2.76,h:0.26,fill:{color:A.card},line:{color:p.color,pt:0.8}});
    s.addText(p.target,{x:6.72,y:y+0.12,w:2.76,h:0.26,fontSize:7.5,bold:true,color:p.color,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  ftr(s,'Module 2.1  ·  CFO Pain Points',7,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 8 — PAIN POINTS 4–5
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.1 — CFO Pain Points','Pain Points 4–5: Data Access and Communication');

  const pains=[
    {
      n:'04', color:A.violet,
      title:'Data Bottleneck',
      stat:'48-hour lag per ad-hoc question',
      bullets:[
        'Every question from CFO/VP requires a SQL query or IT ticket',
        'Analysts spend 60% of time on data retrieval, not analysis',
        'Business decisions wait days for numbers that should take seconds',
        '"Can you pull EMEA bookings by segment?" = 2-day wait',
      ],
      target:'AI target: natural language → instant answer',
    },
    {
      n:'05', color:A.teal,
      title:'Commentary Hours',
      stat:'1 full day to write board pack narrative',
      bullets:[
        '80% of commentary time is formatting and pulling prior-period text',
        '20% is actual insight — and that\'s the part that matters to the board',
        'Three analysts involved; version-control nightmare in Google Docs',
        'Tone and accuracy vary by author — inconsistent board narrative',
      ],
      target:'AI target: draft commentary in minutes',
    },
  ];

  pains.forEach((p,i)=>{
    const y=1.05+i*2.1;
    crd(s,0.42,y,9.16,1.9,{});
    s.addShape(R,{x:0.42,y,w:0.5,h:1.9,fill:{color:p.color},line:{color:p.color}});
    s.addText(p.n,{x:0.42,y:y+0.05,w:0.5,h:0.5,fontSize:16,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(p.title,{x:1.02,y:y+0.08,w:5.5,h:0.3,fontSize:11.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(p.stat,{x:1.02,y:y+0.4,w:4.5,h:0.26,fontSize:9.5,color:p.color,fontFace:F,bold:true,margin:0});
    p.bullets.forEach((b,bi)=>{
      s.addText(`·  ${b}`,{x:1.02,y:y+0.7+bi*0.27,w:5.8,h:0.24,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
    });
    s.addShape(R,{x:7.0,y:y+0.14,w:2.48,h:0.28,fill:{color:A.card},line:{color:p.color,pt:0.8}});
    s.addText(p.target,{x:7.0,y:y+0.14,w:2.48,h:0.28,fontSize:7.5,bold:true,color:p.color,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  ftr(s,'Module 2.1  ·  CFO Pain Points',8,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 9 — THE COST OF THE TEAM
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.1 — CFO Pain Points','The Hidden Cost: $900K Not Spent on Analysis');

  // Left — team math
  crd(s,0.42,1.05,4.4,3.72,{accent:A.ink});
  s.addText('The FP&A Team',{x:0.62,y:1.12,w:4.0,h:0.3,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});

  kpi(s,0.62,1.5,1.9,1.02,'Team Size','12','analysts',A.brand);
  kpi(s,2.68,1.5,1.94,1.02,'Fully-Loaded Cost','$125K','per analyst / year',A.inkD);
  kpi(s,0.62,2.64,3.96,1.02,'Total Annual Team Cost','$1.5M','FP&A headcount investment',A.ink);

  s.addShape(R,{x:0.62,y:3.74,w:3.96,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Time allocation breakdown',{x:0.62,y:3.78,w:3.96,h:0.24,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});

  const bars2=[
    {label:'Data wrangling',pct:60,color:A.red},
    {label:'Analysis & insight',pct:25,color:A.ok},
    {label:'Reporting & formatting',pct:15,color:A.warn},
  ];
  bars2.forEach((b,i)=>{
    const bw=(b.pct/100)*3.56;
    s.addShape(R,{x:0.62,y:4.08+i*0.28,w:bw,h:0.22,fill:{color:b.color},line:{color:b.color}});
    s.addText(`${b.label}  ${b.pct}%`,{x:0.62+bw+0.06,y:4.08+i*0.28,w:2.2,h:0.22,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // Right — the waste
  crd(s,5.02,1.05,4.56,3.72,{accent:A.red});
  s.addText('The Waste',{x:5.22,y:1.12,w:4.1,h:0.3,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});

  kpi(s,5.22,1.5,4.1,1.02,'Cost of Data Wrangling','$900K','60% of $1.5M team — zero insight value',A.red);
  kpi(s,5.22,2.64,4.1,1.02,'Insight Capacity Available','$375K','only 25% of team time on actual analysis',A.warn);

  s.addShape(R,{x:5.22,y:3.74,w:4.1,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addShape(R,{x:5.22,y:3.82,w:4.1,h:0.82,fill:{color:A.redS},line:{color:A.red,pt:1}});
  s.addText('$900K/year is spent by highly-skilled analysts doing work that software should do. That is the opportunity AI is here to recover.',
    {x:5.34,y:3.86,w:3.9,h:0.74,fontSize:8.5,color:A.red,fontFace:F,valign:'middle',margin:0});

  ftr(s,'Module 2.1  ·  CFO Pain Points',9,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 10 — BRIDGE SLIDE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  hdr(s,'Section 2','Module 2.1 — CFO Pain Points','One Root Cause',true);

  s.addShape(R,{x:0.9,y:1.1,w:8.2,h:1.6,fill:{color:'0d1e3a'},line:{color:'172a4a'},shadow:shL()});
  s.addText('"Data is locked away from the people who need it."',
    {x:1.1,y:1.22,w:7.8,h:0.82,fontSize:20,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addText('— The root cause behind all five pain points',
    {x:1.1,y:2.0,w:7.8,h:0.52,fontSize:11,color:A.teal,fontFace:F,align:'center',valign:'middle',margin:0});

  // Five problems → one cause
  const arrows=[
    {label:'Close lag',color:A.red},
    {label:'Variance delay',color:A.warn},
    {label:'Forecast drift',color:A.orange},
    {label:'Data bottleneck',color:A.violet},
    {label:'Commentary hours',color:A.teal},
  ];
  arrows.forEach((a,i)=>{
    const x=0.55+i*1.84;
    s.addShape(R,{x,y:2.92,w:1.55,h:0.42,fill:{color:a.color},line:{color:a.color},shadow:sh()});
    s.addText(a.label,{x,y:2.92,w:1.55,h:0.42,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    // Arrow down
    s.addText('↓',{x:x+0.5,y:3.38,w:0.55,h:0.3,fontSize:14,color:A.navM,fontFace:F,align:'center',margin:0});
  });

  s.addShape(R,{x:0.55,y:3.68,w:8.9,h:0.52,fill:{color:A.brand},line:{color:A.brand},shadow:shL()});
  s.addText('Analysts can\'t query their own data without SQL or an IT ticket',
    {x:0.55,y:3.68,w:8.9,h:0.52,fontSize:10.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  s.addText('That\'s what we\'re going to fix. Next: the cost of doing nothing.',
    {x:0.55,y:4.42,w:8.9,h:0.36,fontSize:10,color:A.navM,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 2.1 Complete  ·  Next: 2.2 Cost of Inaction',10,TOT,true);
}

// ══════════════════════════════════════════════════════
// SLIDE 11 — MODULE 2.2 INTRO
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.2 — Cost of Inaction','What Staying Manual Actually Costs');

  crd(s,0.42,1.05,9.16,0.72,{bg:A.warnS,border:A.warn,accent:A.warn});
  s.addText('Most organizations know they have a problem. Few know what it\'s costing them in dollars. Let\'s make that concrete — because the CFO will ask.',
    {x:0.62,y:1.1,w:8.86,h:0.62,fontSize:10,color:A.warn,fontFace:F,valign:'middle',margin:0});

  // What we'll cover
  const topics=[
    {n:'$1.9M',label:'Total quantified cost of manual FP&A at ACME scale',color:A.red},
    {n:'$1.2M',label:'Amount recoverable with AI — identified by category',color:A.ok},
    {n:'28×',label:'ROI on variance root-cause alone — the single best payback',color:A.brand},
  ];
  topics.forEach((t,i)=>{
    crd(s,0.42+i*3.12,1.95,2.92,2.88,{accent:t.color});
    s.addText(t.n,{x:0.62+i*3.12,y:2.1,w:2.6,h:0.76,fontSize:36,bold:true,color:t.color,fontFace:F,align:'center',margin:0});
    s.addText(t.label,{x:0.62+i*3.12,y:2.9,w:2.6,h:0.76,fontSize:9.5,color:A.inkS,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  s.addShape(R,{x:0.42,y:5.0,w:9.16,h:0.22,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('In this module we build the business case — the document you bring into the CFO\'s office.',
    {x:0.55,y:5.01,w:8.9,h:0.2,fontSize:8,color:A.navI,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 2.2  ·  Cost of Inaction',11,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 12 — ANNUAL COST BREAKDOWN
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.2 — Cost of Inaction','Annual Cost of Manual Finance: $1.9M');

  const items=[
    {label:'Forecast Errors',cost:450,color:A.red},
    {label:'Close Lag (opportunity cost)',cost:420,color:A.warn},
    {label:'Data Bottleneck',cost:380,color:A.violet},
    {label:'Variance Delay',cost:380,color:A.orange},
    {label:'Commentary & Formatting',cost:270,color:A.teal},
  ];
  const total=1900;
  const maxW=5.8;

  items.forEach((item,i)=>{
    const y=1.1+i*0.74;
    const bw=(item.cost/total)*maxW;
    // Label
    s.addText(item.label,{x:0.42,y:y+0.06,w:2.6,h:0.28,fontSize:9,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    // Bar
    s.addShape(R,{x:3.1,y:y+0.06,w:bw,h:0.44,fill:{color:item.color},line:{color:item.color},shadow:sh()});
    // Value
    s.addText(`$${item.cost}K`,{x:3.1+bw+0.1,y:y+0.06,w:1.0,h:0.44,fontSize:10,bold:true,color:item.color,fontFace:F,valign:'middle',margin:0});
  });

  // Total bar
  s.addShape(R,{x:0.42,y:4.88,w:9.16,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('TOTAL ANNUAL COST',{x:0.42,y:4.92,w:2.6,h:0.3,fontSize:9,bold:true,color:A.ink,fontFace:F,valign:'middle',margin:0});
  s.addShape(R,{x:3.1,y:4.9,w:maxW,h:0.28,fill:{color:A.ink},line:{color:A.ink}});
  s.addText('$1,900K',{x:3.1+maxW+0.1,y:4.9,w:1.4,h:0.28,fontSize:12,bold:true,color:A.ink,fontFace:F,valign:'middle',margin:0});

  // Right side note
  crd(s,8.02,1.1,1.56,3.72,{bg:A.redS,border:A.red});
  s.addText('$1.9M',{x:8.02,y:1.4,w:1.56,h:0.56,fontSize:24,bold:true,color:A.red,fontFace:F,align:'center',margin:0});
  s.addText('lost to\nmanual\nprocesses\nannually',{x:8.02,y:2.0,w:1.56,h:0.9,fontSize:9,color:A.red,fontFace:F,align:'center',margin:0});
  s.addShape(R,{x:8.12,y:3.04,w:1.32,h:0.015,fill:{color:A.red},line:{color:A.red}});
  s.addText('ACME-scale\nestimate',{x:8.02,y:3.1,w:1.56,h:0.44,fontSize:7.5,color:A.red,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 2.2  ·  Cost of Inaction',12,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 13 — WHAT'S RECOVERABLE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.2 — Cost of Inaction','$1.2M Recoverable with AI');

  const rows=[
    ['Pain Point','Annual Cost','Recoverable','Recovery %','ROI Driver'],
    ['Close Lag','$420K','$290K','69%','3 days → <1 day automation'],
    ['Variance Delay','$380K','$340K','89%','28× ROI on RCA alone'],
    ['Forecast Errors','$450K','$320K','71%','Continuous sim replaces quarterly'],
    ['Data Bottleneck','$380K','$180K','47%','NL queries cut 48hr → seconds'],
    ['Commentary','$270K','$70K','26%','AI draft saves 80% formatting time'],
    ['TOTAL','$1,900K','$1,200K','63%','3× fully-loaded analyst cost'],
  ];
  tbl(s,rows,[1.8,1.1,1.1,1.0,3.76],0.42,1.05,{rh:0.44});

  // Hero KPI
  crd(s,0.42,4.26,4.4,0.88,{bg:A.okS,border:A.ok,accent:A.ok});
  s.addText('$1.2M recovered',{x:0.62,y:4.32,w:2.4,h:0.36,fontSize:14,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('= 80% of one additional FP&A headcount freed to do analysis',{x:0.62,y:4.68,w:4.0,h:0.38,fontSize:8,color:A.ok,fontFace:F,margin:0});

  crd(s,5.02,4.26,4.56,0.88,{bg:A.brandS,border:A.brand,accent:A.brand});
  s.addText('28× ROI on Variance RCA',{x:5.22,y:4.32,w:3.8,h:0.36,fontSize:12,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('$340K saved on 3-person-day bottleneck; agent solves in 4 minutes',{x:5.22,y:4.68,w:4.1,h:0.38,fontSize:8,color:A.brandD,fontFace:F,margin:0});

  ftr(s,'Module 2.2  ·  Cost of Inaction',13,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 14 — THE CFO CONVERSATION
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  hdr(s,'Section 2','Module 2.2 — Cost of Inaction','The CFO Conversation',true);

  s.addShape(R,{x:0.9,y:1.0,w:8.2,h:1.1,fill:{color:'0d1e3a'},line:{color:'172a4a'},shadow:shL()});
  s.addText('"You\'re not selling technology.\nYou\'re selling $1.2M back to the finance team."',
    {x:1.1,y:1.06,w:7.8,h:1.0,fontSize:18,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  // Framing cards
  const frames=[
    {title:'What NOT to say',items:['We\'re implementing an AI agent on Bedrock','It uses Anthropic Claude with RAG and dbt','The architecture has Lambda and Redshift'],color:A.red,bg:'1a0a0a'},
    {title:'What TO say',items:['Your analysts spend $900K/yr on data wrangling','We recover $1.2M — starting with your close cycle','First result in 6 weeks; board sees it in 10'],color:A.ok,bg:'0a1a10'},
  ];
  frames.forEach((f,i)=>{
    s.addShape(R,{x:0.42+i*4.88,y:2.28,w:4.58,h:2.72,fill:{color:f.bg},line:{color:f.color,pt:1.5},shadow:shL()});
    s.addShape(R,{x:0.42+i*4.88,y:2.28,w:4.58,h:0.38,fill:{color:f.color},line:{color:f.color}});
    s.addText(f.title,{x:0.56+i*4.88,y:2.28,w:4.3,h:0.38,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    f.items.forEach((item,j)=>{
      s.addText(`${j===0?'✗':'✗'}  ${item}`,{x:0.56+i*4.88,y:2.78+j*0.6,w:4.3,h:0.5,fontSize:9,color:i===0?A.red:A.ok,fontFace:F,valign:'middle',margin:0});
      // Override cross for ok
      if(i===1) s.addText(`✓  ${item}`,{x:0.56+i*4.88,y:2.78+j*0.6,w:4.3,h:0.5,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
    });
  });

  ftr(s,'Module 2.2 Complete  ·  Next: 2.3 Why Now?',14,TOT,true);
}

// ══════════════════════════════════════════════════════
// SLIDE 15 — MODULE 2.3 INTRO
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.3 — Why Now?','Why This Didn\'t Work in 2019');

  crd(s,0.42,1.05,9.16,0.72,{bg:A.violetS,border:A.violet,accent:A.violet});
  s.addText('Finance AI has been tried before — and it failed. Understanding why it failed then, and why conditions are fundamentally different now, is what makes this a defensible architecture recommendation.',
    {x:0.62,y:1.1,w:8.86,h:0.62,fontSize:10,color:A.violet,fontFace:F,valign:'middle',margin:0});

  // Three shifts preview
  const shifts=[
    {icon:'🧠',title:'Foundation Models',sub:'Claude/GPT understand finance language out of the box — no custom training'},
    {icon:'☁️',title:'Bedrock GA',sub:'Managed inference. No ML expertise needed. SOC 2 compliant. Pay-per-token.'},
    {icon:'🗄️',title:'dbt Maturity',sub:'Clean semantic data layer. Finance marts are AI-ready. No raw SQL chaos.'},
  ];
  shifts.forEach((sh2,i)=>{
    crd(s,0.42+i*3.12,2.0,2.92,2.88,{accent:A.violet});
    s.addText(sh2.icon,{x:0.42+i*3.12,y:2.12,w:2.92,h:0.52,fontSize:24,fontFace:F,align:'center',margin:0});
    s.addText(sh2.title,{x:0.56+i*3.12,y:2.7,w:2.64,h:0.38,fontSize:11,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addText(sh2.sub,{x:0.56+i*3.12,y:3.12,w:2.64,h:1.5,fontSize:8.5,color:A.inkS,fontFace:F,align:'center',valign:'top',margin:0});
  });

  ftr(s,'Module 2.3  ·  Why Now?',15,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 16 — 2019 FAILURE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.3 — Why Now?','The 2019 Attempt: What Went Wrong');

  // Failure stats
  const stats=[
    {label:'Training time',val:'18 months',sub:'just to reach baseline accuracy',color:A.red},
    {label:'Investment',val:'$2M+',sub:'custom NLP model development',color:A.warn},
    {label:'Final accuracy',val:'62%',sub:'on financial query understanding',color:A.orange},
    {label:'Outcome',val:'Abandoned',sub:'finance teams reverted to Excel',color:A.ink},
  ];
  stats.forEach((st,i)=>{
    kpi(s,0.42+i*2.38,1.05,2.18,1.08,st.label,st.val,st.sub,st.color);
  });

  // Why it failed — detail
  crd(s,0.42,2.28,9.16,2.76,{});
  s.addText('Why It Failed',{x:0.58,y:2.36,w:8.8,h:0.32,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
  s.addShape(R,{x:0.58,y:2.7,w:8.8,h:0.015,fill:{color:A.rule},line:{color:A.rule}});

  const reasons=[
    {title:'No foundation',body:'Custom NLP models had to learn financial language from scratch — "COGS", "OpEx", "variance to plan" are not in Wikipedia.'},
    {title:'Data wasn\'t ready',body:'Finance data lived in 14 spreadsheets and a legacy ERP. No semantic layer. Every query was a custom ETL job.'},
    {title:'ML expertise gap',body:'The finance team couldn\'t maintain models. IT owned them. When queries drifted, retraining took months.'},
    {title:'Wrong success metric',body:'62% accuracy sounds decent — until you realize a CFO will never trust a number with 38% error rate.'},
  ];
  reasons.forEach((r,i)=>{
    const col=i<2?0:1;
    const row=i<2?i:i-2;
    const x=0.58+col*4.6;
    const y=2.82+row*0.9;
    s.addShape(R,{x:x-0.02,y:y+0.08,w:0.14,h:0.14,fill:{color:A.red},line:{color:A.red}});
    s.addText(r.title,{x:x+0.18,y:y,w:4.2,h:0.28,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(r.body,{x:x+0.18,y:y+0.28,w:4.2,h:0.52,fontSize:8,color:A.inkS,fontFace:F,margin:0});
  });

  ftr(s,'Module 2.3  ·  Why Now?',16,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 17 — WHAT CHANGED
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.3 — Why Now?','Three-Shift Convergence: What Changed');

  const shifts=[
    {
      n:'1', color:A.brand,
      title:'Foundation Models',
      sub:'Claude, GPT-4, Gemini',
      points:[
        'Understand financial language without custom training',
        '"What\'s our Q3 EMEA variance?" → parsed correctly, first try',
        'Reasoning capability: can explain numbers, not just retrieve them',
        'ACME uses: Claude 3.5 Sonnet on Bedrock',
      ],
    },
    {
      n:'2', color:A.teal,
      title:'Amazon Bedrock GA',
      sub:'November 2023',
      points:[
        'Managed inference — no GPU fleet to operate',
        'SOC 2 Type II, HIPAA eligible, VPC isolation',
        'Pay-per-token; no minimum commitment',
        'AgentCore launched 2024: managed agent orchestration',
      ],
    },
    {
      n:'3', color:A.ok,
      title:'dbt Semantic Layer',
      sub:'Finance-ready data marts',
      points:[
        'Clean, tested, documented SQL models — finance owns them',
        'mart_pl, mart_arr, mart_variance: AI-queryable out of the box',
        'Metric definitions locked in YAML — LLM can\'t hallucinate them',
        'Version-controlled finance logic; reproducible results',
      ],
    },
  ];

  shifts.forEach((sh2,i)=>{
    const x=0.32+i*3.22;
    crd(s,x,1.05,3.06,4.08,{accent:sh2.color});
    s.addShape(R,{x,y:1.05,w:3.06,h:0.48,fill:{color:sh2.color},line:{color:sh2.color}});
    s.addText(`${sh2.n}`,{x,y:1.05,w:0.46,h:0.48,fontSize:16,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(sh2.title,{x:x+0.52,y:1.1,w:2.46,h:0.26,fontSize:9.5,bold:true,color:A.W,fontFace:F,margin:0});
    s.addText(sh2.sub,{x:x+0.52,y:1.36,w:2.46,h:0.2,fontSize:8,color:A.navI,fontFace:F,margin:0});
    sh2.points.forEach((pt,j)=>{
      s.addText(`·  ${pt}`,{x:x+0.14,y:1.62+j*0.6,w:2.8,h:0.52,fontSize:8.5,color:A.inkS,fontFace:F,valign:'top',margin:0});
    });
  });

  s.addShape(R,{x:0.32,y:5.18,w:9.36,h:0.015,fill:{color:A.rule},line:{color:A.rule}});

  ftr(s,'Module 2.3  ·  Why Now?',17,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 18 — TIMELINE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.3 — Why Now?','The Timeline: From Failed Experiments to Working Agents');

  const events=[
    {year:'2019',label:'First Wave\nFailed',detail:'Custom NLP, $2M, 62% accuracy\nFinance abandoned it',color:A.red,y:1.6},
    {year:'2022',label:'Foundation\nModels Emerge',detail:'GPT-3.5, then GPT-4\nFinancial language understood OOTB',color:A.warn,y:2.4},
    {year:'2024',label:'Bedrock GA +\nAgentCore',detail:'Managed inference live\nEnterprise-grade agent orchestration',color:A.brand,y:1.6},
    {year:'2026',label:'What We\'re\nBuilding Today',detail:'ACME live on Bedrock\nNL queries + RCA + what-if sim',color:A.teal,y:2.4},
  ];

  // Timeline bar
  const ty=3.1;
  s.addShape(R,{x:0.6,y:ty,w:8.8,h:0.08,fill:{color:A.ruleH},line:{color:A.ruleH}});

  events.forEach((ev,i)=>{
    const x=0.6+i*2.93;
    // Dot on timeline
    s.addShape(OV,{x:x+1.1,y:ty-0.18,w:0.38,h:0.38,fill:{color:ev.color},line:{color:ev.color},shadow:sh()});
    // Vertical connector
    const connY=ev.y<ty?ev.y+1.4:ty+0.2;
    const connH=Math.abs(ty-connY);
    s.addShape(R,{x:x+1.26,y:Math.min(connY,ty),w:0.04,h:connH+0.18,fill:{color:ev.color},line:{color:ev.color}});
    // Card
    crd(s,x,ev.y,2.62,1.28,{border:ev.color,bg:ev.y<2?A.card:A.bgS});
    s.addShape(R,{x,y:ev.y,w:2.62,h:0.3,fill:{color:ev.color},line:{color:ev.color}});
    s.addText(ev.year,{x,y:ev.y,w:2.62,h:0.3,fontSize:10,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(ev.label,{x:x+0.1,y:ev.y+0.34,w:2.42,h:0.44,fontSize:9,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addText(ev.detail,{x:x+0.1,y:ev.y+0.78,w:2.42,h:0.44,fontSize:7.5,color:A.inkS,fontFace:F,align:'center',margin:0});
  });

  ftr(s,'Module 2.3  ·  Why Now?',18,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 19 — THE WINDOW
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  hdr(s,'Section 2','Module 2.3 — Why Now?','The First-Mover Window',true);

  s.addShape(R,{x:0.9,y:1.0,w:8.2,h:1.32,fill:{color:'0d1e3a'},line:{color:'172a4a'},shadow:shL()});
  s.addText('"The CFOs who deploy this in 2025–2026 will expect it everywhere by 2027. The window is open — but it won\'t stay open."',
    {x:1.1,y:1.06,w:7.8,h:1.2,fontSize:17,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  // Three urgency points
  const pts=[
    {icon:'⚡',title:'Competitive pressure',body:'Peers are already in pilot. Finance transformation is a board-level conversation at 40% of F500 companies right now (Gartner 2025).'},
    {icon:'📉',title:'Cost of waiting',body:'Every quarter of manual close = $475K in recoverable costs left on the table. Two more quarters = another analyst salary wasted.'},
    {icon:'🏗️',title:'Compounding advantage',body:'Teams that build the data foundation now — clean dbt marts, Bedrock wiring — will have a 12-month head start on every subsequent capability.'},
  ];
  pts.forEach((p,i)=>{
    crd(s,0.42+i*3.2,2.54,3.0,2.42,{bg:'0d1e3a',border:'1e2d45'});
    s.addText(p.icon,{x:0.42+i*3.2,y:2.62,w:3.0,h:0.44,fontSize:20,fontFace:F,align:'center',margin:0});
    s.addText(p.title,{x:0.56+i*3.2,y:3.1,w:2.72,h:0.3,fontSize:9.5,bold:true,color:A.teal,fontFace:F,align:'center',margin:0});
    s.addText(p.body,{x:0.56+i*3.2,y:3.44,w:2.72,h:1.36,fontSize:8.5,color:A.navI,fontFace:F,align:'center',valign:'top',margin:0});
  });

  ftr(s,'Module 2.3 Complete  ·  Next: 2.4 Three AI Capabilities',19,TOT,true);
}

// ══════════════════════════════════════════════════════
// SLIDE 20 — MODULE 2.4 INTRO
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.4 — Three AI Capabilities','Three Things AI Can Do for Finance');

  crd(s,0.42,1.05,9.16,0.7,{bg:A.brandS,border:A.brand,accent:A.brand});
  s.addText('The ACME Finance Agent exposes three Lambda-backed tools. Each maps directly to a CFO pain point. Understanding what each tool does — and doesn\'t do — is core to your architecture conversations.',
    {x:0.62,y:1.1,w:8.86,h:0.6,fontSize:10,color:A.brandD,fontFace:F,valign:'middle',margin:0});

  const caps=[
    {n:'1',fn:'text_to_sql',label:'NL Understanding',sub:'Any question → SQL → answer',pain:'Data bottleneck',color:A.brand,icon:'💬'},
    {n:'2',fn:'variance_rca',label:'Reasoning & RCA',sub:'Actuals vs plan → ranked drivers → explanation',pain:'Variance lag',color:A.teal,icon:'🔍'},
    {n:'3',fn:'whatif_sim',label:'Simulation',sub:'"What if we cut R&D 15%?" → instant scenario',pain:'Forecast drift',color:A.violet,icon:'⚙️'},
  ];
  caps.forEach((c,i)=>{
    crd(s,0.42+i*3.2,1.98,3.04,3.16,{accent:c.color});
    s.addText(c.icon,{x:0.42+i*3.2,y:2.1,w:3.04,h:0.52,fontSize:26,fontFace:F,align:'center',margin:0});
    s.addText(`${c.n}. ${c.label}`,{x:0.56+i*3.2,y:2.68,w:2.76,h:0.34,fontSize:10.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addShape(R,{x:0.56+i*3.2,y:3.06,w:2.76,h:0.24,fill:{color:c.color},line:{color:c.color}});
    s.addText(c.fn,{x:0.56+i*3.2,y:3.06,w:2.76,h:0.24,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c.sub,{x:0.56+i*3.2,y:3.36,w:2.76,h:0.54,fontSize:8.5,color:A.inkS,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addShape(R,{x:0.56+i*3.2,y:3.96,w:2.76,h:0.24,fill:{color:A.card},line:{color:c.color,pt:0.8}});
    s.addText(`Fixes: ${c.pain}`,{x:0.56+i*3.2,y:3.96,w:2.76,h:0.24,fontSize:8,color:c.color,fontFace:F,align:'center',valign:'middle',bold:true,margin:0});
  });

  ftr(s,'Module 2.4  ·  Three AI Capabilities',20,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 21 — CAPABILITY 1: text_to_sql
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.4 — Three AI Capabilities','Capability 1 — NL Understanding: text_to_sql');

  // Flow diagram
  const steps=[
    {label:'CFO asks',detail:'"What was EMEA revenue in Q3 2024?"',color:A.brand,icon:'💬'},
    {label:'Agent parses',detail:'Identifies: dimension=region, filter=EMEA, period=Q3, metric=revenue',color:A.teal,icon:'🧠'},
    {label:'SQL generated',detail:'SELECT SUM(revenue) FROM mart_pl WHERE region=\'EMEA\' AND quarter=\'Q3\'',color:A.violet,icon:'⚙️'},
    {label:'Redshift query',detail:'Executes against ACME mart_pl. Returns: $312.4M in 0.8s',color:A.ok,icon:'🗄️'},
    {label:'Answer delivered',detail:'"EMEA Q3 revenue was $312.4M, +14.2% vs plan."',color:A.brand,icon:'✅'},
  ];

  steps.forEach((st,i)=>{
    const y=1.1+i*0.82;
    crd(s,0.42,y,7.2,0.7,{border:st.color,bg:i%2===0?A.card:A.bgS});
    s.addShape(R,{x:0.42,y,w:0.52,h:0.7,fill:{color:st.color},line:{color:st.color}});
    s.addText(st.icon,{x:0.42,y,w:0.52,h:0.7,fontSize:14,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.label,{x:1.04,y:y+0.06,w:1.8,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
    s.addText(st.detail,{x:1.04,y:y+0.34,w:6.44,h:0.28,fontSize:8.5,color:A.ink,fontFace:F,margin:0});
    if(i<steps.length-1) s.addText('↓',{x:0.6,y:y+0.68,w:0.18,h:0.16,fontSize:10,color:A.ruleH,fontFace:F,align:'center',margin:0});
  });

  // Right side — key benefit
  crd(s,7.82,1.1,1.76,4.1,{bg:A.brandS,border:A.brand,accent:A.brand});
  s.addText('Key\nbenefit',{x:7.98,y:1.18,w:1.44,h:0.4,fontSize:8.5,bold:true,color:A.brandD,fontFace:F,align:'center',margin:0});
  s.addText('No SQL\nknowledge\nneeded',{x:7.98,y:1.68,w:1.44,h:0.64,fontSize:11,bold:true,color:A.brand,fontFace:F,align:'center',margin:0});
  s.addShape(R,{x:7.98,y:2.44,w:1.44,h:0.015,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('48hr lag\n→\nseconds',{x:7.98,y:2.52,w:1.44,h:0.64,fontSize:11,bold:true,color:A.brand,fontFace:F,align:'center',margin:0});
  s.addText('Any analyst. Any question. Zero tickets.',{x:7.92,y:3.56,w:1.56,h:0.52,fontSize:7.5,color:A.brandD,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 2.4  ·  Three AI Capabilities',21,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 22 — CAPABILITY 2: variance_rca
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.4 — Three AI Capabilities','Capability 2 — Reasoning: variance_rca');

  // Left panel — variance table
  crd(s,0.42,1.05,5.2,4.08,{accent:A.teal});
  s.addText('Actuals vs Plan — October 2024',{x:0.58,y:1.12,w:4.88,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});

  const vtbl=[
    ['Cost Category','Actual','Plan','Variance','Rank'],
    ['R&D Personnel — Eng EMEA','$18.2M','$15.1M','+$3.1M','#1'],
    ['Cloud Infra — AWS','$6.8M','$5.9M','+$0.9M','#2'],
    ['S&M — Events & Field','$4.2M','$3.6M','+$0.6M','#3'],
    ['G&A — Professional Svcs','$2.1M','$1.8M','+$0.3M','#4'],
    ['TOTAL OVER-PLAN','$31.3M','$26.4M','+$4.9M','—'],
  ];
  tbl(s,vtbl,[1.8,0.76,0.76,0.86,0.72],0.48,1.48,{rh:0.38});

  s.addShape(R,{x:0.48,y:3.96,w:5.0,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('Ranked by magnitude. Top driver identified in 4 minutes vs 3 analyst-days.',
    {x:0.48,y:4.0,w:5.0,h:0.4,fontSize:8,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:0.48,y:4.44,w:5.0,h:0.52,fill:{color:A.tealS},line:{color:A.teal,pt:1}});
  s.addText('28× ROI: $340K saved on 3-analyst-day process → agent solves in 4 min',{x:0.58,y:4.48,w:4.8,h:0.44,fontSize:8.5,bold:true,color:A.teal,fontFace:F,valign:'middle',margin:0});

  // Right panel — agent explanation
  crd(s,5.82,1.05,3.76,4.08,{accent:A.brand});
  s.addText('Agent Explanation',{x:5.98,y:1.12,w:3.44,h:0.3,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
  s.addShape(R,{x:5.82,y:1.46,w:3.76,h:0.015,fill:{color:A.rule},line:{color:A.rule}});

  const commentary=[
    'October variance of +$4.9M vs plan is driven primarily by R&D Personnel in Engineering EMEA (+$3.1M, 20.5% over).',
    'Contributing factors: 3 senior engineer hires accelerated from Q1 2025 into Q4 2024 following competitive retention pressure.',
    'AWS infrastructure overage (+$0.9M) reflects prod environment scaling for the EMEA launch — expected to normalize.',
    'Recommend: update Q4 R&D headcount assumption in model; present at next board cycle with revised full-year guidance.',
  ];
  commentary.forEach((c,i)=>{
    s.addShape(R,{x:5.98,y:1.54+i*0.84,w:0.16,h:0.16,fill:{color:A.brand},line:{color:A.brand}});
    s.addText(c,{x:6.22,y:1.52+i*0.84,w:3.28,h:0.76,fontSize:8,color:A.inkS,fontFace:F,valign:'top',margin:0});
  });

  ftr(s,'Module 2.4  ·  Three AI Capabilities',22,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 23 — CAPABILITY 3: whatif_sim
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.4 — Three AI Capabilities','Capability 3 — Simulation: whatif_sim');

  // Prompt card
  crd(s,0.42,1.05,9.16,0.68,{bg:A.nav,border:A.brand});
  s.addShape(R,{x:0.42,y:1.05,w:0.96,h:0.68,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('CFO asks:',{x:0.44,y:1.05,w:0.94,h:0.68,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addText('"What if we cut R&D spend by 15% in H2? What does that do to our operating margin?"',
    {x:1.46,y:1.1,w:8.0,h:0.58,fontSize:11,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});

  // Before / After
  const cols2=[
    {label:'Current State',vals:['$578.5M','32.0%','−9.4%','−$169.9M'],color:A.warn,head:'BEFORE'},
    {label:'R&D −15%',vals:['$491.7M','27.2%','−6.1%','−$107.0M'],color:A.ok,head:'AFTER'},
    {label:'Change',vals:['−$86.8M','−4.8pp','+3.3pp','+$62.9M'],color:A.brand,head:'DELTA'},
  ];
  const rowLabels=['R&D Annual Spend','R&D as % Revenue','Operating Margin','Operating Income'];

  // Column headers
  cols2.forEach((c,ci)=>{
    const x=3.62+ci*2.08;
    s.addShape(R,{x,y:1.94,w:2.0,h:0.38,fill:{color:c.color},line:{color:c.color}});
    s.addText(c.head,{x,y:1.94,w:2.0,h:0.38,fontSize:9.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  rowLabels.forEach((rl,ri)=>{
    const y=2.36+ri*0.56;
    const bg=ri%2===0?A.card:'f8fafc';
    s.addShape(R,{x:0.42,y,w:3.1,h:0.52,fill:{color:A.bgS},line:{color:A.rule,pt:0.5}});
    s.addText(rl,{x:0.52,y,w:2.9,h:0.52,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    cols2.forEach((c,ci)=>{
      const x=3.62+ci*2.08;
      s.addShape(R,{x,y,w:2.0,h:0.52,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      const valColor=ci===2?(c.vals[ri].startsWith('+')?A.ok:A.red):A.ink;
      s.addText(c.vals[ri],{x,y,w:2.0,h:0.52,fontSize:9.5,bold:ci===2,color:valColor,fontFace:F,align:'center',valign:'middle',margin:0});
    });
  });

  // Key outcomes
  crd(s,0.42,4.6,4.4,0.62,{bg:A.okS,border:A.ok,accent:A.ok});
  s.addText('+348 bps margin improvement',{x:0.62,y:4.66,w:4.0,h:0.28,fontSize:10.5,bold:true,color:A.ok,fontFace:F,margin:0});
  s.addText('+$62.9M operating income recovery',{x:0.62,y:4.92,w:4.0,h:0.24,fontSize:9,color:A.ok,fontFace:F,margin:0});

  crd(s,5.02,4.6,4.56,0.62,{bg:A.brandS,border:A.brand,accent:A.brand});
  s.addText('Time to answer: < 3 seconds',{x:5.22,y:4.66,w:4.1,h:0.28,fontSize:10.5,bold:true,color:A.brand,fontFace:F,margin:0});
  s.addText('vs 2–3 hours for spreadsheet scenario build',{x:5.22,y:4.92,w:4.1,h:0.24,fontSize:9,color:A.brandD,fontFace:F,margin:0});

  ftr(s,'Module 2.4  ·  Three AI Capabilities',23,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 24 — MODULE 2.5 INTRO
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.5 — Maturity Model','The Four Levels of Finance AI Maturity');

  crd(s,0.42,1.05,9.16,0.7,{bg:A.violetS,border:A.violet,accent:A.violet});
  s.addText('Not every enterprise is at the same starting point. This maturity model helps you position ACME\'s solution correctly — and helps your client see where they are vs where they\'re going.',
    {x:0.62,y:1.1,w:8.86,h:0.6,fontSize:10,color:A.violet,fontFace:F,valign:'middle',margin:0});

  const levels=[
    {n:'1',label:'Assisted',desc:'Dashboards and BI tools. Humans query and interpret everything.',color:A.inkD,pct:'68%'},
    {n:'2',label:'Augmented',desc:'NL queries + AI-drafted commentary. Analysts guide, AI executes.',color:A.brand,pct:'24%'},
    {n:'3',label:'Integrated',desc:'Agent handles close steps autonomously. Humans review outputs.',color:A.teal,pct:'7%'},
    {n:'4',label:'Autonomous',desc:'Agent closes books, flags anomalies, files reports. Humans set policy.',color:A.violet,pct:'<1%'},
  ];

  levels.forEach((lv,i)=>{
    const x=0.42+i*2.42;
    const h=0.9+i*0.52;
    const y=4.9-h;
    // Staircase bar
    s.addShape(R,{x,y,w:2.24,h,fill:{color:lv.color},line:{color:lv.color},shadow:sh()});
    s.addText(`L${lv.n}`,{x,y:y+0.08,w:2.24,h:0.36,fontSize:18,bold:true,color:A.W,fontFace:F,align:'center',margin:0});
    s.addText(lv.label,{x,y:y+0.44,w:2.24,h:0.28,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',margin:0});
    // Description card below staircase
    crd(s,x,4.94,2.24,0.2,{bg:A.card,border:lv.color});
    // Pct badge above bar
    s.addShape(R,{x:x+0.62,y:y-0.36,w:1.0,h:0.3,fill:{color:A.card},line:{color:lv.color,pt:0.8}});
    s.addText(lv.pct+' of enterprises',{x:x+0.62,y:y-0.36,w:1.0,h:0.3,fontSize:7,color:lv.color,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  // ACME marker
  s.addShape(R,{x:2.66,y:1.88,w:2.42,h:0.32,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('◄  ACME is HERE',{x:2.66,y:1.88,w:2.42,h:0.32,fontSize:8.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  ftr(s,'Module 2.5  ·  Maturity Model',24,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 25 — MATURITY LEVELS DETAIL
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.5 — Maturity Model','Maturity Level Detail');

  const levels=[
    {
      n:'L1', label:'Assisted', pct:'68%', color:A.inkD,
      who:'Most enterprises — including 68% of F500',
      tools:'Tableau, Power BI, Excel, custom reports',
      limit:'Every answer requires a human to write a query or build a chart',
      ai:'None',
    },
    {
      n:'L2', label:'Augmented', pct:'24%', color:A.brand,
      who:'ACME Finance — ahead of most peers',
      tools:'NL query (text_to_sql), AI commentary draft, variance RCA',
      limit:'Agent assists but analyst owns the workflow',
      ai:'Claude on Bedrock + Lambda tools',
    },
    {
      n:'L3', label:'Integrated', pct:'7%', color:A.teal,
      who:'Early adopters — typically tech-sector finance teams',
      tools:'Agent handles close checklist items, auto-reconciliation',
      limit:'Humans review and approve; agent executes',
      ai:'AgentCore + multi-step workflows',
    },
    {
      n:'L4', label:'Autonomous', pct:'<1%', color:A.violet,
      who:'Frontier — emerging in 2026–2028',
      tools:'Agent closes books, flags anomalies, files regulatory reports',
      limit:'CFO sets policy; agent operates',
      ai:'Full agent loop + human-in-the-loop governance',
    },
  ];

  const cols=[0.32,2.44,4.56,6.68];
  const colW=2.0;
  levels.forEach((lv,i)=>{
    const x=cols[i];
    crd(s,x,1.05,colW,4.08,{});
    s.addShape(R,{x,y:1.05,w:colW,h:0.44,fill:{color:lv.color},line:{color:lv.color}});
    s.addText(`${lv.n} — ${lv.label}`,{x,y:1.05,w:colW,h:0.44,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addShape(R,{x:x+0.1,y:1.58,w:colW-0.2,h:0.22,fill:{color:A.card},line:{color:lv.color,pt:0.8}});
    s.addText(lv.pct+' of market',{x:x+0.1,y:1.58,w:colW-0.2,h:0.22,fontSize:7.5,color:lv.color,fontFace:F,align:'center',valign:'middle',margin:0});

    const fields=[
      {k:'Who',v:lv.who},
      {k:'Tools',v:lv.tools},
      {k:'Human role',v:lv.limit},
      {k:'AI used',v:lv.ai},
    ];
    fields.forEach((f,j)=>{
      s.addText(f.k,{x:x+0.08,y:1.88+j*0.56,w:colW-0.16,h:0.22,fontSize:7.5,bold:true,color:A.inkD,fontFace:F,margin:0});
      s.addText(f.v,{x:x+0.08,y:2.1+j*0.56,w:colW-0.16,h:0.28,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
    });
  });

  // ACME marker
  s.addShape(R,{x:2.44,y:5.12,w:2.0,h:0.22,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('ACME is here  ▲',{x:2.44,y:5.12,w:2.0,h:0.22,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  ftr(s,'Module 2.5  ·  Maturity Model',25,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 26 — WHERE ENTERPRISES ARE
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 2','Module 2.5 — Maturity Model','Industry Distribution: Where Enterprises Actually Are');

  // Distribution bar chart
  const dist=[
    {label:'L1 — Assisted',pct:68,color:A.inkD},
    {label:'L2 — Augmented',pct:24,color:A.brand},
    {label:'L3 — Integrated',pct:7,color:A.teal},
    {label:'L4 — Autonomous',pct:1,color:A.violet},
  ];
  const maxW=6.0;
  dist.forEach((d,i)=>{
    const y=1.2+i*0.88;
    const bw=(d.pct/100)*maxW;
    s.addText(d.label,{x:0.42,y:y+0.14,w:2.2,h:0.28,fontSize:9,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:2.72,y:y+0.08,w:bw,h:0.44,fill:{color:d.color},line:{color:d.color},shadow:sh()});
    s.addText(`${d.pct}%`,{x:2.72+bw+0.12,y:y+0.08,w:0.7,h:0.44,fontSize:11,bold:true,color:d.color,fontFace:F,valign:'middle',margin:0});
  });

  // Source
  s.addText('Source: Gartner 2024 CFO Survey — Finance Technology Adoption (approximate)',
    {x:0.42,y:4.68,w:6.5,h:0.28,fontSize:7.5,italic:true,color:A.inkM,fontFace:F,margin:0});

  // Callout
  crd(s,7.02,1.1,2.56,3.72,{bg:A.brandS,border:A.brand,accent:A.brand});
  s.addText('ACME is ahead of the curve',{x:7.18,y:1.18,w:2.24,h:0.44,fontSize:9.5,bold:true,color:A.brand,fontFace:F,align:'center',margin:0});
  s.addText('76% of enterprises are still at L1 or lower',{x:7.18,y:1.68,w:2.24,h:0.44,fontSize:8.5,color:A.brandD,fontFace:F,align:'center',margin:0});
  s.addShape(R,{x:7.18,y:2.18,w:2.24,h:0.015,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('Moving from L1 → L2 in 10 weeks is the wedge. L3 follows naturally once the data foundation is in place.',
    {x:7.18,y:2.26,w:2.24,h:0.82,fontSize:8,color:A.brandD,fontFace:F,align:'center',margin:0});
  s.addShape(R,{x:7.18,y:3.18,w:2.24,h:0.015,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('ACME positions itself for L3 by end of 2026 — putting it in the top 7% globally.',
    {x:7.18,y:3.26,w:2.24,h:0.52,fontSize:8,color:A.brandD,fontFace:F,align:'center',margin:0});

  ftr(s,'Module 2.5  ·  Maturity Model',26,TOT);
}

// ══════════════════════════════════════════════════════
// SLIDE 27 — SECTION 2 RECAP + NEXT
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('Section 2 — Complete',{x:0.42,y:0.1,w:7,h:0.42,fontSize:18,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.52,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});

  const checks=[
    'P&L structure: Revenue → GP (77.5%) → OpEx → Operating Income (−9.4%). ACME is a high-growth SaaS.',
    'SaaS metrics: ARR, NRR (>100% = growth from existing), Churn, CAC, LTV. Your ROI connects here.',
    '5 CFO pain points share one root cause: data locked away. $1.9M annual cost; $1.2M recoverable.',
    '2019 AI failed because of no foundation models, no clean data layer, and ML expertise gaps.',
    'Three-shift convergence (foundation models + Bedrock GA + dbt) makes 2024–2026 structurally different.',
    '3 Lambda tools: text_to_sql (NL → answer), variance_rca (28× ROI), whatif_sim (instant scenarios).',
    'ACME at Level 2 (top 24%). Path to Level 3 by end of 2026 — top 7% globally.',
  ];
  checks.forEach((c,i)=>{
    s.addShape(OV,{x:0.42,y:0.66+i*0.52,w:0.26,h:0.26,fill:{color:A.teal},line:{color:A.teal}});
    s.addText('✓',{x:0.42,y:0.66+i*0.52,w:0.26,h:0.26,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c,{x:0.8,y:0.66+i*0.52,w:8.8,h:0.44,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  // Next section teaser
  s.addShape(R,{x:0.42,y:4.78,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
  s.addShape(R,{x:0.42,y:4.86,w:9.16,h:0.38,fill:{color:A.violetS},line:{color:A.violet,pt:1}});
  s.addText('Next: Section 3 — Transformation Strategy  →  Use cases, architecture, and the 10-week roadmap',
    {x:0.56,y:4.87,w:8.9,h:0.36,fontSize:10,bold:true,color:A.violet,fontFace:F,valign:'middle',margin:0});

  ftr(s,'Section 2 Complete  ·  Finance Domain and the Problem We\'re Solving',27,TOT,true);
}

// Save
pres.writeFile({fileName:OUT}).then(()=>{
  console.log('✓ section-2-slides.pptx written to', OUT);
}).catch(e=>{
  console.error('ERROR:', e);
  process.exit(1);
});
