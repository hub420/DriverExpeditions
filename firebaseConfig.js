// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// IMPORTANTE: Completa tu configuración de Firebase aquí
export const firebaseConfig = {
  apiKey: "AIzaSyBX-WrPiSogL44m-_uvq7Jkh0rHixeih4M",
  authDomain: "puravidaxpeditions-3dda4.firebaseapp.com",
  projectId: "puravidaxpeditions-3dda4",
  storageBucket: "puravidaxpeditions-3dda4.firebasestorage.app",
  messagingSenderId: "888307766614",
  appId: "1:888307766614:web:d87527eded8b877af8f2f7",
  measurementId: "G-HN6LDT0CEQ"
};

// Variables globales
let app = null;
let db = null;
let isInitialized = false;

/**
 * Validate Firebase configuration
 * @returns {boolean} True if configuration is valid
 */
export function validateFirebaseConfig() {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    
    for (const field of requiredFields) {
        if (!firebaseConfig[field] || firebaseConfig[field].trim() === '' || firebaseConfig[field].includes('tu-')) {
            console.error(`❌ Firebase config field '${field}' is missing or not configured`);
            return false;
        }
    }
    
    console.log('✅ Firebase configuration is valid');
    return true;
}

/**
 * Initialize Firebase application
 * @returns {Promise<void>}
 */
export async function initializeFirebase() {
    if (isInitialized) {
        console.log('✅ Firebase already initialized');
        return;
    }

    try {
        console.log('🔥 Initializing Firebase...');
        
        if (!validateFirebaseConfig()) {
            throw new Error('Invalid Firebase configuration. Please check your firebaseConfig.js file.');
        }

        // Initialize Firebase app
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
        
        // Initialize Firestore
        db = getFirestore(app);
        console.log('✅ Firestore initialized');
        
        // Test the connection
        await testConnection();
        
        isInitialized = true;
        console.log('🎉 Firebase fully initialized and ready!');
        
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
        throw error;
    }
}

/**
 * Get Firestore database instance
 * @returns {Object} Firestore database instance
 */
export function getDatabase() {
    if (!db) {
        console.error('❌ Database not initialized. Call initializeFirebase() first.');
        throw new Error('Database not initialized. Call initializeFirebase() first.');
    }
    return db;
}

/**
 * Get Firebase app instance
 * @returns {Object} Firebase app instance
 */
export function getApp() {
    return app;
}

/**
 * Test Firestore connection
 * @returns {Promise<void>}
 */
async function testConnection() {
    try {
        // Import enableNetwork for connection test
        const { enableNetwork } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js');
        await enableNetwork(db);
        console.log('✅ Firestore connection test successful');
    } catch (error) {
        console.warn('⚠️ Firestore connection test failed, but this might be normal:', error.message);
        // Don't throw - connection might still work for actual operations
    }
}

// Auto-detect development environment
const isDevelopment = location.hostname === '127.0.0.1' || 
                      location.hostname === 'localhost' || 
                      location.port === '5500';

if (isDevelopment) {
    console.log('🔧 Development mode detected');
    // You can add development-specific settings here
}

// Collections constants
export const COLLECTIONS = {
    COMMENTS: 'comments',
    USERS: 'users'
};

// Export initialized instances (will be null until initializeFirebase() is called)
export { app, db };

console.log('📦 Firebase configuration module loaded');