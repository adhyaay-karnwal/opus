import { run } from "@openai/agents";
import { appSelectionAgent } from "../ai/initAgents";
import { logWithElapsed } from "./utils";

export async function getAppName(userPrompt: string) {
  logWithElapsed(
    "getAppName",
    `Start getAppName with userPrompt: ${userPrompt}`
  );
  const appNameResult = await run(appSelectionAgent, [
    { role: "user", content: userPrompt },
  ]);
  logWithElapsed(
    "getAppName",
    `Result: ${
      appNameResult.state._currentStep &&
      "output" in appNameResult.state._currentStep
        ? appNameResult.state._currentStep.output.trim()
        : undefined
    }`
  );
  return appNameResult.state._currentStep &&
    "output" in appNameResult.state._currentStep
    ? appNameResult.state._currentStep.output.trim()
    : undefined;
}

