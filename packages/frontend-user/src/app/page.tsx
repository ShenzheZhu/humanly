import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Github,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { HumanlyWordmark } from '@/components/brand/humanly-wordmark';

const logRows = [
  ['12:41:48', 'input', '796'],
  ['12:41:36', 'focus', '796'],
  ['12:41:33', 'select', '0'],
  ['12:41:31', 'AI · Simplify', 'AI'],
  ['12:41:16', 'delete', '44'],
  ['12:40:58', 'AI · Grammar', 'AI'],
];

const toolRows = [
  ['ls', '8ms'],
  ['grep', '28ms'],
  ['read', '52ms'],
  ['grep', '43ms'],
];

const steps = [
  [
    '01',
    'Configure',
    'Choose AI access, paste rules, character limits, and time limits before writing begins.',
  ],
  [
    '02',
    'Write',
    'Type, paste, revise, and use AI inside one tracked workspace.',
  ],
  [
    '03',
    'Record',
    'Humanly captures the writing timeline without interrupting the drafting surface.',
  ],
  [
    '04',
    'Sign',
    'Publish a verifiable PDF and JSON record of how the draft came together.',
  ],
];

const faqs = [
  [
    'Does Humanly slow down writing?',
    'No. The editor stays familiar while provenance is recorded in the background.',
  ],
  [
    'What does a certificate prove?',
    'It binds the final text to a signed record of typing, paste, timing, and AI assistance.',
  ],
  [
    'Can writers still use AI?',
    'Yes. Humanly is built for transparent human-AI collaboration, not hidden policing.',
  ],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-6 px-5 py-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start">
          <HumanlyWordmark size="md" />
        </Link>

        <nav className="hidden items-center gap-8 justify-self-center text-sm font-bold text-muted-foreground lg:flex">
          <a href="#product" className="transition-colors hover:text-foreground">
            Product
          </a>
          <a href="#process" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <a
            href="https://github.com/ShenzheZhu/humanly"
            className="hidden items-center gap-2 rounded-full border border-border bg-white/45 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <Github className="h-3.5 w-3.5" />
            Open source
          </a>
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Start
          </Link>
        </div>
      </header>

      <section
        id="product"
        className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28"
      >
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-7 text-xs font-bold uppercase text-muted-foreground">
            Humanly
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            <span>Write with AI.</span>
            <br />
            <span className="text-muted-foreground">Prove your process.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            A writing workspace that quietly records how a draft came together,
            then signs it with a certificate any reader can verify.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Start writing
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 rounded-full border border-border bg-white/50 px-6 py-3 text-sm font-bold transition-colors hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-16 min-h-[560px] max-w-6xl sm:mt-20 lg:min-h-[690px]">
          <div
            className="absolute inset-0 rotate-[-0.6deg] rounded-lg bg-cover bg-center humanly-panel-shadow"
            style={{
              backgroundImage: "url('/brand/monet-windmills.jpg')",
              boxShadow:
                '0 36px 80px -30px rgba(40,32,18,0.40), 0 0 0 8px #fbf9f1, 0 0 0 9px rgba(40,32,18,0.10)',
            }}
            aria-hidden="true"
          />

          <div className="absolute left-1/2 top-8 z-10 w-[min(760px,82vw)] -translate-x-1/2 rotate-[0.4deg]">
            <HeroWorkspaceMock />
          </div>

          <div className="absolute left-3 top-[46%] z-20 hidden w-56 rotate-[-2deg] rounded-lg border border-border bg-white p-4 shadow-2xl md:block">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold">AI Assistant</span>
            </div>
            <p className="rounded-md bg-muted p-3 text-xs leading-6 text-foreground/75">
              Most drafts fail when the mind{' '}
              <span className="text-muted-foreground line-through">
                accepts whatever language arrives
              </span>{' '}
              <span className="rounded bg-[#dde6df] px-1 font-bold text-[#3a5040]">
                takes what arrives
              </span>
              .
            </p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
                Apply
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                Discard
              </span>
            </div>
          </div>

          <div className="absolute bottom-5 right-5 z-20 hidden w-[460px] rotate-[-0.8deg] rounded-lg border border-border bg-[#fdfcf7] p-4 shadow-2xl lg:block">
            <div className="flex items-center justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-[#6f8a78]" />
                  Certificate · Signed
                </div>
                <div className="text-sm font-bold">
                  On the practice of attention
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Generated May 19, 2026 · SHA · 9F3A 7B2C
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                {[
                  ['Typed', '74%'],
                  ['Chars', '9,842'],
                  ['Time', '42m'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase text-muted-foreground">
                      {label}
                    </div>
                    <div className="text-sm font-bold">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-5 text-xs font-bold uppercase text-muted-foreground">
            Problem
          </div>
          <h2 className="text-4xl font-bold leading-tight sm:text-5xl">
            <span>Did you write this,</span>
            <br />
            <span className="text-muted-foreground">or did AI?</span>
          </h2>
          <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base">
            The answer should not be a defense. It should be a receipt.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            'AI detectors guess after the fact.',
            'Readers cannot see the writing process.',
            'Writers defend the work instead of doing it.',
          ].map((caption, index) => (
            <div
              key={caption}
              className="rounded-lg border border-border bg-white p-6"
            >
              <div className="mb-10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  · 0{index + 1}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              </div>
              <div className="mb-8 h-20 rounded-lg border border-dashed border-border bg-muted/70" />
              <p className="text-base font-bold leading-7">{caption}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="process" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mb-16 text-center">
          <div className="mb-5 text-xs font-bold uppercase text-muted-foreground">
            How it works
          </div>
          <h2 className="text-4xl font-bold leading-tight sm:text-5xl">
            Four steps to a signed draft.
          </h2>
        </div>

        <div className="grid gap-0 overflow-hidden rounded-lg border border-border bg-white md:grid-cols-4">
          {steps.map(([number, title, description], index) => (
            <div
              key={number}
              className="border-b border-border p-6 md:border-b-0 md:border-r last:border-r-0"
            >
              <div className="mb-8 grid h-24 place-items-center rounded-lg bg-muted">
                <span className="text-xs font-bold text-muted-foreground">
                  {number}
                </span>
              </div>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-xs text-muted-foreground">{number}</span>
                <h3 className="text-xl font-bold">{title}</h3>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                {description}
              </p>
              {index === 0 && (
                <div className="mt-5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                  AI · Assist only
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="mb-5 text-xs font-bold uppercase text-muted-foreground">
              FAQ
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Common questions, plain answers.
            </h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faqs.map(([question, answer]) => (
              <div key={question} className="py-6">
                <h3 className="text-base font-bold">{question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 text-center sm:px-8">
        <div className="mb-5 text-xs font-bold uppercase text-muted-foreground">
          Start writing
        </div>
        <h2 className="text-4xl font-bold leading-tight sm:text-6xl">
          Your process,
          <br />
          <span className="text-muted-foreground">signed and delivered.</span>
        </h2>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Open the editor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <HumanlyWordmark size="sm" cursor={false} />
          <div className="flex flex-wrap gap-5 text-xs font-bold text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span>Open source under MIT</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroWorkspaceMock() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white humanly-panel-shadow">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9e6df]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9e6df]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9e6df]" />
        </div>
        <span className="text-xs text-muted-foreground">A draft, in progress</span>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-[#6f8a78]">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Tracking
        </span>
      </div>

      <div className="grid min-h-[430px] grid-cols-1 md:grid-cols-[1.45fr_1fr]">
        <div className="border-b border-border/70 p-7 md:border-b-0 md:border-r">
          <div className="mb-2 text-xs text-muted-foreground">Untitled draft</div>
          <h3 className="mb-5 text-2xl font-bold leading-tight">
            On the practice of attention
          </h3>
          <p className="mb-4 text-sm leading-8 text-foreground/80">
            The first thing to notice about a paragraph is the silence around it.
            Before a word lands on the page there is a small, deliberate{' '}
            <span className="rounded bg-[#dee4ee] px-1">refusal</span>, the writer
            choosing not to type yet.
          </p>
          <p className="text-sm leading-8 text-muted-foreground">
            Most drafts fail in this earlier moment, when the mind accepts whatever
            language arrives first. The discipline is to wait, then to choose.
          </p>
          <span className="mt-2 inline-block h-5 w-0.5 bg-foreground humanly-cursor-blink" />
        </div>

        <div className="flex flex-col bg-[#fcfcfb]">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold">
              <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3" />
              </span>
              AI Assistant
            </span>
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="self-center rounded-full bg-primary px-4 py-2 text-xs leading-5 text-primary-foreground">
              Tell me the overall grading distribution
            </div>
            <div className="rounded-lg bg-muted p-2">
              {toolRows.map(([tool, time]) => (
                <div
                  key={`${tool}-${time}`}
                  className="mb-1 flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-xs last:mb-0"
                >
                  <Check className="h-3 w-3 text-[#6f8a78]" />
                  <span className="font-bold">{tool}</span>
                  <span className="ml-auto text-muted-foreground">{time}</span>
                </div>
              ))}
              <p className="px-1 pt-2 text-xs leading-6 text-foreground/75">
                Here is the distribution from page 6 of the syllabus.
              </p>
            </div>
          </div>
          <div className="space-y-2 p-3">
            <div className="rounded-full bg-[#dee4ee] px-3 py-1.5 text-[11px] font-bold text-[#3d4e66]">
              PDF context available · 13 pages
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border border-foreground bg-white px-3 py-2 text-xs text-muted-foreground">
                Type your message...
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-md bg-muted-foreground text-white">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold">Tracking log</span>
          <span className="text-muted-foreground">live</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {logRows.map(([time, kind, count]) => (
            <div
              key={`${time}-${kind}`}
              className="grid grid-cols-[4.5rem_1fr_auto] gap-2 rounded-md border border-border/70 px-2 py-1.5 text-[11px]"
            >
              <span className="text-muted-foreground">{time}</span>
              <span className="font-bold">{kind}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
