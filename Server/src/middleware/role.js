/**
 * The gates on the member-facing routes.
 *
 * These were hand-written checks that read req.user.role straight off the
 * decoded token - no database, and no look at the account's standing at all:
 *
 *   if (req.user.role !== "member" && req.user.role !== "admin") ...
 *
 * The admin half of the app has always used requireRole, which reads role,
 * super-admin and status fresh from the database on every request. So the two
 * halves disagreed about how far to trust a token that can be fifteen minutes
 * old, and it was the weaker half that guarded writing, editing, deleting and
 * submitting posts.
 *
 * There is no way to un-approve somebody through the app today, so nothing is
 * currently exploitable through this - but the admin dashboard already draws a
 * "rejected" badge for users, which says plainly where this is going. The two
 * halves are the same gate now, and whoever adds that button inherits a guard
 * that already asks the right question.
 */
import { requireRole } from "./auth.js";

export const ensureAdmin = requireRole("admin");
export const ensureMember = requireRole(["member", "admin"]);
