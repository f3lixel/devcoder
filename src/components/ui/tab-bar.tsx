"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Code, Eye, Terminal } from "lucide-react";
import type { ViewMode } from "@/components/view-mode-context";

interface TabBarProps {
	className?: string;
	onTabChange?: (tab: ViewMode) => void;
	defaultTab?: ViewMode;
}

export const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
	({ className, onTabChange, defaultTab = "live preview" }, ref) => {
		const [activeTab, setActiveTab] = React.useState<ViewMode>(defaultTab);
		const [tabBounds, setTabBounds] = React.useState({ left: 0, width: 0 });
		const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

		const tabs: { id: ViewMode; label: string; icon: React.ComponentType<any> }[] = [
			{ id: "live preview", label: "Preview", icon: Eye },
			{ id: "editor", label: "Editor", icon: Code },
		];

		React.useEffect(() => {
			const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
			const activeTabElement = tabRefs.current[activeIndex];

			if (activeTabElement) {
				const tabRect = activeTabElement.getBoundingClientRect();
				const containerRect = activeTabElement.parentElement?.getBoundingClientRect();

				if (containerRect) {
					setTabBounds({
						left: tabRect.left - containerRect.left,
						width: tabRect.width,
					});
				}
			}
		}, [activeTab]);

		const handleTabClick = (tabId: ViewMode) => {
			setActiveTab(tabId);
			onTabChange?.(tabId);
		};

		React.useEffect(() => {
			// keep in sync when defaultTab prop changes
			setActiveTab(defaultTab);
		}, [defaultTab]);

		return (
			<div
				ref={ref}
				className={cn(
					"relative inline-flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 p-1 backdrop-blur-sm border border-black/10 dark:border-white/10",
					className
				)}
			>
				{/* Animated background indicator */}
				<motion.div
					className="absolute z-10 rounded-lg bg-background dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10"
					initial={false}
					animate={{
						left: tabBounds.left,
						width: tabBounds.width,
						height: "calc(100% - 8px)",
						top: 4,
					}}
					transition={{ type: "spring", stiffness: 400, damping: 30 }}
				/>

				{/* Tab buttons */}
				{tabs.map((tab, index) => {
					const isActive = activeTab === tab.id;
					const Icon = tab.icon;

					return (
						<motion.button
							key={tab.id}
							ref={(el) => {
								tabRefs.current[index] = el;
							}}
							className={cn(
								"relative z-20 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg min-w-[100px]",
								isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
							)}
							onClick={() => handleTabClick(tab.id)}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							transition={{ type: "spring", stiffness: 400, damping: 25 }}
						>
							<motion.div
								animate={{ scale: isActive ? 1.1 : 1, rotate: isActive ? 360 : 0 }}
								transition={{ type: "spring", stiffness: 300, damping: 20 }}
							>
								<Icon className="w-4 h-4" />
							</motion.div>
							<motion.span
								animate={{ opacity: 1, x: 0 }}
								initial={{ opacity: 0.8, x: -2 }}
								transition={{ duration: 0.2, ease: "easeOut" }}
							>
								{tab.label}
							</motion.span>
						</motion.button>
					);
				})}
			</div>
		);
	}
);

TabBar.displayName = "TabBar";

