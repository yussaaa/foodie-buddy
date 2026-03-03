import AppLayout from "@/components/layout/AppLayout";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
