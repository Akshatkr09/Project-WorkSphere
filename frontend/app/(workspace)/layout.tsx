import { Providers } from "@/components/providers";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AuthGuard } from "@/components/auth-guard";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><Providers><WorkspaceShell>{children}</WorkspaceShell></Providers></AuthGuard>;
}
