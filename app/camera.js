import { spawn } from "child_process";

export function getCameraStream() {
  return spawn("ffmpeg", [
    "-f", "v4l2",
    "-i", "/dev/video0",
    "-vf", "scale=640:480",
    "-qscale:v", "2",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-"
  ]).stdout;
}
