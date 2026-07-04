// ONE-TIME audio generator for SpeakBusy vocabulary.
// Generates an MP3 for every word in the bank via OpenAI TTS and stores it in
// Supabase Storage (bucket: "word-audio"). Open the function URL in a browser
// with ?token=speakbusy-audio-2026 — the page auto-refreshes and processes
// ~25 words per refresh until all are done. DELETE THIS FUNCTION AFTERWARDS.

const ADMIN_TOKEN = "speakbusy-audio-2026";
const BUCKET = "word-audio";
const BATCH_SIZE = 25;
const VOICE = "nova";

// [key, textToSpeak] — generated from vocabBank.ts (980 words)
const WORDS: [string, string][] = [
  ["deadline", "Deadline"],["client", "Client"],["agenda", "Agenda"],["feedback", "Feedback"],
  ["follow-up", "Follow up"],["schedule", "Schedule"],["stakeholder", "Stakeholder"],["proposal", "Proposal"],
  ["revenue", "Revenue"],["invoice", "Invoice"],["deliver", "Deliver"],["negotiate", "Negotiate"],
  ["presentation", "Presentation"],["approve", "Approve"],["milestone", "Milestone"],["priority", "Priority"],
  ["reschedule", "Reschedule"],["summary", "Summary"],["leverage", "Leverage"],["scope", "Scope"],
  ["align", "Align"],["scalable", "Scalable"],["onboarding", "Onboarding"],["outcome", "Outcome"],
  ["retainer", "Retainer"],["deliverable", "Deliverable"],["brief", "Brief"],["delegation", "Delegation"],
  ["kpi", "KPI"],["accountability", "Accountability"],["campaign", "Campaign"],["engagement", "Engagement"],
  ["conversion-rate", "Conversion"],["pipeline", "Pipeline"],["sales-forecast", "Forecast"],["blocker", "Blocker"],
  ["meeting", "Meeting"],["report", "Report"],["budget", "Budget"],["contract", "Contract"],
  ["payment", "Payment"],["update", "Update"],["confirm", "Confirm"],["cancel", "Cancel"],
  ["postpone", "Postpone"],["attend", "Attend"],["host", "Host"],["join", "Join"],
  ["share", "Share"],["send", "Send"],["receive", "Receive"],["reply", "Reply"],
  ["forward", "Forward"],["attach", "Attach"],["file", "File"],["folder", "Folder"],
  ["link", "Link"],["copy", "Copy"],["bcc", "BCC"],["subject", "Subject"],
  ["draft", "Draft"],["sign", "Sign"],["reject", "Reject"],["review", "Review"],
  ["edit", "Edit"],["finalize", "Finalize"],["submit", "Submit"],["request", "Request"],
  ["respond", "Respond"],["explain", "Explain"],["clarify", "Clarify"],["question", "Question"],
  ["answer", "Answer"],["task", "Task"],["goal", "Goal"],["plan", "Plan"],
  ["progress", "Progress"],["status", "Status"],["urgent", "Urgent"],["important", "Important"],
  ["available", "Available"],["busy", "Busy"],["free", "Free"],["office", "Office"],
  ["remote", "Remote"],["hybrid", "Hybrid"],["team", "Team"],["department", "Department"],
  ["manager", "Manager"],["boss", "Boss"],["colleague", "Colleague"],["employee", "Employee"],
  ["company", "Company"],["customer", "Customer"],["vendor", "Vendor"],["supplier", "Supplier"],
  ["partner", "Partner"],["service", "Service"],["product", "Product"],["price", "Price"],
  ["cost", "Cost"],["fee", "Fee"],["discount", "Discount"],["offer", "Offer"],
  ["deal", "Deal"],["sale", "Sale"],["target", "Target"],["growth", "Growth"],
  ["profit", "Profit"],["loss", "Loss"],["expense", "Expense"],["payment-terms", "Payment terms"],
  ["due", "Due"],["quote", "Quote"],["estimate", "Estimate"],["bill", "Bill"],
  ["receipt", "Receipt"],["account", "Account"],["balance", "Balance"],["transfer", "Transfer"],
  ["refund", "Refund"],["question-time", "Q&A"],["minutes", "Minutes"],["notes", "Notes"],
  ["overview", "Overview"],["intro", "Introduction"],["welcome", "Welcome"],["thanks", "Thanks"],
  ["regards", "Regards"],["lunch", "Lunch"],["break", "Break"],["holiday", "Holiday"],
  ["vacation", "Vacation"],["leave", "Leave"],["overtime", "Overtime"],["shift", "Shift"],
  ["call", "Call"],["chat", "Chat"],["meet", "Meet"],["greet", "Greet"],
  ["discuss", "Discuss"],["decide", "Decide"],["agree", "Agree"],["disagree", "Disagree"],
  ["suggest", "Suggest"],["recommend", "Recommend"],["help", "Help"],["support", "Support"],
  ["issue", "Issue"],["problem", "Problem"],["solution", "Solution"],["fix", "Fix"],
  ["check", "Check"],["test", "Test"],["try", "Try"],["work", "Work"],
  ["job", "Job"],["role", "Role"],["responsibility", "Responsibility"],["duty", "Duty"],
  ["skill", "Skill"],["experience", "Experience"],["training", "Training"],["learn", "Learn"],
  ["teach", "Teach"],["mentor", "Mentor"],["inbox", "Inbox"],["attachment", "Attachment"],
  ["recipient", "Recipient"],["sender", "Sender"],["signature", "Signature"],["template", "Template"],
  ["form", "Form"],["checklist", "Checklist"],["document", "Document"],["spreadsheet", "Spreadsheet"],
  ["slide", "Slide"],["version", "Version"],["typo", "Typo"],["proofread", "Proofread"],
  ["print", "Print"],["scan", "Scan"],["upload", "Upload"],["download", "Download"],
  ["save", "Save"],["delete", "Delete"],["rename", "Rename"],["archive", "Archive"],
  ["cc", "CC"],["reminder", "Reminder"],["notification", "Notification"],["message", "Message"],
  ["calendar", "Calendar"],["appointment", "Appointment"],["invite", "Invite"],["attendee", "Attendee"],
  ["participant", "Participant"],["organizer", "Organizer"],["availability", "Availability"],["venue", "Venue"],
  ["meeting-room", "Meeting room"],["book", "Book"],["staff", "Staff"],["intern", "Intern"],
  ["supervisor", "Supervisor"],["assistant", "Assistant"],["director", "Director"],["executive", "Executive"],
  ["founder", "Founder"],["owner", "Owner"],["branch", "Branch"],["headquarters", "Headquarters"],
  ["division", "Division"],["position", "Position"],["resign", "Resign"],["retire", "Retire"],
  ["hire", "Hire"],["fire", "Fire"],["apply", "Apply"],["application", "Application"],
  ["cv", "CV"],["reference", "Reference"],["probation", "Probation"],["quarter", "Quarter"],
  ["fiscal-year", "Fiscal year"],["annual", "Annual"],["monthly", "Monthly"],["weekly", "Weekly"],
  ["daily", "Daily"],["extension", "Extension"],["delay", "Delay"],["ahead-of-schedule", "Ahead of schedule"],
  ["behind-schedule", "Behind schedule"],["asap", "ASAP"],["eod", "EOD"],["eta", "ETA"],
  ["tbd", "TBD"],["fyi", "FYI"],["out-of-office", "Out of office"],["business-trip", "Business trip"],
  ["commute", "Commute"],["workday", "Workday"],["day-off", "Day off"],["sick-leave", "Sick leave"],
  ["inform", "Inform"],["notify", "Notify"],["announce", "Announce"],["announcement", "Announcement"],
  ["mention", "Mention"],["contact", "Contact"],["apologize", "Apologize"],["appreciate", "Appreciate"],
  ["handover", "Handover"],["wage", "Wage"],["installment", "Installment"],["currency", "Currency"],
  ["exchange-rate", "Exchange rate"],["deposit", "Deposit"],["turnover", "Turnover"],["debt", "Debt"],
  ["loan", "Loan"],["interest", "Interest"],["purchase", "Purchase"],["order", "Order"],
  ["subscription", "Subscription"],["upgrade", "Upgrade"],["free-trial", "Free trial"],["complaint", "Complaint"],
  ["inquiry", "Inquiry"],["satisfaction", "Satisfaction"],["loyal", "Loyal"],["audience", "Audience"],
  ["reliable", "Reliable"],["flexible", "Flexible"],["punctual", "Punctual"],["formal", "Formal"],
  ["informal", "Informal"],["polite", "Polite"],["concise", "Concise"],["detailed", "Detailed"],
  ["accurate", "Accurate"],["efficient", "Efficient"],["productive", "Productive"],["confident", "Confident"],
  ["responsible", "Responsible"],["assign", "Assign"],["start", "Start"],["pause", "Pause"],
  ["continue", "Continue"],["track", "Track"],["measure", "Measure"],["compare", "Compare"],
  ["choose", "Choose"],["avoid", "Avoid"],["solve", "Solve"],["prepare", "Prepare"],
  ["present", "Present"],["organize", "Organize"],["arrange", "Arrange"],["handle", "Handle"],
  ["manage", "Manage"],["lead-team", "Lead"],["bandwidth", "Bandwidth"],["escalate", "Escalate"],
  ["streamline", "Streamline"],["benchmark", "Benchmark"],["transparency", "Transparency"],["initiative", "Initiative"],
  ["collaborate", "Collaborate"],["prioritize", "Prioritize"],["delegate", "Delegate"],["facilitate", "Facilitate"],
  ["implement", "Implement"],["execute", "Execute"],["coordinate", "Coordinate"],["evaluate", "Evaluate"],
  ["assess", "Assess"],["analyze", "Analyze"],["forecast", "Forecast"],["allocate", "Allocate"],
  ["optimize", "Optimize"],["enhance", "Enhance"],["improve", "Improve"],["maintain", "Maintain"],
  ["sustain", "Sustain"],["scale", "Scale"],["pivot", "Pivot"],["iterate", "Iterate"],
  ["validate", "Validate"],["verify", "Verify"],["audit", "Audit"],["compliance", "Compliance"],
  ["regulation", "Regulation"],["policy", "Policy"],["procedure", "Procedure"],["protocol", "Protocol"],
  ["framework", "Framework"],["methodology", "Methodology"],["approach", "Approach"],["strategy", "Strategy"],
  ["tactic", "Tactic"],["objective", "Objective"],["metric", "Metric"],["dashboard", "Dashboard"],
  ["funnel", "Funnel"],["conversion", "Conversion"],["retention", "Retention"],["churn", "Churn"],
  ["acquisition", "Acquisition"],["lead", "Lead"],["prospect", "Prospect"],["pitch", "Pitch"],
  ["demo", "Demo"],["headcount", "Headcount"],["recruit", "Recruit"],["interview", "Interview"],
  ["candidate", "Candidate"],["promotion", "Promotion"],["raise", "Raise"],["benefit", "Benefit"],
  ["bonus", "Bonus"],["compensation", "Compensation"],["salary", "Salary"],["payroll", "Payroll"],
  ["resource", "Resource"],["capacity", "Capacity"],["workload", "Workload"],["productivity", "Productivity"],
  ["efficiency", "Efficiency"],["performance", "Performance"],["evaluation", "Evaluation"],["criteria", "Criteria"],
  ["standard", "Standard"],["quality", "Quality"],["quantity", "Quantity"],["volume", "Volume"],
  ["throughput", "Throughput"],["turnaround", "Turnaround"],["lead-time", "Lead time"],["roadmap", "Roadmap"],
  ["backlog", "Backlog"],["sprint", "Sprint"],["standup", "Standup"],["retro", "Retrospective"],
  ["spec", "Specification"],["release", "Release"],["launch", "Launch"],["rollout", "Rollout"],
  ["adoption", "Adoption"],["feedback-loop", "Feedback loop"],["iteration", "Iteration"],["proof", "Proof of concept"],
  ["mvp", "MVP"],["beta", "Beta"],["risk", "Risk"],["mitigation", "Mitigation"],
  ["contingency", "Contingency"],["dependency", "Dependency"],["constraint", "Constraint"],["assumption", "Assumption"],
  ["hypothesis", "Hypothesis"],["insight", "Insight"],["data", "Data"],["analytics", "Analytics"],
  ["report-out", "Report out"],["debrief", "Debrief"],["recap", "Recap"],["takeaway", "Takeaway"],
  ["action-item", "Action item"],["next-steps", "Next steps"],["touchpoint", "Touchpoint"],["sync", "Sync"],
  ["check-in", "Check-in"],["one-on-one", "One-on-one"],["all-hands", "All-hands"],["townhall", "Townhall"],
  ["agenda-item", "Agenda item"],["minute-taker", "Minute-taker"],["chair", "Chair"],["consensus", "Consensus"],
  ["compromise", "Compromise"],["counteroffer", "Counteroffer"],["concession", "Concession"],["leverage-point", "Leverage point"],
  ["win-win", "Win-win"],["alignment", "Alignment"],["buy-in", "Buy-in"],["endorsement", "Endorsement"],
  ["sponsor", "Sponsor"],["champion", "Champion"],["advocate", "Advocate"],["liaison", "Liaison"],
  ["touchbase", "Touch base"],["circle-back", "Circle back"],["follow-through", "Follow through"],["benchmark-set", "Benchmarking"],
  ["best-practice", "Best practice"],["case-study", "Case study"],["white-paper", "White paper"],["press-release", "Press release"],
  ["statement", "Statement"],["disclaimer", "Disclaimer"],["confidential", "Confidential"],["nda", "NDA"],
  ["liability", "Liability"],["warranty", "Warranty"],["clause", "Clause"],["agreement", "Agreement"],
  ["amendment", "Amendment"],["addendum", "Addendum"],["renewal", "Renewal"],["termination", "Termination"],
  ["teamwork", "Teamwork"],["brainstorm", "Brainstorm"],["workshop", "Workshop"],["kickoff", "Kickoff"],
  ["cross-functional", "Cross-functional"],["knowledge-sharing", "Knowledge sharing"],["mentorship", "Mentorship"],["ownership", "Ownership"],
  ["proactive", "Proactive"],["responsive", "Responsive"],["collaborative", "Collaborative"],["constructive", "Constructive"],
  ["peer-review", "Peer review"],["workflow", "Workflow"],["phase", "Phase"],["stage", "Stage"],
  ["timeline", "Timeline"],["requirement", "Requirement"],["buffer", "Buffer"],["workaround", "Workaround"],
  ["trade-off", "Trade-off"],["lessons-learned", "Lessons learned"],["ad-hoc", "Ad hoc"],["recurring", "Recurring"],
  ["pending", "Pending"],["overdue", "Overdue"],["on-hold", "On hold"],["sign-off", "Sign-off"],
  ["decision", "Decision"],["elaborate", "Elaborate"],["summarize", "Summarize"],["emphasize", "Emphasize"],
  ["highlight", "Highlight"],["outline", "Outline"],["justify", "Justify"],["persuade", "Persuade"],
  ["interrupt", "Interrupt"],["wrap-up", "Wrap up"],["talking-points", "Talking points"],["icebreaker", "Icebreaker"],
  ["small-talk", "Small talk"],["rapport", "Rapport"],["etiquette", "Etiquette"],["tone", "Tone"],
  ["briefing", "Briefing"],["memo", "Memo"],["newsletter", "Newsletter"],["survey", "Survey"],
  ["questionnaire", "Questionnaire"],["concern", "Concern"],["commitment", "Commitment"],["burnout", "Burnout"],
  ["work-life-balance", "Work-life balance"],["morale", "Morale"],["motivation", "Motivation"],["incentive", "Incentive"],
  ["perk", "Perk"],["staff-turnover", "Staff turnover"],["vacancy", "Vacancy"],["shortlist", "Shortlist"],
  ["notice-period", "Notice period"],["resignation", "Resignation"],["contractor", "Contractor"],["full-time", "Full-time"],
  ["part-time", "Part-time"],["gross", "Gross"],["net", "Net"],["outsource", "Outsource"],
  ["subcontractor", "Subcontractor"],["terms", "Terms"],["condition", "Condition"],["breach", "Breach"],
  ["penalty", "Penalty"],["dispute", "Dispute"],["settlement", "Settlement"],["tender", "Tender"],
  ["bid", "Bid"],["exclusive", "Exclusive"],["partnership", "Partnership"],["rejection", "Rejection"],
  ["competitor", "Competitor"],["competition", "Competition"],["market", "Market"],["demand", "Demand"],
  ["trend", "Trend"],["opportunity", "Opportunity"],["threat", "Threat"],["strength", "Strength"],
  ["weakness", "Weakness"],["swot", "SWOT analysis"],["niche", "Niche"],["advantage", "Advantage"],
  ["expansion", "Expansion"],["decline", "Decline"],["recovery", "Recovery"],["projection", "Projection"],
  ["baseline", "Baseline"],["target-audience", "Target audience"],["pricing", "Pricing"],["markup", "Markup"],
  ["break-even", "Break-even"],["cash", "Cash"],["reimbursement", "Reimbursement"],["allowance", "Allowance"],
  ["write-off", "Write-off"],["asset", "Asset"],["funding", "Funding"],["grant", "Grant"],
  ["investor", "Investor"],["investment", "Investment"],["over-budget", "Over budget"],["cost-cutting", "Cost-cutting"],
  ["billing", "Billing"],["defect", "Defect"],["inspection", "Inspection"],["certification", "Certification"],
  ["maintenance", "Maintenance"],["outage", "Outage"],["utilization", "Utilization"],["automation", "Automation"],
  ["integration", "Integration"],["implementation", "Implementation"],["migration", "Migration"],["backup", "Backup"],
  ["security", "Security"],["access", "Access"],["permission", "Permission"],["credentials", "Credentials"],
  ["troubleshoot", "Troubleshoot"],["bug", "Bug"],["overlap", "Overlap"],["conflict", "Conflict"],
  ["synergy", "Synergy"],["alignment-strategic", "Strategic alignment"],["value-prop", "Value proposition"],["due-diligence", "Due diligence"],
  ["risk-mitigation", "Risk mitigation"],["competitive-advantage", "Competitive advantage"],["market-penetration", "Market penetration"],["market-share", "Market share"],
  ["roi", "ROI"],["kpi-advanced", "KPI"],["merger", "Merger"],["acquisition-corp", "Acquisition"],
  ["restructuring", "Restructuring"],["divestiture", "Divestiture"],["spinoff", "Spinoff"],["ipo", "IPO"],
  ["valuation", "Valuation"],["equity", "Equity"],["dilution", "Dilution"],["leverage-fin", "Financial leverage"],
  ["liquidity", "Liquidity"],["solvency", "Solvency"],["cash-flow", "Cash flow"],["working-capital", "Working capital"],
  ["capex", "CAPEX"],["opex", "OPEX"],["ebitda", "EBITDA"],["margin", "Margin"],
  ["overhead", "Overhead"],["amortization", "Amortization"],["depreciation", "Depreciation"],["balance-sheet", "Balance sheet"],
  ["income-statement", "Income statement"],["p-l", "P&L"],["forecasting", "Forecasting"],["variance", "Variance"],
  ["governance", "Governance"],["board", "Board"],["shareholder", "Shareholder"],["dividend", "Dividend"],
  ["share-repurchase", "Share buyback"],["esg", "ESG"],["sustainability", "Sustainability"],["carbon-footprint", "Carbon footprint"],
  ["diversity", "Diversity"],["inclusion", "Inclusion"],["equity-dei", "Pay equity"],["empower", "Empower"],
  ["transformation", "Transformation"],["disruption", "Disruption"],["innovation", "Innovation"],["incubator", "Incubator"],
  ["accelerator", "Accelerator"],["seed", "Seed funding"],["series-a", "Series A"],["runway", "Runway"],
  ["burn-rate", "Burn rate"],["unit-economics", "Unit economics"],["cohort", "Cohort"],["ltv", "LTV"],
  ["cac", "CAC"],["mrr", "MRR"],["arr", "ARR"],["nps", "NPS"],
  ["csat", "CSAT"],["sla", "SLA"],["slo", "SLO"],["uptime", "Uptime"],
  ["downtime", "Downtime"],["incident", "Incident"],["postmortem", "Postmortem"],["root-cause", "Root cause"],
  ["technical-debt", "Technical debt"],["architecture", "Architecture"],["scalability", "Scalability"],["resilience", "Resilience"],
  ["redundancy", "Redundancy"],["latency", "Latency"],["throughput-tech", "Throughput"],["bottleneck", "Bottleneck"],
  ["chokepoint", "Choke point"],["capacity-planning", "Capacity planning"],["procurement", "Procurement"],["sourcing", "Sourcing"],
  ["supply-chain", "Supply chain"],["logistics", "Logistics"],["inventory", "Inventory"],["warehouse", "Warehouse"],
  ["fulfillment", "Fulfillment"],["distribution", "Distribution"],["channel", "Channel"],["b2b", "B2B"],
  ["b2c", "B2C"],["segment", "Segment"],["positioning", "Positioning"],["differentiation", "Differentiation"],
  ["brand-equity", "Brand equity"],["brand-awareness", "Brand awareness"],["thought-leadership", "Thought leadership"],["go-to-market", "Go-to-market"],
  ["product-market-fit", "Product-market fit"],["customer-success", "Customer success"],["customer-journey", "Customer journey"],["ux", "UX"],
  ["ui", "UI"],["wireframe", "Wireframe"],["prototype", "Prototype"],["mockup", "Mockup"],
  ["a-b-test", "A"],["experiment", "Experiment"],["significance", "Significance"],["sample-size", "Sample size"],
  ["bias", "Bias"],["correlation", "Correlation"],["causation", "Causation"],["regression", "Regression"],
  ["forecast-model", "Forecast model"],["scenario", "Scenario"],["sensitivity", "Sensitivity"],["paradigm", "Paradigm"],
  ["disruption-adv", "Disruptor"],["incumbent", "Incumbent"],["entrant", "New entrant"],["moat", "Moat"],
  ["network-effect", "Network effect"],["flywheel", "Flywheel"],["adoption-curve", "Adoption curve"],["chasm", "Chasm"],
  ["early-adopter", "Early adopter"],["laggard", "Laggard"],["gross-margin", "Gross margin"],["fixed-costs", "Fixed costs"],
  ["variable-costs", "Variable costs"],["economies-of-scale", "Economies of scale"],["collateral", "Collateral"],["creditworthiness", "Creditworthiness"],
  ["default", "Default"],["bankruptcy", "Bankruptcy"],["insolvency", "Insolvency"],["hedge", "Hedge"],
  ["diversification", "Diversification"],["yield", "Yield"],["bond", "Bond"],["shares", "Shares"],
  ["stock-market", "Stock market"],["profitability", "Profitability"],["expenditure", "Expenditure"],["surplus", "Surplus"],
  ["deficit", "Deficit"],["subsidy", "Subsidy"],["tariff", "Tariff"],["exports", "Exports"],
  ["imports", "Imports"],["opportunity-cost", "Opportunity cost"],["sunk-cost", "Sunk cost"],["payback-period", "Payback period"],
  ["volatility", "Volatility"],["vision", "Vision"],["mission", "Mission"],["values", "Values"],
  ["north-star", "North-star metric"],["long-term", "Long-term"],["short-term", "Short-term"],["sustainable", "Sustainable"],
  ["lean", "Lean"],["consolidation", "Consolidation"],["vertical-integration", "Vertical integration"],["joint-venture", "Joint venture"],
  ["franchise", "Franchise"],["licensing", "Licensing"],["intellectual-property", "Intellectual property"],["patent", "Patent"],
  ["trademark", "Trademark"],["copyright", "Copyright"],["exit-strategy", "Exit strategy"],["bureaucracy", "Bureaucracy"],
  ["hierarchy", "Hierarchy"],["top-down", "Top-down"],["bottom-up", "Bottom-up"],["change-management", "Change management"],
  ["crisis-management", "Crisis management"],["reputation", "Reputation"],["credibility", "Credibility"],["integrity", "Integrity"],
  ["ethics", "Ethics"],["conflict-of-interest", "Conflict of interest"],["downsizing", "Downsizing"],["layoff", "Layoff"],
  ["attrition", "Attrition"],["headhunting", "Headhunting"],["upskilling", "Upskilling"],["knowledge-base", "Knowledge base"],
  ["sop", "SOP"],["globalization", "Globalization"],["localization", "Localization"],["emerging-market", "Emerging market"],
  ["persona", "Persona"],["activation", "Activation"],["viral", "Viral"],["referral", "Referral"],
  ["word-of-mouth", "Word of mouth"],["influencer", "Influencer"],["sponsorship", "Sponsorship"],["pr", "PR"],
  ["market-research", "Market research"],["focus-group", "Focus group"],["monetization", "Monetization"],["freemium", "Freemium"],
  ["saturation", "Saturation"],["barrier-to-entry", "Barrier to entry"],["first-mover", "First mover"],["ai", "AI"],
  ["machine-learning", "Machine learning"],["algorithm", "Algorithm"],["big-data", "Big data"],["cloud", "Cloud"],
  ["api", "API"],["database", "Database"],["encryption", "Encryption"],["cybersecurity", "Cybersecurity"],
  ["phishing", "Phishing"],["data-privacy", "Data privacy"],["gdpr", "GDPR"],["deployment", "Deployment"],
  ["rollback", "Rollback"],["saas", "SaaS"],["crm", "CRM"],["legislation", "Legislation"],
  ["jurisdiction", "Jurisdiction"],["litigation", "Litigation"],["force-majeure", "Force majeure"],["antitrust", "Antitrust"],
  ["monopoly", "Monopoly"],["sanction", "Sanction"],["scope-creep", "Scope creep"],["portfolio", "Portfolio"],
  ["freelance", "Freelance"],["asynchronous", "Asynchronous"],["timezone", "Time zone"],["co-working", "Co-working"],
  ["nomad", "Digital nomad"],["retainer-fee", "Retainer fee"],["statement-of-work", "Statement of work"],["milestone-payment", "Milestone payment"],
  ["gig", "Gig"],["profile", "Profile"],["testimonial", "Testimonial"],["hourly-rate", "Hourly rate"],
  ["fixed-price", "Fixed price"],["revision", "Revision"],["self-employed", "Self-employed"],["upfront", "Upfront"],
  ["late-payment", "Late payment"],["non-compete", "Non-compete"],["personal-brand", "Personal brand"],["home-office", "Home office"],
  ["vpn", "VPN"],["screen-share", "Screen share"],["mute", "Mute"],["video-call", "Video call"],
  ["performance-review", "Performance review"],["org-chart", "Org chart"],["headcount-plan", "Headcount plan"],["span-of-control", "Span of control"],
  ["succession", "Succession planning"],["one-on-one-mgmt", "1:1"],["okr", "OKR"],["leadership", "Leadership"],
  ["culture", "Culture"],["psychological-safety", "Psychological safety"],["micromanage", "Micromanage"],["coach", "Coach"],
  ["pip", "PIP"],["skip-level", "Skip-level"],["direct-report", "Direct report"],["chain-of-command", "Chain of command"],
  ["staffing", "Staffing"],["team-building", "Team building"],["offsite", "Offsite"],["conflict-resolution", "Conflict resolution"],
  ["decision-making", "Decision-making"],["ctr", "CTR"],["cpc", "CPC"],["cpm", "CPM"],
  ["sem", "SEM"],["seo", "SEO"],["organic", "Organic"],["paid", "Paid media"],
  ["impression", "Impression"],["reach", "Reach"],["engagement-rate", "Engagement rate"],["funnel-mk", "Marketing funnel"],
  ["lead-gen", "Lead generation"],["nurture", "Nurture"],["personalization", "Personalization"],["attribution", "Attribution"],
  ["copywriting", "Copywriting"],["branding", "Branding"],["slogan", "Slogan"],["retargeting", "Retargeting"],
  ["landing-page", "Landing page"],["cta", "CTA"],["open-rate", "Open rate"],["bounce-rate", "Bounce rate"],
  ["subscriber", "Subscriber"],["content-calendar", "Content calendar"],["hashtag", "Hashtag"],["ugc", "UGC"],
  ["brand-voice", "Brand voice"],["quota", "Quota"],["commission", "Commission"],["close-rate", "Close rate"],
  ["upsell", "Upsell"],["cross-sell", "Cross-sell"],["discovery-call", "Discovery call"],["qualified-lead", "Qualified lead"],
  ["closing", "Closing"],["objection", "Objection"],["cold-call", "Cold call"],["cold-email", "Cold email"],
  ["warm-lead", "Warm lead"],["prospecting", "Prospecting"],["win-rate", "Win rate"],["account-manager", "Account manager"],
  ["territory", "Territory"],["decision-maker", "Decision-maker"],["gatekeeper", "Gatekeeper"],["objection-handling", "Objection handling"],
  ["sales-cycle", "Sales cycle"],["ledger", "Ledger"],["reconcile", "Reconcile"],["accrual", "Accrual"],
  ["receivables", "Receivables"],["payables", "Payables"],["audit-fin", "Audit"],["compliance-fin", "Compliance"],
  ["tax", "Tax"],["vat", "VAT"],["inflation", "Inflation"],["interest-rate", "Interest rate"],
  ["recession", "Recession"],["gdp", "GDP"],["supply-demand", "Supply and demand"],["monetary-policy", "Monetary policy"],
  ["bookkeeping", "Bookkeeping"],["expense-report", "Expense report"],["withholding", "Withholding"],["deductible", "Deductible"],
  ["credit", "Credit"],["debit", "Debit"],["bank-statement", "Bank statement"],["petty-cash", "Petty cash"],
  ["audit-trail", "Audit trail"],["overdraft", "Overdraft"],["cash-reserve", "Cash reserve"],["recruitment", "Recruitment"],
  ["job-description", "Job description"],["screening", "Screening"],["offer-letter", "Offer letter"],["benefits-hr", "Benefits"],
  ["pto", "PTO"],["termination-hr", "Termination"],["exit-interview", "Exit interview"],["engagement-hr", "Employee engagement"],
  ["retention-hr", "Retention"],["offboarding", "Offboarding"],["background-check", "Background check"],["referral-bonus", "Referral bonus"],
  ["job-offer", "Job offer"],["salary-review", "Salary review"],["grievance", "Grievance"],["disciplinary", "Disciplinary"],
  ["wellbeing", "Wellbeing"],["absenteeism", "Absenteeism"],["timesheet", "Timesheet"],["talent", "Talent"],
  ["workforce", "Workforce"],["gantt", "Gantt chart"],["critical-path", "Critical path"],["resource-allocation", "Resource allocation"],
  ["risk-register", "Risk register"],["change-request", "Change request"],["pmo", "PMO"],["pm", "Project manager"],
  ["agile", "Agile"],["scrum", "Scrum"],["kanban", "Kanban"],["wbs", "WBS"],
  ["burndown", "Burndown chart"],["velocity", "Velocity"],["charter", "Project charter"],["raci", "RACI"],
  ["issue-log", "Issue log"],["status-report", "Status report"],["acceptance-criteria", "Acceptance criteria"],["go-live", "Go-live"],
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (res.ok) return;
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

async function listExisting(): Promise<Set<string>> {
  const existing = new Set<string>();
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000, offset }),
    });
    if (!res.ok) break;
    const rows = (await res.json()) as { name: string }[];
    rows.forEach((r) => existing.add(r.name));
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return existing;
}

async function tts(text: string): Promise<ArrayBuffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", input: text, voice: VOICE, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.arrayBuffer();
}

async function upload(name: string, audio: ArrayBuffer) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: audio,
  });
  if (!res.ok) throw new Error(`upload ${name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function page(body: string, refresh: boolean) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8">` +
      (refresh ? `<meta http-equiv="refresh" content="2">` : "") +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{font-family:-apple-system,sans-serif;background:#1C1C1E;color:#F8F5F0;padding:24px;text-align:center}` +
      `.bar{background:#3a3a3c;border-radius:8px;height:14px;overflow:hidden;margin:16px 0}` +
      `.fill{background:#C9A84C;height:100%;transition:width .3s}` +
      `h1{color:#C9A84C;font-size:20px} .err{color:#ff6b6b;font-size:13px;text-align:left;white-space:pre-wrap}</style>` +
      `</head><body>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== ADMIN_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    await ensureBucket();
    const existing = await listExisting();
    const missing = WORDS.filter(([key]) => !existing.has(`${key}.mp3`));
    const total = WORDS.length;
    const doneBefore = total - missing.length;

    if (missing.length === 0) {
      return page(`<h1>✅ Done!</h1><p>All ${total} word audios are generated and stored.</p>` +
        `<p>You can now DELETE this function from the repo.</p>`, false);
    }

    const batch = missing.slice(0, BATCH_SIZE);
    const errors: string[] = [];
    for (const [key, text] of batch) {
      try {
        const audio = await tts(text);
        await upload(`${key}.mp3`, audio);
      } catch (e) {
        errors.push(`${key}: ${(e as Error).message}`);
      }
    }

    const doneNow = doneBefore + batch.length - errors.length;
    const pct = Math.round((doneNow / total) * 100);
    return page(
      `<h1>🎙 Generating word audio…</h1>` +
        `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>` +
        `<p><b>${doneNow} / ${total}</b> (${pct}%) — page refreshes automatically, keep it open.</p>` +
        (errors.length ? `<div class="err">Errors this batch:\n${errors.join("\n")}</div>` : ""),
      true,
    );
  } catch (e) {
    return page(`<h1>⚠️ Error</h1><div class="err">${(e as Error).message}</div>` +
      `<p>Refresh to retry.</p>`, false);
  }
});