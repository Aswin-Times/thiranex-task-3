import { format } from 'date-fns';
import { PackageOpen } from 'lucide-react';
import { money } from '../api';
import type { Order } from '../types';

export function OrdersView({ orders, loading, onShop }: { orders: Order[]; loading: boolean; onShop: () => void }) {
  return <main className="account-page"><header><p className="kicker">YOUR ATELIER</p><h1>Order history</h1><p>Track recent orders and revisit the objects you chose.</p></header>{loading ? <div className="loading-line" /> : orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}><header><div><small>Order</small><strong>#{order.id.slice(0, 8).toUpperCase()}</strong></div><div><small>Placed</small><strong>{format(new Date(order.createdAt), 'MMM d, yyyy')}</strong></div><div><small>Total</small><strong>{money(order.totalCents)}</strong></div><span className={`order-status status-${order.status}`}>{order.status}</span></header><div className="order-items">{order.items.map((item) => <span key={item.id}>{item.productName} <small>× {item.quantity}</small></span>)}</div><p className="shipping-to">Shipping to: {order.shippingAddress}</p></article>)}</div> : <div className="empty-view"><PackageOpen /><h2>No orders yet</h2><p>Your considered collection begins in the shop.</p><button className="dark-button" onClick={onShop}>Explore the collection</button></div>}</main>;
}

