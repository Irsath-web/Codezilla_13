import { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="layout">
            <Navbar />
            <div className="layout-body">
                <Sidebar />
                <main className="main-content">{children}</main>
            </div>
        </div>
    );
}

