import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../components/Button';

describe('UI - Button', () => {
	describe('A) Rendering', () => {
		it('A1) Renders the provided text', () => {
			render(<Button buttonText="Save" onClick={() => {}} />);
			expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		});

		it('A2) Respects the disabled prop', () => {
			render(<Button buttonText="Save" onClick={() => {}} disabled />);
			expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('A3) Uses the provided type', () => {
			render(<Button buttonText="Save" onClick={() => {}} type="submit" />);
			expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
		});
	});

	describe('B) Interactions', () => {
		it('B1) Calls onClick when clicked', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();

			render(<Button buttonText="Save" onClick={onClick} />);

			await user.click(screen.getByRole('button', { name: 'Save' }));
			expect(onClick).toHaveBeenCalledTimes(1);
		});
	});
});