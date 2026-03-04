import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
    return (
        <div className="flex flex-col min-h-full">
            <Navbar />
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
        </div>
    )
}
