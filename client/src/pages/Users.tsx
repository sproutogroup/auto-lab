import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertUserSchema,
  insertUserPermissionSchema,
  type User,
  type UserPermission,
  type PageDefinition,
} from "@shared/schema";
import { z } from "zod";
import {
  Users as UsersIcon,
  UserPlus,
  Settings,
  Shield,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Save,
  X,
  User as UserIcon,
  Mail,
  Calendar,
  Activity,
  Key,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const userFormSchema = insertUserSchema
  .extend({
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  })
  .transform((data) => ({
    ...data,
    username: data.username?.trim(),
    first_name: data.first_name?.trim(),
    last_name: data.last_name?.trim(),
    email: data.email?.trim(),
  }));

const editUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  role: z
    .enum([
      "admin",
      "manager",
      "salesperson",
      "office_staff",
      "marketing",
      "showroom_staff",
    ])
    .optional(),
  is_active: z.boolean().optional(),
});

const changePasswordSchema = z
  .object({
    new_password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm the password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type UserFormData = z.infer<typeof userFormSchema>;
type EditUserData = z.infer<typeof editUserSchema>;
type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] =
    useState(false);

  // Fetch users with permissions
  const { data: usersWithPermissions = [], isLoading: usersLoading } = useQuery(
    {
      queryKey: ["/api/admin/users-with-permissions"],
    },
  );

  // Fetch page definitions
  const { data: pageDefinitions = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["/api/admin/page-definitions"],
  });

  // Edit user form
  const editForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      role: "salesperson",
      is_active: true,
    },
  });

  // Change password form
  const changePasswordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const { confirm_password, ...userDataToSubmit } = userData;
      const res = await apiRequest(
        "POST",
        "/api/admin/users",
        userDataToSubmit,
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/users-with-permissions"],
      });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: { id: number; data: EditUserData }) => {
      const res = await apiRequest(
        "PUT",
        `/api/admin/users/${userData.id}`,
        userData.data,
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/users-with-permissions"],
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/users-with-permissions"],
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({
      userId,
      passwordData,
    }: {
      userId: number;
      passwordData: ChangePasswordData;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/admin/users/${userId}/reset-password`,
        {
          new_password: passwordData.new_password,
        },
      );
      return await res.json();
    },
    onSuccess: () => {
      setShowChangePasswordDialog(false);
      setSelectedUser(null);
      changePasswordForm.reset();
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Update user permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      userId,
      pageKey,
      permissionData,
    }: {
      userId: number;
      pageKey: string;
      permissionData: Partial<UserPermission>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/admin/user-permissions/${userId}/${pageKey}`,
        permissionData,
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/users-with-permissions"],
      });
      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  // Initialize default pages mutation
  const initializePagesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/admin/permissions/initialize",
        {},
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/page-definitions"],
      });
      toast({
        title: "Success",
        description: "Default pages initialized successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize pages",
        variant: "destructive",
      });
    },
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirm_password: "",
      email: "",
      first_name: "",
      last_name: "",
      role: "salesperson",
      is_active: true,
    },
  });

  // Reset form when dialog closes
  const handleCreateDialogChange = (open: boolean) => {
    setShowCreateDialog(open);
    if (!open) {
      form.reset();
    }
  };

  const handleCreateUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  // Helper functions for user management
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      username: user.username,
      email: user.email || "",
      role: user.role as
        | "admin"
        | "manager"
        | "salesperson"
        | "office_staff"
        | "marketing"
        | "showroom_staff",
      is_active: user.is_active,
    });
    setShowEditDialog(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleUpdateUser = (data: EditUserData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    changePasswordForm.reset();
    setShowChangePasswordDialog(true);
  };

  const handleConfirmChangePassword = (data: ChangePasswordData) => {
    if (selectedUser) {
      changePasswordMutation.mutate({
        userId: selectedUser.id,
        passwordData: data,
      });
    }
  };

  const getUserPermission = (
    userId: number,
    pageKey: string,
  ): UserPermission | undefined => {
    const user = usersWithPermissions.find((u: any) => u.id === userId);
    return user?.permissions?.find(
      (p: UserPermission) => p.page_key === pageKey,
    );
  };

  const updatePermission = (
    userId: number,
    pageKey: string,
    updates: Partial<UserPermission>,
  ) => {
    updatePermissionMutation.mutate({
      userId,
      pageKey,
      permissionData: updates,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "salesperson":
        return "bg-green-100 text-green-800 border-green-200";
      case "office_staff":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "marketing":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "showroom_staff":
        return "bg-teal-100 text-teal-800 border-teal-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "salesperson":
        return "Salesperson";
      case "office_staff":
        return "Office Staff";
      case "marketing":
        return "Marketing";
      case "showroom_staff":
        return "Showroom Staff";
      default:
        return role;
    }
  };

  const getPermissionLevelColor = (level: string) => {
    switch (level) {
      case "full_access":
        return "bg-green-50 border-green-200";
      case "view_only":
        return "bg-yellow-50 border-yellow-200";
      case "hidden":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (usersLoading || pagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-gray-600 text-sm">
                Manage system users and their permissions
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => initializePagesMutation.mutate()}
              variant="outline"
              disabled={initializePagesMutation.isPending}
              className="hidden sm:flex"
            >
              <Settings className="h-4 w-4 mr-2" />
              Initialize Pages
            </Button>
            <Dialog
              open={showCreateDialog}
              onOpenChange={handleCreateDialogChange}
            >
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-2xl">
                <DialogHeader className="border-b border-slate-200 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                      <UserPlus className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-slate-900">
                        Create New User
                      </DialogTitle>
                      <DialogDescription className="text-slate-600 mt-1">
                        Add a new team member to the dealership management
                        system with their role and permissions.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCreateUser)}
                    className="space-y-4 mt-4"
                  >
                    {/* Personal Information Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-red-600" />
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 font-medium">
                                First Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 font-medium">
                                Last Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Account Details Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-red-600" />
                        Account Details
                      </h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700 font-medium">
                                  Username
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700 font-medium">
                                  Email
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    {...field}
                                    className="border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700 font-medium">
                                  Password
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    {...field}
                                    className="border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="confirm_password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700 font-medium">
                                  Confirm Password
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    {...field}
                                    className="border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Role & Permissions Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        Role & Permissions
                      </h3>
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 font-medium">
                                System Role
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="border-slate-300 focus:border-red-500 focus:ring-red-500/20">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      Admin
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="manager">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      Manager
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="salesperson">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      Salesperson
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="office_staff">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                      Office Staff
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="marketing">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                      Marketing
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="showroom_staff">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                                      Showroom Staff
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50">
                              <div className="space-y-0.5">
                                <FormLabel className="text-slate-700 font-medium">
                                  Active User
                                </FormLabel>
                                <div className="text-sm text-slate-600">
                                  Allow this user to access the system
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-red-600"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-slate-200">
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg"
                      >
                        {createUserMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating User...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Create User
                          </div>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="border-slate-300 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        <Tabs defaultValue="users" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="users">User List</TabsTrigger>
            <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="h-full">
            <div className="bg-white rounded-lg shadow-sm border h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      System Users
                    </h2>
                    <p className="text-sm text-gray-600">
                      Manage user accounts and their basic information
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {usersWithPermissions.length}{" "}
                    {usersWithPermissions.length === 1 ? "user" : "users"}
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[250px]">User</TableHead>
                      <TableHead className="w-[200px]">Email</TableHead>
                      <TableHead className="w-[120px]">Role</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[120px]">Last Login</TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithPermissions.map((user: any) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-gray-600" />
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{user.email || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {formatRoleName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${user.is_active ? "bg-green-500" : "bg-gray-400"}`}
                            />
                            <span
                              className={`text-sm ${user.is_active ? "text-green-700" : "text-gray-500"}`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {user.last_login
                                ? new Date(user.last_login).toLocaleDateString()
                                : "Never"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPermissionDialog(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangePassword(user)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Permission Matrix Tab */}
          <TabsContent value="permissions" className="h-full">
            <div className="bg-white rounded-lg shadow-sm border h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Permission Matrix
                    </h2>
                    <p className="text-sm text-gray-600">
                      Manage user permissions across all system pages
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {pageDefinitions.length}{" "}
                    {pageDefinitions.length === 1 ? "page" : "pages"}
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="min-w-[200px] sticky left-0 bg-gray-50">
                        Page
                      </TableHead>
                      {usersWithPermissions.map((user: any) => (
                        <TableHead
                          key={user.id}
                          className="text-center min-w-[150px]"
                        >
                          <div className="text-sm font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{user.username}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Define exact sidebar order
                      const sidebarOrder = [
                        // OVERVIEW
                        "dashboard",
                        // VEHICLES
                        "vehicle-master",
                        "sold-stock",
                        "current-stock",
                        "stock-age",
                        "bought-vehicles",
                        // SALES
                        "customers",
                        "leads",
                        "appointments",
                        "tasks",
                        // DOCUMENTS
                        "purchase-invoices",
                        "sales-invoices",
                        "collection-forms",
                        "pdf-templates",
                        // MANAGEMENT
                        "calendar",
                        "schedule",
                        "job-history",
                        // ANALYSIS
                        "reports",
                        // SYSTEM
                        "users",
                      ];

                      // Sort pages according to sidebar order
                      const sortedPages = [...pageDefinitions].sort((a, b) => {
                        const aIndex = sidebarOrder.indexOf(a.page_key);
                        const bIndex = sidebarOrder.indexOf(b.page_key);
                        // If not found in order, put at end
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                      });

                      return sortedPages.map((page: PageDefinition) => (
                        <TableRow key={page.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium sticky left-0 bg-white">
                            <div className="py-2">
                              <div className="text-sm font-medium text-gray-900">
                                {page.page_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {page.page_description}
                              </div>
                              <Badge
                                variant="outline"
                                className="mt-2 text-xs capitalize"
                              >
                                {page.page_category}
                              </Badge>
                            </div>
                          </TableCell>
                          {usersWithPermissions.map((user: any) => {
                            const permission = getUserPermission(
                              user.id,
                              page.page_key,
                            );
                            const permissionLevel =
                              permission?.permission_level || "hidden";

                            return (
                              <TableCell key={user.id} className="text-center">
                                <div className="space-y-3 py-2">
                                  <Select
                                    value={permissionLevel}
                                    onValueChange={(value) =>
                                      updatePermission(user.id, page.page_key, {
                                        permission_level: value as any,
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className={`w-full text-xs ${getPermissionLevelColor(permissionLevel)}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hidden">
                                        Hidden
                                      </SelectItem>
                                      <SelectItem value="view_only">
                                        View Only
                                      </SelectItem>
                                      <SelectItem value="full_access">
                                        Full Access
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {permissionLevel !== "hidden" && (
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          id={`create-${user.id}-${page.page_key}`}
                                          checked={
                                            permission?.can_create || false
                                          }
                                          onChange={(e) =>
                                            updatePermission(
                                              user.id,
                                              page.page_key,
                                              {
                                                can_create: e.target.checked,
                                              },
                                            )
                                          }
                                          className="h-3 w-3 rounded border-gray-300"
                                        />
                                        <label
                                          htmlFor={`create-${user.id}-${page.page_key}`}
                                          className="text-xs text-gray-600 cursor-pointer"
                                        >
                                          Create
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          id={`edit-${user.id}-${page.page_key}`}
                                          checked={
                                            permission?.can_edit || false
                                          }
                                          onChange={(e) =>
                                            updatePermission(
                                              user.id,
                                              page.page_key,
                                              {
                                                can_edit: e.target.checked,
                                              },
                                            )
                                          }
                                          className="h-3 w-3 rounded border-gray-300"
                                        />
                                        <label
                                          htmlFor={`edit-${user.id}-${page.page_key}`}
                                          className="text-xs text-gray-600 cursor-pointer"
                                        >
                                          Edit
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          id={`delete-${user.id}-${page.page_key}`}
                                          checked={
                                            permission?.can_delete || false
                                          }
                                          onChange={(e) =>
                                            updatePermission(
                                              user.id,
                                              page.page_key,
                                              {
                                                can_delete: e.target.checked,
                                              },
                                            )
                                          }
                                          className="h-3 w-3 rounded border-gray-300"
                                        />
                                        <label
                                          htmlFor={`delete-${user.id}-${page.page_key}`}
                                          className="text-xs text-gray-600 cursor-pointer"
                                        >
                                          Delete
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          id={`export-${user.id}-${page.page_key}`}
                                          checked={
                                            permission?.can_export || false
                                          }
                                          onChange={(e) =>
                                            updatePermission(
                                              user.id,
                                              page.page_key,
                                              {
                                                can_export: e.target.checked,
                                              },
                                            )
                                          }
                                          className="h-3 w-3 rounded border-gray-300"
                                        />
                                        <label
                                          htmlFor={`export-${user.id}-${page.page_key}`}
                                          className="text-xs text-gray-600 cursor-pointer"
                                        >
                                          Export
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 mb-2">
                      Access Levels:
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                        <span className="text-gray-600">
                          Hidden - Page not visible
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                        <span className="text-gray-600">
                          View Only - Read access only
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                        <span className="text-gray-600">
                          Full Access - Complete access
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-2">
                      Action Permissions:
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="h-3 w-3 rounded border-gray-300"
                        />
                        <span className="text-gray-600">
                          Create, Edit, Delete, Export
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdateUser)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="salesperson">Salesperson</SelectItem>
                        <SelectItem value="office_staff">
                          Office Staff
                        </SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="showroom_staff">
                          Showroom Staff
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active User</FormLabel>
                      <div className="text-sm text-gray-600">
                        Allow this user to access the system
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="flex-1"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <UsersIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    @{selectedUser.username}
                  </p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending}
              className="flex-1"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Change the password for {selectedUser?.first_name}{" "}
              {selectedUser?.last_name} (@{selectedUser?.username})
            </DialogDescription>
          </DialogHeader>
          <Form {...changePasswordForm}>
            <form
              onSubmit={changePasswordForm.handleSubmit(
                handleConfirmChangePassword,
              )}
              className="space-y-4"
            >
              <FormField
                control={changePasswordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex-1"
                >
                  {changePasswordMutation.isPending
                    ? "Changing..."
                    : "Change Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowChangePasswordDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
