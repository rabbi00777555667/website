// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCKc9xsKd5T8rewbR6s7xYC59WS6GWNAX0",
    authDomain: "social-media-f8902.firebaseapp.com",
    projectId: "social-media-f8902",
    storageBucket: "social-media-f8902.appspot.com",
    messagingSenderId: "800311820460",
    appId: "1:800311820460:web:8caef2c62b14748cc95f09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const postForm = document.getElementById('post-form');
const postsContainer = document.getElementById('posts');

// Authentication
loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error signing in:', error);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

onAuthStateChanged(auth, user => {
    if (user) {
        userInfo.textContent = `Hello, ${user.displayName}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        postForm.style.display = 'block';
        loadPosts();
    } else {
        userInfo.textContent = '';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        postForm.style.display = 'none';
    }
});

// Handle Post Submission
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const postText = document.getElementById('post-text').value;
    const postImage = document.getElementById('post-image').files[0];

    let imageUrl = '';
    if (postImage) {
        const storageRef = ref(storage, `posts/${postImage.name}`);
        await uploadBytes(storageRef, postImage);
        imageUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, 'posts'), {
        text: postText,
        imageUrl,
        timestamp: new Date(),
        user: auth.currentUser.displayName,
        userId: auth.currentUser.uid,
        likes: 0,
        comments: []
    });

    postForm.reset();
});

// Load Posts and Add Real-Time Listener
const loadPosts = () => {
    onSnapshot(collection(db, 'posts'), snapshot => {
        postsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const post = doc.data();
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.innerHTML = `
                <p><strong>${post.user}</strong></p>
                <p>${post.text}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post Image">` : ''}
                <div class="post-actions">
                    <button class="like-btn" data-id="${doc.id}">Like (${post.likes})</button>
                    <div class="comments">
                        <input type="text" class="comment-input" placeholder="Add a comment">
                        <button class="comment-btn" data-id="${doc.id}">Comment</button>
                        <div class="comment-list">
                            ${post.comments.map(comment => `<p><strong>${comment.user}</strong>: ${comment.text}</p>`).join('')}
                        </div>
                    </div>
                </div>
            `;
            postsContainer.appendChild(postElement);
        });

        // Add Event Listeners for Like and Comment Buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postId = e.target.getAttribute('data-id');
                const postRef = doc(db, 'posts', postId);
                const postDoc = await getDoc(postRef);
                const currentLikes = postDoc.data().likes;
                await updateDoc(postRef, { likes: currentLikes + 1 });
            });
        });

        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postId = e.target.getAttribute('data-id');
                const commentInput = e.target.previousElementSibling;
                const commentText = commentInput.value;
                const postRef = doc(db, 'posts', postId);
                await updateDoc(postRef, {
                    comments: arrayUnion({ user: auth.currentUser.displayName, text: commentText })
                });
                commentInput.value = '';
                loadPosts(); // Reload posts to update the comment list
            });
        });
    });
};