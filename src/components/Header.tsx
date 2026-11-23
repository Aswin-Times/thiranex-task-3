import { Menu, Package, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import type { User } from '../types';

interface Props { user: User | null; cartCount: number; search: string; view: string; onSearch: (value: string) => void; onView: (view: 'shop' | 'orders' | 'admin') => void; onCart: () => void; onAuth: () => void; onLogout: () => void; }

export function Header({ user, cartCount, search, view, onSearch, onView, onCart, onAuth, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = (next: 'shop' | 'orders' | 'admin') => { onView(next); setMobileOpen(false); };
  return <>
    <div className="announcement">Complimentary shipping on orders over $150</div>
    <header className="site-header">
      <button className="icon-btn mobile-nav-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X /> : <Menu />}</button>
      <button className="wordmark" onClick={() => navigate('shop')}>ATELIER<span>Objects for living</span></button>
      <nav className={mobileOpen ? 'main-nav open' : 'main-nav'}>
        <button className={view === 'shop' ? 'active' : ''} onClick={() => navigate('shop')}>Shop</button>
        {user && <button className={view === 'orders' ? 'active' : ''} onClick={() => navigate('orders')}>My orders</button>}
        {user?.role === 'admin' && <button className={view === 'admin' ? 'active' : ''} onClick={() => navigate('admin')}>Admin studio</button>}
      </nav>
      <div className="header-actions">
        <label className="header-search"><Search size={17} /><input aria-label="Search products" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search" /></label>
        {user ? <div className="account-menu"><button className="icon-btn" title={user.name}><UserRound /></button><div className="account-popover"><strong>{user.name}</strong><small>{user.email}</small><button onClick={onLogout}>Sign out</button></div></div> : <button className="icon-btn" onClick={onAuth} aria-label="Sign in"><UserRound /></button>}
        {user && <button className="icon-btn orders-shortcut" onClick={() => navigate('orders')} aria-label="Orders"><Package /></button>}
        <button className="icon-btn cart-button" onClick={onCart} aria-label={`Cart with ${cartCount} items`}><ShoppingBag /><span>{cartCount}</span></button>
      </div>
    </header>
  </>;
}

