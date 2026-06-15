import nodemailer from "nodemailer";

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
  const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/meeting/${meetingCode}`;
  const formattedDate = scheduledFor.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const emailSubject = `Meeting Invite: ${title}`;
  const emailHtml = `
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

  // 1. Try Resend if configured
  const resend = getResendClient();
  if (resend) {
    try {
      await resend.emails.send({
        from: "AIConnect <onboarding@resend.dev>",
        to,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`[email] Sent meeting invite via Resend to: ${to}`);
      return;
    } catch (err) {
      console.error("[email] Resend send failed, trying Gmail fallback...", err);
    }
  }

  // 2. Try Gmail SMTP if configured
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `"AIConnect" <${gmailUser}>`,
        to,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`[email] Sent meeting invite via Gmail to: ${to}`);
      return;
    } catch (err) {
      console.error("[email] Gmail send failed:", err);
      throw err;
    }
  }

  console.warn("[email] Neither Resend nor Gmail is configured. Skipping invite email.");
}
