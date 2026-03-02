"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MeetingRoom from "@/components/meeting/meeting-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  User,
  Check,
  Loader2,
  Copy,
  XCircle
} from "lucide-react";

export default function MeetingPage() {

  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const meetingCode = params.code as string;

  const [pendingUsers, setPendingUsers] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [showInvitePopup, setShowInvitePopup] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  // create invite link
  useEffect(() => {

    if (!meetingCode || typeof window === "undefined") return;

    setInviteLink(
      `${window.location.origin}/meeting/join?room=${meetingCode}`
    );

  }, [meetingCode]);


  // polling pending users
  useEffect(() => {

    if (!meetingCode) return;

    const interval = setInterval(async () => {

      const res = await fetch(
        `/api/get-pending?roomId=${meetingCode}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setPendingUsers(Array.isArray(data) ? data : []);

    }, 2000);

    return () => clearInterval(interval);

  }, [meetingCode]);


  // approve user
  const approveUser = async (name: string) => {

    setApproving(name);

    await fetch("/api/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: meetingCode,
        name,
      }),
    });

    setPendingUsers(prev =>
      prev.filter(u => u !== name)
    );

    setApproving(null);

  };


  // deny user
  const denyUser = (name: string) => {

    setPendingUsers(prev =>
      prev.filter(u => u !== name)
    );

  };


  // copy link
  const copyLink = async () => {

    await navigator.clipboard.writeText(inviteLink);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

  };


  if (!meetingCode || !user || !isLoaded) return null;


  return (

    <div className="min-h-screen relative">

      <MeetingRoom
        roomName={meetingCode}
        participantName={user.fullName || "Host"}
        videoEnabled
        audioEnabled
        onLeave={() => router.push("/dashboard")}
      />


      {/* INVITE POPUP */}
      {showInvitePopup && (

        <div className="fixed bottom-24 left-6 bg-zinc-900 text-white p-4 rounded-xl shadow-xl w-80 z-50">

          <div className="flex justify-between">

            <div>

              <h3 className="font-semibold text-sm">
                Your meeting is ready
              </h3>

              <p className="text-xs text-zinc-400">
                Share this link
              </p>

            </div>

            <X
              size={18}
              className="cursor-pointer"
              onClick={() => setShowInvitePopup(false)}
            />

          </div>


          {/* FIXED LINK FIELD */}
          <div className="flex gap-2 mt-3">

            <input
              value={inviteLink}
              readOnly
              className="
                bg-white
                text-black
                text-xs
                px-2
                py-2
                rounded
                w-full
                outline-none
              "
            />

            <button
              onClick={copyLink}
              className="
                bg-white
                text-black
                px-2
                rounded
                hover:bg-gray-200
              "
            >
              <Copy size={16}/>
            </button>

          </div>

          {copied && (
            <p className="text-green-400 text-xs mt-1">
              Link copied
            </p>
          )}

        </div>

      )}



      {/* APPROVAL POPUP */}
      {pendingUsers.length > 0 && (

        <div className="fixed top-6 right-6 space-y-3 z-50">

          {pendingUsers.map(name => (

            <div
              key={name}
              className="
                bg-white
                shadow-xl
                rounded-xl
                p-4
                w-80
                border
                flex
                items-center
                justify-between
              "
            >

              <div className="flex items-center gap-3">

                <div className="bg-blue-100 p-2 rounded-full">
                  <User size={18}/>
                </div>

                <div>

                  <p className="font-medium text-sm">
                    {name}
                  </p>

                  <p className="text-xs text-gray-500">
                    wants to join
                  </p>

                </div>

              </div>


              {/* buttons */}
              <div className="flex gap-2">

                {/* APPROVE BLUE */}
                <button
                  onClick={() => approveUser(name)}
                  disabled={approving === name}
                  className="
                    bg-blue-600
                    hover:bg-blue-700
                    text-white
                    p-2
                    rounded
                  "
                >
                  {approving === name
                    ? <Loader2 className="animate-spin" size={16}/>
                    : <Check size={16}/>
                  }
                </button>


                {/* DENY RED */}
                <button
                  onClick={() => denyUser(name)}
                  className="
                    bg-red-600
                    hover:bg-red-700
                    text-white
                    p-2
                    rounded
                  "
                >
                  <XCircle size={16}/>
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}