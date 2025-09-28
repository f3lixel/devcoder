"use client";
import { Suspense } from "react";
import StartProject from "./start-project";

export default function DashboardPage() {
	return (
		<div className="p-6">
			<h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
			<Suspense fallback={null}>
				<StartProject />
			</Suspense>
		</div>
	);
}
