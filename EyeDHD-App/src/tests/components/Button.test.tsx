import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../components/Button';

describe('UI - Button', () => {
	afterEach(() => {
		cleanup();
	});

	describe('A) Rendering', () => {
		it('A1) Renders the provided text', () => {
			render(<Button onClick={() => {}}>Save</Button>);
			expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		});

		it('A2) Respects the disabled prop', () => {
			render(<Button onClick={() => {}} disabled>Save</Button>);
			expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('A3) Uses the provided type', () => {
			render(<Button onClick={() => {}} type="submit">Save</Button>);
			expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
		});
	});

	describe('B) Interactions', () => {
		it('B1) Calls onClick when clicked', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			render(<Button onClick={onClick}>Save</Button>);

			await user.click(screen.getByRole('button', { name: 'Save' }));
			expect(onClick).toHaveBeenCalledTimes(1);
		});
	});
});