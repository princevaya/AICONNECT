import {
  HelpCircleIcon,
  NewspaperIcon,
} from "lucide-react";

export const NAV_LINKS = [
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
