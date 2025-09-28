import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ViewModeProvider } from "@/components/view-mode-context";
import { ProjectProvider } from "@/components/project-context";
import AppHeader from "@/components/AppHeader";
import HeaderSpacer from "@/components/HeaderSpacer";
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
      <head>
        {/* Load Codicons locally from /public */}
        <link rel="stylesheet" href="/codicon.css" />
      </head>
      <body className={`${tasa.variable} ${tasa.className} antialiased min-h-screen bg-black text-white`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ViewModeProvider>
            <ProjectProvider>
              <AuthSync />
              <AppHeader />
              <HeaderSpacer />
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
