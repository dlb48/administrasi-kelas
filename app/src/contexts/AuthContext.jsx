import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [studentSession, setStudentSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      // 1. Get Supabase Admin Session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      // 2. Get Student Custom Session from LocalStorage
      const storedStudent = localStorage.getItem('studentSession');
      if (storedStudent) {
        try {
          setStudentSession(JSON.parse(storedStudent));
        } catch (e) {
          console.error("Invalid student session", e);
        }
      }

      setLoading(false);
    };
    
    getSession();

    // Listen for Supabase admin auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginStudent = (studentData) => {
    localStorage.setItem('studentSession', JSON.stringify(studentData));
    setStudentSession(studentData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('studentSession');
    setStudentSession(null);
  };

  const value = {
    session,
    user,
    studentSession,
    loginStudent,
    logout,
    loading,
    userType: session ? 'admin' : (studentSession ? 'student' : null)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
