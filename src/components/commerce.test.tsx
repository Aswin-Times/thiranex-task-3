import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthModal } from './AuthModal';
import { CartDrawer } from './CartDrawer';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

const product: Product = {
  id: 'p1', name: 'Arc Task Lamp', slug: 'arc-task-lamp', description: 'A sculptural steel lamp with warm light.',
  category: 'Lighting', priceCents: 12900, stock: 4, imageUrl: 'https://example.com/lamp.jpg', featured: true,
  createdAt: '', updatedAt: ''
};

describe('commerce interface', () => {
  it('renders a product and adds it to the bag', () => {
    const onAdd = vi.fn();
    render(<ProductCard product={product} onAdd={onAdd} onSelect={vi.fn()} />);
    expect(screen.getByText('Arc Task Lamp')).toBeInTheDocument();
    expect(screen.getByText('$129.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add to bag/ }));
    expect(onAdd).toHaveBeenCalledWith(product);
  });

  it('updates cart quantity and starts checkout', () => {
    const onQuantity = vi.fn(); const onCheckout = vi.fn();
    render(<CartDrawer items={[{ product, quantity: 2 }]} onClose={vi.fn()} onQuantity={onQuantity} onCheckout={onCheckout} />);
    expect(screen.getByText('$258.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue to checkout/ }));
    expect(onCheckout).toHaveBeenCalled();
  });

  it('switches to registration mode', () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
  });
});

