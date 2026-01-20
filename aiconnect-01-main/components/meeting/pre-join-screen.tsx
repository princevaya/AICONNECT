"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, VideoOff, Mic, MicOff, Settings } from "lucide-react";

interface PreJoinScreenProps {
  onJoin: (
    name: string,
    roomName?: string,
    videoEnabled?: boolean,
    audioEnabled?: boolean,
    videoDeviceId?: string,
    audioDeviceId?: string
  ) => void;
  meetingCode?: string;
}

export default function PreJoinScreen({
  onJoin,
  meetingCode,
}: PreJoinScreenProps) {
  const [participantName, setParticipantName] = useState("User"); // Default, will be overridden by auth
  const [roomName, setRoomName] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRoomName = params.get("room");
      return urlRoomName || meetingCode || "";
    }
    return meetingCode || "";
  });
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
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
  const [showSettings, setShowSettings] = useState(false);

  const enumerateDevices = async () => {
    try {
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
    } catch (error) {
      console.error("Error enumerating devices:", error);
    }
  };

  useEffect(() => {
    // Just enumerate devices without requesting permissions
    (async () => {
      await enumerateDevices();
    })();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const requestVideoAccess = async () => {
    try {
      if (stream) {
        stream.getVideoTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: false,
      };

      // If audio is already enabled, include it in the stream
      if (isAudioEnabled && stream?.getAudioTracks().length) {
        constraints.audio = selectedMicrophone
          ? { deviceId: { exact: selectedMicrophone } }
          : true;
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Merge audio track if it exists
      if (isAudioEnabled && stream?.getAudioTracks().length) {
        const audioTrack = stream.getAudioTracks()[0];
        newStream.addTrack(audioTrack);
      }

      setStream(newStream);
      setIsVideoEnabled(true);

      // Re-enumerate to get device labels
      await enumerateDevices();
    } catch (error: unknown) {
      console.error("Error accessing camera:", error);
      const err = error as { name?: string };
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        alert(
          "Camera access denied. Please allow camera access to enable video."
        );
      } else {
        alert("Failed to access camera. Please check your device.");
      }
      setIsVideoEnabled(false);
    }
  };

  const requestAudioAccess = async () => {
    try {
      if (stream) {
        stream.getAudioTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: selectedMicrophone
          ? { deviceId: { exact: selectedMicrophone } }
          : true,
        video: false,
      };

      // If video is already enabled, include it in the stream
      if (isVideoEnabled && stream?.getVideoTracks().length) {
        constraints.video = selectedCamera
          ? { deviceId: { exact: selectedCamera } }
          : true;
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Merge video track if it exists
      if (isVideoEnabled && stream?.getVideoTracks().length) {
        const videoTrack = stream.getVideoTracks()[0];
        newStream.addTrack(videoTrack);
      }

      setStream(newStream);
      setIsAudioEnabled(true);

      // Re-enumerate to get device labels
      await enumerateDevices();
    } catch (error: unknown) {
      console.error("Error accessing microphone:", error);
      const err = error as { name?: string };
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        alert(
          "Microphone access denied. Please allow microphone access to enable audio."
        );
      } else {
        alert("Failed to access microphone. Please check your device.");
      }
      setIsAudioEnabled(false);
    }
  };

  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      await requestVideoAccess();
    } else {
      if (stream) {
        stream.getVideoTracks().forEach((track) => {
          track.stop();
        });
        // Remove video tracks from stream
        const newStream = new MediaStream();
        stream.getAudioTracks().forEach((track) => newStream.addTrack(track));
        setStream(newStream.getAudioTracks().length > 0 ? newStream : null);
      }
      setIsVideoEnabled(false);
    }
  };

  const toggleAudio = async () => {
    if (!isAudioEnabled) {
      await requestAudioAccess();
    } else {
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.stop();
        });
        // Remove audio tracks from stream
        const newStream = new MediaStream();
        stream.getVideoTracks().forEach((track) => newStream.addTrack(track));
        setStream(newStream.getVideoTracks().length > 0 ? newStream : null);
      }
      setIsAudioEnabled(false);
    }
  };

  const changeCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (isVideoEnabled && stream) {
      try {
        stream.getVideoTracks().forEach((track) => track.stop());

        const constraints: MediaStreamConstraints = {
          video: { deviceId: { exact: deviceId } },
          audio: false,
        };

        if (isAudioEnabled) {
          constraints.audio = selectedMicrophone
            ? { deviceId: { exact: selectedMicrophone } }
            : true;
        }

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        if (isAudioEnabled && stream.getAudioTracks().length) {
          const audioTrack = stream.getAudioTracks()[0];
          newStream.addTrack(audioTrack);
        }

        setStream(newStream);
      } catch (error) {
        console.error("Error changing camera:", error);
      }
    }
  };

  const changeMicrophone = async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    if (isAudioEnabled && stream) {
      try {
        stream.getAudioTracks().forEach((track) => track.stop());

        const constraints: MediaStreamConstraints = {
          audio: { deviceId: { exact: deviceId } },
          video: false,
        };

        if (isVideoEnabled) {
          constraints.video = selectedCamera
            ? { deviceId: { exact: selectedCamera } }
            : true;
        }

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        if (isVideoEnabled && stream.getVideoTracks().length) {
          const videoTrack = stream.getVideoTracks()[0];
          newStream.addTrack(videoTrack);
        }

        setStream(newStream);
      } catch (error) {
        console.error("Error changing microphone:", error);
      }
    }
  };

  const handleJoinMeeting = () => {
    if (!roomName.trim()) {
      alert("Please enter room code");
      return;
    }

    // Stop local stream before joining
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    onJoin(
      participantName,
      roomName,
      isVideoEnabled,
      isAudioEnabled,
      selectedCamera || undefined,
      selectedMicrophone || undefined
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Ready to join?</h1>
          <p className="text-muted-foreground">
            Set up your camera and microphone before joining
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {isVideoEnabled && stream?.getVideoTracks().length ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {isVideoEnabled
                            ? "Loading camera..."
                            : "Camera is off"}
                        </p>
                        {!isVideoEnabled && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click the camera button below to turn it on
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    size="lg"
                    variant={isVideoEnabled ? "default" : "outline"}
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
                    variant={isAudioEnabled ? "default" : "outline"}
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
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-6 w-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings & Info */}
          <div className="space-y-6">
            {/* Participant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Join Meeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room">Room Code</Label>
                  <Input
                    id="room"
                    placeholder="Enter room code"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    disabled={!!meetingCode}
                    className={meetingCode ? "bg-muted" : ""}
                  />
                  {meetingCode && (
                    <p className="text-xs text-muted-foreground">
                      Joining meeting:{" "}
                      <span className="font-mono font-semibold">
                        {meetingCode}
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Device Selection */}
            {showSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Camera</Label>
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
                    <Label>Microphone</Label>
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
              disabled={!participantName.trim() || !roomName.trim()}
              onClick={handleJoinMeeting}
            >
              Join Meeting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
