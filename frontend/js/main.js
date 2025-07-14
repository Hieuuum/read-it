// Initialize Supabase client
const supabaseUrl = window._env_?.SUPABASE_URL;
const supabaseKey = window._env_?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    throw new Error('Missing Supabase configuration');
}

export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        redirectTo: window.location.origin
    }
});

// --- Re-structured and more robust functions ---

/**
 * Checks if a user session exists. Redirects to the login page if not.
 * @returns {Promise<object|null>} The session object or null if not authenticated.
 */
export async function checkAndRedirect() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        if (!session) {
            // If we are not on the index page, redirect there.
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }
            return null;
        }
        
        // If we have a session and we're on the index page, redirect to dashboard
        if (session && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
            window.location.href = 'dashboard.html';
        }
        
        return session;
    } catch (error) {
        console.error('Error checking session:', error);
        showError('An error occurred while checking your session. Please try again.');
        return null;
    }
}

/**
 * Handles user logout.
 */
export async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Failed to log out. Please try again.');
    }
}

/**
 * Displays an error message to the user for a short duration.
 * @param {string} message The error message to display.
 * @param {string} elementId The ID of the HTML element to show the message in.
 */
export function showError(message, elementId = 'errorMessage') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Updates the loading state of the submit button
 * @param {boolean} isLoading Whether the form is being submitted
 * @param {string} buttonText The text to display when not loading
 */
function updateLoadingState(isLoading, buttonText) {
    const submitButton = document.querySelector('button[type="submit"]');
    const buttonTextElement = document.getElementById('submitButtonText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (submitButton && buttonTextElement && loadingSpinner) {
        submitButton.disabled = isLoading;
        buttonTextElement.textContent = buttonText;
        if (isLoading) {
            loadingSpinner.classList.remove('hidden');
            buttonTextElement.classList.add('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
            buttonTextElement.classList.remove('hidden');
        }
    }
}

/**
 * Sets up the authentication form on the index page.
 */
function initializeAuthForm() {
    const authForm = document.getElementById('authFormElement');
    if (!authForm) return; // Only run if the form exists

    const showLoginBtn = document.getElementById('showLoginBtn');
    const showSignupBtn = document.getElementById('showSignupBtn');
    let isLoginMode = true;

    // Initial state
    updateLoadingState(false, 'Login');
    showLoginBtn.classList.add('text-white');
    showSignupBtn.classList.remove('text-white');

    showLoginBtn.addEventListener('click', () => {
        isLoginMode = true;
        updateLoadingState(false, 'Login');
        showLoginBtn.classList.add('text-white');
        showLoginBtn.classList.remove('text-blue-500');
        showSignupBtn.classList.add('text-blue-500');
        showSignupBtn.classList.remove('text-white');
    });

    showSignupBtn.addEventListener('click', () => {
        isLoginMode = false;
        updateLoadingState(false, 'Sign Up');
        showSignupBtn.classList.add('text-white');
        showSignupBtn.classList.remove('text-blue-500');
        showLoginBtn.classList.add('text-blue-500');
        showLoginBtn.classList.remove('text-white');
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateLoadingState(true, isLoginMode ? 'Login' : 'Sign Up');

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            let result;
            if (isLoginMode) {
                result = await supabaseClient.auth.signInWithPassword({ email, password });
            } else {
                // Enhanced signup options
                result = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/dashboard.html`,
                        data: {
                            email: email
                        }
                    }
                });
                
                console.log('Signup result:', result); // Debug log
            }

            if (result.error) throw result.error;

            if (result.data.session) {
                window.location.href = 'dashboard.html';
            } else if (!isLoginMode && result.data.user) {
                showError('Please check your email to confirm your account. Check your spam folder if you don\'t see it.');
                updateLoadingState(false, 'Sign Up');
            } else {
                throw new Error('Unexpected response from server');
            }
        } catch (error) {
            console.error('Auth error:', error);
            showError(error.message || 'An error occurred during authentication');
            updateLoadingState(false, isLoginMode ? 'Login' : 'Sign Up');
        }
    });
}

/**
 * Handles the authentication callback from Supabase
 * @returns {Promise<void>}
 */
async function handleAuthCallback() {
    try {
        // Get the hash fragment from the URL
        const hashFragment = window.location.hash;
        if (!hashFragment) return;

        // Check if this is an auth callback
        if (hashFragment.includes('access_token') || hashFragment.includes('error')) {
            // Remove the hash fragment from the URL
            window.history.replaceState(null, '', window.location.pathname);
            
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            
            if (session) {
                // Successful authentication, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // If no session, redirect to login page
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Error handling auth callback:', error);
        showError('Authentication failed. Please try again.');
        window.location.href = 'index.html';
    }
}

/**
 * Main application entry point. Runs after the page is fully loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Handle auth callback first
    await handleAuthCallback();

    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

    if (isIndexPage) {
        const session = await checkAndRedirect();
        if (!session) {
            initializeAuthForm();
        }
    } else {
        // For all other pages, we must have a valid session.
        const session = await checkAndRedirect();
        
        // Only proceed if the session is valid.
        if (session) {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        }
    }
});
