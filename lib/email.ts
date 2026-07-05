import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

function getMeetingSender() {
  const resend = getResendClient();
  if (resend) return { type: "resend" as const, client: resend };

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return { type: "smtp" as const, client: transporter };
  }

  return null;
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
  const sender = getMeetingSender();
  if (!sender) {
    console.warn("[email] No email provider is configured. Skipping invite email.");
    return;
  }

  const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/meeting/join?room=${meetingCode}`;
  const formattedDate = scheduledFor.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const html = `
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
  `;

  if (sender.type === "resend") {
    await sender.client.emails.send({
      from: process.env.RESEND_FROM ?? "AIConnect Meetings <onboarding@resend.dev>",
      to,
      subject: `Meeting Invite: ${title}`,
      html,
    });
    return;
  }

  await sender.client.sendMail({
    from: `"AIConnect Meetings" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Meeting Invite: ${title}`,
    html,
  });
}
