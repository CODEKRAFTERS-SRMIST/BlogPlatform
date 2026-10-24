import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  LayoutDashboard,
  PenTool,
  BookHeart,
  Settings,
  ChevronUp,
  ChevronDown,
  LogOut,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Section } from "@/types/blog";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (id: Section) => void;
  onLogout?: () => void;
  onLogin?: () => void;
  isLoggedIn?: boolean;
  userRole?: string;
  isSuperAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
  onLogout,
  onLogin,
  isLoggedIn = true,
  userRole,
  isSuperAdmin,
}) => {
  const router = useRouter();
  const [isWrapped, setIsWrapped] = useState(true);
  const isAdmin = userRole === "admin";

  /*
   * Admin is the only entry in this bar that leaves the page - it is a route,
   * not a section of the platform - so tapping it costs a route load where
   * the other tabs cost nothing. Asking for it up front means the JavaScript
   * and the server payload are already in the browser by the time it is
   * tapped, which is the difference between a tab that responds and one that
   * sits there.
   *
   * It is a no-op in `next dev`, where routes are compiled on demand.
   */
  useEffect(() => {
    if (isAdmin) {
      router.prefetch("/admin/members");
      router.prefetch("/admin/dashboard");
    }
  }, [isAdmin, router]);

  const navItems = [
    {
      id: "home",
      label: "Feed",
      icon: <Globe size={24} strokeWidth={2.5} />,
      color: "bg-[#F2B200]",
      shadow: "shadow-[#F2B200]/40",
      activeShadow: "0 0 25px rgba(242, 178, 0, 0.5)",
    },
    {
      id: "dashboard",
      label: "Main",
      icon: <LayoutDashboard size={24} strokeWidth={2.5} />,
      color: "bg-[#101828]",
      shadow: "shadow-[#101828]/30",
      activeShadow: "0 0 25px rgba(16, 24, 40, 0.4)",
    },
    {
      id: "new",
      label: "Write",
      icon: <PenTool size={24} strokeWidth={2.5} />,
      color: "bg-[#101828]",
      shadow: "shadow-[#101828]/30",
      activeShadow: "0 0 25px rgba(16, 24, 40, 0.4)",
    },
    {
      id: "myblogs",
      label: "Library",
      icon: <BookHeart size={24} strokeWidth={2.5} />,
      color: "bg-[#101828]",
      shadow: "shadow-[#101828]/30",
      activeShadow: "0 0 25px rgba(16, 24, 40, 0.4)",
    },
    {
      /*
       * One admin entry, where there used to be two.
       *
       * "Review" and "Manage" were separate buttons that opened the same
       * page, /admin/members, differing only in which of that page's own
       * tabs came up first - so the dock asked a question the page then
       * asked again, and two of the eight icons led to one place. This
       * lands on Story Review, which every admin can use; Members is one
       * tap away inside the page and stays super-admin only.
       */
      id: "admin_review",
      label: "Admin",
      href: "/admin/members",
      icon: <ShieldCheck size={24} strokeWidth={2.5} />,
      color: "bg-amber-600",
      shadow: "shadow-amber-600/30",
      activeShadow: "0 0 25px rgba(217, 119, 6, 0.4)",
      adminOnly: true,
    },
    {
      id: "settings",
      label: "Config",
      icon: <Settings size={24} strokeWidth={2.5} />,
      color: "bg-zinc-600",
      shadow: "shadow-zinc-600/30",
      activeShadow: "0 0 25px rgba(82, 82, 91, 0.4)",
    },
  ].filter((item: any) => {
    if (item.superAdminOnly) return Boolean(isSuperAdmin);
    if (item.adminOnly) return isAdmin;
    return true;
  });

  /*
   * Both navs are always in the HTML and CSS picks one, at the same 1024px
   * breakpoint `.pb-mobile-nav` uses for the clearance above the dock.
   *
   * Measuring the width in JS instead meant the server rendered nothing in
   * this slot, so React hydrated the rail against the sibling it found there
   * and threw a hydration mismatch. A media query is settled before the
   * first paint, so the right nav is on screen immediately - what the
   * measurement was there for - with nothing for React to disagree about.
   */
  return (
    <>
      {/* Solid white, not white/95 over a backdrop blur.
          This bar is fixed across the full width of the phone, so the blur
          behind it had to be recomputed for every frame of every scroll of
          the feed underneath - and at 95 per cent opacity there was almost
          nothing showing through to blur in the first place. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200/80 bg-white shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* One equal column per destination, so every label has the same room
            and the bar never scrolls sideways. The count is whatever this role
            can actually see, so a member's five items spread out rather than
            leaving a gap where the admin entries would be. */}
        <div
          className="grid items-end px-1 pb-1 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  if ((item as any).href) {
                    router.push((item as any).href);
                  } else {
                    onSectionChange(item.id as Section);
                  }
                }}
                whileTap={{ scale: 0.92 }}
                aria-current={isActive ? "page" : undefined}
                className="flex min-w-0 flex-col items-center gap-1 py-0.5"
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 ${
                    isActive ? `${item.color} text-white shadow-md` : "text-gray-400"
                  }`}
                >
                  {/* Rendered at the size it is drawn at, rather than a 24px
                      icon shrunk with a transform - that softened every edge. */}
                  {React.cloneElement(item.icon as React.ReactElement<any>, {
                    size: 17,
                    strokeWidth: 2.5,
                  })}
                </span>
                <span
                  className={`w-full truncate text-center text-[8px] font-black uppercase leading-none tracking-tight transition-colors duration-200 min-[340px]:text-[9px] ${
                    isActive ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
      <aside
        className="fixed left-4 top-1/2 -translate-y-1/2 z-[100] hidden lg:block"
        onMouseEnter={() => setIsWrapped(false)}
        onMouseLeave={() => setIsWrapped(true)}
      >
        <motion.div
          transition={{ type: "spring", damping: 22, stiffness: 180 }}
          className="flex flex-col items-center bg-white/85 backdrop-blur-md border border-white/80 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden p-3 sm:p-4"
        >
          <AnimatePresence mode="popLayout">
            {!isWrapped && (
              <motion.div
                key="nav-content"
                initial={{ opacity: 0, height: 0, scale: 0.8 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.5 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex flex-col items-center gap-5 sm:gap-6 mb-5 sm:mb-6"
              >
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="relative group"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="absolute left-full ml-6 px-4 py-2 bg-[#101828] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl opacity-0 pointer-events-none translate-x-[-15px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 shadow-xl whitespace-nowrap z-50">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-[#101828]"></div>
                    </div>

                    <motion.button
                      onClick={() => {
                        if ((item as any).href) {
                          router.push((item as any).href);
                        } else {
                          onSectionChange(item.id as Section);
                        }
                      }}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      className={`
                        relative w-12 h-12 sm:w-14 sm:h-14 rounded-[1.2rem] sm:rounded-[1.4rem] flex items-center justify-center transition-all duration-500
                        ${item.color} ${item.shadow} text-white shadow-xl
                        ${activeSection === item.id ? "ring-[4px] ring-white/90 scale-105" : "hover:brightness-110"}
                      `}
                      style={{
                        boxShadow: activeSection === item.id ? item.activeShadow : undefined,
                      }}
                    >
                      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/30 via-transparent to-black/10 pointer-events-none"></div>
                      <div className="absolute inset-[1px] rounded-[inherit] border border-white/20 pointer-events-none"></div>

                      <motion.div
                        animate={activeSection === item.id ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="scale-90 sm:scale-100"
                      >
                        {item.icon}
                      </motion.div>

                      {activeSection === item.id && (
                        <motion.div
                          layoutId="activeDot"
                          className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-6 sm:w-2 sm:h-7 bg-[#101828] rounded-full"
                          initial={false}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  </motion.div>
                ))}

              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative cursor-pointer group"
          >
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              {isWrapped ? <ChevronUp size={8} strokeWidth={4} /> : <ChevronDown size={8} strokeWidth={4} />}
            </div>

            <motion.div
              animate={{ y: isWrapped ? 0 : [0, -2, 0] }}
              transition={isWrapped ? { duration: 0.3 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 sm:w-16 sm:h-16 relative flex items-center justify-center"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <rect width="100" height="100" rx="35" fill="#1A1A1A" />
                <path d="M22 36 H40 V44 H30 V56 H40 V64 H22 V36 Z" fill="white" />
                <path d="M46 36 H54 V48 L64 36 H73 L61 51 L74 64 H65 L54 53 V64 H46 V36 Z" fill="white" />
              </svg>
            </motion.div>

            {isWrapped && (
              <div className="absolute inset-0 bg-transparent rounded-full flex items-center justify-center pointer-events-none">
                <div className="w-1 h-1 bg-[#F2B200] rounded-full absolute -bottom-1 sm:-bottom-2 animate-pulse" />
              </div>
            )}
          </motion.div>
        </motion.div>
      </aside>
    </>
  );
};

export default Sidebar;
