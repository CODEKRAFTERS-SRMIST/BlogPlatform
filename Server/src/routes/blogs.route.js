import { Router } from "express";
import { createBlog, deleteBlog, editBlog, getblogs, getAllBlogs, getMyBlogs, submitBlog } from "../controller/blogs.controller.js";
import { authenticate } from "../middleware/auth.js";

const blogsRouter = Router();


blogsRouter.get('/', getAllBlogs);

blogsRouter.get('/:id', getblogs);

blogsRouter.get('/my/blogs', authenticate, getMyBlogs);

blogsRouter.post('/', authenticate, createBlog);

blogsRouter.patch('/:id', authenticate, editBlog);

blogsRouter.delete('/:id', authenticate, deleteBlog);

blogsRouter.post('/:id/submit', authenticate, submitBlog);

export default blogsRouter