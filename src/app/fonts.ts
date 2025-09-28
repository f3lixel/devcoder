import localFont from "next/font/local";

export const tasa = localFont({
  src: [
    { path: "../../public/TASA_EXPLORER_FONT/TASAExplorer-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/TASA_EXPLORER_FONT/TASAExplorer-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/TASA_EXPLORER_FONT/TASAExplorer-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/TASA_EXPLORER_FONT/TASAExplorer-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/TASA_EXPLORER_FONT/TASAExplorer-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-tasa",
});


