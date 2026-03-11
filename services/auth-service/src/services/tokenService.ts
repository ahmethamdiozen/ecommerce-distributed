import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_dev";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_dev";
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

export interface TokenPayload {
    userId: number;
    email: string;
    role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
};

// Generate refresh token and store in DB, derive expiresAt from token itself
export const generateRefreshToken = async (payload: TokenPayload): Promise<string> => {
    const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

    // Decode to get the exp claim JWT set — single source of truth
    const decoded = jwt.decode(token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000); // JWT exp is in seconds

    await prisma.refreshToken.create({
        data: { token, userId: payload.userId, expiresAt }
    });

    return token;
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = async (token: string): Promise<TokenPayload> => {
    const payload = jwt.verify(token, REFRESH_SECRET) as TokenPayload;

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
        throw new Error("Refresh token invalid or expired");
    }

    return payload;
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
    await prisma.refreshToken.deleteMany({ where: { token } });
};