"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user"; // Adjust the import path if necessary
import { ProfileHeader } from "@/components/ui/profile-header"; // Adjust the import path if necessary

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const { user, profile, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    // You might want a loading spinner here instead of null
    return <div>Loading...</div>;
  }

  if (!user) {
    // This case is handled by the useEffect redirect, but good to have a fallback
    return null;
  }

  // Extract relevant props for ProfileHeader from the profile
  const name = profile?.name || "Usuário"; // Default name if profile not fully loaded
  const avatarUrl = profile?.avatar_url || "/placeholder-avatar.jpg"; // Default avatar

  // Assuming ProfileHeader accepts these props. Adjust if your ProfileHeader component has different props.
  const headerProps = {
    name: name,
    avatarUrl: avatarUrl,
    // Add other props expected by ProfileHeader here, like isPremium, online status, etc.
    // You might need to fetch or derive these from the user or profile data.
    onBack: () => router.back(), // Example back button handler
    // Add handlers for onVideoCall, onVoiceCall, onOpenProfile if needed in the header
    // For a general layout header, these might be less common unless the header
    // specifically relates to a conversation view.
  };

  return (
    <div>
      {/* Assuming ProfileHeader is a component that takes props like name and avatarUrl */}
      {/* Adjust prop names according to your actual ProfileHeader component */}
      <ProfileHeader {...headerProps} />
      <main>{children}</main>{" "}
      {/* Render the page content below the header */}
    </div>
  );
}