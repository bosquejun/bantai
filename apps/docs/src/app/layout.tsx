import { TooltipProvider } from "@/components/ui/tooltip";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./global.css";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800"],
    variable: "--font-plus-jakarta-sans",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
    title: "Bantai | Type-Safe Policy Evaluation Engine",
    description:
        "Bantai evaluates real-world inputs into deterministic, explainable allow/deny decisions with full TypeScript safety.",
};

export default function Layout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
            suppressHydrationWarning
        >
            <body className="flex flex-col min-h-screen antialiased overflow-x-hidden noise">
                <RootProvider>
                    <TooltipProvider>{children}</TooltipProvider>
                </RootProvider>
            </body>
        </html>
    );
}
