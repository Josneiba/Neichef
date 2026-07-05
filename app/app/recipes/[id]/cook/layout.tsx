// Cook Mode renders full-screen — no sidebar/shell wrapper.
// We break out of the /app layout by providing our own root layout here.
export default function CookModeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
