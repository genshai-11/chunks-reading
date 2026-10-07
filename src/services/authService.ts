import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { auth } from '../firebase';

export interface AuthUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  role: 'teacher' | 'learner';
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInTeacherWithGoogle(): Promise<AuthUserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: false,
    role: 'teacher',
  };
}

export async function signInLearnerAnonymously(displayName: string): Promise<AuthUserProfile> {
  const result = await signInAnonymously(auth);
  const user = result.user;
  return {
    uid: user.uid,
    displayName: displayName || 'Learner',
    email: null,
    photoURL: null,
    isAnonymous: true,
    role: 'learner',
  };
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: AuthUserProfile | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    const profile: AuthUserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      isAnonymous: firebaseUser.isAnonymous,
      role: firebaseUser.isAnonymous ? 'learner' : 'teacher',
    };
    callback(profile);
  });
}
