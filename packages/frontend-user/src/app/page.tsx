import type { ReactNode } from 'react';
import Link from 'next/link';

const ink = '#1a1c20';
const muted = '#6e7176';
const hairline = 'rgba(20,22,26,0.10)';
const bg2 = '#ebede4';
const good = '#6f8a78';

const logRows = [
  ['12:41:48', 'input', '#dde6df', '#4a655a', '796'],
  ['12:41:48', 'focus', '#dadfd9', '#56655a', '796'],
  ['12:41:36', 'blur', '#e5e5e2', '#65655f', '0'],
  ['12:41:33', 'select', '#e5e5e2', '#65655f', '0'],
  ['12:41:31', '✦ Simplify', '#dee4ee', '#3a4a64', 'AI'],
  ['12:41:31', 'input', '#dde6df', '#4a655a', '788'],
  ['12:41:16', 'delete', '#e5e5e2', '#65655f', '44'],
  ['12:41:02', 'input', '#dde6df', '#4a655a', '768'],
  ['12:40:58', '✦ Grammar', '#dee4ee', '#3a4a64', 'AI'],
];

const toolRows = [
  ['ls', '8ms'],
  ['grep', '28ms'],
  ['read', '52ms'],
  ['grep', '43ms'],
  ['read', '49ms'],
];

const faqs = [
  [
    'Does Humanly slow my writing down?',
    'No. The tracker runs at the keystroke layer with no UI overhead — the editor feels like a normal editor.',
  ],
  [
    "What's in the certificate?",
    'A signed record of your writing session and a hash of the final text. Anyone can verify it without signing up.',
  ],
  [
    'Is my draft private?',
    'Always. Only the signature and metadata leave your workspace — your content never does.',
  ],
  [
    'Which AI models work?',
    'Bring your own. GPT, Claude, Gemini, or any model via our API.',
  ],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <NavBar />

      <section id="product" className="relative px-5 pb-14 pt-24 sm:px-8 sm:pb-16 sm:pt-28 lg:px-14 lg:pt-[120px]">
        <div className="mx-auto max-w-[940px] text-center">
          <Eyebrow className="mb-7">Humanly</Eyebrow>
          <h1 className="text-[44px] font-semibold leading-[1.04] tracking-[-0.025em] sm:text-[64px] lg:text-[72px]">
            <span>Write with AI.</span>
            <br />
            <span className="text-[#a0a2a7]">Prove your process.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-[560px] text-[15px] leading-[1.7] text-muted-foreground sm:text-[19px] sm:leading-[1.55]">
            A writing workspace that quietly records how a draft came together —
            then signs it with a certificate any reader can verify.
          </p>
          <div className="mt-9 flex justify-center">
            <Link href="/register" className="humanly-landing-btn">
              Start writing <Arrow />
            </Link>
          </div>
        </div>

        <HeroComposition />
      </section>

      <ProblemSection />
      <HowItWorksSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function NavBar() {
  return (
    <header className="grid grid-cols-[1fr_auto] items-center border-b border-[rgba(20,22,26,0.05)] px-5 py-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-14 lg:py-[26px]">
      <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-[-0.02em]">
        <span className="text-lg leading-none">–</span>
        <span>Humanly</span>
      </Link>

      <nav className="hidden items-center gap-9 text-sm font-medium text-muted-foreground lg:flex">
        <a href="#product" className="hover:text-foreground">Product</a>
        <a href="#process" className="hover:text-foreground">How it works</a>
        <a href="#faq" className="hover:text-foreground">FAQ</a>
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        <a
          href="https://github.com/ShenzheZhu/humanly"
          className="hidden items-center gap-2 rounded-full border border-[rgba(20,22,26,0.10)] px-3 py-1.5 text-[13px] font-medium text-muted-foreground sm:inline-flex"
        >
          <GitHubMark />
          <span>Star</span>
          <span className="font-semibold text-foreground">1.2k</span>
        </a>
        <Link href="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">
          Log in
        </Link>
        <Link href="/login" className="humanly-landing-btn px-[18px] py-[9px] text-[13px]">
          Sign in
        </Link>
      </div>
    </header>
  );
}

function HeroComposition() {
  return (
    <div className="relative mx-auto mt-[72px] h-[390px] w-full max-w-[1100px] sm:h-[520px] lg:h-[720px]">
      <div
        className="absolute inset-0 rotate-[-0.6deg] rounded-md bg-cover bg-center"
        style={{
          backgroundImage: "url('/brand/monet-windmills.jpg')",
          boxShadow:
            '0 36px 80px -30px rgba(40,32,18,0.40), 0 0 0 8px #fbf9f1, 0 0 0 9px rgba(40,32,18,0.10)',
        }}
      />

      <div className="absolute left-1/2 top-5 z-20 w-[min(680px,78vw)] -translate-x-1/2 rotate-[0.4deg] sm:top-7 lg:left-[210px] lg:top-[30px] lg:w-[680px] lg:translate-x-0">
        <HeroDocCalm />
      </div>

      <AIAssistCard />
      <TrackingCard />
      <CertificateCard />
    </div>
  );
}

function HeroDocCalm() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[rgba(20,22,26,0.10)] bg-white shadow-[0_30px_80px_-30px_rgba(10,10,10,0.18)]">
      <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.05)] px-4 py-3 sm:px-[22px] sm:py-[14px]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9e6df]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9e6df]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9e6df]" />
        </div>
        <span className="text-[10px] text-muted-foreground sm:text-xs">A draft, in progress</span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[#6f8a78] sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Tracking
        </span>
      </div>

      <div className="grid min-h-[360px] grid-cols-1 md:min-h-[510px] md:grid-cols-[1.5fr_1fr]">
        <div className="border-b border-[rgba(20,22,26,0.05)] p-5 md:border-b-0 md:border-r md:p-9">
          <div className="mb-2 text-[11px] text-muted-foreground">Untitled draft</div>
          <h3 className="mb-4 text-xl font-bold leading-[1.2] tracking-[-0.015em] sm:text-[22px]">
            On the practice of attention
          </h3>
          <p className="mb-3 text-[13px] leading-[1.75] text-[#2a2d33]">
            The first thing to notice about a paragraph is the silence around it.
            Before a word lands on the page there is a small, deliberate{' '}
            <span className="rounded-sm bg-[rgba(91,111,140,0.14)] px-1">refusal</span>{' '}
            — the writer choosing not to type yet.
          </p>
          <p className="text-[13px] leading-[1.75] text-muted-foreground">
            Most drafts fail in this earlier moment, when the mind accepts whatever
            language arrives first. The discipline is to wait, then to choose.
          </p>
          <span className="humanly-cursor-blink mt-1 inline-block h-[17px] w-0.5 bg-foreground align-text-bottom" />
        </div>

        <div className="hidden flex-col bg-[#fcfcfb] md:flex">
          <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.05)] px-3.5 py-3">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold">
              <span className="grid h-4 w-4 place-items-center rounded bg-foreground text-[9px] text-white">✦</span>
              AI Assistant
            </span>
            <span className="text-xs text-[#a0a2a7]">⚙ + ⟲ ×</span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-3.5 pb-0">
            <div className="self-center rounded-[14px] bg-foreground px-3 py-2 text-[11px] leading-normal text-white">
              Tell me the overall grading distribution
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-[#ebede4] p-2 pb-2.5">
              {toolRows.map(([tool, ms]) => (
                <div
                  key={`${tool}-${ms}`}
                  className="flex items-center gap-1.5 rounded-md border border-[rgba(20,22,26,0.05)] bg-white px-2.5 py-1.5 text-[10px] text-[#2a2d33]"
                >
                  <span className="text-[9px] text-[#6f8a78]">✓</span>
                  <span className="font-bold">{tool}</span>
                  <span className="ml-auto text-muted-foreground">{ms}</span>
                  <span className="text-[#a0a2a7]">›</span>
                </div>
              ))}
              <p className="px-1 pt-1 text-[10.5px] leading-[1.55] text-[#2a2d33]">
                Here&apos;s the overall grading distribution for ENV100H1F from
                page 6 of the syllabus…
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center gap-1.5 rounded-full bg-[rgba(91,111,140,0.10)] px-2 py-1 text-[10px] font-bold text-[#5b6f8c]">
              <span>⊙</span>
              PDF context available (13 pages)
            </div>
            <div className="flex justify-between rounded-md bg-[#ebede4] px-2.5 py-1.5 text-[10px] text-muted-foreground">
              <span>kimi-k2.6 (image+text)</span>
              <span>⇅</span>
            </div>
            <div className="flex items-stretch gap-1.5">
              <div className="flex-1 rounded-md border border-foreground bg-white px-2.5 py-2 text-[10.5px] text-[#a0a2a7]">
                Type your message…
              </div>
              <button className="grid w-8 place-items-center rounded-md bg-[#a0a2a7] text-xs text-white">↗</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIAssistCard() {
  return (
    <div className="absolute left-7 top-[240px] z-30 hidden w-[200px] rotate-[-2deg] rounded-[10px] border border-[rgba(20,22,26,0.10)] bg-white px-3.5 py-3 shadow-[0_24px_60px_-18px_rgba(20,22,26,0.40)] lg:block">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-foreground text-[10px] font-bold text-white">✦</span>
        <span className="text-[11px] font-bold">AI Assistant</span>
        <span className="ml-auto rounded-full bg-[#dee4ee] px-1.5 py-px text-[8px] font-bold text-[#3a4a64]">SIMPLIFY</span>
      </div>
      <p className="mb-2.5 rounded-md bg-[#ebede4] px-2.5 py-2 text-[10.5px] leading-[1.55] text-[#2a2d33]">
        Most drafts fail when the mind{' '}
        <span className="text-muted-foreground line-through decoration-[#a07868] decoration-[1.5px]">
          accepts whatever language arrives
        </span>{' '}
        <span className="rounded-sm bg-[#dde6df] px-1 font-bold text-[#3a5040]">
          takes what arrives
        </span>
        .
      </p>
      <div className="flex gap-1">
        <span className="rounded-[5px] bg-foreground px-2.5 py-1.5 text-[10px] font-bold text-white">Apply</span>
        <span className="rounded-[5px] border border-[rgba(20,22,26,0.10)] px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground">Discard</span>
      </div>
    </div>
  );
}

function TrackingCard() {
  return (
    <div className="absolute right-7 top-[70px] z-40 hidden w-[200px] rotate-[2deg] rounded-[10px] border border-[rgba(20,22,26,0.10)] bg-white px-3.5 py-3 shadow-[0_24px_50px_-18px_rgba(20,22,26,0.40)] lg:block">
      <div className="mb-2.5 flex justify-between">
        <span className="text-[11px] font-bold">Tracking log</span>
        <span className="text-[9px] text-muted-foreground">live</span>
      </div>
      {logRows.map(([time, kind, rowBg, fg, count]) => (
        <div
          key={`${time}-${kind}`}
          className="grid grid-cols-[50px_1fr_auto] items-center gap-1 border-t border-dashed border-[rgba(20,22,26,0.05)] py-[3px] text-[9.5px] first:border-t-0"
        >
          <span className="text-muted-foreground">{time}</span>
          <span
            className="w-fit rounded-[3px] px-1.5 py-px text-[9px] font-bold"
            style={{ backgroundColor: rowBg, color: fg }}
          >
            {kind}
          </span>
          <span className="text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

function CertificateCard() {
  return (
    <div className="absolute right-7 top-[600px] z-30 hidden h-[100px] w-[460px] rotate-[-0.8deg] grid-cols-[1fr_auto] items-center gap-[18px] rounded-[10px] border border-[rgba(20,22,26,0.10)] bg-[#fdfcf7] px-[18px] py-3.5 shadow-[0_24px_50px_-18px_rgba(20,22,26,0.40)] lg:grid">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <CertBadge />
          <span className="text-[8.5px] font-bold tracking-[0.2em] text-muted-foreground">CERTIFICATE · SIGNED</span>
          <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[#6f8a78]" />
        </div>
        <div className="text-sm font-bold tracking-[-0.005em]">On the practice of attention</div>
        <div className="mt-1 whitespace-nowrap text-[9.5px] text-muted-foreground">
          Generated May 19, 2026 · SHA · 9F3A 7B2C
        </div>
      </div>
      <div className="flex gap-3.5">
        {[
          ['TYPED', '74%'],
          ['CHARS', '9,842'],
          ['TIME', '42 min'],
        ].map(([label, value]) => (
          <div key={label} className="text-right">
            <div className="text-[8.5px] tracking-[0.12em] text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-sm font-bold tracking-[-0.01em]">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProblemSection() {
  return (
    <section className="px-5 py-[120px] sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-16 text-center">
          <Eyebrow className="mb-[22px]">Problem</Eyebrow>
          <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
            <span>“Did you write this,</span>
            <br />
            <span className="text-[#a0a2a7]">or did AI?”</span>
          </h2>
          <p className="mx-auto mt-[22px] max-w-[560px] text-[15px] leading-[1.7] text-muted-foreground sm:text-[17px]">
            Every reader, editor, and reviewer asks the same question. The answer
            shouldn&apos;t be a defense — it should be a receipt.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <ProblemCard n="01" illo={<ProblemIllo1 />} caption="Detectors return false positives on your own writing." />
          <ProblemCard n="02" illo={<ProblemIllo2 />} caption="No one can see how the draft actually came together." />
          <ProblemCard n="03" illo={<ProblemIllo3 />} caption="You end up defending the work instead of doing it." />
        </div>
      </div>
    </section>
  );
}

function ProblemCard({ n, illo, caption }: { n: string; illo: ReactNode; caption: string }) {
  return (
    <div className="flex min-h-[300px] flex-col gap-6 rounded-[14px] border border-[rgba(20,22,26,0.10)] bg-white p-7">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">· {n}</span>
        <span className="h-1 w-1 rounded-full bg-foreground" />
      </div>
      <div className="flex flex-1 items-center justify-center">{illo}</div>
      <p className="text-base font-medium leading-[1.4] tracking-[-0.01em]">{caption}</p>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section id="process" className="px-5 py-[140px] sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-20 text-center">
          <Eyebrow className="mb-[22px]">How it works</Eyebrow>
          <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
            <span>Four steps</span>{' '}
            <span className="text-[#a0a2a7]">to a signed draft.</span>
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-4 md:gap-0">
          <Step n="01" t="Configure the environment" d="Set the rules before writing — AI on or off, paste allowed or not, character cap, time limit. Every setting is in your hands." illo={<StepIllo0 />} />
          <Step n="02" t="Write in the editor" d="Type, paste, or invite AI in. The editor feels normal — Humanly captures the timeline in the background." illo={<StepIllo1 />} divider />
          <Step n="03" t="Every action, fully logged" d="Type, paste, focus, AI assist — every event is captured with a timestamp and stored alongside the draft." illo={<StepIllo2 />} divider />
          <Step n="04" t="Sign the certificate" d="When you publish, Humanly emits a signed receipt of how the draft was made." illo={<StepIllo3 />} divider />
        </div>
      </div>
    </section>
  );
}

function Step({ n, t, d, illo, divider }: { n: string; t: string; d: string; illo: ReactNode; divider?: boolean }) {
  return (
    <div className={`flex flex-col gap-[22px] px-0 md:px-7 ${divider ? 'md:border-l md:border-[rgba(20,22,26,0.10)]' : ''}`}>
      <div className="flex h-[180px] items-center justify-center">{illo}</div>
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] text-muted-foreground">{n}</span>
        <h3 className="text-[22px] font-semibold leading-snug tracking-[-0.015em]">{t}</h3>
      </div>
      <p className="text-[14.5px] leading-[1.6] text-muted-foreground">{d}</p>
    </div>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="px-5 py-[120px] sm:px-8 lg:px-14">
      <div className="mx-auto grid max-w-[980px] gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
        <div>
          <Eyebrow className="mb-[22px]">FAQ</Eyebrow>
          <h2 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.015em]">
            <span>Common questions,</span>
            <br />
            <span className="text-[#a0a2a7]">plain answers.</span>
          </h2>
        </div>
        <div>
          {faqs.map(([question, answer], index) => (
            <details
              key={question}
              open={index === 0}
              className="group border-t border-[rgba(20,22,26,0.10)] py-[22px]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <span className="text-lg font-medium tracking-[-0.005em]">{question}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[rgba(20,22,26,0.10)] transition-transform group-open:rotate-45">
                  <PlusIcon />
                </span>
              </summary>
              <p className="mt-3.5 max-w-[580px] text-[15px] leading-[1.6] text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-5 py-[140px] text-center sm:px-8 lg:px-14">
      <Eyebrow className="mb-[22px]">Start writing</Eyebrow>
      <h2 className="text-[42px] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[60px]">
        <span>Your process,</span>
        <br />
        <span className="text-[#a0a2a7]">signed and delivered.</span>
      </h2>
      <div className="mt-11 flex justify-center gap-3">
        <Link href="/register" className="humanly-landing-btn">
          Open the editor <Arrow />
        </Link>
        <Link href="https://github.com/ShenzheZhu/humanly" className="humanly-landing-btn-ghost">
          Read the docs
        </Link>
      </div>
      <p className="mt-6 text-[13px] text-muted-foreground">Open source · self-host or sign in · MIT licensed</p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[rgba(20,22,26,0.10)] px-5 py-9 sm:px-8 lg:px-14">
      <div className="mx-auto flex max-w-[1168px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-bold tracking-[-0.02em]">
          <span className="text-lg leading-none">–</span>
          <span>Humanly</span>
        </Link>
        <div className="flex flex-wrap gap-5 text-xs font-medium text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <span>© 2026 Humanly · Open source under MIT</span>
        </div>
      </div>
    </footer>
  );
}

function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground ${className}`}>
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.23.48-2.7-.94-2.7-.94-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.7 7.7 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49l-.01 2.2c0 .22.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function CertBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="8" cy="6" r="4.5" />
      <path d="M5 9.5 L4 14 L8 12 L12 14 L11 9.5" />
    </svg>
  );
}

function ProblemIllo1() {
  return (
    <svg width="200" height="120" viewBox="0 0 200 120" aria-hidden="true">
      <rect x="20" y="22" width="100" height="76" rx="4" fill="none" stroke={ink} strokeWidth="1.5" />
      <rect x="32" y="36" width="60" height="4" fill={ink} />
      <rect x="32" y="46" width="76" height="4" fill={ink} opacity="0.5" />
      <rect x="32" y="56" width="50" height="4" fill={ink} opacity="0.5" />
      <rect x="32" y="66" width="68" height="4" fill={ink} opacity="0.5" />
      <rect x="32" y="76" width="40" height="4" fill={ink} opacity="0.5" />
      <g transform="translate(130, 30)">
        <path d="M0 30 L60 30 M30 0 L30 60" stroke="#a07868" strokeWidth="3" strokeLinecap="round" transform="rotate(45 30 30)" />
        <path d="M0 30 L60 30 M30 0 L30 60" stroke="#a07868" strokeWidth="3" strokeLinecap="round" transform="rotate(-45 30 30)" />
      </g>
    </svg>
  );
}

function ProblemIllo2() {
  return (
    <svg width="200" height="120" viewBox="0 0 200 120" aria-hidden="true">
      <g stroke={ink} strokeWidth="1.2" fill="none">
        <circle cx="40" cy="40" r="6" />
        <circle cx="100" cy="35" r="6" />
        <circle cx="160" cy="50" r="6" />
        <circle cx="70" cy="80" r="6" />
        <circle cx="140" cy="90" r="6" />
        <path strokeDasharray="2 3" d="M46 40 L94 35 M106 35 L154 50 M40 46 L70 74 M76 80 L134 90 M160 56 L140 84" />
      </g>
      {[
        [40, 44],
        [100, 39],
        [160, 54],
        [70, 84],
        [140, 94],
      ].map(([x, y]) => (
        <text key={`${x}-${y}`} x={x} y={y} fontFamily="var(--font-space-mono)" fontSize="6" textAnchor="middle" fill={ink}>?</text>
      ))}
    </svg>
  );
}

function ProblemIllo3() {
  return (
    <svg width="200" height="120" viewBox="0 0 200 120" aria-hidden="true">
      <g fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round">
        <path d="M20 60 C40 30, 60 90, 80 60 S 120 30, 140 60 S 180 90, 195 60" />
        <path d="M20 60 C40 90, 60 30, 80 60 S 120 90, 140 60 S 180 30, 195 60" opacity="0.4" />
      </g>
    </svg>
  );
}

function StepIllo0() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160" aria-hidden="true">
      <rect x="14" y="14" width="172" height="132" rx="8" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <text x="26" y="32" fontFamily="var(--font-space-mono)" fontSize="8" fontWeight="700" fill={ink}>Document Configuration</text>
      <line x1="14" y1="40" x2="186" y2="40" stroke={hairline} strokeWidth="0.8" />
      <text x="26" y="56" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>AI</text>
      <rect x="80" y="50" width="34" height="10" rx="2" fill={ink} />
      <text x="97" y="57" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill="#fff">Assist only</text>
      <rect x="116" y="50" width="22" height="10" rx="2" fill={bg2} />
      <text x="127" y="57" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill={muted}>Off</text>
      <rect x="140" y="50" width="32" height="10" rx="2" fill={bg2} />
      <text x="156" y="57" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill={muted}>Full chat</text>
      <text x="26" y="76" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>Paste</text>
      <rect x="80" y="70" width="34" height="10" rx="2" fill={bg2} />
      <text x="97" y="77" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill={muted}>Allowed</text>
      <rect x="116" y="70" width="32" height="10" rx="2" fill={ink} />
      <text x="132" y="77" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill="#fff">Blocked</text>
      <text x="26" y="96" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>Cap</text>
      <rect x="80" y="90" width="92" height="10" rx="2" fill="none" stroke={hairline} />
      <text x="86" y="97" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill={ink}>10,000 chars</text>
      <text x="26" y="116" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>Time</text>
      <rect x="80" y="110" width="60" height="10" rx="2" fill="none" stroke={hairline} />
      <text x="86" y="117" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill={ink}>45 min</text>
      <rect x="120" y="128" width="52" height="12" rx="3" fill={ink} />
      <text x="146" y="136" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="7" fontWeight="700" fill="#fff">Start →</text>
    </svg>
  );
}

function StepIllo1() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160" aria-hidden="true">
      <rect x="14" y="18" width="172" height="124" rx="8" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <line x1="14" y1="42" x2="186" y2="42" stroke={hairline} strokeWidth="1" />
      <circle cx="26" cy="30" r="2.5" fill={muted} /><circle cx="34" cy="30" r="2.5" fill={muted} /><circle cx="42" cy="30" r="2.5" fill={muted} />
      <rect x="26" y="56" width="100" height="6" rx="1" fill={ink} />
      <rect x="26" y="72" width="148" height="3" rx="1" fill={muted} opacity="0.5" />
      <rect x="26" y="82" width="118" height="3" rx="1" fill={muted} opacity="0.5" />
      <rect x="26" y="92" width="136" height="3" rx="1" fill={muted} opacity="0.5" />
      <rect x="26" y="102" width="76" height="3" rx="1" fill={muted} opacity="0.5" />
      <circle cx="166" cy="123" r="4" fill={good} />
    </svg>
  );
}

function StepIllo2() {
  const rows: Array<[string, string, string, string, string, number]> = [
    ['12:41:48', 'input', '#dde6df', '#4a655a', '796', 50],
    ['12:41:48', 'focus', '#dadfd9', '#56655a', '796', 70],
    ['12:41:31', '✦ Simplify', '#dee4ee', '#3a4a64', 'AI', 90],
    ['12:41:16', 'delete', '#e5e5e2', '#65655f', '44', 110],
    ['12:41:21', 'select', '#e5e5e2', '#65655f', '0', 130],
  ];

  return (
    <svg width="200" height="160" viewBox="0 0 200 160" aria-hidden="true">
      <rect x="14" y="14" width="172" height="132" rx="8" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <line x1="14" y1="34" x2="186" y2="34" stroke={hairline} strokeWidth="1" />
      <text x="24" y="28" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>TIME</text>
      <text x="60" y="28" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>KIND</text>
      <text x="172" y="28" textAnchor="end" fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>CHARS</text>
      {rows.map(([time, kind, rowBg, fg, chars, y]) => (
        <g key={`${time}-${kind}`}>
          <text x="24" y={Number(y)} fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>{time}</text>
          <rect x="58" y={Number(y) - 6} width={kind === '✦ Simplify' ? 44 : 34} height="9" rx="2" fill={rowBg} />
          <text x={kind === '✦ Simplify' ? 80 : 75} y={Number(y) + 0.5} textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="6" fontWeight="700" fill={fg}>{kind}</text>
          <text x="172" y={Number(y)} textAnchor="end" fontFamily="var(--font-space-mono)" fontSize="6" fill={kind === '✦ Simplify' ? muted : ink}>{chars}</text>
          {Number(y) < 130 && <line x1="20" y1={Number(y) + 8} x2="180" y2={Number(y) + 8} stroke={hairline} strokeWidth="0.5" strokeDasharray="2 2" />}
        </g>
      ))}
    </svg>
  );
}

function StepIllo3() {
  return (
    <svg width="200" height="160" viewBox="0 0 200 160" aria-hidden="true">
      <rect x="30" y="14" width="140" height="132" rx="6" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <rect x="30" y="14" width="140" height="22" fill={ink} />
      <text x="100" y="29" textAnchor="middle" fontFamily="var(--font-space-mono)" fontSize="8" fill="#fff" letterSpacing="2">CERTIFICATE</text>
      <rect x="46" y="48" width="108" height="5" fill={ink} />
      <rect x="46" y="60" width="80" height="3" fill={muted} />
      <line x1="46" y1="76" x2="154" y2="76" stroke={hairline} />
      <g transform="translate(56 92)">
        <text fontFamily="var(--font-space-mono)" fontSize="6" fill={muted}>SIGNED</text>
        <text y="12" fontFamily="var(--font-space-mono)" fontSize="12" fontWeight="600">✓</text>
      </g>
      <g transform="translate(130 92)" stroke={ink} fill="none" strokeWidth="1">
        <circle r="14" />
        <circle r="10" strokeDasharray="1 2" />
        <text textAnchor="middle" y="3" fontFamily="var(--font-space-mono)" fontSize="8" fontWeight="700" fill={ink} stroke="none">H</text>
      </g>
    </svg>
  );
}
