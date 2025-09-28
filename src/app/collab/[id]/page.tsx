import CollaborativeDoc from '@/components/CollaborativeDoc';

export default function CollabDocPage({ params }: { params: { id: string } }) {
	return (
		<div className="min-h-[100dvh] bg-background text-foreground p-4">
			<div className="mx-auto max-w-4xl h-[80dvh] border rounded-2xl overflow-hidden">
				<CollaborativeDoc room={params.id} />
			</div>
		</div>
	);
}
