import type { Metadata } from "next";
import { tasa } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Projects",
  description: "Projects section",
};

export default async function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={tasa.className}>{children}</div>;
}
