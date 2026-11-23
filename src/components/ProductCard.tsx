import { Plus } from 'lucide-react';
import { money } from '../api';
import type { Product } from '../types';

export function ProductCard({ product, onAdd, onSelect }: { product: Product; onAdd: (product: Product) => void; onSelect: (product: Product) => void }) {
  return <article className="product-card">
    <button className="product-image" onClick={() => onSelect(product)} aria-label={`View ${product.name}`}>
      <img src={product.imageUrl} alt={product.name} loading="lazy" />
      {product.featured && <span className="badge">Atelier pick</span>}
      {!product.stock && <span className="sold-out">Sold out</span>}
    </button>
    <div className="product-info"><div><button onClick={() => onSelect(product)}>{product.name}</button><span>{product.category}</span></div><strong>{money(product.priceCents)}</strong></div>
    <button className="quick-add" disabled={!product.stock} onClick={() => onAdd(product)}><Plus size={16} />{product.stock ? 'Add to bag' : 'Unavailable'}</button>
  </article>;
}

