import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/actions";
import UserManagement from "./UserManagement";

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/dashboard");

  const users = await listUsers();
  return <UserManagement users={users} currentUserId={session.user.id} />;
}
