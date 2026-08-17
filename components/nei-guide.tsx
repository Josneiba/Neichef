import { ChefHat } from 'lucide-react'

export function NeiGuide({ caption }: { caption?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <ChefHat className="h-4 w-4" strokeWidth={1.8} />
      </div>
      {caption ? (
        <p className="max-w-[200px] rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs leading-4 text-foreground shadow-sm">
          {caption}
        </p>
      ) : null}
    </div>
  )
}
