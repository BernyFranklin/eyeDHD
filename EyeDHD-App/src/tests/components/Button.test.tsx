import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { store } from '@src/data';
import Button, { ButtonControls } from '../../components/Button';

const renderWithProvider = (ui: JSX.Element) => render(
	<Provider store={store}>
		{ui}
	</Provider>
);

describe('UI - Button', () => {
	beforeEach(() => {
		ButtonControls.enable();
	});

	afterEach(() => {
		cleanup();
	});

	describe('A) Rendering', () => {
		it('A1) Renders the provided text', () => {
			renderWithProvider(<Button onClick={() => {}}>Save</Button>);
			expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		});

		it('A2) Respects the disabled prop', () => {
			renderWithProvider(<Button onClick={() => {}} disabled>Save</Button>);
			expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('A3) Uses the provided type', () => {
			renderWithProvider(<Button onClick={() => {}} type="submit">Save</Button>);
			expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
		});
	});

	describe('B) Interactions', () => {
		it('B1) Calls onClick when clicked', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			renderWithProvider(<Button onClick={onClick}>Save</Button>);

			await user.click(screen.getByRole('button', { name: 'Save' }));
			expect(onClick).toHaveBeenCalledTimes(1);
		});
	});
});