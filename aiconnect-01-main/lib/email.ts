import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

  await transporter.sendMail({
    from: `"AIConnect Meetings" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Meeting Invite: ${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>📅 You're invited to a meeting</h2>
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
