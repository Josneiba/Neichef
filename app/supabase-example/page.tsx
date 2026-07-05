import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl mb-6">Supabase Todos example</h1>
        <ul className="space-y-3">
          {todos?.map((todo: any) => (
            <li key={todo.id} className="rounded-lg border border-border bg-card p-4">
              {todo.name}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
