# Section 8 Narration Script
## Finance AI Agents on AWS: Build Real Systems for FP&A
### Section 8 — Execution: Roadmap, Operating Model, and ROI
**Duration:** ~45 min | **5 modules** | **20 slides** | Target pace: 130 wpm

---

**[SLIDE 1] Section 8 — Execution: Roadmap, Operating Model, and ROI**

Welcome to Section 8. This is the final section of the course — and I want you to feel that weight, because it means something. You've covered a lot of ground. You've seen the live demo. You understand finance well enough to talk to CFOs. You've built the business case, designed the data layer, mapped the AWS architecture, and written the agent code. [PAUSE 2s]

This section is where all of that becomes real. Because knowing how to build something and actually shipping it to production are two different things. And the gap between them is usually not technical — it's execution. It's sequencing. It's people. It's knowing when to show the CFO a demo and when to keep building.

[CLICK] We've got five modules. Eight-one is your first ninety days — a concrete, week-by-week plan for a two-engineer team. Eight-two is the operating model — who does what, and how to handle the "AI will take my job" conversation. Eight-three is pitfalls — what kills these projects, and how you avoid every one of them. Eight-four is measuring ROI — the scorecard that justifies continued investment. And eight-five is the close — a look at everything you've built and where it takes you next. [PAUSE 2s]

Let's start with the plan.

---

**[SLIDE 2] The Sequencing Principle**

Before we get into the week-by-week breakdown, I want to give you the single principle that governs all of it. [POINT] Read it right here: "Build value before complexity."

That sounds obvious. But you'd be surprised how many AI projects violate it. They spend the first six weeks building infrastructure — IAM roles, VPCs, CI/CD pipelines, test frameworks — and then wonder why the CFO has lost interest. [PAUSE 2s]

Here's the reality. The CFO has a budget review at week eight. If they haven't seen anything working by then, the project gets deprioritized. It doesn't get cancelled dramatically — it just quietly runs out of oxygen. [CLICK]

So we design the ninety days around three hard milestones. Week six is Demo Day. The CFO asks a question, the agent answers in under five seconds. Project gets buy-in. Week eight is the CFO Checkpoint — variance RCA shown live, FP&A team validates, project cleared for Month three. And week twelve is the Production Gate — CFO downloads the AI-generated board pack and signs the charter for full production deployment.

[POINT] Notice that each milestone is something the CFO can see and evaluate — not something that exists in a Confluence page. That's the rule. If the CFO can't see value by week eight, your project is at risk. Sequence everything to avoid that outcome.

---

**[SLIDE 3] Month 1 (Days 1–30): Data Foundation + NL Query**

Let's make this concrete. Month one, days one through thirty. Two engineers. One goal. [PAUSE 2s]

[POINT] Weeks one and two are data foundation. You're provisioning Redshift Serverless — that's less than a day if you've done it before. You're cloning the dbt project, configuring profiles, and running `dbt run` to validate your mart tables. The critical check: zero NULLs in dimension columns. If you have NULLs in your entity or period dimensions, the text-to-SQL will produce wrong answers. Fix that before anything else.

[CLICK] Weeks three and four are the NL query layer. You're deploying the text-to-SQL Lambda with schema injection — remember, the schema context is what makes Bedrock know which tables to query. You're configuring the Bedrock Agent with Claude 3 Sonnet, building the FastAPI slash-chat endpoint, and connecting it to your Streamlit interface. Then you run your golden query test: ten questions, ten correct answers. All ten pass before you call it done.

[PAUSE 2s] The Month one milestone is this: the CFO types "What was EMEA revenue in Q3?" and the agent answers in four-point-two seconds. And the CFO says — and I've heard this exact phrase — "that's remarkable." That moment is worth everything you spent to get there.

---

**[SLIDE 4] Month 2 (Days 31–60): Analysis Tools + Memory**

Month two is where the system goes from impressive to genuinely useful. [PAUSE 2s]

[POINT] Weeks five and six are about adding analytical depth. You're building the variance-RCA Lambda — the one that takes an entity, a period, and a dimension, and returns a structured root cause breakdown. You're building the what-if simulation Lambda. And you're deploying AgentCore Gateway so the agent can route between your tools intelligently. Once both Lambdas are registered as action group tools in the Bedrock Agent, you QA them against five variance scenarios and compare to manual Excel. They have to match.

[CLICK] Weeks seven and eight bring in memory and the CFO Checkpoint. You're enabling AgentCore Memory Store, which means the agent can now recall context across sessions. So when the CFO asks "what did we discuss last week about EMEA?" — the agent knows. That's not magic, that's session persistence. Test it thoroughly before the checkpoint.

[PAUSE 2s] And then you do the live demo. Variance RCA, live, in front of the CFO and the FP&A team. The milestone is this: "What drove EMEA variance in October?" answered in fourteen minutes. FP&A validates: a hundred percent accurate. That's the week-eight moment that clears you for Month three.

---

**[SLIDE 5] Month 3 (Days 61–90): Board-Ready Deliverables**

Month three is about turning the system into something that belongs in a boardroom. [PAUSE 2s]

[POINT] Weeks nine and ten are the commentary engine. You're building the slash-commentary endpoint — entity, period, tone parameters — and adding the Commentary tab to your Streamlit interface. The human-in-the-loop workflow matters here: every commentary output goes through an approve, edit, or reject step before it's used. Finance teams need that control. Test it with three FP&A analysts and iterate on tone and format based on their feedback.

[CLICK] Weeks eleven and twelve are the board pack and end-to-end validation. The slash-boardpack endpoint assembles a multi-entity PDF with ACME Finance branding. You run your full regression suite — twenty golden queries, zero regressions allowed. You build the CloudWatch dashboard so you have latency metrics and a complete tool-call audit log.

[PAUSE 2s] And then you do the final demo. The CFO runs a complete board pack generation in a single session, downloads the PDF, and signs the production deployment charter. That's day ninety. That's what you're building toward.

---

**[SLIDE 6] Module 8.2 — The Team and the Change Management Challenge**

Now let's talk about people. Because the technical plan only works if you have the right humans around it. [PAUSE 2s]

Module eight-two is the operating model — who does what, and how to handle the most uncomfortable conversation you'll have on this project: "Is this AI going to take my job?" [CLICK]

This module covers two things. First, the three roles you need on the team — and why you can't ship without all three. Second, the change management reality — the specific fears finance teams have, and the specific answers that actually work. We'll also talk about how to find your Finance Champion, because that person is the project's most important resource.

---

**[SLIDE 7] The Three Roles You Cannot Ship Without**

[POINT] Three roles. Every finance AI project needs all three. If you're missing one, the project is at elevated risk.

The Solution Architect — that's you. You handle AWS service design, Bedrock Agent configuration, Lambda development, AgentCore Gateway and Memory, and everything security-related: VPC, IAM, encryption. You're the person who took this course. [CLICK]

The Analytics Engineer handles the data layer. dbt models, Redshift configuration, data quality — specifically the mart tables that the agent queries. They own schema documentation, which is the schema context that flows into your text-to-SQL prompt. They also own NULL validation and data contracts. Without clean data, the agent produces wrong answers. The Analytics Engineer prevents that.

[CLICK] The Finance Champion is the most important role on the list, and the one most often skipped. This is typically an FP&A manager or senior analyst. They validate every agent output before it goes to the CFO. They own the business logic — they know what the variance formula should be, what the right entity groupings are, what the CFO actually cares about. And critically, they bridge the technology team and the CFO.

[PAUSE 2s] [POINT] Read this rule at the bottom: "The Finance Champion is not optional. They're the reason the CFO trusts the output." Without them, you're a technology team handing unreviewable outputs to a finance executive. That doesn't work.

---

**[SLIDE 8] The Change Management Reality: Three Fears, Three Answers**

Finance teams are protective. That's not a character flaw — it's appropriate. They're responsible for numbers that go to boards, investors, and regulators. When you introduce an AI system, you're asking them to trust something they didn't build and don't fully understand. You need to take that seriously. [PAUSE 2s]

[POINT] Fear one: "The AI will make up numbers." This is the hallucination concern, and it's legitimate. Your answer is evidence, not reassurance. Show them golden query validation — every response was checked against known-correct data. Show them source attribution — every agent response includes which mart it queried, which SQL it ran, and which rows produced the answer. The agent doesn't guess. It queries clean, governed data.

[CLICK] Fear two: "My job is at risk." Don't dismiss this. Reframe it. The analyst who used to spend three days building variance pivot tables now owns the variance narrative. They're reviewing, validating, and contextualizing the output — not producing the raw numbers. That's a more strategic role. That's an upgrade.

[CLICK] Fear three: "Who's responsible when the AI is wrong?" Answer this directly: the human who approved the output is responsible. Agent outputs require sign-off before board submission. The AI drafts. The analyst owns. That accountability chain has to be explicit in your operating model — not implied.

---

**[SLIDE 9] Finding Your Finance Champion**

[PAUSE 2s] I want to spend a moment on this because finding the right Finance Champion is an art. [POINT] Read the quote on screen. "Find the FP&A analyst who spends three days a month building variance pivot tables and hates it. That person is your champion. Show them variance-RCA. The room changes."

That's not rhetoric. That's a pattern I've seen work. The person who is most frustrated with the current process is the most motivated to prove that there's a better way. They want to be right. They want to show the CFO that the manual process was wasteful. Your AI system is how they prove it.

[CLICK] So how do you identify them? Look for these signals. They're the one who complains loudest about data not being ready at month-end. They're the one who sends the "corrected version" email — every single cycle. They have a private Excel workbook with forty-seven named ranges that only they understand. They say things like "I know the number is wrong, but I can't prove it until next week." They asked IT for data access and waited three weeks.

[PAUSE 2s] [POINT] When you find them, show them three things. First, a live NL query on their most painful monthly question. Second, variance-RCA on their entity, using last month's actuals — their own data. Third, show them the SQL. "It queried mart-P-L directly. No copy-paste. No formula chain. Clean." That conversation changes the trajectory of the whole project.

---

**[SLIDE 10] Module 8.3 — What Separates Teams That Ship From Teams That Stall**

Module eight-three. The pitfalls. [PAUSE 2s]

I've watched enough AI projects in enterprise environments to know that failure rarely comes from the technology. The technology works. The pitfalls are almost always organizational, process, or sequencing failures — and most of them are entirely preventable. [CLICK]

This module gives you a checklist of the five things that kill finance AI projects. For each one, I'll tell you what it looks like when it's happening, and the specific fix that neutralizes it. None of these require heroics. They just require intention.

---

**[SLIDE 11] The 5 Pitfalls That Kill Finance AI Projects**

[POINT] Five pitfalls. Let's go through them fast and make them stick.

Pitfall one: Data Not Ready. The marts don't exist. The dimensions have NULLs. There's no agreed definition of "variance." You show up with a Bedrock Agent and there's nothing clean to query. [CLICK] Fix: the AI Readiness Assessment from Section four-five. Run it before you write a line of agent code. If the data isn't ready, the AI isn't ready. No mart equals no agent.

Pitfall two: No Finance Champion. The tech team builds something technically excellent that the finance team doesn't trust, won't use, and never validates. Adoption is zero. [CLICK] Fix: recruit the Finance Champion before you write a line of code. They need to be involved from day one — not brought in for a demo at week ten.

[CLICK] Pitfall three: Prompt Drift. The system prompt gets updated — maybe to handle a new use case, maybe by accident. And the golden queries start failing silently. Nobody notices until the CFO gets a wrong number. Fix: automated regression test on every single deploy. CI/CD gate: zero regressions allowed before promotion.

Pitfall four: Over-Promising Timeline. "We'll have NL querying and board packs and variance RCA and what-if simulation all ready in four weeks." You won't. [CLICK] Fix: the ninety-day phased plan. One deliverable per month. Commit to milestones, not a full feature list.

Pitfall five: No Audit Trail. The CFO asks "how did the agent get that EBITDA number?" and nobody can answer. That destroys trust immediately. [PAUSE 2s] Fix: tool call logging in CloudWatch, always on, from day one. AgentCore Memory stores every question and every answer. The audit trail is the insurance policy.

---

**[SLIDE 12] The One Rule That Keeps Projects Alive**

[PAUSE 2s] I want to close this module with a rule that I wish someone had told me early in my career. [POINT] It's on screen in large text, so let me read it clearly.

"Ship something the CFO can use in sixty days. An imperfect NL query interface that works is worth ten times a perfect system that's still being built."

[PAUSE 2s] Think about that. An imperfect system that's live, that the CFO is using, that's generating real feedback, that the FP&A team is validating — that system improves. It gets better every week because real users are telling you what to fix.

A perfect system on a whiteboard improves never.

[CLICK] The corollary: done is better than perfect. A working demo with three known limitations is infinitely more persuasive than a roadmap slide. [CLICK] Milestones protect the project. Each thirty-day milestone gives leadership a reason to continue funding. No milestone equals no budget. [CLICK] And imperfect plus improving beats perfect plus delayed — every single time. Finance teams trust systems that get better in front of them. They don't trust promises about future state.

---

**[SLIDE 13] Module 8.4 — How to Know If It's Working**

Module eight-four. Measurement. [PAUSE 2s]

Here's the thing about ROI in an AI project: it doesn't measure itself. You have to decide upfront what you're measuring, how you're measuring it, and who's collecting the data. If you don't do that before you launch, you'll have six months of anecdotes instead of six months of data.

[CLICK] And anecdotes don't get budget approved. Data does. This module gives you the specific metrics, the specific baselines, the specific targets, and the specific measurement methods. When you walk into the CFO's office at six months, you want numbers — not stories.

---

**[SLIDE 14] The ROI Scorecard: Baseline to Target**

[POINT] Five metrics. Let me walk you through each one.

Hours saved per analyst per month. Baseline: forty hours. Target: eight hours. That's an eighty percent reduction. The forty hours is data gathering — pulling numbers from systems, building the pivot tables, reformatting for reporting. The AI does that in seconds. The analyst uses the remaining eight hours for actual analysis.

[CLICK] Variance cycle time. Baseline: three days. Target: four hours. That's the time from when finance books close to when the variance report lands on the CFO's desk. The AI compresses that dramatically because it doesn't wait for a human to have capacity.

Commentary draft time. Baseline: eight hours. Target: forty-five minutes. An FP&A analyst used to spend a full day crafting the narrative around the numbers. The agent drafts it in minutes. The analyst refines and approves.

[CLICK] Board pack turnaround. Baseline: three days. Target: same day. The board pack used to require coordination across multiple analysts, formatting in PowerPoint, review cycles. The agent generates it in one session.

Data errors in reports. Baseline: eight percent. Target: zero. Because the AI queries the mart directly. There's no copy-paste, no formula chains, no manual data entry. The mart is the source of truth. The report is a direct reflection of it.

[PAUSE 2s] [POINT] Notice the note at the bottom: these are the numbers you promised the CFO in Section three when you built the business case. Now you can prove them.

---

**[SLIDE 15] How to Capture the Data: Three Simple Methods**

[POINT] Three measurement methods. None of them require new tooling.

Time tracking. Ask analysts to log their time for two weeks before launch — not forever, just two weeks. Capture the categories: data pull, variance analysis, commentary, formatting. Then repeat at month one, month three, and month six. Use whatever project management tool they already have. The delta is your time-saved number.

[CLICK] Cycle time measurement. Every reporting cycle, record two dates: the date finance books close, and the date the variance report is delivered to the CFO. The gap between those two dates is your cycle time. No special tooling. Just a spreadsheet with two columns. Track it for six months and watch the trend line.

[CLICK] CFO satisfaction survey. Five questions. One to five scale. Accuracy, speed, trust, usefulness, likelihood to recommend. Send it at the end of each quarter via email or Typeform — five minutes to complete. Track the average score across four quarters. Aim for four-point-two or higher by quarter four. This is the most important metric for project continuation because it captures something the time numbers can't: does the CFO believe in it?

---

**[SLIDE 16] The Conversation at 6 Months**

[PAUSE 2s] I want you to picture this moment. It's six months after you launched. You've been collecting data. You walk into the CFO's office with a one-page summary. [CLICK]

[POINT] Here's what that summary says. Variance cycle time: down eighty-five percent. Three days to four hours. Commentary draft time: down ninety-one percent. Eight hours to forty-five minutes. Board pack: done same day. Data errors: zero.

[PAUSE 2s] And you say this: "We have six months of data. The system is working exactly as projected. We think it's time to expand." And the CFO's question changes. It's not "should we invest in this?" anymore. It's "how do we expand to all entities?"

That's the inflection point. That's when the project stops being an experiment and becomes a platform. You add the EU entities, the APAC entities, the LATAM entities — same infrastructure, different Redshift schemas. You roll out to the FP&A team, then to business unit heads, then to the board. You add more Lambda tools: budget reforecast, headcount planning, cash flow analysis.

[PAUSE 2s] But it all starts with six months of disciplined measurement. That's what earns the expansion conversation.

---

**[SLIDE 17] Module 8.5 — What You've Built**

Module eight-five. The final module. [PAUSE 2s]

I want to take a moment here before we close — not to celebrate, because you haven't shipped yet — but to take stock of where you are. Because the journey you've taken through this course is not a small thing. [CLICK]

You started with a demo. You saw something working. And for most people, that's where it ends — they see the demo and they think "that's impressive" and they move on. But you didn't move on. You learned enough finance to speak credibly to CFOs. You built a strategic framework. You designed the data layer. You mapped the architecture. You wrote the agent code. And now you know how to execute and measure.

That's a complete picture. Let's look at it.

---

**[SLIDE 18] 8 Sections. One Complete Transformation.**

[POINT] Eight sections. Let me remind you what we covered, because when you see it all together, it lands differently.

Section one: the live demo. You saw it working from minute one. That was intentional — we wanted you to see the destination before we showed you the map.

Section two: finance for architects. You learned enough about income statements, variance analysis, and FP&A workflows to walk into any CFO conversation with credibility.

[CLICK] Section three: transformation strategy. Use case portfolio. The $1.9M problem. The ROI model that gets budget approved.

Section four: data foundation. Redshift, dbt, the mart design, the AI Readiness Assessment. Clean data is the prerequisite for everything.

[CLICK] Section five: AWS architecture. Bedrock, Lambda, VPC, IAM, AgentCore. The full production stack and why each component is there.

Section six: agent design. Bedrock Agents, AgentCore Gateway and Memory, tool calling, session management.

[CLICK] Section seven: build the system. Text-to-SQL, variance RCA, board pack generation. Working code you can adapt and deploy.

And section eight: execute and measure. The ninety-day plan, the operating model, the ROI scorecard.

[PAUSE 2s] Eight sections. One complete transformation. Let's close it out.

---

**[SLIDE 19] What You've Built: The Complete Checklist**

[POINT] Here it is. Everything you've built by completing this course.

A working ACME Finance system. NL querying, variance RCA, what-if simulation, commentary generation, board pack — all of it running, all of it connected, all of it auditable.

Architecture patterns you can whiteboard for any CFO in any industry. The stack generalizes. Swap the finance data for healthcare, retail, manufacturing — the agent pattern is the same.

[CLICK] Finance domain vocabulary. You can talk about income statements, budget variance, FP&A cycle times, and board pack requirements without having to stop and explain what you mean.

Use case prioritization framework — the Impact times Complexity matrix, phased delivery model.

[CLICK] The ninety-day delivery plan. Month one, two, three milestones. Two-engineer team. Week-by-week clarity.

ROI scorecard. Baseline metrics, targets, measurement methods, six-month narrative.

Production readiness checklist. Audit trail, regression tests, human sign-off workflow.

[PAUSE 2s] [POINT] And this last one — read it in blue at the bottom. The confidence to say "yes" when a CFO asks "can we build this for us?" That's not a small thing. That's the whole point.

---

**[SLIDE 20] Course Complete**

[PAUSE 2s]

Take a moment with this slide. Because this is the image I want you to carry with you.

"The CFOs who deploy this in 2025 to 2026 will expect it everywhere by 2028. You now know how to build it."

[PAUSE 2s] Think about what that means. We are in the early innings of AI adoption in finance. The CFOs who move now — who deploy a working system, who train their FP&A teams to use it, who build the data foundation and the audit trails and the operating models — those CFOs are going to set the standard. And in two or three years, every other CFO is going to be asking "why don't we have this?"

And when they ask that question — when they look around for a Solution Architect who can build it — they're going to need someone who did it before. Someone who knows the data layer, the agent orchestration, the change management, the ROI measurement. Someone who's been through the whole thing.

That's you now. [PAUSE 2s]

[POINT] Three next steps before you close this window. First: complete the lab. Get the full ACME Finance system running in your own AWS account. Not watching a demo — running it yourself, with your own credentials, your own Redshift cluster, your own Bedrock Agent. That's the moment it becomes real.

Second: adapt it for a client. Think about a client or a prospect you have right now. What are their source systems? What would their mart tables look like? What's their equivalent of the EMEA variance question? Sketch it. The architecture is exactly the same.

Third: expand. Add AgentCore Identity for multi-tenant access. Add more Lambda tools — budget reforecast, headcount planning, cash flow. Every Lambda you add extends the value of the same infrastructure.

[PAUSE 2s] This course is complete. You're not. Go build something the CFO can use. Thank you.

---

*End of Section 8 Narration Script*
*Total slides: 20 | Estimated duration: 45 minutes at 130 wpm*
