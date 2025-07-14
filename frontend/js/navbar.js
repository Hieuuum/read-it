// Import the checkSession function from main.js
import { checkAndRedirect } from './main.js';

class NavigationBar {
    constructor() {
        // Get navigation elements
        this.navContainer = document.getElementById('navLinks');
        this.authLinks = document.getElementById('authLinks');
        
        // Initialize the navigation bar
        this.init();
    }

    /**
     * Creates a navigation link element
     * @param {string} href - The link URL
     * @param {string} text - The link text
     * @param {string} classes - CSS classes to apply
     * @returns {HTMLElement} The created link element
     */
    createNavLink(href, text, classes = 'text-gray-300 hover:text-white px-3 py-2 rounded-md') {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = text;
        link.className = classes;
        return link;
    }

    /**
     * Creates a button element
     * @param {string} text - The button text
     * @param {string} id - The button ID
     * @param {string} classes - CSS classes to apply
     * @returns {HTMLElement} The created button element
     */
    createButton(text, id, classes = 'text-gray-300 hover:text-white px-3 py-2 rounded-md') {
        const button = document.createElement('button');
        button.textContent = text;
        button.id = id;
        button.className = classes;
        return button;
    }

    /**
     * Renders the authenticated navigation items
     */
    renderAuthenticatedNav() {
        if (!this.authLinks) return;
        
        this.authLinks.innerHTML = '';
        
        // Add Profile link
        const profileLink = this.createNavLink('/profile.html', 'Profile');
        this.authLinks.appendChild(profileLink);
        
        // Add Library link
        const libraryLink = this.createNavLink('/library.html', 'My Library');
        this.authLinks.appendChild(libraryLink);
        
        // Add Logout button
        const logoutBtn = this.createButton('Logout', 'logoutBtn');
        this.authLinks.appendChild(logoutBtn);
        
        // Add event listener for logout
        logoutBtn.addEventListener('click', async () => {
            const { supabaseClient } = await import('./main.js');
            await supabaseClient.auth.signOut();
            window.location.href = '/index.html';
        });
    }

    /**
     * Renders the unauthenticated navigation items
     */
    renderUnauthenticatedNav() {
        if (!this.authLinks) return;
        
        this.authLinks.innerHTML = '';
        
        // Add Login link
        const loginLink = this.createNavLink('/index.html', 'Login');
        this.authLinks.appendChild(loginLink);
        
        // Add Sign Up link
        const signupLink = this.createNavLink('/index.html', 'Sign Up', 'text-blue-500 hover:text-blue-400 px-3 py-2 rounded-md');
        this.authLinks.appendChild(signupLink);
    }

    /**
     * Updates the navigation bar based on authentication status
     */
    async updateNavigation() {
        try {
            const session = await checkAndRedirect();
            
            if (session) {
                this.renderAuthenticatedNav();
            } else {
                this.renderUnauthenticatedNav();
            }
        } catch (error) {
            console.error('Error updating navigation:', error);
            // Default to unauthenticated view on error
            this.renderUnauthenticatedNav();
        }
    }

    /**
     * Initializes the navigation bar
     */
    async init() {
        // Initial render
        await this.updateNavigation();
        
        // Update navigation when the auth state changes
        const { supabaseClient } = await import('./main.js');
        supabaseClient.auth.onAuthStateChange(async () => {
            await this.updateNavigation();
        });
    }
}

// Initialize the navigation bar when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NavigationBar();
}); 