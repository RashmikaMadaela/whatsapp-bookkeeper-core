import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
];

export default function Sidebar() {
  return (
    <aside className="w-52 min-h-screen bg-gray-900 text-white flex flex-col py-8 px-4 shrink-0">
      <h1 className="text-lg font-bold mb-8 leading-tight">
        ☕ Bookkeeper
      </h1>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
