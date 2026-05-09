import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export async function signUp(email: string, password: string, name: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: name });
  
  return {
    id: userCredential.user.uid,
    email: userCredential.user.email,
    name: userCredential.user.displayName,
    image: userCredential.user.photoURL,
  };
}

export async function signIn(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  return {
    id: userCredential.user.uid,
    email: userCredential.user.email,
    name: userCredential.user.displayName,
    image: userCredential.user.photoURL,
  };
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  
  return {
    id: userCredential.user.uid,
    email: userCredential.user.email,
    name: userCredential.user.displayName,
    image: userCredential.user.photoURL,
  };
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      callback({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        image: firebaseUser.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

export function getCurrentUser(): User | null {
  const user = auth.currentUser;
  if (!user) return null;
  
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName,
    image: user.photoURL,
  };
}
