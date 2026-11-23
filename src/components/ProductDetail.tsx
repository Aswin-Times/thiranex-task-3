import { Minus, Plus, ShieldCheck, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { money } from '../api';
import type { Product } from '../types';

export function ProductDetail({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (product: Product, quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  return <div className="overlay product-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="product-detail" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose}><X /></button><div className="detail-image"><img src={product.imageUrl} alt={product.name} /></div><div className="detail-copy"><p className="kicker">{product.category}</p><h2>{product.name}</h2><strong className="detail-price">{money(product.priceCents)}</strong><p>{product.description}</p><div className="detail-stock">{product.stock ? <><i /> In stock · {product.stock} available</> : 'Currently unavailable'}</div><div className="detail-buy"><div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus /></button><span>{quantity}</span><button disabled={quantity >= product.stock} onClick={() => setQuantity(quantity + 1)}><Plus /></button></div><button className="dark-button" disabled={!product.stock} onClick={() => { onAdd(product, quantity); onClose(); }}>Add to bag</button></div><div className="detail-benefits"><span><Truck /> Complimentary shipping over $150</span><span><ShieldCheck /> 30-day considered returns</span></div></div></section></div>;
}

