import { ShiningText } from '@/components/ui/shining-text'

const Demo = () => {
  return (
    <>
      <ShiningText text={'felixel is thinking'} />
    </>
  )
}

export { Demo }

"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutDashboard, UserCog, Settings, LogOut, Home, Bell, User } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function SidebarDemo() {
  const links = [
    { label: "Dashboard", href: "#", icon: (<LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />) },
    { label: "Profile", href: "#", icon: (<UserCog className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />) },
    { label: "Settings", href: "#", icon: (<Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />) },
    { label: "Logout", href: "#", icon: (<LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />) },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-md flex flex-col md:flex-row w-full flex-1", "h-[60vh]")}> 
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "User",
                href: "#",
                icon: (
                  <Image src="https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&q=80&auto=format&fit=crop" className="h-7 w-7 flex-shrink-0 rounded-full" width={50} height={50} alt="Avatar" />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link href="#" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-black dark:text-white whitespace-pre">
        Acet Labs
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link href="#" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};

import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { MenuBar } from "@/components/ui/glow-menu";

export function TextShimmerWaveColor() {
  return (
    <TextShimmerWave
      className='[--base-color:#0D74CE] [--base-gradient-color:#5EB1EF]'
      duration={1}
      spread={1}
      zDistance={1}
      scaleDistance={1.1}
      rotateYDistance={20}
    >
      Creating the perfect dish...
    </TextShimmerWave>
  );
}

const menuItems = [
  {
    icon: Home,
    label: "Home",
    href: "#",
    gradient:
      "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-500",
  },
  {
    icon: Bell,
    label: "Notifications",
    href: "#",
    gradient:
      "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    iconColor: "text-orange-500",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "#",
    gradient:
      "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
    iconColor: "text-green-500",
  },
  {
    icon: User,
    label: "Profile",
    href: "#",
    gradient:
      "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
    iconColor: "text-red-500",
  },
]

export function MenuBarDemo() {
  const [activeItem, setActiveItem] = useState<string>("Home")

  return (
    <MenuBar
      items={menuItems}
      activeItem={activeItem}
      onItemClick={setActiveItem}
    />
  )
}


