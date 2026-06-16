import { BarChart3Icon, FolderOpenIcon, WandSparklesIcon } from "lucide-react";

export const DEFAULT_AVATAR_URL =
  "https://api.dicebear.com/8.x/initials/svg?backgroundType=gradientLinear&backgroundRotation=0,360&seed=";

export const PAGINATION_LIMIT = 10;

export const COMPANIES = [
  {
    name: "Asana",
    logo: "/assets/company-01.svg",
  },
  {
    name: "Tidal",
    logo: "/assets/company-02.svg",
  },
  {
    name: "Innovaccer",
    logo: "/assets/company-03.svg",
  },
  {
    name: "Linear",
    logo: "/assets/company-04.svg",
  },
  {
    name: "Raycast",
    logo: "/assets/company-05.svg",
  },
  {
    name: "Labelbox",
    logo: "/assets/company-06.svg",
  },
] as const;

export const PROCESS = [
  {
    title: "Plan Smart Meetings",
    description: "Set goals, attendees, and agendas in a few clicks.",
    icon: FolderOpenIcon,
  },
  {
    title: "AI-Powered Prep",
    description: "Let AI surface briefs, docs, and suggested talking points.",
    icon: WandSparklesIcon,
  },
  {
    title: "Review Outcomes",
    description: "Share notes, action items, and analytics instantly.",
    icon: BarChart3Icon,
  },
] as const;

export const FEATURES = [
  {
    title: "AI Meeting Rooms",
    description: "Spin up smart, branded meeting spaces powered by AI.",
  },
  {
    title: "Agenda Collaboration",
    description: "Co-edit talking points, docs, and goals in real time.",
  },
  {
    title: "Secure Sessions",
    description: "Encrypted and secure meeting environments.",
  },
  {
    title: "Custom Workflows",
    description: "Automate reminders, notes, and follow-ups.",
  },
  {
    title: "Scheduling Automation",
    description: "Automated scheduling and participant management.",
  },
  {
    title: "Team Collaboration",
    description:
      "Share decisions, action items, and recordings with your team.",
  },
] as const;

export const REVIEWS = [
  {
    name: "Michael Smith",
    username: "@michaelsmith",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    rating: 5,
    review:
      "AIConnect has transformed our meetings! The AI scheduling and note-taking save us countless hours while keeping everyone aligned.",
  },
  {
    name: "Emily Johnson",
    username: "@emilyjohnson",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
    rating: 4,
    review:
      "As a product lead, this platform has been invaluable. The AI agendas are spot-on, and the automated follow-ups are a huge time-saver.",
  },
  {
    name: "Daniel Williams",
    username: "@danielwilliams",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    rating: 5,
    review:
      "The depth of meeting insights provided by AIConnect is impressive. It helps us capture action items efficiently and effectively.",
  },
  {
    name: "Sophia Brown",
    username: "@sophiabrown",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    rating: 4,
    review:
      "AIConnect streamlines our entire collaboration process. The AI insights are incredibly helpful for making informed decisions.",
  },
  {
    name: "James Taylor",
    username: "@jamestaylor",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    rating: 5,
    review:
      "This platform has transformed our weekly reviews. Meetings stay focused and the recaps are exceptional.",
  },
  {
    name: "Olivia Martinez",
    username: "@oliviamartinez",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    rating: 4,
    review:
      "AIConnect helps us run technical syncs at scale. The automated summaries are reliable and save our team valuable time.",
  },
  {
    name: "William Garcia",
    username: "@williamgarcia",
    avatar: "https://randomuser.me/api/portraits/men/4.jpg",
    rating: 5,
    review:
      "Game-changer for distributed teams! The AI's ability to map tasks and decisions is remarkable.",
  },
  {
    name: "Mia Rodriguez",
    username: "@miarodriguez",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
    rating: 4,
    review:
      "We've tried several meeting platforms, but AIConnect stands out with its AI capabilities and user-friendly interface.",
  },
  {
    name: "Henry Lee",
    username: "@henrylee",
    avatar: "https://randomuser.me/api/portraits/men/5.jpg",
    rating: 5,
    review:
      "AIConnect has streamlined our coordination pipeline. The insights from AI meetings are invaluable for keeping teams aligned.",
  },
] as const;
