/**
 * API Integration Guide for CodeKrafters Frontend
 * 
 * This file shows how to use the API client to connect with the backend
 * Make sure to follow these patterns in your components
 */

import { useEffect } from 'react';
import { authApi, blogApi, searchApi, healthApi, handleApiError } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';

/**
 * EXAMPLE 1: Using useApi hook to fetch data
 * Perfect for GET requests that should run on component mount
 */
export function ExampleFetchPosts() {
  const { data: posts, loading, error, refetch } = useApi(
    () => blogApi.getAllPosts(),
    [] // dependencies
  );

  useEffect(() => {
    // This will run automatically when component mounts
  }, []);

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {posts?.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
      <button onClick={refetch}>Refresh Posts</button>
    </div>
  );
}

/**
 * EXAMPLE 2: Using useMutation hook for creating data
 * Perfect for POST/PUT/DELETE operations
 */
export function ExampleCreatePost() {
  const { mutate: createPost, loading, error } = useMutation(
    (data) => blogApi.createPost(data)
  );

  const handleSubmit = async (formData: any) => {
    try {
      const newPost = await createPost({
        title: formData.title,
        subtitle: formData.subtitle,
        content: formData.content,
        coverImage: formData.coverImage,
        tags: formData.tags.split(',').map((t: string) => t.trim()),
      });
      console.log('Post created:', newPost);
      // Show success message
    } catch (err) {
      const errorMsg = handleApiError(err);
      console.error('Failed to create post:', errorMsg);
      // Show error message to user
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      // Call handleSubmit with form data
    }}>
      {loading && <p>Creating post...</p>}
      {error && <p>Error: {error}</p>}
      <button type="submit" disabled={loading}>
        Create Post
      </button>
    </form>
  );
}

/**
 * EXAMPLE 3: Direct API calls without hooks (for simple operations)
 */
export function ExampleDirectCall() {
  const handleLogin = async () => {
    try {
      const response = await authApi.login({
        email: 'user@example.com',
        password: 'password123',
      });
      console.log('Login successful:', response.user);
      // Redirect to dashboard or update app state
    } catch (error) {
      const errorMsg = handleApiError(error);
      console.error('Login failed:', errorMsg);
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}

/**
 * EXAMPLE 4: Health check to verify connection
 */
export function ExampleHealthCheck() {
  const { data: health, loading, error, refetch } = useApi(
    () => healthApi.check(),
    []
  );

  return (
    <div>
      {loading && <p>Checking connection...</p>}
      {health && <p>✓ Backend connected! Status: {health.status}</p>}
      {error && <p>✗ Connection failed: {error}</p>}
      <button onClick={refetch}>Retry Connection</button>
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST:
 * 
 * 1. Make sure backend is running on http://localhost:4000
 *    Command: npm run dev (in codekrafters-server folder)
 * 
 * 2. Make sure frontend is running on http://localhost:3000
 *    Command: npm run dev (in client folder)
 * 
 * 3. Check that .env.local has correct API_URL:
 *    NEXT_PUBLIC_API_URL=http://localhost:4000/api
 * 
 * 4. Check that backend .env has CORS_ORIGIN set:
 *    CORS_ORIGIN=http://localhost:3000
 * 
 * 5. Use these patterns in your components:
 *    - Use useApi() for fetching data
 *    - Use useMutation() for creating/updating/deleting data
 *    - Use handleApiError() to display errors
 *    - Always add error and loading states to UI
 * 
 * 6. For authentication:
 *    - Use authApi.login() to authenticate
 *    - Use authApi.getMe() to check current user
 *    - Cookies are sent automatically (withCredentials: true)
 * 
 * BEST PRACTICES:
 * 
 * ✓ Always handle errors gracefully
 * ✓ Show loading states to users
 * ✓ Use proper TypeScript types
 * ✓ Add try-catch blocks around mutations
 * ✓ Refetch data after mutations
 * ✓ Never hardcode API URLs in components
 * ✓ Keep API calls in the hooks file
 * ✓ Use environment variables for configuration
 */
