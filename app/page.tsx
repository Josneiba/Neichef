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
  Sparkles,
  Leaf,
} from 'lucide-react'
import ExpiringRecipesServer from '@/components/recipes/expiring-recipes-server'

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
    <div className="landing-shell min-h-screen text-foreground">
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <span className="font-serif text-xl tracking-tight">NeiChef</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition hover:text-foreground">How it works</a>
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#why-it-matters" className="transition hover:text-foreground">Why it matters</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in" className="rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">Sign in</Link>
            <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Join free
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section px-6 pb-12 pt-16 md:pt-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                  Kitchen inventory, simplified
                </div>

                <h1 className="mt-7 max-w-xl font-serif text-5xl leading-[0.95] tracking-tight text-foreground md:text-6xl">
                  Know what&apos;s in your kitchen.
                  <span className="mt-3 block text-primary">Before it goes to waste.</span>
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
                  Track what you already have, spot expiring items early, and turn your pantry into a smarter meal plan—without the extra grocery run.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/auth/sign-up" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
                    Start free
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Link>
                  <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary">
                    See how it works
                  </a>
                </div>

                <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-8">
                  {[
                    { value: '$47', label: 'avg. saved / month' },
                    { value: '8x', label: 'less food wasted' },
                    { value: '3 min', label: 'to log a shop' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="font-serif text-3xl text-foreground">{item.value}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-border bg-card p-3 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
                  <div className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-[linear-gradient(135deg,#f7f4ee,#edf4ee)]">
                    <Image src="/hero-pantry.png" alt="Healthy pantry ingredients arranged on a kitchen counter" width={640} height={480} className="h-[480px] w-full object-cover" priority />
                  </div>

                  <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur-sm shadow-lg">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-serif text-lg text-foreground">Your pantry</span>
                      <span className="text-xs text-muted-foreground">18 items</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-primary/10 p-3 text-center">
                        <p className="font-serif text-2xl text-primary">13</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-primary">Fresh</p>
                      </div>
                      <div className="rounded-xl bg-amber-100 p-3 text-center">
                        <p className="font-serif text-2xl text-amber-700">5</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-amber-700">Expiring</p>
                      </div>
                      <div className="rounded-xl bg-rose-100 p-3 text-center">
                        <p className="font-serif text-2xl text-rose-700">2</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-rose-700">Expired</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-3 top-8 hidden max-w-[220px] rounded-2xl border border-border bg-card p-3 shadow-lg md:block">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Bell className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Items expiring soon</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Try a recipe before the fridge gets crowded.</p>
                      <a href="/app/recipes" className="mt-2 inline-block text-xs font-medium text-primary underline decoration-primary/40 underline-offset-4">See suggestions</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[oklch(0.965_0.006_82)] px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">The problem</p>
                <h2 className="max-w-md font-serif text-4xl leading-tight text-foreground">
                  Food waste happens because the kitchen is noisy.
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { value: '$1,500', label: 'wasted per household per year', source: 'USDA' },
                  { value: '30-40%', label: 'of the US food supply is wasted annually', source: 'FDA' },
                  { value: '1 in 3', label: 'grocery trips buy things already at home', source: 'ReFED' },
                ].map((item) => (
                  <div key={item.value} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
                    <p className="w-24 flex-shrink-0 font-serif text-3xl text-primary">{item.value}</p>
                    <div>
                      <p className="text-sm leading-6 text-foreground">{item.label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Source: {item.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">How it works</p>
              <h2 className="font-serif text-4xl text-foreground">Four steps. Zero guesswork.</h2>
            </div>

            <div className="space-y-6">
              {[
                { num: '01', title: 'Add what you have', desc: 'Scan a barcode, photograph your groceries, upload a receipt, or type in items manually. NeiChef keeps the essentials in one place.', icon: Package },
                { num: '02', title: 'Know what is expiring soon', desc: 'Set the warning window you want and get a clean alert before produce, dairy, and leftovers slip away.', icon: Bell },
                { num: '03', title: 'Match meals to your pantry', desc: 'Recipes are ranked by ingredient overlap and urgency so you cook with what you already have.', icon: BookOpen },
                { num: '04', title: 'Cook with focus', desc: 'Use guided steps and timers in a clean kitchen-friendly view while you prepare the meal.', icon: ChefHat },
              ].map(({ num, title, desc, icon: Icon }, index) => (
                <div key={num} className="grid gap-5 rounded-[1.75rem] border border-border bg-card p-6 md:grid-cols-[80px_1fr] md:p-8">
                  <div className="flex items-center gap-4 md:flex-col md:items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/8 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{num}</span>
                  </div>
                  <div className={index < 3 ? 'border-b border-border pb-2 md:border-b-0 md:pb-0' : ''}>
                    <h3 className="font-serif text-2xl text-foreground">{title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-[oklch(0.965_0.006_82)] px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Features</p>
              <h2 className="font-serif text-4xl text-foreground">Everything your kitchen needs.</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { icon: Package, title: 'Pantry insight', desc: 'Track items, categories, quantities, and expiry dates without losing track of what is already at home.' },
                { icon: Camera, title: 'Photo recognition', desc: 'Photograph groceries, review the suggestions, and add them in seconds.' },
                { icon: ScanBarcode, title: 'Barcode scanning', desc: 'Capture a product instantly and keep the pantry list accurate from the first shopping trip.' },
                { icon: FileText, title: 'Receipt import', desc: 'Upload receipts and confirm only the items you want to add.' },
                { icon: Bell, title: 'Expiry alerts', desc: 'Set reminders ahead of time and get recipe suggestions before food spoils.' },
                { icon: BookOpen, title: 'Recipe matching', desc: 'Surface recipes that use what you already have and minimize unnecessary buying.' },
                { icon: ChefHat, title: 'Cook mode', desc: 'One step at a time, with large text and keyboard-free usability in the kitchen.' },
                { icon: BarChart2, title: 'Waste tracking', desc: 'Measure what you saved and understand how much food you are reducing over time.' },
                { icon: Clock, title: 'Saved favourites', desc: 'Keep the recipes you love close and revisit them whenever you need a plan.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <Icon className="h-4 w-4" strokeWidth={1.7} />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="why-it-matters" className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Why it matters</p>
              <h2 className="font-serif text-4xl text-foreground">Not another recipe app. A better kitchen system.</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-border bg-card p-6">
                <h3 className="mb-5 font-serif text-2xl text-muted-foreground">The old way</h3>
                <div className="space-y-4">
                  {['Search a recipe app', 'Forget what is already at home', 'Buy duplicates on the way back', 'Find a forgotten item in the fridge', 'Throw it away a week later'].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <XMark className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-primary/20 bg-primary/4 p-6">
                <h3 className="mb-5 font-serif text-2xl text-foreground">With NeiChef</h3>
                <div className="space-y-4">
                  {['Photograph groceries when you get home', 'Know what expires soon and what is already there', 'Use pantry-first recipes before buying more', 'Cook with fewer decisions and less waste', 'Track money saved over time'].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 text-primary" strokeWidth={2.5} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-sidebar px-6 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary">
                <Leaf className="h-6 w-6" strokeWidth={1.8} />
              </div>
            </div>
            <h2 className="font-serif text-4xl text-sidebar-foreground">Start with your pantry, today.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-sidebar-foreground/70">
              Organize what you already have, cook before food expires, and build calmer, smarter grocery habits.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
                Create your free account
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link href="/auth/sign-in" className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-transparent px-7 py-3.5 text-sm font-medium text-sidebar-foreground/80 transition hover:border-sidebar-primary hover:text-sidebar-foreground">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/80 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">N</span>
              <span className="font-serif text-xl text-foreground">NeiChef</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Kitchen pantry management.</p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="transition hover:text-foreground">Privacy</a>
            <a href="#" className="transition hover:text-foreground">Terms</a>
            <Link href="/auth/sign-in" className="transition hover:text-foreground">Sign in</Link>
            <Link href="/auth/sign-up" className="transition hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
