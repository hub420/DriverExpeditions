/**
 * @file Main application file for the comments system
 * @description Integrates Firebase configuration and UI functionality
 */

// Import Firebase Firestore methods
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

// Import Firebase configuration and utilities
import { 
    firebaseConfig,
    initializeFirebase, 
    validateFirebaseConfig, 
    getDatabase,
    COLLECTIONS
} from '../../firebaseConfig.js';

/**
 * Comment validation and sanitization functions
 */
function validateComment(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.push('Please enter a valid email address');
    }
    
    if (!formData.comment || formData.comment.length < 10) {
        errors.push('Comment must be at least 10 characters long');
    }
    
    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
        errors.push('Please select a rating between 1 and 5 stars');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function sanitizeComment(formData) {
    return {
        name: formData.name.trim().substring(0, 50),
        email: formData.email.trim().toLowerCase(),
        comment: formData.comment.trim().substring(0, 1000),
        rating: parseInt(formData.rating),
        createdAt: new Date().toISOString()
    };
}

/**
 * Main Comments Application Class
 */
class CommentsApp {
    constructor() {
        this.db = null;
        this.selectedRating = 0;
        this.elements = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Comments App...');
        
        try {
            // Validate and initialize Firebase
            console.log('🔍 Validating Firebase configuration...');
            if (!validateFirebaseConfig()) {
                throw new Error('Firebase configuration is invalid or incomplete. Please check your firebaseConfig.js file.');
            }

            console.log('🔥 Initializing Firebase...');
            await initializeFirebase();
            
            console.log('📊 Getting database instance...');
            this.db = getDatabase();
            
            if (!this.db) {
                throw new Error('Failed to get database instance');
            }
            
            console.log('✅ Database instance obtained successfully');

            // Initialize DOM elements
            console.log('🎯 Initializing DOM elements...');
            this.initializeDOMElements();
            
            // Setup event listeners
            console.log('👂 Setting up event listeners...');
            this.setupEventListeners();
            
            // Load existing comments
            console.log('📖 Loading existing comments...');
            await this.loadComments();
            
            this.isInitialized = true;
            console.log('✅ Comments app initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize comments app:', error);
            
            let errorMessage = 'Failed to initialize comments system. ';
            
            if (error.message.includes('configuration')) {
                errorMessage += 'Please check your Firebase configuration.';
                console.error('💡 Make sure to replace the placeholder values in firebaseConfig.js with your actual Firebase project settings.');
            } else if (error.message.includes('network') || error.message.includes('connection')) {
                errorMessage += 'Please check your internet connection.';
            } else {
                errorMessage += 'Please refresh the page and try again.';
            }
            
            this.showMessage(errorMessage, 'danger');
        }
    }

    /**
     * Initialize all DOM elements
     */
    initializeDOMElements() {
        const elementIds = [
            'commentForm',
            'submitBtn', 
            'messageArea',
            'commentsList',
            'loadingComments',
            'noComments',
            'commentCount',
            'userName',
            'userEmail',
            'userComment',
            'userRating'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id] && ['commentForm', 'submitBtn', 'commentsList'].includes(id)) {
                console.warn(`⚠️ Critical element not found: ${id}`);
            }
        });

        this.elements.stars = document.querySelectorAll('.star');
        this.elements.starRating = document.querySelector('.star-rating');
        
        console.log(`✅ Found ${Object.keys(this.elements).length} DOM elements`);
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Star rating system
        this.setupStarRating();
        
        // Comment form submission
        this.setupCommentForm();
    }

    /**
     * Setup star rating functionality
     */
    setupStarRating() {
        if (!this.elements.stars || this.elements.stars.length === 0) {
            console.warn('⚠️ Star elements not found');
            return;
        }

        this.elements.stars.forEach(star => {
            star.addEventListener('click', (e) => {
                this.selectedRating = parseInt(e.target.dataset.rating);
                if (this.elements.userRating) {
                    this.elements.userRating.value = this.selectedRating;
                }
                this.updateStarDisplay(this.selectedRating);
            });

            star.addEventListener('mouseover', (e) => {
                const hoverRating = parseInt(e.target.dataset.rating);
                this.updateStarDisplay(hoverRating);
            });
        });

        if (this.elements.starRating) {
            this.elements.starRating.addEventListener('mouseleave', () => {
                this.updateStarDisplay(this.selectedRating);
            });
        }
    }

    /**
     * Update star display based on rating
     */
    updateStarDisplay(rating) {
        if (!this.elements.stars) return;
        
        this.elements.stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    /**
     * Setup comment form submission
     */
    setupCommentForm() {
        if (!this.elements.commentForm) {
            console.warn('⚠️ Comment form not found');
            return;
        }

        this.elements.commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCommentSubmission();
        });
    }

    /**
     * Handle comment form submission
     */
    async handleCommentSubmission() {
        const formData = this.getFormData();
        
        console.log('📝 Form data collected:', formData);
        
        // Client-side validation
        const validation = validateComment(formData);
        if (!validation.isValid) {
            console.error('❌ Validation failed:', validation.errors);
            this.showMessage(validation.errors[0], 'danger');
            return;
        }

        this.setLoading(true);

        try {
            // Sanitize and prepare comment data
            const sanitizedComment = sanitizeComment(formData);
            sanitizedComment.timestamp = serverTimestamp();

            console.log('💾 Submitting sanitized comment:', sanitizedComment);

            // Save to Firestore
            const docRef = await addDoc(collection(this.db, COLLECTIONS.COMMENTS), sanitizedComment);
            console.log('✅ Comment saved with ID:', docRef.id);

            this.showMessage('Comment submitted successfully! Thank you for your feedback.', 'success');
            this.resetForm();

            // Reload comments after short delay
            setTimeout(() => this.loadComments(), 1000);

        } catch (error) {
            console.error('❌ Error submitting comment:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            let errorMessage = 'Error submitting comment. Please try again.';
            
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your Firebase security rules.';
                console.error('💡 Firebase rule suggestion: allow read, write: if true;');
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            }
            
            this.showMessage(errorMessage, 'danger');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Get form data as object
     */
    getFormData() {
        return {
            name: this.elements.userName?.value?.trim() || '',
            email: this.elements.userEmail?.value?.trim() || '',
            comment: this.elements.userComment?.value?.trim() || '',
            rating: this.selectedRating
        };
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        if (this.elements.commentForm) {
            this.elements.commentForm.reset();
        }
        this.selectedRating = 0;
        this.updateStarDisplay(0);
        if (this.elements.userRating) {
            this.elements.userRating.value = '';
        }
    }

    /**
     * Load comments from Firestore
     */
    async loadComments() {
        console.log('🔄 Starting to load comments...');
        
        if (!this.elements.commentsList) {
            console.error('❌ Comments list element not found');
            return;
        }

        if (!this.db) {
            console.error('❌ Database not initialized');
            this.showMessage('Database connection error. Please refresh the page.', 'danger');
            return;
        }

        this.showLoadingState(true);

        try {
            console.log('📡 Querying Firestore for comments...');
            
            const q = query(
                collection(this.db, COLLECTIONS.COMMENTS), 
                orderBy('timestamp', 'desc'), 
                limit(20)
            );
            
            const querySnapshot = await getDocs(q);
            console.log(`✅ Query completed. Found ${querySnapshot.size} documents`);
            
            const comments = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                comments.push({ id: doc.id, ...data });
            });

            console.log('📝 Comments loaded:', comments.length);
            this.displayComments(comments);

        } catch (error) {
            console.error('❌ Error loading comments:', error);
            
            let errorMessage = 'Error loading comments. Please refresh the page.';
            
            switch (error.code) {
                case 'permission-denied':
                    errorMessage = 'Permission denied. Please check Firestore security rules.';
                    break;
                case 'unavailable':
                    errorMessage = 'Service temporarily unavailable. Please try again.';
                    break;
                case 'not-found':
                    errorMessage = 'Database not found. Please check Firebase configuration.';
                    break;
            }
            
            this.showMessage(errorMessage, 'danger');
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * Display comments in the UI
     */
    displayComments(comments) {
        if (!this.elements.commentsList) return;

        this.elements.commentsList.innerHTML = '';

        if (comments.length === 0) {
            this.showNoCommentsState();
            return;
        }

        // Update counter
        if (this.elements.commentCount) {
            this.elements.commentCount.textContent = comments.length.toString();
        }

        // Display each comment
        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            this.elements.commentsList.appendChild(commentElement);
        });

        // Hide no comments message
        if (this.elements.noComments) {
            this.elements.noComments.style.display = 'none';
        }
    }

    /**
     * Create HTML element for a comment
     */
    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'border-bottom pb-3 mb-3 comment-item';
        
        const date = this.formatDate(comment);
        const stars = this.generateStarRating(comment.rating || 0);
        const name = this.escapeHtml(comment.name || 'Anonymous');
        const commentText = this.escapeHtml(comment.comment || '');

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <h6 class="comment-author mb-1">
                        <i class="fas fa-user-circle me-2 text-secondary"></i>${name}
                    </h6>
                    <div class="rating-stars text-warning" title="Rating: ${comment.rating}/5">
                        ${stars}
                    </div>
                </div>
                <small class="comment-date text-muted">
                    <i class="fas fa-clock me-1"></i>${date}
                </small>
            </div>
            <p class="mb-0 text-dark comment-text">${commentText}</p>
        `;

        return div;
    }

    /**
     * Format comment date
     */
    formatDate(comment) {
        try {
            if (comment.timestamp && comment.timestamp.toDate) {
                return comment.timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (comment.createdAt) {
                return new Date(comment.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.warn('Error formatting date:', error);
        }
        return 'Unknown date';
    }

    /**
     * Generate star rating HTML
     */
    generateStarRating(rating) {
        const fullStars = Math.max(0, Math.min(5, Math.floor(rating)));
        const emptyStars = 5 - fullStars;
        
        return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
    }

    /**
     * Show loading state for comments
     */
    showLoadingState(isLoading) {
        if (this.elements.loadingComments) {
            this.elements.loadingComments.style.display = isLoading ? 'block' : 'none';
        }
    }

    /**
     * Show no comments state
     */
    showNoCommentsState() {
        if (this.elements.noComments) {
            this.elements.noComments.style.display = 'block';
        }
        if (this.elements.commentCount) {
            this.elements.commentCount.textContent = '0';
        }
    }

    /**
     * Show messages to user
     */
    showMessage(message, type) {
        if (!this.elements.messageArea) {
            console.warn('⚠️ Message area not found, showing alert instead');
            alert(message);
            return;
        }

        const iconMap = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };

        this.elements.messageArea.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${iconMap[type] || 'info-circle'} me-2"></i>
                ${this.escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            const alert = this.elements.messageArea.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }

    /**
     * Set loading state for submit button
     */
    setLoading(isLoading) {
        if (!this.elements.submitBtn) return;

        if (isLoading) {
            this.elements.submitBtn.disabled = true;
            this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
        } else {
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Comment';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Get app status for debugging
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasDatabase: !!this.db,
            selectedRating: this.selectedRating,
            elementsFound: Object.keys(this.elements).length
        };
    }
}

// Create and initialize the app
const commentsApp = new CommentsApp();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌐 DOM loaded, initializing comments app...');
    await commentsApp.init();
});

// Export for global access
window.CommentsApp = CommentsApp;
window.commentsApp = commentsApp;

export default commentsApp;