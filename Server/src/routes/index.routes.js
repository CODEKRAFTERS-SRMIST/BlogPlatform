import usersRoutes from "./users.routes.js";
import authRoutes from "./auth.routes.js";
import blogsRoutes from "./blogs.routes.js";
import adminRoutes from "./admin.routes.js";
import interactionRoutes from "./interaction.routes.js";

export default function registerRoutes(app) {
  const prefix = "/api/v1";

  app.use("/api/users", usersRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/blogs", blogsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", interactionRoutes);

  app.use(`${prefix}/users`, usersRoutes);
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/blogs`, blogsRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}`, interactionRoutes);
}
