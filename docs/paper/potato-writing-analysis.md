# PotatO Demo-Paper Writing Analysis

Source: Pei et al. (2022), "POTATO: The Portable Text Annotation Tool", EMNLP System Demonstrations.

## What PotatO Does Well

PotatO writes as a system paper, not as a concept note. The abstract names the tool, states its access model, lists three concrete capability groups, reports a focused experiment, and gives the public URL. The introduction then expands the same logic: a broad field need, a gap left by existing tools, the proposed system, and four design goals that organize the rest of the paper.

The paper keeps each section tied to the design goals. Architecture explains the implementation choices that make the goals feasible. Deployment and tasks show how the system is actually used across task types. The comparison table is not a generic related-work table; its columns are the system's design claims. The experiment measures one central system benefit: whether productivity features reduce annotation time on complex tasks.

The writing is concrete. It names task types, files, configuration formats, login flows, active-learning behavior, screenshots, and comparator systems. It also uses careful limits: the comparison includes free and available tools; the experiment controls familiarity and document sampling; the ethics section says what the tool cannot solve.

## Lessons for Humanly

Humanly should foreground system requirements before feature lists:

- policy-first writing environment;
- native capture of writing and AI events;
- shareable evidence through certificates, logs, replay, and verification;
- workflows for personal writing, assigned tasks, public links, guest submissions, and peer review.

The abstract should make those capabilities legible in one paragraph, then report the detector stress-test result as evidence that final text is insufficient.

The introduction should not read as a generic AI-detection motivation. It should quickly move from the authenticity problem to Humanly's design goals, then state the contribution as a deployed system.

The workflow section should start with the most distinctive use case, peer review, because it best shows why policy-bound process evidence matters. Classroom and personal writing can then show generality.

The comparison section should follow PotatO's pattern: compare systems along dimensions that match Humanly's requirements, then explain the table narrowly.

The evaluation section should stay focused. The detector stress test is not a detector leaderboard; it tests whether final-text-only predictors can substitute for process evidence. The human study should evaluate whether writers can work under policies and whether readers can interpret certificates/replay without treating them as automatic verdicts.
