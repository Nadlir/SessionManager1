import { NavLink } from "react-router-dom"
import { useHub } from "../context/HubContext"
import { Icon } from "./Icon"

interface SideNavProps {
  mobileOpen: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapsed: () => void
}

function navLinkClass(isActive: boolean, collapsed: boolean) {
  const base = `flex items-center gap-sm py-sm rounded-lg transition-all font-label-md text-label-md active:scale-95 ${
    collapsed ? "justify-center px-xs" : "px-sm"
  }`
  return isActive
    ? `${base} bg-secondary-container text-on-secondary-container font-bold shadow-sm`
    : `${base} text-on-surface-variant hover:bg-surface-container-high group`
}

export function SideNav({ mobileOpen, collapsed, onClose, onToggleCollapsed }: SideNavProps) {
  const { clinic, setClinic } = useHub()

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-on-surface/40 md:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface-container-lowest flex flex-col py-md px-sm gap-base z-40 transition-[transform,width] ${
          collapsed ? "w-16" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="hidden md:flex absolute -right-3 top-8 w-6 h-6 rounded-full bg-surface-container-lowest border border-outline-variant items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors shadow-sm z-50"
        >
          <Icon name={collapsed ? "chevron_right" : "chevron_left"} className="text-[16px]" />
        </button>

        <div
          className={`flex items-center gap-sm pb-md border-b border-outline-variant mb-sm ${
            collapsed ? "justify-center px-0" : "px-sm"
          }`}
        >
          <div
            className={`rounded-lg bg-surface-container-high overflow-hidden flex-shrink-0 flex items-center justify-center border border-outline-variant ${
              collapsed ? "w-9 h-9" : "w-12 h-12"
            }`}
          >
            <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
              <rect width="48" height="48" rx="10" fill="#eff4ff" />
              <circle cx="20" cy="25" r="11" fill="#94b8f0" />
              <circle cx="30" cy="22" r="10" fill="#fb923c" />
            </svg>
          </div>
          {collapsed ? null : (
            <div>
              <h2 className="font-headline-md text-headline-md font-extrabold text-secondary tracking-tight">
                Medical Hub
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Admin Portal</p>
            </div>
          )}
        </div>

        <div className={`mb-md ${collapsed ? "px-0" : "px-sm"}`}>
          <div
            className={`flex bg-surface-container-low rounded-lg p-1 border border-outline-variant w-full ${
              collapsed ? "flex-col gap-1" : "items-center"
            }`}
          >
            <button
              type="button"
              onClick={() => setClinic("diversa")}
              title="Diversa"
              className={`flex-1 py-1.5 rounded-md font-label-sm text-label-sm transition-colors whitespace-nowrap ${
                collapsed ? "px-0" : "px-sm"
              } ${
                clinic === "diversa"
                  ? "bg-surface border border-outline-variant text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {collapsed ? "D" : "Diversa"}
            </button>
            <button
              type="button"
              onClick={() => setClinic("rehup")}
              title="Rehup"
              className={`flex-1 py-1.5 rounded-md font-label-sm text-label-sm transition-colors whitespace-nowrap ${
                collapsed ? "px-0" : "px-sm"
              } ${
                clinic === "rehup"
                  ? "bg-surface border border-outline-variant text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {collapsed ? "R" : "Rehup"}
            </button>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-xs overflow-y-auto overflow-x-hidden">
          <NavLink
            to="/sessions"
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
            onClick={onClose}
            title="Sessions"
          >
            {({ isActive }) => (
              <>
                <Icon
                  name="calendar_today"
                  filled={isActive}
                  className={`text-xl ${isActive ? "" : "group-hover:text-primary-container transition-colors"}`}
                />
                {collapsed ? null : "Sessions"}
              </>
            )}
          </NavLink>
          <NavLink
            to="/patients"
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
            onClick={onClose}
            title="Patients"
          >
            {({ isActive }) => (
              <>
                <Icon
                  name="group"
                  filled={isActive}
                  className={`text-xl ${isActive ? "" : "group-hover:text-primary-container transition-colors"}`}
                />
                {collapsed ? null : "Patients"}
              </>
            )}
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-xs pt-sm border-t border-outline-variant">
          <button
            type="button"
            title="Logout"
            className={`flex items-center gap-sm py-sm rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all font-label-md text-label-md active:scale-95 group ${
              collapsed ? "justify-center px-xs" : "px-sm"
            }`}
          >
            <Icon name="logout" className="text-xl transition-colors" />
            {collapsed ? null : "Logout"}
          </button>
        </div>
      </aside>
    </>
  )
}
