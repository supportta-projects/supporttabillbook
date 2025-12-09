import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">403</h1>
        <p className="mt-2 text-lg text-gray-600">Unauthorized Access</p>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access this resource.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

