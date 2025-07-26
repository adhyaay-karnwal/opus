import { execPromise, logWithElapsed } from "../utils/utils";

export interface KeyReturnType {
  type: "key";
  keyString: string;
}
export default async function key(
  body: string,
  appName: string
): Promise<KeyReturnType> {
  const keyString = body;
  if (process.platform === "darwin") {
    await execPromise(`swift swift/key.swift ${appName} "${keyString}"`);
  } else if (process.platform === "win32") {
    await execPromise(`powershell -ExecutionPolicy Bypass -File app/powershell/key.ps1 -appName "${appName}" -keyString "${keyString}"`);
  }
  logWithElapsed("performAction", `Executed key: ${keyString}`);
  return { type: "key", keyString };
}
