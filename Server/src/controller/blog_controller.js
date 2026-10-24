import * as BlogService from "../services/blogs.service.js";

const BlogController = {

    createBlog: (req, res) => {
      const title = req.body.title;
      const content = req.body.content;
      const userId = req.user.id;
  
      BlogService.createBlog({ title: title, content: content, authorId: userId })
        .then(blog => {
          res.status(201).json({
            success: true,
            blog: blog
          });
        })
        .catch(error => {
          res.status(500).json({
            success: false,
            message: error.message
          });
        });
    },
  
    getSingleBlog: (req, res) => {
      const id = req.params.id;
      BlogService.getBlogById(id)
        .then(blog => {
          if (!blog) {
            return res.status(404).json({
              success: false,
              message: "Blog not found"
            });
          }
          res.json({
            success: true,
            blog: blog
          });
        })
        .catch(error => {
          res.status(500).json({
            success: false,
            message: error.message
          });
        });
    },
    
    deleteBlog: (req, res) => {
      const id = req.params.id;
      BlogService.deleteBlog(id)
        .then(() => {
          res.json({
            success: true,
            message: "Blog deleted successfully"
          });
        })
        .catch(error => {
          res.status(500).json({
            success: false,
            message: error.message
          });
        });
    }
  
};

export default BlogController;
  