"use client";

import React, { useEffect, useState } from "react";

export const Header: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled
                    ? "dark:bg-black/80 bg-white/80 backdrop-blur-md dark:border-b border-b dark:border-white/10 border-black/10 py-4"
                    : "bg-transparent py-8"
            }`}
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between">
                <div className="flex items-center space-x-4 group cursor-pointer">
                    <div className="w-8 h-8 dark:bg-white bg-black flex items-center justify-center transition-transform group-hover:scale-105">
                        <span className="dark:text-black text-white font-black text-xl font-mono leading-none">
                            B
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black tracking-[0.3em] dark:text-white text-black uppercase leading-none">
                            BANTAI
                        </span>
                        <span className="text-[8px] font-bold dark:text-white/40 text-black/40 uppercase tracking-[0.2em]">
                            POLICY_ENGINE
                        </span>
                    </div>
                </div>

                <nav className="hidden md:flex items-center space-x-12 text-[10px] font-black tracking-[0.3em] uppercase dark:text-white/40 text-black/40">
                    <a
                        href="#features"
                        className="dark:hover:text-white hover:text-black transition-all"
                    >
                        WHY BANTAI
                    </a>
                    <a
                        href="#usage"
                        className="dark:hover:text-white hover:text-black transition-all"
                    >
                        USAGE
                    </a>
                    <a
                        href="https://github.com/bosquejun/bantai"
                        target="_blank"
                        className="dark:hover:text-white hover:text-black transition-all"
                    >
                        GITHUB
                    </a>
                </nav>

                <div className="flex items-center space-x-8">
                    <button className="dark:bg-white dark:text-black bg-black text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:opacity-90">
                        GET STARTED
                    </button>
                </div>
            </div>
        </header>
    );
};
