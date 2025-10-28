"use server";

import { Sandbox } from "@e2b/desktop";
import { resolution } from "./tool";

const E2B_API_KEY = "e2b_029238f3d139314054fe3207a24f52f60311a4e0";

export const getDesktop = async (id?: string) => {
  try {
    if (id) {
      const connected = await Sandbox.connect(id, { apiKey: E2B_API_KEY });
      const isRunning = await connected.isRunning();
      if (isRunning) {
        // await connected.stream.start();
        return connected;
      }
    }

    const desktop = await Sandbox.create({
      resolution: [resolution.x, resolution.y], // Custom resolution
      timeoutMs: 3600000, // 1 godzina timeout (60 minut)
      apiKey: E2B_API_KEY,
    });
    await desktop.stream.start();
    return desktop;
  } catch (error) {
    console.error("Error in getDesktop:", error);
    throw error;
  }
};

export const getDesktopURL = async (id?: string) => {
  try {
    const desktop = await getDesktop(id);
    const streamUrl = desktop.stream.getUrl();

    return { streamUrl, id: desktop.sandboxId };
  } catch (error) {
    console.error("Error in getDesktopURL:", error);
    throw error;
  }
};

export const killDesktop = async (id: string = "desktop") => {
  const desktop = await getDesktop(id);
  await desktop.kill();
};
