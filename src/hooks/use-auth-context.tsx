
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
import { auth, saveOrUpdateUserProfile } from '@/lib/data';
import { LoadingScreen } from '@/components/LoadingScreen';

interface AuthContextType {
    user: User | null;
    roles: string[];
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<any>;
    signupWithEmail: (email: string, pass: string) => Promise<any>;
    sendPasswordReset: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = React.useState<User | null>(null);
    const [roles, setRoles] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                setUser(currentUser);
                await saveOrUpdateUserProfile(currentUser);
                // Force refresh the token to get the latest custom claims.
                const idTokenResult = await currentUser.getIdTokenResult(true);
                const userRoles = ['user'];
                if (idTokenResult.claims.admin) {
                    userRoles.push('admin');
                }
                setRoles(userRoles);
            } else {
                setUser(null);
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
        roles,
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
