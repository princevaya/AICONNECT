"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeviceStatus = "checking" | "granted" | "denied" | "error";

interface MediaDevices {
  camera: DeviceStatus;
  microphone: DeviceStatus;
}

export default function MeetingPage() {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [mediaDevices, setMediaDevices] = useState<MediaDevices>({
    camera: "checking",
    microphone: "checking",
  });
  const [isReady, setIsReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [availableMicrophones, setAvailableMicrophones] = useState<
    MediaDeviceInfo[]
  >([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");

  const checkPermissionsAndDevices = async () => {
    try {
      // Request permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setMediaDevices({
        camera: "granted",
        microphone: "granted",
      });

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      const microphones = devices.filter(
        (device) => device.kind === "audioinput"
      );

      setAvailableCameras(cameras);
      setAvailableMicrophones(microphones);

      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length > 0)
        setSelectedMicrophone(microphones[0].deviceId);

      setIsReady(true);
    } catch (error: any) {
      console.error("Error accessing media devices:", error);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setMediaDevices({
          camera: "denied",
          microphone: "denied",
        });
      } else {
        setMediaDevices({
          camera: "error",
          microphone: "error",
        });
      }
    }
  };
  useEffect(() => {
    (async () => {
      await checkPermissionsAndDevices();
    })();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const changeCamera = async (deviceId: string) => {
    try {
      if (stream) {
        stream.getVideoTracks().forEach((track) => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: {
          deviceId: selectedMicrophone
            ? { exact: selectedMicrophone }
            : undefined,
        },
      });

      setStream(newStream);
      setSelectedCamera(deviceId);
    } catch (error) {
      console.error("Error changing camera:", error);
    }
  };

  const changeMicrophone = async (deviceId: string) => {
    try {
      if (stream) {
        stream.getAudioTracks().forEach((track) => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
        },
        audio: { deviceId: { exact: deviceId } },
      });

      setStream(newStream);
      setSelectedMicrophone(deviceId);
    } catch (error) {
      console.error("Error changing microphone:", error);
    }
  };

  const joinMeeting = () => {
    // This will be replaced with actual LiveKit room join logic
    console.log("Joining meeting...");
    alert("Meeting join functionality will be implemented with LiveKit");
  };

  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "granted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "denied":
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: DeviceStatus) => {
    switch (status) {
      case "checking":
        return "Checking...";
      case "granted":
        return "Ready";
      case "denied":
        return "Permission denied";
      case "error":
        return "Error";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Ready to join?</h1>
          <p className="text-muted-foreground">
            Check your camera and microphone before joining
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {isVideoEnabled ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Camera is off</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    size="lg"
                    variant={isVideoEnabled ? "default" : "destructive"}
                    onClick={toggleVideo}
                    className="rounded-full h-14 w-14 p-0"
                  >
                    {isVideoEnabled ? (
                      <Video className="h-6 w-6" />
                    ) : (
                      <VideoOff className="h-6 w-6" />
                    )}
                  </Button>

                  <Button
                    size="lg"
                    variant={isAudioEnabled ? "default" : "destructive"}
                    onClick={toggleAudio}
                    className="rounded-full h-14 w-14 p-0"
                  >
                    {isAudioEnabled ? (
                      <Mic className="h-6 w-6" />
                    ) : (
                      <MicOff className="h-6 w-6" />
                    )}
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-14 w-14 p-0"
                  >
                    <Settings className="h-6 w-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Status & Settings */}
          <div className="space-y-6">
            {/* Device Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Device Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Camera</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(mediaDevices.camera)}
                    <span
                      className={cn(
                        "text-sm",
                        mediaDevices.camera === "granted" && "text-green-600",
                        mediaDevices.camera === "denied" && "text-red-600"
                      )}
                    >
                      {getStatusText(mediaDevices.camera)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Microphone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(mediaDevices.microphone)}
                    <span
                      className={cn(
                        "text-sm",
                        mediaDevices.microphone === "granted" &&
                          "text-green-600",
                        mediaDevices.microphone === "denied" && "text-red-600"
                      )}
                    >
                      {getStatusText(mediaDevices.microphone)}
                    </span>
                  </div>
                </div>

                {(mediaDevices.camera === "denied" ||
                  mediaDevices.microphone === "denied") && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    <p className="font-medium mb-1">Permission Required</p>
                    <p className="text-xs">
                      Please allow camera and microphone access in your browser
                      settings.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Selection */}
            {isReady && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Camera</label>
                    <select
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                      value={selectedCamera}
                      onChange={(e) => changeCamera(e.target.value)}
                    >
                      {availableCameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label ||
                            `Camera ${camera.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Microphone</label>
                    <select
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                      value={selectedMicrophone}
                      onChange={(e) => changeMicrophone(e.target.value)}
                    >
                      {availableMicrophones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label ||
                            `Microphone ${mic.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Join Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={
                !isReady ||
                mediaDevices.camera === "denied" ||
                mediaDevices.microphone === "denied"
              }
              onClick={joinMeeting}
            >
              Join Meeting
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
