import ProtectedRoute from "@/components/protected-route"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="w-full max-w-screen-xl mx-auto">
        {children}
      </div>
    </ProtectedRoute>
  )
} 
 