import type { Metadata } from "next";
import { tasa } from "@/app/fonts";
import ProjectsBgClient from "./ProjectsBgClient";

export const metadata: Metadata = {
  title: "Projects",
  description: "Projects section",
};

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${tasa.className} min-h-screen`}>
      <ProjectsBgClient />
      {children}
    </div>
  );
}
