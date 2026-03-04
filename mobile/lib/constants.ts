// Next.js API base URL
// 开发时：http://localhost:3000（需要真机用局域网 IP，如 http://192.168.x.x:3000）
// 生产时：https://your-app.vercel.app 或 GCP URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
