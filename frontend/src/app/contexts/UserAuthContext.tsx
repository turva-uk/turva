import { createContext, useMemo, useState } from 'react';
import type { PropsWithChildren, JSX } from 'react';
import type User from '../../types/User';

export interface UserAuthInterface {
  user?: User;
  updateUser: (user: User | undefined) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const UserAuthContext = createContext<UserAuthInterface>({
  updateUser: () => ({}),
});

export const UserAuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [user, setContextUser] = useState<User | undefined>();

  if (!user) {
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) {
      // TODO: ensure the user data is valid against a schema
      setContextUser(JSON.parse(userFromStorage));
    }
  }

  const updateUser = (newUser: User | undefined) => {
    setContextUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <UserAuthContext.Provider value={useMemo(() => ({ user, updateUser }), [user])}>
      {children}
    </UserAuthContext.Provider>
  );
};

export const MockUserAuthProvider = ({ children }: PropsWithChildren) => (
  <UserAuthContext.Provider value={
    useMemo(() => ({user: {
      id: '1',
      firstName: 'Test',
      lastName: 'User',
      emailAddress: 'test.user@example.com',
    }, updateUser: () => ({}) }), [])
  }>
    {children}
  </UserAuthContext.Provider>
);

export const MockAdminAuthProvider = ({ children }: PropsWithChildren) => (
  <UserAuthContext.Provider value={
    useMemo(() => ({ user: {
      id: '1',
      username: 'test',
      firstName: 'Test',
      lastName: 'User',
      emailAddress: 'test.user@example.com',
    }, updateUser: () => ({}) }), [])
  }>
    {children}
  </UserAuthContext.Provider>
);
