export type User = {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar: string | null;
};

export type AuthResponse = {
  authenticated: boolean;
  user?: User;
};