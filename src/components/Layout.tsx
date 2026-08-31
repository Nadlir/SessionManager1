import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Icon } from "./Icon"
import { SideNav } from "./SideNav"

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-full bg-background text-on-background font-body-md antialiased overflow-hidden selection:bg-primary-fixed selection:text-on-primary-fixed">
      <SideNav
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <button
        type="button"
        className="md:hidden fixed top-sm left-sm z-20 w-10 h-10 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-on-surface"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Icon name="menu" />
      </button>
      <main
        className={`flex-1 flex flex-col h-screen overflow-hidden bg-background min-w-0 transition-[margin] ${
          collapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}
