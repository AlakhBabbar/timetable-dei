import { create } from "zustand";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  
  initializeAuth: () => {
    return onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      set({ user: userCredential.user, loading: false });
      return userCredential.user;
    } catch (error) {
      let errorMessage = "Failed to log in.";
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await signOut(auth);
      set({ user: null, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email);
      set({ loading: false });
    } catch (error) {
      let errorMessage = "Failed to send password reset email.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "You're not allowed. User email is not in the auth list.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email format.";
      }
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },
}));
