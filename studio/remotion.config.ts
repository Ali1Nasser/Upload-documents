import {Config} from '@remotion/cli/config';

// Remotion cannot download its own Chrome here (storage.googleapis.com is blocked); use the preinstalled headless shell.
const HEADLESS_SHELL = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

Config.setBrowserExecutable(HEADLESS_SHELL);
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
