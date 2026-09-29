import { Config } from "@remotion/cli/config";

// Serve /assets as Remotion's public folder so staticFile("logo/...") etc. resolve there.
Config.setPublicDir("./assets");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
// Software WebGL that works in headless/CI environments without a GPU.
Config.setChromiumOpenGlRenderer("swangle");
// Software 3D frames can be slow where two scenes overlap; allow each frame up to 4 minutes.
Config.setDelayRenderTimeoutInMilliseconds(240000);
Config.setConcurrency(3);
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? null);
