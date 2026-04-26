import LayoutShell from '@/components/layout/LayoutShell'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>
}
