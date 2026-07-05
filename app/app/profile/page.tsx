'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/hooks'
import { User, Bell, Leaf, Home, Check, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const dietaryOptions = [
  'Vegetarian',
  'Vegetarian-friendly',
  'Vegan',
  'Gluten-free',
  'Gluten-free options',
  'Dairy-free',
  'Nut-free',
  'Low-carb',
  'Halal',
  'Kosher',
]

export default function ProfilePage() {
  const router = useRouter()
  const { profile, updateProfile } = useProfile()
  const [saved, setSaved] = useState(false)

  // Local form state
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [householdSize, setHouseholdSize] = useState(profile.householdSize)
  const [notifDays, setNotifDays] = useState(profile.notificationDaysAhead)
  const [dietary, setDietary] = useState<string[]>(profile.dietaryPreferences)

  function toggleDietary(pref: string) {
    setDietary((prev) => prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref])
  }

  async function handleSave() {
    await updateProfile({ name, email, householdSize, notificationDaysAhead: notifDays, dietaryPreferences: dietary })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/auth/sign-in')
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Account</p>
        <h1 className="font-serif text-3xl text-foreground">Profile</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-5 mb-8 p-6 bg-card border border-border rounded-xl">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-muted-foreground" strokeWidth={1} />
        </div>
        <div>
          <p className="font-serif text-xl text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Personal details */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-base text-foreground">Personal details</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Household */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <Home className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-base text-foreground">Household</h2>
          </div>
          <div className="px-6 py-5">
            <label className="block text-xs font-medium text-foreground mb-3">Household size</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setHouseholdSize(n)}
                  className={cn(
                    'w-10 h-10 rounded-md text-sm font-medium border transition-colors',
                    householdSize === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground'
                  )}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-1">people</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Used to scale serving sizes in recipes and estimate grocery quantities.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-base text-foreground">Notifications</h2>
          </div>
          <div className="px-6 py-5">
            <label className="block text-xs font-medium text-foreground mb-3">
              Warn me this many days before something expires
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setNotifDays(d)}
                  className={cn(
                    'h-10 px-4 rounded-md text-sm font-medium border transition-colors',
                    notifDays === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground'
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Currently alerting {notifDays} day{notifDays > 1 ? 's' : ''} ahead of expiry.
            </p>
          </div>
        </div>

        {/* Dietary preferences */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <Leaf className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-base text-foreground">Dietary preferences</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs text-muted-foreground mb-4">Used to filter and tag recipe suggestions. Select all that apply.</p>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map((pref) => {
                const selected = dietary.includes(pref)
                return (
                  <button
                    key={pref}
                    onClick={() => toggleDietary(pref)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground'
                    )}
                  >
                    {selected && <Check className="w-3 h-3" strokeWidth={2.5} />}
                    {pref}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={cn(
            'w-full py-3 rounded-md text-sm font-medium transition-colors',
            saved
              ? 'bg-[oklch(0.32_0.08_145)] text-primary-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {saved ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4" strokeWidth={2} /> Saved
            </span>
          ) : (
            'Save preferences'
          )}
        </button>

        {/* Sign out */}
        <div className="pt-2 border-t border-border">
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
