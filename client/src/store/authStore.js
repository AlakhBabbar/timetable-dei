import { create } from "zustand";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  loading: true,
  error: null,
  
  initializeAuth: () => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            set({ user, role: docSnap.data().role || "admin", loading: false });
          } else {
            // Default to admin for existing users
            set({ user, role: "admin", loading: false });
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          set({ user, role: "admin", loading: false });
        }
      } else {
        set({ user: null, role: null, loading: false });
      }
    });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      let role = "admin";
      if (docSnap.exists()) {
        role = docSnap.data().role || "admin";
      }
      
      set({ user, role, loading: false });
      return user;
    } catch (error) {
      let errorMessage = "Failed to log in.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password.";
      }
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  signUpTeacher: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, {
        email,
        role: "teacher",
        createdAt: new Date().toISOString()
      });
      
      set({ user, role: "teacher", loading: false });
      return user;
    } catch (error) {
      let errorMessage = "Failed to sign up.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email format.";
      }
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await signOut(auth);
      set({ user: null, role: null, loading: false });
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
