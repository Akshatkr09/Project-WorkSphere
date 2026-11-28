import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "../worksphere-completion.css";
import "../worksphere-project-tasks.css";

export const metadata: Metadata = {
  title: "WorkSphere",
  description: "Multi-tenant project management and workflow automation."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
