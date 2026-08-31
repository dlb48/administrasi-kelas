import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [studentSession, setStudentSession] = useState(null);
  const [appSettings, setAppSettings] = useState({ className: 'XII RPL 1', schoolName: 'Class Admin' });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (!error && data) {
        setAppSettings({
          className: data.class_name,
          schoolName: data.school_name
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

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

      // 3. Fetch app settings
      await fetchSettings();

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
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.remove({ key: 'rememberedUsername' });
      Preferences.remove({ key: 'rememberedPassword' });
    }).catch(() => {});
  };

  const value = {
    session,
    user,
    studentSession,
    appSettings,
    fetchSettings,
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
