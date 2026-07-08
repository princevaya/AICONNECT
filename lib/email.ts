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
      attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
      }>;
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
  timezone = "UTC",
  duration = "30 Minutes",
  organizerName = "Organizer",
}: {
  to: string;
  title: string;
  scheduledFor: Date;
  meetingCode: string;
  notes?: string | null;
  timezone?: string;
  duration?: string;
  organizerName?: string;
}) {
  const sender = getMeetingSender();
  if (!sender) {
    console.warn("[email] No email provider is configured. Skipping invite email.");
    return;
  }

  const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005"}/meeting/join?room=${meetingCode}`;
  
  // Calculate end time
  let mins = 30;
  const durLower = duration.toLowerCase();
  if (durLower.includes("15 minute")) mins = 15;
  else if (durLower.includes("30 minute")) mins = 30;
  else if (durLower.includes("45 minute")) mins = 45;
  else if (durLower.includes("1 hour 30")) mins = 90;
  else if (durLower.includes("2 hour")) mins = 120;
  else if (durLower.includes("3 hour")) mins = 180;
  else if (durLower.includes("1 hour")) mins = 60;
  else {
    const match = duration.match(/\d+/);
    if (match) {
      const val = parseInt(match[0]);
      if (durLower.includes("hour")) {
        mins = val * 60;
      } else {
        mins = val;
      }
    }
  }
  const endTime = new Date(scheduledFor.getTime() + mins * 60 * 1000);

  // Generate .ics attachment
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIConnect//NONSGML AIConnect Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${meetingCode}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(scheduledFor)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${notes || ""}`,
    `LOCATION:${meetingLink}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  // Determine timezone GMT offset string
  let offsetStr = "";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset"
    });
    const parts = formatter.formatToParts(scheduledFor);
    const offsetPart = parts.find(p => p.type === "timeZoneName");
    if (offsetPart) offsetStr = ` (${offsetPart.value})`;
  } catch {}

  const meetingDateStr = scheduledFor.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });

  const meetingTimeStr = scheduledFor.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  const html = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 32px 16px; color: #1f2937;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">AIConnect Meeting Invitation</h1>
          <p style="color: #c7d2fe; margin: 8px 0 0 0; font-size: 14px;">You have been invited to a scheduled meeting.</p>
        </div>

        <!-- Content Body -->
        <div style="background-color: #ffffff; padding: 32px 24px;">
          <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #111827;">${title}</h2>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; color: #6b7280; width: 100px; font-weight: 500;">Organizer:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${organizerName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${meetingDateStr}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${meetingTimeStr} (${timezone}${offsetStr})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${duration}</td>
              </tr>
            </table>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280; font-style: italic;">
              * Note: Meeting time automatically adjusts to your local timezone.
            </p>
          </div>

          ${notes ? `
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Description</h3>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563; white-space: pre-line;">${notes}</p>
            </div>
          ` : ""}

          <!-- CTA Join Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${meetingLink}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 16px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
              Join Meeting
            </a>
          </div>

          <!-- Quick Link -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; color: #6b7280;">
            <p style="margin: 0 0 4px 0;">Or use the link below to join:</p>
            <a href="${meetingLink}" style="color: #4f46e5; text-decoration: underline; word-break: break-all;">${meetingLink}</a>
            <p style="margin: 12px 0 0 0;">Meeting Room Code: <strong style="color: #111827;">${meetingCode}</strong></p>
          </div>

        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          Sent by AIConnect Scheduler. Double-click the attached invite.ics file to add this meeting to your calendar.
        </div>

      </div>
    </div>
  `;

  if (sender.type === "resend") {
    await sender.client.emails.send({
      from: process.env.RESEND_FROM ?? "AIConnect Meetings <onboarding@resend.dev>",
      to,
      subject: `Meeting Invite: ${title}`,
      html,
      attachments: [
        {
          filename: "invite.ics",
          content: Buffer.from(icsContent),
        }
      ]
    });
    return;
  }

  await sender.client.sendMail({
    from: `"AIConnect Meetings" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Meeting Invite: ${title}`,
    html,
    attachments: [
      {
        filename: "invite.ics",
        content: icsContent,
        contentType: "text/calendar",
      }
    ]
  });
}
