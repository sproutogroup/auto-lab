import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  AlertCircle,
  Star,
  Clock,
  Calendar,
  Palette,
  Target,
} from "lucide-react";

interface PinnedMessage {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  author_username: string;
  is_public: boolean;
  target_user_ids: number[] | null;
  priority: string;
  color_theme: string;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface CreatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMessage?: PinnedMessage | null;
  users: User[];
}

const formSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(1000, "Content must be less than 1000 characters"),
  is_public: z.boolean(),
  target_user_ids: z.array(z.number()).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  color_theme: z.enum(["yellow", "blue", "green", "red", "purple"]),
  expires_at: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CreatePinModal({
  isOpen,
  onClose,
  editingMessage,
  users,
}: CreatePinModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      is_public: true,
      target_user_ids: [],
      priority: "normal",
      color_theme: "yellow",
      expires_at: "",
    },
  });

  // Reset form when modal opens/closes or editing message changes
  useEffect(() => {
    if (isOpen) {
      if (editingMessage) {
        form.reset({
          title: editingMessage.title,
          content: editingMessage.content,
          is_public: editingMessage.is_public,
          target_user_ids: editingMessage.target_user_ids || [],
          priority: editingMessage.priority as any,
          color_theme: editingMessage.color_theme as any,
          expires_at: editingMessage.expires_at
            ? new Date(editingMessage.expires_at).toISOString().slice(0, 16)
            : "",
        });
        setSelectedUsers(editingMessage.target_user_ids || []);
      } else {
        form.reset({
          title: "",
          content: "",
          is_public: true,
          target_user_ids: [],
          priority: "normal",
          color_theme: "yellow",
          expires_at: "",
        });
        setSelectedUsers([]);
      }
    }
  }, [isOpen, editingMessage, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        target_user_ids: data.is_public ? null : selectedUsers,
        expires_at: data.expires_at
          ? new Date(data.expires_at).toISOString()
          : null,
      };

      if (editingMessage) {
        return apiRequest(
          "PUT",
          `/api/pinned-messages/${editingMessage.id}`,
          payload,
        );
      } else {
        return apiRequest("POST", "/api/pinned-messages", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
      toast({
        title: "Success",
        description: editingMessage
          ? "Message updated successfully"
          : "Message created successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: editingMessage
          ? "Failed to update message"
          : "Failed to create message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    if (!data.is_public && selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user for private messages",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(data);
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const getColorPreview = (color: string) => {
    switch (color) {
      case "yellow":
        return "bg-yellow-200 border-yellow-400";
      case "blue":
        return "bg-blue-200 border-blue-400";
      case "green":
        return "bg-green-200 border-green-400";
      case "red":
        return "bg-red-200 border-red-400";
      case "purple":
        return "bg-purple-200 border-purple-400";
      default:
        return "bg-yellow-200 border-yellow-400";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <Star className="h-4 w-4 text-orange-500" />;
      case "normal":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "low":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {editingMessage ? "Edit Pin Message" : "Create Pin Message"}
          </DialogTitle>
          <DialogDescription>
            {editingMessage
              ? "Update the pin message details below."
              : "Create a new pin message to share with your team."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a clear title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your message..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Priority
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-2 gap-2"
                      >
                        {["low", "normal", "high", "urgent"].map((priority) => (
                          <div
                            key={priority}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem value={priority} id={priority} />
                            <Label
                              htmlFor={priority}
                              className="flex items-center gap-1 text-sm"
                            >
                              {getPriorityIcon(priority)}
                              <span className="capitalize">{priority}</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color Theme */}
              <FormField
                control={form.control}
                name="color_theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Theme
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-5 gap-2"
                      >
                        {["yellow", "blue", "green", "red", "purple"].map(
                          (color) => (
                            <div
                              key={color}
                              className="flex flex-col items-center space-y-1"
                            >
                              <RadioGroupItem value={color} id={color} />
                              <div
                                className={`w-6 h-6 rounded border-2 ${getColorPreview(color)}`}
                              />
                              <Label
                                htmlFor={color}
                                className="text-xs capitalize"
                              >
                                {color}
                              </Label>
                            </div>
                          ),
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Visibility Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Public Message
                      </FormLabel>
                      <div className="text-sm text-gray-600">
                        Everyone can see this message
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

              {/* User Selection for Private Messages */}
              {!form.watch("is_public") && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Select Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {users
                        .filter((u) => u.id !== user?.id)
                        .map((targetUser) => (
                          <div
                            key={targetUser.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`user-${targetUser.id}`}
                              checked={selectedUsers.includes(targetUser.id)}
                              onCheckedChange={() =>
                                handleUserToggle(targetUser.id)
                              }
                            />
                            <Label
                              htmlFor={`user-${targetUser.id}`}
                              className="text-sm flex items-center gap-2"
                            >
                              <span>
                                {targetUser.first_name} {targetUser.last_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {targetUser.role}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                    </div>
                    {selectedUsers.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-2">
                          Selected: {selectedUsers.length}{" "}
                          {selectedUsers.length === 1 ? "user" : "users"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Expiration Date */}
            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expiration Date (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {createMutation.isPending
                  ? "Saving..."
                  : editingMessage
                    ? "Update"
                    : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
