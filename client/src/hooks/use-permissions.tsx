import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export type UserPermission = {
  id: number;
  user_id: number;
  page_key: string;
  can_view: boolean;
  access_level: "view_only" | "full_access";
  is_visible: boolean;
};

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery<UserPermission[], Error>({
    queryKey: ["/api/auth/permissions"],
    enabled: !!user,
  });

  const hasPermission = (pageKey: string): boolean => {
    if (!user) return false;

    // Admin has access to everything - bypass all permission checks
    if (user.role === "admin") {
      console.log(
        `Admin user ${user.username} accessing ${pageKey} - bypassing permission check`,
      );
      return true;
    }

    // If permissions are still loading, deny access temporarily
    if (isLoading) return false;

    // Find permission for this page
    const permission = permissions?.find((p) => p.page_key === pageKey);

    // If no permission found, deny access
    if (!permission) return false;

    // Check if user can view and page is visible
    return permission.can_view && permission.is_visible;
  };

  const getAccessLevel = (
    pageKey: string,
  ): "view_only" | "full_access" | null => {
    if (!user) return null;

    // Admin has full access to everything
    if (user.role === "admin") return "full_access";

    // Find permission for this page
    const permission = permissions?.find((p) => p.page_key === pageKey);

    // If no permission or can't view, return null
    if (!permission || !permission.can_view || !permission.is_visible) {
      return null;
    }

    return permission.access_level;
  };

  const isReadOnly = (pageKey: string): boolean => {
    const accessLevel = getAccessLevel(pageKey);
    return accessLevel === "view_only";
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    getAccessLevel,
    isReadOnly,
  };
}
