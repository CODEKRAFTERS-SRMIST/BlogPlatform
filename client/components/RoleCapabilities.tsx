"use client";

import { useState } from "react";
import { ShieldCheck, Check, Lock, ChevronDown } from "lucide-react";

/**
 * Says plainly what the signed-in admin is allowed to do here.
 *
 * The two roles look identical in the interface until something is refused,
 * so an ordinary admin used to find out they could not change a role only by
 * clicking and getting an error. This lists both sets up front, and marks the
 * ones the current account does not have.
 */

interface Capability {
  label: string;
  superOnly?: boolean;
}

const CAPABILITIES: Capability[] = [
  { label: "Read every submitted story" },
  { label: "Publish a story to the public feed" },
  { label: "Send a story back with a reason" },
  { label: "Approve people waiting to join" },
  { label: "See the full member list" },
  { label: "Remove a published story" },
  { label: "Make a member an admin", superOnly: true },
  { label: "Take admin away from someone", superOnly: true },
];

export default function RoleCapabilities({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  const allowed = CAPABILITIES.filter((c) => isSuperAdmin || !c.superOnly);
  const blocked = CAPABILITIES.filter((c) => !isSuperAdmin && c.superOnly);

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isSuperAdmin
              ? "bg-indigo-50 text-indigo-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          <ShieldCheck size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
            You are signed in as
          </span>
          <span className="block truncate text-sm font-black text-gray-900">
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </span>
          <span className="block text-xs font-bold text-gray-400">
            {allowed.length} things you can do
            {blocked.length > 0 ? `, ${blocked.length} you can't` : ""}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 sm:px-5">
          <ul className="space-y-2">
            {allowed.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                <span className="text-sm font-bold text-gray-700">{c.label}</span>
              </li>
            ))}
          </ul>

          {blocked.length > 0 && (
            <>
              <p className="mt-5 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Only a super admin can
              </p>
              <ul className="space-y-2">
                {blocked.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5">
                    <Lock size={15} className="mt-0.5 shrink-0 text-gray-300" />
                    <span className="text-sm font-bold text-gray-400">
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-bold leading-relaxed text-gray-400">
                Ask a super admin if you need one of these. The buttons are
                hidden rather than shown-and-refused, so nothing here will fail
                halfway.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
