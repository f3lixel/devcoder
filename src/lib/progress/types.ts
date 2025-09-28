export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export type ProgressStep = {
	id: string;
	label: string;
	status: StepStatus;
	error?: string;
	startedAt?: number;
	finishedAt?: number;
};

export type ProgressEvent =
	| { type: 'status'; message: string }
	| { type: 'stepStart'; id: string }
	| { type: 'stepDone'; id: string }
	| { type: 'stepError'; id: string; error?: string };


