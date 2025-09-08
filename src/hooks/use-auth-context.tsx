

'use client';

import * as React from 'react';
import { 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut,
    type User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, getProfile, type UserProfile } from '@/lib/data';
import { LoadingScreen } from '@/components/LoadingScreen';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    roles: string[];
    loading: boolean;
    isAdmin: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<any>;
    signupWithEmail: (email: string, pass: string) => Promise<any>;
    sendPasswordReset: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = React.useState<User | null>(null);
    const [profile, setProfile] = React.useState<UserProfile | null>(null);
    const [roles, setRoles] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                // getProfile will now create the profile if it doesn't exist.
                const userProfile = await getProfile(currentUser);
                setUser(currentUser);
                setProfile(userProfile);

                if (userProfile) {
                    const userRoles: string[] = [];
                    if (userProfile.role) {
                        userRoles.push(userProfile.role);
                    }
                    
                    // Special override for development admin
                    if (currentUser.email === 'holthofer@gmail.com' && !userRoles.includes('admin')) {
                        userRoles.push('admin');
                    }
                    setRoles(userRoles);
                } else {
                    setRoles([]);
                }
            } else {
                setUser(null);
                setProfile(null);
                setRoles([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const loginWithEmail = (email: string, pass: string) => {
        return signInWithEmailAndPassword(auth, email, pass);
    }
    
    const signupWithEmail = (email: string, pass: string) => {
        return createUserWithEmailAndPassword(auth, email, pass);
    }

    const sendPasswordReset = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    }

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        profile,
        roles,
        isAdmin: roles.includes('admin'),
        loading, 
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        sendPasswordReset,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingScreen /> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
