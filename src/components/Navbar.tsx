import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-gray-600 transition-colors">
          📚 Study Summarizer
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Home
          </Link>
          <Link href="/library" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Library
          </Link>
        </div>
      </div>
    </nav>
  );
}
