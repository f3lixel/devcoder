import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ViewModeProvider } from "@/components/view-mode-context";
import { ProjectProvider } from "@/components/project-context";
import CommandPalette from "@/components/CommandPalette";
import { Toaster } from "sonner";
import { tasa } from "./fonts";
import AuthSync from "@/components/AuthSync";

export const metadata: Metadata = {
  title: "Felixel Dev",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${tasa.variable} ${tasa.className} antialiased min-h-screen bg-[oklch(0.1653 0.0026 83.22)] text-white`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ViewModeProvider>
            <ProjectProvider>
              <AuthSync />
              <div>{children}</div>
              <CommandPalette />
              <Toaster position="top-right" richColors theme="dark" />
            </ProjectProvider>
          </ViewModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
