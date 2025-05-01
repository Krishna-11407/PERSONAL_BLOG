document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const newPostBtn = document.getElementById('newPostBtn');
    const postForm = document.getElementById('postForm');
    const blogForm = document.getElementById('blogForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const postsContainer = document.getElementById('posts');
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.marginLeft = 'auto';
    document.querySelector('header').appendChild(logoutBtn);

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="modal-body"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Show/hide form
    newPostBtn.addEventListener('click', () => {
        postForm.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        postForm.classList.add('hidden');
        blogForm.reset();
    });

    // Handle form submission
    blogForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const post = {
            title: document.getElementById('title').value.trim(),
            content: document.getElementById('content').value.trim(),
            author: document.getElementById('author').value.trim()
        };

        // Validate form data
        if (!post.title || !post.content || !post.author) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(post)
            });

            const data = await response.json();

            if (response.ok) {
                blogForm.reset();
                postForm.classList.add('hidden');
                loadPosts();
            } else {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                } else {
                    alert(data.message || 'Error creating post');
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Error creating post. Please check the console for details.');
        }
    });

    // Load and display posts
    async function loadPosts() {
        try {
            const response = await fetch('http://localhost:3000/api/posts');
            const data = await response.json();

            if (response.ok) {
                postsContainer.innerHTML = data.map(post => `
                    <article class="post" data-post-id="${post._id}">
                        <h2>${post.title}</h2>
                        <div class="post-meta">
                            By ${post.author} on ${new Date(post.date).toLocaleDateString()}
                        </div>
                        <div class="post-content">
                            ${post.content}
                        </div>
                    </article>
                `).join('');

                // Add click handlers to posts
                document.querySelectorAll('.post').forEach(post => {
                    post.addEventListener('click', () => {
                        const postId = post.dataset.postId;
                        const postData = data.find(p => p._id === postId);
                        showPostModal(postData);
                    });
                });
            } else {
                postsContainer.innerHTML = `<p>Error loading posts: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Network error loading posts:', error);
            postsContainer.innerHTML = '<p>Error loading posts. Please check the console for details.</p>';
        }
    }

    // Show post in modal
    function showPostModal(post) {
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <h2>${post.title}</h2>
            <div class="post-meta">
                By ${post.author} on ${new Date(post.date).toLocaleDateString()}
            </div>
            <div class="post-content">
                ${post.content}
            </div>
        `;
        modal.style.display = 'block';
    }

    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Initial load of posts
    loadPosts();
}); 