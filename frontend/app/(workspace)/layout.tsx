import { Providers } from "@/components/providers";
import { WorkspaceShell } from "@/components/workspace-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Providers><WorkspaceShell>{children}</WorkspaceShell></Providers>;
}
