import { useMemo, useReducer } from 'react';
import type { ProgressEvent, ProgressStep } from './types';

type State = {
	steps: ProgressStep[];
	statusMessage: string;
};

type Action =
	| { type: 'SET_STEPS'; steps: ProgressStep[] }
	| { type: 'STATUS'; message: string }
	| { type: 'STEP_START'; id: string }
	| { type: 'STEP_DONE'; id: string }
	| { type: 'STEP_ERROR'; id: string; error?: string }
	| { type: 'RESET' };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'SET_STEPS':
			return { ...state, steps: action.steps };
		case 'STATUS':
			return { ...state, statusMessage: action.message };
		case 'STEP_START':
			return {
				...state,
				steps: state.steps.map((s) =>
					s.id === action.id ? { ...s, status: 'running', startedAt: Date.now() } : s
				),
			};
		case 'STEP_DONE':
			return {
				...state,
				steps: state.steps.map((s) =>
					s.id === action.id ? { ...s, status: 'done', finishedAt: Date.now() } : s
				),
			};
		case 'STEP_ERROR':
			return {
				...state,
				steps: state.steps.map((s) =>
					s.id === action.id ? { ...s, status: 'error', error: action.error } : s
				),
			};
		case 'RESET':
			return { steps: [], statusMessage: '' };
		default:
			return state;
	}
}

export function useProgress(initialSteps: ProgressStep[] = []) {
	const [state, dispatch] = useReducer(reducer, {
		steps: initialSteps,
		statusMessage: '',
	});

	const api = useMemo(
		() => ({
			setSteps: (steps: ProgressStep[]) => dispatch({ type: 'SET_STEPS', steps }),
			reset: () => dispatch({ type: 'RESET' }),
			handleEvent: (evt: ProgressEvent) => {
				if (evt.type === 'status') dispatch({ type: 'STATUS', message: evt.message });
				if (evt.type === 'stepStart') dispatch({ type: 'STEP_START', id: evt.id });
				if (evt.type === 'stepDone') dispatch({ type: 'STEP_DONE', id: evt.id });
				if (evt.type === 'stepError') dispatch({ type: 'STEP_ERROR', id: evt.id, error: evt.error });
			},
		}),
		[]
	);

	return { ...state, ...api };
}


