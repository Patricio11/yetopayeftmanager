import "better-auth";

declare module "better-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
      role?: string;
    };
  }
}
