import { createContext, useContext, ReactNode } from 'react';

interface SimpleParkingContextType {
  userRole: string | null;
}

const SimpleParkingContext = createContext<SimpleParkingContextType | null>(null);

interface SimpleParkingProviderProps {
  children: ReactNode;
  userRole?: string;
}

export function SimpleParkingProvider({ children, userRole = null }: SimpleParkingProviderProps) {
  const contextValue: SimpleParkingContextType = {
    userRole
  };

  return (
    <SimpleParkingContext.Provider value={contextValue}>
      {children}
    </SimpleParkingContext.Provider>
  );
}

export function useSimpleParkingContext() {
  const context = useContext(SimpleParkingContext);
  if (!context) {
    throw new Error('useSimpleParkingContext must be used within a SimpleParkingProvider');
  }
  return context;
}