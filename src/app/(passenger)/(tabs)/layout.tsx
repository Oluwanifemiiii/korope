import { NavigationBottom } from "@/components/ui/NavigationBottom";

/** Tab roots (Home, Trips, Korope+, Wallet, Profile) share the five-tab nav (C03). */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="pb-[calc(var(--size-nav)+env(safe-area-inset-bottom))]">{children}</div>
      <NavigationBottom />
    </>
  );
}
