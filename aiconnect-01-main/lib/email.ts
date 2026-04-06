type ResendClient = {
  emails: {
    send: (input: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }) => Promise<unknown>;
  };
};

function getResendClient(): ResendClient | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    const req = eval("require") as (id: string) => unknown;
    const mod = req("resend") as { Resend?: new (key: string) => ResendClient };
    if (!mod?.Resend) return null;
    return new mod.Resend(apiKey);
  } catch {
    return null;
  }
}

export async function sendMeetingInvite({
  to,
  title,
  scheduledFor,
  meetingCode,
  notes,
}: {
  to: string;
  title: string;
  scheduledFor: Date;
  meetingCode: string;
  notes?: string | null;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[email] Resend is not configured. Skipping invite email.");
    return;
  }

  const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/meeting/${meetingCode}`;
  const formattedDate = scheduledFor.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  await resend.emails.send({
    from: "AIConnect <onboarding@resend.dev>",
    to,
    subject: `Meeting Invite: ${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>You are invited to a meeting</h2>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>When:</strong> ${formattedDate}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
        <a href="${meetingLink}" style="
          display: inline-block;
          margin-top: 16px;
          padding: 12px 24px;
          background: #6366f1;
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
        ">
          Join Meeting
        </a>
        <p style="color: #888; margin-top: 24px; font-size: 12px;">
          Meeting code: ${meetingCode}
        </p>
      </div>
    `,
  });
}
