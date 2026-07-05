import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  Bell,
  BookOpen,
  Camera,
  ScanBarcode,
  FileText,
  ChefHat,
  ArrowRight,
  Check,
  Clock,
  BarChart2,
} from 'lucide-react'

function XMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <span className="font-serif text-xl tracking-tight text-foreground">NeiChef</span>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <Link href="/auth/sign-in" className="hover:text-foreground transition-colors">Sign in</Link>
          </nav>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-[oklch(0.92_0.04_145)] px-3 py-1.5 rounded-full mb-8 tracking-wide uppercase border border-[oklch(0.82_0.06_145)]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                Kitchen inventory, done right
              </div>
              <h1 className="font-serif text-5xl lg:text-6xl leading-tight text-foreground mb-6 text-balance">
                Know what&apos;s in your kitchen.
                <br />
                <em className="not-italic text-primary">Before it goes to waste.</em>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-md">
                Track your pantry, get warned before food expires, and cook with what you already have — so nothing gets thrown out and you stop overbuying.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Get started — it&apos;s free
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-md font-medium text-sm hover:bg-muted transition-colors"
                >
                  See how it works
                </a>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 mt-12 pt-10 border-t border-border">
                <div>
                  <p className="font-serif text-3xl text-foreground">$47</p>
                  <p className="text-xs text-muted-foreground mt-0.5">avg. saved / month</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="font-serif text-3xl text-foreground">8x</p>
                  <p className="text-xs text-muted-foreground mt-0.5">less food wasted</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="font-serif text-3xl text-foreground">3 min</p>
                  <p className="text-xs text-muted-foreground mt-0.5">to log a full shop</p>
                </div>
              </div>
            </div>

            {/* Right: product visual */}
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden border border-border shadow-sm">
                <Image
                  src="/hero-pantry.png"
                  alt="Fresh produce arranged on a clean kitchen surface"
                  width={640}
                  height={480}
                  className="w-full object-cover"
                  priority
                />
                {/* Overlay card */}
                <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-serif text-sm text-foreground">Your Pantry</span>
                    <span className="text-xs text-muted-foreground">18 items</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-[oklch(0.92_0.04_145)] rounded-md">
                      <p className="font-serif text-lg text-[oklch(0.28_0.08_145)]">13</p>
                      <p className="text-[10px] text-[oklch(0.35_0.07_145)] mt-0.5">Fresh</p>
                    </div>
                    <div className="text-center p-2 bg-[oklch(0.94_0.07_75)] rounded-md">
                      <p className="font-serif text-lg text-[oklch(0.42_0.10_55)]">5</p>
                      <p className="text-[10px] text-[oklch(0.45_0.09_55)] mt-0.5">Expiring</p>
                    </div>
                    <div className="text-center p-2 bg-[oklch(0.93_0.05_25)] rounded-md">
                      <p className="font-serif text-lg text-[oklch(0.42_0.15_25)]">2</p>
                      <p className="text-[10px] text-[oklch(0.45_0.13_25)] mt-0.5">Expired</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-4 -right-6 bg-card border border-border rounded-lg p-3 shadow-sm hidden md:block">
                <div className="flex items-start gap-2.5 max-w-[200px]">
                  <div className="w-6 h-6 rounded-full bg-[oklch(0.94_0.07_75)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-3 h-3 text-[oklch(0.42_0.10_55)]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground leading-snug">Salmon expires tomorrow</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Pan-seared salmon uses it</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-6 bg-[oklch(0.965_0.006_82)]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">The problem</p>
              <h2 className="font-serif text-3xl lg:text-4xl text-foreground mb-6 text-balance">
                The average household throws away $1,500 of food per year.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Most of it is produce and dairy that expired before you remembered it was there. You buy duplicates of things you already have. You plan meals without checking what needs to be used first.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The fix is not complicated. You need to know what you have and when it expires — before it goes bad, not after.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { stat: '$1,500', label: 'wasted per household per year in the US', source: 'USDA' },
                { stat: '30–40%', label: 'of the US food supply is wasted annually', source: 'FDA' },
                { stat: '1 in 3', label: 'grocery trips buy things already at home', source: 'ReFED' },
              ].map(({ stat, label, source }) => (
                <div key={stat} className="flex items-start gap-4 p-5 bg-card rounded-lg border border-border">
                  <p className="font-serif text-3xl text-primary flex-shrink-0 w-24">{stat}</p>
                  <div>
                    <p className="text-sm text-foreground leading-snug">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">Source: {source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">How it works</p>
            <h2 className="font-serif text-3xl lg:text-4xl text-foreground text-balance">
              Four steps. No friction.
            </h2>
          </div>
          <div className="space-y-0">
            {[
              {
                num: '01',
                title: 'Add what you have',
                desc: 'Scan a barcode, photograph your ingredients, upload a receipt, or enter items manually. NeiChef logs the name, quantity, and expiration date.',
                icon: Package,
              },
              {
                num: '02',
                title: 'Get notified before something expires',
                desc: 'You set how many days in advance you want to know. NeiChef sends a clear alert — item name, expiry date, and a recipe that uses it — so you can act on time.',
                icon: Bell,
              },
              {
                num: '03',
                title: 'Get recipe ideas based on what you have',
                desc: 'Recipes are ranked by how many of your pantry items they use, with priority given to ingredients close to expiring. No guesswork, no wasted trips.',
                icon: BookOpen,
              },
              {
                num: '04',
                title: 'Cook, guided step by step',
                desc: 'Cook Mode gives you one instruction at a time in large, legible text — usable from across the kitchen. Built-in timers for steps that require waiting.',
                icon: ChefHat,
              },
            ].map(({ num, title, desc, icon: Icon }, idx) => (
              <div key={num} className="flex gap-6 lg:gap-10">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  {idx < 3 && <div className="w-px flex-1 bg-border mt-3 min-h-[48px]" />}
                </div>
                <div className="pb-12 pt-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1 tracking-widest">{num}</p>
                  <h3 className="font-serif text-xl text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-20 px-6 bg-[oklch(0.965_0.006_82)]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Features</p>
            <h2 className="font-serif text-3xl lg:text-4xl text-foreground text-balance">
              Everything your kitchen needs.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Package, title: 'Pantry inventory', desc: 'Track every item by name, category, quantity, expiry date, and storage location — fridge, freezer, or pantry.' },
              { icon: Camera, title: 'Photo recognition', desc: 'Photograph your groceries. NeiChef detects what you have and lists them for confirmation before saving.' },
              { icon: ScanBarcode, title: 'Barcode scanning', desc: "Scan any packaged item's barcode to auto-fill the product name and details. Add quantity and expiry, done." },
              { icon: FileText, title: 'Receipt import', desc: 'Upload a grocery receipt. NeiChef parses the list, lets you review, and adds confirmed items to your pantry.' },
              { icon: Bell, title: 'Expiration alerts', desc: 'Configurable warnings — set how many days ahead you want to know, with a recipe suggestion for the expiring item.' },
              { icon: BookOpen, title: 'Recipe suggestions', desc: 'Recipes ranked by ingredient overlap with your pantry. Filter by time, difficulty, and cost.' },
              { icon: ChefHat, title: 'Cook Mode', desc: 'One step at a time, large and legible. Built-in timers. Designed for use at arm\'s length while cooking.' },
              { icon: BarChart2, title: 'Waste tracking', desc: 'See how many items you used before expiry and estimate money saved versus wasted over time.' },
              { icon: Clock, title: 'Saved recipes', desc: 'Bookmark recipes you like or add your own. Your collection alongside pantry-matched suggestions.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card rounded-lg border border-border p-5 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium text-sm text-foreground mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Why it&apos;s different</p>
            <h2 className="font-serif text-3xl lg:text-4xl text-foreground text-balance">
              Not another recipe search engine.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-serif text-lg text-muted-foreground mb-6">The old way</h3>
              <div className="space-y-4">
                {[
                  'Open a recipe app and search for something',
                  "Check if you have the ingredients — you don't",
                  'Make a grocery run for three missing items',
                  'Forget what was expiring at home',
                  'Throw it out a week later',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <XMark className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-serif text-lg text-foreground mb-6">With NeiChef</h3>
              <div className="space-y-4">
                {[
                  'Photograph your groceries when you get home',
                  'NeiChef knows what you have and what expires soon',
                  'Get recipes ranked by ingredient overlap and urgency',
                  'Cook before things go bad',
                  'Track money saved. Reduce waste over time.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-sidebar">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl lg:text-4xl text-sidebar-foreground mb-4 text-balance">
            Start with your pantry, today.
          </h2>
          <p className="text-sidebar-foreground/60 mb-10 leading-relaxed max-w-xl mx-auto">
            Add what you have, see what&apos;s expiring, and cook something good with it. No subscription required to get started.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Open NeiChef
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar border-t border-sidebar-border px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="font-serif text-xl text-sidebar-foreground">NeiChef</span>
            <p className="text-xs text-sidebar-foreground/40 mt-1">Kitchen pantry management.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-xs text-sidebar-foreground/40">
            <a href="#" className="hover:text-sidebar-foreground/70 transition-colors">Privacy</a>
            <a href="#" className="hover:text-sidebar-foreground/70 transition-colors">Terms</a>
            <Link href="/auth/sign-in" className="hover:text-sidebar-foreground/70 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
