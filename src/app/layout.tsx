import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  IBM_Plex_Mono,
  Geist_Mono,
  Fira_Code,
  Space_Mono,
  Source_Code_Pro,
} from "next/font/google";
import "./globals.css";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });
const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-source-code-pro", display: "swap" });

const NO_FLASH_SCRIPT = `(function(){try{var s=localStorage.getItem('ui-tweaks');if(!s)return;var t=JSON.parse(s);var r=document.documentElement;r.classList.remove('theme-dark','theme-light','theme-system');r.classList.add('theme-'+t.theme);var h={amber:72,orange:50,red:27,pink:350,magenta:340,purple:290,blue:250,cyan:220,lime:140,emerald:155}[t.accent]||72;r.style.setProperty('--accent-hue',h);r.style.setProperty('--mono','"'+t.mono+'"');r.style.fontSize=t.density==='cozy'?'14px':'13px';}catch(e){}})();`;

export const metadata: Metadata = {
  title: "example homelab",
  description: "Homelab dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    inter.variable,
    jetbrains.variable,
    plexMono.variable,
    geistMono.variable,
    firaCode.variable,
    spaceMono.variable,
    sourceCodePro.variable,
  ].join(" ");
  return (
    <html lang="sv" className={`${fontVars} theme-dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <AuthSessionProvider>
          <ThemeBootstrap />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
