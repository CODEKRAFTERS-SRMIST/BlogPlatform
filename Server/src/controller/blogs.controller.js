import express from 'express'
import prisma from '../db/db.js';

export const createBlog = async(req,res,next) =>{

    try{
    const {title,content,links} = req.body;
    const author_id = req.user.id; // Get from authenticated user

    const newBlog = await prisma.blog.create({
        data: {
            title,
            content,
            links,
            author_id
        }
    })

    res.status(201).json({newBlog})

}catch(error){
    console.error('Error creating blog:', error);
    res.status(500).json({error : "Failed To Create Blog"})
}
}

export const editBlog = async (req,res,next) => {
    try{

        const {id} = req.params;
        const blog = await prisma.blog.findUnique({where : {id : id}})
        
        if(!blog){
            return res.status(404).json({error:"No Blog Found"})
        }

        if(blog.status === 'submitted'){
            return res.status(400).json({error : "Blog Submitted Cant Be edited"})
        }

        const updated = await prisma.blog.update({
            where : {id : blog.id},
            data: { ...req.body, updated_at: new Date() }
        })

        res.status(200).json({updated})

    }catch(error){
        console.error('Error editing blog:', error);
        res.status(500).json({error : "Failed To Edit The Blog"})
    }
}

export const deleteBlog = async (req,res,next) =>{

    try{

        const {id} = req.params;

        const blog = await prisma.blog.findUnique({
            where : {id : id}
        })
        if (!blog) return res.status(404).json({ error: "Blog not found" });

        if (blog.author_id !== req.user.id)
            return res.status(403).json({ error: "Unauthorized" });

       if (blog.status === "approved")
      return res.status(400).json({ error: "Cannot delete approved blog" });

        await prisma.blog.delete({ where: { id } });

        res.status(200).json({message : "Successfully Deleted"})

    }catch(error){
        console.error('Error deleting blog:', error);
        res.status(500).json({error : "Unable To Delete Blog"})
    }

}

export const getblogs = async(req,res,next) =>{
    try{

        const {id} = req.params;

       const blog = await prisma.blog.findUnique({
            where : {id},
            include: {
                author: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

         if (!blog) return res.status(404).json({ error: "Blog not found" });
         
         if (blog.author_id !== req.user.id)
             return res.status(403).json({ error: "Unauthorized" });
      
         res.status(200).json({blog})

    }catch(error){
        console.error('Error fetching blog:', error);
        res.status(500).json({error : "Internal server error"})
    }
}

export const getAllBlogs = async(req,res,next) =>{
    try{
        const blogs = await prisma.blog.findMany({
            include: {
                author: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        res.status(200).json({blogs})

    }catch(error){
        console.error('Error fetching blogs:', error);
        res.status(500).json({error : "Internal server error"})
    }
}

// Get current user's blogs
export const getMyBlogs = async(req,res,next) =>{
    try{
        const blogs = await prisma.blog.findMany({
            where: {
                author_id: req.user.id
            },
            include: {
                author: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        res.status(200).json({blogs})

    }catch(error){
        console.error('Error fetching user blogs:', error);
        res.status(500).json({error : "Internal server error"})
    }
}

// Submit blog for review
export const submitBlog = async(req,res,next) =>{
    try{
        const {id} = req.params;

        const blog = await prisma.blog.findUnique({
            where: {id},
            select: {author_id: true, status: true}
        })

        if (!blog) return res.status(404).json({ error: "Blog not found" });
        
        if (blog.author_id !== req.user.id)
            return res.status(403).json({ error: "Unauthorized" });

        if (blog.status !== 'draft')
            return res.status(400).json({ error: "Only draft blogs can be submitted" });

        const updatedBlog = await prisma.blog.update({
            where: {id},
            data: { status: 'pending_review' }
        })

        res.status(200).json({message: "Blog submitted for review", blog: updatedBlog})

    }catch(error){
        console.error('Error submitting blog:', error);
        res.status(500).json({error : "Internal server error"})
    }
}