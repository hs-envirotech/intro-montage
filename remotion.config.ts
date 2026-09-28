import { Config } from "@remotion/cli/config";

// Serve /assets as Remotion's public folder so staticFile("logo/...") etc. resolve there.
Config.setPublicDir("./assets");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? null);
