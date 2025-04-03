import { profilesData } from "@/lib/profile-data"
import { ProfileDetailPage } from "./profile-detail"

type PageProps = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function ProfilePage({ params }: PageProps) {
  return <ProfileDetailPage params={params} />
}

