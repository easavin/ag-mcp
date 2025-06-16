import JohnDeereConnectionHelper from '@/components/JohnDeereConnectionHelper'

export default function JohnDeereConnectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dbeafe 100%)', minHeight: '100vh' }}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>
            🚜 John Deere Integration
          </h1>
          <p className="text-lg" style={{ color: '#4b5563' }}>
            Manage your John Deere Operations Center connection
          </p>
        </div>
        <JohnDeereConnectionHelper />
      </div>
    </div>
  )
} 