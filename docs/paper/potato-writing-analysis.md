# PotatO Demo-Paper Writing Analysis

Source: Pei et al. (2022), "POTATO: The Portable Text Annotation Tool", EMNLP System Demonstrations.

## What PotatO Does Well

PotatO writes as a system paper, not as a concept note. The abstract names the tool, states its access model, lists three concrete capability groups, reports a focused experiment, and gives the public URL. The introduction then expands the same logic: a broad field need, a gap left by existing tools, the proposed system, and four design goals that organize the rest of the paper.

The paper keeps each section tied to the design goals. Architecture explains the implementation choices that make the goals feasible. Deployment and tasks show how the system is actually used across task types. The comparison table is not a generic related-work table; its columns are the system's design claims. The experiment measures one central system benefit: whether productivity features reduce annotation time on complex tasks.

The writing is concrete. It names task types, files, configuration formats, login flows, active-learning behavior, screenshots, and comparator systems. It also uses careful limits: the comparison includes free and available tools; the experiment controls familiarity and document sampling; the ethics section says what the tool cannot solve.

## Lessons for Humanly

Humanly should foreground system requirements before feature lists. The current design is better summarized by two high-level goals:

- high flexibility and compatibility across writing environments, task types, and AI policies;
- high accountability and transparency through fine-grained native logging, certificates, replay, and public verification.

The abstract should make those capabilities legible in one paragraph, then report the detector stress-test result as evidence that final text is insufficient.

The introduction should not read as a generic AI-detection motivation. It should quickly move from the authenticity problem to Humanly's design goals, then state the contribution as a deployed system.

The workflow section should start with the most distinctive use case, peer review, because it best shows why policy-bound process evidence matters. Classroom and personal writing can then show generality.

The comparison section should follow PotatO's pattern: compare systems along dimensions that match Humanly's requirements, then explain the table narrowly.

The evaluation section should stay focused. The detector stress test is not a detector leaderboard; it tests whether final-text-only predictors can substitute for process evidence. The human study should evaluate whether writers can work under policies and whether readers can interpret certificates/replay without treating them as automatic verdicts.

## Deeper Structural Pattern To Borrow

POTATO does not merely list features. It converts features into design goals, then makes those goals organize the paper. The abstract names the system and lists capability groups. The introduction then gives the problem, the gap in existing tools, and a four-goal design frame: high accessibility, easy deployment, better quality control, and productivity. Figure 1 visualizes the same four goals with concrete features under each goal. This gives the reader a map before the architecture details start.

The architecture section is not a generic component inventory. Each component explains how a design goal is implemented: data management and schema rendering support deployment and flexibility; user management supports crowdsourcing and quality control; active learning and highlighting support productivity. Figure 2 then shows artifacts, modules, state, and UI rendering in one pipeline. The figure works because it is not just boxes and arrows; it shows the objects users manipulate (`Config.yaml`, JSON data, user state, rendered annotation UI).

The deployment section grounds the design goals in workflows. POTATO explains how a deployer launches a task, what configuration file is needed, which annotation schemes are supported, how login works, how crowdsourcing links work, and which prior projects used the system. This makes the system feel tested and real rather than merely proposed.

The comparison section reuses the design goals as table axes. Instead of a broad related-work discussion, it compares tools on flexibility, productivity, quality control, accessibility, and price. The table is persuasive because its columns match the design goals already introduced in the introduction.

The experiment section evaluates one central claim from the design goals: productivity. It does not evaluate every feature. It asks whether POTATO's productivity features improve annotation speed, especially for complex tasks, and reports a compact controlled comparison.

For Humanly, the analogous paper spine should be:

- design goals in the introduction, not just a contribution list;
- Figure 1 as the visual summary of those goals, not only an architecture diagram;
- architecture paragraphs that explain how each module realizes the goals;
- comparison columns aligned with those goals;
- evaluation framed as testing whether final-text-only systems fail the process-evidence problem.

The Humanly design goals should be:

1. High flexibility and compatibility: the platform supports rich settings, personal writing, assigned tasks, public links, guest submissions, peer review, and AI policies ranging from no AI to full assistance.
2. High accountability and transparency: the platform is native to human-AI writing, records fine-grained human and AI actions, and exposes certificates, logs, replay, metrics, and public verification.

## Section-by-Section Writing Implications

The main lesson is not that Humanly needs a longer introduction. The lesson is that each paper section should answer the same design frame at a different level of detail.

- Abstract: name the system, state the access/deployment model, list the capability groups, report the compact evaluation, and provide the URL.
- Introduction: move quickly from the authenticity problem to the design goals. Avoid ending the introduction with a generic contribution list if the design goals can do the organizational work.
- Workflow figure: show user-facing artifacts and system state, not only infrastructure boxes. POTATO's Figure 2 works because `Config.yaml`, JSON input, user state, and rendered UI are all visible in the same diagram.
- Architecture: explain how modules realize the design goals. For Humanly, configuration, public links, enrollments, guest mode, peer review, and AI-mode settings implement flexibility and compatibility. The editor, event stream, AI logs, certificate pipeline, replay, and public verification implement accountability and transparency.
- Comparison: keep columns aligned with the design goals. Humanly's table should compare environment, governance, capture, and evidence because those are the requirements established earlier.
- Evaluation: do not turn the detector stress test into a detector leaderboard. Use it to test whether final-text-only systems can answer the policy/provenance question that motivates the system.

This means the paper should sound like a systems paper with design commitments, not a product tour. Screenshots should appear where they substantiate a goal: configuration under policy-first writing, workspace under native capture, logs under process capture, and certificate under reviewable evidence.
