import { Config } from "@remotion/cli/config";

// Serve /assets as Remotion's public folder so staticFile("logo/...") etc. resolve there.
Config.setPublicDir("./assets");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
// 3D renderer. "swangle" (software) works anywhere, including servers without a GPU.
// On your own computer, `npm run render:gpu` (or REMOTION_GL=angle) uses the GPU and is much faster.
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as "angle" | "swangle" | undefined) ?? "swangle");
// Software 3D frames can be slow where two scenes overlap; allow each frame up to 4 minutes.
Config.setDelayRenderTimeoutInMilliseconds(240000);
Config.setConcurrency(3);
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? null);
