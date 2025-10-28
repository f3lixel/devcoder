# hi

Auto-generated.

## AI To-do Plan (Live progress in chat)

The integrated AI can now create and execute a visible to-do plan while it works. The chat UI parses special fenced tool blocks and renders a live timeline.

Protocol the model follows:

- Initial plan
	```tool: todo-plan
	{"plan": {"phase": "running", "progress": {"done": 0, "total": 5}, "steps": [
		{"id": "s1", "type": "analyze", "label": "Read project", "state": "pending"},
		{"id": "s2", "type": "create", "label": "Add route", "path": "/src/app/contact/page.tsx", "state": "pending"}
	]}}
	```

- Deltas while working
	```tool: todo-plan
	{"delta": {"updateStep": {"id": "s1", "state": "done"}, "progress": {"done": 1}}}
	```

	```tool: todo-plan
	{"delta": {"upsertStep": {"id": "s3", "type": "edit", "label": "Wire UI", "path": "/src/components/NewAIChat.tsx", "state": "pending"}}}
	```

- Completion
	```tool: todo-plan
	{"delta": {"phase": "complete"}}
	```

The client strips these blocks from the visible assistant text and updates the plan UI in place.
