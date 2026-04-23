import Link from "next/link";
import { auth, signOut } from "@/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
];

export default async function Sidebar() {
  const session = await auth();
  const user = session?.user;

  return (
    <aside className="w-52 min-h-screen bg-gray-900 text-white flex flex-col py-8 px-4 shrink-0">
      <h1 className="text-lg font-bold mb-8 leading-tight">
        ☕ Bookkeeper
      </h1>

      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            {link.label}
          </Link>
        ))}

        {user?.role === "OWNER" && (
          <Link
            href="/admin/users"
            className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors text-purple-300"
          >
            Users
          </Link>
        )}
      </nav>

      {user && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <p className="text-xs text-gray-400 truncate">{user.name}</p>
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
              user.role === "OWNER"
                ? "bg-purple-800 text-purple-200"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {user.role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="mt-3 w-full text-left px-3 py-2 rounded-md text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

