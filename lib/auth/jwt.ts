import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SECRET_KEY || "trizenai-studio-nextjs-secure-jwt-key-2026"
);

export interface SessionPayload {
  userId: number;
  username: string;
  email: string;
  role: "ADMIN" | "CO_ADMIN" | "TEAM_MEMBER";
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE";
  isAdmin: boolean;
  studioName?: string;
  studioLogo?: string;
  dashboardToken?: string;
  exp?: number;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
