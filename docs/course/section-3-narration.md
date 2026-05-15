# Section 3 — Transformation Strategy
## Narration Script
**~70 minutes | 22 slides | 130 wpm**

---

**[SLIDE 1] Section Divider — Transformation Strategy**

Welcome to Section 3. This is the strategy section — and I want to be direct with you about what that means. Most AI projects in finance fail not because of bad technology, but because nobody did the work you're about to learn. They skipped the strategy and jumped straight to the code.

[POINT at the three-step spine]

In this section, we're going to work through a three-step framework that I use on real client engagements. Step one: identify use cases — that means knowing where the pain actually is, not where you assume it is. Step two: evaluate those use cases on an impact-feasibility matrix so you're building in the right order. Step three: build a business case using the S.T.A.R.T framework — a structure that gets CFO budget approved.

[CLICK]

We also cover build versus platform, the actual AWS cost numbers, how to sequence the build so you hit a demo-able milestone at 90 days, and what the before-and-after actually looks like for analysts. By the end of this section, you'll have a complete strategy you could walk into a CFO meeting with tomorrow.

Let's get started.

---

**[SLIDE 2] Module 3.1 — Step 1: Identify Use Cases**

[POINT at stepper, step 1 highlighted]

Step one is identification — and notice I said step one, not step zero. This isn't background context. This is where the project succeeds or fails. Before you can prioritize, you need to know what's possible.

[CLICK]

Here's the mistake I see over and over: a solutions architect walks into a finance team, looks around for fifteen minutes, and says "you should build an AI chatbot." They identified a use case in isolation. It usually goes nowhere, because it wasn't grounded in real pain, and leadership didn't ask for it, and the data engineers don't know what schema to point it at.

[PAUSE 2s]

The alternative — what actually works — is getting three teams in the same room. Technical, business, and leadership. Each team sees different problems and different opportunities. The intersection of what all three teams agree on is where your real use cases live. We're going to look at exactly how that played out at ACME Finance.

---

**[SLIDE 3] Who Needs to Be in the Room**

[POINT at TECHNICAL column]

The technical team — your solutions architect, your data engineers — their job in this conversation is to answer: what data actually exists? What's the build effort? What can we realistically do with the current infrastructure?

[POINT at BUSINESS column]

The business team — FP&A, finance ops — their job is to tell you where time is being lost. Not where they think time is being lost. Where it's actually going. Ask them: what did you do today that you wish you didn't have to do? What did you have to redo because the data was wrong? What slows down close?

[POINT at LEADERSHIP column]

And leadership — the CFO, the finance VP — their questions are different. Not operational pain. Strategic pain. What decisions are you making slowly? What would change board confidence if you could answer it faster? What's on your top three priorities for next year that AI could accelerate?

[PAUSE 2s]

[POINT at footer note]

Here's the rule: use cases identified by one team in isolation almost always fail. The technical team builds things no one wanted. The business team requests things that can't be built. Leadership sets priorities that can't be measured. You need all three. The intersection is where the real opportunities live.

---

**[SLIDE 4] Three Categories of AI Use Cases**

Now let me give you a mental model for organizing what you find. I categorize every finance AI use case into one of three buckets.

[POINT at FOUNDATIONAL card]

Foundational. These are process optimization and workforce enablement plays. You're automating repetitive tasks, reducing manual data wrangling. The defining characteristic: the data already exists, the ROI is clear, and the technical build effort is relatively low. NL querying and flash report automation both fall here. Start here. These are your proof of concept wins.

[POINT at ENHANCEMENT card]

Enhancement. You're adding intelligence to something that already exists — making it faster, more accurate, or less labor-intensive. Variance RCA and what-if simulation live here. They require actual AI reasoning, not just automation. Medium complexity, but very strong ROI.

[POINT at TRANSFORMATIONAL card]

Transformational. These are capabilities that literally didn't exist before AI. Management commentary generation. Board pack automation. The whole thing is new. Highest impact, highest complexity, and strongest competitive moat if you build it well. These are the ones that get written about. [PAUSE 2s] But here's the thing — you usually can't build transformational until you've built foundational and enhancement first. Dependencies. We'll come back to that.

---

**[SLIDE 5] From Pain to Use Case — The ACME Discovery**

[POINT at table]

This is what the discovery output actually looks like for ACME Finance. Six use cases. And look at the right column — every single one maps to that category framework we just covered.

[POINT at NL Querying row]

NL querying was found by the SA and FP&A together. The pain signal was: "every question needs an IT ticket, 48-hour lag." Every time a finance analyst wanted a number that wasn't in an existing report, they filed a ticket, waited two days, and got a CSV. That's not a small problem. That's every day.

[POINT at Variance RCA and Mgmt Commentary rows]

Notice who identified variance RCA versus management commentary. Variance RCA was flagged by FP&A and the CFO together — it was both operational pain and strategic pain. Management commentary was identified by the CFO and FP&A. That's a transformational use case, but it's grounded in a real, daily frustration.

[PAUSE 2s]

[POINT at footer]

This is the pattern: the CFO identified the transformational ones. FP&A found the enhancement ones. The SA team made them all feasible. If you only talk to one of these teams, you get an incomplete picture. If you talk to all three, you get this table.

---

**[SLIDE 6] Module 3.2 — Step 2: The Impact-Feasibility Matrix**

[POINT at stepper, step 2 highlighted]

You have your use cases. Now what? You need to prioritize them — and you need to do it in a way that makes sense to everyone in the room, from the CFO to the data engineer.

[CLICK]

The impact-feasibility matrix does exactly that. It's a two-by-two grid. Impact on one axis: how much value does this deliver? Time saved, cost recovered, decisions improved. Feasibility on the other: how readily can we build it with current data, current skills, and current infrastructure?

[PAUSE 2s]

Not all use cases are equal. The matrix tells you what to build now, what to plan for later, and what to skip entirely. It sounds simple. It is simple. That's why it works in executive presentations. You can show this to a CFO and they immediately understand it.

---

**[SLIDE 7] Impact-Feasibility Matrix — Where to Invest**

[POINT at BUILD NOW quadrant — top right]

Top right is build now. High impact, high feasibility. This is where you want to be. Look at what's plotted there: variance RCA, NL querying, what-if simulation, flash report. All four of ACME's foundational and enhancement use cases land here.

[POINT at PLAN & SCALE quadrant — top left]

Top left is plan and scale. High impact but lower feasibility. This is where management commentary sits. Why lower feasibility? Because commentary generation depends on variance RCA existing first. You can't write intelligent commentary without first having the variance analysis to draw from. The dependency makes it a later build.

[POINT at QUICK WINS — bottom right]

Bottom right is quick wins — high feasibility but lower impact. These are nice to have. Not your focus.

[POINT at DEPRIORITIZE — bottom left]

Bottom left — deprioritize. Low impact and hard to build. Don't touch these.

[PAUSE 2s]

The insight isn't the quadrants themselves — it's where each use case lands and why. Plot your use cases honestly. Resist the temptation to move things into BUILD NOW just because you like the idea.

---

**[SLIDE 8] ACME Prioritization: Short-Term vs Scale**

[POINT at BUILD NOW column]

Here's the ACME prioritization, made concrete. Build now, days one through ninety: NL querying, variance RCA, what-if simulation, flash report. Four use cases. Ninety days. Two-person team. Notice the logic: NL querying eliminates the data bottleneck — that's highest daily usage impact. Variance RCA has the highest analyst time savings. What-if simulation has the highest CFO visibility. Flash report is the fastest to build, so it's a great pilot win for building trust.

[POINT at PLAN & SCALE column]

Days ninety through a hundred and eighty: management commentary and board pack. But look at the dependency note. Commentary cannot exist without variance RCA. You need the ranked variance data to write intelligent commentary. Board pack needs commentary plus all the dashboards. The sequence isn't arbitrary — it's dictated by technical dependencies.

[PAUSE 2s]

[POINT at footer]

This is the insight I want you to take from this slide: sequence drives the roadmap. The use cases that depend on other use cases go later, regardless of how exciting they are. If you build in the wrong order, you create rework. Dependencies force the sequence.

---

**[SLIDE 9] Module 3.3 — Step 3: Build the Business Case: S.T.A.R.T**

[POINT at stepper, step 3 highlighted]

Step three. You have your use cases. You have your prioritization. Now you need budget. And to get budget, you need a business case — not a Confluence doc, not an architecture diagram, a document that a CFO can read in five minutes and say yes to.

[CLICK]

The framework I use is called S.T.A.R.T. Five elements, five letters.

[POINT at each card as you say it]

S — Scope. T — Tracking. A — Assessment. R — Resources. T — Timeline.

[PAUSE 2s]

Here's what I want you to notice: this isn't a technology framework. There's nothing in here about Bedrock or Lambda or dbt. This is a business framework. Every element is framed around business language. That's intentional. You're not writing this document for yourself. You're writing it for the CFO who controls the budget.

---

**[SLIDE 10] S.T.A.R.T — Five Elements**

Let me walk you through each element.

[POINT at S — SCOPE]

Scope is where you define the problem in business terms. Not "we want to build an AI agent." What process is broken? Who is affected? What does the current state look like and what does the desired state look like? If you can't describe the problem in one crisp paragraph without using any technical jargon, you don't understand it well enough yet.

[POINT at T — TRACKING]

Tracking is your metrics. Cycle time, hours saved, error rate, ROI. Here's the key insight: these metrics aren't just for measuring success after you build — they're also your board slide. Whatever you put in tracking will be the numbers the CFO references when they present this to the board. Make them specific. Make them measurable. "Improve efficiency" is not a metric.

[POINT at A — ASSESSMENT]

Assessment is risk and dependencies. Data quality issues, infrastructure gaps, change management, regulatory concerns. Being honest here builds trust. If you pretend there are no risks, you lose credibility the first time a risk materializes.

[POINT at R — RESOURCES]

Resources means people, infrastructure, and budget — specifically. Not "we need some SA time." One SA, six weeks. One analytics engineer, four weeks. A finance champion for review and sign-off. Vague estimates kill projects. Every project I've seen stall at approval stage had vague resource estimates.

[POINT at T — TIMELINE]

And timeline means phases: PoC, pilot, production. With clear exit criteria at each gate. The CFO isn't just asking when you'll be done — they're asking when they'll see results. Give them a checkpoint they can hold you to.

---

**[SLIDE 11] S.T.A.R.T in Practice — Variance RCA**

[POINT at table]

Here's what S.T.A.R.T looks like when you apply it to a real use case. Variance RCA. Read through this with me.

[POINT at S row]

Scope: FP&A spends two to three days per close cycle manually identifying variance root causes across US, EMEA, and APAC. The consequence: late root cause analysis means wrong answers at the board meeting. That's the scope — specific, business-language, consequence-stated.

[POINT at T row]

Tracking: cycle time from two to three days down to four hours. Accuracy at ninety-five percent or better versus manual. Sixteen analyst-hours saved per month per analyst. These are the numbers that go in the CFO's slide deck.

[POINT at A row]

Assessment: data alignment between fct_gl_entries and the EPM plan data is the key technical risk. Change management — getting analysts to trust AI output — is the key people risk. And every result must be traceable to mart data for audit purposes. Honest, specific.

[POINT at R and T rows]

Resources and timeline: one SA for six weeks, one analytics engineer for four weeks. Total: twelve weeks to production. And look at the cost — fifty dollars a month incremental AWS cost. That's the number that makes CFOs do a double-take in a good way.

---

**[SLIDE 12] The Three-Phase Delivery Timeline**

[POINT at POC card]

Every use case in this course follows a three-phase delivery model. Let me walk you through how this works for variance RCA.

Phase one is proof of concept. Weeks one and two. You pick one entity — EMEA — and one period — December 2024. You run the variance RCA agent and you compare every output to the manual analysis. Your goal is ninety-five percent accuracy. Your exit criterion is the finance champion signs off. That's it. Two weeks. One entity. One sign-off.

[POINT at PILOT card]

Phase two is pilot. Weeks three through six. Now you expand to all entities and you run the AI in parallel with the manual process. Both processes produce output. You measure cycle time. You collect analyst feedback. The exit criterion is the CFO reviews both outputs side-by-side and sees no material difference. If the CFO can't tell which one the AI produced, you've proven it.

[POINT at PRODUCTION card]

Phase three is production. Weeks seven through twelve. You turn off the manual process. The AI runs alone. You monitor weekly. You set an alert if accuracy drops below threshold. And you schedule a quarterly review.

[PAUSE 2s]

Notice the exit criteria at every gate. This is what separates a professional delivery from a project that drifts. Every phase has a clear question: did we pass or did we not? If you don't define exit criteria upfront, you'll spend weeks arguing about whether you're ready to move forward.

---

**[SLIDE 13] The CFO Approval Slide**

[PAUSE 2s]

This is the slide I want you to build. Not an architecture diagram. Not a technology stack. This.

[POINT at the executive summary card]

Here's what you actually say to the CFO. You show them one page. You say: "We have a problem — three hundred and eighty thousand dollars a year in analyst capacity going to variance analysis. I want to solve it with an AI tool. The investment is six weeks of SA time and six hundred dollars a year in AWS cost. The return is two hundred and eighty-five thousand dollars of capacity recovered — seventy-five percent of the problem, within three months."

[POINT at each row as you name them]

Problem. Solution. Investment. Return. Payback. Risk. Timeline. Seven rows. That's the whole business case.

[PAUSE 2s]

[POINT at the footer note]

Here's the rule I want you to internalize: no architecture diagrams on this slide. CFOs approve numbers, not diagrams. The moment you show a CFO a diagram with arrows and boxes, their eyes glaze over and they start thinking about their next meeting. Numbers are decisive. Numbers create urgency. Numbers get signatures.

When you're in that meeting and the CFO asks how the system works, you say: "Great question — I have a technical deep-dive ready, but let me first confirm we agree on the business case. Does this ROI make sense to you?" Get the yes on the numbers before you show the architecture.

---

**[SLIDE 14] Module 3.4 — The Layered Decision Model**

Here's a reframe that changes how you think about this entire question. Build versus buy is not a binary. It never was. It's actually four separate decisions — one per layer of the stack.

[POINT at the four rows from top to bottom]

Look at the model top to bottom. Layer four is your application and UI — the thing users actually touch. That one is flexible: build it, buy it, or assemble it from components. Layer three is your business tools and data — your business logic, your schema, your fiscal calendar, your entity hierarchy. This is almost always build. This is your IP. No SaaS vendor knows your GL structure. Layer two is the orchestration platform — managed infrastructure like AWS Bedrock that handles LLM routing, agent loops, and tool invocation. Most companies choose a platform here rather than building it themselves. And layer one, at the bottom, is the foundation models themselves. Nobody builds these from scratch. You always buy — meaning you call Claude, or GPT, or Gemini via an API. That decision is made.

[CLICK]

[POINT at the bottom bar]

Here's why this matters. When you evaluate a SaaS FP&A tool like Mosaic or Pigment, you're buying layers two through four as a bundle. You don't choose your platform, you don't own your logic, and you don't control your data model. The platform approach — AWS Bedrock — means you choose layer two yourself and build layers three and four on top of it. Same foundation models, different ownership of everything above. The question isn't build or buy. It's: which layers do you want to own?

[PAUSE 2s]

---

**[SLIDE 15] Module 3.4 — Three Decision Questions**

Now let's make this actionable. When a client asks me "should we buy a SaaS tool or build on Bedrock?", I run through exactly three questions. Not ten. Three.

[POINT at Q1 — Data Sensitivity, teal]

Question one: does your data need to stay in your cloud? This is often a binary blocker. If your financial actuals, your PII, your board-level forecasts cannot leave your VPC — and in most regulated finance environments, they can't — then SaaS is off the table before you even open a vendor deck. The buy signal is when data is non-sensitive and SaaS hosting is genuinely fine. The build signal is when you have financial actuals or PII that must stay inside your infrastructure. For most finance teams, this alone narrows the decision significantly.

[POINT at Q2 — Business Logic Specificity, violet]

Question two: is the process standard or proprietary? This one separates commodity work from your actual competitive advantage. Standard processes — expense coding, accounts payable, ASC 606 revenue recognition — these are well-defined, widely understood, and a SaaS vendor has probably built them better than you will. Buy those. But your fiscal calendar, your entity hierarchy, your specific GL structure, the way your CFO defines segment margin — these are proprietary. Nobody else has them. You build those.

[POINT at Q3 — Three-Year TCO, orange]

Question three: what does the cost picture look like at scale? SaaS looks cheap on day one and expensive at month eighteen when you have eighty users on it. Platform looks like more upfront work but runs three to five times cheaper at scale for a team with solutions architecture capacity. The buy signal is a small team, low query volume, no engineers available — SaaS is genuinely cheaper upfront. The build signal is fifty to a hundred or more users, an SA team available, and a multi-year horizon.

[POINT at the violet callout at the bottom]

Two of three questions pointing the same direction gives you your answer. In finance AI, most projects score two-of-three or three-of-three for platform and build. We'll see exactly that with ACME on the next slide.

[PAUSE 2s]

---

**[SLIDE 16] Module 3.4 — The Market Landscape + ACME Applied**

[POINT at the left column — SaaS tools]

I want to name the real tools, because you're going to encounter them. On the SaaS side: Mosaic, Pigment, Planful, and Anaplan are the serious players for planning and budgeting. Leapfin is built specifically for revenue recognition. Auditoria handles accounts payable automation. These are not toy products. If your use case is standard financial planning and your data isn't sensitive, these tools are genuinely excellent. Don't dismiss them.

[POINT at Cloud Platform row]

For cloud platforms, AWS Bedrock, Google Vertex, and Azure OpenAI are functionally equivalent at the model layer. Choose the one that matches the cloud your company already runs on. You're not picking a better AI — you're picking the managed infrastructure that sits in your existing security perimeter.

[POINT at À la carte tools]

And then there's the à la carte layer: Langfuse for observability, Pinecone for vector search, AgentCore Memory for conversation state, LangSmith for evals. These are composable components you can add on top of a platform build as needed.

[CLICK]

[POINT at the right column — ACME Applied]

Now let's score ACME against the three questions. Question one: does data need to stay in the VPC? Yes — financial actuals and PII cannot leave ACME's infrastructure. Platform. Question two: is the logic custom? Yes — ACME's GL structure, fiscal calendar, and entity hierarchy are proprietary. Build. Question three: does scale matter? Yes — ACME has a growing SA team and a long-term roadmap. Platform.

[POINT at the 3-of-3 result]

Three of three. That's why we're building on Bedrock instead of buying Mosaic. Not because Mosaic is bad — it's because ACME's data can't leave the VPC and their logic is proprietary. The framework gives you the answer before you ever talk to a vendor.

[POINT at the architecture footer]

And the principle we carry through the entire course: use Bedrock for layer two, build your tools for layer three, own your data at layer three. Your moat is layers three and four. The cloud handles the rest.

---

**[SLIDE 17] Module 3.5 — Before and After: What Actually Changes**

I want to close this section by being honest about what AI does and doesn't change for the people doing the work.

[CLICK]

The analyst doesn't disappear. I want to say that clearly, because it's both the truth and the argument you'll need to make when you're selling this internally. Nobody is getting fired. What changes is what they spend their time on.

[PAUSE 2s]

Right now, the average FP&A analyst at ACME spends roughly sixty to seventy percent of their time on data retrieval, data cleaning, calculation, and formatting. They're data wranglers. They're highly educated, highly paid professionals doing work that a well-trained AI agent can do faster and more accurately.

After we build these tools, those same analysts spend that time on analysis, insight, and decision support. That's the work they trained for. That's the work that creates value. The AI doesn't replace the analyst — it removes the parts of the job that weren't a good use of their talent in the first place.

---

**[SLIDE 18] NL Querying — Before and After**

[POINT at BEFORE column]

Let's make this concrete. NL querying, before. An analyst needs to know November APAC revenue versus plan. They submit an IT ticket. They wait forty-eight hours. They receive a CSV. They reformat it in Excel to match their existing template. Then they answer the question. Total time: two days.

[POINT at AFTER column]

After. Same analyst. Same question. They type it into the interface. "Show me November APAC revenue versus plan." Three seconds later: answer plus the SQL that generated it, so they can verify the source. Total time: three seconds.

[PAUSE 2s]

[POINT at the bottom stat bar]

Same accuracy. Ninety-nine point nine percent faster. Zero SQL knowledge required. The analyst who couldn't write SQL now has the same access to data as one who can. That's a capability equalizer across the entire finance team.

---

**[SLIDE 19] Variance RCA — Before and After**

[POINT at BEFORE column]

Variance RCA, before. This is the use case that takes the most analyst time at ACME. Pull actuals from Redshift — that requires writing SQL. Pull plan from the EPM system — that's a separate system with a separate login. Build a pivot table in Excel that combines the two. Rank variances manually by magnitude. Write an explanation for each one. Two to three days per close cycle.

[POINT at AFTER column]

After. The analyst triggers the variance_rca tool. The agent queries fct_gl_entries and the EPM staging data, calculates variances, ranks them, and returns a structured list in fifteen minutes. The analyst's job is now to review that output, check the big variances against their own knowledge of the period, and approve. Total time: two to three hours instead of two to three days.

[PAUSE 2s]

[POINT at the bottom stat bar]

Sixteen analyst-hours saved per month per analyst. Across a team of four FP&A analysts, that's sixty-four hours a month. Nearly two full working weeks, recovered every single month.

---

**[SLIDE 20] Management Commentary — Before and After**

[POINT at BEFORE column]

Commentary is where I've seen the most CFO frustration. The current process: the FP&A analyst reads the variance analysis, writes four paragraphs of commentary from scratch, sends it to the CFO. First revision comes back — "emphasize the EMEA miss more." Second revision — "the tone sounds too defensive." Third revision — "change the header on section two." One full working day, sometimes more, just for the commentary section of a close package.

[PAUSE 2s]

[POINT at AFTER column]

After. The AI agent drafts the commentary from the variance data and the mart context — it knows which variances were material, which entities had issues, what the plan said. The draft arrives structured correctly, with the right data referenced, in the right format. The analyst spends five minutes reviewing the structure, fifteen minutes adding judgment, strategic context, and tone. The CFO receives the finished commentary. No revision rounds.

[PAUSE 2s]

[POINT at bottom stat bar]

One full day to twenty minutes. The analyst's contribution — judgment, context, strategic framing — is actually more visible now because it's not buried under three hours of formatting work.

---

**[SLIDE 21] The Pattern Across Every Use Case**

[POINT at OLD ANALYST ROLE chain]

Look at the old analyst role. Six steps across the value chain: data retrieval, data cleaning, calculation, formatting — then analysis and insight. At ACME, the average analyst was spending most of their time in the first four boxes. The boxes that require repetition, not reasoning.

[POINT at NEW ANALYST ROLE chain]

Now look at the new role. The AI handles the left side — retrieval, cleaning, calculation, formatting. The analyst owns the right side — analysis, insight, decision. And notice we added a third box: decision. Because when analysts have more time for analysis and insight, they get closer to the decisions. They become strategic partners, not report factories.

[POINT at the label bars below the chain]

[PAUSE 2s]

[POINT at takeaway card]

The analyst moves from the left side of this chain to the right side. From wrangler to strategist. That's not a claim I'm making about the future — it's what we're building in this course. Every tool we build moves work from the left side of this chain to the right side. That's the pattern. Keep it in mind as we go deeper in the next sections.

---

**[SLIDE 22] Section 3 Complete — The 3-Step Strategy Framework**

[POINT at checkmarks one by one]

Let's close Section 3 with a recap of what you now have.

Step one — Identify: you know how to run a cross-functional discovery session, and you have a three-category framework for organizing what you find: foundational, enhancement, transformational.

Step two — Evaluate: you have the impact-feasibility matrix. You know how to plot use cases and what each quadrant means for your roadmap. You understand why dependency sequencing matters.

Step three — S.T.A.R.T: you have a five-element business case framework and you've seen it applied to a real use case. You know what the CFO approval slide looks like — one page, numbers only.

Build versus platform: the layered decision model gives you four separate decisions — one per layer. Layer one is always buy. Layer two is usually platform. Layer three is almost always build. Run the three diagnostic questions — data sensitivity, business logic specificity, three-year TCO — and two-of-three answers pointing the same direction gives you your answer. ACME scores three-of-three for platform and build.

Before and after: the analyst moves from data wrangler to insight reviewer. That's the value proposition.

[POINT at CTA bar]

[PAUSE 2s]

In Section 4, we build the foundation. We set up Redshift Serverless, load the ACME data, and stand up the dbt project that will feed every AI tool we build in this course. The strategy work is done. Now we build.
