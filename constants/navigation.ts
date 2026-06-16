import {
  HelpCircleIcon,
  LineChartIcon,
  Link2Icon,
  LockIcon,
  NewspaperIcon,
} from "lucide-react";

export const NAV_LINKS = [
  {
    title: "Meeting",
    href: "/meeting",
    menu: [
      {
        title: "Create a Meeting",
        tagline: "Host your own secure meeting.",
        href: "/meeting/create",
        icon: LockIcon,
      },
      {
        title: "Schedule a Meeting",
        tagline: "Plan meetings in advance.",
        href: "/meeting/schedule",
        icon: LineChartIcon,
      },
      {
        title: "Join a Meeting",
        tagline: "Quickly join an existing meeting.",
        href: "/meeting/join",
        icon: Link2Icon,
      },
    ],
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Resources",
    href: "/resources",
    menu: [
      {
        title: "Blog",
        tagline: "Read articles on the latest trends in tech.",
        href: "/blog",
        icon: NewspaperIcon,
      },
      {
        title: "Help",
        tagline: "Get answers to your questions.",
        href: "/help",
        icon: HelpCircleIcon,
      },
    ],
  },
  {
    title: "About",
    href: "/about",
  },
];
