import React from 'react';
import DesktopRequiredModal from "@/components/DesktopRequiredModal";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DesktopRequiredModal />
      {children}
    </>
  );
}
