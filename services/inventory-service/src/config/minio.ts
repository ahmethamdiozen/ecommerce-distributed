import { Client } from "minio";

const BUCKET = process.env.MINIO_BUCKET || "products";
const PUBLIC_URL = (process.env.MINIO_PUBLIC_URL || "http://localhost:9000").replace(/\/$/, "");

export const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || "minio",
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const PUBLIC_READ_POLICY = (bucket: string) => JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
    }],
});

export const initBucket = async (): Promise<void> => {
    const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
    if (!exists) {
        await minioClient.makeBucket(BUCKET, "us-east-1");
        console.log(`MinIO bucket created: ${BUCKET}`);
    }
    await minioClient.setBucketPolicy(BUCKET, PUBLIC_READ_POLICY(BUCKET));
    console.log(`MinIO bucket public-read policy applied: ${BUCKET}`);
};

export const uploadImage = async (
    buffer: Buffer,
    mimeType: string,
    extension: string,
): Promise<string> => {
    const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
        "Content-Type": mimeType,
    });
    return `${PUBLIC_URL}/${BUCKET}/${objectName}`;
};

export const deleteImageByUrl = async (url: string): Promise<void> => {
    if (!url) return;
    const prefix = `${PUBLIC_URL}/${BUCKET}/`;
    if (!url.startsWith(prefix)) return;
    const objectName = url.slice(prefix.length);
    await minioClient.removeObject(BUCKET, objectName).catch(() => {});
};
