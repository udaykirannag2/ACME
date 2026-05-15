# Section 2 — Narration Script
## Finance Domain and the Problem We're Solving
**Target pace:** 130 words per minute | **Total duration:** ~65 minutes

---

**[SLIDE 1] Section 2 — Finance Domain & the Problem We're Solving**

Welcome to Section 2. [PAUSE 2s] Before we write a single line of architecture, we need to get grounded in the domain. And I know some of you are thinking — "I'm a Solution Architect, not an accountant. Why do I need to know finance?" [PAUSE 1s] Here's why. The person signing the check for your Bedrock deployment is a CFO. If you walk into that room and you can't speak her language, you lose the deal — or worse, you build the wrong thing.

So in this section we're going to cover six modules. We start with a Finance Basics 101 primer — fast, practical, no prior knowledge assumed. Then we move into the five CFO pain points ACME Finance is solving, the business case for doing something, why this moment in 2024 to 2026 is structurally different from 2019, what our three AI capabilities actually do, and finally, where enterprises sit on the AI maturity curve.

[POINT to module list] Six modules. About sixty-five minutes total. By the end of this section, you will be able to walk into a CFO's office, speak her language, and position AI as a financial decision — not a technology decision. [PAUSE 2s] Let's go.

---

**[SLIDE 2] Reading a P&L in 5 Minutes**

[CLICK] Alright — let's read a P&L. [POINT to left waterfall] This is the structure of every income statement you will ever see. It's a waterfall. You start at the top with Revenue — everything the company billed. Then you subtract the Cost of Goods Sold — that's what it costs to deliver the product. What's left is Gross Profit.

[CLICK] For ACME, revenue is $1.8 billion. COGS is about $407 million. That gives us a Gross Profit of $1.4 billion — a 77.5% gross margin. [PAUSE 1s] That is outstanding. Software margins in the 70s and above mean almost every dollar of additional revenue drops nearly pure to gross profit.

[POINT to OpEx table] Then we subtract Operating Expenses — Sales and Marketing, Research and Development, and General and Administrative. Those three lines total $1.57 billion for ACME. [POINT to Operating Income bar] Subtract that from Gross Profit and you get Operating Income — negative $170 million, or negative 9.4% operating margin.

[PAUSE 2s] Now don't panic at the negative number. This is textbook high-growth SaaS. The company is investing ahead of its revenue base — burning cash intentionally to capture market share. The question for the CFO is: how do we get data-driven enough to invest smarter, faster? That's what we're here to solve.

---

**[SLIDE 3] SaaS Metrics That Matter**

[CLICK] Five metrics. Memorize these. [POINT to ARR] ARR — Annual Recurring Revenue. $1.8 billion for ACME. This is the north star. Every conversation with a CFO starts and ends here.

[POINT to NRR] NRR — Net Revenue Retention. 118%. This is the one that separates good SaaS businesses from great ones. NRR above 100% means existing customers are spending more than they did last year — through upsells, expansions, add-ons. Even if ACME signed zero new customers this year, it would still grow 18% from its existing base. [PAUSE 1s] That's the magic of SaaS.

[POINT to Churn] Churn — 4.2% annually. Logo churn is how many customers you lose. Revenue churn is how much ARR you lose. Low churn plus high NRR is the combination every investor wants to see.

[POINT to CAC and LTV] CAC — Customer Acquisition Cost — $28.4K per customer. LTV — Lifetime Value — $142K. The LTV-to-CAC ratio is 5-to-1. Healthy is anything above 3-to-1.

[PAUSE 2s] [POINT to the dark card] Now — why do Solution Architects need to know this? Because when you pitch your AI solution, the CFO doesn't care about Lambda functions. She cares about NRR improvement and churn reduction. Your ROI narrative has to connect to these numbers. Start there.

---

**[SLIDE 4] The FP&A Calendar**

[CLICK] This is the rhythm of a finance team's life. [POINT to circle] It's a monthly cycle, and it never stops. Let me walk you around it.

[POINT to node 1] It starts with Annual Planning in October and November — the big budget exercise where every department submits their plan for the coming year. Then the year begins and the cycle repeats monthly. [POINT to node 2] Monthly Close — this is where the team reconciles all transactions and produces the official financial statements. Takes three to five days on average.

[POINT to node 3] Day three, you get a Flash Report — a quick preliminary read on the numbers before everything is fully closed. [POINT to node 4] Then Variance Analysis — comparing actuals to plan and figuring out what drove the difference. [POINT to node 5] Then Management Commentary — someone has to actually write the narrative that explains what happened. [POINT to node 6] And finally the Board Pack — the full quarterly deck that goes to the board of directors.

[PAUSE 2s] [POINT to the warning callout] Here's the critical thing to understand. Steps two through four — close, flash, variance — consume the majority of those five close days. And most of that time is not analysis. It's data wrangling. Pulling numbers from fourteen different places, reconciling them, formatting them. [PAUSE 1s] That three-day bottleneck is exactly what AI compresses. Keep that in mind for the rest of this section.

---

**[SLIDE 5] Module 2.0 Recap**

[CLICK] Quick module recap before we move into the pain points. [PAUSE 1s]

[POINT to checks] P&L structure — Revenue minus COGS equals Gross Profit. Gross Profit minus OpEx equals Operating Income. ACME runs at 77.5% gross margin with a negative 9.4% operating margin. Classic high-growth SaaS profile.

ARR and NRR are the two numbers CFOs anchor every conversation to. NRR above 100% means the business grows from within — that's durable.

Churn, CAC, and LTV define the unit economics. Your solution's ROI narrative should connect to at least one of these.

The FP&A calendar runs monthly — plan, close, flash, variance, commentary, board pack.

And the big insight: there's a three-day data-wrangling bottleneck inside the close cycle that is the primary target for everything we're building.

[PAUSE 2s] [POINT to closing line] You now know enough finance to build for finance teams. Seriously — most technology vendors walk into CFO conversations knowing none of this. You just got a meaningful edge. [PAUSE 1s] Let's go use it. Module 2.1 — the five problems we're solving.

---

**[SLIDE 6] Module 2.1 — Five Problems We're Solving**

[CLICK] Module 2.1. CFO Pain Points. [PAUSE 1s]

[POINT to intro callout] I want to start with this framing: the ACME CFO does not have a technology problem. She has five time-and-accuracy problems. And they all share a root cause that we'll get to at the end of this module.

[POINT to the five cards] Let's name the five. One — Close Takes Too Long. Average of 6.4 days. Two — Variance Lag. Two to three days to explain what happened. Three — Forecast Drift. Spreadsheet models diverge 8 to 12 percent by Q3. Four — Data Bottleneck. Every ad-hoc question takes 48 hours. Five — Commentary Hours. One full day to write the board pack narrative.

[PAUSE 2s] None of these are exotic problems. Every finance team in the world deals with them. But at ACME's scale — twelve FP&A analysts, $1.5 million in fully-loaded headcount — these problems have real dollar consequences. [PAUSE 1s] Let's go deeper on each one.

---

**[SLIDE 7] Pain Points 1–3: Time and Accuracy**

[CLICK] Pain points one, two, and three. All about time.

[POINT to card 01] Pain Point One — Close Takes Too Long. The industry average for a monthly financial close is 6.4 days. [PAUSE 1s] Of those 6.4 days, three are spent on data wrangling. Pulling numbers from Redshift, from the ERP, from spreadsheets, reconciling them, formatting them for the next step in the process. Three days of six. That's 47% of the entire close cycle spent on work that generates zero insight.

[POINT to card 02] Pain Point Two — Variance Lag. Here's the scenario. The CFO gets the flash report on Day 3 of close. It shows that R&D spending came in $4.9 million over plan. Great — she knows the number. But the "why" — the root cause — takes two to three more days while analysts manually cross-reference the P&L against headcount reports, GL transactions, and budget submissions. The board meets in 48 hours. She needs the explanation in hours, not days.

[POINT to card 03] Pain Point Three — Forecast Drift. Finance teams update their spreadsheet models monthly. But business conditions change weekly. By the time you're in Q3, the model that was built in November has drifted so far from reality that the Q3 reforecast is a full fire drill. Eight to twelve percent forecast error by late in the year is common. [PAUSE 1s] And nobody gets alerted when the drift starts. It's silent.

[PAUSE 2s] Notice the AI targets on the right. Less than four days on close. Root cause in minutes. Continuous simulation instead of quarterly reforecasting. Those are the promises we're delivering on.

---

**[SLIDE 8] Pain Points 4–5: Data Access and Communication**

[CLICK] Pain points four and five. These are where the most analyst time gets burned.

[POINT to card 04] Pain Point Four — the Data Bottleneck. Here's what actually happens when a VP of Sales asks the CFO "what were EMEA bookings by segment last quarter?" The CFO turns to her FP&A team. The FP&A analyst has to open a ticket with the data team, or write a SQL query herself, or find someone who can. That takes anywhere from a few hours to two days. [PAUSE 1s] In the meantime, the VP is making decisions without data, or waiting.

This is happening constantly. Every ad-hoc question — and there are dozens per week — creates a queue. The analysts spend 60% of their time on data retrieval. Not analysis. Retrieval. [PAUSE 1s] That's the problem we're eliminating with natural language querying.

[POINT to card 05] Pain Point Five — Commentary Hours. Writing the board pack narrative takes one full analyst day. Here's the breakdown: 80% of that time is formatting — pulling prior-period text, adjusting numbers, matching the template, fixing version conflicts across multiple Google Docs. The actual insight generation — the 20% that the board actually cares about — gets rushed at the end. [PAUSE 1s] Three analysts are usually involved, and the tone and accuracy vary by author. That's a governance problem, not just an efficiency problem.

---

**[SLIDE 9] The Hidden Cost: $900K Not Spent on Analysis**

[CLICK] Let's make this concrete with math. [PAUSE 1s]

[POINT to left panel] ACME has twelve FP&A analysts. Fully loaded — salary, benefits, overhead — each one costs about $125,000 per year. Twelve times $125K is $1.5 million per year in team cost.

[POINT to time allocation bars] Now look at how that time is actually spent. Sixty percent on data wrangling. Twenty-five percent on actual analysis and insight generation. Fifteen percent on reporting and formatting. [PAUSE 2s]

[POINT to right panel] Sixty percent of $1.5 million is $900,000 per year. [PAUSE 1s] $900,000 per year is being spent by highly skilled, expensive analysts doing work that software should do. That is not analysis. That is not the reason you hired a finance team. That is $900K of zero-insight-value activity happening every year.

[POINT to insight capacity] And here's the flip side — only $375K of team capacity, 25%, is available for actual analysis. For the thinking work. For the "why" and the "what should we do about it." [PAUSE 2s]

[POINT to callout] That is the opportunity. Not just saving money — restoring human capacity to where it creates value.

---

**[SLIDE 10] One Root Cause**

[CLICK] [PAUSE 2s] Five pain points. One root cause.

[POINT to quote] "Data is locked away from the people who need it." [PAUSE 2s]

[POINT to the five colored blocks] Think about it. Close lag — analysts can't pull data without writing SQL. Variance delay — the explanation sits in three disconnected systems that require manual cross-referencing. Forecast drift — the model lives in Excel, disconnected from live data. Data bottleneck — every question requires an IT ticket. Commentary hours — pulling prior-period text is manual because there's no structured narrative layer.

[POINT to the bottom brand bar] All five map to the same failure: analysts cannot query their own data without going through a technical intermediary. Every one of these problems is a symptom of that one root cause.

[PAUSE 2s] That is what we're going to fix. And the way we fix it is by giving finance a natural language interface to their own data — so they can ask questions in plain English and get answers in seconds, not days. [PAUSE 1s] But first — let's understand what that manual status quo is actually costing in dollars.

---

**[SLIDE 11] Module 2.2 — What Staying Manual Actually Costs**

[CLICK] Module 2.2. Cost of Inaction. [PAUSE 1s]

Most organizations know they have a problem. Very few know what it is costing them in actual dollars. And that distinction matters enormously — because when you walk into a CFO's office, she will ask you for the business case. [PAUSE 1s] "What is the ROI?" If you can't answer that with numbers, the conversation ends.

[POINT to three KPI cards] So we're going to build that business case right now. Three numbers. $1.9 million — the total quantified annual cost of manual FP&A at ACME's scale. $1.2 million — the amount we can recover with AI. And 28 times — the ROI on variance root-cause analysis alone. [PAUSE 1s]

[POINT to bottom text] In this module, we are building the document you bring into the CFO's office. Not the technical architecture document. The business case. [PAUSE 2s] Let's go.

---

**[SLIDE 12] Annual Cost of Manual Finance: $1.9M**

[CLICK] Five line items. Five sources of quantifiable cost. [PAUSE 1s]

[POINT to bars in order] Forecast errors — $450K. This is the cost of decisions made on stale or inaccurate forward projections. Missed opportunities, over-investment in the wrong areas. [PAUSE 1s] Close lag — $420K. Opportunity cost of delayed decisions. Every extra day the close takes is a day the business operates without current data. Variance delay — $380K. Same concept — decisions made before the root cause is understood are often wrong decisions. Data bottleneck — $380K. That's your analyst hours, multiplied out. Commentary — $270K.

[POINT to total] Add it up: $1.9 million per year. [PAUSE 1s] [POINT to the red callout card] That is the cost of staying manual at ACME's scale. Not a consulting estimate pulled from thin air — this is built from actual team composition, actual time allocation, and actual business impact.

[PAUSE 2s] Now — not all of it is recoverable. AI is not magic. But a significant portion of it is. Let's look at what we can actually get back.

---

**[SLIDE 13] $1.2M Recoverable with AI**

[CLICK] [POINT to table] This table is your business case. Let me walk you through it.

Close lag — $420K annual cost. We recover $290K — 69%. How? By compressing the data-wrangling portion of close from three days to under one day using automated reconciliation and NL querying. [PAUSE 1s]

Variance delay — $380K annual cost. We recover $340K — 89%. [PAUSE 1s] This is the 28-times ROI line. Think about what we're replacing: a three-analyst, three-day manual process of cross-referencing the P&L, headcount reports, and GL data. We replace it with an agent that runs root-cause analysis in four minutes. $340,000 saved on a process that used to cost three senior analyst-days every single month.

Forecast errors — $450K. We recover $320K by replacing the quarterly spreadsheet reforecast with continuous what-if simulation. Drift gets caught early, not at Q3 fire-drill time.

Data bottleneck — $380K. We recover $180K. Conservative — because not every ad-hoc question can be answered by the agent today. But 47% of the bottleneck cost goes away with NL querying.

Commentary — $270K. We recover $70K — the most conservative number. AI drafts the narrative, analysts review and refine. Saves the 80% formatting time, not the 20% insight time.

[PAUSE 2s] [POINT to KPI callouts] Total: $1.2 million recovered. That is 80% of the cost of an additional FP&A headcount — freed to do actual analysis instead of wrangling data.

---

**[SLIDE 14] The CFO Conversation**

[CLICK] [PAUSE 2s] [POINT to quote] "You're not selling technology. You're selling $1.2 million back to the finance team." [PAUSE 2s]

This is the most important reframe in this entire section. When you walk into a CFO's office, the conversation is not about Bedrock, Claude, Lambda, or dbt. Those words should not come up in the first meeting. Maybe not even the second meeting.

[POINT to red card] Here's what not to say: "We're implementing an AI agent on Bedrock." "It uses Anthropic Claude with RAG and dbt." "The architecture has Lambda and Redshift." [PAUSE 1s] None of those sentences answer the question the CFO is actually asking, which is: "What does this do for me?"

[POINT to green card] Here's what to say: "Your analysts spend $900K per year on data wrangling." "We recover $1.2 million — starting with your close cycle." "You'll see the first result in six weeks. The board sees it in ten." [PAUSE 2s]

Lead with the business outcome. Let the architecture be the appendix, not the headline. [PAUSE 1s] When you frame it this way, the CFO hears a financial return, not a technology project. That's a fundamentally different conversation — and a much easier one to get approved.

---

**[SLIDE 15] Module 2.3 — Why This Didn't Work in 2019**

[CLICK] Module 2.3. Why Now? [PAUSE 1s]

Before we talk about why this works today, we need to understand why it failed before — because it has been tried. And understanding that failure is what makes our architecture recommendation defensible.

[POINT to intro callout] Finance AI had a first wave around 2019. Custom NLP models, big investments, multi-year projects. Most of them failed or were abandoned. [PAUSE 1s] If you walk into a CFO meeting and she's been through that experience, she is skeptical. Rightfully so. You need to be able to explain what is different now — and that explanation has to be structural, not just optimistic.

[POINT to three shift cards] Three things have fundamentally changed. Foundation models. Amazon Bedrock going GA. And dbt maturity. [PAUSE 1s] Each one of these independently would be interesting. Together, they create a convergence that makes 2024 to 2026 structurally different from anything that came before. Let's go through each one.

---

**[SLIDE 16] The 2019 Attempt: What Went Wrong**

[CLICK] [POINT to KPI stats] Let me paint the picture. In 2019, a typical enterprise AI project for finance looked like this. Eighteen months of model training just to reach baseline accuracy. Two million dollars or more in investment — custom NLP model development, data science teams, infrastructure. And after all of that: 62% accuracy on financial query understanding. [PAUSE 1s] 62%. The finance team abandoned it and went back to Excel.

[POINT to failure reasons] Why did it fail? Four reasons. [PAUSE 1s]

First — no foundation. Custom NLP models had to learn financial language from scratch. Words like "COGS," "OpEx," "variance to plan," "YoY" — these are not in Wikipedia. The model had no starting point.

Second — data wasn't ready. Finance data lived in fourteen spreadsheets and a legacy ERP with no semantic layer. Every query was a custom ETL job. The model couldn't learn from chaos.

Third — ML expertise gap. The finance team couldn't maintain the models. IT owned them. When queries drifted, retraining took months.

[POINT to fourth reason] Fourth — and this is the killer — 62% accuracy sounds decent until you apply it to finance. A 38% error rate means the CFO cannot trust a single number the system produces. [PAUSE 1s] Trust is everything in finance. One wrong number in a board presentation and the whole system gets thrown out.

---

**[SLIDE 17] Three-Shift Convergence: What Changed**

[CLICK] So what is different now? Three things that happened between 2019 and today. [PAUSE 1s]

[POINT to column 1] Shift One — Foundation Models. Claude, GPT-4, Gemini. These models were trained on essentially all of human text, including finance textbooks, earnings calls, analyst reports, SEC filings. They understand financial language out of the box. "What was our EMEA variance to plan?" — that sentence is parsed correctly on the first try. No custom training. No 18-month runway. [PAUSE 1s] And critically, these models don't just retrieve data — they reason about it. They can explain what a number means, not just return it.

[POINT to column 2] Shift Two — Amazon Bedrock GA. Bedrock went generally available in late 2023. What does that mean for us? Managed inference — no GPU fleet to operate, no ML engineers needed to keep models alive. SOC 2 Type II compliant, HIPAA eligible, VPC isolation. Pay per token with no minimum commitment. [PAUSE 1s] And AgentCore launched in 2024 — managed agent orchestration. The infrastructure problem is solved.

[POINT to column 3] Shift Three — dbt maturity. The dbt semantic layer means finance teams now have clean, tested, documented SQL models. `mart_pl`, `mart_arr`, `mart_variance` — these marts are AI-queryable out of the box. Metric definitions are locked in YAML, which means the LLM cannot hallucinate them. The logic is version-controlled and reproducible. [PAUSE 2s]

These three things did not exist together in 2019. They exist together now. That's the answer to "why now."

---

**[SLIDE 18] The Timeline**

[CLICK] Let me put this in historical context. [PAUSE 1s]

[POINT to 2019 card] 2019 — first wave. Custom NLP, $2M, 62% accuracy. Finance teams abandoned it. This is the scar tissue that makes CFOs skeptical today.

[POINT to 2022 card] 2022 — foundation models emerge. GPT-3.5 first, then GPT-4. For the first time, financial language is understood without custom training. Proofs of concept start working in days instead of months. The energy in the space shifts dramatically.

[POINT to 2024 card] 2024 — Bedrock GA plus AgentCore. This is the enterprise readiness inflection point. Managed inference, enterprise security posture, agent orchestration. The infrastructure is production-ready. This is when serious enterprise deployments begin.

[POINT to 2026 card] 2026 — what we're building today. ACME is live on Bedrock. Natural language querying, variance root-cause analysis, what-if simulation. Real analysts, real data, real business outcomes.

[PAUSE 2s] The arc from 2019 to 2026 is not a straight line — it's a step function. 2022 changed what was possible. 2024 changed what was practical. 2026 is when it becomes expected.

---

**[SLIDE 19] The First-Mover Window**

[CLICK] [PAUSE 2s] [POINT to quote] "The CFOs who deploy this in 2025 to 2026 will expect it everywhere by 2027. The window is open — but it won't stay open."

[PAUSE 2s] Let me give you three reasons to take this seriously as urgency, not just enthusiasm.

[POINT to card 1] Competitive pressure. This is not a fringe conversation anymore. Finance transformation is a board-level discussion at 40% of Fortune 500 companies right now, according to Gartner's 2025 research. Your client's peers are already in pilot. The question is not whether this happens — it's whether they lead or follow.

[POINT to card 2] Cost of waiting. Every quarter of staying manual is another $475,000 in recoverable costs left on the table. Two more quarters of delay is essentially another analyst salary wasted. The CFO can frame this as a cost of inaction, not just a cost of investment.

[POINT to card 3] Compounding advantage. The teams that build the data foundation now — clean dbt marts, Bedrock wiring, agent scaffolding — will have a 12-month head start on every subsequent capability. Level 3 maturity requires Level 2 infrastructure. You can't skip steps.

[PAUSE 2s] The window is genuinely open. But windows close. Let's move into what the system actually does.

---

**[SLIDE 20] Module 2.4 — Three Things AI Can Do for Finance**

[CLICK] Module 2.4. Three AI Capabilities. [PAUSE 1s]

[POINT to intro callout] The ACME Finance Agent exposes three Lambda-backed tools. Each one maps directly to a CFO pain point. This is an important framing for your architecture conversations — every tool we build has a business problem it's solving. There are no capabilities without a use case.

[POINT to capability 1] Capability One — NL Understanding. The `text_to_sql` tool. This is your answer to the data bottleneck problem. Any question in plain English becomes a SQL query, executes against Redshift, and returns an answer. No SQL knowledge needed.

[POINT to capability 2] Capability Two — Reasoning and Root-Cause Analysis. The `variance_rca` tool. This is your answer to variance lag. Actuals versus plan, ranked by magnitude, with the agent drafting the explanation. 28 times ROI.

[POINT to capability 3] Capability Three — Simulation. The `whatif_sim` tool. This is your answer to forecast drift. "What if we cut R&D by 15%?" — instant scenario modeling, no spreadsheet required.

[PAUSE 2s] Three tools. Three pain points. Let's look at each one in depth.

---

**[SLIDE 21] Capability 1 — NL Understanding: text_to_sql**

[CLICK] [POINT to flow diagram] Let me walk through this step by step because this is the capability that most immediately transforms the analyst experience.

[POINT to step 1] The CFO asks: "What was EMEA revenue in Q3 2024?" Plain English. No SQL. No ticket.

[POINT to step 2] The agent parses the question. It identifies the dimension — region. The filter — EMEA. The time period — Q3. The metric — revenue. This parsing happens because the foundation model understands financial language out of the box.

[POINT to step 3] The agent generates SQL — a SELECT SUM from the mart_pl table with the right WHERE clauses. The model knows the mart_pl table exists and what's in it because we've given it the schema metadata in the system prompt.

[POINT to step 4] That SQL executes against Redshift. Returns $312.4 million in 0.8 seconds.

[POINT to step 5] The agent delivers the answer: "EMEA Q3 revenue was $312.4M, plus 14.2% versus plan."

[PAUSE 2s] [POINT to right panel] Total time: under three seconds. Previously: 48-hour wait for a SQL query from the data team. [PAUSE 1s] Any analyst. Any question. Zero tickets. That is the transformation.

---

**[SLIDE 22] Capability 2 — Reasoning: variance_rca**

[CLICK] [POINT to variance table] This is variance root-cause analysis. Here's October 2024 — actuals versus plan.

[POINT to top row] The number one driver of the $4.9 million over-plan variance: R&D Personnel in Engineering EMEA. $18.2 million actual versus $15.1 million plan — $3.1 million over, 20.5% above budget. [PAUSE 1s] Number two: cloud infrastructure on AWS. Number three: S&M events. Number four: G&A professional services.

The table is ranked by magnitude. The agent surfaced this ranking in four minutes. [PAUSE 1s] Previously, this ranking took three analysts three days — manually pulling headcount reports, GL transactions, and vendor invoices to figure out what drove the number.

[POINT to agent explanation panel] And here's the part that's genuinely impressive. The agent doesn't just surface the number — it drafts the explanation. [READ] "October variance of plus $4.9M versus plan is driven primarily by R&D Personnel in Engineering EMEA. Contributing factors: three senior engineer hires were accelerated from Q1 2025 into Q4 2024 following competitive retention pressure." [PAUSE 1s]

That sentence is not just retrieved from a database. It is reasoned from the data. The agent connected the headcount change to the budget timing to the retention context — and synthesized it into a coherent explanation.

[POINT to ROI callout] 28 times ROI. $340K saved. Three analyst-days replaced by four agent minutes. Every month.

---

**[SLIDE 23] Capability 3 — Simulation: whatif_sim**

[CLICK] [POINT to the question bar] The CFO asks: "What if we cut R&D spend by 15% in H2? What does that do to our operating margin?" [PAUSE 1s]

[POINT to the comparison table] In the old world, an analyst would open the financial model in Excel, manually adjust the R&D line, re-link the formulas, recalculate the P&L, and produce a scenario output — probably two to three hours of work, minimum. [PAUSE 1s]

[POINT to AFTER column] With the `whatif_sim` tool — three seconds. Here are the results. R&D spend drops from $578.5 million to $491.7 million. R&D as a percentage of revenue drops from 32% to 27.2%. Operating margin improves from negative 9.4% to negative 6.1%.

[POINT to DELTA column] The delta: plus 3.3 percentage points of operating margin improvement. Plus $62.9 million in operating income recovery. [PAUSE 1s]

[POINT to outcome callouts] 348 basis points of margin improvement. $62.9 million back. And the CFO gets this answer in under three seconds versus two to three hours for a spreadsheet scenario. [PAUSE 2s]

Now — the agent is not making a recommendation here. It's not saying "cut R&D." It's giving the CFO the information she needs to make that call herself. The agent augments the decision. The human makes it. That's the design philosophy throughout.

---

**[SLIDE 24] Module 2.5 — The Four Levels of Finance AI Maturity**

[CLICK] Module 2.5. The Maturity Model. [PAUSE 1s]

[POINT to intro callout] Before you walk into a client conversation, you need to know where they are. Not every enterprise is starting from the same place. This maturity framework helps you position correctly — and helps your client see a clear path from where they are to where they want to go.

[POINT to the staircase] Four levels. Let me call them out. [PAUSE 1s]

[POINT to L1] Level 1 — Assisted. This is where 68% of enterprises live right now. Dashboards, BI tools, Excel. Humans query everything. Humans interpret everything. AI involvement: essentially none.

[POINT to L2] Level 2 — Augmented. Natural language queries, AI-drafted commentary, variance RCA. Analysts guide, the AI executes. This is where ACME is today — and it puts ACME ahead of 76% of its peers.

[POINT to L3] Level 3 — Integrated. The agent handles close workflow steps autonomously. Humans review and approve. Fewer than 10% of enterprises are here.

[POINT to L4] Level 4 — Autonomous. The agent closes the books, flags anomalies, files reports. Humans set policy. Less than 1% of enterprises are here today.

[PAUSE 2s] [POINT to ACME marker] ACME is at Level 2. The path to Level 3 is clear — it's the same data foundation, extended with multi-step agentic workflows. We'll cover that in Section 3.

---

**[SLIDE 25] Maturity Level Detail**

[CLICK] Let me give you the detail on each level so you can have this conversation with a client wherever they are.

[POINT to L1 column] Level 1 — Assisted. 68% of the market. These are your Tableau shops, your Power BI customers, your Excel-heavy finance teams. Every answer requires a human to build a query or a chart. The AI involvement is essentially zero. If your client is here, the conversation is "let's get you to Level 2 and unlock the value immediately."

[POINT to L2 column] Level 2 — Augmented. ACME is here. The tools are natural language querying, AI commentary drafting, variance RCA. The human analyst owns the workflow but the agent does the heavy lifting. This is the sweet spot for an initial deployment — high impact, low disruption.

[POINT to L3 column] Level 3 — Integrated. Seven percent of enterprises. These are typically tech-sector finance teams that have already built the data foundation and are comfortable with agentic automation. The agent handles checklist items — auto-reconciliation, validation, data pulls — and humans review the outputs.

[POINT to L4 column] Level 4 — Autonomous. Less than 1%. Frontier territory. The agent closes the books end to end, files regulatory reports, flags anomalies. The CFO sets policy. The agent operates. Full human-in-the-loop governance is still required — this is not fire and forget.

[PAUSE 2s] Most of your conversations will be with Level 1 and Level 2 organizations. That's where the volume is.

---

**[SLIDE 26] Industry Distribution: Where Enterprises Actually Are**

[CLICK] [POINT to bar chart] Let's look at this with actual data.

68% of enterprises are at Level 1 — Assisted. They have BI tools. They have dashboards. They have nothing close to natural language querying or AI-assisted analysis. [PAUSE 1s]

24% are at Level 2 — Augmented. This is where ACME sits. This is actually ahead of the curve. Getting here requires investment in a clean data layer and the willingness to trust an AI agent with finance workflows — which is not trivial.

7% are at Level 3 — Integrated. Small number. These are the early adopters. Most of them are technology companies or financial services firms with deep technical resources.

Less than 1% at Level 4 — Autonomous. Experimental territory.

[PAUSE 2s] [POINT to the right callout panel] Here's the strategic implication. 76% of enterprises are still at Level 1 or below. ACME's deployment puts it in the top 24% globally — right now, today, before we even finish the architecture. [PAUSE 1s]

Moving from Level 1 to Level 2 in ten weeks is the wedge. It's the first deliverable. And once the data foundation is in place, Level 3 follows naturally — it's the same infrastructure with more workflow automation layered on top. The CFO who gets to Level 2 this year is the one who gets to Level 3 next year.

---

**[SLIDE 27] Section 2 — Complete**

[CLICK] [PAUSE 2s] Section 2 complete.

[POINT to checks one by one] Let's close the loop. P&L structure — Revenue minus COGS equals Gross Profit, minus OpEx equals Operating Income. ACME at 77.5% gross margin, negative 9.4% operating margin. Classic high-growth SaaS.

SaaS metrics — ARR, NRR above 100% means growth from existing customers. Churn, CAC, LTV define unit economics. Your ROI connects here.

Five CFO pain points. One root cause — data locked away. $1.9 million annual cost. $1.2 million recoverable. 28 times ROI on variance RCA alone.

2019 AI failed because there were no foundation models, no clean data layer, and the ML expertise gap was insurmountable for finance teams. [PAUSE 1s]

The three-shift convergence — foundation models, Bedrock GA, dbt maturity — makes 2024 to 2026 structurally different. Not incrementally better. Structurally different.

Three Lambda tools: `text_to_sql` for the data bottleneck, `variance_rca` for variance lag at 28 times ROI, `whatif_sim` for forecast drift. Instant scenarios.

And ACME is at Level 2 maturity — top 24% globally. Path to Level 3 by end of 2026 puts it in the top 7%.

[PAUSE 3s] [POINT to next section teaser] In Section 3 we move from problem to solution. Transformation strategy — the use cases in detail, the architecture that makes them work, and the 10-week roadmap for getting from zero to a live agent in production. [PAUSE 1s] See you there.
