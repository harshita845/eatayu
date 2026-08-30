import { resolveMediaUrl } from "./Frontend/src/shared/utils/mediaUrl.js";
global.window = {
  location: {
    protocol: "http:",
    hostname: "localhost",
    port: "5173",
    origin: "http://localhost:5173"
  }
};
console.log(resolveMediaUrl("http://localhost:5174/uploads/EatAyu/admin/addons/1787183762169-e6fa0d45a0af7c6e.webp"));
