"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChevronDown, FaCloud, FaCube, FaFileAlt, FaHome, FaShareAlt, FaWallet } from "react-icons/fa";
import { hardhat } from "viem/chains";
import { Bars3Icon, CloudIcon, Cog6ToothIcon, HomeIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
  subLinks?: HeaderMenuLink[];
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
    icon: <FaHome className="h-4 w-4" />,
    description: "Welcome to GDrive 2.0",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <FaCloud className="h-4 w-4" />,
    description: "Manage your files",
    subLinks: [
      {
        label: "My Files",
        href: "/dashboard?tab=files",
        icon: <FaFileAlt className="h-3 w-3" />,
      },
      {
        label: "3D Gallery",
        href: "/dashboard?tab=gallery",
        icon: <FaCube className="h-3 w-3" />,
      },
      {
        label: "Subscription",
        href: "/dashboard?tab=subscription",
        icon: <FaWallet className="h-3 w-3" />,
      },
      {
        label: "Shared Links",
        href: "/dashboard?tab=shared-links",
        icon: <FaShareAlt className="h-3 w-3" />,
      },
    ],
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <>
      {menuLinks.map(({ label, href, icon, description, subLinks }) => {
        const isActive =
          pathname === href || (subLinks && subLinks.some(sub => pathname.startsWith(sub.href.split("?")[0])));
        const hasSubLinks = subLinks && subLinks.length > 0;

        return (
          <li
            key={href}
            className="relative"
            onMouseEnter={() => setHoveredItem(label)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link
              href={href}
              className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30 shadow-lg backdrop-blur-sm"
                  : "text-gray-300 hover:bg-slate-800/50 hover:text-white hover:shadow-md"
              }`}
            >
              <div
                className={`transition-all duration-300 ${isActive ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`}
              >
                {icon}
              </div>
              <span className="text-sm">{label}</span>
              {hasSubLinks && (
                <FaChevronDown
                  className={`h-3 w-3 ml-auto transition-transform duration-300 ${
                    hoveredItem === label ? "rotate-180" : ""
                  } ${isActive ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`}
                />
              )}
            </Link>

            {/* Dropdown Menu */}
            {hasSubLinks && (
              <div
                className={`absolute top-full left-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl transition-all duration-300 transform origin-top ${
                  hoveredItem === label
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                <div className="p-2 space-y-1">
                  {subLinks.map(subLink => (
                    <Link
                      key={subLink.href}
                      href={subLink.href}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-slate-800/50 hover:text-white rounded-lg transition-all duration-200"
                    >
                      <div className="text-gray-400">{subLink.icon}</div>
                      {subLink.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </>
  );
};

export const MobileMenuLinks = () => {
  const pathname = usePathname();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <>
      {menuLinks.map(({ label, href, icon, description, subLinks }) => {
        const isActive =
          pathname === href || (subLinks && subLinks.some(sub => pathname.startsWith(sub.href.split("?")[0])));
        const hasSubLinks = subLinks && subLinks.length > 0;
        const isExpanded = expandedItem === label;

        return (
          <li key={href}>
            <div className="space-y-1">
              <Link
                href={href}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30"
                    : "text-gray-300 hover:bg-slate-800/50 hover:text-white"
                }`}
                onClick={e => {
                  if (hasSubLinks) {
                    e.preventDefault();
                    setExpandedItem(isExpanded ? null : label);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`transition-colors duration-300 ${isActive ? "text-blue-400" : "text-gray-400"}`}>
                    {icon}
                  </div>
                  <div>
                    <span className="text-sm">{label}</span>
                    {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                  </div>
                </div>
                {hasSubLinks && (
                  <FaChevronDown
                    className={`h-3 w-3 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    } ${isActive ? "text-blue-400" : "text-gray-400"}`}
                  />
                )}
              </Link>

              {/* Mobile Submenu */}
              {hasSubLinks && (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-4 space-y-1 border-l border-slate-700/50 pl-4">
                    {subLinks.map(subLink => (
                      <Link
                        key={subLink.href}
                        href={subLink.href}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-slate-800/30 rounded-lg transition-all duration-200"
                      >
                        <div className="text-gray-500">{subLink.icon}</div>
                        {subLink.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </>
  );
};

/**
 * Enhanced Connect Button Component with elegant styling
 */
const ElegantConnectButton = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background glow */}
      <div
        className={`absolute inset-[-2px] rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-sm transition-all duration-500 ${
          isHovered ? "opacity-75 scale-105" : "opacity-40 scale-100"
        }`}
      ></div>

      {/* Main button wrapper */}
      <div className="relative z-10 rounded-xl overflow-hidden">
        <RainbowKitCustomConnectButton />
      </div>

      {/* Floating particles effect - Keep if desired, or remove if too much */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Particle elements */}
        <div className="absolute top-0 left-1/4 w-[2px] h-[2px] bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-[2px] h-[2px] bg-purple-400 rounded-full animate-pulse delay-100"></div>
        <div className="absolute bottom-0 left-1/2 w-[2px] h-[2px] bg-pink-400 rounded-full animate-pulse delay-200"></div>
      </div>
    </div>
  );
};

/**
 * Enhanced Site Header for GDrive 2.0
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const [isScrolled, setIsScrolled] = useState(false);

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl shadow-black/20"
          : "bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/30"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <details className="dropdown" ref={burgerMenuRef}>
              <summary className="btn btn-ghost btn-circle hover:bg-slate-800/50 transition-all duration-300">
                <Bars3Icon className="h-6 w-6 text-gray-300" />
              </summary>
              <ul className="menu dropdown-content mt-3 w-80 p-4 shadow-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl space-y-2">
                <MobileMenuLinks />
              </ul>
            </details>
          </div>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg">
                <FaCloud className="text-white text-lg" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                GDrive 2.0
              </h1>
              <p className="text-xs text-gray-400 -mt-0.5">Decentralized Storage</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:block">
            <ul className="flex items-center space-x-2">
              <HeaderMenuLinks />
            </ul>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <ElegantConnectButton />
            {isLocalNetwork && (
              <div className="hidden sm:block">
                <FaucetButton />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated border bottom */}
      <div
        className={`h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent transition-opacity duration-500 ${
          isScrolled ? "opacity-100" : "opacity-0"
        }`}
      ></div>
    </div>
  );
};
