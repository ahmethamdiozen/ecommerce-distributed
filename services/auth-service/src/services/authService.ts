import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken
} from "./tokenService";

export const register = async (email: string, password: string) => {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email }});
    if (existing) {
        throw new Error("Email already in use");
    }

    // Hash password with bcrypt (salt rounds: 10)
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: { email, password: hashed}
    });

    const payload = { userId: user.id, email: user.email, role: user.role};
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role }};
};

export const login = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error("Invalid credentials");
    }

    // Compare plain password with hashed password in DB
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        throw new Error("Invalid credentials");
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
};

export const refresh = async (refreshToken: string) => {
    //Verify token and check DB - this allow us to revoke tokens
    const payload = await verifyRefreshToken(refreshToken)

    const accessToken = generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role
    });

    return { accessToken }
};

export const logout = async (refreshToken: string) => {
    //Remove refresh roken from DB, access token expires naturally
    await revokeRefreshToken(refreshToken);
};

