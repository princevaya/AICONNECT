import { ComponentPropsWithoutRef, ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Link2Icon,
  SearchIcon,
  WaypointsIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Input } from "./input";
import { Command } from "./command";
import { Label } from "./label";
import { Calendar } from "./calendar";
import Integrations from "./integrations";

export const CARDS = [
  {
    Icon: Link2Icon,
    name: "Schedule Meetings",
    description:
      "Launch AI-assisted meetings with agendas, notes, and action items.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Card className="absolute top-10 left-10 origin-top rounded-none rounded-tl-md transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_0%,#000_100%)] group-hover:scale-105 border border-border border-r-0">
        <CardHeader>
          <CardTitle>AI Meeting Room</CardTitle>
          <CardDescription>
            Spin up an AI-assisted meeting space for your team or clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="-mt-4">
          <Label>Name your session</Label>
          <Input
            type="text"
            placeholder="e.g., Quarterly Planning Sync..."
            className="w-full focus-visible:ring-0 focus-visible:ring-transparent"
          />
        </CardContent>
      </Card>
    ),
  },
  {
    Icon: SearchIcon,
    name: "Find Conversations",
    description: "Search and manage your meeting notes with AI assistance.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <Command className="absolute right-10 top-10 w-[70%] origin-to translate-x-0 border border-border transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:-translate-x-10 p-2">
        <Input placeholder="Search teammates or meetings..." />
        <div className="mt-1 cursor-pointer">
          <div className="px-4 py-2 hover:bg-muted rounded-md">
            aiconnect.io/meeting/product-sync
          </div>
          <div className="px-4 py-2 hover:bg-muted rounded-md">
            aiconnect.io/team/sarah-pm
          </div>
          <div className="px-4 py-2 hover:bg-muted rounded-md">
            aiconnect.io/session/tech-lead
          </div>
          <div className="px-4 py-2 hover:bg-muted rounded-md">
            aiconnect.io/notes/frontend-demo
          </div>
          <div className="px-4 py-2 hover:bg-muted rounded-md">
            aiconnect.io/follow-up/qa-eng
          </div>
          <div className="px-4 py-2 hover:bg-muted rounded-md">
            aiconnect.io/action-items/data-scientist
          </div>
        </div>
      </Command>
    ),
  },
  {
    Icon: WaypointsIcon,
    name: "AI Integration Hub",
    description:
      "Connect calendars, docs, and task tools for seamless meeting workflows.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2 max-w-full overflow-hidden",
    background: (
      <Integrations className="absolute right-2 pl-28 md:pl-0 top-4 h-75 w-150 border-none transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
    ),
  },
  {
    Icon: CalendarIcon,
    name: "Meeting Calendar",
    description: "Schedule and manage your AI-assisted meetings efficiently.",
    className: "col-span-3 lg:col-span-1",
    href: "#",
    cta: "Learn more",
    background: (
      <Calendar
        mode="single"
        selected={new Date(2022, 4, 11, 0, 0, 0)}
        className="absolute right-0 top-10 origin-top rounded-md border border-border transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:scale-105"
      />
    ),
  },
];

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      // light styles
      "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "dark:bg-black transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-4">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />
        <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
          {name}
        </h3>
        <p className="max-w-lg text-neutral-400">{description}</p>
      </div>

      <div
        className={cn(
          "pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden"
        )}
      >
        <Button
          variant="link"
          asChild
          size="sm"
          className="pointer-events-auto p-0"
        >
          <a href={href}>
            {cta}
            <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
          </a>
        </Button>
      </div>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
      )}
    >
      <Button
        variant="link"
        asChild
        size="sm"
        className="pointer-events-auto p-0"
      >
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
        </a>
      </Button>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10" />
  </div>
);

export { BentoCard, BentoGrid };
