    const firebaseConfig = {
        apiKey: "AIzaSyBD3OmV59vJXzEP_il3WYOQnnFPGvlFIbI",
        authDomain: "fernandodb-65186.firebaseapp.com",
        projectId: "fernandodb-65186",
        storageBucket: "fernandodb-65186.appspot.com",
        messagingSenderId: "849534271253",
        appId: "1:849534271253:web:d436b46feab2070f6cb31c",
        measurementId: "G-VB1FG2EHR3"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Set persistence to LOCAL
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((error) => {
            console.error("Error setting persistence:", error);
        });

    // DOM elements
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('google-login');
    const facebookLoginBtn = document.getElementById('facebook-login');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const sessionMessage = document.getElementById('session-message');
    const forgotPasswordLink = document.getElementById('forgot-password');

    // Message display functions
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        sessionMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        sessionMessage.style.display = 'none';
    }

    function showSessionMessage(message) {
        sessionMessage.textContent = message;
        sessionMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    function handleAuthError(error) {
        console.error("Auth error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        const errorMap = {
            'auth/invalid-email': 'Invalid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'Email already in use.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/operation-not-allowed': 'This operation is not allowed.',
            'auth/account-exists-with-different-credential': 
                'An account already exists with the same email but different sign-in credentials.',
            'auth/popup-closed-by-user': 'Login popup was closed - please try again.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
        };

        const errorMessage = errorMap[error.code] || 
                           `An error occurred: ${error.message || 'Please try again.'}`;
        
        showError(errorMessage);
    }

    // Check user role and redirect accordingly
    async function redirectBasedOnRole(user) {
        try {
            // Get user document from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Determine redirect URL based on role
                let redirectUrl = 'user-dashboard.html'; // Default
                
                if (userData.role === 'admin') {
                    redirectUrl = 'admin-dashboard.html';
                } else if (userData.role === 'rider') {
                    redirectUrl = 'rider-dashboard.html';
                }
                
                showSuccess('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
            } else {
                showError('User data not found. Please contact support.');
                await auth.signOut();
            }
        } catch (error) {
            console.error("Error checking user role:", error);
            showError('Error verifying your account. Please try again.');
            await auth.signOut();
        }
    }

    // Form submission handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember').checked;
        
        if (!email || !password) {
            showError('Please fill in all required fields.');
            return;
        }
        
        try {
            // Set persistence based on "Remember me" selection
            const persistence = rememberMe ? 
                firebase.auth.Auth.Persistence.LOCAL : 
                firebase.auth.Auth.Persistence.SESSION;
            
            await auth.setPersistence(persistence);
            
            // Sign in with email and password
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            // Redirect based on user role
            await redirectBasedOnRole(userCredential.user);
        } catch (error) {
            handleAuthError(error);
        }
    });

    // Social login handlers
    async function handleSocialLogin(provider) {
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const result = await auth.signInWithPopup(provider);
            
            // Check if user exists in Firestore
            const userDoc = await db.collection('users').doc(result.user.uid).get();
            
            if (!userDoc.exists) {
                // Create basic user document for social login users
                await db.collection('users').doc(result.user.uid).set({
                    email: result.user.email,
                    role: 'user', // Default role
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Redirect based on role
            await redirectBasedOnRole(result.user);
        } catch (error) {
            handleAuthError(error);
        }
    }

    googleLoginBtn.addEventListener('click', () => handleSocialLogin(new firebase.auth.GoogleAuthProvider()));
    facebookLoginBtn.addEventListener('click', () => handleSocialLogin(new firebase.auth.FacebookAuthProvider()));

    // Forgot password handler
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        
        if (!email) {
            showError('Please enter your email address first.');
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            showSuccess('Password reset email sent. Please check your inbox.');
        } catch (error) {
            handleAuthError(error);
        }
    });

    // Check auth state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in - check if we're already on a dashboard page
            const currentPage = window.location.pathname.split('/').pop();
            const dashboardPages = ['user-dashboard.html', 'admin-dashboard.html', 'rider-dashboard.html'];
            
            if (!dashboardPages.includes(currentPage)) {
                // Redirect based on role if not already on a dashboard
                await redirectBasedOnRole(user);
            }
        }
    });