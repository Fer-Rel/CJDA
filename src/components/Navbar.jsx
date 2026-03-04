import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const navLinks = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/clientes', label: 'Clientes' },
    { to: '/deudores', label: 'Deudores' },
]

export default function Navbar() {
    const [open, setOpen] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
    }

    const linkClass = ({ isActive }) =>
        `text-sm font-medium transition-colors px-3 py-2 rounded-md ${isActive
            ? 'bg-slate-800 text-white'
            : 'text-slate-300 hover:text-white hover:bg-slate-700'
        }`

    return (
        <nav className="bg-slate-900 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">

                    {/* Desktop links */}
                    <div className="hidden sm:flex items-center gap-1">
                        {navLinks.map(({ to, label, end }) => (
                            <NavLink key={to} to={to} end={end} className={linkClass}>
                                {label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="sm:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        onClick={() => setOpen(!open)}
                        aria-label="Toggle menu"
                    >
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    {/* Sign out */}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-700"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="sm:hidden border-t border-slate-700 px-4 py-3 flex flex-col gap-1">
                    {navLinks.map(({ to, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={linkClass}
                            onClick={() => setOpen(false)}
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>
            )}
        </nav>
    )
}
