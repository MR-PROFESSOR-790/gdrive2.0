import React from "react";
import Link from "next/link";

const Sidebar = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-base-300">GDrive 2.0</div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        <Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-base-300">
          My Files
        </Link>
        <Link href="/subscription" className="block px-4 py-2 rounded hover:bg-base-300">
          Subscription
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;
